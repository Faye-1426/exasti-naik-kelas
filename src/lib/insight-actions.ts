"use server";

import { revalidatePath } from "next/cache";

import { GagalAI, buatInsight, type HasilInsight } from "./gemini";
import { formatPersen, formatRupiah } from "./format";
import { hariIniLokal, keRinci, muatPeriode, muatSkor } from "./data-usaha";
import { ringkasMargin } from "./hitung";
import { kelengkapanKanal, periodeBulan } from "./parsing";
import {
  komposisiKanal,
  metrikPeriode,
  type BalasanInsight,
  type InsightTersimpan,
} from "./ringkasan";
import { supabaseServer } from "./supabase";

/** F7 — Insight Mingguan.
 *
 *  Tiga hal yang menentukan benar tidaknya fitur ini:
 *
 *  1. Yang dikirim ke model adalah RINGKASAN AGREGAT yang sudah dihitung server
 *     dan sudah diformat sebagai teks (FR7.1). Bukan baris penjualan mentah.
 *     Ini bukan soal menghemat token: aturan keras 1b melarang model berhitung,
 *     dan satu-satunya cara menegakkannya adalah memastikan tidak ada yang
 *     tersisa untuk dihitung.
 *
 *  2. Hasilnya disimpan ke tabel `insights` (FR7.4) dan dibaca dari sana pada
 *     pemuatan halaman berikutnya. Panel tidak pernah memanggil Gemini sendiri
 *     saat halaman dibuka — pemanggilan selalu berasal dari tombol yang ditekan
 *     pengguna.
 *
 *  3. Penyimpanan ini TIDAK melanggar aturan keras 1. Yang disimpan adalah
 *     kalimat analisis, bukan angka yang masuk pembukuan: tidak ada satu baris
 *     penjualan pun yang lahir dari sini, dan menghapus seluruh tabel `insights`
 *     tidak mengubah satu angka pun di laporan keuangan. Aturan itu menjaga
 *     pembukuan, dan pembukuan tidak lewat sini. */

// ── Membaca yang sudah ada ──────────────────────────────────────────────────

/** Insight terbaru untuk bulan berjalan. null kalau belum pernah dibuat —
 *  panel menampilkan tombol, BUKAN memanggil Gemini sendiri. */
export async function insightTersimpan(): Promise<InsightTersimpan | null> {
  const periode = periodeBulan(hariIniLokal());
  const { data } = await supabaseServer()
    .from("insights")
    .select("content, generated_at, period_start, period_end")
    .eq("period_start", periode.mulai)
    .eq("period_end", periode.selesai)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data?.content) return null;

  const isi = data.content as HasilInsight;
  if (!Array.isArray(isi.insights) || isi.insights.length === 0) return null;

  return {
    hasil: { insights: isi.insights, data_limitations: isi.data_limitations ?? [] },
    dibuat: data.generated_at,
    periode: { mulai: data.period_start, selesai: data.period_end },
  };
}

// ── Menyusun ringkasan agregat ──────────────────────────────────────────────

const baris = (label: string, nilai: string) => `- ${label}: ${nilai}`;

const BELUM = "belum ada data";

/**
 * Ringkasan agregat periode berjalan sebagai teks siap kirim.
 *
 * Setiap angka sudah diformat penuh — "Rp 12.450.000", bukan 12450000. Model
 * yang menerima angka mentah cenderung "merapikannya" menjadi "sekitar 12 juta",
 * dan angka yang dirapikan model adalah angka yang tidak tertulis di catatan
 * pengguna.
 *
 * Nilai yang belum diketahui ditulis "belum ada data" apa adanya, tidak
 * dihilangkan dari daftar. Field yang hilang membuat model menyimpulkan angkanya
 * nol; kalimat "belum ada data" membuatnya menyebutkan keterbatasan itu — yang
 * memang diminta FR7.6.
 */
