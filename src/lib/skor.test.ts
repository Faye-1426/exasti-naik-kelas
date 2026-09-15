import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BATAS_SKALA_USAHA,
  bulanTahun,
  hitungSkor,
  kelayakan,
  langkahTerurut,
  layakDiajukan,
  plafonKur,
  rakitFakta,
  selisihBulan,
  tambahBulan,
  tambahHari,
  tingkatSkor,
  type BarisOmzet,
  type BarisPengeluaran,
} from "./skor.ts";

/** Angka contoh mengikuti seed.sql supaya uji ini dan data demo tidak pernah
 *  saling bertentangan: Warung Bu Sri, berdiri 14 bulan lalu, NIB ada NPWP
 *  belum, 30 hari pertama kanal Offline hanya berupa total harian. */

const USAHA = { established_date: "2025-07-01", has_nib: true, has_npwp: false };

/** `n` hari berturut-turut mulai `mulai`. Nilainya berombak deterministik,
 *  sama seperti seed.sql, supaya uji ini tidak pernah goyah. */
function hariBerturut(mulai: string, n: number, dasar: number, terinci: boolean): BarisOmzet[] {
  return Array.from({ length: n }, (_, i) => ({
    sale_date: tambahHari(mulai, i),
    total_amount: Math.round(dasar * (1 + 0.08 * Math.sin(i * 0.9))),
    terinci,
  }));
}

function belanja(mulai: string, n: number, tiap: number, jumlah: number): BarisPengeluaran[] {
  const keluar: BarisPengeluaran[] = [];
  for (let i = 0; i < n; i += tiap) {
    keluar.push({ expense_date: tambahHari(mulai, i), amount: jumlah });
  }
  return keluar;
}

// ── Utilitas tanggal ────────────────────────────────────────────────────────

test("tambahBulan menjepit hari akhir bulan, tidak melimpah ke bulan berikutnya", () => {
  assert.equal(tambahBulan("2026-01-31", 1), "2026-02-28");
  assert.equal(tambahBulan("2024-01-31", 1), "2024-02-29");
  assert.equal(tambahBulan("2026-09-11", 3), "2026-12-11");
  assert.equal(tambahBulan("2026-01-15", -1), "2025-12-15");
  assert.equal(tambahBulan("2025-07-01", 24), "2027-07-01");
});

test("selisihBulan menghitung bulan penuh, bukan pergantian nama bulan", () => {
  assert.equal(selisihBulan("2026-01-01", "2026-01-31"), 0);
  assert.equal(selisihBulan("2026-01-15", "2026-02-14"), 0);
  assert.equal(selisihBulan("2026-01-15", "2026-02-15"), 1);
  assert.equal(selisihBulan("2025-07-01", "2026-09-01"), 14);
});

test("tambahHari tidak bergeser oleh zona waktu", () => {
  assert.equal(tambahHari("2026-09-11", 168), "2027-02-26");
  assert.equal(tambahHari("2026-03-01", -1), "2026-02-28");
  assert.equal(bulanTahun(tambahHari("2026-09-11", 168)), "Februari 2027");
});

// ── ATURAN INTI: lima dari enam kriteria tidak bergantung rincian item ──────

/** Ini uji terpenting di berkas ini. Data yang sama persis, dua bentuk: satu
 *  masuk ke `sales` (berrincian), satu masuk ke `sales_totals` (total harian).
 *  Kalau angka kriteria mana pun yang bertanda `tanpaRincian` berubah, berarti
 *  mesin skor diam-diam menghukum pengguna offline — persis orang yang paling
 *  butuh fitur ini. */
