/** Bentuk data bersama untuk layar konfirmasi (F2) dan fungsi murni yang
 *  mengubah balikan Gemini menjadi bentuk itu.
 *
 *  Tidak ada `server-only` di sini: tipe dan penanda dipakai juga oleh komponen
 *  klien. Yang menyentuh jaringan atau basis data ada di gemini.ts dan
 *  unggah-actions.ts. Semua isi berkas ini murni supaya bisa diuji tanpa kunci
 *  API — lihat parsing.test.ts. */

import type { BarisBiaya, BarisItem, BarisSuara, Platform, TingkatRincian } from "./gemini";

export type { BarisBiaya, Platform, TingkatRincian };

/** Di bawah ini baris ditandai perlu diperiksa (PRD 12.2). */
export const AMBANG_RAGU = 0.7;

export type Produk = {
  id: string;
  name: string;
  aliases: string[] | null;
  selling_price: number;
};

export type Kanal = { id: string; name: string };

export type SumberInput =
  | "marketplace_screenshot"
  | "pasted_text"
  | "handwritten_photo"
  | "voice_input";

export type BarisKonfirmasi = {
  /** Kunci stabil untuk React dan untuk menyunting baris. */
  kunci: string;
  /** Nama yang ditampilkan dan boleh disunting. */
  nama: string;
  /** Nama apa adanya dari sumber (hasil OCR atau ucapan). Tidak pernah diubah —
   *  jejak audit, dan ditampilkan saat namanya belum dikenal. */
  namaAsli: string;
  produkId: string | null;
  qty: number;
  hargaSatuan: number;
  total: number;
  confidence: number;
  /** Baris yang TERLIHAT ADA tapi tidak terbaca: angka 0 dengan confidence
   *  rendah. Ini bukan penjualan senilai nol — layar konfirmasi menampilkannya
   *  sebagai baris kosong yang menunggu diisi. */
  kosong: boolean;
  /** Harga ini diambil dari master produk, BUKAN dibaca dari sumber. Layar
   *  konfirmasi wajib menyebutkannya: pengguna berhak tahu angka mana yang
   *  tertulis di catatannya dan angka mana yang diisikan sistem dari daftar
   *  produk. Hangus begitu pengguna menyunting harganya sendiri. */
  hargaDariMaster: boolean;
};

/** Satu bentuk untuk keempat jalur. Layar konfirmasi hanya tahu bentuk ini,
 *  jadi tidak ada empat versi layar konfirmasi. */
export type HasilParsing = {
  /** null pada jalur "ketik sendiri": tidak ada batch karena tidak ada yang
   *  diparsing. Lihat `hasilManual`. */
  batchId: string | null;
  /** "manual" sengaja BUKAN anggota SumberInput. SumberInput adalah nilai yang
   *  sah untuk kolom `upload_batches.source_type`, dan entri manual tidak pernah
   *  menghasilkan baris di tabel itu. */
  sumber: SumberInput | "manual";
  channelId: string;
  namaKanal: string;
  detailLevel: TingkatRincian;
  /** Tanggal penjualan usulan (YYYY-MM-DD), boleh diganti pengguna. */
  tanggal: string;
  baris: BarisKonfirmasi[];
  /** Hanya jalur A. Ditampilkan baris per baris sesuai screenshot. */
  ringkasan: { grossRevenue: number; fees: BarisBiaya[]; netRevenue: number } | null;
  /** Penjumlahan fees. Dihitung server, BUKAN oleh model. */
  totalBiaya: number | null;
  /** Angka total untuk detailLevel "total_only". */
  totalOnlyAmount: number | null;
  unreadableRegions: string[];
  unmatchedPhrases: string[];
  /** Dugaan model. TIDAK PERNAH mengubah kanal — hanya pemeriksa silang. */
  detectedPlatform: Platform | null;
  peringatanPlatform: string | null;
  fotoBuruk: boolean;
  perluPerhatian: boolean;
  overallConfidence: number;
};

