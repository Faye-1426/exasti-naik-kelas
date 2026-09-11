import assert from "node:assert/strict";
import { test } from "node:test";

import { semuaBaris } from "./paginasi.ts";

/** Tiruan PostgREST: memotong di 1.000 baris per permintaan, persis seperti
 *  aslinya, tanpa galat dan tanpa penanda apa pun bahwa ia memotong. */
function palsu(jumlahBaris: number) {
  const semua = Array.from({ length: jumlahBaris }, (_, i) => ({ id: i }));
  const panggilan: [number, number][] = [];
  return {
    panggilan,
    ambil: async (dari: number, sampai: number) => {
      panggilan.push([dari, sampai]);
      return { data: semua.slice(dari, Math.min(sampai + 1, dari + 1000)), error: null };
    },
  };
}

test("baris melebihi 1.000 tetap terambil seluruhnya", async () => {
  const db = palsu(3960);
  const hasil = await semuaBaris(db.ambil);

  // Inilah galat yang pernah terjadi: 1.000 baris terbaca dari 3.960, omzet
  // mengecil seperempatnya, dan tidak ada satu pun galat yang muncul.
  assert.equal(hasil.length, 3960);
  assert.deepEqual(
    hasil.map((b) => b.id),
    Array.from({ length: 3960 }, (_, i) => i),
  );
  assert.equal(db.panggilan.length, 4);
});

test("berhenti tepat saat halaman terakhir penuh", async () => {
  // 2.000 baris: halaman kedua penuh, jadi perlu satu permintaan lagi untuk
  // tahu bahwa memang sudah habis. Tanpa itu, 2.000 baris terbaca 2.000 —
  // kebetulan benar — tapi 2.001 baris akan terpotong.
  const db = palsu(2000);
  assert.equal((await semuaBaris(db.ambil)).length, 2000);
  assert.equal(db.panggilan.length, 3);
});

test("tabel kosong tidak berputar selamanya", async () => {
  const db = palsu(0);
  assert.deepEqual(await semuaBaris(db.ambil), []);
  assert.equal(db.panggilan.length, 1);
});

test("data null diperlakukan sebagai habis, bukan diulang", async () => {
  let n = 0;
  const hasil = await semuaBaris<{ id: number }>(async () => {
    n += 1;
    return { data: null, error: null };
  });
  assert.deepEqual(hasil, []);
  assert.equal(n, 1);
});
