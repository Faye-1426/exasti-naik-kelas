/** Mesin perhitungan margin (F5). Rumus persis dari CLAUDE.md:
 *
 *    HPP Dasar      = bahan baku + kemasan + energi + tenaga kerja
 *    HPP + Susut    = HPP Dasar × (1 + persentase susut)
 *    Potongan Kanal = harga jual × persentase komisi kanal
 *    Margin Nominal = harga jual − HPP+Susut − Potongan Kanal
 *    Margin Persen  = (Margin Nominal ÷ harga jual) × 100
 *
 *  Aturan keras 4: perhitungan ada di sisi server. Berkas ini murni — tanpa
 *  jaringan, tanpa basis data — supaya bisa diuji tanpa kunci API dan tanpa
 *  Supabase (lihat hitung.test.ts). Yang menyentuh basis data ada di
 *  margin-data.ts dan produk-actions.ts.
 *
 *  Aturan keras 2 dipegang lewat tipe: setiap angka yang bergantung pada HPP
 *  bertipe `number | null`. Produk tanpa komponen biaya TIDAK dianggap ber-HPP
 *  nol — omzetnya tetap tampil, marginnya `null` dan ditandai belum bisa
 *  dihitung. Menganggapnya nol akan melaporkan untung 100%. */

export type TipeBiaya = "material" | "packaging" | "energy" | "labor";

/** Urutannya menentukan urutan tampil di layar rincian biaya. */
export const TIPE_BIAYA: { nilai: TipeBiaya; label: string }[] = [
  { nilai: "material", label: "Bahan baku" },
  { nilai: "packaging", label: "Kemasan" },
  { nilai: "energy", label: "Energi" },
  { nilai: "labor", label: "Tenaga kerja" },
];

export const labelTipe = (t: TipeBiaya) =>
  TIPE_BIAYA.find((x) => x.nilai === t)?.label ?? t;

export type KomponenBiaya = {
  id?: string;
  name: string;
  type: TipeBiaya;
  cost_per_unit: number;
};

export type ProdukBiaya = {
  id: string;
  name: string;
  selling_price: number;
  waste_pct: number;
  komponen: KomponenBiaya[];
};

export type Kanal = { id: string; name: string; commission_pct: number };

// ── Rumus dasar ─────────────────────────────────────────────────────────────

/** Jumlah seluruh komponen, apa pun tipenya. Pemisahan tipe hanya untuk
 *  menjelaskan ke pengguna dari mana biayanya datang. */
export function hppDasar(komponen: KomponenBiaya[]): number {
  return komponen.reduce((n, k) => n + (Number(k.cost_per_unit) || 0), 0);
}

export function hppSusut(dasar: number, wastePct: number): number {
  return dasar * (1 + wastePct / 100);
}

/** Hanya berlaku pada kanal digital. Kanal Offline punya commission_pct 0,
 *  jadi tidak perlu percabangan berdasarkan nama kanal di sini. */
export function potonganKanal(hargaJual: number, komisiPct: number): number {
  return hargaJual * (komisiPct / 100);
}

/** null saat harga jual belum diisi — bukan 0%. Pembagian dengan nol
 *  menghasilkan Infinity, dan Infinity yang lolos ke layar terbaca sebagai
 *  angka sungguhan. */
export function marginPersen(nominal: number, hargaJual: number): number | null {
  return hargaJual > 0 ? (nominal / hargaJual) * 100 : null;
}

export type HasilMargin = {
  hpp: number;
  potongan: number;
  nominal: number;
  persen: number | null;
};

/** Margin satu produk pada satu kanal, per satu porsi. */
export function marginSatuan(
  hargaJual: number,
  dasarHpp: number,
  wastePct: number,
  komisiPct: number,
): HasilMargin {
  const hpp = hppSusut(dasarHpp, wastePct);
  const potongan = potonganKanal(hargaJual, komisiPct);
  const nominal = hargaJual - hpp - potongan;
  return { hpp, potongan, nominal, persen: marginPersen(nominal, hargaJual) };
}

/** Margin satu produk di SETIAP kanal. Satu produk yang sama punya margin
 *  berbeda per kanal — itu temuan utama aplikasi ini, jadi ditampilkan
 *  berdampingan, bukan sebagai satu angka rata-rata.
 *
 *  `hargaSimulasi` dipakai layar rincian produk untuk melihat dampak harga baru
 *  tanpa menyimpan apa pun. */