test("skor kriteria tanpaRincian identik antara data berrincian dan total harian", () => {
  const hariIni = "2026-09-01";
  const keluar = belanja("2026-03-01", 184, 7, 3_400_000);

  const rinci = rakitFakta(hariBerturut("2026-03-01", 184, 1_200_000, true), keluar, USAHA, hariIni);
  const total = rakitFakta(hariBerturut("2026-03-01", 184, 1_200_000, false), keluar, USAHA, hariIni);

  const a = hitungSkor(rinci);
  const b = hitungSkor(total);

  const bandingkan = (kunci: string) => {
    const x = a.kriteria.find((k) => k.kunci === kunci)!;
    const y = b.kriteria.find((k) => k.kunci === kunci)!;
    assert.equal(y.skor, x.skor, `${kunci}: ${y.skor} != ${x.skor}`);
    assert.equal(y.alasan, x.alasan, `${kunci}: alasannya ikut berubah`);
  };

  const tanpaRincian = a.kriteria.filter((k) => k.tanpaRincian);
  assert.equal(tanpaRincian.length, 5, "harus tepat lima kriteria yang tidak butuh rincian");
  tanpaRincian.forEach((k) => bandingkan(k.kunci));

  // Kelimanya bukan cuma sama — semuanya benar-benar terhitung, bukan nol.
  tanpaRincian.forEach((k) => {
    const y = b.kriteria.find((x) => x.kunci === k.kunci)!;
    assert.ok(y.skor > 0, `${k.kunci} tidak terhitung pada data total harian`);
  });

  // Profitabilitas pun skornya tetap sama — omzet dan pengeluaran tidak butuh
  // rincian item. Yang berubah hanya keterangannya.
  const pa = a.kriteria.find((k) => k.kunci === "profitabilitas")!;
  const pb = b.kriteria.find((k) => k.kunci === "profitabilitas")!;
  assert.equal(pb.skor, pa.skor);
  assert.notEqual(pb.alasan, pa.alasan);
  assert.match(pb.alasan, /belum ada rincian barangnya/);
  assert.doesNotMatch(pa.alasan, /belum ada rincian/);

  assert.equal(b.total, a.total, "skor total tidak boleh berubah karena bentuk catatannya");
  assert.deepEqual(b.plafon, a.plafon, "plafon dihitung dari omzet, bukan dari rincian");
});

/** Bulan pertama demo: kanal Offline hanya punya total setoran harian, tanpa
 *  satu pun baris berrincian. Skor harus tetap keluar dengan angka yang masuk
 *  akal, bukan nol dan bukan NaN. */
test("data demo bulan pertama — hanya total harian, skor tetap terhitung", () => {
  const hariIni = "2026-04-05";
  const f = rakitFakta(
    hariBerturut("2026-03-01", 31, 1_150_000, false),
    belanja("2026-03-01", 31, 7, 3_400_000),
    USAHA,
    hariIni,
  );

  assert.equal(f.cakupanPersen, 0, "tidak ada omzet yang terinci pada bulan pertama");
  assert.equal(f.hariTercatat, 31);
  assert.equal(f.omzetBulanan.length, 1, "Maret sudah lengkap, April masih berjalan");

  const hasil = hitungSkor(f);

  const ambil = (k: string) => hasil.kriteria.find((x) => x.kunci === k)!;
  assert.ok(ambil("konsistensi_pencatatan").skor > 0);
  assert.ok(ambil("profitabilitas").skor > 0);
  assert.ok(ambil("lama_usaha").skor > 0);
  assert.ok(ambil("kesehatan_arus_kas").skor > 0);
  assert.equal(ambil("kelengkapan_dokumen").skor, 5, "NIB ada, NPWP belum");

  // Kestabilan omzet memang belum bisa dinilai dengan satu bulan — dan itu
  // dikatakan apa adanya, bukan diberi skor penuh atau ditebak dari satu bulan.
  const stabil = ambil("kestabilan_omzet");
  assert.equal(stabil.skor, 0);
  assert.match(stabil.alasan, /minimal 2 bulan/);
  assert.equal(stabil.langkah?.target, "Mei 2026");

  assert.ok(Number.isInteger(hasil.total));
  assert.ok(hasil.total > 0 && hasil.total <= 100);
});

// ── Bentuk langkah perbaikan ────────────────────────────────────────────────

