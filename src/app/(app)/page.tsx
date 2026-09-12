import { cookies } from "next/headers";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Gauge,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { BannerPeringatan } from "@/components/banner-peringatan";
import { GrafikOmzet } from "@/components/grafik-omzet";
import { KartuMetrik } from "@/components/kartu-metrik";
import { PanelInsight } from "@/components/panel-insight";
import { PenandaKelengkapan } from "@/components/penanda-kelengkapan";
import { Button } from "@/components/ui/button";
import { hariIniLokal, keRinci, muatPeriode, muatSkor } from "@/lib/data-usaha";
import { formatPersen, formatRupiah } from "@/lib/format";
import { ringkasMargin, type BarisMargin } from "@/lib/hitung";
import { insightTersimpan } from "@/lib/insight-actions";
import { kelengkapanKanal, periodeBulan } from "@/lib/parsing";
import {
  COOKIE_BANNER,
  komposisiKanal,
  metrikPeriode,
  peringatan,
  pisahKunci,
  trenHarian,
  type BagianKanal,
} from "@/lib/ringkasan";
import { tingkatSkor, type HasilSkor } from "@/lib/skor";

/** F8 — Dashboard Ringkasan. Halaman pertama yang dilihat tiap pagi, jadi
 *  susunannya mengikuti urutan pertanyaan pemilik warung, bukan urutan modul:
 *
 *    1. Ada yang perlu saya beresin? → banner (F11)
 *    2. Kemarin dapat berapa?        → kartu metrik + grafik
 *    3. Dari mana saja uangnya?      → komposisi kanal + kelengkapan (F10)
 *    4. Sudah siap ke bank belum?    → ringkasan skor KUR (F5)
 *    5. Menu mana yang bikin rugi?   → margin tertinggi dan terendah
 *    6. Jadi saya harus apa?         → panel insight (F7)
 *
 *  Seluruh angka dihitung di server (aturan keras 4). Komponen klien di halaman
 *  ini hanya tiga: grafik yang menggambar titik jadi, banner yang bisa ditutup,
 *  dan panel insight yang punya tombol. */

export const dynamic = "force-dynamic";

const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const namaBulan = (iso: string) => `${BULAN[+iso.slice(5, 7) - 1]} ${iso.slice(0, 4)}`;

