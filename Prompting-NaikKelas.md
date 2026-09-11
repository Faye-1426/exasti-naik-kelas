# Panduan Prompting Claude Code

# NAIK KELAS

**Acuan:** PRD Naik Kelas v2.0
**Periode:** 3 – 13 September 2026
**Skill terpasang:** UI UX Pro Max, Emil Kowalski

---

## Cara Menggunakan Dokumen Ini

Jangan menyalin seluruh dokumen ini sekaligus ke Claude Code. Prompt di sini dipecah per fase mengikuti jadwal di PRD bagian 16.2, karena satu prompt raksasa akan menghasilkan implementasi dangkal di semua bagian sekaligus.

Urutan pengerjaan:

1. Buat `CLAUDE.md` terlebih dahulu (bagian 1). Ini dibaca otomatis setiap sesi dan mencegah kesalahan yang spesifik pada proyek kalian.
2. Jalankan **Prompt Darurat** (bagian 3) hari ini juga. Ini titik keputusan 4 September.
3. Jalankan prompt fase secara berurutan. Satu fase, satu sesi.
4. Setelah setiap fase, jalankan `/clear` sebelum memulai fase berikutnya agar context window tidak penuh.

Aturan yang berlaku sepanjang pengerjaan: **kalau Claude Code mengusulkan fitur yang tidak ada di PRD, tolak.** Kalian minus 10 jam dari anggaran.

---

## 1. CLAUDE.md

Simpan sebagai `CLAUDE.md` di root repositori sebelum menulis baris kode pertama.

````markdown
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
- Google Gemini 2.5 Flash dengan structured output
- Recharts untuk grafik
- Web Speech API untuk transkripsi suara
- Deploy ke Vercel

## Aturan Keras

1. TIDAK ADA penulisan otomatis ke database dari hasil AI. Setiap hasil parsing
   AI wajib melewati layar konfirmasi yang disetujui manusia.
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
````

---

## 2. Arahan Palet Warna

Kalian minta palet yang menarik mata tapi tetap profesional. Ada satu batasan yang menentukan seluruh keputusan warna di aplikasi ini:

**Hijau dan merah tidak boleh dipakai untuk warna merek.** Keduanya sudah dipesan untuk makna semantik — margin positif dan margin negatif. Kalau warna merek juga hijau, pengguna tidak bisa membedakan mana yang berarti "untung" dan mana yang sekadar dekorasi. Ini kesalahan yang sering terjadi di dashboard keuangan.

Arah yang saya sarankan:

| Peran | Arah Warna | Alasan |
|---|---|---|
| Primer | Biru tinta gelap atau indigo pekat | Terbaca serius dan stabil, cocok untuk konteks keuangan dan pengajuan kredit |
| Aksen | Amber hangat atau kuning keemasan | Ini yang membuat "menarik mata". Hangat, terasa Indonesia, dan cukup jauh dari merah semantik bila hanya dipakai pada tombol utama |
| Positif | Emerald | Khusus margin positif dan tren naik |
| Negatif | Rose atau merah bata | Khusus margin negatif dan peringatan |
| Netral | Abu-abu hangat, bukan abu-abu biru | Lebih ramah dan tidak terasa dingin seperti dashboard korporat |

Yang harus dihindari: gradien ungu ke biru, latar gelap dengan aksen neon, dan warna pastel lembut. Yang pertama adalah tanda khas UI hasil AI, yang kedua tidak terbaca di bawah cahaya matahari, dan yang ketiga tidak memberi kontras cukup untuk tabel padat angka.

Biarkan UI UX Pro Max yang menentukan nilai hex dan skala presisinya. Prompt Fase 0 di bawah sudah memuat arahan ini.

---

## 3. Prompt Darurat — Jalankan Hari Ini

Ini titik keputusan 4 September di PRD bagian 16.3. Seluruh produk bergantung padanya. Jalankan sebagai proyek terpisah, jangan di repo utama.

````
Saya perlu memvalidasi satu asumsi teknis sebelum membangun aplikasi.

Buatkan skrip Node.js sederhana untuk menguji Google Gemini 2.5 Flash
membaca screenshot laporan penjualan GoFood/ShopeeFood dan mengubahnya
menjadi JSON terstruktur.

Gunakan structured output dengan JSON schema berikut:

