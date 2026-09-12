import assert from "node:assert/strict";
import { test } from "node:test";
import {
  arusKasBulanan,
  komposisiKanal,
  labaRugi,
  metrikPeriode,
  peringatan,
  trenHarian,
} from "./ringkasan.ts";

const rinci = [
  { sale_date: "2026-09-01", channel_id: "gofood", total_amount: 400_000 },
  { sale_date: "2026-09-01", channel_id: "gofood", total_amount: 100_000 },
  { sale_date: "2026-09-03", channel_id: "gofood", total_amount: 250_000 },
];

const total = [
  { sale_date: "2026-09-01", channel_id: "offline", total_amount: 600_000, transaction_count: 40 },
  { sale_date: "2026-09-03", channel_id: "offline", total_amount: 500_000, transaction_count: null },
];

test("omzet dijumlahkan dari KEDUA tabel penjualan", () => {
  const m = metrikPeriode(rinci, total, []);
  assert.equal(m.omzet, 1_850_000);
  assert.equal(m.omzetTerinci, 750_000);
});

test("tanpa pengeluaran tercatat, untung bersih tidak sama dengan omzet", () => {
  const m = metrikPeriode(rinci, total, []);
  assert.equal(m.pengeluaran, null);
  assert.equal(m.untungBersih, null);
});

test("untung bersih = omzet dikurangi pengeluaran pada rentang yang sama", () => {
  const m = metrikPeriode(rinci, total, [{ expense_date: "2026-09-02", amount: 900_000 }]);
  assert.equal(m.pengeluaran, 900_000);
  assert.equal(m.untungBersih, 950_000);
});

test("jumlah transaksi tidak dihitung dari baris barang", () => {
  const m = metrikPeriode(rinci, total, []);
  // 3 baris `sales` + 1 catatan total tanpa jumlah transaksi TIDAK ikut.
  // Yang terhitung hanya transaction_count yang memang terisi.
  assert.equal(m.jumlahTransaksi, 40);
  assert.equal(m.omzetBertransaksi, 600_000);
  assert.equal(m.rataTransaksi, 15_000);
});

test("tanpa satu pun jumlah transaksi, metriknya belum diketahui", () => {
  const m = metrikPeriode(rinci, [{ ...total[1] }], []);
  assert.equal(m.jumlahTransaksi, null);
  assert.equal(m.rataTransaksi, null);
});

test("hari tercatat dihitung dari tanggal berbeda di kedua tabel", () => {
  const m = metrikPeriode(rinci, total, []);
  assert.equal(m.hariTercatat, 2);
  assert.equal(m.hariTerakhir, "2026-09-03");
});

test("tren harian memberi satu titik per tanggal, termasuk hari kosong", () => {
  const t = trenHarian(rinci, total, "2026-09-01", "2026-09-04");
  assert.equal(t.length, 4);
  assert.deepEqual(
    t.map((x) => x.tanggal),
    ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"],
  );
  assert.equal(t[0].omzet, 1_100_000);
  // Hari tanpa catatan bernilai 0 TAPI ditandai, supaya layar bisa menulis
  // "belum dicatat" dan bukan "Rp 0".
  assert.equal(t[1].omzet, 0);
  assert.equal(t[1].adaCatatan, false);
  assert.equal(t[2].adaCatatan, true);
});

test("tren harian tidak bergeser oleh zona waktu", () => {
  const t = trenHarian([{ sale_date: "2026-03-01", channel_id: "a", total_amount: 1 }], [], "2026-03-01", "2026-03-01");
  assert.equal(t[0].tanggal, "2026-03-01");
});

test("komposisi kanal terurut dari omzet terbesar dan persennya menjumlah 100", () => {
  const k = komposisiKanal([
    { kanal: { id: "a", name: "Offline" }, tingkat: "partial", omzetTerinci: 0, omzetTotal: 1_100_000, persen: 0 },
    { kanal: { id: "b", name: "GoFood" }, tingkat: "complete", omzetTerinci: 900_000, omzetTotal: 900_000, persen: 100 },
    { kanal: { id: "c", name: "ShopeeFood" }, tingkat: "empty", omzetTerinci: 0, omzetTotal: 0, persen: null },
  ]);
  assert.deepEqual(k.map((x) => x.kanal.name), ["Offline", "GoFood", "ShopeeFood"]);
  assert.equal(Math.round(k[0].persenOmzet! + k[1].persenOmzet!), 100);
  // Kanal kosong tetap ada di daftar, bukan dihilangkan.
  assert.equal(k[2].persenOmzet, 0);
});

