import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatRupiah,
  formatPersen,
  formatRingkas,
  warnaNilai,
} from "./format.ts";

test("rupiah dipisah titik, tanpa desimal", () => {
  assert.equal(formatRupiah(12_450_000), "Rp 12.450.000");
  assert.equal(formatRupiah(-320_500), "-Rp 320.500");
  assert.equal(formatRupiah(0), "Rp 0");
});

test("null bukan nol", () => {
  assert.equal(formatRupiah(null), "Belum ada data");
  assert.equal(formatPersen(null), "Belum ada data");
  assert.equal(warnaNilai(null), "text-unknown");
  assert.notEqual(formatRupiah(null), formatRupiah(0));
});

test("persen pakai koma dan selalu bertanda", () => {
  assert.equal(formatPersen(23.4), "23,4%");
  assert.equal(formatPersen(-8), "-8,0%");
});

test("ringkas untuk sumbu grafik", () => {
  assert.equal(formatRingkas(12_450_000), "12,5 jt");
  assert.equal(formatRingkas(850_000), "850 rb");
  assert.equal(formatRingkas(420), "420");
});

test("warna semantik ikut tanda", () => {
  assert.equal(warnaNilai(1), "text-positive");
  assert.equal(warnaNilai(-1), "text-negative");
  assert.equal(warnaNilai(0), "text-foreground");
});
