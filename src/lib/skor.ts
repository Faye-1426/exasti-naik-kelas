/** Mesin Skor Kesiapan KUR (F5). Fitur andalan produk.
 *
 *  Berkas ini MURNI — tanpa jaringan, tanpa basis data, tanpa impor — supaya
 *  bisa diuji dengan `node --test` tanpa Supabase dan tanpa kunci API (lihat
 *  skor.test.ts). Yang menyentuh basis data ada di halaman /kur.
 *
 *  Dua aturan yang memandu seluruh berkas ini:
 *
 *  Aturan keras 4 — seluruh perhitungan di sisi server. Klien hanya menerima
 *  angka jadi.
 *
 *  Aturan keras 2 — tidak ada angka tebakan. Kriteria yang datanya belum ada
 *  diberi skor 0 dengan alasan "belum bisa dinilai", BUKAN diperkirakan dari
 *  kriteria lain. Perkiraan tanggal pada langkah perbaikan bukan pelanggaran:
 *  itu proyeksi dari syarat yang disebutkan, selalu disertai syaratnya, dan
 *  tidak pernah masuk ke angka skor.
 *
 *  LIMA dari enam kriteria terhitung penuh walau kanal hanya punya data di
 *  `sales_totals` — itu yang membuat fitur andalan tetap berguna bagi mayoritas
 *  pengguna yang jualannya offline. Satu-satunya yang terpengaruh adalah
 *  Profitabilitas, dan pengaruhnya hanya pada RINCIAN penyebabnya: skornya tetap
 *  terhitung dari omzet dikurangi pengeluaran, yang keduanya tidak butuh
 *  rincian item. Ditandai lewat `tanpaRincian` di tiap kriteria, dan dijaga
 *  oleh uji "bulan pertama hanya total harian" di skor.test.ts. */

// ── Utilitas tanggal ────────────────────────────────────────────────────────
// Semua tanggal berupa string "YYYY-MM-DD" dan dihitung di UTC. Memakai
// konstruktor Date lokal membuat tanggal bergeser satu hari di zona waktu
// Indonesia, dan "90 hari tercatat" diam-diam jadi 89.

const HARI_MS = 86_400_000;

const keUtc = (iso: string) =>
  Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

const keIso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

export const tambahHari = (iso: string, n: number) => keIso(keUtc(iso) + n * HARI_MS);

/** Positif kalau `b` setelah `a`. */
export const selisihHari = (a: string, b: string) =>
  Math.round((keUtc(b) - keUtc(a)) / HARI_MS);

/** Hari akhir bulan ikut disesuaikan: 31 Januari + 1 bulan = 28 Februari,
 *  bukan 3 Maret seperti bawaan Date. Tenggat yang meleset ke bulan berikutnya
 *  membuat janji di layar tidak cocok dengan hitungannya. */
export function tambahBulan(iso: string, n: number): string {
  const [t, b, h] = iso.split("-").map(Number);
  const akhir = new Date(Date.UTC(t, b + n, 0)).getUTCDate();
  return keIso(Date.UTC(t, b - 1 + n, Math.min(h, akhir)));
}

/** Selisih bulan penuh. 1 Januari sampai 31 Januari masih 0 bulan. */
export function selisihBulan(a: string, b: string): number {
  const [ta, ba, ha] = a.split("-").map(Number);
  const [tb, bb, hb] = b.split("-").map(Number);
  return (tb - ta) * 12 + (bb - ba) - (hb < ha ? 1 : 0);
}

const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "Maret 2027". Tenggat di layar selalu berupa bulan, bukan tanggal persis —
 *  menjanjikan "17 Maret 2027" berarti menjanjikan ketepatan yang tidak
 *  dimiliki proyeksi ini. */
export function bulanTahun(iso: string): string {
  const [t, b] = iso.split("-").map(Number);
  return `${NAMA_BULAN[b - 1]} ${t}`;
}

/** Salinan kecil dari format.ts. Sengaja tidak diimpor: berkas ini harus bisa
 *  dijalankan `node --test` tanpa penyelesai modul milik Next. */
const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const rp = (n: number) => RUPIAH.format(Math.round(n)).replace(/ /g, " ");

const angka = (n: number, desimal = 1) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: desimal }).format(n);

// ── Bentuk data ─────────────────────────────────────────────────────────────

export type KunciKriteria =
  | "konsistensi_pencatatan"
  | "kestabilan_omzet"
  | "profitabilitas"
  | "lama_usaha"
  | "kesehatan_arus_kas"
  | "kelengkapan_dokumen";

/** Langkah perbaikan WAJIB spesifik, terukur, dan bertenggat. `teks` memuat
 *  keadaan sekarang dan targetnya dalam angka; `target` memuat tenggatnya.
 *  "Tingkatkan konsistensi pencatatan Anda" bukan langkah perbaikan — pengguna
 *  tidak tahu apa yang harus dikerjakan besok pagi. */
export type Langkah = {
  teks: string;
  /** "Maret 2027". null kalau tenggatnya ditentukan pengguna, bukan oleh waktu. */
  target: string | null;
  /** Berapa poin yang didapat kalau langkah ini selesai. Untuk mengurutkan. */
  tambahan: number;
};

export type Kriteria = {
  kunci: KunciKriteria;
  label: string;
  bobot: number;
  /** 0..bobot, sudah dibulatkan. */
  skor: number;
  /** true = tetap terhitung penuh walau kanal hanya punya total harian. */
  tanpaRincian: boolean;
  /** Kalimat sehari-hari yang menjelaskan dari mana skornya. */
  alasan: string;
  /** Pasal yang menjadi dasar KRITERIA ini — bukan dasar bobot maupun
   *  ambangnya. Lihat catatan besar di atas `hitungSkor`. Ditampilkan apa
   *  adanya di /kur supaya klaim di layar bisa diperiksa pembacanya. */
  rujukan: string;
  /** null kalau kriteria ini sudah penuh. */
  langkah: Langkah | null;
};

