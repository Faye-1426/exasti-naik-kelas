import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CircleCheck,
  Info,
  Landmark,
  Sparkles,
} from "lucide-react";

import { DaftarKelengkapan } from "@/components/penanda-kelengkapan";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import { simpanDokumen } from "@/lib/kur-actions";
import { semuaBaris } from "@/lib/paginasi";
import { kelengkapanKanal } from "@/lib/parsing";
import { daftarKanal } from "@/lib/produk-actions";
import {
  hitungSkor,
  langkahTerurut,
  rakitFakta,
  tambahHari,
  tingkatSkor,
  type Fakta,
  type Kriteria,
  type Plafon,
} from "@/lib/skor";
import { supabaseServer } from "@/lib/supabase";

/** F5 — Skor Kesiapan KUR. Fitur andalan produk dan halaman yang paling lama
 *  dilihat juri, jadi hierarkinya dipaksa tegas: SATU angka besar di atas,
 *  langkah perbaikan yang bisa dipindai di bawahnya, rincian per kriteria
 *  paling bawah untuk yang mau menelusuri.
 *
 *  Seluruh perhitungan di sisi server (aturan keras 4). Klien hanya menerima
 *  HTML jadi — tidak ada satu pun angka yang dihitung ulang di peramban.
 *
 *  Skornya sengaja TIDAK ditulis ke tabel `readiness_scores`. Menulis tiap kali
 *  halaman dibuka akan mengotori riwayat dengan puluhan baris identik; tabel
 *  itu untuk menyimpan titik-titik perkembangan, bukan jejak kunjungan.
 *  ponytail: dihitung ulang tiap muat halaman. Simpan ke readiness_scores
 *  kalau grafik perkembangan skor jadi dibuat. */

export const dynamic = "force-dynamic";

/** Cukup untuk menutup 6 bulan penuh ditambah bulan berjalan. */
const JENDELA_HARI = 220;

export default async function Halaman() {
  // sv-SE = YYYY-MM-DD dalam waktu lokal. toISOString() memakai UTC dan
  // menggeser tanggal mundur satu hari sepanjang pagi di WIB.
  const hariIni = new Date().toLocaleDateString("sv-SE");
  const sejak = tambahHari(hariIni, -JENDELA_HARI);

  const supabase = supabaseServer();

  // Dua tabel penjualan, keduanya wajib. Menghitung `sales` saja membuat
  // pengguna yang catatannya berupa total harian tampak nyaris tanpa omzet —
  // persis pengguna yang paling butuh halaman ini.
  const [usaha, kanal, rinci, total, pengeluaran] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, established_date, has_nib, has_npwp")
      .maybeSingle()
      .then((r) => r.data),
    daftarKanal(),
    semuaBaris<{ sale_date: string; total_amount: number; channel_id: string }>((d, s) =>
      supabase
        .from("sales")
        .select("sale_date, total_amount, channel_id")
        .gte("sale_date", sejak)
        .lte("sale_date", hariIni)
        .order("id")
        .range(d, s),
    ),
    semuaBaris<{ sale_date: string; total_amount: number; channel_id: string }>((d, s) =>
      supabase
        .from("sales_totals")
        .select("sale_date, total_amount, channel_id")
        .gte("sale_date", sejak)
        .lte("sale_date", hariIni)
        .order("id")
        .range(d, s),
    ),
    semuaBaris<{ expense_date: string; amount: number }>((d, s) =>
      supabase
        .from("expenses")
        .select("expense_date, amount")
        .gte("expense_date", sejak)
        .lte("expense_date", hariIni)
        .order("id")
        .range(d, s),
    ),
  ]);

  const fakta = rakitFakta(
    [
      ...rinci.map((b) => ({ ...b, terinci: true })),
      ...total.map((b) => ({ ...b, terinci: false })),
    ],
    pengeluaran,
    usaha ?? null,
    hariIni,
  );

  const hasil = hitungSkor(fakta);
  const langkah = langkahTerurut(hasil);
  const tingkat = tingkatSkor(hasil.total);

  // Penanda kelengkapan dibatasi ke jendela yang dinilai, supaya penanda di
  // halaman ini bercerita tentang periode yang sama dengan skornya.
  const dalamJendela = (t: string) => t >= fakta.jendela.mulai && t <= fakta.jendela.selesai;
  const kelengkapan = kelengkapanKanal(
    rinci.filter((b) => dalamJendela(b.sale_date)),
    total.filter((b) => dalamJendela(b.sale_date)),
    kanal,
  );
  const adaSebagian = kelengkapan.some((k) => k.tingkat === "partial");

  return (
    <div className="space-y-8 lg:space-y-10">
      <header className="space-y-1">
        <h1 className="text-title">Kesiapan KUR</h1>
        <p className="text-caption text-muted-foreground">
          {usaha?.name ?? "Usaha Anda"} · dinilai dari catatan 6 bulan terakhir
        </p>
      </header>

      <Sorotan hasil={hasil} tingkat={tingkat} fakta={fakta} />

      {langkah.length > 0 && <LangkahPerbaikan langkah={langkah} />}

      <Rincian kriteria={hasil.kriteria} />

      <Dokumen punyaNib={fakta.punyaNib} punyaNpwp={fakta.punyaNpwp} />

      {/* F10 di halaman skor: menjelaskan kenapa satu kriteria keterangannya
          berbeda, dan menawarkan jalan melengkapinya. */}
      {adaSebagian && (
        <section aria-labelledby="kelengkapan" className="space-y-3">
          <div className="space-y-1">
            <h2 id="kelengkapan" className="text-section">
              Kelengkapan catatan per kanal
            </h2>
            <p className="text-body text-muted-foreground">
              Lima dari enam kriteria di atas tidak butuh rincian barang — jadi skor Anda
              tetap terhitung penuh. Yang belum bisa ditampilkan hanya untung per menu
              pada kanal bertanda Sebagian.
            </p>
          </div>
          <DaftarKelengkapan daftar={kelengkapan} />
        </section>
      )}

      <Penyangkalan />
    </div>
  );
}

