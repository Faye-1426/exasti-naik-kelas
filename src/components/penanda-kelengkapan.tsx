import Link from "next/link";
import { CircleCheck, CircleDashed, CircleSlash, Mic } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import type { KelengkapanKanal, TingkatData } from "@/lib/parsing";

/** F10 — penanda tingkat kelengkapan data per kanal.
 *
 *  TIDAK BOLEH mengandalkan warna saja. Tiap tingkat punya tiga penanda yang
 *  berdiri sendiri: BENTUK ikon (bulat penuh, bulat putus-putus, bulat
 *  tercoret), TEKS tingkatnya, dan baru warna sebagai lapis ketiga. Difotokopi
 *  hitam putih untuk berkas pengajuan ke bank pun masih terbaca — dan satu dari
 *  dua belas pembaca laki-laki tidak bisa membedakan hijau dan merah. */

const TAMPILAN: Record<
  TingkatData,
  { label: string; Ikon: typeof CircleCheck; kelas: string; jelas: string }
> = {
  complete: {
    label: "Lengkap",
    Ikon: CircleCheck,
    kelas: "border-positive/40 bg-positive-soft text-positive",
    jelas: "Semua penjualan kanal ini ada rincian barangnya.",
  },
  partial: {
    label: "Sebagian",
    Ikon: CircleDashed,
    kelas: "border-amber bg-amber-soft text-amber-foreground",
    jelas: "Omzetnya tercatat, tapi belum tahu barang apa saja yang terjual.",
  },
  empty: {
    label: "Belum ada data",
    Ikon: CircleSlash,
    kelas: "border-border-strong bg-unknown-soft text-unknown",
    jelas: "Belum ada penjualan tercatat di kanal ini pada rentang ini.",
  },
};

/** Penanda ringkas untuk ditempel di samping nama kanal. */
export function PenandaKelengkapan({ tingkat }: { tingkat: TingkatData }) {
  const t = TAMPILAN[tingkat];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-caption font-medium ${t.kelas}`}
    >
      <t.Ikon className="size-4 shrink-0" aria-hidden />
      {t.label}
    </span>
  );
}

/**
 * Daftar kanal beserta tingkat kelengkapannya (FR10.2).
 *
 * Kanal `partial` mendapat ajakan mencoba input suara dengan tautan LANGSUNG ke
 * jalur D beserta kanalnya (FR10.3) — bukan ke /tambah polos, karena pengguna
 * yang sampai ke sini sudah tahu kanal mana yang bolong dan tidak perlu
 * memilihnya lagi.
 *
 * Yang TIDAK ada di sini, dan tidak boleh pernah ada: angka perkiraan rincian.
 * Kanal `partial` hanya menampilkan berapa omzet yang belum terinci. Berapa
 * porsi es teh di dalamnya tidak diketahui, jadi tidak ditulis.
 */
export function DaftarKelengkapan({
  daftar,
  ringkas,
}: {
  daftar: KelengkapanKanal[];
  /** true di dashboard: tanpa keterangan panjang, hanya baris kanal. */
  ringkas?: boolean;
}) {
  return (
    <ul className="space-y-2">
      {daftar.map((k) => {
        const t = TAMPILAN[k.tingkat];
        const belumRinci = k.omzetTotal - k.omzetTerinci;

        return (
          <li
            key={k.kanal.id}
            className="rounded-lg border border-border bg-card p-3 shadow-card"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-label">{k.kanal.name}</span>
              <PenandaKelengkapan tingkat={k.tingkat} />
            </div>

            {k.tingkat === "empty" ? (
              !ringkas && <p className="mt-1 text-caption text-muted-foreground">{t.jelas}</p>
            ) : (
              <p className="num mt-1 text-caption text-muted-foreground">
                {formatRupiah(k.omzetTotal)} omzet
                {k.tingkat === "partial"
                  ? ` · ${formatRupiah(belumRinci)} belum ada rinciannya`
                  : " · seluruhnya terinci"}
              </p>
            )}

            {k.tingkat === "partial" && (
              <div className="mt-2 space-y-2">
                {!ringkas && (
                  <p className="text-caption text-muted-foreground">
                    Untung per menu di kanal ini belum bisa dihitung. Sistem tidak
                    menebaknya dari kanal lain.
                  </p>
                )}
                <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                  <Link href={`/tambah?jalur=voice_input&kanal=${k.kanal.id}`}>
                    <Mic aria-hidden />
                    Sebutkan lewat suara
                  </Link>
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
