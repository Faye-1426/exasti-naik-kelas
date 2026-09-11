"use server";

import { revalidatePath } from "next/cache";
import { semuaBaris } from "./paginasi";
import { supabaseServer } from "./supabase";
import {
  GagalAI,
  parseHandwrittenPhoto,
  parseMarketplaceScreenshot,
  parsePastedText,
  parseVoiceTranscript,
  type HasilMarketplace,
  type HasilTeks,
} from "./gemini";
import {
  dariItem,
  dariSuara,
  peringatanPlatform,
  periodeBulan,
  perluPerhatian,
  tingkatKelengkapan,
  totalBiaya,
  type BarisKonfirmasi,
  type HasilParsing,
  type Produk,
  type SumberInput,
  type TingkatRincian,
} from "./parsing";

/** Aturan keras 1: tidak ada penulisan otomatis ke basis data dari hasil AI.
 *  `prosesUnggahan` hanya MEMBACA dan menyimpan jejak audit dengan status
 *  'pending'. Baris penjualan baru ditulis oleh `simpanBatch`, yang hanya
 *  dipanggil dari tombol Konfirmasi di layar F2. */

const MAKS_BERKAS = 10 * 1024 * 1024; // FR1.1
const MAKS_TEKS = 5_000; // FR1.2
const MIN_TRANSKRIPSI = 8; // PRD 12.7: terlalu pendek → jangan panggil AI
const MIME_SAH = ["image/png", "image/jpeg", "image/webp"];

export type Balasan<T> = { ok: true; data: T } | { ok: false; galat: string };

const gagal = (galat: string): Balasan<never> => ({ ok: false, galat });

type Konteks = {
  supabase: ReturnType<typeof supabaseServer>;
  businessId: string;
  produk: Produk[];
};

async function konteks(): Promise<Konteks | null> {
  const supabase = supabaseServer();
  const { data: usaha } = await supabase.from("businesses").select("id").maybeSingle();
  if (!usaha) return null;
  const { data: produk } = await supabase
    .from("products")
    .select("id, name, aliases, selling_price")
    .eq("business_id", usaha.id);
  return { supabase, businessId: usaha.id, produk: (produk ?? []) as Produk[] };
}

// ── Tahap 2 → 3: proses satu masukan jadi bahan layar konfirmasi ─────────────

/**
 * Menerima masukan dari salah satu dari empat jalur, memanggil Gemini, dan
 * mengembalikan bentuk seragam untuk layar konfirmasi. TIDAK menulis satu pun
 * baris penjualan.
 *
 * Field FormData: sumber, channel_id, tanggal, lalu `berkas` (jalur A dan C)
 * atau `teks` (jalur B dan D).
 */