/** Skema KUR menurut Permenko Perekonomian No. 1 Tahun 2026:
 *    Pasal 29 ayat (1) — super mikro, paling banyak Rp10.000.000
 *    Pasal 36 ayat (1) — mikro, di atas Rp10.000.000 s/d Rp100.000.000
 *    Pasal 43 ayat (1) — kecil, di atas Rp100.000.000 s/d Rp500.000.000 */
export type SkemaKur = "KUR Super Mikro" | "KUR Mikro" | "KUR Kecil";

/** Estimasi plafon, bukan penawaran. Selalu berupa rentang. */
export type Plafon = {
  bawah: number;
  atas: number;
  jenis: SkemaKur;
  rataBulanan: number;
  /** Jumlah bulan penuh yang dipakai menghitung rata-rata. */
  bulanDipakai: number;
};

export type HasilSkor = {
  total: number;
  kriteria: Kriteria[];
  /** null kalau belum ada satu pun bulan penuh — tidak ditebak dari data
   *  separuh bulan. */
  plafon: Plafon | null;
};

/** Ringkasan keadaan usaha. Dirakit `rakitFakta` dari baris basis data. */
export type Fakta = {
  hariIni: string;
  /** null kalau profil usaha belum mengisi tanggal berdiri. */
  mulaiUsaha: string | null;
  /** Banyaknya tanggal berbeda yang punya catatan penjualan dalam 180 hari terakhir. */
  hariTercatat: number;
  /** Bulan kalender yang SUDAH LENGKAP, terurut lama ke baru, paling banyak 6. */
  omzetBulanan: { awal: string; omzet: number }[];
  /** Rentang yang dinilai: bulan-bulan penuh di atas, atau seluruh catatan
   *  kalau belum ada satu pun bulan penuh. */
  jendela: { mulai: string; selesai: string };
  /** Dari KEDUA tabel penjualan, sepanjang `jendela`. */
  omzetTotal: number;
  pengeluaranTotal: number;
  /** 0-100, bagian omzet yang punya rincian item. null kalau belum ada omzet.
   *  Tidak pernah mengubah skor — hanya menambah keterangan. */
  cakupanPersen: number | null;
  punyaNib: boolean;
  punyaNpwp: boolean;
};

// ── Perakitan fakta dari baris basis data ───────────────────────────────────

export type BarisOmzet = {
  sale_date: string;
  total_amount: number;
  /** true = dari tabel `sales`, false = dari `sales_totals`. */
  terinci: boolean;
};

export type BarisPengeluaran = { expense_date: string; amount: number };

const JENDELA_PENCATATAN = 180; // 6 bulan, syarat riwayat yang umum diminta bank
const BULAN_DINILAI = 6;

const awalBulan = (iso: string) => `${iso.slice(0, 7)}-01`;

const akhirBulan = (iso: string) => {
  const [t, b] = iso.split("-").map(Number);
  return keIso(Date.UTC(t, b, 0));
};

/**
 * Mengubah baris mentah menjadi `Fakta`.
 *
 * Tiga keputusan yang menentukan benar tidaknya seluruh skor:
 *
 * 1. Omzet SELALU dijumlahkan dari kedua tabel. Menghitung `sales` saja membuat
 *    pengguna yang catatannya berupa total harian terlihat nyaris tanpa omzet.
 *
 * 2. Hanya bulan kalender yang sudah lengkap yang masuk `omzetBulanan`. Bulan
 *    berjalan yang baru jalan tiga hari akan terbaca sebagai anjlok 90% dan
 *    menghancurkan skor Kestabilan omzet tanpa ada yang berubah di warung.
 *    Bulan pertama pencatatan juga dibuang kalau pencatatannya mulai di tengah
 *    bulan, dengan alasan yang sama.
 *
 * 3. Omzet dan pengeluaran dijumlahkan pada RENTANG YANG SAMA. Sewa dan gaji
 *    dibayar sekali sebulan; membandingkan omzet 6 bulan 3 hari dengan
 *    pengeluaran 6 bulan membuat rasio uang masuk selalu tampak lebih sehat
 *    dari kenyataannya.
 */
export function rakitFakta(
  omzet: BarisOmzet[],
  pengeluaran: BarisPengeluaran[],
  usaha: { established_date: string | null; has_nib: boolean; has_npwp: boolean } | null,
  hariIni: string,
): Fakta {
  const batasPencatatan = tambahHari(hariIni, -JENDELA_PENCATATAN);

  const tanggal = new Set<string>();
  let pertama: string | null = null;
  for (const b of omzet) {
    if (!(Number(b.total_amount) > 0)) continue;
    if (b.sale_date > batasPencatatan) tanggal.add(b.sale_date);
    if (pertama === null || b.sale_date < pertama) pertama = b.sale_date;
  }

  // Bulan kalender ke belakang, termasuk bulan berjalan pada n = 0 supaya bisa
  // dibuang oleh syarat "sudah lewat" di bawah.
  const bulanLengkap: { awal: string; akhir: string }[] = [];
  for (let n = 0; n <= BULAN_DINILAI; n++) {
    const awal = awalBulan(tambahBulan(awalBulan(hariIni), -n));
    const akhir = akhirBulan(awal);
    const sudahLewat = akhir < hariIni;
    const sudahMencatat = pertama !== null && pertama <= awal;
    if (sudahLewat && sudahMencatat) bulanLengkap.push({ awal, akhir });
  }
  bulanLengkap.reverse();
  const dipakai = bulanLengkap.slice(-BULAN_DINILAI);

  const jendela = dipakai.length
    ? { mulai: dipakai[0].awal, selesai: dipakai[dipakai.length - 1].akhir }
    : { mulai: pertama ?? hariIni, selesai: hariIni };

  const dalam = (t: string) => t >= jendela.mulai && t <= jendela.selesai;

  let total = 0;
  let terinci = 0;
  for (const b of omzet) {
    if (!dalam(b.sale_date)) continue;
    const nilai = Number(b.total_amount) || 0;
    total += nilai;
    if (b.terinci) terinci += nilai;
  }

  const omzetBulanan = dipakai.map((m) => ({
    awal: m.awal,
    omzet: omzet
      .filter((b) => b.sale_date >= m.awal && b.sale_date <= m.akhir)
      .reduce((n, b) => n + (Number(b.total_amount) || 0), 0),
  }));

  return {
    hariIni,
    mulaiUsaha: usaha?.established_date ?? null,
    hariTercatat: tanggal.size,
    omzetBulanan,
    jendela,
    omzetTotal: total,
    pengeluaranTotal: pengeluaran
      .filter((b) => dalam(b.expense_date))
      .reduce((n, b) => n + (Number(b.amount) || 0), 0),
    cakupanPersen: total > 0 ? (terinci / total) * 100 : null,
    punyaNib: usaha?.has_nib ?? false,
    punyaNpwp: usaha?.has_npwp ?? false,
  };
}

