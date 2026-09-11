# DESIGN.md — Naik Kelas

Sistem desain untuk dashboard keuangan internal UMKM.

**Konteks yang mendikte semua keputusan di bawah:**
pemilik warung usia 40-an, literasi digital rendah, ponsel Android kelas
menengah, lebar layar mulai 360px, sering dipakai di ruangan terang.
Ini alat kerja, bukan etalase.

---

## 0. Asal Keputusan

| Bagian | Sumber |
|---|---|
| Gaya visual | Skill UI/UX Pro Max → "Minimalism & Swiss Style" (best for: dashboards, enterprise apps; accessibility risk: low) |
| Tipografi | Skill UI/UX Pro Max → pairing "Financial Trust" (IBM Plex Sans) |
| Jenis grafik | Skill UI/UX Pro Max, domain `chart` → Line Chart (tren), Bar Chart (perbandingan) |
| Aturan sentuh & tabel | Skill UI/UX Pro Max, domain `ux` |
| **Palet warna** | **Disusun manual.** Tidak ada satu pun dari 192 palet database yang memenuhi batasan (semua menempatkan amber sebagai primer, atau memakai hijau sebagai warna merek, atau dark-mode-first). |
| Pola halaman | **Tidak dipakai.** Skill hanya punya pola landing page; aplikasi ini internal. |

---

## 1. Warna

### 1.1 Prinsip pemisahan

Aplikasi ini menampilkan angka untung dan rugi. Kalau hijau dan merah dipakai
sebagai warna merek, pengguna kehilangan kemampuan membaca arti angka sekilas.
Karena itu palet dibagi tegas menjadi dua lapis yang tidak boleh saling pinjam:

| Lapis | Warna | Boleh dipakai untuk |
|---|---|---|
| **Merek** | Ink Indigo, Amber | Navigasi, judul, tombol, header tabel, garis grafik netral |
| **Semantik** | Hijau, Merah | HANYA nilai margin/untung/rugi, badge status, dan bar grafik margin |

Aturan turunan yang tidak boleh dilanggar:

- Tombol tidak pernah berwarna hijau. Tombol utama selalu Amber.
- Notifikasi "berhasil" memakai Ink + ikon centang, bukan panel hijau.
- Merah hanya muncul pada angka negatif dan pesan galat destruktif.
  Tombol "Hapus" memakai Merah karena itu memang destruktif — ini satu-satunya
  pengecualian di luar angka.

### 1.2 Nilai

**Merek**

| Token | Hex | Peran | Kontras |
|---|---|---|---|
| `--ink` | `#1E2A63` | Primer. Header, judul, teks penting, seri grafik utama | 13,4:1 di atas putih |
| `--ink-hover` | `#16204D` | Status tekan/hover primer | — |
| `--ink-soft` | `#EDEFF7` | Latar chip, baris terpilih, blok info | — |
| `--amber` | `#F4A81D` | **Aksi utama saja.** Satu per layar. | 9,1:1 dengan `--amber-fg` |
| `--amber-hover` | `#DB9310` | Status tekan/hover aksi utama | — |
| `--amber-fg` | `#1A1408` | Teks di atas amber (gelap, bukan putih) | — |
| `--amber-soft` | `#FEF4E0` | Latar sorotan lembut, bukan tombol | — |

Amber tidak pernah dipasangkan dengan teks putih. Kontras amber+putih hanya
2,2:1 dan gagal total di layar Android murah yang terkena sinar matahari.

**Semantik**

| Token | Hex | Arti | Kontras di atas `--bg` |
|---|---|---|---|
| `--positive` | `#15803D` | Margin positif, untung, uang masuk | 5,0:1 |
| `--positive-soft` | `#E8F5EC` | Latar badge positif | — |
| `--negative` | `#B91C1C` | Margin negatif, rugi, uang keluar | 6,5:1 |
| `--negative-soft` | `#FBEAEA` | Latar badge negatif | — |
| `--unknown` | `#6B6259` | **Data belum diketahui.** Bukan nol, bukan tebakan. | 5,6:1 |
| `--unknown-soft` | `#F1EEE9` | Latar sel/kartu bertingkat `partial` | — |

`--unknown` adalah token wajib. Aturan keras nomor 2 melarang angka tebakan,
jadi keadaan "tidak tahu" perlu representasi visualnya sendiri — abu-abu
netral dengan teks "Belum ada rincian", bukan angka 0 berwarna.

**Netral hangat**

Basis netral digeser ke hue hangat (~35°) agar layar tidak terasa dingin dan
klinis. Abu kebiruan sengaja dihindari.

