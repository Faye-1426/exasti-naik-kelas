import assert from "node:assert/strict";
import { test } from "node:test";
import {
  barisKosong,
  cocokkanProduk,
  dariItem,
  dariSuara,
  hasilManual,
  kelengkapanKanal,
  peringatanPlatform,
  tambalanNama,
  periodeBulan,
  perluPerhatian,
  tingkatKelengkapan,
  totalBiaya,
  totalPenjualan,
  urutkanRagu,
  type Produk,
} from "./parsing.ts";

const PRODUK: Produk[] = [
  { id: "p1", name: "Es Teh Manis", aliases: ["es teh", "teh manis"], selling_price: 5000 },
  { id: "p2", name: "Nasi Goreng Spesial", aliases: ["nasgor"], selling_price: 20000 },
  { id: "p3", name: "Ayam Geprek", aliases: null, selling_price: 18000 },
];

test("nama dicocokkan lewat nama maupun alias, tidak peka huruf besar", () => {
  assert.equal(cocokkanProduk("es teh manis", PRODUK)?.id, "p1");
  assert.equal(cocokkanProduk("NASGOR", PRODUK)?.id, "p2");
  assert.equal(cocokkanProduk("Es  Teh!", PRODUK)?.id, "p1");
  assert.equal(cocokkanProduk("Bakso", PRODUK), null);
  assert.equal(cocokkanProduk("", PRODUK), null);
});

test("baris tak terbaca jadi baris kosong, bukan penjualan nol", () => {
  // Terlihat ada tapi tidak terbaca: angka 0 + confidence rendah.
  assert.equal(barisKosong(0, 0, 0.2), true);
  // Produk memang tidak laku hari itu: angka 0 tapi model yakin.
  assert.equal(barisKosong(0, 0, 0.95), false);
  // Ada angkanya, sekadar ragu — masih baris penjualan biasa.
  assert.equal(barisKosong(3, 15000, 0.4), false);
});

test("baris tak terbaca tetap ikut, tidak dibuang", () => {
  const baris = dariItem(
    [
      { product_name: "Nasgor", quantity: 3, unit_price: 20000, total_amount: 60000, confidence: 0.98 },
      { product_name: "", quantity: 0, unit_price: 0, total_amount: 0, confidence: 0.2 },
    ],
    PRODUK,
  );
  assert.equal(baris.length, 2);
  assert.equal(baris[0].produkId, "p2");
  assert.equal(baris[0].nama, "Nasi Goreng Spesial"); // dinormalkan ke nama master
  assert.equal(baris[0].namaAsli, "Nasgor"); // jejak audit tetap utuh
  assert.equal(baris[1].kosong, true);
  assert.equal(baris[1].produkId, null);
});

test("jalur suara: harga dari master produk, total dihitung di sini", () => {
  const baris = dariSuara(
    [
      {
        spoken_name: "ayam ge prek",
        matched_product_id: "p3",
        matched_product_name: "Ayam Geprek",
        quantity: 8,
        match_confidence: 0.86,
      },
      {
        spoken_name: "kopi susu",
        matched_product_id: null,
        matched_product_name: null,
        quantity: 2,
        match_confidence: 0.1,
      },
    ],
    PRODUK,
  );
  assert.equal(baris[0].hargaSatuan, 18000);
  assert.equal(baris[0].total, 144000);
  assert.equal(baris[0].nama, "Ayam Geprek");
  assert.equal(baris[0].namaAsli, "ayam ge prek");
  // Tidak cocok: tetap muncul supaya bisa didaftarkan, bukan hilang diam-diam.
  assert.equal(baris[1].produkId, null);
  assert.equal(baris[1].total, 0);
});

test("perlu perhatian: confidence ATAU unreadable_regions", () => {
  assert.equal(perluPerhatian([0.9, 0.95], []), false);
  assert.equal(perluPerhatian([0.9, 0.4], []), true);
  // Semua baris yakin, tapi ada bagian layar yang tertutup — tetap ditandai.
  assert.equal(perluPerhatian([0.99], ["baris bawah tertutup notifikasi"]), true);
  assert.equal(perluPerhatian([], ["foto terpotong"]), true);
});