// ── Penskalaan bersama ──────────────────────────────────────────────────────

/** Nilai 0..1 dari posisi `nilai` antara `nol` dan `penuh`. Arah boleh terbalik
 *  (nol lebih besar dari penuh) untuk ukuran yang makin kecil makin baik,
 *  seperti naik turun omzet. */
function skala(nilai: number, nol: number, penuh: number): number {
  const r = (nilai - nol) / (penuh - nol);
  return Math.min(1, Math.max(0, r));
}

// ── Rujukan kriteria ────────────────────────────────────────────────────────

/** Dasar hukum tiap KRITERIA. Perhatikan apa yang TIDAK dirujuk di sini:
 *  bobot dan ambangnya.
 *
 *  POJK 40/POJK.03/2019 Pasal 11 menyebutkan komponen penilaian kualitas kredit
 *  secara ordinal — "perolehan laba tinggi dan stabil", "perolehan laba rendah"
 *  — dan menyerahkan kuantifikasinya ke model internal masing-masing bank, yang
 *  tidak dipublikasikan. Jadi "20% untuk skor penuh" dan bobot 25/20/20/15/10/10
 *  adalah kerangka Naik Kelas, bukan turunan peraturan. Jangan pernah mengklaim
 *  sebaliknya di layar maupun di presentasi. */
const RUJUKAN = {
  konsistensi:
    "POJK 40/POJK.03/2019 Pasal 11 ayat (3) huruf b — ketersediaan dan keakuratan informasi keuangan debitur",
  kestabilan:
    "POJK 40/POJK.03/2019 Pasal 11 ayat (1) huruf a — potensi pertumbuhan usaha",
  profitabilitas:
    "POJK 40/POJK.03/2019 Pasal 11 ayat (2) huruf a — profitabilitas",
  lamaUsaha:
    "Permenko Perekonomian 1/2026 Pasal 26, 34, dan 41 ayat (1) huruf a — usaha berjalan paling singkat 6 bulan",
  arusKas: "POJK 40/POJK.03/2019 Pasal 11 ayat (2) huruf c — arus kas",
  dokumen:
    "Permenko Perekonomian 1/2026 Pasal 26, 34, 41 ayat (1) — syarat dokumen; POJK 40/POJK.03/2019 Pasal 11 ayat (3) huruf c — kelengkapan dokumentasi",
} as const;

// ── Enam kriteria ───────────────────────────────────────────────────────────

/** 25 poin. Dasar: bank penyalur umumnya meminta riwayat usaha 6 bulan, jadi
 *  180 hari tercatat bernilai penuh. Yang dihitung adalah BANYAKNYA HARI yang
 *  punya catatan, bukan rentangnya — mencatat dua hari lalu menghilang lima
 *  bulan bukan pencatatan yang konsisten.
 *
 *  Tidak butuh rincian item: satu baris total harian sudah membuat harinya
 *  terhitung. */
function konsistensi(f: Fakta): Kriteria {
  const bobot = 25;
  const skor = Math.round(skala(f.hariTercatat, 0, JENDELA_PENCATATAN) * bobot);
  const kurang = JENDELA_PENCATATAN - f.hariTercatat;

  return {
    kunci: "konsistensi_pencatatan",
    label: "Konsistensi pencatatan",
    bobot,
    skor,
    tanpaRincian: true,
    rujukan: RUJUKAN.konsistensi,
    alasan:
      f.hariTercatat === 0
        ? "Belum ada hari yang tercatat dalam 6 bulan terakhir."
        : `Catatan usaha Anda mencakup ${f.hariTercatat} hari dalam 6 bulan terakhir.`,
    langkah:
      kurang <= 0
        ? null
        : {
            teks:
              `Catatan usaha Anda saat ini mencakup ${f.hariTercatat} hari. ` +
              `Bank umumnya mensyaratkan riwayat minimal 6 bulan. ` +
              `Lanjutkan pencatatan hingga 180 hari, yaitu ${kurang} hari lagi.`,
            // Tenggat mengandaikan pencatatan setiap hari mulai hari ini.
            // Syaratnya ikut tertulis di layar, tidak disembunyikan di balik tanggal.
            target: bulanTahun(tambahHari(f.hariIni, kurang)),
            tambahan: bobot - skor,
          },
  };
}

/** 20 poin. Dasar: koefisien variasi omzet bulanan — simpangan baku dibagi
 *  rata-rata. Naik turun di bawah 10% dinilai stabil, di atas 40% bergejolak.
 *  Bank menilai kemampuan membayar cicilan tetap tiap bulan, jadi yang diukur
 *  keteraturannya, bukan besarnya.
 *
 *  Butuh minimal 2 bulan penuh. Kurang dari itu skornya 0 dengan alasan "belum
 *  bisa dinilai" — satu bulan tidak punya naik turun untuk diukur, dan
 *  memberinya skor penuh berarti mengarang kestabilan yang belum terbukti. */
