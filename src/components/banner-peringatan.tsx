"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { COOKIE_BANNER, type Peringatan } from "@/lib/ringkasan";

/** F11 — banner peringatan di atas dashboard.
 *
 *  Penutupnya disimpan di COOKIE, bukan localStorage: aturan keras 3 melarang
 *  localStorage dan sessionStorage, dan keduanya memang tidak cocok di sini —
 *  halaman ini dirender di server, jadi penandanya harus ikut permintaan supaya
 *  banner yang sudah ditutup tidak sempat terlukis lalu hilang.
 *
 *  Cookie-nya kedaluwarsa tengah malam waktu setempat, sesuai FR11.4: ditutup
 *  berarti "jangan ganggu hari ini", bukan "jangan pernah muncul lagi". Kondisi
 *  yang belum dibereskan akan muncul kembali besok pagi — dan memang harus,
 *  karena menu yang dijual di bawah modal tidak berhenti rugi hanya karena
 *  bannernya ditutup.
 */

function simpanTutup(kunci: string[]) {
  const besok = new Date();
  besok.setHours(24, 0, 0, 0); // tengah malam berikutnya, waktu setempat
  document.cookie = `${COOKIE_BANNER}=${kunci.join(".")}; path=/; expires=${besok.toUTCString()}; SameSite=Lax`;
}

const NADA = {
  amber: {
    kotak: "border-amber bg-amber-soft",
    ikon: "text-amber-foreground",
  },
  negative: {
    kotak: "border-negative bg-negative-soft",
    ikon: "text-negative",
  },
} as const;

export function BannerPeringatan({
  daftar,
  sudahTertutup,
}: {
  daftar: Peringatan[];
  /** Kunci yang sudah ditutup hari ini, dibaca dari cookie di server. */
  sudahTertutup: string[];
}) {
  const [tertutup, setTertutup] = useState<string[]>(sudahTertutup);
  const tampil = daftar.filter((p) => !tertutup.includes(p.kunci));

  if (tampil.length === 0) return null;

  return (
    <section aria-label="Perlu perhatian" className="space-y-3">
      {tampil.map((p) => {
        const nada = NADA[p.nada];
        return (
          <div key={p.kunci} className={`rounded-lg border p-4 ${nada.kotak}`}>
            <div className="flex gap-3">
              <AlertTriangle className={`mt-0.5 size-5 shrink-0 ${nada.ikon}`} aria-hidden />

              <div className="min-w-0 flex-1 space-y-2">
                <p className="text-label">{p.judul}</p>
                <p className="text-body text-muted-foreground">{p.isi}</p>
                <Button asChild variant="outline" size="sm">
                  <Link href={p.href}>
                    {p.aksi}
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>

              <button
                type="button"
                aria-label={`Tutup peringatan: ${p.judul}`}
                onClick={() => {
                  const baru = [...tertutup, p.kunci];
                  setTertutup(baru);
                  simpanTutup(baru);
                }}
                className="-m-2 size-touch shrink-0 rounded-md p-2 text-muted-foreground hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