export async function prosesUnggahan(fd: FormData): Promise<Balasan<HasilParsing>> {
  const ctx = await konteks();
  if (!ctx) return gagal("Data usaha tidak ditemukan. Coba masuk ulang.");
  const { supabase, businessId, produk } = ctx;

  const sumber = String(fd.get("sumber")) as SumberInput;
  const channelId = String(fd.get("channel_id"));
  const tanggal = String(fd.get("tanggal"));

  const { data: kanal } = await supabase
    .from("channels")
    .select("id, name")
    .eq("id", channelId)
    .maybeSingle();
  if (!kanal) return gagal("Kanal penjualan belum dipilih.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return gagal("Tanggal penjualan belum diisi.");

  const berkas = fd.get("berkas");
  const teks = typeof fd.get("teks") === "string" ? String(fd.get("teks")).trim() : "";

  // Jejak audit disimpan lebih dulu: berkas asli tetap ada walau AI gagal.
  let fileUrl: string | null = null;
  let gambar: { mimeType: string; data: string } | null = null;

  if (sumber === "marketplace_screenshot" || sumber === "handwritten_photo") {
    if (!(berkas instanceof File) || berkas.size === 0) return gagal("Berkas belum dipilih.");
    if (berkas.size > MAKS_BERKAS) return gagal("Berkas lebih dari 10 MB. Kecilkan dulu fotonya.");
    if (!MIME_SAH.includes(berkas.type))
      return gagal("Format berkas harus JPG, PNG, atau WEBP.");

    const ekstensi = berkas.type.split("/")[1].replace("jpeg", "jpg");
    const jalur = `${businessId}/${crypto.randomUUID()}.${ekstensi}`;
    const { error } = await supabase.storage
      .from("unggahan")
      .upload(jalur, berkas, { contentType: berkas.type });
    if (error) return gagal("Berkas gagal diunggah. Periksa koneksi lalu coba lagi.");

    fileUrl = jalur;
    gambar = { mimeType: berkas.type, data: Buffer.from(await berkas.arrayBuffer()).toString("base64") };
  } else {
    if (!teks) return gagal("Teksnya masih kosong.");
    if (teks.length > MAKS_TEKS) return gagal("Teks lebih dari 5.000 huruf. Bagi jadi beberapa kali kirim.");
    if (sumber === "voice_input" && teks.length < MIN_TRANSKRIPSI)
      return gagal("Rekamannya terlalu pendek. Coba sebutkan lagi lebih lengkap.");
  }

  try {
    return {
      ok: true,
      data: await bacaDanCatat({
        supabase, businessId, produk, sumber, kanal, tanggal, fileUrl, teks, gambar,
      }),
    };
  } catch (e) {
    // GagalAI sudah berbahasa Indonesia dan menawarkan input manual (PRD 12.7).
    return gagal(e instanceof GagalAI ? e.message : "Pembacaan AI gagal. Coba lagi, atau isi datanya manual.");
  }
}

async function bacaDanCatat(a: {
  supabase: Konteks["supabase"];
  businessId: string;
  produk: Produk[];
  sumber: SumberInput;
  kanal: { id: string; name: string };
  tanggal: string;
  fileUrl: string | null;
  teks: string;
  gambar: { mimeType: string; data: string } | null;
}): Promise<HasilParsing> {
  let mentah: unknown;
  let baris: BarisKonfirmasi[];
  let detailLevel: TingkatRincian = "itemized";
  let ringkasan: HasilParsing["ringkasan"] = null;
  let totalOnlyAmount: number | null = null;
  let unreadableRegions: string[] = [];
  let unmatchedPhrases: string[] = [];
  let detectedPlatform: HasilParsing["detectedPlatform"] = null;
  let fotoBuruk = false;
  let overallConfidence = 0;
  let confidences: number[] = [];
  // Tanggal usulan. Periode yang tertulis di laporan menang atas tanggal hari
  // ini — tapi tetap boleh diganti pengguna di layar konfirmasi.
  let tanggal = a.tanggal;
  const pakaiPeriode = (mulai: string) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(mulai)) tanggal = mulai;
  };

  if (a.sumber === "marketplace_screenshot") {
    const h: HasilMarketplace = await parseMarketplaceScreenshot(a.gambar!);
    mentah = h;
    baris = dariItem(h.items, a.produk);
    detailLevel = h.detail_level;
    ringkasan = { grossRevenue: h.summary.gross_revenue, fees: h.summary.fees, netRevenue: h.summary.net_revenue };
    totalOnlyAmount = detailLevel === "total_only" ? h.summary.gross_revenue : null;
    unreadableRegions = h.unreadable_regions;
    detectedPlatform = h.detected_platform;
    overallConfidence = h.overall_confidence;
    confidences = [...h.items.map((i) => i.confidence), ...h.summary.fees.map((f) => f.confidence)];
    pakaiPeriode(h.report_period.start_date);
  } else if (a.sumber === "voice_input") {
    const h = await parseVoiceTranscript(a.teks, a.produk);
    mentah = h;
    baris = dariSuara(h.items, a.produk);
    unmatchedPhrases = h.unmatched_phrases;
    overallConfidence = h.overall_confidence;
    confidences = h.items.map((i) => i.match_confidence);
  } else {
    const h: HasilTeks =
      a.sumber === "handwritten_photo"
        ? await parseHandwrittenPhoto(a.gambar!)
        : await parsePastedText(a.teks);
    mentah = h;
    baris = dariItem(h.items, a.produk);
    detailLevel = h.detail_level;
    totalOnlyAmount = detailLevel === "total_only" ? h.total_only_amount : null;
    unreadableRegions = h.unreadable_regions;
    fotoBuruk = h.poor_image_quality;
    overallConfidence = h.overall_confidence;
    confidences = h.items.map((i) => i.confidence);
    pakaiPeriode(h.report_period.start_date);
  }

  // Aturan keras 6: balikan mentah disimpan apa adanya, sebelum disunting siapa pun.
  const { data: batch, error } = await a.supabase
    .from("upload_batches")
    .insert({
      business_id: a.businessId,
      source_type: a.sumber,
      channel_id: a.kanal.id,
      file_url: a.fileUrl,
      raw_input: a.teks || null,
      ai_response: mentah as object,
      detail_level: detailLevel,
      status: "pending",
    })
    .select("id")
    .single();
  if (error || !batch) throw new GagalAI("Hasil pembacaan gagal dicatat. Coba lagi.");

  return {
    batchId: batch.id,
    sumber: a.sumber,
    channelId: a.kanal.id,
    namaKanal: a.kanal.name,
    detailLevel,
    tanggal,
    baris,
    ringkasan,
    // Aturan keras 1b: penjumlahan potongan dilakukan di sini, bukan oleh model.
    totalBiaya: ringkasan ? totalBiaya(ringkasan.fees) : null,
    totalOnlyAmount,
    unreadableRegions,
    unmatchedPhrases,
    detectedPlatform,
    // Dugaan model tidak pernah mengubah kanal — hanya memperingatkan.
    peringatanPlatform: peringatanPlatform(detectedPlatform, a.kanal.name),
    fotoBuruk,
    perluPerhatian: perluPerhatian(confidences, unreadableRegions),
    overallConfidence,
  };
}