async function susunRingkasan(): Promise<string> {
  const hariIni = hariIniLokal();
  const periode = periodeBulan(hariIni);

  const [data, skor] = await Promise.all([
    muatPeriode(periode.mulai, periode.selesai),
    muatSkor(hariIni),
  ]);

  const rinci = data.penjualan.map(keRinci);
  const metrik = metrikPeriode(rinci, data.totalHarian, data.pengeluaran);
  const komposisi = komposisiKanal(kelengkapanKanal(rinci, data.totalHarian, data.kanal));
  const margin = ringkasMargin(data.penjualan, data.produk, data.kanal);

  const TINGKAT = {
    complete: "lengkap (semua penjualan ada rincian barangnya)",
    partial: "sebagian (hanya total uang masuk, TIDAK diketahui barang apa yang terjual)",
    empty: "kosong (belum ada penjualan tercatat)",
  } as const;

  const bagianKanal = komposisi
    .map(
      (k) =>
        `- ${k.kanal.name}: uang masuk ${formatRupiah(k.omzetTotal)}` +
        `${k.persenOmzet !== null ? `, ${formatPersen(k.persenOmzet)} dari seluruh uang masuk` : ""}` +
        `. Potongan aplikasi ${formatPersen(
          data.kanal.find((x) => x.id === k.kanal.id)?.commission_pct ?? 0,
        )}. Kelengkapan data: ${TINGKAT[k.tingkat]}`,
    )
    .join("\n");

  const terhitung = margin.filter((m) => m.marginNominal !== null);
  const urut = [...terhitung].sort((a, b) => a.marginNominal! - b.marginNominal!);

  const bagianProduk = urut.length
    ? urut
        .map(
          (m) =>
            `- ${m.nama}: terjual ${m.qty}, uang masuk ${formatRupiah(m.omzet)}, ` +
            `untung ${formatRupiah(m.marginNominal!)} (${formatPersen(m.marginPersen)})`,
        )
        .join("\n")
    : "- Belum ada produk yang untungnya bisa dihitung pada periode ini.";

  const belumTerhitung = margin.filter((m) => m.marginNominal === null);
  const catatanProduk = belumTerhitung.length
    ? `\nProduk yang untungnya BELUM bisa dihitung (jangan ditebak): ${belumTerhitung
        .map((m) => `${m.nama} — ${m.alasanKosong ?? "modal belum diisi"}`)
        .join("; ")}`
    : "";

  const kriteriaBelumPenuh = skor.hasil.kriteria
    .filter((k) => k.langkah)
    .map((k) => `- ${k.label}: ${k.skor} dari ${k.bobot}. ${k.alasan}`)
    .join("\n");

  return `PERIODE: ${periode.mulai} sampai ${periode.selesai} (hari ini ${hariIni})

ANGKA UTAMA PERIODE INI
${baris("Uang masuk seluruhnya", formatRupiah(metrik.omzet))}
${baris("Uang masuk yang ada rincian barangnya", formatRupiah(metrik.omzetTerinci))}
${baris("Uang keluar", metrik.pengeluaran === null ? BELUM : formatRupiah(metrik.pengeluaran))}
${baris("Untung bersih", metrik.untungBersih === null ? `${BELUM} (uang keluar belum dicatat)` : formatRupiah(metrik.untungBersih))}
${baris("Jumlah transaksi", metrik.jumlahTransaksi === null ? `${BELUM} (catatan tidak menyebutkan jumlah transaksi)` : String(metrik.jumlahTransaksi))}
${baris("Rata-rata sekali transaksi", metrik.rataTransaksi === null ? BELUM : formatRupiah(metrik.rataTransaksi))}
${baris("Hari yang ada catatannya bulan ini", `${metrik.hariTercatat} hari`)}
${baris("Catatan terakhir", metrik.hariTerakhir ?? BELUM)}

PER KANAL JUALAN
${bagianKanal || "- Belum ada kanal jualan terdaftar."}

UNTUNG PER MENU (hanya dari penjualan yang ada rincian barangnya, diurutkan dari yang paling kecil untungnya)
${bagianProduk}${catatanProduk}

SKOR KESIAPAN KUR
${baris("Skor sekarang", `${skor.hasil.total} dari 100`)}
${kriteriaBelumPenuh || "- Seluruh kriteria sudah penuh."}`;
}

// ── Tombol "Buat insight" dan "Muat ulang" ──────────────────────────────────

/** FR7.5. Satu-satunya jalan insight dibuat: tombol yang ditekan pengguna.
 *  Tidak pernah dipanggil otomatis saat halaman dimuat. */
export async function muatUlangInsight(): Promise<BalasanInsight> {
  const supabase = supabaseServer();
  const { data: usaha } = await supabase.from("businesses").select("id").maybeSingle();
  if (!usaha) return { ok: false, galat: "Data usaha tidak ditemukan. Coba masuk ulang." };

  const periode = periodeBulan(hariIniLokal());

  try {
    const hasil = await buatInsight(await susunRingkasan());

    await supabase.from("insights").insert({
      business_id: usaha.id,
      period_start: periode.mulai,
      period_end: periode.selesai,
      content: hasil,
    });

    revalidatePath("/");
    return { ok: true, hasil };
  } catch (e) {
    // GagalAI sudah berbahasa Indonesia dan menyebutkan jalan keluarnya.
    return {
      ok: false,
      galat:
        e instanceof GagalAI
          ? e.message
          : "Insight gagal dibuat. Coba lagi sebentar lagi — angka di halaman ini tetap benar tanpa insight.",
    };
  }
}