/** Langkah perbaikan wajib spesifik, terukur, bertenggat. "Tingkatkan
 *  konsistensi pencatatan Anda" tidak lolos syarat mana pun. */
test("setiap langkah perbaikan memuat angka dan tenggat", () => {
  const hariIni = "2026-09-11";
  const f = rakitFakta(
    hariBerturut("2026-06-15", 88, 900_000, true),
    belanja("2026-06-15", 88, 7, 5_400_000),
    { established_date: "2026-01-10", has_nib: false, has_npwp: false },
    hariIni,
  );

  const langkah = langkahTerurut(hitungSkor(f));
  assert.ok(langkah.length >= 4, "usaha muda ini seharusnya punya banyak langkah");

  for (const k of langkah) {
    assert.match(k.langkah.teks, /\d/, `${k.kunci}: langkahnya tidak memuat satu angka pun`);
    assert.ok(k.langkah.teks.length > 60, `${k.kunci}: langkahnya terlalu umum`);
    assert.ok(k.langkah.tambahan > 0, `${k.kunci}: langkah tanpa tambahan skor`);
    if (k.kunci !== "lama_usaha") {
      assert.match(k.langkah.target ?? "", /^[A-Z][a-z]+ 20\d\d$/, `${k.kunci}: tenggat tidak jelas`);
    }
  }

  // Terurut dari yang paling banyak menambah skor.
  const tambahan = langkah.map((k) => k.langkah.tambahan);
  assert.deepEqual(tambahan, [...tambahan].sort((a, b) => b - a));
});

test("langkah konsistensi menyebut hari tercatat, sisa hari, dan bulan pencapaian", () => {
  const hariIni = "2026-09-11";
  const f = rakitFakta(
    hariBerturut("2026-08-31", 12, 800_000, false),
    belanja("2026-08-31", 12, 7, 400_000),
    USAHA,
    hariIni,
  );

  const k = hitungSkor(f).kriteria.find((x) => x.kunci === "konsistensi_pencatatan")!;
  assert.equal(k.skor, 2); // 12 / 180 * 25 = 1,67
  assert.match(k.langkah!.teks, /mencakup 12 hari/);
  assert.match(k.langkah!.teks, /168 hari lagi/);
  assert.equal(k.langkah!.target, "Februari 2027");
});

// ── Aturan keras 2: tidak ada angka tebakan ─────────────────────────────────

test("tanpa pengeluaran, untung bersih tidak ditebak dari omzet", () => {
  const f = rakitFakta(hariBerturut("2026-03-01", 184, 1_200_000, true), [], USAHA, "2026-09-01");
  const hasil = hitungSkor(f);

  const untung = hasil.kriteria.find((k) => k.kunci === "profitabilitas")!;
  assert.equal(untung.skor, 0);
  assert.match(untung.alasan, /belum ada pengeluaran/);

  const kas = hasil.kriteria.find((k) => k.kunci === "kesehatan_arus_kas")!;
  assert.equal(kas.skor, 0);
  assert.match(kas.alasan, /Belum ada uang keluar/);
});

test("usaha tanpa data sama sekali tidak menghasilkan NaN", () => {
  const f = rakitFakta([], [], null, "2026-09-11");
  const hasil = hitungSkor(f);

  assert.equal(hasil.total, 0);
  assert.equal(hasil.plafon, null, "plafon tidak ditebak dari nol omzet");
  for (const k of hasil.kriteria) {
    assert.ok(Number.isFinite(k.skor), `${k.kunci} menghasilkan angka bukan-angka`);
    assert.equal(k.skor, 0);
    assert.ok(k.langkah, `${k.kunci} tanpa langkah perbaikan`);
  }
  assert.equal(tingkatSkor(0).label, "Baru mulai");
});