// ── Tahap 4: penyimpanan setelah tombol Konfirmasi ──────────────────────────

export type BarisSimpan = {
  nama: string;
  produkId: string | null;
  qty: number;
  hargaSatuan: number;
  total: number;
  confidence: number;
};

export type SimpanInput = {
  /** null pada jalur "ketik sendiri" — tidak ada batch karena tidak ada yang
   *  diparsing. Kanalnya diambil dari `channelId` dan diperiksa di sini. */
  batchId: string | null;
  /** Hanya dipakai saat `batchId` null. Kalau ada batch, kanal SELALU diambil
   *  dari batch — batch sudah merekamnya sebelum AI dipanggil, dan itu yang
   *  dipakai layar konfirmasi memperingatkan soal platform. */
  channelId: string;
  detailLevel: TingkatRincian;
  tanggal: string;
  baris: BarisSimpan[];
  /** Dipakai hanya saat detailLevel "total_only". */
  totalOnly: number | null;
  transactionCount: number | null;
};

/** Satu-satunya jalan data masuk buku besar. Semua yang dikirim klien diperiksa
 *  ulang di sini — layar konfirmasi adalah UI, bukan penjaga. */
export async function simpanBatch(masukan: SimpanInput): Promise<Balasan<{ jumlahBaris: number }>> {
  const ctx = await konteks();
  if (!ctx) return gagal("Data usaha tidak ditemukan. Coba masuk ulang.");
  const { supabase, businessId } = ctx;

  let batchId: string | null = null;
  let channelId: string;

  if (masukan.batchId) {
    const { data: batch } = await supabase
      .from("upload_batches")
      .select("id, channel_id, status")
      .eq("id", masukan.batchId)
      .maybeSingle();
    if (!batch) return gagal("Batch unggahan tidak ditemukan. Ulangi dari awal.");
    if (batch.status === "confirmed") return gagal("Data ini sudah pernah disimpan.");
    if (!batch.channel_id) return gagal("Kanal batch ini hilang. Ulangi dari awal.");
    batchId = batch.id;
    channelId = batch.channel_id;
  } else {
    // Jalur manual. Kanal datang dari klien, jadi kepemilikannya diperiksa di
    // sini: RLS pada `sales` hanya memeriksa business_id, sedangkan channel_id
    // adalah FK yang secara teknis bisa menunjuk kanal milik usaha lain.
    // Kueri ini lewat klien bersesi, jadi kanal usaha lain tidak akan ketemu.
    const { data: kanal } = await supabase
      .from("channels")
      .select("id")
      .eq("id", masukan.channelId)
      .maybeSingle();
    if (!kanal) return gagal("Kanal penjualan belum dipilih.");
    channelId = kanal.id;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(masukan.tanggal)) return gagal("Tanggal penjualan belum diisi.");

  const tanggal = masukan.tanggal;

  if (masukan.detailLevel === "itemized") {
    const baris = masukan.baris.filter((b) => b.nama.trim() !== "");
    if (!baris.length) return gagal("Belum ada baris yang bisa disimpan.");

    // Baris kosong tidak boleh lolos tanpa disadari: kalau tersimpan, produknya
    // tercatat tapi omzetnya nol dan selisihnya tidak pernah ketahuan.
    const kosong = baris.filter((b) => b.qty <= 0 || b.total <= 0);
    if (kosong.length)
      return gagal(
        `Masih ada ${kosong.length} baris kosong (${kosong.map((b) => b.nama || "tanpa nama").join(", ")}). Isi jumlah dan nilainya, atau hapus barisnya.`,
      );

    const { error } = await supabase.from("sales").insert(
      baris.map((b) => ({
        business_id: businessId,
        batch_id: batchId,
        channel_id: channelId,
        product_id: b.produkId,
        product_name_raw: b.nama.trim(),
        quantity: Math.round(b.qty),
        unit_price: b.hargaSatuan,
        total_amount: b.total,
        sale_date: tanggal,
        confidence: b.confidence,
        // Sudah dilihat dan disetujui manusia di layar konfirmasi.
        is_verified: true,
      })),
    );
    if (error) return gagal("Penjualan gagal disimpan. Coba lagi.");
  } else {
    // Total harian TIDAK dimasukkan ke `sales` dengan produk fiktif — itu akan
    // mencemari perhitungan margin per produk dan sulit dibersihkan.
    if (!masukan.totalOnly || masukan.totalOnly <= 0)
      return gagal("Nilai total penjualan belum diisi.");

    const { error } = await supabase.from("sales_totals").insert({
      business_id: businessId,
      batch_id: batchId,
      channel_id: channelId,
      total_amount: masukan.totalOnly,
      transaction_count: masukan.transactionCount,
      sale_date: tanggal,
    });
    if (error) return gagal("Total penjualan gagal disimpan. Coba lagi.");
  }

  // Jalur manual tidak punya batch untuk ditandai selesai.
  if (batchId) {
    await supabase
      .from("upload_batches")
      .update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        detail_level: masukan.detailLevel,
      })
      .eq("id", batchId);
  }

  await hitungUlangKelengkapan(supabase, businessId, channelId, tanggal);

  revalidatePath("/", "layout");
  return {
    ok: true,
    data: { jumlahBaris: masukan.detailLevel === "itemized" ? masukan.baris.length : 1 },
  };
}