{
  "detected_platform": "gofood | shopeefood | unknown",
  "detail_level": "itemized | total_only",
  "report_period": { "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" },
  "items": [{
    "product_name": "string",
    "quantity": number,
    "unit_price": number,
    "total_amount": number,
    "confidence": number
  }],
  "summary": {
    "gross_revenue": number,
    "platform_commission": number,
    "net_revenue": number
  },
  "unreadable_regions": ["string"],
  "overall_confidence": number
}

Instruksi yang harus masuk ke prompt Gemini:
- Baca hanya yang tampak. Jangan menebak atau melengkapi angka yang tidak terlihat.
- Bagian yang tidak terbaca masuk ke unreadable_regions.
- Sertakan confidence per baris, bukan hanya keseluruhan.
- Kembalikan angka murni tanpa pemisah ribuan dan tanpa simbol mata uang.
- Tetapkan detail_level sesuai apakah rincian item tersedia di laporan.

Skrip harus:
1. Menerima path gambar sebagai argumen CLI
2. Menampilkan hasil JSON yang sudah diformat
3. Menampilkan ringkasan: berapa baris terbaca, berapa yang confidence < 0.7
4. Menangani error dengan pesan yang jelas

Jangan buat aplikasi web. Skrip CLI saja.
````

**Kriteria lulus:** akurasi minimal 80% pada 5 sampel screenshot berbeda. Kalau tidak lulus, hentikan dan diskusikan ulang pendekatan input sebelum melanjutkan ke Fase 0.

---

## 4. Fase 0 — Setup & Design System

**Jadwal:** 3–4 September
**Skill:** UI UX Pro Max

````
Saya akan membangun Naik Kelas, dashboard keuangan internal untuk pemilik UMKM.
Baca CLAUDE.md di root untuk konteks lengkap.

TAHAP 1 — Design System

Gunakan skill UI UX Pro Max dengan mode --design-system untuk menghasilkan
sistem desain. Konteks yang harus kamu sampaikan ke skill:

- Jenis produk: dashboard keuangan internal, BUKAN landing page,
  BUKAN aplikasi konsumen, BUKAN marketing site
- Pengguna: pemilik warung Indonesia usia 40-an, literasi digital rendah
- Perangkat: ponsel Android kelas menengah, lebar layar mulai 360px
- Prioritas: keterbacaan angka, tabel padat data, target sentuh minimal 44px
- Stack: Next.js 14, Tailwind, shadcn/ui, Recharts

Arahan palet yang harus dipatuhi:
- Primer: biru tinta gelap atau indigo pekat. Serius dan stabil.
- Aksen: amber hangat atau kuning keemasan. Ini yang membuat menarik mata,
  dipakai hanya untuk tindakan utama.
- Hijau dan merah DIPESAN untuk makna semantik margin positif dan negatif.
  Jangan dipakai sebagai warna merek dalam bentuk apa pun.
- Netral: abu-abu hangat, bukan abu-abu kebiruan.
- DILARANG: gradien ungu-ke-biru, latar gelap dengan aksen neon, warna pastel
  lembut, font Inter sebagai pilihan default tanpa pertimbangan.

Query terpisah ke skill untuk domain chart, karena aplikasi ini banyak
menampilkan tren omzet dan perbandingan margin dengan Recharts.

Keluarkan hasilnya sebagai:
- File design token (CSS variables di globals.css)
- Konfigurasi Tailwind
- Dokumen singkat DESIGN.md berisi keputusan warna, tipografi, spacing,
  dan aturan penggunaan warna semantik

TAHAP 2 — Inisiasi Proyek

Setelah design system disetujui, buat proyek Next.js 14 App Router dengan
TypeScript dan Tailwind, pasang shadcn/ui, terapkan design token.

Buat halaman kosong dengan rute berikut sebagai kerangka:
/ (dashboard), /tambah, /produk, /margin, /kur, /laporan, /masuk

Jangan implementasi logika apa pun dulu. Kerangka dan design system saja.

Setelah selesai, tunjukkan satu halaman contoh berisi kartu metrik dan
tabel sederhana agar saya bisa menilai keterbacaannya di lebar 360px.
````

---

## 5. Fase 1 — Database & Autentikasi

**Jadwal:** 4–5 September
**Skill:** supabase/agent-skills, supabase-postgres-best-practices

````
Lanjutkan Naik Kelas. Sekarang lapisan data.