test("bulan berjalan tidak ikut dinilai sebagai bulan yang anjlok", () => {
  // Tiga hari berjalan di bulan September. Kalau ikut terhitung, omzet
  // Septembernya 3 juta melawan 36 juta di bulan lain, dan Kestabilan omzet
  // jatuh ke nol tanpa ada yang berubah di warung.
  const omzet = [
    ...hariBerturut("2026-07-01", 62, 1_200_000, true),
    ...hariBerturut("2026-09-01", 3, 1_200_000, true),
  ];
  const f = rakitFakta(omzet, belanja("2026-07-01", 65, 7, 3_000_000), USAHA, "2026-09-04");

  assert.deepEqual(
    f.omzetBulanan.map((b) => b.awal),
    ["2026-07-01", "2026-08-01"],
  );
  assert.equal(f.jendela.selesai, "2026-08-31");
  assert.ok(hitungSkor(f).kriteria.find((k) => k.kunci === "kestabilan_omzet")!.skor > 10);
});

test("bulan pertama yang mulai di tengah bulan tidak ikut dinilai", () => {
  const f = rakitFakta(
    hariBerturut("2026-07-20", 74, 1_000_000, true), // 20 Juli sampai 1 Oktober
    belanja("2026-07-20", 74, 7, 3_000_000),
    USAHA,
    "2026-10-01",
  );
  // Juli dibuang: pencatatannya baru mulai tanggal 20, bukan tanggal 1.
  assert.deepEqual(
    f.omzetBulanan.map((b) => b.awal),
    ["2026-08-01", "2026-09-01"],
  );
});

// ── Plafon ──────────────────────────────────────────────────────────────────

test("plafon berupa rentang, dibulatkan ke bawah, dan tidak melewati pagu KUR", () => {
  assert.equal(plafonKur([]), null);
  assert.equal(plafonKur([{ omzet: 0 }]), null);

  const kecil = plafonKur([{ omzet: 12_400_000 }, { omzet: 13_600_000 }])!;
  assert.equal(kecil.rataBulanan, 13_000_000);
  assert.equal(kecil.bawah, 39_000_000);
  assert.equal(kecil.atas, 78_000_000);
  assert.equal(kecil.jenis, "KUR Mikro");

  const besar = plafonKur([{ omzet: 40_000_000 }])!;
  assert.equal(besar.atas, 240_000_000);
  assert.equal(besar.jenis, "KUR Kecil");

  // Pagu KUR Kecil 500 juta tidak pernah dilewati, sebesar apa pun omzetnya.
  assert.equal(plafonKur([{ omzet: 900_000_000 }])!.atas, 500_000_000);
});

// ── Tingkat ─────────────────────────────────────────────────────────────────

test("tingkat skor tidak pernah berbunyi seperti keputusan bank", () => {
  assert.equal(tingkatSkor(82).label, "Siap diajukan");
  assert.equal(tingkatSkor(63).label, "Hampir siap");
  assert.equal(tingkatSkor(40).label, "Perlu dilengkapi");
  assert.equal(tingkatSkor(12).label, "Baru mulai");
});


// ── Skema KUR dan syarat dokumennya (Permenko 1/2026) ───────────────────────

test("plafon kecil jatuh ke KUR Super Mikro, bukan KUR Mikro", () => {
  // Rp1,5 juta/bulan -> atas = 6x = Rp9 juta, masih di bawah pagu Pasal 29(1).
  const mini = plafonKur([{ omzet: 1_500_000 }])!;
  assert.equal(mini.atas, 9_000_000);
  assert.equal(mini.jenis, "KUR Super Mikro");

  // Tepat di pagu super mikro masih super mikro; sedikit di atasnya jadi mikro.
  assert.equal(plafonKur([{ omzet: 1_666_667 }])!.jenis, "KUR Super Mikro");
  assert.equal(plafonKur([{ omzet: 2_000_000 }])!.jenis, "KUR Mikro");
});