export function marginPerKanal(
  produk: Pick<ProdukBiaya, "selling_price" | "waste_pct" | "komponen">,
  kanal: Kanal[],
  hargaSimulasi?: number,
): (Kanal & HasilMargin)[] {
  const harga = hargaSimulasi ?? produk.selling_price;
  const dasar = hppDasar(produk.komponen);
  return kanal.map((k) => ({
    ...k,
    ...marginSatuan(harga, dasar, produk.waste_pct, k.commission_pct),
  }));
}

// ── Peringkasan dari data penjualan ─────────────────────────────────────────

/** Satu baris dari tabel `sales` — penjualan BERRINCIAN item.
 *
 *  Data `sales_totals` sengaja tidak punya bentuk di sini. Total harian tidak
 *  tahu produk apa yang terjual, jadi tidak pernah boleh masuk perhitungan
 *  margin per produk. Kontribusinya ke omzet dihitung terpisah di `cakupan()`. */
export type BarisPenjualan = {
  product_id: string | null;
  product_name_raw: string | null;
  quantity: number;
  total_amount: number;
  channel_id: string;
};

export type BarisMargin = {
  /** null untuk baris yang namanya belum pernah dicocokkan ke master produk. */
  produkId: string | null;
  nama: string;
  qty: number;
  omzet: number;
  /** null = HPP belum bisa dihitung. Bukan nol. */
  hppTotal: number | null;
  potongan: number;
  marginNominal: number | null;
  marginPersen: number | null;
  /** Alasan margin belum bisa dihitung, ditampilkan apa adanya ke pengguna. */
  alasanKosong: string | null;
};

/**
 * Mengubah baris penjualan berrincian menjadi satu baris per produk.
 *
 * Potongan platform diambil dari `commission_pct` kanal tempat baris itu
 * terjual — BUKAN dari `fees[]` hasil parsing AI. Potongan di laporan
 * marketplace berubah tiap hari karena promo dan subsidi, sedangkan margin
 * butuh persentase yang stabil dan bisa dijelaskan ke petugas bank.
 *
 * Karena potongan dihitung per baris penjualan, satu produk yang terjual di dua
 * kanal tetap dipotong sesuai kanalnya masing-masing walau ditampilkan sebagai
 * satu baris gabungan.
 */
export function ringkasMargin(
  penjualan: BarisPenjualan[],
  produk: ProdukBiaya[],
  kanal: Kanal[],
): BarisMargin[] {
  const petaProduk = new Map(produk.map((p) => [p.id, p]));
  const komisi = new Map(kanal.map((k) => [k.id, k.commission_pct]));
  const kumpul = new Map<string, BarisMargin>();

  for (const b of penjualan) {
    const p = b.product_id ? petaProduk.get(b.product_id) : undefined;
    // Baris tanpa product_id dikelompokkan per nama mentahnya. Dibuang berarti
    // omzetnya hilang dari analisis tanpa pengguna pernah tahu.
    const kunci = p?.id ?? `mentah:${(b.product_name_raw ?? "").toLowerCase()}`;
    const qty = Number(b.quantity) || 0;
    const nilai = Number(b.total_amount) || 0;

    let baris = kumpul.get(kunci);
    if (!baris) {
      baris = {
        produkId: p?.id ?? null,
        nama: p?.name ?? b.product_name_raw ?? "Tanpa nama",
        qty: 0,
        omzet: 0,
        hppTotal: p && p.komponen.length > 0 ? 0 : null,
        potongan: 0,
        marginNominal: null,
        marginPersen: null,
        alasanKosong: !p
          ? "Nama ini belum ditautkan ke produk mana pun"
          : p.komponen.length === 0
            ? "Komponen biaya produk ini belum diisi"
            : null,
      };
      kumpul.set(kunci, baris);
    }

    baris.qty += qty;
    baris.omzet += nilai;
    baris.potongan += potonganKanal(nilai, komisi.get(b.channel_id) ?? 0);
    if (baris.hppTotal !== null && p) {
      baris.hppTotal += hppSusut(hppDasar(p.komponen), p.waste_pct) * qty;
    }
  }

  // Array.from, bukan spread: target tsconfig masih ES5 dan iterasi Map
  // langsung tidak diizinkan di sana.
  for (const baris of Array.from(kumpul.values())) {
    if (baris.hppTotal === null) continue;
    baris.marginNominal = baris.omzet - baris.hppTotal - baris.potongan;
    baris.marginPersen = marginPersen(baris.marginNominal, baris.omzet);
  }

  return Array.from(kumpul.values());
}