TAHAP 1 — Skema Database

Gunakan skill Supabase dan Postgres best practices. Buat migration SQL
untuk skema berikut. Skema ini final, ikuti persis:

businesses, channels, products, cost_components, upload_batches,
sales, sales_totals, expenses, data_completeness, readiness_scores, insights

[SALIN SELURUH BLOK SQL DARI PRD BAGIAN 11 KE SINI]

Perhatikan khusus:
- Pemisahan `sales` dan `sales_totals` disengaja. Jangan digabung.
- Kolom `aliases` pada products bertipe text[] untuk pencocokan input suara.
- Kolom `detail_level` pada upload_batches menentukan tabel tujuan penyimpanan.

TAHAP 2 — Row Level Security

Aktifkan RLS pada seluruh tabel, difilter berdasarkan auth_user_id pada
tabel businesses. Pastikan tidak ada tabel yang bocor antar akun.

TAHAP 3 — Autentikasi

Supabase Auth dengan email dan kata sandi saja. Lingkup terbatas:
- Satu akun sama dengan satu usaha
- TIDAK ADA role, TIDAK ADA multi-user, TIDAK ADA undangan
- Tidak perlu verifikasi email, tidak perlu OAuth, tidak perlu 2FA
- Halaman masuk, daftar, keluar, dan pemulihan kata sandi dasar

TAHAP 4 — Seed Data Demo

Buat skrip seed dengan ketentuan:
- Warung makan dan minuman, berjalan 14 bulan
- 4 kanal: Offline (komisi 0%), GoFood (20%), ShopeeFood (20%), WhatsApp (0%)
- 10-12 produk dengan komponen biaya lengkap
- 90 hari data transaksi
- WAJIB: minimal satu produk margin NEGATIF yang juga termasuk paling laris.
  Contoh: Es Teh Manis, harga jual 5000, HPP 5180 setelah susut,
  laris di GoFood sehingga terkena komisi 20%.
- WAJIB: minimal satu produk margin tinggi tapi volume rendah
- WAJIB: kanal Offline bertingkat `partial` pada 30 hari pertama
  (masuk ke sales_totals), lalu `complete` setelahnya (masuk ke sales)
- Skor KUR awal harus jatuh di kisaran 55-65

Setelah selesai, jalankan query verifikasi yang menunjukkan produk margin
negatif dan tingkat kelengkapan per kanal per bulan.
````

---

## 6. Fase 2 — Pipeline Input & Layar Konfirmasi

**Jadwal:** 5–7 September. Ini fase terberat.

````
Lanjutkan Naik Kelas. Sekarang pipeline input, bagian paling kritis.

TAHAP 1 — Layanan Gemini

Buat modul terpusat untuk pemanggilan Gemini 2.5 Flash dengan structured output.
Empat fungsi parsing, masing-masing dengan JSON schema sendiri:

1. parseMarketplaceScreenshot(image)
2. parsePastedText(text)
3. parseHandwrittenPhoto(image)
4. parseVoiceTranscript(text, registeredProducts)

[SALIN SELURUH SPESIFIKASI DARI PRD BAGIAN 12 KE SINI]

Ketentuan wajib:
- Validasi balikan terhadap schema sebelum dikembalikan
- Bila validasi gagal, ulangi SATU kali, lalu lempar error yang bisa ditangani
- Timeout 30 detik
- Simpan berkas atau teks asli ke Supabase Storage sebelum memanggil AI
- Simpan ai_response mentah ke upload_batches

Khusus parseVoiceTranscript: sertakan daftar produk terdaftar beserta aliases
sebagai konteks dalam prompt. Model harus mencocokkan nama yang diucapkan ke
produk terdekat dengan toleransi kesalahan transkripsi. Contoh: "ayam ge prek"
harus tercocokkan ke "Ayam Geprek". Nama yang tidak cocok masuk ke
unmatched_phrases, JANGAN dibuang.

TAHAP 2 — Empat Jalur Input

Halaman /tambah dengan pemilihan kanal, lalu empat pilihan jalur:

A. Unggah screenshot marketplace
B. Tempel teks pesanan
C. Foto catatan tulis tangan
D. Rekam suara