// ── Sorotan: skor total + plafon ────────────────────────────────────────────

const NADA_CINCIN = {
  positive: "stroke-positive",
  amber: "stroke-amber",
  negative: "stroke-negative",
} as const;

const NADA_TEKS = {
  positive: "text-positive",
  amber: "text-amber-foreground",
  negative: "text-negative",
} as const;

/** Elemen paling dominan di halaman. Cincin + angka + kata — tiga penanda yang
 *  berdiri sendiri, jadi warnanya tidak pernah jadi satu-satunya pembeda. */
function Sorotan({
  hasil,
  tingkat,
  fakta,
}: {
  hasil: ReturnType<typeof hitungSkor>;
  tingkat: ReturnType<typeof tingkatSkor>;
  fakta: Fakta;
}) {
  const R = 78;
  const keliling = 2 * Math.PI * R;

  return (
    <section
      aria-labelledby="skor-total"
      className="grid gap-6 rounded-lg border border-border bg-card p-5 shadow-card lg:grid-cols-[auto_1fr] lg:items-center lg:gap-10 lg:p-8"
    >
      <h2 id="skor-total" className="sr-only">
        Skor kesiapan KUR
      </h2>

      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          {/* -rotate-90 memindahkan titik nol ke atas. role="img" + aria-label
              supaya pembaca layar mendapat kalimat, bukan deretan angka SVG. */}
          <svg
            viewBox="0 0 180 180"
            className="size-[180px] -rotate-90"
            role="img"
            aria-label={`Skor ${hasil.total} dari 100. ${tingkat.label}.`}
          >
            <circle
              cx="90"
              cy="90"
              r={R}
              fill="none"
              strokeWidth="14"
              className="stroke-muted"
            />
            <circle
              cx="90"
              cy="90"
              r={R}
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={keliling}
              strokeDashoffset={keliling * (1 - hasil.total / 100)}
              className={NADA_CINCIN[tingkat.nada]}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Satu-satunya angka di aplikasi yang keluar dari skala tipografi
                baku. Disengaja: ini elemen yang harus terbaca lebih dulu dari
                apa pun di layar. */}
            <span className="num text-[clamp(3rem,12vw,3.75rem)] font-semibold leading-none">
              {hasil.total}
            </span>
            <span className="text-caption text-muted-foreground">dari 100</span>
          </div>
        </div>

        <p className={`text-section ${NADA_TEKS[tingkat.nada]}`}>{tingkat.label}</p>
      </div>

      <div className="space-y-4">
        <PlafonKartu plafon={hasil.plafon} />

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Angka label="Hari tercatat" nilai={`${fakta.hariTercatat} dari 180`} />
          <Angka label="Bulan penuh dinilai" nilai={`${fakta.omzetBulanan.length} bulan`} />
          <Angka
            label="Uang masuk dinilai"
            nilai={formatRupiah(fakta.omzetTotal)}
            lebar
          />
        </dl>
      </div>
    </section>
  );
}