test("baris ragu naik ke atas, urutan asli terjaga di dalam kelompok", () => {
  const b = (kunci: string, confidence: number) => ({
    kunci, nama: kunci, namaAsli: kunci, produkId: null,
    qty: 1, hargaSatuan: 0, total: 0, confidence, kosong: false,
  });
  const urut = urutkanRagu([b("a", 0.9), b("b", 0.3), b("c", 0.95), b("d", 0.1)]);
  assert.deepEqual(urut.map((x) => x.kunci), ["b", "d", "a", "c"]);
});

test("penjumlahan biaya dilakukan di sini, bukan oleh model", () => {
  assert.equal(
    totalBiaya([
      { label: "Biaya layanan", amount: 120000, confidence: 0.99 },
      { label: "Potongan promo", amount: 35000, confidence: 0.9 },
      { label: "Subsidi ongkir", amount: -15000, confidence: 0.8 },
    ]),
    140000,
  );
  assert.equal(totalBiaya([]), 0);
});

test("total penjualan menjumlahkan baris", () => {
  const b = (total: number) => ({
    kunci: "k", nama: "n", namaAsli: "n", produkId: null,
    qty: 1, hargaSatuan: total, total, confidence: 1, kosong: false,
  });
  assert.equal(totalPenjualan([b(60000), b(25000), b(0)]), 85000);
});

test("platform terdeteksi hanya memperingatkan, unknown tidak pernah", () => {
  assert.equal(peringatanPlatform("unknown", "GoFood"), null);
  assert.equal(peringatanPlatform(null, "GoFood"), null);
  assert.equal(peringatanPlatform("gofood", "GoFood"), null);
  assert.equal(peringatanPlatform("shopeefood", "ShopeeFood"), null);
  const pesan = peringatanPlatform("gofood", "ShopeeFood");
  assert.match(String(pesan), /GoFood/);
  assert.match(String(pesan), /ShopeeFood/);
});

test("periode bulan menutup akhir bulan dengan benar", () => {
  assert.deepEqual(periodeBulan("2026-09-09"), { mulai: "2026-09-01", selesai: "2026-09-30" });
  assert.deepEqual(periodeBulan("2026-02-14"), { mulai: "2026-02-01", selesai: "2026-02-28" });
  assert.deepEqual(periodeBulan("2024-02-01"), { mulai: "2024-02-01", selesai: "2024-02-29" });
  assert.deepEqual(periodeBulan("2026-12-31"), { mulai: "2026-12-01", selesai: "2026-12-31" });
});

test("tingkat kelengkapan tidak pernah menebak", () => {
  assert.equal(tingkatKelengkapan(0, 0), "empty");
  assert.equal(tingkatKelengkapan(0, 500000), "partial");
  assert.equal(tingkatKelengkapan(200000, 500000), "partial");
  assert.equal(tingkatKelengkapan(500000, 500000), "complete");
});

/** F10 per kanal. Yang dijaga uji ini: kanal tanpa rincian TIDAK pernah
 *  mewarisi komposisi kanal lain, dan kanal tanpa data sama sekali tetap muncul
 *  sebagai `empty`, bukan menghilang dari daftar. */
test("kelengkapan per kanal dihitung sendiri-sendiri, tidak saling meminjam", () => {
  const kanal = [
    { id: "off", name: "Offline" },
    { id: "gof", name: "GoFood" },
    { id: "sho", name: "ShopeeFood" },
    { id: "wa", name: "WhatsApp" },
  ];

  const hasil = kelengkapanKanal(
    [
      { channel_id: "gof", total_amount: 1_450_000 },
      { channel_id: "sho", total_amount: 600_000 },
      { channel_id: "off", total_amount: 200_000 },
    ],
    [
      { channel_id: "off", total_amount: 800_000 },
      { channel_id: "sho", total_amount: 0 },
    ],
    kanal,
  );

  const per = new Map(hasil.map((h) => [h.kanal.id, h]));

  // GoFood terinci penuh. Itu TIDAK membuat Offline ikut terinci.
  assert.equal(per.get("gof")!.tingkat, "complete");
  assert.equal(per.get("gof")!.persen, 100);

  // Offline: 200rb dari 1 juta terinci. Sisanya tetap "belum lengkap",
  // bukan dipecah mengikuti komposisi GoFood.
  const off = per.get("off")!;
  assert.equal(off.tingkat, "partial");
  assert.equal(off.omzetTotal, 1_000_000);
  assert.equal(off.omzetTerinci, 200_000);
  assert.equal(off.persen, 20);

  // Baris total bernilai 0 tidak membuat kanal yang sudah rinci jadi partial.
  assert.equal(per.get("sho")!.tingkat, "complete");

  // Kanal tanpa transaksi tetap dilaporkan, dengan persen null — bukan 0%,
  // bukan pula dihilangkan dari daftar.
  assert.equal(per.get("wa")!.tingkat, "empty");
  assert.equal(per.get("wa")!.persen, null);
  assert.equal(hasil.length, 4);
});