function kestabilan(f: Fakta): Kriteria {
  const bobot = 20;
  const nilai = f.omzetBulanan.map((b) => b.omzet);
  const dasar = {
    kunci: "kestabilan_omzet" as const,
    label: "Kestabilan omzet",
    bobot,
    tanpaRincian: true,
    rujukan: RUJUKAN.kestabilan,
  };

  if (nilai.length < 2) {
    const perlu = 2 - nilai.length;
    return {
      ...dasar,
      skor: 0,
      alasan: `Baru ada ${nilai.length} bulan penuh. Naik turun omzet butuh minimal 2 bulan untuk bisa diukur.`,
      langkah: {
        teks:
          `Kestabilan omzet baru bisa dinilai setelah ada 2 bulan kalender penuh. ` +
          `Sekarang baru ${nilai.length} bulan. Teruskan mencatat ${perlu} bulan lagi tanpa jeda.`,
        target: bulanTahun(tambahBulan(f.hariIni, perlu)),
        tambahan: bobot,
      },
    };
  }

  const rata = nilai.reduce((n, x) => n + x, 0) / nilai.length;
  const ragam = nilai.reduce((n, x) => n + (x - rata) ** 2, 0) / nilai.length;
  // rata 0 berarti tercatat tapi nihil omzet. Dibagi nol menghasilkan NaN yang
  // lolos ke layar sebagai skor kosong, jadi ditangani sebagai kasusnya sendiri.
  const cv = rata > 0 ? (Math.sqrt(ragam) / rata) * 100 : 100;
  const skor = Math.round(skala(cv, 40, 10) * bobot);

  return {
    ...dasar,
    skor,
    alasan:
      `Omzet bulanan Anda naik turun sekitar ${angka(cv)}% dari rata-rata ` +
      `${rp(rata)} per bulan, dihitung dari ${nilai.length} bulan penuh.`,
    langkah:
      skor >= bobot
        ? null
        : {
            teks:
              `Naik turun omzet bulanan Anda ${angka(cv)}%. Skor penuh pada 10% ke bawah. ` +
              `Dengan rata-rata ${rp(rata)} per bulan, artinya omzet tiap bulan dijaga ` +
              `di kisaran ${rp(rata * 0.9)} sampai ${rp(rata * 1.1)}.`,
            target: bulanTahun(tambahBulan(f.hariIni, 2)),
            tambahan: bobot - skor,
          },
  };
}

/** 20 poin. Dasar: untung bersih = omzet dikurangi seluruh pengeluaran pada
 *  rentang yang sama. 20% ke atas bernilai penuh, 0% atau rugi bernilai nol.
 *
 *  SATU-SATUNYA kriteria yang terpengaruh kelengkapan data, dan pengaruhnya
 *  hanya pada rincian penyebabnya. Skornya tetap terhitung penuh dari total
 *  harian: omzet dari kedua tabel, pengeluaran dari tabel pengeluaran. Yang
 *  belum bisa ditunjukkan adalah menu mana yang menggerus untungnya — dan itu
 *  dikatakan apa adanya, bukan ditebak dari komposisi kanal lain. */
function profitabilitas(f: Fakta): Kriteria {
  const bobot = 20;
  const dasar = {
    kunci: "profitabilitas" as const,
    label: "Profitabilitas",
    bobot,
    tanpaRincian: false,
    rujukan: RUJUKAN.profitabilitas,
  };

  if (f.omzetTotal <= 0) {
    return {
      ...dasar,
      skor: 0,
      alasan: "Belum ada omzet tercatat, jadi untung bersih belum bisa dihitung.",
      langkah: {
        teks:
          "Catat penjualan dan pengeluaran minimal satu bulan penuh supaya untung bersih bisa dihitung.",
        target: bulanTahun(tambahBulan(f.hariIni, 1)),
        tambahan: bobot,
      },
    };
  }

  if (f.pengeluaranTotal <= 0) {
    return {
      ...dasar,
      skor: 0,
      alasan:
        `Omzet ${rp(f.omzetTotal)} sudah tercatat, tapi belum ada pengeluaran yang dicatat. ` +
        `Untung bersih tidak bisa dihitung dari omzet saja.`,
      langkah: {
        teks:
          `Catat pengeluaran usaha: belanja bahan, gaji, sewa, listrik, dan gas. ` +
          `Tanpa itu untung bersih tidak bisa dihitung, dan bank membaca laporan tanpa biaya ` +
          `sebagai laporan yang belum jadi.`,
        target: bulanTahun(tambahBulan(f.hariIni, 1)),
        tambahan: bobot,
      },
    };
  }

  const untung = f.omzetTotal - f.pengeluaranTotal;
  const persen = (untung / f.omzetTotal) * 100;
  const skor = Math.round(skala(persen, 0, 20) * bobot);
  const bulan = Math.max(1, f.omzetBulanan.length);
  const targetUntung = f.omzetTotal * 0.2;

  const catatanCakupan =
    f.cakupanPersen !== null && f.cakupanPersen < 99.5
      ? ` Angka ini dihitung dari total uang masuk dikurangi total pengeluaran, jadi tetap sahih. ` +
        `Yang belum bisa dilihat adalah untung per menu: ${angka(100 - f.cakupanPersen, 0)}% ` +
        `omzet Anda belum ada rincian barangnya.`
      : "";

  return {
    ...dasar,
    skor,
    alasan:
      (untung < 0
        ? `Usaha Anda rugi ${rp(-untung)} pada ${bulan} bulan terakhir.`
        : `Untung bersih ${rp(untung)} dari omzet ${rp(f.omzetTotal)}, yaitu ${angka(persen)}%.`) +
      catatanCakupan,
    langkah:
      skor >= bobot
        ? null
        : {
            teks:
              `Untung bersih Anda ${angka(persen)}% dari omzet. Skor penuh pada 20%. ` +
              `Pada omzet ${rp(f.omzetTotal)} selama ${bulan} bulan ini, 20% berarti ` +
              `${rp(targetUntung)} — kurang ${rp(targetUntung - untung)}, atau sekitar ` +
              `${rp((targetUntung - untung) / bulan)} per bulan. ` +
              `Cara tercepat: buka halaman Margin, cari menu yang untungnya minus di kanal berkomisi.`,
            target: bulanTahun(tambahBulan(f.hariIni, 3)),
            tambahan: bobot - skor,
          },
  };
}

