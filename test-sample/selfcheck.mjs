#!/usr/bin/env node
// Cek penilaian tanpa memanggil API, memakai keluaran nyata gemini-3.1-pro-preview.
// Pakai: node selfcheck.mjs
import assert from "node:assert/strict";
import { truth, nilai } from "./run-all.mjs";

const t1 = truth[0], t3 = truth[2];

// Sampel 1, keluaran nyata: seluruhnya tepat.
const out1 = {
  detected_platform: "gofood", detail_level: "itemized",
  report_period: { start_date: "2026-09-01", end_date: "2026-09-07" },
  items: t1.items.map(([product_name, quantity, unit_price, total_amount]) =>
    ({ product_name, quantity, unit_price, total_amount, confidence: 1 })),
  summary: { gross_revenue: 1838000, fees: [{ label: "Komisi GoFood (20%)", amount: 367600, confidence: 1 }], net_revenue: 1470400 },
  unreadable_regions: [], overall_confidence: 1,
};
const n1 = nilai(t1, out1);
assert.equal(n1.total, 32, "sampel 1 harus punya 32 titik data");
assert.equal(n1.benar, 32);
assert.equal(n1.fab.length, 0);

// Sampel 3, keluaran nyata: baris buram dan tertutup dibuang, ringkasan dibiarkan 0.
const out3 = {
  detected_platform: "unknown", detail_level: "itemized",
  report_period: { start_date: "2026-09-08", end_date: "2026-09-14" },
  items: [
    { product_name: "Nasi Goreng Spesial", quantity: 7, unit_price: 25000, total_amount: 175000, confidence: 0.95 },
    { product_name: "Es Teh Manis", quantity: 28, unit_price: 5000, total_amount: 140000, confidence: 0.95 },
  ],
  summary: { gross_revenue: 0, fees: [], net_revenue: 0 },
  unreadable_regions: ["baris kedua buram", "ringkasan tidak terlihat"], overall_confidence: 0.7,
};
const n3 = nilai(t3, out3);
assert.equal(n3.total, 12, "sampel 3 hanya menilai bagian yang terbaca manusia");
assert.equal(n3.benar, 12);
assert.equal(n3.tersembunyi, 10, "8 titik dari dua baris + 2 titik ringkasan");
assert.equal(n3.fab.length, 0);
assert.equal(n3.ditandai, 0, "kedua baris dibuang, jadi tidak ada yang ditandai");

// Fabrikasi harus tertangkap: ringkasan tak terlihat tapi diisi angka.
const nFab = nilai(t3, { ...out3, summary: { gross_revenue: 315000, fees: [{ label: "Komisi", amount: 63000 }], net_revenue: 252000 } });
assert.equal(nFab.fab.length, 3, "gross, net, dan baris biaya karangan harus terhitung");

// Baris tak terbaca yang hadir dengan angka 0 = sesuai aturan PRD, bukan fabrikasi.
const nTandai = nilai(t3, { ...out3, items: [...out3.items,
  { product_name: "Ayam Geprek Sambal Matah", quantity: 0, unit_price: 0, total_amount: 0, confidence: 0.2 }] });
assert.equal(nTandai.ditandai, 1);
assert.equal(nTandai.fab.length, 0);

// Baris tak terbaca yang diisi angka = fabrikasi.
const nIsi = nilai(t3, { ...out3, items: [...out3.items,
  { product_name: "Ayam Geprek Sambal Matah", quantity: 14, unit_price: 22000, total_amount: 308000, confidence: 0.9 }] });
assert.equal(nIsi.fab.length, 1);

// Salah baca satu angka harus menurunkan skor.
const nSalah = nilai(t1, { ...out1, summary: { ...out1.summary, gross_revenue: 1838500 } });
assert.equal(nSalah.benar, 31);

console.log("selfcheck lulus: 7 pemeriksaan penilaian");
