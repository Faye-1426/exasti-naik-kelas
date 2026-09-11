import Link from "next/link";
import { AlertTriangle, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { DaftarKelengkapan } from "@/components/penanda-kelengkapan";
import { TabelMargin } from "@/components/tabel-margin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPersen, formatRupiah } from "@/lib/format";
import {
  cakupan,
  kalimatCakupan,
  ringkasMargin,
  sorotan,
  type BarisMargin,
  type BarisPenjualan,
} from "@/lib/hitung";
import { kelengkapanKanal, periodeBulan } from "@/lib/parsing";
import { daftarKanal, daftarProduk } from "@/lib/produk-actions";
import { semuaBaris } from "@/lib/paginasi";
import { supabaseServer } from "@/lib/supabase";

/** F5 — analisis margin per produk.
 *
 *  Penyaring memakai form GET biasa, bukan state di klien: rentang tanggal
 *  mengubah kueri, jadi datanya memang harus diambil ulang di server. Untungnya
 *  ini juga membuat hasil penyaringan bisa ditandai, dibagikan, dan tombol
 *  kembali berfungsi seperti yang diharapkan. Yang dikerjakan di klien hanya
 *  pengurutan, karena datanya sudah ada di layar.
 *
 *  Aturan model data yang dijaga halaman ini: margin per produk HANYA dari
 *  tabel `sales`. `sales_totals` tidak pernah masuk ke tabel margin — ia hanya
 *  dipakai menghitung penanda cakupan, supaya pengguna tahu berapa bagian
 *  usahanya yang sebenarnya sedang dianalisis. */

export const dynamic = "force-dynamic";

type Cari = { kanal?: string; dari?: string; sampai?: string };

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export default async function Halaman({ searchParams }: { searchParams: Cari }) {
  const bulanIni = periodeBulan(new Date().toLocaleDateString("sv-SE"));
  const dari = TANGGAL.test(searchParams.dari ?? "") ? searchParams.dari! : bulanIni.mulai;
  const sampai = TANGGAL.test(searchParams.sampai ?? "") ? searchParams.sampai! : bulanIni.selesai;

  const supabase = supabaseServer();
  const [produk, kanal] = await Promise.all([daftarProduk(), daftarKanal()]);

  // Kanal dari URL hanya dipakai kalau memang milik usaha ini. Tanpa
  // pemeriksaan ini, id sembarangan di URL menghasilkan tabel kosong yang
  // terbaca seolah tidak ada penjualan.
  const kanalDipilih = kanal.find((k) => k.id === searchParams.kanal) ?? null;

  // Diambil per halaman: satu bulan penjualan warung yang ramai melewati batas
  // 1.000 baris PostgREST, dan balikan yang terpotong akan mengecilkan omzet
  // tanpa satu pun galat muncul. `order("id")` bukan hiasan — tanpa urutan yang
  // pasti, Postgres boleh memberi urutan berbeda tiap halaman dan ada baris yang
  // terhitung dua kali sementara yang lain hilang.
  const kanalId = kanalDipilih?.id;

  const [barisPenjualan, totalHarian] = await Promise.all([
    semuaBaris<BarisPenjualan>((d, s) => {
      const q = supabase
        .from("sales")
        .select("product_id, product_name_raw, quantity, total_amount, channel_id")
        .gte("sale_date", dari)
        .lte("sale_date", sampai)
        .order("id")
        .range(d, s);
      return kanalId ? q.eq("channel_id", kanalId) : q;
    }),
    // Dibaca hanya untuk penanda cakupan. Tidak satu pun angkanya masuk ke tabel
    // margin di bawah — total harian tidak tahu produk apa yang terjual.
    semuaBaris<{ channel_id: string; total_amount: number }>((d, s) => {
      const q = supabase
        .from("sales_totals")
        .select("channel_id, total_amount")
        .gte("sale_date", dari)
        .lte("sale_date", sampai)
        .order("id")
        .range(d, s);
      return kanalId ? q.eq("channel_id", kanalId) : q;
    }),
  ]);

  const baris = ringkasMargin(barisPenjualan, produk, kanal);
  const liput = cakupan(barisPenjualan, totalHarian, kanal);
  const puncak = sorotan(baris);

  // F10 per kanal. Saat penyaring kanal aktif, hanya kanal itu yang barisnya
  // diambil — mendaftar seluruh kanal di sini akan menandai sisanya "belum ada
  // data" padahal datanya memang tidak diminta.
  const kelengkapan = kelengkapanKanal(
    barisPenjualan,
    totalHarian,
    kanalDipilih ? [kanalDipilih] : kanal,
  );

  const belumTerhitung = baris.filter((b) => b.marginNominal === null).length;

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="space-y-1">
        <h1 className="text-title">Margin</h1>
        <p className="text-caption text-muted-foreground">
          Untung per produk, dipisah per kanal jualan.
        </p>
      </header>

      {/* WAJIB dan selalu di atas tabel: tanpa ini, angka di bawah terbaca
          seolah mewakili seluruh usaha. */}
      <section
        aria-labelledby="cakupan"
        className={[
          "rounded-lg border p-4",
          liput.kanalTanpaRincian.length > 0 ? "border-amber bg-amber-soft" : "border-border bg-muted",
        ].join(" ")}
      >
        <div className="flex gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="min-w-0 space-y-2">
            <h2 id="cakupan" className="text-label">
              Seberapa lengkap analisis ini
            </h2>
            <p className="text-body">{kalimatCakupan(liput)}</p>
            {liput.persen !== null && (
              <p className="text-caption text-muted-foreground">
                {formatRupiah(liput.omzetTerinci)} dari {formatRupiah(liput.omzetTotal)} omzet
                punya rincian per produk.
              </p>
            )}
          </div>
        </div>

        {/* FR10.2 — penanda per kanal. Bentuk dan teks, bukan warna saja.
            Kanal bertingkat Sebagian membawa tautan langsung ke jalur suara. */}
        <div className="mt-4">
          <h3 className="sr-only">Kelengkapan per kanal</h3>
          <DaftarKelengkapan daftar={kelengkapan} />
        </div>
      </section>

      <Penyaring kanal={kanal} dipilih={kanalDipilih?.id ?? ""} dari={dari} sampai={sampai} />

      {baris.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-center">
          <p className="text-section">Belum ada penjualan berrincian</p>
          <p className="mx-auto mt-1 max-w-md text-body text-muted-foreground">
            Pada rentang ini belum ada penjualan yang tercatat per produk. Margin
            per produk hanya bisa dihitung dari penjualan yang ada rincian
            itemnya — total harian saja belum cukup.
          </p>
          <Button asChild variant="amber" size="lg" className="mt-4">
            <Link href="/tambah">Catat penjualan</Link>
          </Button>
        </div>
      ) : (
        <>
          <section aria-labelledby="sorotan" className="space-y-3">
            <h2 id="sorotan" className="text-section">
              Yang perlu dilihat
            </h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <KartuSorotan
                Ikon={TrendingUp}
                label="Paling untung"
                baris={puncak.palingUntung}
                nada="positive"
                kosong="Belum ada produk yang untungnya bisa dihitung."
              />
              <KartuSorotan
                Ikon={TrendingDown}
                label="Paling rugi"
                baris={puncak.palingRugi}
                nada="negative"
                kosong="Tidak ada produk yang rugi pada rentang ini."
              />
              <KartuSorotan
                Ikon={Wallet}
                label="Penyumbang omzet terbesar"
                baris={puncak.penyumbangOmzet}
                nada="netral"
                kosong="Belum ada omzet tercatat."
                pakaiOmzet
              />
            </div>
          </section>

          <section aria-labelledby="tabel" className="space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="tabel" className="text-section">
                {baris.length} produk terjual
              </h2>
              {belumTerhitung > 0 && (
                <Badge variant="unknown">{belumTerhitung} belum bisa dihitung</Badge>
              )}
            </div>

            <TabelMargin baris={baris} />
          </section>
        </>
      )}
    </div>
  );
}