/** 15 poin. Dasar: KUR Mikro umumnya mensyaratkan usaha berjalan minimal 6
 *  bulan; 24 bulan dinilai mapan dan bernilai penuh. Tidak ada hubungannya
 *  dengan kelengkapan data — yang dibaca hanya tanggal berdiri usaha. */
function lamaUsaha(f: Fakta): Kriteria {
  const bobot = 15;
  const dasar = {
    kunci: "lama_usaha" as const,
    label: "Lama usaha berjalan",
    bobot,
    tanpaRincian: true,
    rujukan: RUJUKAN.lamaUsaha,
  };

  if (!f.mulaiUsaha) {
    return {
      ...dasar,
      skor: 0,
      alasan: "Tanggal mulai usaha belum diisi di profil usaha.",
      langkah: {
        teks:
          "Isi tanggal mulai usaha di profil. Kalau tidak ingat tanggal persisnya, " +
          "pakai bulan pertama Anda berjualan. Ini satu isian dan langsung menambah skor.",
        // Tenggatnya ditentukan pengguna, bukan oleh waktu berjalan.
        target: null,
        tambahan: bobot,
      },
    };
  }

  const bulan = Math.max(0, selisihBulan(f.mulaiUsaha, f.hariIni));
  const skor = Math.round(skala(bulan, 0, 24) * bobot);

  return {
    ...dasar,
    skor,
    alasan:
      `Usaha berjalan ${bulan} bulan sejak ${bulanTahun(f.mulaiUsaha)}. ` +
      `KUR Mikro umumnya mensyaratkan minimal 6 bulan; skor penuh pada 24 bulan.`,
    langkah:
      skor >= bobot
        ? null
        : {
            teks:
              bulan < 6
                ? // Di bawah 6 bulan syarat KUR belum terpenuhi, dan menyuruh
                  // menunggu adalah nasihat yang salah: Pasal 26 ayat (2)
                  // menyediakan empat jalan keluar yang bisa ditempuh sekarang.
                  `Usaha Anda berjalan ${bulan} bulan. Syarat KUR adalah 6 bulan, jadi kurang ` +
                  `${6 - bulan} bulan lagi. Tidak harus menunggu: untuk KUR super mikro, usaha ` +
                  `di bawah 6 bulan tetap bisa diajukan kalau Anda mengikuti pendampingan, ` +
                  `mengikuti pelatihan kewirausahaan, tergabung dalam kelompok usaha, atau punya ` +
                  `anggota keluarga yang sudah berusaha.`
                : `Usaha Anda berjalan ${bulan} bulan dari 24 bulan untuk skor penuh. ` +
                  `Kriteria ini tidak butuh tindakan apa pun selain usaha tetap berjalan dan ` +
                  `tetap tercatat — skornya naik sendiri tiap bulan.`,
            target: bulanTahun(tambahBulan(f.mulaiUsaha, 24)),
            tambahan: bobot - skor,
          },
  };
}

/** 10 poin. Dasar: uang masuk dibanding uang keluar pada rentang yang sama.
 *  1,0 kali berarti pas-pasan dan bernilai nol — tidak ada sisa untuk cicilan.
 *  1,25 kali bernilai penuh. Keduanya dari total, tidak butuh rincian item. */
function arusKas(f: Fakta): Kriteria {
  const bobot = 10;
  const dasar = {
    kunci: "kesehatan_arus_kas" as const,
    label: "Kesehatan arus kas",
    bobot,
    tanpaRincian: true,
    rujukan: RUJUKAN.arusKas,
  };

  if (f.omzetTotal <= 0 || f.pengeluaranTotal <= 0) {
    return {
      ...dasar,
      skor: 0,
      alasan:
        f.omzetTotal <= 0
          ? "Belum ada uang masuk tercatat."
          : "Belum ada uang keluar tercatat, jadi perbandingannya belum bisa dihitung.",
      langkah: {
        teks:
          "Catat uang masuk dan uang keluar pada bulan yang sama. " +
          "Perbandingan keduanya adalah hal pertama yang dilihat petugas bank.",
        target: bulanTahun(tambahBulan(f.hariIni, 1)),
        tambahan: bobot,
      },
    };
  }

  const rasio = f.omzetTotal / f.pengeluaranTotal;
  const skor = Math.round(skala(rasio, 1.0, 1.25) * bobot);
  const targetMasuk = f.pengeluaranTotal * 1.25;

  return {
    ...dasar,
    skor,
    alasan:
      `Uang masuk ${rp(f.omzetTotal)}, uang keluar ${rp(f.pengeluaranTotal)} — ` +
      `sekitar ${angka(rasio, 2)} kali lipat.`,
    langkah:
      skor >= bobot
        ? null
        : {
            teks:
              `Uang masuk Anda ${angka(rasio, 2)} kali uang keluar. Skor penuh pada 1,25 kali. ` +
              `Dengan pengeluaran ${rp(f.pengeluaranTotal)}, uang masuk perlu mencapai ` +
              `${rp(targetMasuk)} — kurang ${rp(targetMasuk - f.omzetTotal)}. ` +
              `Bisa dari menaikkan omzet atau menekan pengeluaran, hasilnya sama.`,
            target: bulanTahun(tambahBulan(f.hariIni, 3)),
            tambahan: bobot - skor,
          },
  };
}