Untuk jalur D:
- Web Speech API dengan lang="id-ID"
- Tombol mikrofon besar dengan indikator visual saat merekam
- Teks hasil transkripsi tampil langsung dan DAPAT DISUNTING sebelum diproses
- Tombol ulang rekam
- Contoh kalimat ditampilkan pada penggunaan pertama
- Bila peramban tidak mendukung, sembunyikan tombol dan arahkan ke jalur B

TAHAP 3 — Layar Konfirmasi

SATU komponen yang melayani keempat jalur. Ini aturan arsitektur, jangan
dibuat empat versi.

- Tabel hasil parsing yang dapat disunting inline
- Baris dengan confidence rendah ditandai visual dan diurutkan di atas
- Produk yang tidak dikenal ditandai, dapat langsung didaftarkan dari sini
- Total nilai diperbarui langsung saat disunting
- Tombol hapus baris dan tambah baris manual
- Data tersimpan HANYA setelah tombol Konfirmasi ditekan

Tidak boleh ada jalur apa pun yang menyimpan data AI tanpa melewati layar ini.

TAHAP 4 — Penyimpanan

Berdasarkan detail_level dari hasil parsing:
- itemized → simpan ke tabel sales
- total_only → simpan ke tabel sales_totals

Setelah penyimpanan, picu perhitungan ulang data_completeness untuk kanal
dan periode terkait.
````

---

## 7. Fase 3 — Produk, HPP & Margin

**Jadwal:** 7–8 September

````
Lanjutkan Naik Kelas. Sekarang mesin perhitungan.

TAHAP 1 — Master Produk & HPP

Halaman /produk:
- CRUD produk: nama, aliases, kategori, harga jual, persentase susut
- CRUD komponen biaya per produk: nama, tipe (material/packaging/energy/labor),
  biaya per unit
- Tampilkan HPP terhitung secara langsung saat komponen disunting
- Tampilkan margin per kanal secara terpisah dalam satu tabel kecil

Form ini akan sering dipakai saat setup awal, jadi utamakan kecepatan input:
tombol tambah komponen tanpa reload, fokus otomatis ke field berikutnya.

TAHAP 2 — Mesin Perhitungan Margin

Modul perhitungan di sisi server. Gunakan rumus di CLAUDE.md persis.

Penting: margin per produk HANYA dibaca dari tabel sales.
Data di sales_totals TIDAK boleh masuk ke perhitungan margin per produk,
tapi TETAP masuk ke perhitungan omzet total dan arus kas.

TAHAP 3 — Halaman Analisis Margin

Halaman /margin:
- Tabel: nama, qty terjual, omzet, HPP total, potongan platform,
  margin nominal, margin persen
- Dapat diurutkan seluruh kolom, difilter per kanal dan rentang tanggal
- Produk margin negatif ditandai TEGAS dengan warna semantik merah
- Ringkasan di atas: produk paling untung, paling rugi, penyumbang omzet terbesar
- WAJIB: penanda cakupan data, contoh "Analisis ini mencakup 40% dari total
  omzet. Kanal Offline belum terinci."

TAHAP 4 — Halaman Rincian Produk

- Pemecahan struktur biaya sampai komponen terkecil
- Perbandingan margin antar kanal untuk produk yang sama
- Input harga jual yang dapat disunting untuk melihat dampaknya langsung
  tanpa menyimpan (simulasi)

Gunakan UI UX Pro Max untuk tabel padat data ini. Tantangannya adalah
menampilkan 7 kolom angka di lebar 360px tanpa mengorbankan keterbacaan.
Query skill dengan domain layout dan data table.
````

---

## 8. Fase 4 — Skor KUR & Kelengkapan Data

**Jadwal:** 9–10 September. Ini fitur andalan, kerjakan dengan tenaga penuh.

````
Lanjutkan Naik Kelas. Sekarang fitur andalan produk.

TAHAP 1 — Mesin Skor Kesiapan KUR

Modul perhitungan server-side dengan enam kriteria berbobot sesuai CLAUDE.md.

Untuk setiap kriteria, hasilkan:
- Skor yang diperoleh dari bobot maksimal
- Alasan singkat dalam bahasa sehari-hari
- Langkah perbaikan SPESIFIK, TERUKUR, dan BERTENGGAT bila belum penuh

Contoh keluaran langkah perbaikan yang benar:
"Catatan usaha Anda saat ini mencakup 12 hari. Bank umumnya mensyaratkan
riwayat minimal 6 bulan. Lanjutkan pencatatan hingga 180 hari.
Perkiraan skor penuh tercapai: Maret 2027."