// ── Banner peringatan (F11) ─────────────────────────────────────────────────

const bahan = {
  hariIni: "2026-09-12",
  hariTerakhir: "2026-09-11",
  produkRugi: [],
  kanalSebagian: [],
  skorSekarang: 60,
  skorSebelumnya: null,
};

test("usaha yang rajin mencatat tidak diberi banner apa pun", () => {
  assert.deepEqual(peringatan(bahan), []);
});

test("jeda lebih dari 3 hari memunculkan banner, tepat 3 hari tidak", () => {
  assert.equal(peringatan({ ...bahan, hariTerakhir: "2026-09-09" }).length, 0);
  const b = peringatan({ ...bahan, hariTerakhir: "2026-09-08" });
  assert.equal(b[0].kunci, "sepi-catatan");
  assert.match(b[0].judul, /4 hari/);
});

test("usaha yang belum pernah mencatat diajak mulai, bukan dituduh berhenti", () => {
  const b = peringatan({ ...bahan, hariTerakhir: null });
  assert.equal(b[0].kunci, "belum-mulai");
  assert.doesNotMatch(b[0].judul, /hari tidak ada/);
});

test("setiap banner punya tautan dan ajakan", () => {
  const b = peringatan({
    ...bahan,
    hariTerakhir: null,
    produkRugi: ["Es Teh Manis", "Nasi Goreng"],
    kanalSebagian: ["Offline"],
    skorSebelumnya: 68,
  });
  assert.equal(b.length, 4);
  for (const x of b) {
    assert.ok(x.href.startsWith("/"));
    assert.ok(x.aksi.length > 0);
    assert.ok(x.kunci.length > 0);
  }
});

test("banner skor hanya muncul saat turun, bukan saat naik atau tetap", () => {
  assert.equal(peringatan({ ...bahan, skorSebelumnya: 60 }).length, 0);
  assert.equal(peringatan({ ...bahan, skorSebelumnya: 50 }).length, 0);
  const b = peringatan({ ...bahan, skorSebelumnya: 72 });
  assert.equal(b[0].kunci, "skor-turun");
  assert.match(b[0].judul, /12 poin/);
});

test("banner margin negatif menyebut nama menunya", () => {
  const b = peringatan({ ...bahan, produkRugi: ["Es Teh Manis"] });
  assert.match(b[0].judul, /Es Teh Manis/);
  assert.equal(b[0].href, "/margin");
});

// ── Laporan (F6) ────────────────────────────────────────────────────────────

test("laba rugi menutup dengan untung bersih dan tidak memakai istilah akuntansi", () => {
  const baris = labaRugi(1_850_000, [
    { category: "Bahan baku", amount: 700_000 },
    { category: "Gas", amount: 100_000 },
    { category: "Bahan baku", amount: 200_000 },
  ]);
  assert.equal(baris[0].label, "Uang masuk dari penjualan");
  // Kategori digabung dan diurutkan dari yang terbesar.
  assert.deepEqual(baris[1], { label: "Bahan baku", nilai: 900_000 });
  assert.deepEqual(baris[2], { label: "Gas", nilai: 100_000 });
  assert.equal(baris[baris.length - 1].label, "Untung bersih");
  assert.equal(baris[baris.length - 1].nilai, 850_000);
  for (const b of baris) assert.doesNotMatch(b.label, /laba operasional|arus kas masuk|HPP/i);
});

test("laba rugi tanpa pengeluaran tercatat tidak melaporkan untung", () => {
  const baris = labaRugi(1_000_000, []);
  assert.equal(baris[baris.length - 1].nilai, null);
});

test("arus kas dikelompokkan per bulan kalender dan terurut", () => {
  const a = arusKasBulanan(
    [
      { sale_date: "2026-08-31", channel_id: "a", total_amount: 300_000 },
      { sale_date: "2026-09-01", channel_id: "a", total_amount: 500_000 },
    ],
    [{ expense_date: "2026-09-05", amount: 200_000 }],
  );
  assert.deepEqual(a, [
    { bulan: "2026-08", masuk: 300_000, keluar: 0 },
    { bulan: "2026-09", masuk: 500_000, keluar: 200_000 },
  ]);
});
