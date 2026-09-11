"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { formatPersen, formatRupiah } from "@/lib/format";
import type { BarisMargin } from "@/lib/hitung";

/** Tujuh kolom angka di layar 360px.
 *
 *  Menggulir tabel tujuh kolom ke samping berarti pengguna tidak pernah melihat
 *  nama produk dan untungnya sekaligus — padahal itu satu-satunya pertanyaan
 *  yang dibawa ke halaman ini. Jadi lebarnya tidak dipaksakan; yang diubah
 *  adalah bentuknya:
 *
 *    ≥ 1024px  tabel tujuh kolom, kepala kolom bisa ditekan untuk mengurutkan
 *    < 1024px  satu kartu per produk. Tiga angka yang menentukan keputusan
 *              (terjual, omzet, untung) selalu terlihat; modal dan potongan —
 *              yang gunanya menjelaskan, bukan memutuskan — disembunyikan di
 *              balik <details> bawaan peramban.
 *
 *  Keduanya membaca data dan pengurutan yang sama persis, dari KOLOM di bawah,
 *  supaya tidak ada versi ponsel yang diam-diam ketinggalan satu kolom.
 *
 *  Data sudah dihitung di server (aturan keras 4). Komponen ini hanya
 *  mengurutkan apa yang sudah ada di layar — tidak ada aritmatika di sini. */

type KunciKolom = keyof Pick<
  BarisMargin,
  "nama" | "qty" | "omzet" | "hppTotal" | "potongan" | "marginNominal" | "marginPersen"
>;

type Kolom = {
  kunci: KunciKolom;
  label: string;
  /** Judul yang lebih jelas saat berdiri sendiri di kartu ponsel. */
  labelPanjang?: string;
  angka: boolean;
};

const KOLOM: Kolom[] = [
  { kunci: "nama", label: "Produk", angka: false },
  { kunci: "qty", label: "Terjual", angka: true },
  { kunci: "omzet", label: "Omzet", angka: true },
  { kunci: "hppTotal", label: "Modal", labelPanjang: "Modal semua porsi", angka: true },
  { kunci: "potongan", label: "Potongan", labelPanjang: "Potongan platform", angka: true },
  { kunci: "marginNominal", label: "Untung", angka: true },
  { kunci: "marginPersen", label: "Untung %", angka: true },
];

type Arah = "naik" | "turun";

