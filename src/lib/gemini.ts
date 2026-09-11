import "server-only";
import { GoogleGenAI, Type, type Part, type Schema } from "@google/genai";

/** Satu-satunya tempat aplikasi memanggil Gemini (PRD bagian 12).
 *
 *  Modul ini TIDAK menyentuh basis data dan TIDAK menyimpan apa pun. Tugasnya
 *  hanya: kirim masukan → terima JSON → validasi → kembalikan. Penyimpanan,
 *  penjumlahan, dan pencocokan produk ada di lib/unggah-actions.ts dan
 *  lib/parsing.ts supaya bisa diuji tanpa jaringan. */

/** Sudah divalidasi pada uji parsing 3 September: akurasi 97,8%, 0 nilai
 *  dikarang (test-sample/HASIL-UJI-PARSING.md). JANGAN diganti tanpa
 *  menjalankan ulang `node test-sample/run-all.mjs`. */
export const MODEL = "gemini-3.1-pro-preview";

/** PRD 12.7: batas 30 detik untuk seluruh operasi, termasuk satu kali ulang. */
const BATAS_WAKTU_MS = 30_000;

/** Galat yang boleh ditampilkan ke pengguna. Pesannya sudah bahasa Indonesia
 *  dan selalu menawarkan jalan keluar (input manual). */
export class GagalAI extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "GagalAI";
  }
}

// ── Bentuk data ──────────────────────────────────────────────────────────────

export type BarisItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  confidence: number;
};

export type BarisBiaya = { label: string; amount: number; confidence: number };

export type TingkatRincian = "itemized" | "total_only";
export type Platform = "gofood" | "shopeefood" | "unknown";

/** Jalur A — screenshot marketplace. */
export type HasilMarketplace = {
  detected_platform: Platform;
  detail_level: TingkatRincian;
  report_period: { start_date: string; end_date: string };
  items: BarisItem[];
  summary: {
    gross_revenue: number;
    /** Setiap baris potongan disalin apa adanya. TIDAK PERNAH digabung —
     *  lihat PRD 12.2 "Catatan skema summary.fees". */
    fees: BarisBiaya[];
    net_revenue: number;
  };
  unreadable_regions: string[];
  overall_confidence: number;
};

/** Jalur B (teks pesanan) dan C (foto catatan tangan). Sama seperti jalur A
 *  tanpa `summary` dan `detected_platform` (PRD 12.3).
 *
 *  `total_only_amount` adalah tambahan atas PRD: pada jalur A angka total
 *  ditampung `summary.gross_revenue`, sedangkan jalur B dan C tidak punya
 *  `summary`. Tanpa field ini, `detail_level: "total_only"` di PRD 12.4
 *  ("catatan hanya memuat total") tidak punya tempat menaruh angkanya. */
export type HasilTeks = {
  detail_level: TingkatRincian;
  report_period: { start_date: string; end_date: string };
  items: BarisItem[];
  total_only_amount: number;
  unreadable_regions: string[];
  /** Hanya diisi jalur C. Memicu saran "foto ulang" di layar konfirmasi. */
  poor_image_quality: boolean;
  overall_confidence: number;
};

export type BarisSuara = {
  spoken_name: string;
  matched_product_id: string | null;
  matched_product_name: string | null;
  quantity: number;
  match_confidence: number;
};

/** Jalur D — hasil transkripsi suara (PRD 12.5). */
export type HasilSuara = {
  detail_level: "itemized";
  items: BarisSuara[];
  unmatched_phrases: string[];
  overall_confidence: number;
};

export type ProdukTerdaftar = {
  id: string;
  name: string;
  aliases: string[] | null;
};

export type Berkas = {
  /** image/png, image/jpeg, atau image/webp. */
  mimeType: string;
  /** Isi berkas dalam base64, tanpa awalan data URI. */
  data: string;
};

// ── Skema JSON untuk structured output ───────────────────────────────────────

const N: Schema = { type: Type.NUMBER };
const S: Schema = { type: Type.STRING };
const B: Schema = { type: Type.BOOLEAN };

/** Semua field wajib. Gemini mengisi field yang tidak terbaca dengan nilai
 *  kosong plus catatan di unreadable_regions, bukan menghilangkannya. */
const objek = (properties: Record<string, Schema>): Schema => ({
  type: Type.OBJECT,
  properties,
  required: Object.keys(properties),
});
const larik = (items: Schema): Schema => ({ type: Type.ARRAY, items });

const skemaBarisItem = objek({
  product_name: S,
  quantity: N,
  unit_price: N,
  total_amount: N,
  confidence: N,
});

const skemaPeriode = objek({ start_date: S, end_date: S });

