# Naik Kelas

Dashboard keuangan internal untuk pemilik UMKM Indonesia. Mengubah catatan
penjualan yang berserakan menjadi bukti kelayakan kredit.

## Konteks Produk

Pengguna utama: pemilik warung, usia 40-an, literasi digital rendah, mengakses
dari ponsel Android kelas menengah. Bukan pengguna teknis.

Ini aplikasi INTERNAL untuk pemilik usaha. Tidak ada bagian yang menghadap
pelanggan akhir. Tidak ada katalog, etalase, keranjang, atau pembayaran.

Ini BUKAN aplikasi kasir. Tidak ada input per transaksi saat terjadi.
Sistem bekerja retrospektif atas data satu hari atau satu periode.

## Stack

- Next.js 14 App Router, TypeScript, Tailwind CSS
- shadcn/ui untuk komponen. JANGAN membuat komponen dasar dari nol.
- Supabase: Postgres, Auth, Storage
- Google Gemini dengan structured output. Model produksi: `gemini-3.1-pro-preview`
  (sudah divalidasi pada uji parsing 3 September, akurasi 97,8%, 0 nilai dikarang).
  JANGAN mengganti model tanpa menjalankan ulang uji di `test-sample/`.
- Recharts untuk grafik
- Web Speech API untuk transkripsi suara
- Deploy ke Vercel

## Aturan Keras

1. TIDAK ADA penulisan otomatis ke database dari hasil AI. Setiap hasil parsing
   AI wajib melewati layar konfirmasi yang disetujui manusia.
1b. MODEL DILARANG BERHITUNG. Setiap angka yang dikembalikan model harus tertulis
   apa adanya di layar. Tidak ada penjumlahan, pengurangan, atau kalkulasi apa pun
   di sisi model. Seluruh aritmatika dilakukan di sisi server.
1c. BARIS TIDAK TERBACA TIDAK BOLEH DIBUANG. Baris yang terlihat ada namun tidak
   terbaca dikembalikan dengan angka 0 dan confidence rendah, disertai alasan di
   unreadable_regions. Membuang baris membuat omzet berkurang tanpa disadari pengguna.
2. TIDAK ADA angka hasil estimasi atau ekstrapolasi. Data yang tidak diketahui
   ditandai sebagai tidak diketahui, tidak ditebak.
3. TIDAK ADA localStorage atau sessionStorage.
4. Perhitungan margin dan skor dilakukan di sisi server, bukan klien.
5. Setiap pemanggilan Gemini menggunakan structured output dengan JSON schema.
   Balikan divalidasi sebelum ditampilkan.
6. Berkas dan teks asli selalu disimpan sebagai jejak audit.

## Model Data Penting

Ada DUA tabel penjualan dan pemisahan ini disengaja:

- `sales` — penjualan berrincian item (produk, qty, harga)
- `sales_totals` — penjualan total harian tanpa rincian item

JANGAN memasukkan data total harian ke tabel `sales` dengan produk fiktif.
Itu akan mencemari perhitungan margin dan sulit dibersihkan.

- Omzet dan arus kas = jumlah dari KEDUA tabel
- Margin per produk = HANYA dari tabel `sales`

## Rumus Perhitungan

```
HPP Dasar        = bahan baku + kemasan + energi + tenaga kerja
HPP + Susut      = HPP Dasar × (1 + persentase susut)
Potongan Kanal   = harga jual × persentase komisi kanal
Margin Nominal   = harga jual − HPP + Susut − Potongan Kanal
Margin Persen    = (Margin Nominal ÷ harga jual) × 100
```

Potongan platform hanya berlaku pada kanal digital (GoFood, ShopeeFood),
tidak pada kanal Offline. Satu produk yang sama punya margin berbeda per kanal.

## Skor Kesiapan KUR

Skor 0-100 dengan enam kriteria berbobot:

| Kriteria | Bobot | Butuh data rinci? |
|---|---|---|
| Konsistensi pencatatan | 25 | Tidak |
| Kestabilan omzet | 20 | Tidak |
| Profitabilitas | 20 | Sebagian |
| Lama usaha berjalan | 15 | Tidak |
| Kesehatan arus kas | 10 | Tidak |
| Kelengkapan dokumen | 10 | Tidak |

Lima dari enam kriteria dihitung penuh meski hanya ada data total harian.
Skor selalu disertai keterangan bahwa ini indikatif, bukan keputusan kredit resmi.

## Tingkat Kelengkapan Data

Setiap kanal punya tingkat: `complete`, `partial`, atau `empty`.
Tingkat `partial` berarti hanya ada total tanpa rincian item.

Pada tingkat `partial`: omzet dan arus kas tetap ditampilkan, margin per produk
ditandai belum tersedia, dan sistem menawarkan input suara. Tidak pernah menebak.

## Bahasa

Seluruh teks antarmuka dalam Bahasa Indonesia sehari-hari.
Gunakan "Untung bersih" bukan "Laba operasional".
Gunakan "Uang masuk" bukan "Arus kas masuk".
Hindari istilah akuntansi teknis.

## Yang Tidak Boleh Dibuat

Multi-user, sistem role, manajemen stok, katalog pelanggan, notifikasi push,
chatbot tanya-jawab bebas, multi-cabang, integrasi API marketplace,
fitur kasir. Semua sudah ditolak dengan alasan tercatat di PRD bagian 8.3.

Kalau ada ide fitur di luar daftar PRD, TANYAKAN dulu sebelum membangun.
Anggaran waktu sudah minus 10 jam.