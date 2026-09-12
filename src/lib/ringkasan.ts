/** Agregat untuk dashboard (F8), panel insight (F7), laporan (F6), dan banner
 *  peringatan (F11).
 *
 *  Berkas ini MURNI — tidak ada impor yang tersisa saat dijalankan, jadi bisa
 *  diuji `node --test` tanpa Supabase dan tanpa kunci API (lihat
 *  ringkasan.test.ts). Yang menyentuh basis data ada di halaman.
 *
 *  Aturan keras 4: seluruh perhitungan di sisi server. Klien menerima angka
 *  jadi; grafik hanya menggambar titik yang sudah dihitung di sini.
 *
 *  Dua keputusan yang menjaga aturan keras 2 (tidak ada angka tebakan):
 *
 *  1. `pengeluaran` dan `untungBersih` bertipe `number | null`. Periode tanpa
 *     satu pun pengeluaran tercatat BUKAN periode tanpa biaya — kartu untung
 *     bersihnya menulis "belum ada data", bukan angka yang sama dengan omzet.
 *
 *  2. `jumlahTransaksi` HANYA dijumlahkan dari `sales_totals.transaction_count`
 *     yang memang terisi. Baris tabel `sales` adalah baris barang, bukan
 *     transaksi: satu pesanan berisi tiga menu menghasilkan tiga baris.
 *     Menghitung barisnya akan melipatgandakan jumlah transaksi dan mengecilkan
 *     rata-rata nilai transaksi, dua-duanya tanpa ada yang tahu. */

import type { HasilInsight } from "./gemini";
import type { KelengkapanKanal } from "./parsing";

// ── Insight Mingguan (F7) ───────────────────────────────────────────────────
// Bentuknya tinggal di sini, bukan di insight-actions.ts, karena panel insight
// adalah komponen klien: berkas "use server" tidak boleh mengekspor apa pun
// selain fungsi async, dan gemini.ts memuat "server-only".

export type InsightTersimpan = {
  hasil: HasilInsight;
  /** Waktu pembuatan, ISO. */
  dibuat: string;
  periode: { mulai: string; selesai: string };
};

export type BalasanInsight =
  | { ok: true; hasil: HasilInsight }
  | { ok: false; galat: string };

// ── Bentuk baris masukan ────────────────────────────────────────────────────

export type BarisRinci = {
  sale_date: string;
  channel_id: string;
  total_amount: number;
};

export type BarisTotal = BarisRinci & {
  /** null kalau catatan totalnya tidak menyebutkan berapa kali transaksi. */
  transaction_count: number | null;
};

export type BarisBiaya = { expense_date: string; amount: number };

const n = (v: unknown) => Number(v) || 0;

// ── Kartu metrik ────────────────────────────────────────────────────────────

export type Metrik = {
  /** Dari KEDUA tabel penjualan. Inilah omzet yang sebenarnya. */
  omzet: number;
  /** Bagian omzet yang punya rincian barang. */
  omzetTerinci: number;
  /** null = belum ada pengeluaran tercatat, bukan nol. */
  pengeluaran: number | null;
  untungBersih: number | null;
  /** Hanya dari catatan yang menyebutkan jumlah transaksinya. */
  jumlahTransaksi: number | null;
  /** Omzet yang ikut dalam hitungan transaksi di atas — pembagi rata-rata. */
  omzetBertransaksi: number;
  rataTransaksi: number | null;
  /** Tanggal terakhir yang punya catatan penjualan. null kalau belum ada. */
  hariTerakhir: string | null;
  /** Banyaknya tanggal berbeda yang punya catatan pada periode ini. */
  hariTercatat: number;
};

export function metrikPeriode(
  rinci: BarisRinci[],
  total: BarisTotal[],
  pengeluaran: BarisBiaya[],
): Metrik {
  let omzetTerinci = 0;
  let omzetTotal = 0;
  let transaksi = 0;
  let omzetBertransaksi = 0;
  let adaHitunganTransaksi = false;
  const tanggal = new Set<string>();

  for (const b of rinci) {
    omzetTerinci += n(b.total_amount);
    tanggal.add(b.sale_date);
  }
  for (const b of total) {
    omzetTotal += n(b.total_amount);
    tanggal.add(b.sale_date);
    if (b.transaction_count !== null && Number.isFinite(Number(b.transaction_count))) {
      adaHitunganTransaksi = true;
      transaksi += n(b.transaction_count);
      omzetBertransaksi += n(b.total_amount);
    }
  }
  omzetTotal += omzetTerinci;

  const biaya = pengeluaran.reduce((t, b) => t + n(b.amount), 0);
  // Nol baris pengeluaran berarti belum dicatat, bukan tidak ada biaya.
  const adaBiaya = pengeluaran.length > 0;

  const hari = Array.from(tanggal).sort();

  return {
    omzet: omzetTotal,
    omzetTerinci,
    pengeluaran: adaBiaya ? biaya : null,
    untungBersih: adaBiaya ? omzetTotal - biaya : null,
    jumlahTransaksi: adaHitunganTransaksi ? transaksi : null,
    omzetBertransaksi,
    rataTransaksi: adaHitunganTransaksi && transaksi > 0 ? omzetBertransaksi / transaksi : null,
    hariTerakhir: hari[hari.length - 1] ?? null,
    hariTercatat: hari.length,
  };
}