const SKEMA_MARKETPLACE = objek({
  detected_platform: { type: Type.STRING, enum: ["gofood", "shopeefood", "unknown"] },
  detail_level: { type: Type.STRING, enum: ["itemized", "total_only"] },
  report_period: skemaPeriode,
  items: larik(skemaBarisItem),
  summary: objek({
    gross_revenue: N,
    fees: larik(objek({ label: S, amount: N, confidence: N })),
    net_revenue: N,
  }),
  unreadable_regions: larik(S),
  overall_confidence: N,
});

const SKEMA_TEKS = objek({
  detail_level: { type: Type.STRING, enum: ["itemized", "total_only"] },
  report_period: skemaPeriode,
  items: larik(skemaBarisItem),
  total_only_amount: N,
  unreadable_regions: larik(S),
  poor_image_quality: B,
  overall_confidence: N,
});

const SKEMA_SUARA = objek({
  detail_level: { type: Type.STRING, enum: ["itemized"] },
  items: larik(
    objek({
      spoken_name: S,
      matched_product_id: { type: Type.STRING, nullable: true },
      matched_product_name: { type: Type.STRING, nullable: true },
      quantity: N,
      match_confidence: N,
    }),
  ),
  unmatched_phrases: larik(S),
  overall_confidence: N,
});

// ── Prompt ───────────────────────────────────────────────────────────────────

/** Tiga aturan keras yang berlaku di SEMUA jalur parsing. Diulang di setiap
 *  prompt, bukan diasumsikan: model mengabaikan aturan yang jauh dari tugasnya.
 *
 *  Aturan 3 lahir dari hasil uji 3 September. Dua-duanya kesalahan yang tersisa
 *  ada di detected_platform, dan keduanya condong menebak "gofood". */
const ATURAN_UMUM = `ATURAN KERAS — melanggar salah satunya membuat keluaran ditolak:

1. DILARANG BERHITUNG. Jangan menjumlahkan, mengurangi, mengalikan, atau
   membagi apa pun. Setiap angka yang kamu kembalikan harus tertulis apa adanya
   di masukan. Kalau sebuah angka hanya bisa didapat dengan menghitung, jangan
   dikembalikan. Penjumlahan dilakukan di sisi server.

2. BARIS TIDAK TERBACA TIDAK BOLEH DIBUANG. Baris yang JELAS ADA tapi tidak
   terbaca (buram, tertutup, terpotong, tulisan tidak jelas) TETAP dimasukkan ke
   items: isi quantity, unit_price, dan total_amount dengan 0, confidence <= 0.3,
   lalu catat alasannya di unreadable_regions. Isi product_name kalau namanya
   masih terbaca. Membuang baris membuat produk hilang tanpa jejak dan omzet
   berkurang tanpa disadari pengguna.

3. JANGAN MENGARANG. Angka yang tidak terlihat sama sekali diisi 0 dan
   alasannya dicatat di unreadable_regions. Angka murni tanpa titik pemisah
   ribuan, tanpa "Rp", tanpa persen: 1.250.000 menjadi 1250000.`;

const PROMPT_MARKETPLACE = `Kamu membaca screenshot laporan penjualan dari aplikasi GoFood atau ShopeeFood milik pemilik UMKM.

${ATURAN_UMUM}

4. detected_platform adalah DUGAAN, BUKAN KEBENARAN. Tentukan hanya dari logo,
   nama aplikasi, atau warna khas yang benar-benar terlihat di gambar. Tata letak
   tabel yang mirip TIDAK cukup jadi dasar. Kalau tidak bisa dipastikan, isi
   "unknown". Menebak "gofood" karena laporannya terasa seperti laporan GoFood
   adalah kesalahan; "unknown" selalu lebih baik daripada tebakan.

Ketentuan lain:
- Baca HANYA yang tampak di gambar.
- Setiap baris item wajib punya confidence sendiri (0-1), bukan hanya confidence keseluruhan.
- summary.fees: salin SETIAP baris potongan atau biaya sebagai entri sendiri
  dengan labelnya apa adanya (contoh: "Biaya layanan", "Biaya penanganan",
  "Potongan promo", "Subsidi ongkir", "Pajak ditahan"). Jangan digabung jadi satu
  angka. Kalau hanya ada satu baris potongan, fees berisi satu entri. Kalau tidak
  ada sama sekali, fees kosong.
- detail_level = "itemized" kalau laporan memuat rincian per produk;
  "total_only" kalau hanya total penjualan. Pada "total_only", items kosong dan
  angka totalnya ditaruh di summary.gross_revenue.
- report_period diisi dari periode yang tertulis di laporan (YYYY-MM-DD). Kalau
  tidak tertulis, isi string kosong dan catat di unreadable_regions.`;