test("NPWP tidak mengurangi skor pada skema yang tidak mensyaratkannya", () => {
  const fakta = (omzetBulanan: { awal: string; omzet: number }[]) =>
    rakitFakta(
      omzetBulanan.flatMap((b) => hariBerturut(b.awal, 28, Math.round(b.omzet / 28), true)),
      [],
      { established_date: "2024-01-01", has_nib: true, has_npwp: false },
      "2026-09-15",
    );

  // Warung kecil -> KUR Super Mikro -> Pasal 26(1) tidak menyebut NPWP.
  const kecil = hitungSkor(fakta([
    { awal: "2026-07-01", omzet: 1_200_000 },
    { awal: "2026-08-01", omzet: 1_200_000 },
  ]));
  const dokKecil = kecil.kriteria.find((k) => k.kunci === "kelengkapan_dokumen")!;
  assert.equal(kecil.plafon!.jenis, "KUR Super Mikro");
  assert.equal(dokKecil.skor, 10, "dokumen lengkap walau NPWP belum ada");
  assert.equal(dokKecil.langkah, null);
  assert.match(dokKecil.alasan, /tidak disyaratkan/i);

  // Usaha besar -> KUR Kecil -> Pasal 41(1)d mewajibkan NPWP.
  const besar = hitungSkor(fakta([
    { awal: "2026-07-01", omzet: 40_000_000 },
    { awal: "2026-08-01", omzet: 40_000_000 },
  ]));
  const dokBesar = besar.kriteria.find((k) => k.kunci === "kelengkapan_dokumen")!;
  assert.equal(besar.plafon!.jenis, "KUR Kecil");
  assert.equal(dokBesar.skor, 5, "NPWP belum ada dan memang disyaratkan");
});

test("setiap kriteria membawa rujukan pasalnya", () => {
  const f = rakitFakta(
    hariBerturut("2026-07-01", 60, 500_000, true),
    belanja("2026-07-01", 60, 7, 2_000_000),
    USAHA,
    "2026-09-15",
  );
  for (const k of hitungSkor(f).kriteria) {
    assert.match(k.rujukan, /POJK 40|Permenko/, `${k.kunci} tanpa rujukan`);
  }
});

// ── Lapis kelayakan ─────────────────────────────────────────────────────────

test("omzet di atas batas skala usaha membuat tidak layak, berapa pun skornya", () => {
  // Dua bulan penuh dengan omzet total melewati Rp4,8 miliar.
  const f = rakitFakta(
    hariBerturut("2026-07-01", 60, 100_000_000, true), // ~Rp6 miliar, di atas batas
    belanja("2026-07-01", 60, 7, 200_000_000),
    { established_date: "2020-01-01", has_nib: true, has_npwp: true },
    "2026-09-15",
  );
  const syarat = kelayakan(f, hitungSkor(f).plafon);
  const skala = syarat.find((s) => s.kunci === "skala_usaha")!;

  assert.ok(f.omzetTotal > BATAS_SKALA_USAHA);
  assert.equal(skala.status, "belum");
  assert.equal(layakDiajukan(syarat), false);
  assert.match(skala.rujukan, /Pasal 3 ayat \(2\)/);
});

test("usaha di bawah 6 bulan menawarkan empat jalan keluar Pasal 26(2)", () => {
  const f = rakitFakta(
    hariBerturut("2026-07-01", 60, 400_000, true),
    belanja("2026-07-01", 60, 7, 1_500_000),
    { established_date: "2026-07-01", has_nib: true, has_npwp: false },
    "2026-09-15",
  );
  const lama = kelayakan(f, hitungSkor(f).plafon).find((s) => s.kunci === "lama_usaha")!;

  assert.equal(lama.status, "belum");
  assert.equal(lama.jalanKeluar?.length, 4);
  assert.match(lama.jalanKeluar!.join(" "), /pendampingan/i);

  // Dan langkah perbaikannya tidak lagi menyuruh sekadar menunggu.
  const langkah = hitungSkor(f).kriteria.find((k) => k.kunci === "lama_usaha")!.langkah!;
  assert.match(langkah.teks, /Tidak harus menunggu/i);
});

