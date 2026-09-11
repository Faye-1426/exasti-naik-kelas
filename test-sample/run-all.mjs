#!/usr/bin/env node
// Menjalankan seluruh sampel, mencocokkan ke kebenaran dasar, menulis HASIL-UJI-PARSING.md
// Pakai: node run-all.mjs
import { writeFileSync } from "node:fs";
import { parse, MODEL } from "./test-gemini-ocr.mjs";

const norm = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
const like = (a, b) => (a = norm(a)) && (b = norm(b)) && (a.includes(b) || b.includes(a));

// Kebenaran dasar, disalin dari samples/html/*.html.
// null pada gross/net/fees = bagian itu memang tidak terlihat di layar.
// hiddenRows = baris yang ada di laporan tapi tidak terbaca manusia (buram / tertutup).
export const truth = [
  {
    file: "1-gofood-itemized.png", label: "GoFood, rincian item, layar bersih",
    platform: "gofood", level: "itemized", start: "2026-09-01", end: "2026-09-07",
    items: [
      ["Nasi Goreng Spesial", 12, 25000, 300000], ["Ayam Geprek Sambal Matah", 18, 22000, 396000],
      ["Mie Goreng Jawa", 9, 20000, 180000], ["Es Teh Manis", 34, 5000, 170000],
      ["Es Jeruk Peras", 15, 8000, 120000], ["Paket Hemat Nasi + Ayam", 21, 32000, 672000],
    ],
    gross: 1838000, net: 1470400, fees: [["Komisi GoFood", 367600]], hiddenRows: [],
  },
  {
    file: "2-shopeefood-total.png", label: "ShopeeFood, total harian, dua baris biaya",
    platform: "shopeefood", level: "total_only", start: "2026-08-15", end: "2026-08-31",
    items: [], gross: 4275000, net: 3328500,
    fees: [["Biaya layanan", 855000], ["Biaya penanganan", 91500]], hiddenRows: [],
  },
  {
    file: "3-gofood-rusak.png", label: "Layar rusak: satu baris buram, satu tertutup, ringkasan terpotong",
    // Tidak ada tulisan "GoFood" yang terlihat, hanya warna hijau. Menebak platform = salah.
    platform: "unknown", level: "itemized", start: "2026-09-08", end: "2026-09-14",
    items: [["Nasi Goreng Spesial", 7, 25000, 175000], ["Es Teh Manis", 28, 5000, 140000]],
    gross: null, net: null, fees: null,
    hiddenRows: ["Ayam Geprek Sambal Matah", "Mie Goreng Jawa"],
  },
  {
    file: "4-shopeefood-itemized.png", label: "ShopeeFood, rincian item, mode gelap",
    platform: "shopeefood", level: "itemized", start: "2026-09-01", end: "2026-09-14",
    items: [
      ["Bakso Urat Jumbo", 16, 28000, 448000], ["Mie Ayam Pangsit", 23, 18000, 414000],
      ["Es Campur", 11, 12000, 132000], ["Teh Botol", 41, 6000, 246000],
    ],
    gross: 1240000, net: 930000,
    fees: [["Biaya layanan", 248000], ["Potongan promo toko", 62000]], hiddenRows: [],
  },
  {
    file: "5-gofood-foto-layar.png", label: "GoFood, total harian, foto layar miring dan kontras rendah",
    platform: "gofood", level: "total_only", start: "2026-08-16", end: "2026-08-31",
    items: [], gross: 3180000, net: 2371500,
    fees: [["Komisi GoFood", 636000], ["Biaya iklan GoFood", 145000], ["Penyesuaian refund", 27500]],
    hiddenRows: [],
  },
];

export function nilai(t, out) {
  const salah = [], fab = [], hasil = [];
  const cek = (nama, harap, dapat) => {
    const ok = harap === dapat;
    hasil.push(ok);
    if (!ok) salah.push(`${nama}: seharusnya \`${harap}\`, terbaca \`${dapat}\``);
  };

  cek("platform", t.platform, out.detected_platform);
  cek("detail_level", t.level, out.detail_level);
  cek("tanggal mulai", t.start, out.report_period?.start_date);
  cek("tanggal akhir", t.end, out.report_period?.end_date);

  const keluar = out.items ?? [];
  for (const [nama, qty, harga, total] of t.items) {
    const r = keluar.find((x) => like(x.product_name, nama));
    hasil.push(!!r);
    if (!r) { salah.push(`item hilang: ${nama}`); hasil.push(false, false, false); continue; }
    cek(`${nama} · qty`, qty, r.quantity);
    cek(`${nama} · harga satuan`, harga, r.unit_price);
    cek(`${nama} · total`, total, r.total_amount);
  }

  const s = out.summary ?? {};
  const feesOut = s.fees ?? [];
  if (t.gross !== null) {
    cek("penjualan kotor", t.gross, s.gross_revenue);
    cek("pendapatan bersih", t.net, s.net_revenue);
    for (const [label, jml] of t.fees) {
      const r = feesOut.find((x) => like(x.label, label));
      hasil.push(!!r);
      if (!r) { salah.push(`baris biaya hilang: ${label}`); hasil.push(false); continue; }
      cek(`biaya ${label}`, jml, r.amount);
    }
  } else {
    // Ringkasan tidak terlihat. Angka apa pun selain 0 berarti dikarang.
    if (s.gross_revenue) fab.push(`penjualan kotor dikarang: ${s.gross_revenue}`);
    if (s.net_revenue) fab.push(`pendapatan bersih dikarang: ${s.net_revenue}`);
    if (feesOut.length) fab.push(`baris biaya dikarang: ${feesOut.map((x) => x.label).join(", ")}`);
  }

  // Baris yang tidak terbaca: nilai selain 0 = fabrikasi. Hadir dengan 0 = sesuai aturan PRD.
  let ditandai = 0;
  for (const nama of t.hiddenRows) {
    const r = keluar.find((x) => like(x.product_name, nama));
    if (!r) continue;
    if (r.quantity || r.unit_price || r.total_amount) fab.push(`baris tak terbaca diisi angka: ${nama}`);
    else ditandai++;
  }

  const benar = hasil.filter(Boolean).length;
  return { benar, total: hasil.length, salah, fab, ditandai, tersembunyi: t.hiddenRows.length * 4 + (t.gross === null ? 2 : 0) };
}