const PROMPT_TEKS = `Kamu membaca teks pesanan milik pemilik UMKM, biasanya disalin dari percakapan WhatsApp.

${ATURAN_UMUM}

Ketentuan lain:
- Abaikan bagian percakapan yang bukan pesanan: salam, basa-basi, alamat,
  ucapan terima kasih, konfirmasi ongkir.
- Normalkan penulisan jumlah menjadi angka: "2x" menjadi 2, "dua porsi" menjadi 2,
  "lima belas" menjadi 15.
- unit_price dan total_amount diisi HANYA kalau harganya tertulis di teks. Kalau
  tidak tertulis, isi 0 — jangan menghitung dan jangan menebak dari harga pasar.
- detail_level = "itemized" kalau ada rincian per produk; "total_only" kalau
  teksnya hanya menyebut satu angka total. Pada "total_only", items kosong dan
  angka totalnya ditaruh di total_only_amount. Selain itu total_only_amount = 0.
- report_period diisi kalau tanggalnya tertulis (YYYY-MM-DD), selain itu string kosong.
- poor_image_quality selalu false pada jalur teks.`;

const PROMPT_TULISAN_TANGAN = `Kamu membaca foto catatan tulis tangan milik pemilik UMKM: buku kas, nota, atau coretan penjualan harian.

${ATURAN_UMUM}

Ketentuan lain:
- Tulisan tangan jauh lebih rawan salah baca daripada teks cetak. Kalau ragu,
  turunkan confidence — jangan menebak supaya terlihat rapi.
- Angka yang ambigu antara 1 dan 7, atau antara 0 dan 6, wajib diberi confidence
  rendah (<= 0.5) dan disebutkan di unreadable_regions.
- poor_image_quality = true kalau foto secara keseluruhan buram, gelap, miring,
  atau terlalu jauh sehingga sebagian besar catatan tidak terbaca. Penanda ini
  membuat sistem menyarankan pengambilan ulang foto.
- unit_price dan total_amount diisi HANYA kalau angkanya tertulis di catatan.
- detail_level = "total_only" kalau catatan hanya memuat total tanpa rincian per
  produk. Pada keadaan itu items kosong dan angka totalnya ditaruh di
  total_only_amount. Selain itu total_only_amount = 0.
- report_period diisi kalau tanggalnya tertulis (YYYY-MM-DD), selain itu string kosong.`;

function promptSuara(produk: ProdukTerdaftar[]): string {
  const daftarProduk = produk.length
    ? produk
        .map((p) => {
          const alias = (p.aliases ?? []).filter(Boolean);
          return `- id=${p.id} | nama="${p.name}"${alias.length ? ` | sebutan lain: ${alias.map((a) => `"${a}"`).join(", ")}` : ""}`;
        })
        .join("\n")
    : "(belum ada produk terdaftar)";

  return `Kamu membaca hasil transkripsi suara pemilik UMKM yang menyebutkan penjualan hari itu. Transkripsi dibuat Web Speech API dan SERING salah eja pada nama makanan lokal.

DAFTAR PRODUK TERDAFTAR — hanya id dari daftar ini yang boleh dipakai:
${daftarProduk}

ATURAN KERAS:

1. DILARANG BERHITUNG. Jangan menjumlahkan atau mengalikan apa pun. Kembalikan
   quantity apa adanya sesuai yang diucapkan. Jangan mengisi harga: harga diambil
   server dari master produk.

2. NAMA YANG TIDAK COCOK TIDAK BOLEH DIBUANG. Sebutan yang tidak bisa dicocokkan
   ke produk mana pun dimasukkan ke unmatched_phrases apa adanya. Jangan dihapus
   diam-diam dan jangan dipaksa cocok ke produk yang mirip sedikit saja.

3. matched_product_id HANYA boleh berisi id yang persis ada di daftar di atas,
   atau null. Jangan mengarang id.

Ketentuan lain:
- Cocokkan nama yang diucapkan ke produk terdekat dengan toleransi kesalahan
  transkripsi. Contoh: "ayam ge prek" cocok ke "Ayam Geprek", "es te manis" cocok
  ke "Es Teh Manis", "nasgor" cocok ke "Nasi Goreng Spesial".
- spoken_name SELALU diisi apa adanya seperti yang tertulis di transkripsi,
  termasuk ketika kecocokannya sudah pasti.
- Kalau kecocokannya meragukan, isi match_confidence rendah dan tetap isi
  spoken_name. Kalau tidak cocok sama sekali, matched_product_id dan
  matched_product_name diisi null lalu sebutannya masuk ke unmatched_phrases.
- Normalkan angka dalam bentuk kata menjadi angka: "lima belas" menjadi 15,
  "dua puluh tiga" menjadi 23, "tujuh" menjadi 7.
- Abaikan kata pengisi dan kalimat yang bukan penyebutan penjualan: "hari ini",
  "eh", "sama", "terus", "gitu".`;
}

