# Cara Menggunakan Naik Kelas

Urutan klik untuk demo sekali rekam. Tidak perlu diedit — ikuti dari atas ke bawah.

## Siapkan

```bash
npm run dev          # buka http://localhost:3000
```

Masuk: **demo@naikkelas.id** / **demo1234**

Rekam di lebar ponsel: buka DevTools (F12) → ikon toggle device → pilih iPhone
atau atur lebar 390px. Pengguna aplikasi ini pakai Android.

Kalau data demo perlu dikembalikan ke awal (tabel di-drop, migrasi diulang,
seed dimuat lagi):

```bash
npx supabase db reset --linked --yes
```

Datanya deterministik — angka di layar sama persis setiap kali direset.

---

## 1. Ringkasan — halaman `/`

Halaman pertama setelah masuk.

- **Empat angka di atas:** uang masuk, untung bersih, jumlah transaksi, rata-rata
  per hari — semuanya bulan berjalan.
- **Grafik tren:** omzet harian. Gulir untuk melihat pola.
- **Kanal:** tiap kanal punya penanda kelengkapan. Cari yang bertanda
  **"cuma total harian"** — itu kanal Offline di bulan pertama. Tunjukkan ini,
  karena di situ sistem mengaku tidak punya rincian alih-alih menebak.
- **Skor KUR** dan **insight mingguan** ada di bawahnya.

## 2. Tambah data — `/tambah`

Tekan **Tambah** di nav bawah.

Ada empat jalur: unggah screenshot, tempel teks, foto catatan tangan, rekam suara.

**Paling aman: "Coba dengan contoh".** Satu tekan, tanpa perlu file apa pun,
isinya sampel yang sudah diverifikasi. Jalurnya sama dengan unggah asli.

Kalau mau menunjukkan unggah berkas sungguhan, dua gambar siap pakai ada di
folder `contoh/`:

- `contoh-screenshot-marketplace.png` -> jalur **Unggah screenshot**. Ada satu
  baris sengaja diburamkan, jadi penanganan baris tidak terbaca ikut terlihat.
- `contoh-tulisan-tangan.png` -> jalur **Foto catatan tangan**. Mie goreng
  ditulis tanpa harga, jadi pengisian harga dari master produk ikut terlihat.

Salin dulu ke galeri ponsel kalau merekam dari ponsel.

Setelah diproses, muncul **layar konfirmasi**:

- Tiap baris hasil bacaan AI ditampilkan untuk diperiksa
- Angka bisa dikoreksi langsung di situ
- Baris yang tidak terbaca muncul dengan angka 0 dan ditandai, bukan dibuang

Tekan simpan. **Tidak ada yang masuk database sebelum tombol ini ditekan.**

> Kalau mau demo jalur suara: tekan "Rekam suara", sebut
> *"hari ini jual es teh dua puluh gelas, nasi goreng sepuluh porsi"*.
> Butuh Chrome, dan izin mikrofon akan diminta sekali.

## 3. Produk — `/produk`

Daftar 12 menu dengan modal per porsi.

Buka **Es Teh Manis** → terlihat rincian HPP-nya: bahan baku, kemasan, energi,
tenaga kerja, plus persentase susut. Semua bisa diubah, dan margin ikut berubah.

## 4. Margin — `/margin`

Untung per produk **per kanal**.

Tunjuk **Es Teh Manis**: untung di Offline, tapi minus di GoFood dan ShopeeFood
setelah potongan 20 persen. Produk yang sama, margin berbeda — ini yang biasanya
tidak kelihatan di catatan biasa.

Tunjuk juga **Ayam Bakar Madu**: untung terbesar per porsi, tapi volumenya kecil.

## 5. Skor KUR — `/kur`

- **Skor 0–100** dengan enam kriteria berbobot, tiap kriteria menyebut pasalnya
- **Perkiraan plafon** berupa rentang, bukan satu angka
- **Langkah perbaikan** — apa yang perlu dibenahi kalau skornya kurang
- **Kelengkapan dokumen** — NIB sudah ada, NPWP belum

Gulir sampai bawah, ada keterangan bahwa skor ini indikatif dan bukan keputusan
bank. Sebutkan ini, jangan dilewati.

## 6. Laporan — `/laporan`

Dari nav samping (desktop) atau tombol di header Ringkasan (ponsel).

Pilih rentang tanggal → tekan **Cetak**. Dialog cetak bawaan terbuka, pilih
"Simpan sebagai PDF". Isinya tujuh bagian laporan keuangan; nav dan tombol tidak
ikut tercetak.

## 7. Tanya jawab — `/tanya-jawab`

Penjelasan asal setiap angka. Mana yang punya dasar pasal, mana yang kerangka
sendiri. Buka satu-dua butir, cukup.

---

## Jangan sampai terlewat saat merekam

1. **Layar konfirmasi di langkah 2** — bukti AI tidak menulis langsung ke database
2. **Penanda "cuma total harian" di langkah 1** — bukti sistem tidak menebak
3. **Margin beda per kanal di langkah 4** — temuan yang paling kelihatan gunanya
4. **Keterangan indikatif di langkah 5** — jangan sebut skor sebagai persetujuan bank

Kalau parsing Gemini lambat, tunggu saja. Lebih baik terlihat apa adanya daripada
dipotong sampai seolah instan.