// ── Penyaring ───────────────────────────────────────────────────────────────

/** Form GET biasa. Tidak ada JavaScript yang perlu dimuat supaya penyaring ini
 *  bekerja, dan hasilnya punya URL sendiri. */
function Penyaring({
  kanal,
  dipilih,
  dari,
  sampai,
}: {
  kanal: { id: string; name: string }[];
  dipilih: string;
  dari: string;
  sampai: string;
}) {
  const kelas =
    "h-touch w-full rounded-md border border-input bg-card px-3 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <form
      method="get"
      aria-label="Saring analisis margin"
      className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto] lg:items-end"
    >
      <label className="block space-y-1">
        <span className="text-label text-muted-foreground">Kanal</span>
        <select name="kanal" defaultValue={dipilih} className={kelas}>
          <option value="">Semua kanal</option>
          {kanal.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-label text-muted-foreground">Dari tanggal</span>
        <input type="date" name="dari" defaultValue={dari} className={`num ${kelas}`} />
      </label>

      <label className="block space-y-1">
        <span className="text-label text-muted-foreground">Sampai tanggal</span>
        <input type="date" name="sampai" defaultValue={sampai} className={`num ${kelas}`} />
      </label>

      <Button type="submit" size="lg" className="sm:col-span-2 lg:col-span-1">
        Terapkan
      </Button>
    </form>
  );
}

// ── Kartu sorotan ───────────────────────────────────────────────────────────

function KartuSorotan({
  Ikon,
  label,
  baris,
  nada,
  kosong,
  pakaiOmzet,
}: {
  Ikon: typeof TrendingUp;
  label: string;
  baris: BarisMargin | null;
  nada: "positive" | "negative" | "netral";
  kosong: string;
  pakaiOmzet?: boolean;
}) {
  const warna =
    nada === "positive" ? "text-positive" : nada === "negative" ? "text-negative" : "text-foreground";

  return (
    <div
      className={[
        "rounded-lg border p-4",
        nada === "negative" && baris ? "border-negative bg-negative-soft" : "border-border bg-card",
      ].join(" ")}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Ikon className="size-5 shrink-0" aria-hidden />
        <p className="text-label">{label}</p>
      </div>

      {!baris ? (
        <p className="mt-2 text-body text-unknown">{kosong}</p>
      ) : (
        <>
          <p className="mt-2 break-words text-section">{baris.nama}</p>
          <p className={`num mt-1 text-metric ${pakaiOmzet ? "text-foreground" : warna}`}>
            {pakaiOmzet
              ? formatRupiah(baris.omzet)
              : formatRupiah(Math.round(baris.marginNominal ?? 0))}
          </p>
          <p className="text-caption text-muted-foreground">
            {pakaiOmzet
              ? `${baris.qty} terjual`
              : `${formatPersen(baris.marginPersen)} · ${baris.qty} terjual`}
          </p>
        </>
      )}
    </div>
  );
}