// ── Validasi balikan ─────────────────────────────────────────────────────────
// Structured output sudah membatasi bentuk, tapi tidak menjamin: model bisa
// mengembalikan null, string kosong, atau NaN. Aturan keras "balikan divalidasi
// sebelum ditampilkan" berlaku apa adanya, jadi setiap field diperiksa.

const tolak = (jalur: string, alasan: string): never => {
  throw new GagalAI(`Balikan AI tidak sesuai skema: ${jalur} ${alasan}.`);
};

const angka = (v: unknown, jalur: string): number =>
  typeof v === "number" && Number.isFinite(v) ? v : tolak(jalur, "bukan angka");

const teks = (v: unknown, jalur: string): string =>
  typeof v === "string" ? v : tolak(jalur, "bukan teks");

const teksAtauNull = (v: unknown, jalur: string): string | null =>
  v === null || v === undefined ? null : teks(v, jalur);

const salahSatu = <T extends string>(v: unknown, pilihan: readonly T[], jalur: string): T =>
  pilihan.includes(v as T) ? (v as T) : tolak(jalur, `bukan salah satu dari ${pilihan.join(", ")}`);

const larikDari = <T>(v: unknown, jalur: string, per: (x: unknown, j: string) => T): T[] =>
  Array.isArray(v) ? v.map((x, i) => per(x, `${jalur}[${i}]`)) : tolak(jalur, "bukan larik");

const obj = (v: unknown, jalur: string): Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : tolak(jalur, "bukan objek");

const bacaItem = (v: unknown, jalur: string): BarisItem => {
  const o = obj(v, jalur);
  return {
    product_name: teks(o.product_name, `${jalur}.product_name`),
    quantity: angka(o.quantity, `${jalur}.quantity`),
    unit_price: angka(o.unit_price, `${jalur}.unit_price`),
    total_amount: angka(o.total_amount, `${jalur}.total_amount`),
    confidence: angka(o.confidence, `${jalur}.confidence`),
  };
};

const bacaPeriode = (v: unknown, jalur: string) => {
  const o = obj(v, jalur);
  return {
    start_date: teks(o.start_date, `${jalur}.start_date`),
    end_date: teks(o.end_date, `${jalur}.end_date`),
  };
};

function periksaMarketplace(v: unknown): HasilMarketplace {
  const o = obj(v, "balikan");
  const s = obj(o.summary, "summary");
  return {
    detected_platform: salahSatu(
      o.detected_platform,
      ["gofood", "shopeefood", "unknown"] as const,
      "detected_platform",
    ),
    detail_level: salahSatu(o.detail_level, ["itemized", "total_only"] as const, "detail_level"),
    report_period: bacaPeriode(o.report_period, "report_period"),
    items: larikDari(o.items, "items", bacaItem),
    summary: {
      gross_revenue: angka(s.gross_revenue, "summary.gross_revenue"),
      fees: larikDari(s.fees, "summary.fees", (x, j) => {
        const f = obj(x, j);
        return {
          label: teks(f.label, `${j}.label`),
          amount: angka(f.amount, `${j}.amount`),
          confidence: angka(f.confidence, `${j}.confidence`),
        };
      }),
      net_revenue: angka(s.net_revenue, "summary.net_revenue"),
    },
    unreadable_regions: larikDari(o.unreadable_regions, "unreadable_regions", teks),
    overall_confidence: angka(o.overall_confidence, "overall_confidence"),
  };
}

function periksaTeks(v: unknown): HasilTeks {
  const o = obj(v, "balikan");
  return {
    detail_level: salahSatu(o.detail_level, ["itemized", "total_only"] as const, "detail_level"),
    report_period: bacaPeriode(o.report_period, "report_period"),
    items: larikDari(o.items, "items", bacaItem),
    total_only_amount: angka(o.total_only_amount, "total_only_amount"),
    unreadable_regions: larikDari(o.unreadable_regions, "unreadable_regions", teks),
    poor_image_quality: o.poor_image_quality === true,
    overall_confidence: angka(o.overall_confidence, "overall_confidence"),
  };
}