| Token | Hex | Peran |
|---|---|---|
| `--bg` | `#FAF8F5` | Latar halaman |
| `--surface` | `#FFFFFF` | Kartu, panel, baris tabel |
| `--muted` | `#F4F1EC` | Baris zebra, header tabel, area nonaktif |
| `--border` | `#E4DFD7` | Garis pemisah standar |
| `--border-strong` | `#CFC8BC` | Garis luar tabel, pemisah tegas |
| `--fg` | `#1C1917` | Teks utama |
| `--fg-muted` | `#6B6259` | Label, satuan, keterangan |

### 1.3 Mode gelap

**Tidak dibuat.** Aplikasi dipakai siang hari di warung yang terang. Dark mode
menggandakan permukaan pengujian kontras tanpa manfaat untuk pengguna ini.
Tambahkan kalau ada permintaan nyata dari pengguna, bukan sebelumnya.

---

## 2. Tipografi

### 2.1 Keluarga

**IBM Plex Sans** untuk semuanya. Satu keluarga, satu unduhan.

Alasan memilihnya di atas Inter:

- Angka lining tabular (`tnum`) matang. Kolom rupiah berbaris rapi tanpa hack.
- Bentuk huruf lebih terbuka pada ukuran kecil dibanding Inter yang cenderung
  menutup pada `a`/`e`/`s` — penting untuk mata usia 40-an di layar 360px.
- Angka `1`, `7`, dan huruf `l` mudah dibedakan. Pada aplikasi uang, keliru
  membaca digit adalah kegagalan produk.
- Cakupan Latin lengkap untuk Bahasa Indonesia, ukuran berkas wajar.

Berat yang dimuat: 400, 500, 600. Tiga saja. 300 terlalu tipis untuk layar
murah, 700 tidak diperlukan karena 600 sudah cukup tegas.

```
--font-sans: 'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif;
```

Dimuat lewat `next/font/google` dengan `display: swap`, bukan `@import` CSS,
agar tidak memblokir render pada koneksi lambat.

### 2.2 Angka

Setiap angka uang wajib memakai kelas `.num`:

```css
.num { font-variant-numeric: tabular-nums lining-nums; letter-spacing: 0; }
```

Tanpa ini kolom "Rp 1.111.111" dan "Rp 9.999.999" tidak sejajar dan tabel
jadi sulit dipindai.

### 2.3 Skala

Basis 16px. Tidak ada teks di bawah 13px di mana pun.

| Token | Ukuran | Line-height | Berat | Pemakaian |
|---|---|---|---|---|
| `text-metric` | `clamp(1.5rem, 4vw, 2rem)` 24→32px | 1.15 | 600 | Angka besar di kartu metrik |
| `text-title` | 20px | 1.3 | 600 | Judul halaman (h1) |
| `text-section` | 17px | 1.35 | 600 | Judul bagian (h2) |
| `text-body` | 16px | 1.5 | 400 | Teks dan angka dalam tabel |
| `text-label` | 14px | 1.4 | 500 | Label kartu, header tabel |
| `text-caption` | 13px | 1.4 | 400 | Satuan, catatan kaki, sumbu grafik |

`clamp()` pada `text-metric` menjaga "Rp 12.450.000" tetap muat dalam satu
baris di 360px (turun ke 24px), lalu tumbuh sampai 32px di dashboard desktop
tempat angka memang jadi tokoh utama layar.

Header tabel **tidak** memakai huruf kapital semua. Teks kapital menurunkan
kecepatan baca, dan pengguna sasaran punya literasi rendah.

---

## 3. Jarak dan Bentuk

Skala padat (dashboard), kelipatan 4:

```
4  8  12  16  24  32  48
```

| Konteks | Nilai |
|---|---|
| Padding tepi halaman (mobile) | 16px |
| Padding dalam kartu | 16px |
| Jarak antar kartu | 12px |
| Padding sel tabel | 12px vertikal, 12px horizontal |
| Jarak antar bagian | 24px |

Radius: `8px` untuk kartu dan tombol, `6px` untuk input dan badge. Tidak ada
sudut membulat penuh kecuali pada badge status.

Bayangan: satu tingkat saja, `0 1px 2px rgb(28 25 23 / 0.06)`. Kedalaman
dinyatakan lewat garis `--border`, bukan tumpukan bayangan. Layar murah
me-render bayangan besar dengan pita warna yang jelek.

---

## 4. Target Sentuh

Ini bukan preferensi, ini syarat kelulusan.

| Elemen | Tinggi minimum |
|---|---|
| Tombol utama | 48px |
| Tombol sekunder, input, select | 44px |
| Baris tabel yang bisa ditekan | 48px |
| Ikon-saja (harus punya `aria-label`) | 44 × 44px |