// ── Jalur "ketik sendiri" ───────────────────────────────────────────────────

test("hasil manual tidak menyamar jadi hasil pembacaan AI", () => {
  const h = hasilManual("kanal-1", "Offline", "itemized", "2026-09-11");

  // batchId null itulah yang membedakannya di layar konfirmasi dan di
  // simpanBatch. Kalau suatu saat diisi id palsu, entri manual akan tercatat
  // sebagai hasil parsing atas berkas yang tidak pernah ada.
  assert.equal(h.batchId, null);
  assert.equal(h.sumber, "manual");
  assert.equal(h.channelId, "kanal-1");
  assert.equal(h.namaKanal, "Offline");
  assert.equal(h.tanggal, "2026-09-11");
  assert.deepEqual(h.baris, []);
});

test("hasil manual tidak membawa peringatan mutu apa pun", () => {
  const h = hasilManual("kanal-1", "GoFood", "itemized", "2026-09-11");

  // Tidak ada mesin yang membaca, jadi tidak ada yang "kurang yakin" atau
  // "tidak terbaca". Peringatan di layar konfirmasi harus diam semua.
  assert.equal(h.perluPerhatian, false);
  assert.equal(h.fotoBuruk, false);
  assert.equal(h.peringatanPlatform, null);
  assert.equal(h.detectedPlatform, null);
  assert.deepEqual(h.unreadableRegions, []);
  assert.deepEqual(h.unmatchedPhrases, []);
  assert.equal(h.ringkasan, null);
  assert.equal(h.totalBiaya, null);
});

test("tingkat rincian manual menentukan tabel tujuan", () => {
  assert.equal(hasilManual("k", "Offline", "itemized", "2026-09-11").detailLevel, "itemized");

  const total = hasilManual("k", "Offline", "total_only", "2026-09-11");
  assert.equal(total.detailLevel, "total_only");
  // Nilainya diketik pengguna di layar konfirmasi, tidak ditebak di sini.
  assert.equal(total.totalOnlyAmount, null);
});

// ── Harga yang tidak disebut sumber diambil dari master produk ──────────────

/** Muatan ini disalin apa adanya dari upload_batches.ai_response milik
 *  unggahan "ayam bakar 2x / es campur 2x" — model benar mengembalikan harga 0
 *  dengan confidence 1, karena teksnya memang tidak menyebut harga. */
const PESANAN_TANPA_HARGA = [
  { product_name: "ayam bakar", quantity: 2, unit_price: 0, total_amount: 0, confidence: 1 },
  { product_name: "es campur", quantity: 2, unit_price: 0, total_amount: 0, confidence: 1 },
];

const KATALOG: Produk[] = [
  { id: "p1", name: "Ayam Bakar Madu", aliases: ["ayam bakar"], selling_price: 28000 },
  { id: "p2", name: "Es Campur", aliases: ["es campur"], selling_price: 12000 },
];

test("teks pesanan tanpa harga terisi dari master produk", () => {
  const [ayam, es] = dariItem(PESANAN_TANPA_HARGA, KATALOG);

  assert.equal(ayam.hargaSatuan, 28000);
  assert.equal(ayam.total, 56000, "total dihitung di sini, bukan oleh model");
  assert.equal(ayam.hargaDariMaster, true);
  assert.equal(es.hargaSatuan, 12000);
  assert.equal(es.total, 24000);

  // Baris yang sudah punya nilai tidak boleh terhalang tersimpan.
  assert.ok(ayam.total > 0 && es.total > 0);
});

test("harga yang tertulis di sumber TIDAK pernah diganti harga master", () => {
  // Diskon: terjual 20.000, padahal harga daftar 28.000. Angka sumber menang.
  const [b] = dariItem(
    [{ product_name: "ayam bakar", quantity: 1, unit_price: 20000, total_amount: 20000, confidence: 1 }],
    KATALOG,
  );
  assert.equal(b.hargaSatuan, 20000);
  assert.equal(b.total, 20000);
  assert.equal(b.hargaDariMaster, false);
});