function periksaSuara(v: unknown, produk: ProdukTerdaftar[]): HasilSuara {
  const o = obj(v, "balikan");
  const idSah = new Set(produk.map((p) => p.id));
  return {
    detail_level: "itemized",
    items: larikDari(o.items, "items", (x, j) => {
      const i = obj(x, j);
      const id = teksAtauNull(i.matched_product_id, `${j}.matched_product_id`);
      // Model bisa mengarang uuid. Id yang tidak ada di master produk
      // diperlakukan sebagai tidak cocok, bukan disimpan lalu gagal di foreign key.
      const sah = id && idSah.has(id) ? id : null;
      return {
        spoken_name: teks(i.spoken_name, `${j}.spoken_name`),
        matched_product_id: sah,
        matched_product_name: sah
          ? (produk.find((p) => p.id === sah)?.name ?? null)
          : null,
        quantity: angka(i.quantity, `${j}.quantity`),
        match_confidence: angka(i.match_confidence, `${j}.match_confidence`),
      };
    }),
    unmatched_phrases: larikDari(o.unmatched_phrases, "unmatched_phrases", teks),
    overall_confidence: angka(o.overall_confidence, "overall_confidence"),
  };
}

// ── Pemanggilan ──────────────────────────────────────────────────────────────

function pesanGagal(e: unknown): string {
  const pesan = e instanceof Error ? e.message : String(e);
  if (e instanceof GagalAI) return e.message;
  if (/abort|timeout|timed out/i.test(pesan))
    return "Pembacaan AI lewat dari 30 detik. Coba lagi, atau isi datanya manual.";
  if (/429|quota|rate limit|RESOURCE_EXHAUSTED/i.test(pesan))
    return "Jatah pemakaian AI sedang habis. Silakan isi datanya manual dulu.";
  return "Pembacaan AI gagal. Coba lagi, atau isi datanya manual.";
}

/** Satu panggilan structured output. Balikan yang tidak lolos validasi diulang
 *  SATU kali (PRD 12.7), lalu dilempar sebagai GagalAI yang bisa ditangani UI.
 *
 *  Batas 30 detik berlaku untuk keseluruhan, bukan per percobaan: satu sinyal
 *  dipakai bersama supaya percobaan ulang tidak melipatgandakan waktu tunggu. */
async function panggil<T>(
  parts: Part[],
  skema: Schema,
  periksa: (data: unknown) => T,
): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GagalAI("GEMINI_API_KEY belum diisi di server. Isi datanya manual dulu.");

  const ai = new GoogleGenAI({ apiKey });
  const batas = AbortSignal.timeout(BATAS_WAKTU_MS);
  let terakhir: unknown;

  for (let percobaan = 0; percobaan < 2; percobaan++) {
    try {
      const res = await ai.models.generateContent({
        model: MODEL,
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: skema,
          temperature: 0,
          abortSignal: batas,
        },
      });
      return periksa(JSON.parse(res.text ?? ""));
    } catch (e) {
      terakhir = e;
      if (batas.aborted) break;
    }
  }
  throw new GagalAI(pesanGagal(terakhir));
}

const bagianGambar = (gambar: Berkas): Part => ({
  inlineData: { mimeType: gambar.mimeType, data: gambar.data },
});

/** Jalur A — screenshot laporan GoFood/ShopeeFood. */
export function parseMarketplaceScreenshot(gambar: Berkas): Promise<HasilMarketplace> {
  return panggil(
    [bagianGambar(gambar), { text: PROMPT_MARKETPLACE }],
    SKEMA_MARKETPLACE,
    periksaMarketplace,
  );
}

/** Jalur B — teks pesanan yang ditempel pengguna. */
export function parsePastedText(teksMasukan: string): Promise<HasilTeks> {
  return panggil(
    [{ text: `${PROMPT_TEKS}\n\n--- TEKS PESANAN ---\n${teksMasukan}` }],
    SKEMA_TEKS,
    periksaTeks,
  );
}

/** Jalur C — foto catatan tulis tangan. */
export function parseHandwrittenPhoto(gambar: Berkas): Promise<HasilTeks> {
  return panggil(
    [bagianGambar(gambar), { text: PROMPT_TULISAN_TANGAN }],
    SKEMA_TEKS,
    periksaTeks,
  );
}

/** Jalur D — hasil transkripsi suara, dicocokkan ke master produk. */
export function parseVoiceTranscript(
  transkripsi: string,
  produkTerdaftar: ProdukTerdaftar[],
): Promise<HasilSuara> {
  return panggil(
    [{ text: `${promptSuara(produkTerdaftar)}\n\n--- TRANSKRIPSI ---\n${transkripsi}` }],
    SKEMA_SUARA,
    (data) => periksaSuara(data, produkTerdaftar),
  );
}
