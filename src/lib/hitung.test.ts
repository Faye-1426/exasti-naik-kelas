import assert from "node:assert/strict";
import { test } from "node:test";
import {
  cakupan,
  hppDasar,
  hppSusut,
  kalimatCakupan,
  marginPerKanal,
  marginSatuan,
  potonganKanal,
  ringkasMargin,
  sorotan,
  type BarisPenjualan,
  type Kanal,
  type ProdukBiaya,
} from "./hitung.ts";

/** Angka contoh diambil dari seed.sql supaya uji ini dan data demo tidak pernah
 *  saling bertentangan. Es Teh Manis: HPP dasar 3.800, susut 10% → 4.180. */
const ES_TEH: ProdukBiaya = {
  id: "p1",
  name: "Es Teh Manis",
  selling_price: 5000,
  waste_pct: 10,
  komponen: [
    { name: "Teh dan gula", type: "material", cost_per_unit: 1400 },
    { name: "Cup dan sedotan", type: "packaging", cost_per_unit: 1100 },
    { name: "Es batu dan listrik", type: "energy", cost_per_unit: 900 },
    { name: "Waktu peracikan", type: "labor", cost_per_unit: 400 },
  ],
};

/** Produk tanpa komponen biaya. HPP-nya belum diketahui, bukan nol. */
const BELUM_ADA_HPP: ProdukBiaya = {
  id: "p2",
  name: "Nasi Rames",
  selling_price: 15000,
  waste_pct: 0,
  komponen: [],
};

const OFFLINE: Kanal = { id: "k1", name: "Offline", commission_pct: 0 };
const GOFOOD: Kanal = { id: "k2", name: "GoFood", commission_pct: 20 };

test("HPP dasar menjumlahkan keempat tipe komponen", () => {
  assert.equal(hppDasar(ES_TEH.komponen), 3800);
  assert.equal(hppDasar([]), 0);
});

test("susut menaikkan HPP, bukan mengurangi", () => {
  assert.equal(hppSusut(3800, 10), 4180);
  assert.equal(hppSusut(3800, 0), 3800);
});

test("potongan kanal hanya di kanal berkomisi", () => {
  assert.equal(potonganKanal(5000, 0), 0);
  assert.equal(potonganKanal(5000, 20), 1000);
});

/** Temuan utama demo: produk yang untung di warung justru rugi di GoFood. */
test("produk yang sama untung offline dan rugi di kanal berkomisi", () => {
  const offline = marginSatuan(5000, 3800, 10, 0);
  assert.equal(offline.nominal, 820);
  // Toleransi: 16,400000000000002 adalah pembagian float, bukan salah rumus.
  // formatPersen membulatkan ke satu desimal sebelum angkanya sampai ke layar.
  assert.ok(Math.abs(offline.persen! - 16.4) < 0.001);

  const gofood = marginSatuan(5000, 3800, 10, 20);
  assert.equal(gofood.nominal, -180);
  assert.ok(gofood.persen !== null && gofood.persen < 0);
});

test("harga jual nol memberi persen null, bukan Infinity", () => {
  const h = marginSatuan(0, 3800, 10, 0);
  assert.equal(h.persen, null);
});

test("simulasi harga tidak mengubah harga tersimpan", () => {
  const naik = marginPerKanal(ES_TEH, [GOFOOD], 7000);
  assert.equal(naik[0].nominal, 7000 - 4180 - 1400);
  assert.ok(naik[0].nominal > 0, "naik harga membuat GoFood tidak lagi rugi");
  assert.equal(ES_TEH.selling_price, 5000);
});

// ── Peringkasan ────────────────────────────────────────────────────────────

const PENJUALAN: BarisPenjualan[] = [
  { product_id: "p1", product_name_raw: "Es Teh Manis", quantity: 10, total_amount: 50_000, channel_id: "k1" },
  { product_id: "p1", product_name_raw: "Es Teh Manis", quantity: 10, total_amount: 50_000, channel_id: "k2" },
  { product_id: "p2", product_name_raw: "Nasi Rames", quantity: 4, total_amount: 60_000, channel_id: "k1" },
  { product_id: null, product_name_raw: "Kopi Item", quantity: 2, total_amount: 14_000, channel_id: "k1" },
];