// ── Tren omzet harian ───────────────────────────────────────────────────────

export type TitikHari = { tanggal: string; omzet: number; adaCatatan: boolean };

const HARI_MS = 86_400_000;

const keUtc = (iso: string) =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

/**
 * Satu titik untuk SETIAP tanggal dalam periode, termasuk tanggal yang tidak
 * punya catatan sama sekali.
 *
 * Hari kosong diberi `omzet: 0` beserta `adaCatatan: false`. Keduanya perlu:
 * grafik garis yang melompati hari kosong akan menyambungkan Senin ke Kamis
 * sebagai garis lurus yang landai, dan pemiliknya membaca itu sebagai jualan
 * yang stabil padahal dua hari di antaranya tidak dicatat. Penanda
 * `adaCatatan` dipakai layar untuk menulis "belum dicatat", bukan "Rp 0".
 */
export function trenHarian(
  rinci: BarisRinci[],
  total: BarisRinci[],
  mulai: string,
  selesai: string,
): TitikHari[] {
  const per = new Map<string, number>();
  for (const b of [...rinci, ...total]) {
    if (b.sale_date < mulai || b.sale_date > selesai) continue;
    per.set(b.sale_date, (per.get(b.sale_date) ?? 0) + n(b.total_amount));
  }

  const titik: TitikHari[] = [];
  for (let t = keUtc(mulai); t <= keUtc(selesai); t += HARI_MS) {
    const iso = new Date(t).toISOString().slice(0, 10);
    const omzet = per.get(iso);
    titik.push({ tanggal: iso, omzet: omzet ?? 0, adaCatatan: omzet !== undefined });
  }
  return titik;
}

// ── Komposisi per kanal ─────────────────────────────────────────────────────

export type BagianKanal = KelengkapanKanal & {
  /** Bagian kanal ini dari seluruh omzet periode, 0-100. null saat omzet nol. */
  persenOmzet: number | null;
};

/** Kelengkapan per kanal ditambah porsinya terhadap omzet. Kanal tanpa omzet
 *  tetap ikut supaya "belum ada data" terlihat sebagai keadaan, bukan sebagai
 *  kanal yang hilang dari daftar. */
export function komposisiKanal(daftar: KelengkapanKanal[]): BagianKanal[] {
  const semua = daftar.reduce((t, k) => t + k.omzetTotal, 0);
  return daftar
    .map((k) => ({ ...k, persenOmzet: semua > 0 ? (k.omzetTotal / semua) * 100 : null }))
    .sort((a, b) => b.omzetTotal - a.omzetTotal);
}

// ── Banner peringatan (F11) ─────────────────────────────────────────────────

export type Peringatan = {
  /** Dipakai untuk menutup banner ini saja, sepanjang hari ini (FR11.4). */
  kunci: string;
  judul: string;
  isi: string;
  href: string;
  aksi: string;
  nada: "amber" | "negative";
};

export type BahanPeringatan = {
  hariIni: string;
  /** Tanggal catatan penjualan terakhir, dari seluruh riwayat. */
  hariTerakhir: string | null;
  /** Nama produk yang margin nominalnya minus pada periode berjalan. */
  produkRugi: string[];
  /** Nama kanal bertingkat `partial`. */
  kanalSebagian: string[];
  /** Skor sekarang dan skor tercatat sebelumnya. null = belum ada riwayat. */
  skorSekarang: number;
  skorSebelumnya: number | null;
};

const BATAS_SEPI = 3; // FR11.2

/** FR11.4 — banner yang ditutup tidak muncul lagi hari itu. Penandanya cookie,
 *  bukan localStorage (aturan keras 3), dan bukan kolom basis data: dashboard
 *  dirender di server, jadi penandanya harus ikut permintaan supaya banner yang
 *  sudah ditutup tidak sempat terlukis lalu menghilang di depan mata pengguna.
 *
 *  Nilainya daftar kunci dipisah TITIK. Koma adalah pemisah antar-cookie di
 *  header Set-Cookie dan sebagian proksi memotongnya di sana. */
export const COOKIE_BANNER = "banner_tutup";

export const pisahKunci = (nilai: string | undefined): string[] =>
  (nilai ?? "").split(".").filter(Boolean);

/**
 * Kondisi yang perlu perhatian, terurut dari yang paling mendesak.
 *
 * Semuanya berasal dari angka yang sudah dihitung — tidak ada kondisi yang
 * ditebak. Banner "belum mencatat" hanya muncul kalau memang ada jeda; usaha
 * yang belum pernah mencatat sama sekali mendapat ajakan mulai, bukan tuduhan
 * berhenti mencatat.
 */
