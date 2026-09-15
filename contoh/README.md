# Berkas contoh untuk demo

Dua gambar uji, cocok dengan 12 produk di `supabase/seed.sql` supaya tidak ada
baris "Belum terdaftar" saat rekaman.

Tidak memakai logo atau warna khas GoFood/ShopeeFood. Bukan cuma soal kehati-hatian:
`tambah-jalur.tsx` menetapkan kanal SEBELUM unggah dan hasil parsing tidak pernah
mengubahnya, jadi merek di gambar memang tidak dipakai. Laporan mitra generik
justru memicu `detected_platform: "unknown"` — perilaku yang sudah benar menurut
PROMPT_MARKETPLACE.

## `contoh-screenshot-marketplace.png`

Jalur **Unggah screenshot**. 7 baris, 13 September 2026.

Yang diuji:
- 6 baris jelas dengan qty, harga, dan total tertulis
- 1 baris **sengaja diburamkan** (Sate Ayam) — aturan keras 1c: jangan dibuang,
  kembalikan 0 dengan confidence rendah plus alasan di `unreadable_regions`
- 4 baris potongan berlabel sendiri-sendiri — `summary.fees` tidak boleh digabung
- Penjualan kotor 498.000 sudah termasuk baris buram, jadi selisihnya nyata dan
  memang harus terlihat

## `contoh-tulisan-tangan.png`

Jalur **Foto catatan tangan**. Kertas bergaris, agak miring, ada noda kopi.

Yang diuji:
- **Mie goreng punya qty 5 tapi tanpa harga.** Ini yang paling penting: memicu
  jalur harga-dari-master di `dariItem`, dan langsung memperlihatkan perbaikan
  `total = hargaSatuan × qty` (commit 03692fb). Sebelum perbaikan itu, baris
  seperti ini tersimpan bernilai 0.
- Setoran tertulis 473.000 dan memang sama dengan jumlah keenam barisnya.

## Membuat ulang

Sumber HTML tidak disimpan — gambarnya sudah final. Kalau perlu diubah, render
ulang dengan Chrome headless:

```
chrome --headless --disable-gpu --force-device-scale-factor=2 \
  --screenshot="<path absolut>.png" --window-size=800,772 "file:///<path>.html"
```

Path `--screenshot` wajib absolut; path relatif diam-diam tidak menghasilkan berkas.
