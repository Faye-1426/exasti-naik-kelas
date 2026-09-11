#!/usr/bin/env node
// Uji coba: Gemini 2.5 Flash membaca screenshot laporan GoFood/ShopeeFood -> JSON terstruktur.
// Pakai: node test-gemini-ocr.mjs <path-gambar>
import { readFileSync } from "node:fs";
import { extname, basename } from "node:path";
import { GoogleGenAI } from "@google/genai";

// 2.5-flash ditarik Google. Pro butuh billing aktif (tanpa itu: 429 limit:0).
// Timpa lewat env GEMINI_MODEL, mis. "gemini-3.6-flash" kalau Pro kena 429/503.
export const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.1-pro-preview";

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

const num = { type: "NUMBER" };
export const schema = {
  type: "OBJECT",
  properties: {
    detected_platform: { type: "STRING", enum: ["gofood", "shopeefood", "unknown"] },
    detail_level: { type: "STRING", enum: ["itemized", "total_only"] },
    report_period: {
      type: "OBJECT",
      properties: { start_date: { type: "STRING" }, end_date: { type: "STRING" } },
      required: ["start_date", "end_date"],
    },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          product_name: { type: "STRING" },
          quantity: num,
          unit_price: num,
          total_amount: num,
          confidence: num,
        },
        required: ["product_name", "quantity", "unit_price", "total_amount", "confidence"],
      },
    },
    summary: {
      type: "OBJECT",
      properties: {
        gross_revenue: num,
        fees: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: { label: { type: "STRING" }, amount: num, confidence: num },
            required: ["label", "amount", "confidence"],
          },
        },
        net_revenue: num,
      },
      required: ["gross_revenue", "fees", "net_revenue"],
    },
    unreadable_regions: { type: "ARRAY", items: { type: "STRING" } },
    overall_confidence: num,
  },
  required: ["detected_platform", "detail_level", "report_period", "items", "summary", "unreadable_regions", "overall_confidence"],
};

export const PROMPT = `Kamu membaca screenshot laporan penjualan dari aplikasi GoFood atau ShopeeFood milik pemilik UMKM.

Aturan:
- Baca HANYA yang tampak di gambar. Jangan menebak, menghitung ulang, atau melengkapi angka yang tidak terlihat.
- Bagian yang buram, terpotong, atau tidak terbaca: tulis deskripsinya di unreadable_regions (contoh: "baris ke-3 tabel item terpotong", "total komisi tertutup notifikasi").
- Setiap baris item wajib punya confidence sendiri (0-1), bukan hanya confidence keseluruhan.
- DILARANG menjumlahkan, mengurangi, atau menghitung angka apa pun. Salin persis yang tertulis.
- summary.fees: salin SETIAP baris potongan/biaya sebagai entri sendiri dengan labelnya apa adanya
  (contoh: "Biaya layanan", "Biaya penanganan", "Potongan promo"). Jangan digabung jadi satu angka.
  Kalau laporan hanya memuat satu baris potongan, fees berisi satu entri. Kalau tidak ada, fees kosong.
- Baris yang JELAS ADA tapi tidak terbaca (buram, tertutup, terpotong): TETAP masukkan ke items,
  isi quantity/unit_price/total_amount dengan 0 dan confidence rendah (<= 0.3), lalu catat alasannya
  di unreadable_regions. Jangan dibuang dari daftar. Isi product_name kalau namanya masih terbaca.
- Angka murni: tanpa titik/koma pemisah ribuan, tanpa "Rp", tanpa persen. 1.250.000 -> 1250000.
- Angka yang tidak terlihat sama sekali: isi 0 dan catat alasannya di unreadable_regions. Jangan mengarang.
- detail_level = "itemized" kalau laporan memuat rincian per produk; "total_only" kalau hanya total penjualan.
- detail_level "total_only" -> items kosong.
- report_period diisi dari periode yang tertulis di laporan (YYYY-MM-DD). Kalau tidak tertulis, isi string kosong dan catat di unreadable_regions.
- detected_platform ditentukan dari logo/warna/tata letak. Kalau ragu, "unknown".`;

export class Bail extends Error {}
const fail = (msg) => { throw new Bail(msg); };

// Membaca satu gambar, mengembalikan objek hasil parsing yang sudah lolos JSON.parse.
export async function parse(path) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) fail("environment variable GEMINI_API_KEY belum diisi.");

  const mimeType = MIME[extname(path).toLowerCase()];
  if (!mimeType) fail(`format ${extname(path) || "(tanpa ekstensi)"} tidak didukung. Pakai png, jpg, jpeg, atau webp.`);

  let data;
  try {
    data = readFileSync(path).toString("base64");
  } catch (e) {
    fail(`tidak bisa membaca berkas "${path}" (${e.code || e.message}).`);
  }

  const ai = new GoogleGenAI({ apiKey });
  let text;
  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ inlineData: { mimeType, data } }, { text: PROMPT }] }],
      config: { responseMimeType: "application/json", responseSchema: schema, temperature: 0 },
    });
    text = res.text;
  } catch (e) {
    fail(`panggilan Gemini ditolak: ${e.message}`);
  }

  let out;
  try {
    out = JSON.parse(text);
  } catch {
    fail(`balikan Gemini bukan JSON yang sah. Mentah:\n${text}`);
  }

  return out;
}

async function main() {
  const path = process.argv[2];
  if (!path) fail("path gambar belum diberikan.\nPakai: node test-gemini-ocr.mjs <path-gambar>");
  const out = await parse(path);

  console.log(JSON.stringify(out, null, 2));

  const items = out.items ?? [];
  const fees = out.summary?.fees ?? [];
  const ragu = [...items, ...fees].filter((i) => i.confidence < 0.7);
  console.log(`
--- Ringkasan (${basename(path)}) · ${MODEL} ---
Platform terdeteksi : ${out.detected_platform}
Tingkat rincian     : ${out.detail_level}
Periode             : ${out.report_period?.start_date || "?"} s/d ${out.report_period?.end_date || "?"}
Baris item terbaca  : ${items.length}
Confidence < 0.7    : ${ragu.length}${ragu.length ? " -> " + ragu.map((i) => `${i.product_name ?? i.label} (${i.confidence})`).join(", ") : ""}
Bagian tak terbaca  : ${out.unreadable_regions?.length || 0}${out.unreadable_regions?.length ? "\n  - " + out.unreadable_regions.join("\n  - ") : ""}
Confidence total    : ${out.overall_confidence}
Baris potongan      : ${fees.length}${fees.length ? "\n  - " + fees.map((x) => `${x.label}: ${x.amount} (${x.confidence})`).join("\n  - ") : ""}`);
}

if (process.argv[1]?.endsWith("test-gemini-ocr.mjs")) main().catch((e) => {
  console.error("Gagal: " + (e instanceof Bail ? e.message : e.stack));
  process.exitCode = 1;
});