Contoh yang SALAH karena terlalu umum:
"Tingkatkan konsistensi pencatatan Anda."

PENTING: lima dari enam kriteria harus tetap terhitung penuh meski kanal
hanya punya data di sales_totals. Uji ini dengan data demo bulan pertama.

TAHAP 2 — Halaman Kesiapan KUR

Halaman /kur:
- Skor total 0-100 dengan indikator visual yang jelas
- Rincian per kriteria dengan skor dan langkah perbaikan
- Estimasi plafon KUR realistis berdasarkan omzet tercatat
- Checklist dokumen (NIB, NPWP) yang dapat ditandai
- Keterangan bahwa skor bersifat indikatif, bukan keputusan kredit resmi

Ini halaman yang akan dilihat juri paling lama. Gunakan UI UX Pro Max
untuk hierarki visualnya. Skor total harus jadi elemen paling dominan,
langkah perbaikan harus mudah dipindai.

TAHAP 3 — Tingkat Kelengkapan Data

Modul perhitungan: untuk setiap kanal per periode, hitung rasio omzet
terinci terhadap omzet total. Tetapkan level complete / partial / empty.

Tampilkan sebagai penanda di dashboard dan halaman margin. Penanda harus
menggunakan bentuk dan teks, TIDAK BOLEH mengandalkan warna saja.

Kanal bertingkat partial menampilkan ajakan mencoba input suara dengan
tautan langsung ke /tambah jalur D.

ATURAN MUTLAK: sistem TIDAK PERNAH mengestimasi rincian yang tidak tersedia.
Jangan pernah menghitung komposisi offline dari komposisi GoFood.
Tampilkan "data belum lengkap", bukan angka tebakan.
````

---

## 9. Fase 5 — Dashboard, Insight & Laporan

**Jadwal:** 10–11 September

````
Lanjutkan Naik Kelas. Sekarang penyatuan dan keluaran.

TAHAP 1 — Dashboard Ringkasan

Halaman /:
- Kartu metrik: omzet periode, untung bersih, jumlah transaksi,
  rata-rata nilai transaksi
- Grafik tren omzet harian dengan Recharts
- Komposisi penjualan per kanal, dengan penanda kelengkapan per kanal
- Ringkasan skor KUR dengan tautan ke halaman rinci
- Tiga produk margin tertinggi dan tiga terendah
- Panel Insight Mingguan
- Banner peringatan di bagian atas

Banner muncul bila: tidak ada pencatatan lebih dari 3 hari, ada produk margin
negatif, ada kanal bertingkat partial, atau skor KUR turun. Setiap banner
punya tautan ke halaman terkait dan dapat ditutup.

TAHAP 2 — Insight Mingguan

Panel yang memanggil Gemini dengan ringkasan AGREGAT periode berjalan,
bukan data mentah. Sertakan informasi tingkat kelengkapan per kanal.

Keluaran 3-5 butir, masing-masing memuat temuan, penyebab, dan saran tindakan.

Batasan konten yang harus masuk ke prompt:
- Hanya gunakan angka yang tersedia dalam masukan
- Jangan bandingkan dengan usaha lain atau rata-rata industri
- Gunakan bahasa sehari-hari, hindari istilah akuntansi
- Bila ada kanal partial, sebutkan keterbatasannya

Simpan hasil ke tabel insights agar tidak dipanggil ulang setiap halaman dibuka.
Sediakan tombol muat ulang manual.

TAHAP 3 — Export Laporan Keuangan

Halaman /laporan dengan pemilihan rentang periode.

Gunakan pendekatan CSS print (@media print) dan window.print(), BUKAN library
PDF. Alasannya anggaran waktu. Kalau ternyata cepat, boleh ditingkatkan nanti.

Isi dokumen:
1. Identitas usaha
2. Laba rugi sederhana
3. Ringkasan arus kas bulanan
4. Rekap penjualan per produk
5. Rekap penjualan per kanal
6. Grafik tren omzet
7. Ringkasan skor KUR

Wajib memuat keterangan bahwa laporan dihasilkan dari pencatatan mandiri
pemilik usaha, dan menyatakan bila ada kanal yang datanya belum lengkap.

TAHAP 4 — Tombol Coba Contoh