test("satu produk di dua kanal dipotong sesuai kanalnya masing-masing", () => {
  const baris = ringkasMargin(PENJUALAN, [ES_TEH, BELUM_ADA_HPP], [OFFLINE, GOFOOD]);
  const esTeh = baris.find((b) => b.produkId === "p1")!;

  assert.equal(esTeh.qty, 20);
  assert.equal(esTeh.omzet, 100_000);
  // 0% dari 50.000 + 20% dari 50.000. Rata-rata 10% akan memberi 10.000 — salah.
  assert.equal(esTeh.potongan, 10_000);
  assert.equal(esTeh.hppTotal, 4180 * 20);
  assert.equal(esTeh.marginNominal, 100_000 - 83_600 - 10_000);
});

test("produk tanpa komponen biaya: margin null, omzet tetap tampil", () => {
  const baris = ringkasMargin(PENJUALAN, [ES_TEH, BELUM_ADA_HPP], [OFFLINE, GOFOOD]);
  const rames = baris.find((b) => b.produkId === "p2")!;

  assert.equal(rames.omzet, 60_000);
  assert.equal(rames.hppTotal, null);
  assert.equal(rames.marginNominal, null, "HPP kosong tidak boleh jadi untung 100%");
  assert.ok(rames.alasanKosong);
});

test("baris yang belum ditautkan ke produk tidak dibuang", () => {
  const baris = ringkasMargin(PENJUALAN, [ES_TEH, BELUM_ADA_HPP], [OFFLINE, GOFOOD]);
  const kopi = baris.find((b) => b.nama === "Kopi Item")!;

  assert.equal(kopi.produkId, null);
  assert.equal(kopi.omzet, 14_000, "omzetnya tetap ikut, hanya marginnya yang kosong");
  assert.equal(kopi.marginNominal, null);
});

// ── Cakupan ────────────────────────────────────────────────────────────────

test("cakupan dibandingkan terhadap omzet kedua tabel", () => {
  const c = cakupan(
    [{ product_id: "p1", product_name_raw: null, quantity: 1, total_amount: 400_000, channel_id: "k1" }],
    [{ channel_id: "k2", total_amount: 600_000 }],
    [OFFLINE, GOFOOD],
  );

  assert.equal(c.omzetTerinci, 400_000);
  assert.equal(c.omzetTotal, 1_000_000);
  assert.equal(c.persen, 40);
  assert.deepEqual(c.kanalTanpaRincian, ["GoFood"]);
  assert.equal(kalimatCakupan(c), "Analisis ini mencakup 40% dari total omzet. Kanal GoFood belum terinci.");
});

test("tanpa data sama sekali, cakupan null bukan 0%", () => {
  const c = cakupan([], [], [OFFLINE]);
  assert.equal(c.persen, null);
  assert.match(kalimatCakupan(c), /Belum ada penjualan/);
});

// ── Sorotan ────────────────────────────────────────────────────────────────

test("sorotan memakai margin nominal dan mengabaikan baris tanpa HPP", () => {
  const baris = ringkasMargin(PENJUALAN, [ES_TEH, BELUM_ADA_HPP], [OFFLINE, GOFOOD]);
  const s = sorotan(baris);

  assert.equal(s.palingUntung?.produkId, "p1");
  assert.equal(s.palingRugi, null, "tidak ada yang rugi, jadi tidak dipaksakan");
  assert.equal(s.penyumbangOmzet?.produkId, "p1", "omzet dipakai walau marginnya belum ada");
});

test("produk rugi muncul sebagai paling rugi", () => {
  const rugi = ringkasMargin(
    [{ product_id: "p1", product_name_raw: null, quantity: 100, total_amount: 500_000, channel_id: "k2" }],
    [ES_TEH],
    [OFFLINE, GOFOOD],
  );
  assert.ok(rugi[0].marginNominal! < 0);
  assert.equal(sorotan(rugi).palingRugi?.produkId, "p1");
  assert.equal(sorotan(rugi).palingUntung, null);
});