Jarak antar target sentuh minimum 8px. Tidak ada aksi yang hanya muncul saat
hover — ponsel tidak punya hover.

Navigasi bawah maksimum 5 butir. Setiap butir ikon + teks, bukan ikon saja.

---

## 4b. Tata Letak Desktop

Dashboard keuangan memang butuh layar lebar — membandingkan margin antar produk
di 360px selalu jadi kompromi. Ambang peralihan **1024px (`lg`)**.

| Lebar | Navigasi | Lebar konten |
|---|---|---|
| < 1024px | Nav bawah, 5 butir, ikon + teks | penuh, padding 16px |
| ≥ 1024px | Sidebar ink 256px, tetap terlihat | maks 1152px, padding 32px |

Keduanya membaca satu sumber data yang sama: `src/lib/nav.ts`. Menambah menu
cukup di satu tempat, tidak bisa lupa salah satu.

### Sidebar tidak bisa diciutkan

`collapsible="none"`. Mode ciut jadi ikon-saja melanggar aturan di §4 — setiap
butir wajib ikon **dan** teks. Pengguna sasaran tidak menghafal arti ikon, dan
tooltip hanya muncul saat hover, yang tidak ada di perangkat sentuh.

Efek sampingnya menguntungkan: jalur penyimpanan state pakai cookie di komponen
`Sidebar` shadcn tidak pernah dijalankan. Aturan keras #3 hanya melarang
localStorage dan sessionStorage, tapi lebih baik jalurnya memang mati.

Desktop punya ruang untuk **6 butir** — `/laporan` yang tidak muat di nav bawah
masuk ke sini di grup "Lainnya".

### Warna sidebar

Bingkai ink gelap mengapit area kerja terang. Ini membuat batas antara navigasi
dan data jelas tanpa perlu garis tebal.

| Token | Nilai | Kontras |
|---|---|---|
| `--sidebar-background` | `230 53% 25%` (ink `#1E2A63`) | — |
| `--sidebar-foreground` | `228 40% 84%` butir non-aktif | 8,4:1 |
| `--sidebar-accent` | `230 45% 34%` latar hover & aktif | — |
| `--sidebar-accent-foreground` | putih | 10,4:1 |
| `--sidebar-ring` | `39 91% 54%` amber | cincin fokus, terlihat di ink |

**Butir aktif tidak memakai amber.** Amber tetap milik aksi utama; kalau menu
aktif ikut amber, aturan "satu amber per layar" langsung batal dan mata tidak
lagi tahu ke mana harus pergi. Butir aktif dibedakan tiga cara sekaligus: latar
lebih terang, teks putih tebal, dan `aria-current="page"`.

Amber tetap dipakai untuk cincin fokus keyboard di sidebar — itu penanda status,
bukan ajakan bertindak, dan amber adalah satu-satunya warna palet yang cukup
kontras di atas ink.

### Susunan halaman di desktop

Lebar tambahan dipakai untuk menaruh hal berdampingan, bukan untuk melebarkan
tabel sampai baris jadi susah dilacak mata:

- Kartu metrik: 3 kolom sejajar
- Tabel penjualan: 2 dari 3 kolom
- Ajakan melengkapi data: 1 kolom di kanan, sejajar dengan tabel

Di ponsel urutannya berubah — ajakan melengkapi data naik ke atas tabel karena
itu tindakan, sedangkan tabel hanya bacaan.

### Lompat ke isi halaman

Sidebar berisi 6 tautan sebelum konten. Tanpa *skip link*, pengguna keyboard
harus menekan Tab enam kali di setiap halaman. Tautan `Lompat ke isi halaman`
tersembunyi sampai menerima fokus.

---

## 5. Tabel

Tabel adalah permukaan utama aplikasi ini, bukan pelengkap.

- Pembungkus `overflow-x-auto`; tabel tidak pernah merusak lebar viewport.
- Kolom pertama (nama produk/tanggal) `sticky left-0` dengan latar `--surface`.
- Angka rata kanan, teks rata kiri. Selalu.
- Baris zebra memakai `--muted`, bukan garis penuh di setiap baris.
- Header tabel `sticky top-0` di dalam area gulir.
- Di bawah 360px, tabel margin per produk boleh beralih ke tata letak kartu.
  Tabel omzet tetap tabel — perbandingan antar baris adalah gunanya.

Sel tanpa data menampilkan teks "Belum ada rincian" dengan warna `--unknown`,
tidak pernah `0`, `-`, atau sel kosong.

---

## 6. Grafik (Recharts)

### 6.1 Pemilihan jenis