export function TabelMargin({ baris }: { baris: BarisMargin[] }) {
  // Omzet turun sebagai bawaan: produk terbesarlah yang paling berdampak kalau
  // ternyata marginnya tipis.
  const [kunci, setKunci] = useState<KunciKolom>("omzet");
  const [arah, setArah] = useState<Arah>("turun");

  const terurut = useMemo(() => urutkan(baris, kunci, arah), [baris, kunci, arah]);

  function pilih(k: KunciKolom) {
    if (k === kunci) return setArah((a) => (a === "naik" ? "turun" : "naik"));
    setKunci(k);
    // Nama dimulai dari A, angka dimulai dari yang terbesar. Menekan "Omzet"
    // lalu mendapat produk terkecil di atas adalah kejutan yang tidak berguna.
    setArah(k === "nama" ? "naik" : "turun");
  }

  return (
    <div className="space-y-3">
      {/* Pengurutan di ponsel. Kepala kolom yang bisa ditekan tidak ada di
          tata letak kartu, jadi kendalinya dipisah — bukan dihilangkan. */}
      <div className="flex items-end gap-2 lg:hidden">
        <label className="block min-w-0 flex-1 space-y-1">
          <span className="text-label text-muted-foreground">Urutkan menurut</span>
          <select
            value={kunci}
            onChange={(e) => pilih(e.target.value as KunciKolom)}
            className="h-touch w-full rounded-md border border-input bg-card px-3 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {KOLOM.map((k) => (
              <option key={k.kunci} value={k.kunci}>
                {k.labelPanjang ?? k.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => setArah((a) => (a === "naik" ? "turun" : "naik"))}
          className="inline-flex h-touch items-center gap-1 rounded-md border border-border-strong bg-card px-3 text-label"
        >
          {arah === "naik" ? (
            <ArrowUp className="size-4" aria-hidden />
          ) : (
            <ArrowDown className="size-4" aria-hidden />
          )}
          {arah === "naik" ? "Terkecil dulu" : "Terbesar dulu"}
        </button>
      </div>

      {/* ── Ponsel: satu kartu per produk ── */}
      <ul className="space-y-3 lg:hidden">
        {terurut.map((b, i) => (
          <KartuProduk key={`${b.produkId ?? b.nama}-${i}`} baris={b} />
        ))}
      </ul>

      {/* ── Desktop: tabel tujuh kolom ── */}
      <div className="hidden lg:block">
        <div className="table-scroll rounded-lg">
          <div className="min-w-[720px] overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full caption-bottom text-body">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="border-b">
                  {KOLOM.map((k) => (
                    <th
                      key={k.kunci}
                      scope="col"
                      // aria-sort membuat pembaca layar menyebutkan kolom mana
                      // yang sedang jadi dasar urutan, bukan hanya panahnya.
                      aria-sort={
                        kunci !== k.kunci
                          ? "none"
                          : arah === "naik"
                            ? "ascending"
                            : "descending"
                      }
                      className={[
                        "h-touch p-0 align-middle",
                        k.kunci === "nama" ? "sticky left-0 z-20 bg-muted text-left" : "text-right",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => pilih(k.kunci)}
                        className={[
                          "inline-flex h-touch w-full items-center gap-1 px-3 text-label hover:text-foreground",
                          k.kunci === "nama" ? "justify-start" : "justify-end",
                          kunci === k.kunci ? "text-foreground" : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {k.label}
                        {kunci !== k.kunci ? (
                          <ChevronsUpDown className="size-4 opacity-50" aria-hidden />
                        ) : arah === "naik" ? (
                          <ArrowUp className="size-4" aria-hidden />
                        ) : (
                          <ArrowDown className="size-4" aria-hidden />
                        )}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {terurut.map((b, i) => {
                  const rugi = b.marginNominal !== null && b.marginNominal < 0;
                  return (
                    <tr
                      key={`${b.produkId ?? b.nama}-${i}`}
                      className={[
                        "group h-touch-lg border-b last:border-0",
                        rugi ? "bg-negative-soft" : "even:bg-muted/40",
                      ].join(" ")}
                    >
                      <th
                        scope="row"
                        className={[
                          "sticky left-0 z-10 max-w-[220px] px-3 py-3 text-left font-medium",
                          rugi
                            ? "border-l-4 border-l-negative bg-negative-soft"
                            : "bg-card group-even:bg-muted/40",
                        ].join(" ")}
                      >
                        <span className="block truncate">{b.nama}</span>
                        {b.alasanKosong && (
                          <span className="block text-caption font-normal text-unknown">
                            {b.alasanKosong}
                          </span>
                        )}
                      </th>
                      <td className="num px-3 py-3 text-right">{b.qty}</td>
                      <td className="num px-3 py-3 text-right">{formatRupiah(b.omzet)}</td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        <Angka nilai={b.hppTotal} />
                      </td>
                      <td className="num px-3 py-3 text-right text-muted-foreground">
                        {b.potongan > 0 ? `−${formatRupiah(Math.round(b.potongan))}` : "—"}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <Untung nilai={b.marginNominal} />
                      </td>
                      <td className="px-3 py-3 text-right">
                        {b.marginPersen === null ? (
                          <span className="text-caption text-unknown">—</span>
                        ) : (
                          <span
                            className={
                              b.marginPersen < 0
                                ? "num font-semibold text-negative"
                                : "num text-positive"
                            }
                          >
                            {formatPersen(b.marginPersen)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-caption text-muted-foreground">
        Potongan memakai persentase komisi yang diatur per kanal, bukan potongan
        yang tertulis di laporan harian — potongan di laporan berubah tiap hari
        karena promo.
      </p>
    </div>
  );
}

// ── Kartu ponsel ────────────────────────────────────────────────────────────

function KartuProduk({ baris }: { baris: BarisMargin }) {
  const rugi = baris.marginNominal !== null && baris.marginNominal < 0;

  return (
    <li
      className={[
        "overflow-hidden rounded-lg border",
        rugi ? "border-negative border-l-4 bg-negative-soft" : "border-border bg-card",
      ].join(" ")}
    >
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 break-words font-medium">{baris.nama}</span>
            {/* Warna tidak pernah jadi satu-satunya penanda: ada kata "Rugi",
                dan angkanya sendiri bertanda minus. */}
            {rugi && <Badge variant="negative">Rugi</Badge>}
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-caption text-muted-foreground">
                {baris.qty} terjual · omzet
              </p>
              <p className="num text-body">{formatRupiah(baris.omzet)}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-caption text-muted-foreground">Untung</p>
              <p
                className={
                  baris.marginNominal === null
                    ? "text-body text-unknown"
                    : rugi
                      ? "num text-section text-negative"
                      : "num text-section text-positive"
                }
              >
                {baris.marginNominal === null
                  ? "Belum bisa dihitung"
                  : formatRupiah(Math.round(baris.marginNominal))}
              </p>
              {baris.marginPersen !== null && (
                <p className={`num text-caption ${rugi ? "text-negative" : "text-muted-foreground"}`}>
                  {formatPersen(baris.marginPersen)}
                </p>
              )}
            </div>
          </div>

          <span className="text-caption text-muted-foreground underline underline-offset-4 group-open:hidden">
            Lihat rincian modal
          </span>
          <span className="hidden text-caption text-muted-foreground underline underline-offset-4 group-open:inline">
            Tutup rincian
          </span>
        </summary>

        <dl className="space-y-2 border-t border-border px-3 py-3 text-body">
          <BarisRincian label="Modal semua porsi" nilai={baris.hppTotal} />
          <BarisRincian
            label="Potongan platform"
            nilai={baris.potongan > 0 ? -baris.potongan : 0}
          />
          {baris.alasanKosong && (
            <p className="text-caption text-unknown">{baris.alasanKosong}.</p>
          )}
        </dl>
      </details>
    </li>
  );
}

function BarisRincian({ label, nilai }: { label: string; nilai: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num shrink-0">
        <Angka nilai={nilai} />
      </dd>
    </div>
  );
}

// ── Penampil angka yang boleh kosong ────────────────────────────────────────

/** Sel tanpa data tidak pernah tampil sebagai 0 — nol berarti "tidak ada
 *  biayanya", dan itu keterangan yang berbeda dari "belum dihitung". */
function Angka({ nilai }: { nilai: number | null }) {
  if (nilai === null) return <span className="text-caption text-unknown">Belum ada</span>;
  const bulat = Math.round(nilai);
  return <>{bulat < 0 ? `−${formatRupiah(Math.abs(bulat))}` : formatRupiah(bulat)}</>;
}

function Untung({ nilai }: { nilai: number | null }) {
  if (nilai === null) return <span className="text-caption text-unknown">Belum bisa dihitung</span>;
  return (
    <span className={nilai < 0 ? "num font-semibold text-negative" : "num text-positive"}>
      {formatRupiah(Math.round(nilai))}
    </span>
  );
}

// ── Pengurutan ──────────────────────────────────────────────────────────────

/** Baris yang nilainya belum diketahui selalu turun ke bawah, apa pun arah
 *  urutannya. Memperlakukan null sebagai nol akan menempatkan produk yang
 *  modalnya belum diisi di antara produk yang benar-benar merugi. */
function urutkan(baris: BarisMargin[], kunci: KunciKolom, arah: Arah): BarisMargin[] {
  const tanda = arah === "naik" ? 1 : -1;

  return [...baris].sort((a, b) => {
    const x = a[kunci];
    const y = b[kunci];

    if (typeof x === "string" || typeof y === "string") {
      return tanda * String(x).localeCompare(String(y), "id");
    }
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return tanda * (x - y);
  });
}