export function peringatan(b: BahanPeringatan): Peringatan[] {
  const daftar: Peringatan[] = [];

  const jeda =
    b.hariTerakhir === null
      ? null
      : Math.round((keUtc(b.hariIni) - keUtc(b.hariTerakhir)) / HARI_MS);

  if (b.hariTerakhir === null) {
    daftar.push({
      kunci: "belum-mulai",
      judul: "Belum ada penjualan yang tercatat",
      isi: "Catatan pertama Anda adalah titik awal riwayat usaha yang nanti dibaca bank. Mulai dari penjualan hari ini saja.",
      href: "/tambah",
      aksi: "Catat penjualan",
      nada: "amber",
    });
  } else if (jeda !== null && jeda > BATAS_SEPI) {
    daftar.push({
      kunci: "sepi-catatan",
      judul: `Sudah ${jeda} hari tidak ada catatan penjualan`,
      isi: `Catatan terakhir Anda ${b.hariTerakhir}. Hari yang bolong ikut menurunkan skor Konsistensi pencatatan, dan tidak bisa diisi belakangan dengan angka kira-kira.`,
      href: "/tambah",
      aksi: "Catat sekarang",
      nada: "amber",
    });
  }

  if (b.produkRugi.length > 0) {
    const nama = b.produkRugi.slice(0, 3).join(", ");
    const sisa = b.produkRugi.length - 3;
    daftar.push({
      kunci: "margin-negatif",
      judul:
        b.produkRugi.length === 1
          ? `${b.produkRugi[0]} dijual di bawah modal`
          : `${b.produkRugi.length} menu dijual di bawah modal`,
      isi: `${nama}${sisa > 0 ? `, dan ${sisa} lainnya` : ""} — setelah modal dan potongan kanal, yang tersisa minus. Makin laris makin rugi.`,
      href: "/margin",
      aksi: "Lihat margin",
      nada: "negative",
    });
  }

  if (b.kanalSebagian.length > 0) {
    daftar.push({
      kunci: "kanal-sebagian",
      judul: `Untung per menu di ${b.kanalSebagian.join(" dan ")} belum bisa dihitung`,
      isi: "Omzetnya sudah tercatat, tapi belum tahu barang apa saja yang terjual. Sebutkan lewat suara — tidak perlu mengetik.",
      href: "/tambah?jalur=voice_input",
      aksi: "Lengkapi lewat suara",
      nada: "amber",
    });
  }

  if (b.skorSebelumnya !== null && b.skorSekarang < b.skorSebelumnya) {
    daftar.push({
      kunci: "skor-turun",
      judul: `Skor KUR turun ${b.skorSebelumnya - b.skorSekarang} poin`,
      isi: `Dari ${b.skorSebelumnya} menjadi ${b.skorSekarang}. Halaman Kesiapan KUR menunjukkan kriteria mana yang berubah dan apa langkah perbaikannya.`,
      href: "/kur",
      aksi: "Lihat rinciannya",
      nada: "negative",
    });
  }

  return daftar;
}

// ── Laba rugi sederhana untuk laporan (F6) ──────────────────────────────────

export type BarisLabaRugi = { label: string; nilai: number | null; tebal?: boolean };

/** Laba rugi sederhana, sengaja tanpa istilah akuntansi (CLAUDE.md §Bahasa).
 *  Pengeluaran dikelompokkan per kategori apa adanya dari catatan pengguna —
 *  tidak dipetakan ke pos akuntansi baku, karena pemetaan itu akan menciptakan
 *  angka yang tidak pernah dia tulis. */
export function labaRugi(
  omzet: number,
  pengeluaran: { category: string; amount: number }[],
): BarisLabaRugi[] {
  const per = new Map<string, number>();
  for (const b of pengeluaran) {
    per.set(b.category, (per.get(b.category) ?? 0) + n(b.amount));
  }
  const rincian = Array.from(per.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, nilai]) => ({ label, nilai }));

  const totalBiaya = rincian.reduce((t, b) => t + b.nilai, 0);

  return [
    { label: "Uang masuk dari penjualan", nilai: omzet, tebal: true },
    ...rincian,
    {
      label: "Jumlah uang keluar",
      nilai: pengeluaran.length > 0 ? totalBiaya : null,
      tebal: true,
    },
    {
      label: "Untung bersih",
      nilai: pengeluaran.length > 0 ? omzet - totalBiaya : null,
      tebal: true,
    },
  ];
}

/** Uang masuk dan uang keluar per bulan kalender, untuk ringkasan arus kas. */
export function arusKasBulanan(
  masuk: BarisRinci[],
  keluar: BarisBiaya[],
): { bulan: string; masuk: number; keluar: number }[] {
  const per = new Map<string, { masuk: number; keluar: number }>();
  const ambil = (kunci: string) => {
    let x = per.get(kunci);
    if (!x) per.set(kunci, (x = { masuk: 0, keluar: 0 }));
    return x;
  };

  for (const b of masuk) ambil(b.sale_date.slice(0, 7)).masuk += n(b.total_amount);
  for (const b of keluar) ambil(b.expense_date.slice(0, 7)).keluar += n(b.amount);

  return Array.from(per.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([bulan, x]) => ({ bulan, ...x }));
}