function Angka({ label, nilai, lebar }: { label: string; nilai: string; lebar?: boolean }) {
  return (
    <div className={`rounded-md bg-muted p-3 ${lebar ? "col-span-2 sm:col-span-1" : ""}`}>
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="num mt-0.5 text-label">{nilai}</dd>
    </div>
  );
}

/** FR5.4 — estimasi plafon, selalu berupa rentang dan selalu disertai cara
 *  hitungnya. Satu angka bulat akan dibaca sebagai janji bank. */
function PlafonKartu({ plafon }: { plafon: Plafon | null }) {
  if (!plafon) {
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-4">
        <p className="text-label text-muted-foreground">Perkiraan plafon</p>
        <p className="mt-1 text-body text-unknown">
          Belum bisa dihitung. Perkiraan plafon butuh minimal satu bulan kalender penuh
          yang tercatat — dan angkanya tidak ditebak dari data separuh bulan.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-ink/20 bg-ink-soft p-4">
      <div className="flex items-center gap-2 text-ink">
        <Landmark className="size-5 shrink-0" aria-hidden />
        <p className="text-label">Perkiraan plafon {plafon.jenis}</p>
      </div>
      <p className="num mt-1 text-metric text-ink">
        {formatRupiah(plafon.bawah)} – {formatRupiah(plafon.atas)}
      </p>
      <p className="mt-1 text-caption text-muted-foreground">
        Dihitung 3 sampai 6 kali rata-rata omzet bulanan Anda ({formatRupiah(plafon.rataBulanan)}{" "}
        dari {plafon.bulanDipakai} bulan penuh), dibatasi pagu {plafon.jenis}. Angka yang
        disetujui bank bisa berbeda.
      </p>
    </div>
  );
}

// ── Langkah perbaikan ───────────────────────────────────────────────────────

/** Bagian yang paling mungkin diikuti pengguna, jadi ditaruh di atas rincian
 *  dan dibuat mudah dipindai: satu kartu per langkah, poin tambahannya besar di
 *  kanan, tenggatnya berupa chip. */