/** Potongan hasil parsing (`fees[]`) sengaja TIDAK ikut ke mana pun di sini.
 *  Angka itu hanya untuk dicocokkan mata pengguna dengan screenshot. Potongan
 *  yang dipakai menghitung margin berasal dari `channels.commission_pct`
 *  (FR3.4), karena potongan di laporan berubah tiap hari akibat promo dan
 *  subsidi, sedangkan margin butuh persentase yang stabil dan bisa dijelaskan. */

const jumlah = (baris: { total_amount: number }[] | null) =>
  (baris ?? []).reduce((n, b) => n + Number(b.total_amount), 0);

/** F10. Dijalankan setiap kali ada penyimpanan baru, untuk kanal dan periode
 *  yang tersentuh saja. */
async function hitungUlangKelengkapan(
  supabase: Konteks["supabase"],
  businessId: string,
  channelId: string,
  tanggal: string,
) {
  const { mulai, selesai } = periodeBulan(tanggal);

  // Per halaman, bukan sekali ambil: satu bulan di kanal yang ramai bisa lewat
  // 1.000 baris, dan balikan PostgREST yang terpotong akan membuat kanal ini
  // tampak "partial" padahal sudah lengkap — atau sebaliknya.
  const [rinci, total] = await Promise.all([
    semuaBaris<{ total_amount: number }>((d, s) =>
      supabase
        .from("sales")
        .select("total_amount")
        .eq("channel_id", channelId)
        .gte("sale_date", mulai)
        .lte("sale_date", selesai)
        .order("id")
        .range(d, s),
    ),
    semuaBaris<{ total_amount: number }>((d, s) =>
      supabase
        .from("sales_totals")
        .select("total_amount")
        .eq("channel_id", channelId)
        .gte("sale_date", mulai)
        .lte("sale_date", selesai)
        .order("id")
        .range(d, s),
    ),
  ]);

  const terinci = jumlah(rinci);
  const keseluruhan = terinci + jumlah(total);

  await supabase.from("data_completeness").upsert(
    {
      business_id: businessId,
      channel_id: channelId,
      period_start: mulai,
      period_end: selesai,
      level: tingkatKelengkapan(terinci, keseluruhan),
      itemized_amount: terinci,
      total_amount: keseluruhan,
      // Disimpan 0-100, sama seperti commission_pct dan waste_pct.
      coverage_pct: keseluruhan > 0 ? (terinci / keseluruhan) * 100 : null,
      calculated_at: new Date().toISOString(),
    },
    { onConflict: "channel_id,period_start,period_end" },
  );
}

// ── FR2.5: daftarkan produk langsung dari layar konfirmasi ──────────────────

export async function daftarProdukCepat(
  nama: string,
  hargaJual: number,
): Promise<Balasan<{ id: string; name: string }>> {
  const ctx = await konteks();
  if (!ctx) return gagal("Data usaha tidak ditemukan. Coba masuk ulang.");

  const bersih = nama.trim();
  if (!bersih) return gagal("Nama produk belum diisi.");
  if (!Number.isFinite(hargaJual) || hargaJual <= 0)
    return gagal("Harga jual belum diisi.");

  const { data, error } = await ctx.supabase
    .from("products")
    .insert({ business_id: ctx.businessId, name: bersih, selling_price: hargaJual })
    .select("id, name")
    .single();
  if (error || !data) return gagal("Produk gagal didaftarkan. Coba lagi.");

  revalidatePath("/produk");
  return { ok: true, data };
}
