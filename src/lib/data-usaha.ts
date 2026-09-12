import "server-only";

import { semuaBaris } from "./paginasi";
import { supabaseServer } from "./supabase";
import { rakitFakta, hitungSkor, tambahHari, type HasilSkor, type Fakta } from "./skor";
import type { BarisPenjualan, ProdukBiaya } from "./hitung";
import type { BarisBiaya, BarisRinci, BarisTotal } from "./ringkasan";

/** Pengambilan data periode yang dipakai bersama oleh dashboard (F8), panel
 *  insight (F7), dan laporan (F6).
 *
 *  Dikumpulkan di satu tempat karena ketiganya WAJIB melihat angka yang sama.
 *  Kalau masing-masing halaman menyusun kuerinya sendiri, cepat atau lambat
 *  salah satunya lupa menjumlahkan `sales_totals` dan pengguna melihat dua
 *  omzet berbeda untuk bulan yang sama di dua halaman aplikasi yang sama.
 *
 *  Semua kueri lewat `semuaBaris`: PostgREST memotong balikan di 1.000 baris
 *  tanpa memberi tahu, dan omzet yang diam-diam mengecil adalah persis hal yang
 *  dilarang aturan keras. */

export type PenjualanRinci = BarisPenjualan & { sale_date: string };

export type DataPeriode = {
  usaha: {
    name: string;
    owner_name: string | null;
    business_type: string | null;
    address: string | null;
    established_date: string | null;
    has_nib: boolean;
    has_npwp: boolean;
  } | null;
  kanal: { id: string; name: string; commission_pct: number }[];
  produk: ProdukBiaya[];
  /** Tabel `sales` — berrincian item. */
  penjualan: PenjualanRinci[];
  /** Tabel `sales_totals` — total harian tanpa rincian. */
  totalHarian: BarisTotal[];
  pengeluaran: (BarisBiaya & { category: string })[];
};

/** sv-SE = "YYYY-MM-DD" waktu lokal. `toISOString()` memakai UTC dan menggeser
 *  tanggal mundur satu hari sepanjang pagi di WIB. */
export const hariIniLokal = () => new Date().toLocaleDateString("sv-SE");

export async function muatPeriode(mulai: string, selesai: string): Promise<DataPeriode> {
  const supabase = supabaseServer();

  const [usaha, kanal, produkMentah, penjualan, totalHarian, pengeluaran] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, owner_name, business_type, address, established_date, has_nib, has_npwp")
      .maybeSingle()
      .then((r) => r.data),

    supabase
      .from("channels")
      .select("id, name, commission_pct")
      .eq("is_active", true)
      .order("name")
      .then((r) => (r.data ?? []).map((k) => ({ ...k, commission_pct: Number(k.commission_pct) }))),

    supabase
      .from("products")
      .select("id, name, selling_price, waste_pct, cost_components(id, name, type, cost_per_unit)")
      .order("name")
      .then((r) => r.data ?? []),

    semuaBaris<PenjualanRinci>((d, s) =>
      supabase
        .from("sales")
        .select("product_id, product_name_raw, quantity, total_amount, channel_id, sale_date")
        .gte("sale_date", mulai)
        .lte("sale_date", selesai)
        .order("id")
        .range(d, s),
    ),

    semuaBaris<BarisTotal>((d, s) =>
      supabase
        .from("sales_totals")
        .select("channel_id, total_amount, transaction_count, sale_date")
        .gte("sale_date", mulai)
        .lte("sale_date", selesai)
        .order("id")
        .range(d, s),
    ),

    semuaBaris<BarisBiaya & { category: string }>((d, s) =>
      supabase
        .from("expenses")
        .select("category, amount, expense_date")
        .gte("expense_date", mulai)
        .lte("expense_date", selesai)
        .order("id")
        .range(d, s),
    ),
  ]);

  // numeric Postgres sampai di sini sebagai string. Dibiarkan apa adanya,
  // penjumlahan di JavaScript akan merangkai teks: "5000" + "3000" = "50003000".
  const produk: ProdukBiaya[] = produkMentah.map((p: Record<string, unknown>) => ({
    id: String(p.id),
    name: String(p.name),
    selling_price: Number(p.selling_price),
    waste_pct: Number(p.waste_pct),
    komponen: ((p.cost_components ?? []) as Record<string, unknown>[]).map((k) => ({
      id: String(k.id),
      name: String(k.name),
      type: k.type as ProdukBiaya["komponen"][number]["type"],
      cost_per_unit: Number(k.cost_per_unit),
    })),
  }));

  return {
    usaha: usaha ?? null,
    kanal,
    produk,
    penjualan,
    totalHarian,
    pengeluaran,
  };
}

/** Bentuk yang diminta `kelengkapanKanal` dan `metrikPeriode`. */
export const keRinci = (b: PenjualanRinci): BarisRinci => ({
  sale_date: b.sale_date,
  channel_id: b.channel_id,
  total_amount: Number(b.total_amount) || 0,
});

// ── Skor KUR ────────────────────────────────────────────────────────────────

/** Cukup untuk menutup 6 bulan penuh ditambah bulan berjalan. */
const JENDELA_SKOR = 220;

