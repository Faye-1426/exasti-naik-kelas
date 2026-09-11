# Product Requirements Document

# NAIK KELAS

### Dashboard Keuangan & Kesiapan Kredit untuk UMKM

**Kompetisi:** EXASTI 2.0 — Web Application Competition, Universitas Negeri Jakarta
**Tema:** The New Era of Industry: Accelerating Innovations Beyond the Code
**Subtema:** SDGs 9 — Industry, Innovation, and Infrastructure / Sustainable Innovation
**Versi Dokumen:** 2.0
**Tanggal:** 3 September 2026
**Periode Pengembangan:** 3 – 13 September 2026

**Perubahan dari v1.0:**
- Batas lingkup dipertegas: aplikasi internal untuk pemilik usaha, tidak menyentuh sisi pelanggan
- Ditambahkan jalur input keempat: rekam suara
- Ditambahkan konsep Tingkat Kelengkapan Data
- Persona Bu Sri direvisi agar mencerminkan kondisi pencatatan yang lebih realistis
- Autentikasi dasar dimasukkan ke lingkup; banner peringatan menggantikan notifikasi push
- Anggaran waktu dan urutan pelepasan fitur dinyatakan eksplisit

---

## Daftar Isi

1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Batas Lingkup Produk](#2-batas-lingkup-produk)
3. [Latar Belakang & Problem Statement](#3-latar-belakang--problem-statement)
4. [Keterkaitan dengan SDGs 9](#4-keterkaitan-dengan-sdgs-9)
5. [Target Pengguna & Kondisi Data](#5-target-pengguna--kondisi-data)
6. [Tujuan Produk & Metrik Keberhasilan](#6-tujuan-produk--metrik-keberhasilan)
7. [Lanskap Kompetitif & Diferensiasi](#7-lanskap-kompetitif--diferensiasi)
8. [Daftar Fitur & Anggaran Waktu](#8-daftar-fitur--anggaran-waktu)
9. [Spesifikasi Fitur Detail](#9-spesifikasi-fitur-detail)
10. [Arsitektur Teknis](#10-arsitektur-teknis)
11. [Skema Basis Data](#11-skema-basis-data)
12. [Spesifikasi Integrasi AI](#12-spesifikasi-integrasi-ai)
13. [Alur Pengguna](#13-alur-pengguna)
14. [Panduan Desain & UI](#14-panduan-desain--ui)
15. [Rencana Data Demo](#15-rencana-data-demo)
16. [Rencana Eksekusi](#16-rencana-eksekusi)
17. [Manajemen Risiko](#17-manajemen-risiko)
18. [Strategi Demo & Presentasi](#18-strategi-demo--presentasi)
19. [Pengembangan Lanjutan](#19-pengembangan-lanjutan)

---

## 1. Ringkasan Eksekutif

**Naik Kelas** adalah dashboard internal berbasis web yang membantu pemilik UMKM memahami kondisi keuangan usahanya dan mempersiapkan diri mengakses pembiayaan formal, tanpa harus mengubah kebiasaan mencatat yang sudah mereka jalani.

### Fokus Produk

> **Mengubah catatan penjualan yang berserakan menjadi bukti kelayakan kredit.**

Setiap fitur dalam dokumen ini harus dapat dijelaskan hubungannya dengan kalimat di atas. Fitur yang tidak dapat dijelaskan hubungannya tidak masuk ke dalam lingkup, sebaik apa pun fitur tersebut.

Perhatikan bahwa "mencatat" bukan tujuan produk. Mencatat adalah jalan menuju tujuan.

### Cara Kerja Singkat

Berbeda dengan aplikasi kasir yang menuntut pemilik usaha menginput setiap transaksi saat terjadi, Naik Kelas menerima data dalam bentuk yang sudah mereka miliki atau paling mudah mereka hasilkan: screenshot laporan dari GoFood/ShopeeFood, salinan chat pesanan WhatsApp, foto buku kas, dan rekaman suara. AI membaca dan menstrukturkan data tersebut, pengguna mengonfirmasi, lalu sistem menghasilkan tiga keluaran:

1. **Margin bersih per produk** setelah memperhitungkan seluruh biaya, termasuk potongan platform digital
2. **Skor Kesiapan KUR** dengan rincian kriteria dan langkah perbaikan konkret
3. **Laporan keuangan siap cetak** dalam format yang dapat diajukan ke lembaga pembiayaan

### Pernyataan Posisi

> Untuk pemilik UMKM yang mencatat penjualan secara manual dan belum pernah mengakses kredit formal, Naik Kelas adalah dashboard keuangan yang mengubah catatan sehari-hari menjadi bukti kelayakan usaha. Tidak seperti aplikasi POS yang menuntut perubahan kebiasaan, Naik Kelas bekerja dari data yang sudah ada.

---

## 2. Batas Lingkup Produk

Bagian ini bersifat mengikat dan ditempatkan di awal dokumen karena menjadi dasar seluruh keputusan fitur.

### 2.1 Ini adalah aplikasi internal

Naik Kelas hanya menghadap **pemilik usaha**. Tidak ada bagian produk yang menghadap pelanggan akhir.

| Termasuk lingkup | Tidak termasuk lingkup |
|---|---|
| Dashboard untuk pemilik usaha | Etalase atau katalog untuk pelanggan |
| Analisis keuangan internal | Halaman pemesanan atau keranjang belanja |
| Laporan untuk diajukan ke bank | Sistem pembayaran pelanggan |
| Master produk sebagai basis perhitungan | Marketplace atau direktori usaha |

**Konsekuensi keputusan ini:** setiap usulan fitur yang melibatkan pelanggan sebagai pengguna sistem otomatis berada di luar lingkup, tanpa perlu diskusi lebih lanjut. Ini menjaga identitas produk agar tidak bergeser menjadi marketplace.

### 2.2 Ini bukan aplikasi kasir

Naik Kelas tidak mencatat transaksi saat terjadi. Tidak ada layar kasir, tidak ada input per transaksi, tidak ada struk pelanggan. Sistem bekerja secara retrospektif atas data satu hari atau satu periode.

Pemisahan ini disengaja: aplikasi kasir sudah banyak dan tingkat pengabaiannya tinggi pada usaha mikro. Produk ini justru mengambil posisi sebaliknya.

### 2.3 Batas kemampuan yang diakui terbuka

Produk ini tidak dapat membantu usaha yang **sama sekali tidak memiliki catatan apa pun**. Tidak ada sistem analisis yang dapat bekerja tanpa data masukan. Segmen tersebut memerlukan pendampingan manusia, bukan perangkat lunak, dan berada di luar jangkauan produk.

Yang dapat dibantu adalah usaha yang sudah mencatat namun catatannya terkunci di kertas atau tersebar di beberapa platform. Ini adalah mayoritas.

---

## 3. Latar Belakang & Problem Statement

### 3.1 Konteks

UMKM merupakan tulang punggung ekonomi Indonesia, menyerap mayoritas tenaga kerja nasional dan menyumbang porsi besar terhadap PDB. Namun sebagian besar pelaku UMKM masih beroperasi tanpa sistem pencatatan keuangan yang memadai.

> **Catatan untuk tim peneliti:** Bagian ini harus dilengkapi dengan data dari BPS, Kementerian Koperasi dan UKM, serta laporan OJK mengenai inklusi keuangan. Cantumkan sumber dan tahun secara eksplisit. Rincian data yang dibutuhkan ada di Lampiran B.

### 3.2 Tiga Masalah Inti

**Masalah 1 — Aplikasi digital yang ada menuntut perubahan kebiasaan**

Aplikasi kasir mengharuskan pemilik usaha menginput setiap transaksi saat terjadi. Di warung yang ramai, ini tidak realistis. Akibatnya aplikasi ditinggalkan setelah beberapa hari dan pemilik kembali ke buku tulis. Digitalisasi gagal bukan karena teknologinya kurang canggih, tetapi karena beban adopsinya terlalu tinggi.

**Masalah 2 — Tidak ada visibilitas terhadap margin sebenarnya**

Pemilik UMKM umumnya menetapkan harga berdasarkan intuisi dan perbandingan dengan pesaing. Mereka mengetahui omzet, tetapi tidak mengetahui laba per produk. Komponen biaya seperti gas, listrik, kemasan, susut bahan, dan terutama **potongan platform digital sekitar 20%** jarang diperhitungkan. Akibatnya, produk yang paling laris bisa jadi justru produk yang merugi.

**Masalah 3 — Ketiadaan catatan menutup akses ke pembiayaan**

Lembaga pembiayaan mensyaratkan bukti arus kas yang konsisten. Buku tulis tidak memenuhi syarat tersebut. Pelaku usaha yang sebenarnya sehat secara finansial tetap tertolak karena tidak dapat membuktikannya. Ini menciptakan lingkaran tertutup: tidak ada catatan, tidak ada kredit, tidak ada modal untuk berkembang.

### 3.3 Peluang

Ketiga masalah tersebut saling terhubung dan dapat diselesaikan oleh satu sistem. Jika data yang sudah ada dapat distrukturkan secara otomatis, maka analisis margin dan pelaporan keuangan menjadi produk sampingan yang tidak memerlukan usaha tambahan dari pengguna. Kemampuan model AI multimodal membaca dokumen tidak terstruktur membuat pendekatan ini baru layak secara teknis dan ekonomis.

---

## 4. Keterkaitan dengan SDGs 9

| Target | Bunyi Target | Kontribusi Naik Kelas |
|---|---|---|
| **9.3** | Meningkatkan akses industri skala kecil terhadap layanan keuangan, termasuk kredit terjangkau, dan integrasinya ke rantai nilai dan pasar | Skor Kesiapan KUR dan Laporan Keuangan Siap Ajukan secara langsung menutup hambatan dokumentasi yang menghalangi UMKM mengakses kredit formal |
| **9.b** | Mendukung pengembangan teknologi domestik, riset dan inovasi di negara berkembang | Memanfaatkan AI multimodal untuk masalah yang spesifik pada konteks Indonesia: pencatatan manual dan ekonomi platform |
| **9.c** | Meningkatkan akses terhadap teknologi informasi dan komunikasi | Berbasis web tanpa instalasi, dapat diakses dari ponsel kelas menengah, tidak memerlukan perangkat kasir khusus |

Bersinggungan pula dengan **SDG 8.3** mengenai formalisasi dan pertumbuhan usaha mikro, kecil, dan menengah.

---

## 5. Target Pengguna & Kondisi Data

### 5.1 Tiga Kondisi Pencatatan

Yang menentukan sejauh mana produk dapat membantu bukan ada atau tidaknya sistem kasir, melainkan **seberapa rinci pengguna mencatat**.

| Kondisi | Yang tercatat | Analisis margin per produk | Skor KUR | Laporan keuangan |
|---|---|---|---|---|
| **A. Rinci per item** | "15 nasi goreng, 23 es teh, 8 ayam geprek" | Bisa | Bisa | Bisa |
| **B. Hanya total harian** | "Hari ini Rp800.000" | Tidak bisa | **Bisa** | **Bisa** |
| **C. Tidak mencatat** | Tidak ada | Tidak bisa | Tidak bisa | Tidak bisa |

**Implikasi penting:** Kondisi B adalah kondisi mayoritas pengguna offline, dan pada kondisi ini **fitur andalan produk tetap berfungsi penuh**. Bank tidak menanyakan produk mana yang paling laku; yang dinilai adalah konsistensi arus kas, kestabilan omzet, dan rasio pemasukan terhadap pengeluaran. Semua itu cukup dihitung dari angka total harian.

Yang hilang pada kondisi B hanyalah analisis margin untuk kanal tersebut. Produk menanggapi hal ini melalui dua mekanisme: **jalur input suara** (F1-D) sebagai jalan termurah menuju pencatatan rinci, dan **Tingkat Kelengkapan Data** (F10) yang menampilkan keterbatasan secara terbuka alih-alih menyembunyikannya.

Kondisi C berada di luar jangkauan produk sebagaimana dinyatakan pada bagian 2.3.

### 5.2 Persona Utama — Bu Sri, Pemilik Warung Makan

- **Usia:** 42 tahun
- **Usaha:** Warung makan di area perumahan, berjalan 3 tahun
- **Kanal penjualan:** Offline tunai (60%), GoFood (25%), ShopeeFood (10%), pesanan WhatsApp (5%)
- **Perangkat:** Ponsel Android kelas menengah, tidak memiliki komputer
- **Literasi digital:** Terbiasa WhatsApp dan aplikasi mitra GoFood; belum pernah menggunakan software akuntansi
- **Kondisi pencatatan:** **Kondisi B.** Penjualan offline dicatat sebagai total harian di buku tulis, tanpa rincian item, karena pelanggan memesan secara lisan dan tidak ada sistem kasir. Penjualan GoFood dan ShopeeFood terekam rinci di aplikasi masing-masing.
- **Kebutuhan:** Mengetahui apakah usahanya benar-benar untung, dan ingin mengajukan pinjaman untuk menambah gerobak
- **Hambatan:** Pernah mencoba aplikasi kasir, berhenti setelah lima hari karena merepotkan saat ramai

**Perjalanan Bu Sri di dalam produk:**

Pada minggu pertama, Bu Sri mengunggah screenshot GoFood dan mencatat total harian offline. Dashboard menampilkan omzet gabungan seluruh kanal, sesuatu yang tidak pernah ia ketahui sebelumnya karena GoBiz hanya menampilkan GoFood dan buku tulis hanya mencatat offline.

Pada minggu kedua, panel Insight menampilkan bahwa Es Teh Manis merugi di kanal GoFood. Ini pertama kalinya ia mengetahui bahwa produk terlarisnya justru menggerus untung. Perhatikan bahwa temuan ini muncul dari kanal digital, yang datanya lengkap, sehingga tetap valid meskipun rincian offline tidak tersedia.

Pada bulan pertama, sistem menampilkan bahwa 60% penjualannya belum terinci dan menawarkan input suara. Bu Sri mulai menyebutkan rincian penjualan harian secara lisan selama tiga menit setiap malam. Kanal offline naik ke Kondisi A.

Pada bulan keenam, Skor Kesiapan KUR-nya mencapai 78. Ia mengunduh laporan keuangan enam bulan dan membawanya ke bank sebagai lampiran pengajuan.

### 5.3 Persona Sekunder — Dimas, Pemilik Kedai Kopi

- **Usia:** 27 tahun
- **Usaha:** Kedai kopi kecil, berjalan 1 tahun
- **Kondisi pencatatan:** Kondisi A, menggunakan spreadsheet
- **Pola pemakaian:** Mingguan, bukan harian
- **Kebutuhan:** Analisis margin per produk untuk menentukan menu mana yang dipertahankan
- **Hambatan:** Spreadsheet-nya tidak pernah memperhitungkan potongan platform

Dimas tidak membutuhkan produk ini untuk mencatat, melainkan untuk menghitung. Temuan yang ia cari: perbedaan margin produk yang sama antara kanal kedai dan kanal digital.

### 5.4 Non-Target

Usaha menengah dengan tim keuangan sendiri, retail multi-cabang, dan usaha yang membutuhkan software akuntansi bersertifikat.

---

## 6. Tujuan Produk & Metrik Keberhasilan

### 6.1 Tujuan Produk

| No | Tujuan | Ukuran |
|---|---|---|
| G1 | Menurunkan beban pencatatan menjadi di bawah 5 menit per hari | Waktu dari unggah sampai data tersimpan |
| G2 | Memberikan visibilitas margin yang belum pernah dimiliki pengguna | Jumlah produk dengan margin terhitung penuh |
| G3 | Meningkatkan kesiapan pengguna mengajukan pembiayaan formal | Kenaikan Skor Kesiapan KUR dari waktu ke waktu |
| G4 | Menghasilkan dokumen keuangan yang dapat diajukan ke bank | Laporan PDF tergenerate dan lengkap |
| G5 | Membuat pengguna Kondisi B menyadari data yang belum lengkap | Konversi dari total harian ke pencatatan rinci |

### 6.2 Metrik Keberhasilan Kompetisi

- Alur inti berjalan tanpa error dalam demo langsung pada keempat jalur input
- Akurasi parsing screenshot marketplace mencapai minimal 90% pada 10 sampel uji
- Aplikasi menerima berkas yang diunggah juri secara spontan dan tetap memberikan hasil yang masuk akal
- Setiap kriteria Skor Kesiapan KUR dapat dijelaskan dasar rujukannya

**Definisi akurasi parsing.** Satu titik data adalah satu nilai yang dapat dibaca mata manusia pada
screenshot: nama produk, jumlah, harga satuan, total per baris, tiap angka ringkasan, tiap label dan
nominal biaya, platform, tingkat rincian, serta tanggal awal dan akhir periode.

```
Akurasi = titik data yang terbaca benar ÷ titik data yang terbaca mata manusia × 100
```

Bagian yang buram, tertutup, atau terpotong **tidak masuk penyebut** dan tidak dihitung sebagai
kesalahan model. Bagian itu dilaporkan terpisah sebagai jumlah titik data yang tidak terlihat.

**Nilai dikarang dilaporkan sebagai hitungan tersendiri dengan ambang nol.** Satu nilai dikarang
membatalkan kelulusan berapa pun akurasinya. Yang dihitung sebagai dikarang: angka bukan nol pada
bagian yang tidak terlihat di layar, dan angka hasil penjumlahan atau pengurangan yang tidak tertulis
di layar. Angka yang tidak terbaca lalu ditandai kosong bukan kegagalan; angka karangan adalah
kegagalan fatal karena melewati layar konfirmasi tanpa dapat ditelusuri pengguna ke sumbernya.

Kedua besaran ini tidak boleh dilebur menjadi satu persentase. Berkas uji dan skrip penilaiannya
berada di `test-sample/`, laporan hasilnya di `test-sample/HASIL-UJI-PARSING.md`.

---

## 7. Lanskap Kompetitif & Diferensiasi

### 7.1 Pemain yang Ada

| Kategori | Contoh | Fokus | Celah |
|---|---|---|---|
| Aplikasi POS/kasir | Moka, Majoo, Olsera, Kasir Pintar | Mencatat transaksi saat terjadi | Menuntut input real-time; tingkat pengabaian tinggi pada usaha mikro |
| Aplikasi catatan keuangan | BukuWarung, BukuKas | Pencatatan utang-piutang dan kas | Input tetap manual; tidak menghitung HPP dan margin per produk |
| Software akuntansi | Jurnal, Accurate | Pembukuan lengkap | Terlalu kompleks dan mahal untuk usaha mikro |
| Dashboard platform | GoBiz, Seller Center | Laporan per kanal | Terisolasi per platform; tidak ada pandangan gabungan |

### 7.2 Diferensiasi Naik Kelas

**D1 — Input pasif, bukan input aktif.**
Sistem membaca artefak yang sudah dihasilkan pengguna dalam kegiatan normalnya. Frekuensi interaksi turun dari puluhan kali sehari menjadi satu kali di akhir hari.

> **Klarifikasi istilah:** "pasif" tidak berarti tanpa input sama sekali. Artinya aplikasi menyesuaikan diri pada kebiasaan yang sudah ada, bukan sebaliknya. Dalam presentasi, gunakan rumusan "input satu kali di akhir hari dari data yang sudah ada", bukan "tanpa input".

**D2 — Pandangan gabungan lintas kanal.**
Menyatukan penjualan offline, GoFood, ShopeeFood, dan WhatsApp dalam satu buku besar. Tidak ada dashboard platform yang melakukan ini karena masing-masing hanya melihat kanalnya sendiri.

**D3 — HPP yang memperhitungkan potongan platform.**
Komisi platform sekitar 20% adalah komponen biaya terbesar yang paling sering diabaikan. Memasukkannya ke perhitungan mengubah gambaran profitabilitas secara fundamental.

**D4 — Skor Kesiapan Kredit.**
Menerjemahkan data keuangan menjadi penilaian kelayakan pembiayaan dengan langkah perbaikan konkret. Ini menggeser produk dari alat pencatat menjadi jembatan menuju akses modal, yang merupakan inti target SDG 9.3.

---

## 8. Daftar Fitur & Anggaran Waktu

### 8.1 Daftar Fitur

| ID | Fitur | Prioritas | Estimasi |
|---|---|---|---|
| F1-A | Input screenshot marketplace | P0 | 6 jam |
| F1-B | Input salin-tempel teks | P0 | 2 jam |
| F1-C | Input foto catatan tulis tangan | P1 | 3 jam |
| F1-D | **Input rekam suara** | P0 | 5 jam |
| F2 | Layar konfirmasi dan koreksi | P0 | 7 jam |
| F3 | Master produk dan kalkulator HPP | P0 | 7 jam |
| F4 | Dashboard margin per produk | P0 | 6 jam |
| F5 | Skor Kesiapan KUR | P0 | 8 jam |
| F6 | Export laporan keuangan PDF | P1 | 5 jam |
| F7 | Insight Mingguan berbasis AI | P1 | 4 jam |
| F8 | Dashboard ringkasan | P1 | 5 jam |
| F9 | **Autentikasi dasar** | P1 | 4 jam |
| F10 | **Tingkat Kelengkapan Data** | P0 | 2 jam |
| F11 | **Banner peringatan dalam aplikasi** | P2 | 1 jam |

### 8.2 Anggaran Waktu

| Pos | Jam |
|---|---|
| Total seluruh fitur di atas | 65 |
| Kapasitas programmer (3–4 jam hari kerja, 8 jam akhir pekan) | 55 |
| **Selisih** | **−10** |

Selisih ini disengaja dan dikelola melalui urutan pelepasan berikut. Bila pada 10 September fitur P0 belum seluruhnya berjalan, lepaskan fitur secara berurutan dari atas:

1. **F11** Banner peringatan — 1 jam
2. **F1-C** Foto tulisan tangan — 3 jam. Jalur ini paling rapuh secara akurasi dan fungsinya sudah diwakili F1-D
3. **F6** Export PDF — 5 jam. Kehilangan terbesar secara narasi, karena ini artefak fisik yang membuat dampak produk terasa nyata. Lepaskan hanya bila terpaksa
4. **F7** Insight Mingguan — 4 jam

Fitur P0 tidak boleh dilepaskan dalam keadaan apa pun. Bila P0 terancam tidak selesai, hentikan seluruh pekerjaan P1 dan alihkan tenaga.

### 8.3 Di Luar Lingkup

Setiap keputusan disertai alasannya agar tidak dibuka kembali di tengah pengerjaan.

| Fitur | Alasan Dikeluarkan |
|---|---|
| Multi-user dan sistem role | Persona produk adalah pemilik usaha yang bekerja sendiri. Tidak ada pengguna kedua dalam skenario yang dipresentasikan. Biaya sekitar 8 jam untuk sesuatu yang tidak muncul di demo. |
| Manajemen stok dan pemotongan otomatis | Bernilai, namun memperberat beban setup awal yang sudah menjadi titik lemah produk. Pemotongan stok bersumber dari data penjualan, bukan dari katalog. Ditempatkan pada peta jalan, bagian 19. |
| Katalog atau etalase pelanggan | Melanggar batas lingkup pada bagian 2.1. Menghadap pelanggan, bukan pemilik. Tidak menopang manajemen stok secara teknis karena yang dibutuhkan hanyalah master produk yang sudah ada di F3. Kehadirannya membuat fokus presentasi bergeser ke arah marketplace. |
| Notifikasi push | Memerlukan service worker dan izin browser, sekitar 5 jam, dan tidak akan pernah muncul selama demo 7 menit. Digantikan F11 dengan biaya 1 jam dan efek yang sama. |
| Chatbot tanya-jawab bebas | Bukan sekadar soal waktu. Chatbot bebas di atas data keuangan dapat mengarang angka di hadapan juri, dan satu jawaban salah meruntuhkan kredibilitas seluruh dashboard. Manfaatnya sudah diwakili F7 dengan cakupan terkendali dan keluaran yang dapat diuji sebelum demo. |
| Multi-cabang | Di luar segmen target. |
| Integrasi API marketplace | Tidak tersedia secara publik untuk merchant kecil. Lihat bagian 18.3 untuk cara menjawab pertanyaan ini. |
| Fitur kasir atau transaksi langsung | Bertentangan dengan batas lingkup bagian 2.2. |
| Ekstrapolasi komposisi penjualan offline dari data digital | **Ditolak atas dasar metodologis, bukan waktu.** Pola pesanan pelanggan offline dan pelanggan pengantaran berbeda secara sistematis. Angka hasil ekstrapolasi tidak dapat dipertanggungjawabkan bila ditanya dasarnya, dan risiko itu lebih besar daripada manfaatnya. Sistem menampilkan "data belum lengkap" alih-alih menebak. |

### 8.4 Batasan yang Diakui

Produk ini adalah prototipe fungsional yang dikembangkan dalam 11 hari oleh tim tiga orang.

- Belum melalui uji pengguna dengan pelaku UMKM sesungguhnya
- Skor Kesiapan KUR bersifat indikatif, bukan penilaian kredit resmi lembaga keuangan mana pun
- Akurasi pembacaan tulisan tangan bervariasi tergantung kualitas foto dan gaya tulisan
- Setup awal berupa pendefinisian HPP produk memerlukan sekitar satu jam. Ini adalah titik gesekan adopsi yang paling nyata dan disampaikan secara terbuka; lihat bagian 18.3.

---

## 9. Spesifikasi Fitur Detail

### F1 — Input Multi-Kanal Berbasis AI

Pengguna memasukkan data penjualan dan pengeluaran melalui empat jalur. Seluruh jalur bermuara pada layar konfirmasi yang sama (F2), sehingga logika penyimpanan tidak terduplikasi.

| Jalur | Bentuk Masukan | Karakter Data | Keandalan | Untuk Kondisi |
|---|---|---|---|---|
| **A. Screenshot marketplace** | Gambar laporan GoFood/ShopeeFood | Teks tercetak digital | Tinggi | Semua |
| **B. Salin-tempel teks** | Teks pesanan WhatsApp | Teks murni | Tinggi | Semua |
| **C. Foto catatan tangan** | Gambar buku kas atau nota | Tulisan tangan | Sedang | A |
| **D. Rekam suara** | Ucapan lisan | Teks hasil transkripsi | Sedang-tinggi | **B → A** |

> **Keputusan desain:** Jalur A menjadi jalur utama dalam demo dan dokumentasi karena teks tercetak dibaca jauh lebih akurat oleh model vision dibanding tulisan tangan. Keandalan sistem tidak boleh bergantung pada bagian yang paling rapuh.

**Persyaratan Fungsional Umum**

- FR1.1 — Menerima unggahan gambar JPG, PNG, WEBP hingga 10 MB
- FR1.2 — Menerima masukan teks bebas hingga 5.000 karakter
- FR1.3 — Mengirim masukan ke model AI dan menerima balikan JSON sesuai skema
- FR1.4 — Menampilkan indikator proses selama pemanggilan AI
- FR1.5 — Menyimpan berkas atau teks asli sebagai jejak audit
- FR1.6 — Bila pemanggilan gagal atau balikan tidak sesuai skema, menampilkan pesan yang dapat ditindaklanjuti dan menawarkan input manual

---

### F1-D — Input Rekam Suara

**Latar belakang**

Pengguna Kondisi B menerima pesanan secara lisan tanpa sistem kasir. Bagi mereka, mengetik rincian penjualan di ponsel setelah tutup adalah beban yang hampir sama besarnya dengan aplikasi kasir. Berbicara jauh lebih cepat daripada mengetik, terutama untuk pengguna berusia 40-an yang tidak terbiasa dengan papan ketik ponsel, dan dapat dilakukan sambil membereskan tempat usaha.

**Cara kerja**

Pengguna menekan tombol mikrofon dan menyebutkan penjualan hari itu secara alami:

> "Hari ini nasi goreng lima belas, es teh dua puluh tiga, ayam geprek delapan, sama tujuh es jeruk"

Web Speech API melakukan transkripsi di sisi peramban. Teks hasil transkripsi dikirim ke Gemini bersama daftar produk terdaftar sebagai konteks. Hasil parsing masuk ke layar konfirmasi yang sama dengan jalur lain.

**Persyaratan Fungsional**

- FR1.D.1 — Tombol rekam dengan indikator visual saat perekaman berlangsung
- FR1.D.2 — Transkripsi menggunakan Web Speech API dengan `lang` disetel ke `id-ID`
- FR1.D.3 — Teks hasil transkripsi ditampilkan dan **dapat disunting sebelum dikirim ke AI**
- FR1.D.4 — Daftar nama produk terdaftar disertakan sebagai konteks dalam prompt agar model dapat mencocokkan ke nama terdekat
- FR1.D.5 — Angka dalam bentuk kata dinormalkan menjadi angka
- FR1.D.6 — Produk yang tidak dapat dicocokkan ke master produk ditandai, tidak dibuang
- FR1.D.7 — Bila peramban tidak mendukung Web Speech API, tombol disembunyikan dan pengguna diarahkan ke jalur B

**Risiko dan penanganannya**

Web Speech API kerap keliru pada nama makanan lokal; "ayam geprek" dapat tertranskripsi menjadi "ayam ge prek". Penanganannya berada di sisi prompt, bukan di sisi transkripsi: model diberi daftar nama produk terdaftar dan diminta mencocokkan ke nama terdekat, dengan `confidence` rendah bila kecocokannya meragukan. Pendekatan ini membuat sistem menangani variasi ucapan tanpa memerlukan model bahasa khusus.

**Kriteria Penerimaan**

- Kalimat contoh di atas menghasilkan empat baris item dengan jumlah yang benar
- Nama produk yang diucapkan dengan variasi ringan tetap tercocokkan ke master produk
- Teks transkripsi dapat disunting sebelum diproses

---

### F2 — Layar Konfirmasi dan Koreksi

Sebelum data masuk ke buku besar, pengguna meninjau dan mengoreksi hasil pembacaan AI. Ini bukan penanganan kegagalan melainkan keputusan desain: sistem yang menangani uang tidak boleh menulis data tanpa persetujuan manusia.

**Persyaratan Fungsional**

- FR2.1 — Menampilkan hasil parsing sebagai tabel yang dapat disunting inline
- FR2.2 — Baris dengan `confidence` rendah ditandai secara visual dan diurutkan di atas
- FR2.3 — Pengguna dapat menyunting seluruh kolom, menghapus baris, dan menambah baris manual
- FR2.4 — Sistem mencocokkan nama produk hasil parsing dengan master produk dan menandai yang belum dikenal
- FR2.5 — Produk yang belum dikenal dapat langsung didaftarkan dari layar ini
- FR2.6 — Total nilai transaksi ditampilkan dan diperbarui langsung saat disunting
- FR2.7 — Data tersimpan hanya setelah pengguna menekan tombol konfirmasi
- FR2.8 — Layar ini melayani keempat jalur input dengan komponen yang sama

**Kriteria Penerimaan**

- Tidak ada jalur mana pun yang memungkinkan data AI masuk ke buku besar tanpa konfirmasi
- Baris berkeyakinan rendah terlihat berbeda secara jelas dari baris normal

---

### F3 — Master Produk dan Kalkulator HPP

**Komponen Biaya**

| Komponen | Contoh | Sifat |
|---|---|---|
| Bahan baku langsung | Teh, gula, air, beras, ayam | Per unit produk |
| Kemasan | Cup, sedotan, kantong, kotak | Per unit produk |
| Energi operasional | Gas, listrik, air | Dialokasikan per unit |
| Susut dan sisa | Bahan terbuang, produk tidak terjual | Persentase |
| Tenaga kerja | Upah, alokasi waktu pemilik | Dialokasikan per unit |
| **Potongan platform** | **Komisi GoFood/ShopeeFood** | **Persentase harga jual** |

**Persyaratan Fungsional**

- FR3.1 — CRUD produk dengan atribut nama, kategori, harga jual, komponen biaya
- FR3.2 — Menghitung HPP total dari seluruh komponen biaya
- FR3.3 — Menghitung margin per kanal secara terpisah, karena potongan platform hanya berlaku pada kanal digital
- FR3.4 — Persentase potongan platform dapat dikonfigurasi per kanal
- FR3.5 — Produk dengan margin negatif ditandai secara visual

**Rumus Perhitungan**

```
HPP Dasar        = bahan baku + kemasan + energi + tenaga kerja
HPP + Susut      = HPP Dasar × (1 + persentase susut)
Potongan Kanal   = harga jual × persentase komisi kanal
Margin Nominal   = harga jual − HPP + Susut − Potongan Kanal
Margin Persen    = (Margin Nominal ÷ harga jual) × 100
```

**Kriteria Penerimaan**

- Satu produk yang sama menampilkan margin berbeda untuk kanal offline dan kanal digital
- Perubahan komponen biaya langsung tercermin pada margin tanpa muat ulang

---

### F4 — Dashboard Margin Per Produk

**Persyaratan Fungsional**

- FR4.1 — Tabel produk memuat kolom nama, jumlah terjual, omzet, HPP total, potongan platform, margin nominal, margin persen
- FR4.2 — Dapat diurutkan berdasarkan seluruh kolom
- FR4.3 — Dapat difilter berdasarkan kanal dan rentang tanggal
- FR4.4 — Produk margin negatif ditampilkan dengan penanda visual yang tegas
- FR4.5 — Bagian teratas menampilkan ringkasan: produk paling menguntungkan, paling merugikan, kontributor omzet terbesar
- FR4.6 — Setiap produk memiliki halaman rincian yang memecah struktur biayanya
- FR4.7 — **Kanal dengan data tidak lengkap ditampilkan sesuai ketentuan F10**, tidak disembunyikan dan tidak diestimasi

**Contoh Keluaran yang Ditargetkan**

> **Es Teh Manis** — 340 porsi terjual di GoFood, omzet Rp1.700.000
> Margin bersih: **−Rp62.000**
> Penyebab: setelah komisi platform 20% sebesar Rp1.000 per porsi dan HPP Rp5.180, harga jual Rp5.000 berada di bawah titik impas.
> Saran: naikkan harga kanal digital menjadi Rp6.500 untuk mencapai margin 12%.

---

### F5 — Skor Kesiapan KUR

Fitur andalan produk. Menerjemahkan kondisi keuangan dan kualitas pencatatan menjadi skor 0–100, disertai langkah perbaikan yang dapat langsung dijalankan.

**Kriteria Penilaian**

| Kriteria | Bobot | Dasar Penilaian | Butuh data rinci? |
|---|---|---|---|
| Konsistensi pencatatan | 25 | Jumlah hari tercatat dan keteraturannya dalam 6 bulan terakhir | Tidak |
| Kestabilan omzet | 20 | Koefisien variasi omzet bulanan | Tidak |
| Profitabilitas | 20 | Margin bersih rata-rata dan tren pertumbuhan | Sebagian |
| Lama usaha berjalan | 15 | Durasi operasional usaha | Tidak |
| Kesehatan arus kas | 10 | Rasio pemasukan terhadap pengeluaran | Tidak |
| Kelengkapan dokumen | 10 | Checklist NIB, NPWP, dokumen identitas usaha | Tidak |

> **Catatan penting:** kolom terakhir menunjukkan bahwa lima dari enam kriteria dapat dihitung penuh pada Kondisi B. Ini yang membuat fitur andalan produk tetap berfungsi bagi mayoritas pengguna offline.

> **Catatan untuk tim peneliti:** Bobot di atas adalah kerangka awal. Bobot final harus disusun mengacu pada kriteria penyaluran KUR yang dipublikasikan bank penyalur dan regulasi KUR yang berlaku. Setiap kriteria wajib memiliki rujukan yang dapat disebutkan saat presentasi. Ini yang membedakan skor yang berdasar dari skor yang dikarang.

**Persyaratan Fungsional**

- FR5.1 — Menampilkan skor total 0–100 dengan indikator visual
- FR5.2 — Menampilkan rincian per kriteria beserta skornya
- FR5.3 — Setiap kriteria yang belum memenuhi standar disertai langkah perbaikan spesifik dan terukur
- FR5.4 — Menampilkan estimasi plafon KUR yang realistis berdasarkan omzet tercatat
- FR5.5 — Menampilkan checklist dokumen yang dapat ditandai pengguna
- FR5.6 — Skor diperbarui otomatis setiap kali data baru masuk
- FR5.7 — Menyertakan pernyataan bahwa skor bersifat indikatif dan bukan keputusan kredit resmi

**Contoh Keluaran Langkah Perbaikan**

> **Konsistensi pencatatan: 8/25**
> Catatan usaha Anda saat ini mencakup 12 hari. Bank umumnya mensyaratkan riwayat usaha minimal 6 bulan.
> Langkah: lanjutkan pencatatan hingga mencapai 180 hari. Perkiraan pencapaian skor penuh: Maret 2027.

---

### F6 — Export Laporan Keuangan PDF

**Isi Dokumen**

1. Halaman identitas usaha
2. Laporan laba rugi sederhana untuk periode terpilih
3. Ringkasan arus kas bulanan
4. Rekapitulasi penjualan per produk
5. Rekapitulasi penjualan per kanal
6. Grafik tren omzet
7. Ringkasan Skor Kesiapan KUR

**Persyaratan Fungsional**

- FR6.1 — Pengguna memilih rentang periode laporan
- FR6.2 — Dokumen tergenerate dalam format PDF dan dapat diunduh
- FR6.3 — Dokumen memuat identitas usaha, periode, dan tanggal pembuatan
- FR6.4 — Tata letak rapi dan layak diserahkan kepada pihak ketiga
- FR6.5 — Memuat keterangan bahwa laporan dihasilkan dari pencatatan mandiri pemilik usaha
- FR6.6 — Bila terdapat kanal dengan data tidak lengkap, hal tersebut dinyatakan pada dokumen, bukan disembunyikan

---

### F7 — Insight Mingguan Berbasis AI

Analisis naratif yang dihasilkan dari data usaha pengguna sendiri. Bukan chatbot tanya-jawab bebas, melainkan panel dengan cakupan yang ditentukan.

**Persyaratan Fungsional**

- FR7.1 — Sistem menyusun ringkasan agregat periode berjalan dan mengirimkannya ke model AI
- FR7.2 — Model menghasilkan 3–5 butir insight yang seluruhnya merujuk angka riil dari data pengguna
- FR7.3 — Setiap insight memuat temuan, penyebab, dan saran tindakan
- FR7.4 — Insight yang telah dihasilkan disimpan agar tidak dipanggil ulang setiap halaman dibuka
- FR7.5 — Dapat dimuat ulang secara manual atas permintaan pengguna
- FR7.6 — Bila terdapat kanal dengan data tidak lengkap, model diinstruksikan menyebutkan keterbatasan tersebut

**Batasan Konten**

Model hanya menggunakan angka yang tersedia dalam masukan, tidak menyebut angka yang tidak dapat diverifikasi, tidak membandingkan dengan usaha lain atau rata-rata industri, dan menggunakan bahasa sehari-hari tanpa istilah akuntansi teknis.

---

### F8 — Dashboard Ringkasan

**Komponen**

- Kartu metrik: omzet periode, laba bersih, jumlah transaksi, rata-rata nilai transaksi
- Grafik tren omzet harian
- Komposisi penjualan per kanal, dengan penanda kelengkapan data per kanal
- Ringkasan Skor Kesiapan KUR dengan tautan ke halaman rinci
- Daftar tiga produk margin tertinggi dan tiga terendah
- Panel Insight Mingguan
- Banner peringatan bila ada (F11)

---

### F9 — Autentikasi Dasar

**Ruang lingkup terbatas.** Satu akun sama dengan satu usaha. Tidak ada role, tidak ada undangan pengguna, tidak ada manajemen tim.

**Persyaratan Fungsional**

- FR9.1 — Pendaftaran dan masuk menggunakan surel dan kata sandi melalui Supabase Auth
- FR9.2 — Seluruh data terikat pada `business_id` yang dimiliki akun tersebut
- FR9.3 — Row Level Security aktif pada seluruh tabel
- FR9.4 — Tersedia akun demo dengan data yang sudah terisi untuk keperluan presentasi
- FR9.5 — Halaman keluar dan pemulihan kata sandi dasar

**Yang tidak termasuk:** login pihak ketiga, verifikasi surel, otentikasi dua faktor, role dan izin.

---

### F10 — Tingkat Kelengkapan Data

**Latar belakang**

Pengguna Kondisi B memiliki data total tanpa rincian item pada sebagian kanal. Produk menanggapi hal ini dengan menampilkan keterbatasan secara terbuka, bukan menyembunyikannya dan bukan pula menebak angka yang tidak diketahui.

Pendekatan ini mengubah keterbatasan menjadi ajakan bertindak: pengguna melihat sendiri apa yang ia lewatkan, dan sistem menawarkan jalan termurah untuk melengkapinya.

**Tiga Tingkat**

| Tingkat | Kondisi | Yang ditampilkan |
|---|---|---|
| **Lengkap** | Data rinci per item tersedia | Seluruh analisis, termasuk margin per produk |
| **Sebagian** | Hanya total periode, tanpa rincian item | Omzet dan arus kas ditampilkan; margin per produk ditandai belum tersedia |
| **Kosong** | Tidak ada data pada periode tersebut | Ajakan mengisi data |

**Persyaratan Fungsional**

- FR10.1 — Setiap kanal memiliki tingkat kelengkapan yang dihitung dari rasio transaksi berrincian terhadap total transaksi
- FR10.2 — Tingkat kelengkapan ditampilkan sebagai penanda pada dashboard dan halaman margin
- FR10.3 — Kanal bertingkat Sebagian menampilkan ajakan mencoba input suara, dengan tautan langsung ke F1-D
- FR10.4 — Perhitungan agregat menyatakan cakupan datanya secara eksplisit, misalnya "analisis margin mencakup 40% dari total omzet"
- FR10.5 — **Sistem tidak pernah mengestimasi rincian yang tidak tersedia.** Lihat bagian 8.3 untuk dasar penolakan ekstrapolasi
- FR10.6 — Skor Kesiapan KUR dan laporan arus kas tetap dihitung penuh pada tingkat Sebagian, sesuai tabel kriteria pada F5

**Kriteria Penerimaan**

- Data demo memuat minimal satu kanal bertingkat Sebagian agar konsep ini terlihat saat presentasi
- Halaman margin menyatakan cakupan datanya, tidak menampilkan angka seolah-olah mencakup keseluruhan usaha
- Tidak ada angka hasil estimasi di mana pun dalam sistem

---

### F11 — Banner Peringatan Dalam Aplikasi

Pengganti notifikasi push dengan biaya jauh lebih rendah dan, tidak seperti push, benar-benar terlihat saat demo.

**Persyaratan Fungsional**

- FR11.1 — Banner muncul di bagian atas dashboard bila ada kondisi yang perlu perhatian
- FR11.2 — Kondisi yang memicu banner: tidak ada pencatatan lebih dari 3 hari, terdapat produk margin negatif, terdapat kanal bertingkat Sebagian, skor KUR turun dibanding periode sebelumnya
- FR11.3 — Setiap banner memuat tautan ke halaman terkait
- FR11.4 — Banner dapat ditutup dan tidak muncul lagi untuk kondisi yang sama pada hari tersebut

---

## 10. Arsitektur Teknis

### 10.1 Tumpukan Teknologi

| Lapisan | Teknologi | Alasan Pemilihan |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server component mengurangi kebutuhan API layer terpisah |
| Bahasa | TypeScript | Menangkap kesalahan lebih awal, penting saat waktu terbatas |
| Styling | Tailwind CSS | Kecepatan pengembangan |
| Komponen UI | shadcn/ui | Komponen berkualitas tanpa membuat dari nol |
| Basis Data | Supabase (PostgreSQL) | Basis data, autentikasi, penyimpanan berkas dalam satu layanan |
| Autentikasi | Supabase Auth | Sudah termasuk; biaya integrasi rendah |
| Penyimpanan Berkas | Supabase Storage | Terintegrasi dengan basis data |
| Model AI | Google Gemini 2.5 Flash | Kemampuan vision, structured output, hemat kuota |
| Transkripsi suara | Web Speech API | Bawaan peramban, tanpa biaya dan tanpa layanan tambahan |
| Grafik | Recharts | Ringan dan mudah diintegrasikan |
| Generator PDF | React PDF atau Puppeteer | Sesuai kemampuan programmer |
| Deployment | Vercel | Integrasi langsung dengan Next.js |

### 10.2 Alur Data

```
Pengguna
   │
   ├─ A. Unggah screenshot marketplace
   ├─ B. Tempel teks pesanan
   ├─ C. Foto catatan tulis tangan
   └─ D. Rekam suara ──► Web Speech API ──► teks (dapat disunting)
   │
   ▼
Server Action (Next.js)
   │
   ├─ Simpan berkas atau teks asli ke Storage
   ├─ Panggil Gemini API dengan skema JSON
   │  └─ untuk jalur D: sertakan daftar produk terdaftar sebagai konteks
   │
   ▼
Hasil parsing terstruktur (belum tersimpan)
   │
   ▼
Layar Konfirmasi ── pengguna menyunting ──┐
   │                                       │
   ▼                                       │
Konfirmasi pengguna ◄──────────────────────┘
   │
   ▼
Simpan ke tabel transaksi
   │
   ├─► Perhitungan margin
   ├─► Perhitungan ulang Tingkat Kelengkapan Data
   ├─► Perhitungan ulang Skor KUR
   └─► Pembaruan dashboard
```

### 10.3 Prinsip Arsitektur

- **Tidak ada penulisan otomatis.** Data hasil AI selalu melewati konfirmasi manusia.
- **Berkas asli disimpan.** Setiap unggahan diarsipkan sebagai jejak audit dan bahan perbaikan prompt.
- **Satu layar konfirmasi untuk semua jalur.** Menambah jalur input tidak menambah logika penyimpanan.
- **Perhitungan di sisi server.** Logika margin dan skor tidak berada di klien agar konsisten.
- **Kegagalan AI tidak mematikan aplikasi.** Setiap jalur AI memiliki jalur cadangan berupa input manual.
- **Tidak ada angka hasil estimasi.** Data yang tidak diketahui ditandai sebagai tidak diketahui.

---

## 11. Skema Basis Data

```sql
-- Profil usaha, terikat pada satu akun
businesses
  id                uuid primary key
  auth_user_id      uuid references auth.users(id)
  name              text not null
  owner_name        text
  business_type     text
  address           text
  established_date  date
  has_nib           boolean default false
  has_npwp          boolean default false
  created_at        timestamptz default now()

-- Kanal penjualan beserta persentase komisinya
channels
  id                uuid primary key
  business_id       uuid references businesses(id)
  name              text not null   -- Offline, GoFood, ShopeeFood, WhatsApp
  commission_pct    numeric default 0
  is_active         boolean default true

-- Master produk
products
  id                uuid primary key
  business_id       uuid references businesses(id)
  name              text not null
  aliases           text[]          -- variasi penyebutan untuk pencocokan input suara
  category          text
  selling_price     numeric not null
  waste_pct         numeric default 0
  created_at        timestamptz default now()

-- Komponen biaya penyusun HPP
cost_components
  id                uuid primary key
  product_id        uuid references products(id)
  name              text not null
  type              text not null   -- material, packaging, energy, labor
  cost_per_unit     numeric not null

-- Batch unggahan sebagai jejak audit
upload_batches
  id                uuid primary key
  business_id       uuid references businesses(id)
  source_type       text not null   -- marketplace_screenshot, pasted_text,
                                    -- handwritten_photo, voice_input
  channel_id        uuid references channels(id)
  file_url          text
  raw_input         text            -- teks asli atau hasil transkripsi
  ai_response       jsonb
  detail_level      text not null   -- itemized, total_only
  status            text default 'pending'
  created_at        timestamptz default now()
  confirmed_at      timestamptz

-- Transaksi penjualan berrincian item
sales
  id                uuid primary key
  business_id       uuid references businesses(id)
  batch_id          uuid references upload_batches(id)
  channel_id        uuid references channels(id)
  product_id        uuid references products(id)
  product_name_raw  text
  quantity          integer not null
  unit_price        numeric not null
  total_amount      numeric not null
  sale_date         date not null
  confidence        numeric
  is_verified       boolean default false

-- Penjualan total tanpa rincian item (Kondisi B)
sales_totals
  id                uuid primary key
  business_id       uuid references businesses(id)
  batch_id          uuid references upload_batches(id)
  channel_id        uuid references channels(id)
  total_amount      numeric not null
  transaction_count integer
  sale_date         date not null

-- Pengeluaran
expenses
  id                uuid primary key
  business_id       uuid references businesses(id)
  batch_id          uuid references upload_batches(id)
  category          text not null
  description       text
  amount            numeric not null
  expense_date      date not null

-- Tingkat kelengkapan data per kanal per periode
data_completeness
  id                uuid primary key
  business_id       uuid references businesses(id)
  channel_id        uuid references channels(id)
  period_start      date not null
  period_end        date not null
  level             text not null   -- complete, partial, empty
  itemized_amount   numeric         -- omzet yang terinci
  total_amount      numeric         -- omzet keseluruhan
  coverage_pct      numeric         -- itemized_amount / total_amount
  calculated_at     timestamptz default now()

-- Riwayat Skor Kesiapan KUR
readiness_scores
  id                uuid primary key
  business_id       uuid references businesses(id)
  total_score       integer not null
  breakdown         jsonb not null
  recommendations   jsonb
  calculated_at     timestamptz default now()

-- Insight yang telah dihasilkan
insights
  id                uuid primary key
  business_id       uuid references businesses(id)
  period_start      date
  period_end        date
  content           jsonb not null
  generated_at      timestamptz default now()
```

**Catatan implementasi:**

- Pemisahan `sales` dan `sales_totals` adalah inti dari konsep Tingkat Kelengkapan Data. Penjualan total tidak dipaksakan masuk ke tabel `sales` dengan produk fiktif, karena hal itu akan mencemari perhitungan margin.
- Perhitungan omzet dan arus kas menjumlahkan kedua tabel. Perhitungan margin per produk hanya membaca `sales`.
- Kolom `aliases` pada `products` mendukung pencocokan hasil input suara yang penyebutannya bervariasi.
- Kolom `detail_level` pada `upload_batches` menentukan tabel tujuan penyimpanan.
- Row Level Security aktif pada seluruh tabel, difilter berdasarkan `auth_user_id` pada tabel `businesses`.

---

## 12. Spesifikasi Integrasi AI

### 12.1 Ketentuan Umum

Seluruh pemanggilan model menggunakan **structured output** dengan skema JSON yang ditetapkan. Model tidak diizinkan mengembalikan teks bebas pada jalur parsing data. Setiap balikan divalidasi terhadap skema sebelum ditampilkan; balikan yang tidak lolos ditolak dan pengguna ditawarkan input manual.

### 12.2 Jalur A — Parsing Screenshot Marketplace

**Keluaran yang diharapkan:**

```json
{
  "detected_platform": "gofood | shopeefood | unknown",
  "detail_level": "itemized | total_only",
  "report_period": { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" },
  "items": [
    {
      "product_name": "string",
      "quantity": 0,
      "unit_price": 0,
      "total_amount": 0,
      "confidence": 0.0
    }
  ],
  "summary": {
    "gross_revenue": 0,
    "fees": [
      {
        "label": "string",
        "amount": 0,
        "confidence": 0.0
      }
    ],
    "net_revenue": 0
  },
  "unreadable_regions": ["string"],
  "overall_confidence": 0.0
}
```

**Instruksi kunci:**
- Membaca hanya yang tampak; tidak menebak atau melengkapi angka yang tidak terlihat
- Menandai bagian yang tidak terbaca melalui `unreadable_regions`
- Menyertakan `confidence` per baris, bukan hanya keseluruhan
- Mengembalikan angka murni tanpa pemisah ribuan dan simbol mata uang
- Menetapkan `detail_level` sesuai apakah rincian item tersedia pada laporan
- **Dilarang menjumlahkan, mengurangi, atau menghitung angka apa pun.** Setiap angka yang dikembalikan harus tertulis apa adanya di layar
- Baris yang **terlihat ada namun tidak terbaca** (buram, tertutup, terpotong) tetap dimasukkan ke `items` dengan angka 0 dan `confidence` rendah, disertai alasannya pada `unreadable_regions`. Baris tersebut tidak dihapus dari keluaran

**Catatan baris tidak terbaca:**

Model cenderung membuang baris yang tidak dapat dibacanya. Bila itu terjadi, produk tersebut hilang dari keluaran tanpa jejak selain catatan teks, dan omzet yang ditampilkan menjadi kurang tanpa disadari pengguna. Karena itu baris yang keberadaannya terlihat wajib tetap dikembalikan sebagai penanda kosong, sehingga muncul pada layar konfirmasi dan dapat diisi manual.

Konsekuensinya, `confidence` tidak boleh menjadi satu-satunya penjaga mutu pada layar konfirmasi. Sebuah unggahan ditandai perlu perhatian bila:

```
ada confidence < 0.7   ATAU   unreadable_regions tidak kosong
```

Baris yang keberadaannya sama sekali tidak terlihat — misalnya tertutup penuh oleh notifikasi sistem — tidak dapat dideteksi model. Layar konfirmasi menyediakan penambahan baris manual untuk menutup kemungkinan ini.

**Catatan skema `summary.fees`:**

Laporan marketplace memuat baris potongan yang beragam dan jumlahnya tidak tetap: biaya layanan, biaya penanganan, potongan promo, subsidi ongkir, pajak ditahan, penyesuaian refund. Satu field `platform_commission` memaksa model menjumlahkan baris-baris itu sendiri, sehingga menghasilkan angka yang tidak tertulis di screenshot dan tidak dapat ditelusuri pengguna saat konfirmasi. Hal ini melanggar ketentuan bahwa tidak ada angka hasil estimasi dan bahwa berkas asli disimpan sebagai jejak audit.

Model menyalin tiap baris potongan apa adanya beserta labelnya. Penjumlahan dilakukan di sisi server. Layar konfirmasi (F1) menampilkan rincian per baris sesuai screenshot, bukan satu angka gabungan.

Angka ini tidak disimpan ke tabel penjualan mana pun. Potongan yang dipakai pada perhitungan margin berasal dari `channels.commission_pct` yang dikonfigurasi pengguna (FR3.4), bukan dari hasil parsing.

### 12.3 Jalur B — Parsing Teks Pesanan

Struktur keluaran serupa jalur A tanpa bagian `summary`. Instruksi tambahan: mengabaikan bagian percakapan yang bukan pesanan, dan menormalkan penulisan jumlah seperti "2x" atau "dua porsi" menjadi angka.

### 12.4 Jalur C — Parsing Catatan Tulis Tangan

Instruksi tambahan:
- Bila tulisan tidak terbaca jelas, mengembalikan `confidence` rendah alih-alih menebak
- Bila kualitas gambar buruk secara keseluruhan, mengembalikan penanda agar sistem menyarankan pengambilan ulang foto
- Angka yang ambigu antara 1 dan 7, atau 0 dan 6, ditandai dengan keyakinan rendah
- Bila catatan hanya memuat total tanpa rincian, menetapkan `detail_level` menjadi `total_only`

### 12.5 Jalur D — Parsing Hasil Transkripsi Suara

**Masukan:** teks hasil transkripsi, **disertai daftar produk terdaftar** beserta aliasnya.

**Keluaran:**

```json
{
  "detail_level": "itemized",
  "items": [
    {
      "spoken_name": "string",
      "matched_product_id": "uuid | null",
      "matched_product_name": "string | null",
      "quantity": 0,
      "match_confidence": 0.0
    }
  ],
  "unmatched_phrases": ["string"],
  "overall_confidence": 0.0
}
```

**Instruksi kunci:**
- Mencocokkan nama yang diucapkan ke daftar produk terdaftar, dengan toleransi terhadap kesalahan transkripsi. Contoh: "ayam ge prek" dicocokkan ke "Ayam Geprek"
- Bila kecocokan meragukan, menetapkan `match_confidence` rendah dan tetap mengisi `spoken_name`
- Nama yang tidak dapat dicocokkan sama sekali dimasukkan ke `unmatched_phrases`, tidak dibuang
- Menormalkan angka dalam bentuk kata menjadi angka: "lima belas" menjadi 15
- Mengabaikan kata pengisi dan kalimat yang bukan penyebutan penjualan

### 12.6 Jalur Insight Mingguan

**Masukan:** ringkasan agregat periode berjalan dalam format terstruktur, disertai informasi tingkat kelengkapan data per kanal.

**Keluaran:**

```json
{
  "insights": [
    {
      "title": "string",
      "finding": "string",
      "cause": "string",
      "action": "string",
      "priority": "high | medium | low"
    }
  ],
  "data_limitations": ["string"]
}
```

**Instruksi kunci:**
- Hanya menggunakan angka yang tersedia dalam masukan
- Tidak menyebut perbandingan dengan usaha lain atau rata-rata industri
- Menggunakan bahasa sehari-hari tanpa istilah akuntansi teknis
- Setiap butir wajib memuat saran tindakan yang dapat dijalankan
- Bila ada kanal bertingkat Sebagian, menyebutkan keterbatasan tersebut pada `data_limitations`

### 12.7 Penanganan Kegagalan

| Kondisi | Perlakuan |
|---|---|
| Balikan tidak sesuai skema | Ulangi satu kali; bila tetap gagal, tawarkan input manual |
| Kuota API habis | Tampilkan pemberitahuan dan alihkan ke input manual |
| Waktu tunggu terlampaui | Batas 30 detik, kemudian tawarkan input manual |
| Keyakinan keseluruhan rendah | Tetap tampilkan hasil dengan peringatan agar diperiksa lebih teliti |
| Web Speech API tidak didukung peramban | Sembunyikan tombol rekam, arahkan ke jalur B |
| Transkripsi kosong atau terlalu pendek | Minta pengguna mengulang, jangan panggil AI |

---

## 13. Alur Pengguna

### Alur Utama — Pencatatan Harian, Kondisi B

```
1. Pengguna membuka dashboard
2. Menekan "Tambah Data"
3. Memilih kanal GoFood, memilih jalur unggah screenshot
4. Sistem memproses, layar konfirmasi menampilkan 23 item
5. Pengguna mengoreksi satu baris berkeyakinan rendah, menekan Konfirmasi
6. Menekan "Tambah Data" kembali, memilih kanal Offline
7. Memilih jalur rekam suara, menyebutkan penjualan hari itu
8. Teks hasil transkripsi tampil dan dapat disunting
9. Sistem memproses, layar konfirmasi menampilkan hasil pencocokan produk
10. Pengguna mengonfirmasi
11. Dashboard diperbarui, tingkat kelengkapan kanal Offline naik menjadi Lengkap
```

### Alur Kedua — Menyiapkan Pengajuan Kredit

```
1. Pengguna membuka halaman Kesiapan KUR
2. Melihat skor total dan rincian per kriteria
3. Menelusuri kriteria yang belum memenuhi standar
4. Membaca langkah perbaikan yang disarankan
5. Menandai dokumen yang telah dimiliki pada checklist
6. Menekan "Buat Laporan Keuangan"
7. Memilih rentang periode
8. Mengunduh dokumen PDF
```

### Alur Ketiga — Menemukan Produk Merugi

```
1. Pengguna membuka halaman Analisis Margin
2. Melihat penanda cakupan data, misalnya "mencakup 40% dari total omzet"
3. Mengurutkan tabel berdasarkan margin terendah
4. Menemukan produk margin negatif
5. Membuka halaman rincian, melihat pemecahan struktur biaya
6. Menyunting harga jual dan melihat dampaknya secara langsung
```

### Alur Keempat — Melengkapi Data yang Kurang

```
1. Pengguna melihat penanda "Sebagian" pada kanal Offline
2. Menekan penanda tersebut
3. Sistem menjelaskan analisis apa yang belum tersedia dan mengapa
4. Sistem menawarkan input suara sebagai jalan termudah
5. Pengguna mencoba, kanal naik menjadi Lengkap
```

---

## 14. Panduan Desain & UI

### 14.1 Prinsip Desain

| Prinsip | Penerapan |
|---|---|
| Angka lebih dulu | Metrik utama ditampilkan besar dan langsung terbaca |
| Bahasa sehari-hari | "Untung bersih" bukan "laba operasional"; "Uang masuk" bukan "arus kas masuk" |
| Setiap temuan disertai tindakan | Tidak menampilkan masalah tanpa saran perbaikan |
| Keterbatasan ditampilkan, bukan disembunyikan | Penanda kelengkapan data terlihat jelas dan dapat ditelusuri |
| Ramah layar kecil | Dirancang mulai dari lebar 360px |
| Kejelasan sebelum keindahan | Kontras tinggi, ukuran teks memadai, target sentuh minimal 44px |

### 14.2 Halaman yang Perlu Dirancang

| Prioritas | Halaman | Catatan |
|---|---|---|
| 1 | Dashboard Ringkasan | Halaman pertama yang dilihat juri |
| 2 | Layar Konfirmasi | Halaman paling kompleks secara interaksi, melayani empat jalur |
| 3 | Kesiapan KUR | Halaman andalan, perlu tampilan paling meyakinkan |
| 4 | Analisis Margin | Tabel dengan penekanan pada produk merugi dan penanda cakupan |
| 5 | Alur Tambah Data | Empat pilihan jalur, termasuk antarmuka rekam suara |
| 6 | Rincian Produk | Pemecahan struktur biaya |
| 7 | Master Produk & HPP | Fungsional, tidak perlu banyak polesan |
| 8 | Masuk dan Daftar | Sederhana, gunakan komponen bawaan |

### 14.3 Antarmuka Rekam Suara

Perlu perhatian khusus karena ini pola interaksi yang tidak umum pada aplikasi keuangan.

- Tombol mikrofon besar dan jelas, dengan indikator visual saat perekaman berlangsung
- Teks hasil transkripsi tampil secara langsung agar pengguna tahu sistem mendengar
- Tombol untuk mengulang perekaman dari awal
- Contoh kalimat ditampilkan sebagai panduan pada penggunaan pertama
- Teks dapat disunting sebelum diproses, karena mengoreksi teks lebih mudah daripada mengulang bicara

### 14.4 Bahasa Visual

- Palet netral untuk latar, satu warna aksen untuk tindakan utama, merah dan hijau khusus untuk menandai margin
- Warna tidak menjadi satu-satunya pembawa informasi; selalu disertai label atau ikon
- Penanda kelengkapan data menggunakan bentuk dan teks, bukan warna saja
- Tipografi: satu keluarga font dengan pembobotan jelas antara angka dan label

---

## 15. Rencana Data Demo

Data demo dirancang, bukan diacak, agar temuannya berbicara sendiri saat presentasi.

### 15.1 Profil Usaha Demo

Warung makan dan minuman, berjalan 14 bulan, empat kanal penjualan aktif.

### 15.2 Ketentuan Data

| Aspek | Ketentuan |
|---|---|
| Jumlah produk | 10–12 produk |
| Rentang data | 60–90 hari transaksi |
| Produk margin negatif | Minimal satu, dan produk tersebut harus termasuk yang paling laris |
| Produk margin tinggi tapi kurang laris | Minimal satu, untuk menunjukkan peluang yang terlewat |
| Distribusi kanal | Offline dominan, disusul GoFood, agar perbandingan komisi terlihat |
| **Tingkat kelengkapan** | **Kanal Offline bertingkat Sebagian pada 30 hari pertama, lalu Lengkap setelahnya**, agar konsep F10 dan dampak input suara terlihat |
| Tren omzet | Menunjukkan variasi, tidak datar |
| Skor KUR awal | Kisaran 55–65, sehingga ada ruang perbaikan yang dapat ditunjukkan |

### 15.3 Berkas Uji untuk Demo Langsung

Siapkan minimal delapan berkas yang telah diverifikasi hasilnya:

- Dua screenshot laporan GoFood
- Satu screenshot laporan ShopeeFood
- Satu salinan teks pesanan WhatsApp
- Dua foto catatan tulis tangan
- **Dua kalimat suara yang sudah diuji**, satu sederhana dan satu memuat nama produk yang rawan salah transkripsi

Seluruh berkas disediakan melalui tombol "Coba dengan contoh" di dalam aplikasi, berdampingan dengan opsi unggah bebas.

---

## 16. Rencana Eksekusi

### 16.1 Susunan Tim

| Peran | Lokasi | Tanggung Jawab |
|---|---|---|
| Programmer | Jakarta (WFH) | Seluruh implementasi teknis |
| Designer | Jakarta (WFH) | Antarmuka, aset visual, materi presentasi |
| Peneliti | Lampung | Riset regulasi, data pendukung, dokumentasi, penyusunan data demo |

**Kapasitas programmer:** 3–4 jam pada hari kerja, 8 jam pada akhir pekan, total sekitar 55 jam.

### 16.2 Jadwal

| Tanggal | Programmer | Designer | Peneliti |
|---|---|---|---|
| **3–4 Sep** (Kam–Jum) | Inisiasi proyek, skema basis data, autentikasi, **uji parsing Gemini** | Wireframe, sistem desain, palet warna | Kriteria KUR bank penyalur, data BPS dan Kemenkop UKM |
| **5–6 Sep** (Sab–Min) | Jalur A dan B, integrasi Gemini, layar konfirmasi | Rancangan Dashboard dan Konfirmasi | Rubrik pembobotan skor KUR, kumpulkan sampel screenshot |
| **7–8 Sep** (Sen–Sel) | **Jalur D input suara**, master produk, kalkulator HPP | Rancangan halaman KUR, Margin, dan antarmuka rekam suara | Susun data demo lengkap, mulai draft dokumentasi |
| **9–10 Sep** (Rab–Kam) | Mesin margin, Skor KUR, **F10 kelengkapan data**, dashboard | Polesan antarmuka, ilustrasi, aset presentasi | Selesaikan dokumentasi teknis dan proposal |
| **11 Sep** (Jum) | Insight, export PDF, jalur C bila sempat, perbaikan bug | Slide presentasi | Naskah presentasi |
| **12 Sep** (Sab) | **Pembekuan fitur**, pengujian menyeluruh, rekam video demo | Finalisasi slide | Latihan presentasi bersama |
| **13 Sep** (Min) | Cadangan, penyelesaian akhir | Cadangan | Penyerahan berkas |

### 16.3 Titik Keputusan Wajib

| Waktu | Keputusan |
|---|---|
| Akhir 4 Sep | Akurasi parsing screenshot terverifikasi. Bila di bawah 80%, ubah pendekatan input segera. |
| Akhir 8 Sep | Jalur suara berfungsi dan pencocokan produk dapat diandalkan. Bila tidak, turunkan ke P1 dan alihkan tenaga ke F5. |
| Akhir 10 Sep | Seluruh fitur P0 harus berjalan. Bila belum, jalankan urutan pelepasan pada bagian 8.2. |
| 11 Sep | Pembekuan fitur. Tidak ada penambahan setelah titik ini. |

### 16.4 Tata Kerja Tim Terdistribusi

- Satu repositori GitHub, satu deployment Vercel yang selalu aktif
- Satu berkas Figma untuk seluruh rancangan, tautan tetap sepanjang proyek
- Sinkronisasi harian 20 menit pada jam tetap, format tiga pertanyaan: kemarin selesai apa, hari ini kerjakan apa, ada yang tersumbat
- Kesepakatan: hambatan yang tidak terpecahkan dalam 90 menit wajib dilaporkan ke grup

---

## 17. Manajemen Risiko

| ID | Risiko | Dampak | Kemungkinan | Mitigasi |
|---|---|---|---|---|
| R1 | Akurasi parsing screenshot di bawah harapan | Tinggi | Rendah | Uji pada 4 September. Layar konfirmasi membuat sistem tetap berfungsi meski akurasi tidak sempurna. |
| R2 | Parsing tulisan tangan tidak dapat diandalkan | Rendah | Sedang | Sudah berstatus P1 dan berada di urutan pelepasan. Fungsinya diwakili jalur suara. |
| R3 | Web Speech API tidak akurat pada nama produk lokal | Sedang | Sedang | Pencocokan ditangani di sisi prompt dengan daftar produk terdaftar dan kolom `aliases`. Teks transkripsi dapat disunting sebelum diproses. |
| R4 | Kuota API Gemini habis menjelang demo | Tinggi | Rendah | Pantau penggunaan. Siapkan hasil parsing tersimpan sebagai cadangan demo. |
| R5 | Cakupan fitur meluas | Tinggi | Sedang | Pembekuan fitur 11 September. Bagian 8.3 bersifat mengikat dan memuat alasan agar tidak dibuka kembali. |
| R6 | Programmer terkendala pekerjaan kantor | Tinggi | Sedang | Urutan pelepasan pada bagian 8.2 sudah ditetapkan sebelum tekanan waktu datang. |
| R7 | Bobot skor KUR dipertanyakan juri | Sedang | Sedang | Setiap kriteria wajib memiliki rujukan yang dapat disebutkan. |
| R8 | Juri mempertanyakan beban setup awal | Sedang | Sedang | Jawaban sudah disiapkan pada bagian 18.3. Sediakan template HPP untuk produk umum bila sempat. |
| R9 | Demo suara gagal karena kebisingan ruangan | Sedang | Sedang | Gunakan berkas contoh yang sudah diuji sebagai cadangan. Jangan jadikan input suara sebagai pembuka demo. |

---

## 18. Strategi Demo & Presentasi

### 18.1 Alur Demo (7 menit)

| Menit | Bagian | Tujuan |
|---|---|---|
| 0–1 | Masalah | Tunjukkan buku tulis dan aplikasi kasir yang ditinggalkan. Sampaikan data UMKM yang tidak terjangkau pembiayaan. |
| 1–2 | Solusi | Unggah screenshot laporan GoFood. Tampilkan hasil parsing di layar konfirmasi. |
| 2–3 | Jangkauan | Tunjukkan input suara untuk kanal offline. Jelaskan bahwa mayoritas UMKM tidak punya sistem kasir. |
| 3–5 | Penyadaran | Buka Analisis Margin. Tunjukkan produk terlaris yang ternyata merugi. Jelaskan penyebabnya. |
| 5–6 | Dampak | Buka Skor Kesiapan KUR. Tunjukkan rincian dan langkah perbaikan. Hasilkan laporan PDF. |
| 6–7 | Penutup | Sampaikan keterkaitan dengan target SDG 9.3 dan rencana pengembangan. |

### 18.2 Pesan Utama

1. Kami tidak meminta pemilik usaha mengubah kebiasaannya
2. Kami menunjukkan angka yang tidak pernah mereka lihat sebelumnya
3. Kami mengubah catatan sehari-hari menjadi akses terhadap modal

### 18.3 Antisipasi Pertanyaan Juri

| Pertanyaan | Arah Jawaban |
|---|---|
| Bagaimana bila AI salah membaca? | Tunjukkan layar konfirmasi. Jelaskan bahwa ini keputusan desain, bukan tambalan: sistem yang menangani uang tidak boleh menulis tanpa persetujuan manusia. |
| Bagaimana bila pemilik tidak punya sistem kasir dan tidak tahu rincian penjualannya? | Tunjukkan Tingkat Kelengkapan Data. Jelaskan bahwa lima dari enam kriteria Skor KUR tetap terhitung penuh dari total harian, dan input suara adalah jalan termurah menuju pencatatan rinci. Tegaskan bahwa sistem tidak pernah menebak angka yang tidak diketahui. |
| Mengapa tidak terhubung langsung ke API GoFood? | API merchant tidak terbuka untuk usaha kecil, dan justru itu bagian dari masalah: otomatisasi hanya tersedia bagi pemain besar. Pendekatan berbasis laporan menutup celah tersebut tanpa memerlukan izin pihak mana pun. |
| Mengapa tidak ada chatbot? | Untuk data keuangan, jawaban yang salah lebih berbahaya daripada tidak ada jawaban. Kami membatasi AI pada tugas yang keluarannya dapat diverifikasi: membaca dokumen dan menganalisis data yang sudah dikonfirmasi pengguna. |
| Mengapa tidak ada katalog atau etalase? | Ini aplikasi internal untuk pemilik usaha. Menambahkan sisi pelanggan akan mengubah produk menjadi marketplace dan mengaburkan fokusnya. |
| Setup awal HPP tidak memakan waktu? | Ya, sekitar satu jam. Itu investasi sekali seumur usaha, dibandingkan beban harian yang tidak pernah berhenti pada aplikasi kasir. Ini juga arah pengembangan berikutnya: setup dengan bantuan AI. |
| Dari mana bobot skor KUR? | Sebutkan rujukan kriteria bank penyalur dan regulasi KUR yang digunakan. |
| Apa bedanya dengan BukuWarung? | Tiga hal: input pasif, perhitungan margin yang memperhitungkan komisi platform, dan Skor Kesiapan KUR. |
| Sudah diuji ke UMKM sungguhan? | Sampaikan jujur bahwa belum, dan jelaskan bahwa validasi pengguna adalah langkah berikutnya yang sudah direncanakan. |

---

## 19. Pengembangan Lanjutan

Disampaikan sebagai peta jalan, bukan bagian dari MVP.

| Tahap | Fitur | Nilai |
|---|---|---|
| Berikutnya | Setup HPP dengan bantuan AI: pengguna menyebutkan produk, model mengusulkan komponen biaya dan estimasi harga bahan | Menghapus hambatan adopsi terbesar yang tersisa |
| Berikutnya | Manajemen stok dengan pemotongan otomatis berbasis resep produk | Menghapus pencatatan pemakaian bahan secara manual |
| Berikutnya | Multi-pengguna dan pembagian peran | Melayani usaha yang mulai memiliki karyawan |
| Menengah | Perbandingan anonim antar usaha sejenis | Memberi konteks terhadap performa sendiri |
| Menengah | Prediksi arus kas | Membantu perencanaan pembelian bahan |
| Panjang | Kemitraan penyalur KUR dengan pengajuan langsung dari aplikasi | Menutup penuh rantai dari pencatatan hingga pencairan |

---

## Lampiran A — Daftar Periksa Kesiapan Demo

- [ ] Alur unggah sampai konfirmasi berjalan tanpa error pada seluruh jalur yang tersedia
- [ ] Input suara berhasil pada dua kalimat uji yang telah disiapkan
- [ ] Minimal satu produk demo memiliki margin negatif dan termasuk produk terlaris
- [ ] Minimal satu kanal demo bertingkat Sebagian agar konsep F10 terlihat
- [ ] Skor Kesiapan KUR menampilkan rincian lengkap beserta langkah perbaikan
- [ ] Laporan PDF tergenerate dan tata letaknya rapi
- [ ] Berkas contoh tersedia melalui tombol di dalam aplikasi
- [ ] Aplikasi dapat menerima unggahan bebas dari juri
- [ ] Akun demo dapat diakses dan datanya sudah terisi
- [ ] Setiap kriteria skor KUR memiliki rujukan yang dapat disebutkan
- [ ] Video demo cadangan telah direkam
- [ ] Deployment produksi dapat diakses dan stabil
- [ ] Seluruh anggota memahami keseluruhan sistem, bukan hanya bagiannya

---

## Lampiran B — Riset yang Harus Diselesaikan Tim Peneliti

**Prioritas tinggi, dibutuhkan sebelum 6 September:**

1. Kriteria penyaluran KUR dari minimal dua bank penyalur, beserta tautan sumber
2. Regulasi KUR yang berlaku dan plafon per kategori usaha
3. Data BPS mengenai jumlah UMKM, kontribusi PDB, dan penyerapan tenaga kerja
4. Data OJK atau Kemenkop UKM mengenai porsi UMKM yang belum terjangkau pembiayaan formal
5. Persentase komisi aktual GoFood dan ShopeeFood untuk merchant

**Prioritas menengah:**

6. Alasan umum penolakan pengajuan kredit UMKM
7. Data mengenai porsi UMKM yang belum menggunakan sistem kasir digital, sebagai dasar argumen Kondisi B
8. Tingkat pengabaian aplikasi POS pada segmen usaha mikro, bila tersedia
9. Contoh format laporan keuangan yang diterima bank untuk pengajuan KUR

Seluruh data wajib disertai sumber, tahun publikasi, dan tautan. Data tanpa sumber tidak digunakan dalam presentasi.

---

*Dokumen ini adalah acuan kerja tim selama periode pengembangan. Perubahan cakupan setelah 11 September 2026 tidak diperkenankan.*
