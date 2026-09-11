# Hasil Uji Parsing Screenshot Marketplace

Model: `gemini-3.1-pro-preview`
Tanggal uji: 2026-09-03
Jumlah sampel: 5 dari 5

## Ringkasan

| Sampel | Akurasi | Titik benar | Tidak terlihat | Dikarang |
|---|---|---|---|---|
| 1-gofood-itemized.png | 100.0% | 32/32 | 0 | 0 |
| 2-shopeefood-total.png | 100.0% | 10/10 | 0 | 0 |
| 3-gofood-rusak.png | 91.7% | 11/12 | 10 | 0 |
| 4-shopeefood-itemized.png | 96.2% | 25/26 | 0 | 0 |
| 5-gofood-foto-layar.png | 100.0% | 12/12 | 0 | 0 |
| **Gabungan** | **97.8%** | **90/92** | — | **0** |

**Kriteria lulus** (Prompting-NaikKelas.md bagian 209): akurasi minimal 80% pada 5 sampel berbeda,
dengan nilai dikarang nol.

**Status: LULUS** — akurasi 97.8%, 5 sampel, 0 nilai dikarang.

Akurasi dihitung atas titik data yang terbaca mata manusia. Bagian yang tertutup, buram, atau
terpotong tidak dihitung sebagai kesalahan model, melainkan dilaporkan terpisah pada kolom
"tidak terlihat". Nilai dikarang dilaporkan sebagai hitungan tersendiri dengan ambang nol,
karena angka karangan adalah kegagalan fatal sementara angka tak terbaca bukan.

## Rincian per sampel

### 1-gofood-itemized.png

GoFood, rincian item, layar bersih

| | |
|---|---|
| Titik data terbaca | 32 |
| Terbaca benar | 32 |
| **Akurasi** | **100.0%** |
| Titik data tidak terlihat di layar | 0 |
| Nilai dikarang | 0 |
| Baris tak terbaca yang ditandai | 0 dari 0 |

Tidak ada salah baca.

### 2-shopeefood-total.png

ShopeeFood, total harian, dua baris biaya

| | |
|---|---|
| Titik data terbaca | 10 |
| Terbaca benar | 10 |
| **Akurasi** | **100.0%** |
| Titik data tidak terlihat di layar | 0 |
| Nilai dikarang | 0 |
| Baris tak terbaca yang ditandai | 0 dari 0 |

Tidak ada salah baca.

### 3-gofood-rusak.png

Layar rusak: satu baris buram, satu tertutup, ringkasan terpotong

| | |
|---|---|
| Titik data terbaca | 12 |
| Terbaca benar | 11 |
| **Akurasi** | **91.7%** |
| Titik data tidak terlihat di layar | 10 |
| Nilai dikarang | 0 |
| Baris tak terbaca yang ditandai | 1 dari 2 |

**Salah baca:**
- platform: seharusnya `unknown`, terbaca `gofood`

### 4-shopeefood-itemized.png

ShopeeFood, rincian item, mode gelap

| | |
|---|---|
| Titik data terbaca | 26 |
| Terbaca benar | 25 |
| **Akurasi** | **96.2%** |
| Titik data tidak terlihat di layar | 0 |
| Nilai dikarang | 0 |
| Baris tak terbaca yang ditandai | 0 dari 0 |

**Salah baca:**
- platform: seharusnya `shopeefood`, terbaca `gofood`

### 5-gofood-foto-layar.png

GoFood, total harian, foto layar miring dan kontras rendah

| | |
|---|---|
| Titik data terbaca | 12 |
| Terbaca benar | 12 |
| **Akurasi** | **100.0%** |
| Titik data tidak terlihat di layar | 0 |
| Nilai dikarang | 0 |
| Baris tak terbaca yang ditandai | 0 dari 0 |

Tidak ada salah baca.

## Catatan

Seluruh sampel adalah mock yang dirender dari HTML di `samples/html/`, bukan screenshot asli.
Font bersih, tanpa kompresi berulang, tanpa pantulan layar. Angka di sini adalah batas atas;
screenshot asli dari ponsel akan lebih berat.