/** 10 poin. NIB/surat keterangan usaha 5, NPWP 5 — tapi NPWP hanya dinilai
 *  kalau skemanya memang memintanya:
 *
 *    KUR super mikro — Pasal 26 ayat (1) tidak menyebut NPWP sama sekali.
 *    KUR mikro       — Pasal 34 ayat (1) huruf d, hanya bila pinjaman di atas
 *                      Rp50.000.000.
 *    KUR kecil       — Pasal 41 ayat (1) huruf d, wajib tanpa ambang.
 *
 *  Sebelum ini NPWP selalu dihitung, jadi pemilik warung kehilangan 5 poin
 *  karena tidak punya dokumen yang peraturannya sendiri tidak minta — lalu
 *  disuruh mengurusnya. Kriteria ini bernama "kelengkapan dokumen"; kalau
 *  dokumen yang disyaratkan sudah lengkap, skornya memang penuh.
 *
 *  Kolom `has_nib` dibaca sebagai "NIB ATAU surat keterangan usaha mikro dan
 *  kecil" sesuai huruf b — keduanya setara di mata peraturan. */
function dokumen(f: Fakta, plafon: Plafon | null): Kriteria {
  const bobot = 10;
  const npwp = skemaButuhNpwp(plafon);
  // "tidak" dan "tergantung" sama-sama tidak memotong skor: pada keduanya ada
  // pinjaman sah yang tidak membutuhkan NPWP. Hanya "wajib" dan skema yang
  // belum diketahui yang dinilai ketat.
  const dinilai = npwp === "wajib" || npwp === null;

  const skor = (f.punyaNib ? 5 : 0) + (f.punyaNpwp || !dinilai ? 5 : 0);

  const kurang: string[] = [];
  if (!f.punyaNib)
    kurang.push(
      "NIB lewat oss.go.id, gratis dan biasanya terbit hari itu juga — atau surat keterangan usaha dari kelurahan, keduanya sama-sama diterima",
    );
  if (!f.punyaNpwp && dinilai)
    kurang.push("NPWP usaha lewat kantor pajak terdekat atau coretaxdjp.pajak.go.id, gratis");

  const catatanNpwp =
    npwp === "tidak"
      ? ` NPWP tidak disyaratkan pada ${plafon!.jenis} sebesar ini, jadi tidak ikut dinilai.`
      : npwp === "tergantung"
        ? ` NPWP baru disyaratkan kalau pinjamannya di atas ${rp(AMBANG_NPWP_MIKRO)}; perkiraan Anda melintasi angka itu, jadi tidak ikut dinilai.`
        : npwp === null
          ? " Perkiraan plafon belum bisa dihitung, jadi syarat NPWP dinilai dengan asumsi paling ketat."
          : "";

  return {
    kunci: "kelengkapan_dokumen",
    label: "Kelengkapan dokumen",
    bobot,
    skor,
    tanpaRincian: true,
    rujukan: RUJUKAN.dokumen,
    alasan:
      (f.punyaNib ? "NIB atau surat keterangan usaha sudah ada" : "NIB atau surat keterangan usaha belum ada") +
      (dinilai ? `, ${f.punyaNpwp ? "NPWP sudah ada" : "NPWP belum ada"}.` : ".") +
      catatanNpwp,
    langkah:
      skor >= bobot
        ? null
        : {
            teks:
              `Urus ${kurang.join(" dan ")}. ` +
              `Ini ${bobot - skor} poin termurah di seluruh skor: tidak perlu menunggu omzet naik, ` +
              `cukup satu kali urus lalu tandai di daftar dokumen di bawah.`,
            target: bulanTahun(tambahHari(f.hariIni, 30)),
            tambahan: bobot - skor,
          },
  };
}

/** Apakah NPWP disyaratkan, menurut skema DAN besar pinjamannya.
 *
 *  Yang menentukan bukan cuma nama skemanya. Pasal 34 ayat (1) huruf d
 *  mensyaratkan NPWP untuk KUR mikro hanya "dengan nilai pinjaman di atas
 *  Rp50.000.000" — jadi pinjaman mikro Rp11 juta TIDAK butuh NPWP, meskipun
 *  skemanya KUR mikro.
 *
 *  Karena perkiraan kita berupa RENTANG, ada tiga kemungkinan:
 *    - seluruh rentang di bawah ambang  -> tidak disyaratkan
 *    - seluruh rentang di atas ambang   -> disyaratkan
 *    - rentangnya melintasi ambang      -> bergantung berapa yang diambil
 *
 *  Kemungkinan ketiga TIDAK ditebak (aturan keras 2): dikembalikan sebagai
 *  "tergantung", dan skornya tidak dipotong — karena pada ujung bawah rentang
 *  itu pengguna memang tidak membutuhkannya.
 *
 *  null = skema belum diketahui sama sekali. */
type WajibNpwp = "wajib" | "tidak" | "tergantung";

function skemaButuhNpwp(plafon: Plafon | null): WajibNpwp | null {
  if (plafon === null) return null;
  if (plafon.jenis === "KUR Super Mikro") return "tidak"; // Pasal 26 ayat (1) tidak menyebut NPWP
  if (plafon.jenis === "KUR Kecil") return "wajib"; // Pasal 41 ayat (1) huruf d, tanpa ambang

  // KUR mikro — Pasal 34 ayat (1) huruf d.
  if (plafon.atas <= AMBANG_NPWP_MIKRO) return "tidak";
  if (plafon.bawah > AMBANG_NPWP_MIKRO) return "wajib";
  return "tergantung";
}

// ── Estimasi plafon ─────────────────────────────────────────────────────────

/** Pagu tiap skema, langsung dari Permenko Perekonomian No. 1 Tahun 2026.
 *  Angka-angka INI punya dasar hukum; pengali 3-6x di bawahnya TIDAK. */
export const PAGU_SUPER_MIKRO = 10_000_000; // Pasal 29 ayat (1)
export const PAGU_MIKRO = 100_000_000; // Pasal 36 ayat (1)
export const PAGU_KECIL = 500_000_000; // Pasal 43 ayat (1)