export type SkorTersimpan = {
  fakta: Fakta;
  hasil: HasilSkor;
  /** Skor tercatat pada hari yang berbeda sebelum hari ini. null kalau belum
   *  pernah ada — banner "skor turun" tidak muncul tanpa pembanding. */
  sebelumnya: number | null;
  /** Tanggal catatan penjualan terakhir dalam jendela penilaian. Dipakai banner
   *  "sudah sekian hari tidak mencatat" (F11), yang HARUS melihat seluruh
   *  riwayat: tanggal 2 bulan baru, catatan terakhir tanggal 30 bulan lalu,
   *  bulan berjalan kosong — dan banner "belum pernah mencatat" untuk usaha
   *  yang baru kemarin mencatat adalah kebohongan. */
  hariTerakhir: string | null;
  /** Baris penjualan sepanjang jendela penilaian, untuk penanda kelengkapan
   *  di halaman /kur. Dikembalikan dari sini supaya penandanya bercerita
   *  tentang periode yang SAMA dengan skornya — kueri sendiri akan cepat
   *  berbeda rentang begitu salah satu angkanya diubah. */
  rinci: BarisRinci[];
  total: BarisRinci[];
};

/**
 * Menghitung Skor Kesiapan KUR dan mencatatnya ke `readiness_scores` paling
 * banyak sekali sehari.
 *
 * Pembatasan sekali sehari itu yang membuat tabelnya berguna: tanpa itu, satu
 * sesi menelusuri dashboard menghasilkan selusin baris identik dan riwayat
 * perkembangan skor berubah jadi jejak kunjungan. Dengan itu, tabelnya berisi
 * satu titik per hari — yang memang bentuk data yang dibutuhkan banner "skor
 * turun" (FR11.2) dan grafik perkembangan nanti.
 *
 * Penulisan ini TIDAK melanggar aturan keras 1: yang ditulis adalah hasil
 * aritmatika server atas data yang sudah dikonfirmasi manusia, bukan balikan
 * model. Tidak ada satu pun angka dari AI yang lewat sini.
 */
export async function muatSkor(hariIni: string): Promise<SkorTersimpan> {
  const supabase = supabaseServer();
  const sejak = tambahHari(hariIni, -JENDELA_SKOR);

  const [usaha, rinci, total, pengeluaran, riwayat] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, established_date, has_nib, has_npwp")
      .maybeSingle()
      .then((r) => r.data),

    semuaBaris<BarisRinci>((d, s) =>
      supabase
        .from("sales")
        .select("sale_date, total_amount, channel_id")
        .gte("sale_date", sejak)
        .lte("sale_date", hariIni)
        .order("id")
        .range(d, s),
    ),

    semuaBaris<BarisRinci>((d, s) =>
      supabase
        .from("sales_totals")
        .select("sale_date, total_amount, channel_id")
        .gte("sale_date", sejak)
        .lte("sale_date", hariIni)
        .order("id")
        .range(d, s),
    ),

    semuaBaris<{ expense_date: string; amount: number }>((d, s) =>
      supabase
        .from("expenses")
        .select("expense_date, amount")
        .gte("expense_date", sejak)
        .lte("expense_date", hariIni)
        .order("id")
        .range(d, s),
    ),

    // Dua baris, bukan satu: begitu skor hari ini tercatat, baris terbaru
    // adalah skor yang sedang ditampilkan. Pembandingnya ada di baris kedua,
    // dan tanpa itu banner "skor turun" hilang sendiri setelah halaman dimuat
    // sekali — persis hari ketika banner itu paling perlu terlihat.
    supabase
      .from("readiness_scores")
      .select("total_score, calculated_at")
      .order("calculated_at", { ascending: false })
      .limit(2)
      .then((r) => r.data ?? []),
  ]);

  const fakta = rakitFakta(
    [
      ...rinci.map((b) => ({ ...b, terinci: true })),
      ...total.map((b) => ({ ...b, terinci: false })),
    ],
    pengeluaran,
    usaha ?? null,
    hariIni,
  );
  const hasil = hitungSkor(fakta);

  // ponytail: tanggal dibandingkan dari awalan ISO UTC milik calculated_at,
  // sementara `hariIni` waktu lokal. Selisihnya hanya berarti satu baris
  // tambahan pada sesi lewat tengah malam WIB. Simpan kolom `date` terpisah
  // kalau grafik perkembangan skor per hari jadi dibuat.
  const sudahDicatatHariIni = riwayat[0]?.calculated_at?.slice(0, 10) === hariIni;

  if (usaha && !sudahDicatatHariIni) {
    await supabase.from("readiness_scores").insert({
      business_id: usaha.id,
      total_score: hasil.total,
      breakdown: hasil.kriteria,
      recommendations: hasil.kriteria.filter((k) => k.langkah).map((k) => k.langkah),
    });
  }

  // Pembandingnya baris dari hari yang BERBEDA. Baris hari ini adalah skor yang
  // sedang ditampilkan; membandingkannya dengan dirinya sendiri tidak pernah
  // menghasilkan apa pun.
  const lawas = riwayat.find((r) => r.calculated_at?.slice(0, 10) !== hariIni);

  const tanggalJual = [...rinci, ...total]
    .filter((b) => Number(b.total_amount) > 0)
    .map((b) => b.sale_date)
    .sort();

  return {
    fakta,
    hasil,
    sebelumnya: lawas ? lawas.total_score : null,
    hariTerakhir: tanggalJual[tanggalJual.length - 1] ?? null,
    rinci,
    total,
  };
}