export default async function Ringkasan() {
  const hariIni = hariIniLokal();
  const periode = periodeBulan(hariIni);

  // muatSkor melihat 220 hari ke belakang, muatPeriode hanya bulan berjalan.
  // Keduanya dijalankan berbarengan: yang satu tidak menunggu yang lain.
  const [data, skor, insight] = await Promise.all([
    muatPeriode(periode.mulai, periode.selesai),
    muatSkor(hariIni),
    insightTersimpan(),
  ]);

  const rinci = data.penjualan.map(keRinci);
  const metrik = metrikPeriode(rinci, data.totalHarian, data.pengeluaran);
  const komposisi = komposisiKanal(kelengkapanKanal(rinci, data.totalHarian, data.kanal));
  const tren = trenHarian(rinci, data.totalHarian, periode.mulai, periode.selesai);

  // Margin per produk HANYA dari tabel `sales`. Total harian tidak tahu produk
  // apa yang terjual, jadi tidak pernah masuk ke sini.
  const margin = ringkasMargin(data.penjualan, data.produk, data.kanal)
    .filter((m): m is BarisMargin & { marginNominal: number } => m.marginNominal !== null)
    .sort((a, b) => b.marginNominal - a.marginNominal);

  const tertinggi = margin.slice(0, 3);
  const terendah = margin.slice(-3).reverse().filter((m) => !tertinggi.includes(m));

  // F11 — `hariTerakhir` diambil dari jendela skor (220 hari), bukan dari bulan
  // berjalan: lihat alasannya di SkorTersimpan.hariTerakhir.
  const banner = peringatan({
    hariIni,
    hariTerakhir: skor.hariTerakhir,
    produkRugi: margin.filter((m) => m.marginNominal < 0).map((m) => m.nama),
    kanalSebagian: komposisi.filter((k) => k.tingkat === "partial").map((k) => k.kanal.name),
    skorSekarang: skor.hasil.total,
    skorSebelumnya: skor.sebelumnya,
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-title">Ringkasan</h1>
          <p className="text-caption text-muted-foreground">
            {data.usaha?.name ?? "Usaha Anda"} · {namaBulan(periode.mulai)}
          </p>
        </div>

        <div className="flex gap-2">
          {/* Di desktop /laporan sudah ada di sidebar. */}
          <Button asChild variant="outline" size="lg" className="lg:hidden">
            <Link href="/laporan">
              <FileText aria-hidden />
              Laporan
            </Link>
          </Button>
          {/* Aksi utama. Satu tombol amber per layar. */}
          <Button asChild variant="amber" size="lg" className="flex-1 sm:flex-none">
            <Link href="/tambah">Catat penjualan hari ini</Link>
          </Button>
        </div>
      </header>

      <BannerPeringatan
        daftar={banner}
        sudahTertutup={pisahKunci(cookies().get(COOKIE_BANNER)?.value)}
      />

      <section aria-labelledby="angka-utama">
        <h2 id="angka-utama" className="sr-only">
          Angka utama bulan ini
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <KartuMetrik
            label="Uang masuk bulan ini"
            nilai={metrik.omzet}
            catatan="Gabungan semua kanal jualan"
          />
          <KartuMetrik
            label="Untung bersih"
            nilai={metrik.untungBersih}
            catatan={
              metrik.untungBersih === null
                ? "Uang keluar belum dicatat, jadi belum bisa dihitung"
                : "Uang masuk dikurangi seluruh uang keluar"
            }
            semantik
          />
          <KartuMetrik
            label="Jumlah transaksi"
            nilai={metrik.jumlahTransaksi}
            jenis="jumlah"
            catatan={
              metrik.jumlahTransaksi === null
                ? "Catatan Anda belum menyebutkan jumlah transaksinya"
                : `Dari catatan senilai ${formatRupiah(metrik.omzetBertransaksi)}`
            }
          />
          <KartuMetrik
            label="Rata-rata sekali beli"
            nilai={metrik.rataTransaksi}
            catatan={
              metrik.rataTransaksi === null
                ? "Butuh jumlah transaksi untuk bisa dihitung"
                : "Uang masuk dibagi jumlah transaksi"
            }
          />
        </div>
      </section>

      <section aria-labelledby="tren" className="space-y-3">
        <h2 id="tren" className="text-section">
          Uang masuk per hari — {namaBulan(periode.mulai)}
        </h2>
        <div className="rounded-lg border border-border bg-card p-4 shadow-card">
          <GrafikOmzet titik={tren} />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <Kanal daftar={komposisi} />
        <SkorRingkas hasil={skor.hasil} hariTercatat={skor.fakta.hariTercatat} />
      </div>

      <Margin tertinggi={tertinggi} terendah={terendah} adaProduk={data.produk.length > 0} />

      <PanelInsight awal={insight} aiSiap={Boolean(process.env.GEMINI_API_KEY)} />
    </div>
  );
}

// ── Komposisi per kanal ─────────────────────────────────────────────────────

/** FR10.2 — penanda kelengkapan per kanal. Penandanya bentuk + teks, tidak
 *  pernah warna saja. Batang porsinya hanya pelengkap; angka persennya sudah
 *  menyampaikan hal yang sama. */
function Kanal({ daftar }: { daftar: BagianKanal[] }) {
  return (
    <section aria-labelledby="kanal" className="space-y-3">
      <h2 id="kanal" className="text-section">
        Uang masuk per kanal jualan
      </h2>

      {daftar.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong p-5 text-body text-muted-foreground">
          Belum ada kanal jualan yang terdaftar.
        </p>
      ) : (
        <ul className="space-y-2">
          {daftar.map((k) => (
            <li key={k.kanal.id} className="rounded-lg border border-border bg-card p-3 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-label">{k.kanal.name}</span>
                <PenandaKelengkapan tingkat={k.tingkat} />
              </div>

              <p className="num mt-1 text-body">
                {formatRupiah(k.omzetTotal)}
                {k.persenOmzet !== null && k.omzetTotal > 0 && (
                  <span className="text-caption text-muted-foreground">
                    {" "}
                    · {formatPersen(k.persenOmzet)} dari seluruh uang masuk
                  </span>
                )}
              </p>

              {k.omzetTotal > 0 && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
                  <div
                    className="h-full rounded-full bg-ink"
                    style={{ width: `${k.persenOmzet ?? 0}%` }}
                  />
                </div>
              )}

              {k.tingkat === "partial" && (
                <p className="mt-2 text-caption text-muted-foreground">
                  {formatRupiah(k.omzetTotal - k.omzetTerinci)} belum ada rinciannya, jadi untung
                  per menu di kanal ini belum bisa dihitung.{" "}
                  <Link href={`/tambah?jalur=voice_input&kanal=${k.kanal.id}`} className="underline">
                    Sebutkan lewat suara
                  </Link>
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Ringkasan skor KUR ──────────────────────────────────────────────────────

const NADA_TEKS = {
  positive: "text-positive",
  amber: "text-amber-foreground",
  negative: "text-negative",
} as const;

const NADA_BATANG = {
  positive: "bg-positive",
  amber: "bg-amber",
  negative: "bg-negative",
} as const;

/** Ringkasan, bukan salinan halaman /kur: satu angka, satu kata, satu langkah
 *  berikutnya, lalu tautan. Menyalin seluruh rincian ke dashboard membuat
 *  halaman /kur tidak punya alasan dibuka, dan di situlah langkah perbaikannya
 *  ditulis lengkap. */
function SkorRingkas({ hasil, hariTercatat }: { hasil: HasilSkor; hariTercatat: number }) {
  const tingkat = tingkatSkor(hasil.total);
  const berikutnya = hasil.kriteria
    .filter((k) => k.langkah)
    .sort((a, b) => b.langkah!.tambahan - a.langkah!.tambahan)[0];

  return (
    <section aria-labelledby="skor" className="space-y-3">
      <h2 id="skor" className="text-section">
        Kesiapan KUR
      </h2>

      <div className="space-y-4 rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="num text-metric">
              {hasil.total}
              <span className="text-body text-muted-foreground"> / 100</span>
            </p>
            <p className={`text-label ${NADA_TEKS[tingkat.nada]}`}>{tingkat.label}</p>
          </div>
          <Gauge className="size-8 shrink-0 text-muted-foreground" aria-hidden />
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted" role="presentation">
          <div
            className={`h-full rounded-full ${NADA_BATANG[tingkat.nada]}`}
            style={{ width: `${hasil.total}%` }}
          />
        </div>

        <p className="text-caption text-muted-foreground">
          Dinilai dari {hariTercatat} hari yang tercatat dalam 6 bulan terakhir.
          {hasil.plafon
            ? ` Perkiraan plafon ${formatRupiah(hasil.plafon.bawah)} – ${formatRupiah(hasil.plafon.atas)}.`
            : " Perkiraan plafon belum bisa dihitung."}
        </p>

        {berikutnya && (
          <div className="rounded-md border-l-2 border-amber bg-amber-soft p-3">
            <p className="text-caption font-medium text-amber-foreground">
              Paling cepat menaikkan skor (+{berikutnya.langkah!.tambahan} poin)
            </p>
            <p className="mt-1 text-body">{berikutnya.langkah!.teks}</p>
          </div>
        )}

        <Button asChild variant="outline" size="sm">
          <Link href="/kur">
            Lihat enam kriteria dan langkahnya
            <ArrowRight aria-hidden />
          </Link>
        </Button>

        <p className="text-caption text-muted-foreground">
          Skor ini indikatif, bukan keputusan kredit resmi dari bank mana pun.
        </p>
      </div>
    </section>
  );
}

// ── Margin tertinggi dan terendah ───────────────────────────────────────────

function Margin({
  tertinggi,
  terendah,
  adaProduk,
}: {
  tertinggi: (BarisMargin & { marginNominal: number })[];
  terendah: (BarisMargin & { marginNominal: number })[];
  adaProduk: boolean;
}) {
  return (
    <section aria-labelledby="margin" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 id="margin" className="text-section">
            Menu yang paling menguntungkan dan paling menggerus
          </h2>
          <p className="text-caption text-muted-foreground">
            Diurutkan dari untung rupiahnya, bukan persennya: menu bermargin 80% yang terjual
            dua porsi bukan penyumbang untung terbesar.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/margin">
            Semua menu
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>

      {tertinggi.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-strong p-5 text-body text-muted-foreground">
          {adaProduk
            ? "Belum ada menu yang untungnya bisa dihitung bulan ini. Untung per menu butuh penjualan yang ada rincian barangnya, dan modal per porsi yang sudah diisi."
            : "Belum ada produk yang terdaftar. Isi modal per porsi di halaman Produk supaya untung per menu bisa dihitung."}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:gap-6">
          <DaftarMargin
            judul="Paling menguntungkan"
            Ikon={TrendingUp}
            baris={tertinggi}
            nadaIkon="text-positive"
          />
          {terendah.length > 0 && (
            <DaftarMargin
              judul="Paling kecil untungnya"
              Ikon={TrendingDown}
              baris={terendah}
              nadaIkon="text-negative"
            />
          )}
        </div>
      )}
    </section>
  );
}

function DaftarMargin({
  judul,
  Ikon,
  baris,
  nadaIkon,
}: {
  judul: string;
  Ikon: typeof TrendingUp;
  baris: (BarisMargin & { marginNominal: number })[];
  nadaIkon: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <p className="flex items-center gap-2 text-label">
        <Ikon className={`size-5 shrink-0 ${nadaIkon}`} aria-hidden />
        {judul}
      </p>
      <ol className="mt-3 space-y-3">
        {baris.map((b) => (
          <li key={b.nama} className="flex items-baseline justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate text-body">{b.nama}</span>
              <span className="num block text-caption text-muted-foreground">
                {b.qty} terjual · {formatRupiah(b.omzet)} masuk
              </span>
            </span>
            <span
              className={`num shrink-0 text-label ${
                b.marginNominal < 0 ? "text-negative" : "text-positive"
              }`}
            >
              {formatRupiah(b.marginNominal)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