/** Ambang NPWP pada KUR mikro — Pasal 34 ayat (1) huruf d. */
export const AMBANG_NPWP_MIKRO = 50_000_000;

/** Batas skala usaha mikro dan kecil — Pasal 3 ayat (2). Di atas angka ini
 *  usahanya bukan lagi mikro/kecil dan tidak berhak KUR sama sekali. */
export const BATAS_SKALA_USAHA = 4_800_000_000;

/** Rentang 3 sampai 6 kali rata-rata omzet bulanan, dipotong pagu KUR.
 *
 *  PERINGATAN: pengali 3-6x TIDAK berasal dari peraturan mana pun. Seluruh teks
 *  Permenko 1/2026 hanya menyebut kata "omzet" dua kali, keduanya di Pasal 3
 *  ayat (2) tentang batas skala usaha — tidak satu pun pasal mengaitkan plafon
 *  dengan kelipatan omzet. Ini praktik penjaminan bank, dan layar wajib
 *  menyebutnya sebagai perkiraan aplikasi, bukan ketentuan.
 *
 *  Sengaja berupa RENTANG, bukan satu angka: yang menentukan plafon sebenarnya
 *  adalah penilaian bank, dan menampilkan satu angka bulat akan terbaca sebagai
 *  janji. Rata-rata hanya dihitung dari bulan penuh — kalau belum ada satu pun,
 *  hasilnya null dan layar menulis "belum bisa dihitung", bukan menebak dari
 *  data separuh bulan. */
export function plafonKur(omzetBulanan: { omzet: number }[]): Plafon | null {
  if (omzetBulanan.length === 0) return null;
  const rata = omzetBulanan.reduce((n, b) => n + b.omzet, 0) / omzetBulanan.length;
  if (rata <= 0) return null;

  // Dibulatkan ke bawah ke juta terdekat. Membulatkan ke atas berarti
  // menjanjikan angka yang belum tentu keluar.
  const juta = (n: number) => Math.floor(n / 1_000_000) * 1_000_000;
  const bawah = Math.min(juta(rata * 3), PAGU_KECIL);
  const atas = Math.min(juta(rata * 6), PAGU_KECIL);

  return {
    bawah: Math.max(bawah, 1_000_000),
    atas: Math.max(atas, 1_000_000),
    // Skema ditentukan batas ATAS perkiraan: itu pagu tertinggi yang mungkin
    // dijangkau, dan syarat dokumennya mengikuti skema itu.
    jenis:
      atas <= PAGU_SUPER_MIKRO
        ? "KUR Super Mikro"
        : atas <= PAGU_MIKRO
          ? "KUR Mikro"
          : "KUR Kecil",
    rataBulanan: rata,
    bulanDipakai: omzetBulanan.length,
  };
}

// ── Muara ───────────────────────────────────────────────────────────────────

/** Urutannya = urutan tampil di layar, dari bobot terbesar. */
export function hitungSkor(f: Fakta): HasilSkor {
  // Plafon dihitung LEBIH DULU: skemanya menentukan dokumen apa yang
  // disyaratkan, jadi `dokumen` tidak bisa dinilai tanpa tahu skemanya.
  const plafon = plafonKur(f.omzetBulanan);

  const kriteria = [
    konsistensi(f),
    kestabilan(f),
    profitabilitas(f),
    lamaUsaha(f),
    arusKas(f),
    dokumen(f, plafon),
  ];

  return {
    total: kriteria.reduce((n, k) => n + k.skor, 0),
    kriteria,
    plafon,
  };
}

// ── Lapis kelayakan (bukan skor) ────────────────────────────────────────────

/** Syarat KUR menurut Permenko Perekonomian No. 1 Tahun 2026.
 *
 *  Ini LOLOS / BELUM LOLOS, bukan poin. Dipisah dari skor dengan sengaja:
 *  kelayakan diatur peraturan dan tiap barisnya bisa dikutip pasalnya,
 *  sedangkan bobot skor adalah kerangka kami sendiri. Mencampur keduanya jadi
 *  satu angka 0-100 membuat yang berdasar hukum tidak bisa dibedakan dari yang
 *  heuristik — dan itu persis yang dikeluhkan PRD bagian 8.3. */
export type StatusSyarat = "terpenuhi" | "belum" | "belum_diketahui";

export type Syarat = {
  kunci: string;
  label: string;
  status: StatusSyarat;
  keterangan: string;
  rujukan: string;
  /** Jalan keluar yang DISEDIAKAN peraturan, bukan saran kami. */
  jalanKeluar?: string[];
};