/** Jalur "ketik sendiri" (PRD 12.7: selalu ada jalan keluar kalau AI gagal atau
 *  tidak tersedia).
 *
 *  Bentuknya sengaja HasilParsing yang sama, hanya kosong, supaya layar
 *  konfirmasi tetap mengenal satu bentuk saja — kalau jalur manual punya layar
 *  sendiri, logika penyimpanan terduplikasi dan cepat atau lambat salah satu
 *  cabang lupa memeriksa baris kosong.
 *
 *  Tidak ada `batchId` karena tidak ada yang diparsing: angka yang diketik
 *  manusia ITU catatan aslinya, bukan hasil pembacaan atas sesuatu yang lain.
 *  Menyimpannya sebagai batch 'pasted_text' akan mencatat teks asli yang tidak
 *  pernah ada — jejak audit yang berbohong lebih buruk daripada tidak ada. */
export function hasilManual(
  channelId: string,
  namaKanal: string,
  detailLevel: TingkatRincian,
  tanggal: string,
): HasilParsing {
  return {
    batchId: null,
    sumber: "manual",
    channelId,
    namaKanal,
    detailLevel,
    tanggal,
    baris: [],
    ringkasan: null,
    totalBiaya: null,
    totalOnlyAmount: null,
    unreadableRegions: [],
    unmatchedPhrases: [],
    detectedPlatform: null,
    peringatanPlatform: null,
    fotoBuruk: false,
    perluPerhatian: false,
    // Tidak ada mesin yang membaca, jadi tidak ada keyakinan mesin yang diukur.
    overallConfidence: 1,
  };
}

// ── Pencocokan produk ────────────────────────────────────────────────────────