function LangkahPerbaikan({ langkah }: { langkah: (Kriteria & { langkah: NonNullable<Kriteria["langkah"]> })[] }) {
  return (
    <section aria-labelledby="langkah" className="space-y-3">
      <div className="space-y-1">
        <h2 id="langkah" className="text-section">
          Yang paling cepat menaikkan skor
        </h2>
        <p className="text-body text-muted-foreground">
          Diurutkan dari yang paling banyak menambah poin. Tidak perlu dikerjakan semua
          sekaligus.
        </p>
      </div>

      <ol className="space-y-3">
        {langkah.map((k, i) => (
          <li
            key={k.kunci}
            className="rounded-lg border border-border bg-card p-4 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-ink-soft text-caption font-semibold text-ink">
                  {i + 1}
                </span>
                <p className="text-label">{k.label}</p>
              </div>
              <span className="num shrink-0 rounded-md bg-positive-soft px-2 py-0.5 text-label text-positive">
                +{k.langkah.tambahan} poin
              </span>
            </div>

            <p className="mt-2 text-body">{k.langkah.teks}</p>

            {k.langkah.target && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-caption text-muted-foreground">
                <CalendarClock className="size-4 shrink-0" aria-hidden />
                Perkiraan skor penuh tercapai: {k.langkah.target}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// ── Rincian per kriteria ────────────────────────────────────────────────────

function Rincian({ kriteria }: { kriteria: Kriteria[] }) {
  return (
    <section aria-labelledby="rincian" className="space-y-3">
      <h2 id="rincian" className="text-section">
        Rincian enam kriteria
      </h2>

      <ul className="space-y-3">
        {kriteria.map((k) => {
          const penuh = k.langkah === null;
          return (
            <li key={k.kunci} className="rounded-lg border border-border bg-card p-4 shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-label">{k.label}</p>
                <p className="num text-body">
                  <span className={penuh ? "font-semibold text-positive" : "font-semibold"}>
                    {k.skor}
                  </span>
                  <span className="text-muted-foreground"> / {k.bobot}</span>
                </p>
              </div>

              {/* Batang bukan satu-satunya penanda: angka skor/bobot di atasnya
                  sudah menyampaikan hal yang sama tanpa perlu melihat warna. */}
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                role="presentation"
              >
                <div
                  className={`h-full rounded-full ${penuh ? "bg-positive" : "bg-ink"}`}
                  style={{ width: `${(k.skor / k.bobot) * 100}%` }}
                />
              </div>

              <p className="mt-2 text-body text-muted-foreground">{k.alasan}</p>

              {penuh ? (
                <p className="mt-2 inline-flex items-center gap-1.5 text-caption text-positive">
                  <CircleCheck className="size-4 shrink-0" aria-hidden />
                  Sudah penuh, tidak ada yang perlu diperbaiki.
                </p>
              ) : (
                <div className="mt-3 rounded-md border-l-2 border-amber bg-amber-soft p-3">
                  <p className="text-caption font-medium text-amber-foreground">
                    Langkah perbaikan
                  </p>
                  <p className="mt-1 text-body">{k.langkah!.teks}</p>
                  {k.langkah!.target && (
                    <p className="num mt-1 text-caption text-muted-foreground">
                      Perkiraan tercapai: {k.langkah!.target}
                    </p>
                  )}
                </div>
              )}

              {!k.tanpaRincian && (
                <p className="mt-2 text-caption text-muted-foreground">
                  Satu-satunya kriteria yang keterangannya bergantung pada rincian barang.
                  Skornya tetap terhitung dari total uang masuk dan uang keluar.
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ── Checklist dokumen ───────────────────────────────────────────────────────

/** FR5.5. Form HTML biasa: berfungsi tanpa JavaScript, dan perubahannya baru
 *  tersimpan setelah pengguna menekan Simpan. */
function Dokumen({ punyaNib, punyaNpwp }: { punyaNib: boolean; punyaNpwp: boolean }) {
  const kotak =
    "size-6 shrink-0 rounded border-border-strong text-ink accent-[hsl(var(--ink))] focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section aria-labelledby="dokumen" className="space-y-3">
      <div className="space-y-1">
        <h2 id="dokumen" className="text-section">
          Dokumen usaha
        </h2>
        <p className="text-body text-muted-foreground">
          Tandai yang sudah Anda punya. Ini langsung mengubah skor di atas.
        </p>
      </div>

      <form
        action={simpanDokumen}
        className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-card"
      >
        <label className="flex min-h-touch cursor-pointer items-start gap-3">
          <input type="checkbox" name="nib" defaultChecked={punyaNib} className={kotak} />
          <span>
            <span className="block text-label">NIB — Nomor Induk Berusaha</span>
            <span className="block text-caption text-muted-foreground">
              Gratis lewat oss.go.id, biasanya terbit hari itu juga. Bernilai 5 poin.
            </span>
          </span>
        </label>

        <label className="flex min-h-touch cursor-pointer items-start gap-3">
          <input type="checkbox" name="npwp" defaultChecked={punyaNpwp} className={kotak} />
          <span>
            <span className="block text-label">NPWP usaha</span>
            <span className="block text-caption text-muted-foreground">
              Gratis lewat kantor pajak terdekat atau coretaxdjp.pajak.go.id. Bernilai 5 poin.
            </span>
          </span>
        </label>

        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Simpan tanda dokumen
        </Button>
      </form>

      <div className="flex gap-2 rounded-lg border border-border bg-muted p-3">
        <Sparkles className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <p className="text-caption text-muted-foreground">
          Selain dua di atas, petugas bank biasanya juga meminta KTP dan kartu keluarga.
          Keduanya tidak masuk hitungan skor karena hampir semua pemilik usaha sudah
          memilikinya.
        </p>
      </div>
    </section>
  );
}

// ── Penyangkalan ────────────────────────────────────────────────────────────

/** FR5.7. Wajib ada, dan tidak ditulis sebagai catatan kaki kecil: yang dibaca
 *  juri dan calon pengguna adalah angka besar di atas, jadi batasannya harus
 *  punya berat visual yang sepadan. */
function Penyangkalan() {
  return (
    <section
      aria-labelledby="penyangkalan"
      className="rounded-lg border border-border-strong bg-muted p-4"
    >
      <div className="flex gap-3">
        <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="min-w-0 space-y-2">
          <h2 id="penyangkalan" className="text-label">
            Skor ini indikatif, bukan keputusan kredit
          </h2>
          <p className="text-body text-muted-foreground">
            Angka di halaman ini dihitung dari catatan yang Anda masukkan sendiri, memakai
            kriteria yang umum dipakai bank penyalur KUR. Naik Kelas bukan bank dan tidak
            mewakili bank mana pun. Keputusan pemberian kredit sepenuhnya ada pada bank
            penyalur, yang memakai data dan pertimbangannya sendiri — termasuk riwayat
            kredit yang tidak terlihat oleh aplikasi ini.
          </p>
          <p className="text-body text-muted-foreground">
            Gunakan halaman ini untuk tahu apa yang perlu dibereskan sebelum mengajukan,
            bukan untuk memperkirakan diterima atau ditolak.
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/laporan">
              Siapkan laporan untuk dibawa ke bank
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
