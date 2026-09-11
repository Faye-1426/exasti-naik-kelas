/** PostgREST memotong setiap balikan di 1.000 baris dan TIDAK memberi tahu
 *  bahwa ia memotong: tidak ada galat, tidak ada penanda, hanya larik yang
 *  lebih pendek. Setiap penjumlahan di sisi JavaScript atas tabel `sales` jadi
 *  diam-diam mengecil begitu datanya lewat seribu baris — omzet berkurang tanpa
 *  disadari siapa pun, persis hal yang dilarang aturan keras.
 *
 *  Berdiri sendiri, tanpa impor Supabase maupun Next, supaya bisa diuji dengan
 *  `node --test` tanpa peramban dan tanpa basis data (lihat paginasi.test.ts).
 *
 *  ponytail: diambil per halaman sampai habis — O(baris/1000) perjalanan bolak
 *  balik. Cukup untuk satu warung (3.960 baris = 4 permintaan). Ganti dengan
 *  satu RPC yang mengelompokkan di Postgres kalau barisnya sudah puluhan ribu,
 *  atau kalau agregat PostgREST dinyalakan di proyek ini. */

export const HALAMAN = 1000;

/**
 * Mengambil seluruh baris sebuah kueri, halaman demi halaman.
 *
 * `buat` dipanggil ulang untuk tiap halaman, bukan sekali: pembangun kueri
 * Supabase hanya bisa dijalankan satu kali. Kueri yang dibuatnya WAJIB punya
 * urutan yang pasti (`.order("id")`) — tanpa itu Postgres boleh memberi urutan
 * berbeda tiap halaman, sehingga ada baris yang terhitung dua kali sementara
 * yang lain hilang sama sekali.
 */
export async function semuaBaris<T>(
  buat: (dari: number, sampai: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const semua: T[] = [];
  for (let mulai = 0; ; mulai += HALAMAN) {
    const { data } = await buat(mulai, mulai + HALAMAN - 1);
    if (!data?.length) break;
    semua.push(...data);
    // Halaman yang tidak penuh berarti sudah habis. Halaman yang penuh belum
    // tentu — perlu satu permintaan lagi untuk memastikan.
    if (data.length < HALAMAN) break;
  }
  return semua;
}