Di halaman /tambah, sediakan tombol "Coba dengan contoh" berisi berkas uji
yang sudah diverifikasi, berdampingan dengan opsi unggah bebas.
````

---

## 10. Fase 6 — Polish & Rem Animasi

**Jadwal:** 11 September. Maksimal 3 jam. Jangan lebih.

````
Naik Kelas sudah fungsional. Sekarang polish terbatas.

TAHAP 1 — Audit UI

Gunakan UI UX Pro Max untuk audit seluruh halaman. Fokus pada:
- Keterbacaan angka di lebar 360px
- Konsistensi spacing dan tipografi antar halaman
- Kontras warna, terutama pada penanda margin negatif
- Ukuran target sentuh minimal 44px

Perbaiki HANYA temuan yang bisa diselesaikan dalam waktu singkat.
JANGAN merombak tata letak. JANGAN mengganti komponen shadcn dengan
komponen buatan sendiri.

TAHAP 2 — Rem Animasi

Gunakan skill Emil Kowalski find-animation-opportunities.

Penting: saya menggunakan skill ini sebagai REM, bukan gas. Pengguna target
adalah pemilik warung usia 40-an dengan ponsel Android kelas menengah,
dan anggaran waktu saya sudah habis.

Tugasnya: identifikasi tempat mana yang BENAR-BENAR butuh gerakan, dan
lebih penting, konfirmasi tempat mana yang TIDAK boleh dianimasikan.

Terapkan maksimal 3 animasi, dan hanya yang berfungsi memberi umpan balik
sistem, misalnya indikator proses saat AI membaca dokumen. Tidak ada
animasi dekoratif. Tidak ada transisi halaman.

Hormati prefers-reduced-motion.

TAHAP 3 — Pemeriksaan Akhir

Jalankan daftar periksa berikut dan laporkan status setiap butir:

- Alur unggah sampai konfirmasi berjalan pada seluruh jalur input
- Input suara berhasil pada kalimat uji
- Produk margin negatif tampil dengan benar di data demo
- Minimal satu kanal bertingkat partial terlihat
- Skor KUR menampilkan rincian dan langkah perbaikan
- Laporan tercetak dan tata letaknya rapi
- Tombol contoh tersedia
- Akun demo dapat diakses
- Tidak ada localStorage di mana pun
- Tidak ada angka hasil estimasi di mana pun
- RLS aktif dan tidak ada kebocoran antar akun
````

---

## 11. Prompt Bantu

Simpan untuk dipakai sewaktu-waktu.

**Saat menemui bug:**
````
Ada masalah di [halaman/fitur]. Gejalanya: [deskripsi].
Jangan langsung menulis perbaikan. Pertama jelaskan dulu apa yang kamu
duga jadi penyebabnya dan bagaimana kamu akan memverifikasinya.
````

**Saat Claude Code mengusulkan fitur tambahan:**
````
Fitur itu tidak ada di PRD. Anggaran waktu saya sudah minus 10 jam.
Lanjutkan tugas yang sedang dikerjakan saja.
````

**Saat context window mulai penuh:**
````
Tulis HANDOFF.md yang merangkum: apa yang sudah selesai, apa yang sedang
dikerjakan, keputusan teknis penting yang diambil, dan apa langkah berikutnya.
Cukup detail agar sesi baru bisa melanjutkan tanpa kehilangan konteks.
````

**Saat waktu mepet dan harus memotong:**
````
Waktu saya tinggal [X] jam. Merujuk urutan pelepasan di PRD bagian 8.2,
fitur mana yang harus saya lepas, dan apa yang harus saya pastikan tetap
berjalan sempurna? Beri rekomendasi, jangan langsung mengubah kode.
````

---

## 12. Yang Harus Dihindari Sepanjang Pengerjaan

- Menjalankan lebih dari satu fase dalam satu sesi
- Membiarkan Claude Code memilih pustaka baru tanpa ditanya
- Mengganti komponen shadcn/ui dengan komponen buatan sendiri
- Menambah fitur setelah 11 September
- Menjelajahi 79 style dan 192 palet UI UX Pro Max setelah Fase 0 selesai
- Menyentuh animasi sebelum seluruh fitur P0 berjalan

---

*Dokumen ini turunan dari PRD Naik Kelas v2.0. Bila ada pertentangan, PRD yang berlaku.*