test("baris tidak terbaca tetap nol dan tidak diisi harga master", () => {
  // qty 0 + confidence rendah = "terlihat ada, tidak terbaca" (aturan keras 1c).
  // Mengisinya dari master akan mengarang penjualan yang belum tentu terjadi.
  const [b] = dariItem(
    [{ product_name: "ayam bakar", quantity: 0, unit_price: 0, total_amount: 0, confidence: 0.2 }],
    KATALOG,
  );
  assert.equal(b.hargaSatuan, 0);
  assert.equal(b.total, 0);
  assert.equal(b.hargaDariMaster, false);
  assert.equal(b.kosong, true, "tetap ditandai sebagai baris yang menunggu diisi");
});

test("produk belum terdaftar tetap nol — tidak ada harga untuk dicari", () => {
  const [b] = dariItem(
    [{ product_name: "kopi item", quantity: 2, unit_price: 0, total_amount: 0, confidence: 1 }],
    KATALOG,
  );
  assert.equal(b.produkId, null);
  assert.equal(b.hargaSatuan, 0);
  assert.equal(b.hargaDariMaster, false);
});

test("jalur suara ikut menandai asal harganya", () => {
  const [b] = dariSuara(
    [{ spoken_name: "ayam bakar", quantity: 2, matched_product_id: "p1", match_confidence: 0.9 }],
    KATALOG,
  );
  assert.equal(b.hargaSatuan, 28000);
  assert.equal(b.hargaDariMaster, true);
});

// ── Mengetik nama produk yang sudah terdaftar ───────────────────────────────

const BARIS_KOSONG = { hargaSatuan: 0, hargaDariMaster: false };

test("nama terdaftar yang diketik langsung menautkan produk dan harganya", () => {
  const t = tambalanNama("Ayam Bakar Madu", BARIS_KOSONG, KATALOG);
  assert.equal(t.produkId, "p1");
  assert.equal(t.hargaSatuan, 28000);
  assert.equal(t.hargaDariMaster, true);
});

test("alias juga menautkan — tidak harus nama persis", () => {
  assert.equal(tambalanNama("ayam bakar", BARIS_KOSONG, KATALOG).produkId, "p1");
  assert.equal(tambalanNama("  Es   Campur ", BARIS_KOSONG, KATALOG).produkId, "p2");
});

test("produk terdaftar TIDAK pernah ditandai belum terdaftar", () => {
  // Inilah galatnya: sebelum ini setiap ketikan memaksa produkId null, jadi
  // tombol "Daftarkan produk" muncul untuk produk yang sudah ada dan menekannya
  // akan membuat produk kembar.
  assert.notEqual(tambalanNama("Ayam Bakar Madu", BARIS_KOSONG, KATALOG).produkId, null);
});

test("harga yang sudah diketik sendiri tidak ditimpa harga master", () => {
  const t = tambalanNama("Ayam Bakar Madu", { hargaSatuan: 20000, hargaDariMaster: false }, KATALOG);
  assert.equal(t.produkId, "p1", "tetap ditautkan");
  assert.equal(t.hargaSatuan, undefined, "tapi harganya dibiarkan apa adanya");
});

test("ganti ke produk lain memperbarui harga yang berasal dari master", () => {
  const t = tambalanNama("Es Campur", { hargaSatuan: 28000, hargaDariMaster: true }, KATALOG);
  assert.equal(t.produkId, "p2");
  assert.equal(t.hargaSatuan, 12000);
});

test("nama tak dikenal melepas tautan dan harga master yang menempel", () => {
  const t = tambalanNama("Kopi Item", { hargaSatuan: 28000, hargaDariMaster: true }, KATALOG);
  assert.equal(t.produkId, null);
  assert.equal(t.hargaSatuan, 0, "harga produk lain tidak boleh ikut ke nama baru");
  assert.equal(t.hargaDariMaster, false);
});

test("nama tak dikenal tidak mengutak-atik harga yang diketik sendiri", () => {
  const t = tambalanNama("Kopi Item", { hargaSatuan: 9000, hargaDariMaster: false }, KATALOG);
  assert.equal(t.produkId, null);
  assert.equal(t.hargaSatuan, undefined);
});
