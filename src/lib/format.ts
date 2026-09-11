/** Format angka Indonesia. Satu-satunya tempat angka diubah jadi teks.
 *  Pemisah ribuan titik, desimal koma. */

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const persen = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const ringkas = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** "Rp 12.450.000". null berarti data belum diketahui — bukan nol. */
export function formatRupiah(nilai: number | null): string {
  if (nilai === null) return "Belum ada data";
  // Intl "id-ID" menghasilkan "Rp 12.450.000" dengan NBSP; ganti jadi spasi biasa.
  return rupiah.format(nilai).replace(/ /g, " ");
}

/** "23,4%". Tanda minus selalu ikut — warna tidak pernah jadi satu-satunya penanda. */
export function formatPersen(nilai: number | null): string {
  if (nilai === null) return "Belum ada data";
  return `${persen.format(nilai)}%`;
}

/** Untuk sumbu grafik yang sempit: "12,4 jt", "850 rb". */
export function formatRingkas(nilai: number): string {
  const abs = Math.abs(nilai);
  if (abs >= 1_000_000_000) return `${ringkas.format(nilai / 1_000_000_000)} m`;
  if (abs >= 1_000_000) return `${ringkas.format(nilai / 1_000_000)} jt`;
  if (abs >= 1_000) return `${ringkas.format(nilai / 1_000)} rb`;
  return ringkas.format(nilai);
}

/** Kelas warna semantik untuk sebuah nilai. null → abu-abu "belum diketahui". */
export function warnaNilai(nilai: number | null): string {
  if (nilai === null) return "text-unknown";
  if (nilai < 0) return "text-negative";
  if (nilai > 0) return "text-positive";
  return "text-foreground";
}