export function kelayakan(f: Fakta, plafon: Plafon | null): Syarat[] {
  const daftar: Syarat[] = [];

  // 1. Skala usaha — Pasal 3 ayat (2).
  //    Omzet setahun TIDAK diekstrapolasi dari beberapa bulan (aturan keras 2).
  //    Yang dibandingkan adalah omzet yang benar-benar tercatat; kalau sudah
  //    melewati batas, itu fakta. Kalau belum, disebutkan berapa bulan dasarnya.
  const bulanDasar = f.omzetBulanan.length;
  daftar.push({
    kunci: "skala_usaha",
    label: "Termasuk usaha mikro atau kecil",
    status: f.omzetTotal > BATAS_SKALA_USAHA ? "belum" : "terpenuhi",
    keterangan:
      f.omzetTotal > BATAS_SKALA_USAHA
        ? `Omzet tercatat ${rp(f.omzetTotal)} sudah melewati batas ${rp(BATAS_SKALA_USAHA)} per tahun, ` +
          `jadi usaha ini tidak lagi tergolong mikro atau kecil.`
        : `Omzet tercatat ${rp(f.omzetTotal)}${bulanDasar > 0 ? ` dari ${bulanDasar} bulan penuh` : ""}, ` +
          `masih di bawah batas ${rp(BATAS_SKALA_USAHA)} per tahun.`,
    rujukan: "Permenko 1/2026 Pasal 3 ayat (2)",
  });

  // 2. Lama usaha — Pasal 26/34/41 ayat (1) huruf a, jalan keluar Pasal 26 ayat (2).
  const bulanUsaha = f.mulaiUsaha ? Math.max(0, selisihBulan(f.mulaiUsaha, f.hariIni)) : null;
  daftar.push({
    kunci: "lama_usaha",
    label: "Usaha berjalan minimal 6 bulan",
    status: bulanUsaha === null ? "belum_diketahui" : bulanUsaha >= 6 ? "terpenuhi" : "belum",
    keterangan:
      bulanUsaha === null
        ? "Tanggal mulai usaha belum diisi di profil, jadi belum bisa diperiksa."
        : bulanUsaha >= 6
          ? `Usaha berjalan ${bulanUsaha} bulan.`
          : `Usaha berjalan ${bulanUsaha} bulan, kurang ${6 - bulanUsaha} bulan.`,
    rujukan: "Permenko 1/2026 Pasal 26, 34, dan 41 ayat (1) huruf a",
    jalanKeluar:
      bulanUsaha !== null && bulanUsaha < 6
        ? [
            "Mengikuti pendampingan",
            "Mengikuti pelatihan kewirausahaan atau pelatihan lainnya",
            "Tergabung dalam kelompok usaha",
            "Punya anggota keluarga yang sudah mempunyai usaha produktif dan layak",
          ]
        : undefined,
  });

  // 3. NIB atau surat keterangan usaha — huruf b. Keduanya setara.
  daftar.push({
    kunci: "nib",
    label: "Punya NIB atau surat keterangan usaha",
    status: f.punyaNib ? "terpenuhi" : "belum",
    keterangan: f.punyaNib
      ? "Sudah ditandai di daftar dokumen."
      : "Belum ditandai. Surat keterangan usaha mikro dan kecil dari pejabat berwenang sama diterimanya dengan NIB.",
    rujukan: "Permenko 1/2026 Pasal 26, 34, dan 41 ayat (1) huruf b",
  });

  // 4. NPWP — bergantung skema.
  const butuhNpwp = skemaButuhNpwp(plafon);
  daftar.push({
    kunci: "npwp",
    label: "Punya NPWP",
    status:
      f.punyaNpwp || butuhNpwp === "tidak"
        ? "terpenuhi"
        : butuhNpwp === "wajib"
          ? "belum"
          : "belum_diketahui",
    keterangan:
      butuhNpwp === "tidak"
        ? `Tidak disyaratkan pada ${plafon!.jenis} sebesar ini.`
        : butuhNpwp === "tergantung"
          ? `Bergantung berapa yang Anda ajukan: baru disyaratkan di atas ${rp(AMBANG_NPWP_MIKRO)}, sedangkan perkiraan Anda ${rp(plafon!.bawah)} sampai ${rp(plafon!.atas)}.`
          : butuhNpwp === null
            ? "Perkiraan plafon belum bisa dihitung, jadi skemanya belum diketahui."
            : plafon!.jenis === "KUR Mikro"
              ? `Disyaratkan karena perkiraan pinjaman Anda di atas ${rp(AMBANG_NPWP_MIKRO)}.`
              : "Disyaratkan pada KUR kecil.",
    rujukan:
      plafon?.jenis === "KUR Kecil"
        ? "Permenko 1/2026 Pasal 41 ayat (1) huruf d"
        : "Permenko 1/2026 Pasal 34 ayat (1) huruf d",
  });

  // 5. KTP-el — huruf c. Tidak disimpan aplikasi, jadi tidak ditebak.
  daftar.push({
    kunci: "ktp",
    label: "Punya NIK dan KTP elektronik",
    status: "belum_diketahui",
    keterangan: "Tidak dicatat aplikasi ini. Disebutkan supaya daftarnya utuh saat dibawa ke bank.",
    rujukan: "Permenko 1/2026 Pasal 26, 34, dan 41 ayat (1) huruf c",
  });

  // 6. BPJS Ketenagakerjaan — Pasal 6 ayat (2). Hanya relevan di atas pagu mikro.
  if (plafon && plafon.atas > PAGU_MIKRO) {
    daftar.push({
      kunci: "bpjs",
      label: "Peserta BPJS Ketenagakerjaan",
      status: "belum_diketahui",
      keterangan: `Wajib untuk pinjaman di atas ${rp(PAGU_MIKRO)}. Perkiraan plafon Anda melewati angka itu.`,
      rujukan: "Permenko 1/2026 Pasal 6 ayat (2)",
    });
  }

  return daftar;
}

/** true kalau seluruh syarat yang BISA diperiksa aplikasi sudah terpenuhi.
 *  Syarat `belum_diketahui` tidak dihitung gagal — aplikasi tidak menyimpan
 *  datanya, dan menganggapnya gagal berarti menebak. */
export function layakDiajukan(daftar: Syarat[]): boolean {
  return daftar.every((s) => s.status !== "belum");
}

/** Langkah perbaikan, yang paling banyak menambah skor lebih dulu. Halaman /kur
 *  memakai ini untuk bagian "Yang paling cepat menaikkan skor". */
export function langkahTerurut(hasil: HasilSkor): (Kriteria & { langkah: Langkah })[] {
  return hasil.kriteria
    .filter((k): k is Kriteria & { langkah: Langkah } => k.langkah !== null)
    .sort((a, b) => b.langkah.tambahan - a.langkah.tambahan);
}

/** Empat tingkat untuk indikator visual. Kata-katanya menghindari kesan
 *  keputusan: "baru mulai" bukan "ditolak". */
export function tingkatSkor(total: number): {
  label: string;
  nada: "positive" | "amber" | "negative";
} {
  if (total >= 75) return { label: "Siap diajukan", nada: "positive" };
  if (total >= 55) return { label: "Hampir siap", nada: "amber" };
  if (total >= 35) return { label: "Perlu dilengkapi", nada: "amber" };
  return { label: "Baru mulai", nada: "negative" };
}