| Kebutuhan | Jenis | Alasan |
|---|---|---|
| Tren omzet harian/bulanan | **Line Chart** | Ada sumbu waktu, yang dicari naik-turunnya |
| Perbandingan margin antar produk | **Bar Chart horizontal**, urut menurun | Kategori diskret, peringkat adalah intinya |
| Perbandingan margin antar kanal | **Grouped Bar** | Maksimum 3 kanal |
| Metrik tunggal (< 4 titik data) | **Kartu metrik, bukan grafik** | Grafik dengan 3 titik menyesatkan |

Tidak ada pie chart dan tidak ada donut. Perbandingan margin butuh presisi,
dan sudut lingkaran tidak bisa dibandingkan dengan akurat.

### 6.2 Warna seri

Grafik netral (omzet, tren) memakai warna merek. Grafik margin memakai warna
semantik karena tanda positif/negatif memang isinya.

| Peran | Hex |
|---|---|
| Seri 1 | `#1E2A63` Ink |
| Seri 2 | `#B47614` Perunggu |
| Seri 3 | `#4A7C93` Biru baja |
| Bar margin positif | `#15803D` |
| Bar margin negatif | `#B91C1C` |
| Garis grid | `#E4DFD7` |
| Teks sumbu | `#6B6259`, 13px |

Maksimum 3 seri per grafik. Ketiga warna merek berbeda tingkat kecerahannya,
bukan hanya hue — tetap terbaca pada buta warna dan pada layar murah.

Perunggu `#B47614` sengaja jauh lebih gelap dari `--amber`, supaya tidak
terbaca sebagai elemen yang bisa ditekan.

### 6.3 Aturan wajib

- **Warna tidak pernah menjadi satu-satunya pembeda.** Multi-seri memakai pola
  garis berbeda (solid, dash, dot) dan label langsung di ujung garis.
- Setiap grafik disertai tabel data yang bisa dibuka. Ini juga jalan keluar
  saat grafik gagal render di ponsel lemah.
- Tooltip aktif pada sentuh, bukan hanya hover.
- Sumbu Y disingkat: `12,4 jt`, `850 rb`. Format penuh `Rp 12.450.000` muncul
  di tooltip dan tabel.
- Tinggi grafik tetap dan dipesan sejak awal (`ResponsiveContainer` dengan
  `height` numerik) supaya tidak ada pergeseran tata letak saat data masuk.
- Tanpa animasi masuk. `isAnimationActive={false}`.

### 6.4 Format angka

Semua lewat satu helper server-side. Pemisah ribuan titik, desimal koma:
`Rp 12.450.000`, `-Rp 320.500`, `23,4%`. Negatif ditandai tanda minus **dan**
warna, tidak pernah hanya warna.

---

## 7. Gerak

Nyaris tidak ada. 150ms untuk perubahan warna tombol, 200ms untuk buka/tutup
panel. Tidak ada animasi scroll, tidak ada parallax, tidak ada skeleton
berkilau. `prefers-reduced-motion` dihormati.

Alasannya bukan estetika: ponsel Android kelas menengah menjatuhkan frame, dan
animasi yang tersendat membuat aplikasi terasa rusak.

---

## 8. Bahasa

Sesuai CLAUDE.md — Bahasa Indonesia sehari-hari.

| Pakai | Jangan |
|---|---|
| Untung bersih | Laba operasional |
| Uang masuk / Uang keluar | Arus kas masuk / keluar |
| Modal per porsi | Harga pokok produksi |
| Belum ada rincian | N/A, null, — |
| Perkiraan skor | Skor kelayakan kredit |

Angka selalu disertai satuannya. "Rp", "%", "porsi" ditulis, tidak
diasumsikan.

---

## 9. Daftar Periksa Sebelum Rilis

- [ ] Kontras teks minimum 4.5:1 di seluruh layar
- [ ] Tidak ada teks di bawah 13px
- [ ] Semua target sentuh ≥ 44px, jarak antar target ≥ 8px
- [ ] Tidak ada gulir horizontal pada halaman di 360px
- [ ] Ikon SVG (Lucide), tidak ada emoji sebagai ikon
- [ ] Fokus keyboard terlihat di semua elemen interaktif
- [ ] Angka uang memakai `tabular-nums`
- [ ] Setiap grafik punya tabel data pendamping
- [ ] Hijau/merah tidak muncul di luar konteks semantik
- [ ] Hanya ada satu tombol amber per layar
- [ ] Butir sidebar aktif tidak memakai amber
- [ ] Skip link berfungsi di semua halaman
- [ ] Diuji pada 360px, 390px, 768px, 1280px, 1536px
