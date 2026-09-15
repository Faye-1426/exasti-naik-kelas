"use client";

import { useState, useTransition } from "react";
import {
  ArrowRight,
  ChevronsUp,
  Equal,
  Info,
  Lightbulb,
  Loader2,
  Minus,
  RefreshCw,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { muatUlangInsight } from "@/lib/insight-actions";
import type { ButirInsight, HasilInsight, Prioritas } from "@/lib/gemini";
import type { InsightTersimpan } from "@/lib/ringkasan";

/** F7 — Panel Insight Mingguan.
 *
 *  Panel ini TIDAK PERNAH memanggil Gemini sendiri saat dipasang. Insight yang
 *  sudah ada dibaca server dari tabel `insights`; yang belum ada menunggu tombol
 *  (FR7.4, FR7.5). Memanggil otomatis tiap halaman dibuka berarti satu tagihan
 *  API untuk setiap kali pengguna menekan tombol kembali.
 *
 *  Prioritas ditandai IKON + KATA, bukan warna saja: satu dari dua belas pembaca
 *  laki-laki tidak membedakan merah dan hijau, dan panel ini juga ikut
 *  difotokopi ke berkas pengajuan.
 */

const PRIORITAS: Record<Prioritas, { label: string; Ikon: typeof ChevronsUp; kelas: string }> = {
  high: {
    label: "Perlu segera",
    Ikon: ChevronsUp,
    kelas: "border-negative/40 bg-negative-soft text-negative",
  },
  medium: {
    label: "Sebaiknya dikerjakan",
    Ikon: Equal,
    kelas: "border-amber bg-amber-soft text-amber-foreground",
  },
  low: {
    label: "Kalau sempat",
    Ikon: Minus,
    kelas: "border-border-strong bg-muted text-muted-foreground",
  },
};

const waktuSingkat = (iso: string) =>
  new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long" });

export function PanelInsight({
  awal,
  aiSiap,
}: {
  awal: InsightTersimpan | null;
  /** GEMINI_API_KEY terpasang di server. Diperiksa di server supaya kuncinya
   *  tidak pernah ikut ke klien — hanya jawaban ya/tidak ini. */
  aiSiap: boolean;
}) {
  const [hasil, setHasil] = useState<HasilInsight | null>(awal?.hasil ?? null);
  const [dibuat, setDibuat] = useState<string | null>(awal?.dibuat ?? null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memproses, mulai] = useTransition();

  function jalankan() {
    setGalat(null);
    mulai(async () => {
      const balasan = await muatUlangInsight();
      if (balasan.ok) {
        setHasil(balasan.hasil);
        setDibuat(new Date().toISOString());
      } else {
        setGalat(balasan.galat);
      }
    });
  }

  return (
    <section aria-labelledby="insight" className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <h2 id="insight" className="flex items-center gap-2 text-section">
            <Lightbulb className="size-5 shrink-0 text-ink" aria-hidden />
            Yang terlihat dari angka bulan ini
          </h2>
          <p className="text-caption text-muted-foreground">
            {dibuat
              ? `Dibuat ${waktuSingkat(dibuat)} dari catatan Anda sendiri.`
              : "Dibuat dari ringkasan angka Anda sendiri, bukan dari data usaha lain."}
          </p>
        </div>

        {aiSiap && hasil && (
          <Button type="button" variant="outline" size="sm" onClick={jalankan} disabled={memproses}>
            {memproses ? <Loader2 className="gerak-proses animate-spin" aria-hidden /> : <RefreshCw aria-hidden />}
            {memproses ? "Sedang dibaca…" : "Muat ulang"}
          </Button>
        )}
      </div>

      {galat && (
        <p role="alert" className="rounded-lg bg-negative-soft px-4 py-3 text-body text-negative">
          {galat}
        </p>
      )}

      {!aiSiap ? (
        <p className="rounded-lg border border-dashed border-border-strong p-5 text-body text-muted-foreground">
          Panel ini belum bisa dipakai karena kunci AI belum dipasang di server. Seluruh angka
          di halaman ini tetap benar tanpa panel ini — yang belum ada hanya penjelasannya.
        </p>
      ) : !hasil ? (
        <div className="space-y-3 rounded-lg border border-dashed border-border-strong p-5">
          <p className="text-body text-muted-foreground">
            Belum dibuat untuk bulan ini. Sistem meringkas angka bulan berjalan — uang masuk
            per kanal, untung per menu, dan skor KUR — lalu menuliskan apa yang terlihat
            beserta langkah yang bisa Anda kerjakan.
          </p>
          <Button type="button" variant="amber" size="lg" onClick={jalankan} disabled={memproses}>
            {memproses ? (
              <>
                <Loader2 className="gerak-proses animate-spin" aria-hidden />
                Sedang dibaca…
              </>
            ) : (
              <>
                <Lightbulb aria-hidden />
                Buat insight bulan ini
              </>
            )}
          </Button>
          {memproses && (
            <p aria-live="polite" className="text-caption text-muted-foreground">
              Butuh beberapa detik. Tidak ada satu pun angka pembukuan yang berubah karena ini.
            </p>
          )}
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {hasil.insights.map((b, i) => (
              <Butir key={i} butir={b} />
            ))}
          </ul>

          {hasil.data_limitations.length > 0 && (
            // FR7.6 — keterbatasan data ditulis sebagai bagian panel, bukan
            // catatan kaki: pembaca yang melewatkannya akan mengira analisis ini
            // mencakup seluruh usahanya.
            <div className="flex gap-3 rounded-lg border border-border bg-muted p-4">
              <Info className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 space-y-1">
                <p className="text-label">Yang belum terlihat di angka ini</p>
                <ul className="list-disc space-y-1 pl-4 text-body text-muted-foreground">
                  {hasil.data_limitations.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Butir({ butir }: { butir: ButirInsight }) {
  const p = PRIORITAS[butir.priority];

  return (
    <li className="rounded-lg border border-border bg-card p-4 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="text-label">{butir.title}</p>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-0.5 text-caption font-medium ${p.kelas}`}
        >
          <p.Ikon className="size-4 shrink-0" aria-hidden />
          {p.label}
        </span>
      </div>

      <dl className="mt-3 space-y-2 text-body">
        <Bagian Ikon={Search} label="Yang terlihat" isi={butir.finding} />
        {butir.cause && <Bagian Ikon={ArrowRight} label="Kenapa" isi={butir.cause} />}
        <Bagian Ikon={Lightbulb} label="Yang bisa dikerjakan" isi={butir.action} tebal />
      </dl>
    </li>
  );
}

function Bagian({
  Ikon,
  label,
  isi,
  tebal,
}: {
  Ikon: typeof Search;
  label: string;
  isi: string;
  tebal?: boolean;
}) {
  return (
    <div className={tebal ? "rounded-md border-l-2 border-ink bg-ink-soft p-3" : ""}>
      <dt className="flex items-center gap-1.5 text-caption font-medium text-muted-foreground">
        <Ikon className="size-4 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="mt-0.5">{isi}</dd>
    </div>
  );
}