// ── Cakupan data ────────────────────────────────────────────────────────────

export type Cakupan = {
  /** Omzet yang punya rincian item — satu-satunya yang masuk analisis margin. */
  omzetTerinci: number;
  /** Omzet dari KEDUA tabel. Inilah omzet yang sebenarnya. */
  omzetTotal: number;
  /** 0-100. null saat belum ada omzet sama sekali. */
  persen: number | null;
  /** Nama kanal yang punya omzet tapi tanpa rincian item. */
  kanalTanpaRincian: string[];
};

/** Pembandingnya WAJIB omzet dari kedua tabel. Kalau hanya tabel `sales` yang
 *  dihitung, cakupan selalu tampak 100% dan pengguna menyimpulkan analisis ini
 *  mencakup seluruh usahanya — padahal separuh omzetnya belum terinci. */
export function cakupan(
  penjualan: BarisPenjualan[],
  totalHarian: { channel_id: string; total_amount: number }[],
  kanal: Kanal[],
): Cakupan {
  const namaKanal = new Map(kanal.map((k) => [k.id, k.name]));
  const terinci = penjualan.reduce((n, b) => n + (Number(b.total_amount) || 0), 0);
  const tanpaRincian = totalHarian.reduce((n, b) => n + (Number(b.total_amount) || 0), 0);
  const total = terinci + tanpaRincian;

  return {
    omzetTerinci: terinci,
    omzetTotal: total,
    persen: total > 0 ? (terinci / total) * 100 : null,
    kanalTanpaRincian: Array.from(
      new Set(
        totalHarian
          .filter((b) => Number(b.total_amount) > 0)
          .map((b) => namaKanal.get(b.channel_id) ?? "Kanal tidak dikenal"),
      ),
    ),
  };
}

/** Kalimat cakupan untuk ditempel di atas tabel margin. WAJIB ada — tanpa ini
 *  angka margin terbaca seolah mewakili seluruh usaha. */
export function kalimatCakupan(c: Cakupan): string {
  if (c.persen === null) return "Belum ada penjualan tercatat pada rentang ini.";
  const persen = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(c.persen);
  const inti = `Analisis ini mencakup ${persen}% dari total omzet.`;
  if (c.kanalTanpaRincian.length === 0) return `${inti} Seluruh penjualan sudah terinci.`;
  return `${inti} Kanal ${gabung(c.kanalTanpaRincian)} belum terinci.`;
}

/** "Offline", "Offline dan GoFood", "Offline, GoFood, dan ShopeeFood". */
function gabung(daftar: string[]): string {
  if (daftar.length <= 1) return daftar[0] ?? "";
  if (daftar.length === 2) return `${daftar[0]} dan ${daftar[1]}`;
  return `${daftar.slice(0, -1).join(", ")}, dan ${daftar[daftar.length - 1]}`;
}

// ── Sorotan untuk ringkasan di atas tabel ───────────────────────────────────

export type Sorotan = {
  palingUntung: BarisMargin | null;
  palingRugi: BarisMargin | null;
  penyumbangOmzet: BarisMargin | null;
};

/** Paling untung dan paling rugi diukur dari margin NOMINAL, bukan persen:
 *  produk bermargin 80% yang terjual dua porsi bukan penyumbang untung
 *  terbesar. Baris yang marginnya belum bisa dihitung tidak ikut dibandingkan —
 *  membandingkannya berarti menganggap null sebagai nol. */
export function sorotan(baris: BarisMargin[]): Sorotan {
  const urut = baris
    .filter((b): b is BarisMargin & { marginNominal: number } => b.marginNominal !== null)
    .sort((a, b) => b.marginNominal - a.marginNominal);

  const teratas = urut[0];
  const terbawah = urut[urut.length - 1];

  return {
    palingUntung: teratas && teratas.marginNominal > 0 ? teratas : null,
    // Hanya ditampilkan kalau memang rugi. Produk untung terkecil bukan "paling rugi".
    palingRugi: terbawah && terbawah.marginNominal < 0 ? terbawah : null,
    penyumbangOmzet: [...baris].sort((a, b) => b.omzet - a.omzet)[0] ?? null,
  };
}