export const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) : "0.0");
async function main() {
const baris = [];
const laporan = [];

for (const t of truth) {
  process.stderr.write(`Menguji ${t.file} ... `);
  try {
    const out = await parse(`samples/${t.file}`);
    const n = nilai(t, out);
    baris.push({ t, n });
    process.stderr.write(`${pct(n.benar, n.total)}%\n`);
    laporan.push(`### ${t.file}

${t.label}

| | |
|---|---|
| Titik data terbaca | ${n.total} |
| Terbaca benar | ${n.benar} |
| **Akurasi** | **${pct(n.benar, n.total)}%** |
| Titik data tidak terlihat di layar | ${n.tersembunyi} |
| Nilai dikarang | ${n.fab.length} |
| Baris tak terbaca yang ditandai | ${n.ditandai} dari ${t.hiddenRows.length} |
${n.salah.length ? `\n**Salah baca:**\n${n.salah.map((x) => `- ${x}`).join("\n")}\n` : "\nTidak ada salah baca.\n"}${n.fab.length ? `\n**Nilai dikarang:**\n${n.fab.map((x) => `- ${x}`).join("\n")}\n` : ""}`);
  } catch (e) {
    process.stderr.write("GAGAL\n");
    baris.push({ t, n: null, err: e.message });
    laporan.push(`### ${t.file}\n\n${t.label}\n\nTidak dapat diuji: ${e.message}\n`);
  }
}

const sah = baris.filter((b) => b.n);
const benar = sah.reduce((a, b) => a + b.n.benar, 0);
const total = sah.reduce((a, b) => a + b.n.total, 0);
const fab = sah.reduce((a, b) => a + b.n.fab.length, 0);
const lulus = sah.length >= 5 && +pct(benar, total) >= 80 && fab === 0;

const md = `# Hasil Uji Parsing Screenshot Marketplace

Model: \`${MODEL}\`
Tanggal uji: ${new Date().toISOString().slice(0, 10)}
Jumlah sampel: ${sah.length} dari ${truth.length}

## Ringkasan

| Sampel | Akurasi | Titik benar | Tidak terlihat | Dikarang |
|---|---|---|---|---|
${baris.map(({ t, n }) => n
  ? `| ${t.file} | ${pct(n.benar, n.total)}% | ${n.benar}/${n.total} | ${n.tersembunyi} | ${n.fab.length} |`
  : `| ${t.file} | gagal | — | — | — |`).join("\n")}
| **Gabungan** | **${pct(benar, total)}%** | **${benar}/${total}** | — | **${fab}** |

**Kriteria lulus** (Prompting-NaikKelas.md bagian 209): akurasi minimal 80% pada 5 sampel berbeda,
dengan nilai dikarang nol.

**Status: ${lulus ? "LULUS" : "BELUM LULUS"}** — akurasi ${pct(benar, total)}%, ${sah.length} sampel, ${fab} nilai dikarang.

Akurasi dihitung atas titik data yang terbaca mata manusia. Bagian yang tertutup, buram, atau
terpotong tidak dihitung sebagai kesalahan model, melainkan dilaporkan terpisah pada kolom
"tidak terlihat". Nilai dikarang dilaporkan sebagai hitungan tersendiri dengan ambang nol,
karena angka karangan adalah kegagalan fatal sementara angka tak terbaca bukan.

## Rincian per sampel

${laporan.join("\n")}
## Catatan

Seluruh sampel adalah mock yang dirender dari HTML di \`samples/html/\`, bukan screenshot asli.
Font bersih, tanpa kompresi berulang, tanpa pantulan layar. Angka di sini adalah batas atas;
screenshot asli dari ponsel akan lebih berat.
`;

writeFileSync("HASIL-UJI-PARSING.md", md);
console.log(`\nSelesai. Akurasi gabungan ${pct(benar, total)}%, ${fab} nilai dikarang.`);
console.log("Laporan: test-sample/HASIL-UJI-PARSING.md");
}

if (process.argv[1]?.endsWith("run-all.mjs")) await main();