test("syarat yang tidak dicatat aplikasi tidak dianggap gagal", () => {
  const f = rakitFakta(
    hariBerturut("2026-07-01", 60, 600_000, true),
    belanja("2026-07-01", 60, 7, 2_000_000),
    { established_date: "2024-01-01", has_nib: true, has_npwp: true },
    "2026-09-15",
  );
  const syarat = kelayakan(f, hitungSkor(f).plafon);
  const ktp = syarat.find((s) => s.kunci === "ktp")!;

  assert.equal(ktp.status, "belum_diketahui");
  assert.equal(layakDiajukan(syarat), true, "belum_diketahui bukan kegagalan");
});


test("NPWP pada KUR mikro mengikuti besar pinjaman, bukan nama skemanya", () => {
  // Pasal 34(1)d: NPWP hanya untuk pinjaman DI ATAS Rp50 juta. Pinjaman mikro
  // Rp11 juta tidak membutuhkannya walau skemanya KUR Mikro.
  const kecil = rakitFakta(
    hariBerturut("2026-07-01", 62, 60_000, true),
    belanja("2026-07-01", 62, 7, 300_000),
    { established_date: "2024-01-01", has_nib: true, has_npwp: false },
    "2026-09-15",
  );
  const h = hitungSkor(kecil);
  const dok = h.kriteria.find((k) => k.kunci === "kelengkapan_dokumen")!;

  assert.equal(h.plafon!.jenis, "KUR Mikro");
  assert.ok(h.plafon!.atas <= 50_000_000, "seluruh rentang di bawah ambang");
  assert.equal(dok.skor, 10, "NPWP tidak disyaratkan pada pinjaman sebesar ini");
  assert.equal(dok.langkah, null, "dan tidak menyuruh mengurusnya");

  const npwp = kelayakan(kecil, h.plafon).find((s) => s.kunci === "npwp")!;
  assert.equal(npwp.status, "terpenuhi");
  assert.match(npwp.keterangan, /Tidak disyaratkan/i);
});

test("rentang plafon yang melintasi Rp50 juta tidak ditebak", () => {
  // Rata-rata ~Rp12,4 juta/bulan -> rentang Rp37 juta sampai Rp74 juta,
  // melintasi ambang. Berapa yang diambil tidak diketahui, jadi tidak ditebak.
  const f = rakitFakta(
    hariBerturut("2026-07-01", 62, 400_000, true),
    belanja("2026-07-01", 62, 7, 2_000_000),
    { established_date: "2024-01-01", has_nib: true, has_npwp: false },
    "2026-09-15",
  );
  const h = hitungSkor(f);
  assert.ok(h.plafon!.bawah <= 50_000_000 && h.plafon!.atas > 50_000_000, "rentang melintasi ambang");

  const npwp = kelayakan(f, h.plafon).find((s) => s.kunci === "npwp")!;
  assert.equal(npwp.status, "belum_diketahui", "bukan 'belum', bukan 'terpenuhi'");
  assert.match(npwp.keterangan, /Bergantung berapa yang Anda ajukan/i);

  // Skornya tidak dipotong: di ujung bawah rentang, NPWP memang tidak dibutuhkan.
  assert.equal(h.kriteria.find((k) => k.kunci === "kelengkapan_dokumen")!.skor, 10);
});

test("KUR kecil tetap mewajibkan NPWP tanpa ambang", () => {
  const f = rakitFakta(
    hariBerturut("2026-07-01", 62, 1_500_000, true),
    belanja("2026-07-01", 62, 7, 8_000_000),
    { established_date: "2024-01-01", has_nib: true, has_npwp: false },
    "2026-09-15",
  );
  const h = hitungSkor(f);
  assert.equal(h.plafon!.jenis, "KUR Kecil");
  assert.equal(h.kriteria.find((k) => k.kunci === "kelengkapan_dokumen")!.skor, 5);
  assert.equal(kelayakan(f, h.plafon).find((s) => s.kunci === "npwp")!.status, "belum");
});