/** "Es  Teh Manis!" → "es teh manis". */
export function normalkan(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cocok persis setelah dinormalkan, terhadap nama maupun alias.
 *  ponytail: sengaja tanpa fuzzy matching. Jalur suara sudah dicocokkan model,
 *  dan jalur OCR yang meleset dikoreksi pengguna di layar konfirmasi — di mana
 *  produk tak dikenal ditandai, bukan ditebak. Tambahkan jarak Levenshtein
 *  kalau ternyata banyak nama OCR yang beda tipis dari master produk. */
export function cocokkanProduk(nama: string, produk: Produk[]): Produk | null {
  const cari = normalkan(nama);
  if (!cari) return null;
  return (
    produk.find(
      (p) =>
        normalkan(p.name) === cari ||
        (p.aliases ?? []).some((a) => normalkan(a) === cari),
    ) ?? null
  );
}

/** Nama baris diganti pengguna di layar konfirmasi → tambalan untuk baris itu.
 *
 *  Mengetik nama produk yang SUDAH terdaftar harus menautkannya, bukan
 *  memperlakukannya sebagai barang asing. Sebelum ini setiap ketikan memaksa
 *  `produkId: null`, sehingga "Ayam Bakar Madu" yang diketik sendiri muncul
 *  sebagai "Belum terdaftar" lengkap dengan tombol Daftarkan — yang akan
 *  membuat produk kembar, dan produk kembar memecah margin satu barang jadi
 *  dua baris yang tidak pernah menjumlah kembali.
 *
 *  Harga yang sudah diketik sendiri TIDAK ditimpa. Yang boleh diisi hanya baris
 *  yang harganya masih kosong, atau yang harganya memang berasal dari master
 *  (sehingga ikut berubah kalau produknya diganti ke produk lain). */
export function tambalanNama(
  nama: string,
  baris: Pick<BarisKonfirmasi, "hargaSatuan" | "hargaDariMaster">,
  produk: Produk[],
): Partial<BarisKonfirmasi> {
  const cocok = cocokkanProduk(nama, produk);
  if (!cocok) {
    // Harga yang tadinya diambil dari produk lain tidak boleh menempel pada
    // nama baru yang tidak dikenal — itu akan menampilkan harga Ayam Bakar
    // pada baris bernama Kopi Item, lengkap dengan keterangan "dari daftar
    // produk" yang sudah tidak benar.
    return baris.hargaDariMaster
      ? { nama, produkId: null, hargaSatuan: 0, hargaDariMaster: false }
      : { nama, produkId: null };
  }

  const harga = Number(cocok.selling_price) || 0;
  const bolehIsi = baris.hargaSatuan <= 0 || baris.hargaDariMaster;
  if (!bolehIsi || harga <= 0) return { nama, produkId: cocok.id };

  // `total` sengaja tidak ikut: pemanggil menghitungnya dari qty × harga,
  // supaya rumusnya cuma ada di satu tempat.
  return { nama, produkId: cocok.id, hargaSatuan: harga, hargaDariMaster: true };
}

// ── Normalisasi balikan AI → baris konfirmasi ────────────────────────────────

/** Jalur A, B, dan C.
 *
 *  Teks pesanan WhatsApp dan catatan tangan sering hanya menyebut barang dan
 *  jumlahnya: "ayam bakar 2x". Model BENAR mengembalikan harga 0 di situ — ia
 *  memang dilarang mengarang angka (aturan keras 1c), dan ia mengembalikannya
 *  dengan confidence tinggi karena barisnya memang terbaca utuh.
 *
 *  Tapi harga produk yang sudah terdaftar BUKAN data yang tidak diketahui: ada
 *  di master produk, diisi pengguna sendiri. Membiarkannya 0 memaksa dia
 *  mengetik ulang harga yang sudah pernah dia simpan, satu per satu, tiap kali
 *  menempel pesanan. Jalur suara sudah lama melakukan pencarian ini
 *  (`dariSuara`); jalur teks tertinggal, dan itu yang diperbaiki di sini.
 *
 *  Yang TIDAK boleh terjadi: mengganti angka yang benar-benar tertulis di
 *  sumber. Karena itu isian master hanya dipakai saat sumbernya sama sekali
 *  tidak menyebut nilai, dan baris hasilnya ditandai `hargaDariMaster` supaya
 *  layar konfirmasi bisa menyebutkan asal angkanya — bukan menyelipkannya
 *  diam-diam sebagai hasil pembacaan. */
export function dariItem(items: BarisItem[], produk: Produk[]): BarisKonfirmasi[] {
  return items.map((it, i) => {
    const cocok = cocokkanProduk(it.product_name, produk);

    // Sumber tidak menyebut nilai sama sekali, tapi barisnya sendiri terbaca
    // (qty > 0). Baris yang qty-nya juga 0 adalah kasus "terlihat ada, tidak
    // terbaca" — itu wajib tetap 0 dan ditandai, jangan diisi apa pun.
    const tanpaNilai = it.unit_price === 0 && it.total_amount === 0 && it.quantity > 0;
    const hargaMaster = cocok?.selling_price ?? 0;
    const pakaiMaster = tanpaNilai && hargaMaster > 0;

    const hargaSatuan = pakaiMaster ? hargaMaster : it.unit_price;
    // Aturan keras 1b: perkaliannya di sini, bukan di model. Model mengembalikan
    // total_amount 0 setiap kali sumbernya tidak menuliskan total baris secara
    // harfiah -- "3 Nasi Goreng @18.000" menyebut harga satuan, bukan totalnya.
    // Total yang benar-benar tertulis selalu menang: laporan marketplace kerap
    // punya total yang tidak sama dengan qty x harga karena promo.
    const total = it.total_amount > 0 ? it.total_amount : hargaSatuan * it.quantity;

    return {
      kunci: `ai-${i}`,
      nama: cocok?.name ?? it.product_name,
      namaAsli: it.product_name,
      produkId: cocok?.id ?? null,
      qty: it.quantity,
      hargaSatuan,
      total,
      confidence: it.confidence,
      kosong: barisKosong(it.quantity, total, it.confidence),
      hargaDariMaster: pakaiMaster,
    };
  });
}

/** Jalur D. Harga diambil dari master produk — model tidak pernah menyebut
 *  harga, dan totalnya dihitung di sini, bukan oleh model. */
export function dariSuara(items: BarisSuara[], produk: Produk[]): BarisKonfirmasi[] {
  return items.map((it, i) => {
    const p = it.matched_product_id
      ? (produk.find((x) => x.id === it.matched_product_id) ?? null)
      : null;
    const harga = p?.selling_price ?? 0;
    return {
      kunci: `ai-${i}`,
      nama: p?.name ?? it.spoken_name,
      namaAsli: it.spoken_name,
      produkId: p?.id ?? null,
      qty: it.quantity,
      hargaSatuan: harga,
      total: harga * it.quantity,
      confidence: it.match_confidence,
      kosong: barisKosong(it.quantity, harga * it.quantity, it.match_confidence),
      hargaDariMaster: harga > 0,
    };
  });
}

/** Terlihat ada tapi tidak terbaca: angkanya 0 DAN keyakinannya rendah.
 *  Baris bernilai 0 dengan confidence tinggi (produk memang tidak laku)
 *  bukan baris kosong. */
export function barisKosong(qty: number, total: number, confidence: number): boolean {
  return qty === 0 && total === 0 && confidence < AMBANG_RAGU;
}

// ── Penanda mutu ─────────────────────────────────────────────────────────────

/** PRD 12.2: ada confidence < 0.7 ATAU unreadable_regions tidak kosong.
 *  Dua-duanya, bukan salah satu: unggahan bisa saja yakin di semua baris yang
 *  terbaca, tapi ada bagian layar yang tertutup dan tidak terdeteksi. */
export function perluPerhatian(confidences: number[], unreadableRegions: string[]): boolean {
  return unreadableRegions.length > 0 || confidences.some((c) => c < AMBANG_RAGU);
}

/** Baris ragu diurutkan ke atas supaya yang perlu dikoreksi terlihat lebih dulu
 *  (FR2.2). Urutan asli dipertahankan di dalam tiap kelompok. */
export function urutkanRagu(baris: BarisKonfirmasi[]): BarisKonfirmasi[] {
  return baris
    .map((b, i) => ({ b, i }))
    .sort((x, y) => {
      const rx = x.b.confidence < AMBANG_RAGU ? 0 : 1;
      const ry = y.b.confidence < AMBANG_RAGU ? 0 : 1;
      return rx - ry || x.i - y.i;
    })
    .map((x) => x.b);
}

// ── Aritmatika sisi server ───────────────────────────────────────────────────

/** Aturan keras 1b: model dilarang menjumlahkan. Ini penjumlahannya. */
export function totalBiaya(fees: BarisBiaya[]): number {
  return fees.reduce((jumlah, f) => jumlah + f.amount, 0);
}

export function totalPenjualan(baris: BarisKonfirmasi[]): number {
  return baris.reduce((jumlah, b) => jumlah + b.total, 0);
}

// ── Pemeriksaan silang platform ──────────────────────────────────────────────

/** detected_platform adalah dugaan, bukan kebenaran (uji 3 September: dua-duanya
 *  kesalahan yang tersisa ada di field ini, keduanya condong menebak "gofood").
 *  Karena itu fungsinya hanya memperingatkan; kanal tetap milik pilihan pengguna. */
export function peringatanPlatform(
  terdeteksi: Platform | null,
  namaKanal: string,
): string | null {
  if (!terdeteksi || terdeteksi === "unknown") return null;
  if (normalkan(namaKanal).replace(/\s/g, "") === terdeteksi) return null;
  const rapi = terdeteksi === "gofood" ? "GoFood" : "ShopeeFood";
  return `Isi laporan ini sepertinya dari ${rapi}, tapi kanal yang dipilih "${namaKanal}". Periksa dulu sebelum disimpan — kanal tidak diubah otomatis.`;
}

// ── Periode untuk data_completeness ──────────────────────────────────────────

/** Satu bulan kalender dari tanggal penjualan. Dipakai sebagai kunci periode
 *  data_completeness (unique channel_id, period_start, period_end). */
export function periodeBulan(tanggal: string): { mulai: string; selesai: string } {
  const [thn, bln] = tanggal.split("-").map(Number);
  const akhir = new Date(Date.UTC(thn, bln, 0)).getUTCDate();
  const dd = (n: number) => String(n).padStart(2, "0");
  return { mulai: `${thn}-${dd(bln)}-01`, selesai: `${thn}-${dd(bln)}-${dd(akhir)}` };
}

export type TingkatData = "complete" | "partial" | "empty";

/** complete = seluruh omzet terinci, partial = ada total tanpa rincian,
 *  empty = tidak ada data (F10). */
export function tingkatKelengkapan(terinci: number, keseluruhan: number): TingkatData {
  if (keseluruhan <= 0) return "empty";
  return terinci >= keseluruhan ? "complete" : "partial";
}

export type KelengkapanKanal = {
  kanal: Kanal;
  tingkat: TingkatData;
  /** Omzet dari tabel `sales` — satu-satunya yang bisa dianalisis per produk. */
  omzetTerinci: number;
  /** Omzet dari KEDUA tabel. */
  omzetTotal: number;
  /** 0-100. null saat kanal ini belum punya omzet sama sekali. */
  persen: number | null;
};

/**
 * Tingkat kelengkapan SETIAP kanal pada satu periode (FR10.1).
 *
 * Dihitung ulang dari baris penjualan, bukan dibaca dari tabel
 * `data_completeness`: tabel itu berkunci periode bulan kalender, sedangkan
 * layar boleh disaring ke rentang tanggal mana pun. Membaca tabelnya untuk
 * rentang yang tidak sama persis akan menampilkan penanda dari periode lain.
 *
 * Kanal tanpa omzet sama sekali tetap dikembalikan dengan tingkat `empty`.
 * Menghilangkannya dari daftar membuat pengguna mengira kanal itu tidak ada
 * masalah, padahal justru belum ada datanya sama sekali.
 *
 * ATURAN MUTLAK: tidak ada kanal yang rinciannya diperkirakan dari kanal lain.
 * Komposisi menu di GoFood bukan bukti apa pun tentang komposisi menu di
 * warung. Kanal `partial` mengembalikan omzetnya apa adanya dan berhenti di
 * situ — halaman yang memakainya menulis "belum lengkap", bukan angka tebakan.
 */
export function kelengkapanKanal(
  terinci: { channel_id: string; total_amount: number }[],
  totalHarian: { channel_id: string; total_amount: number }[],
  kanal: Kanal[],
): KelengkapanKanal[] {
  const jumlahkan = (baris: { channel_id: string; total_amount: number }[]) => {
    const peta = new Map<string, number>();
    for (const b of baris) {
      peta.set(b.channel_id, (peta.get(b.channel_id) ?? 0) + (Number(b.total_amount) || 0));
    }
    return peta;
  };

  const rinci = jumlahkan(terinci);
  const total = jumlahkan(totalHarian);

  return kanal.map((k) => {
    const omzetTerinci = rinci.get(k.id) ?? 0;
    const omzetTotal = omzetTerinci + (total.get(k.id) ?? 0);
    return {
      kanal: k,
      tingkat: tingkatKelengkapan(omzetTerinci, omzetTotal),
      omzetTerinci,
      omzetTotal,
      persen: omzetTotal > 0 ? (omzetTerinci / omzetTotal) * 100 : null,
    };
  });
}
