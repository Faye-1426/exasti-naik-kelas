"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** F1-D — transkripsi di sisi peramban dengan Web Speech API.
 *
 *  Model bahasa TIDAK dipakai untuk memperbaiki transkripsi di sini. "ayam ge
 *  prek" dibiarkan apa adanya dan dicocokkan ke master produk di sisi prompt
 *  Gemini (PRD F1-D). Yang penting di layar ini: hasilnya terlihat dan bisa
 *  disunting sebelum dikirim. */

// Web Speech API belum masuk lib.dom TypeScript. Hanya bagian yang dipakai.
type HasilUcapan = {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
  resultIndex: number;
};
type Pengenal = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: HasilUcapan) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type PembuatPengenal = new () => Pengenal;

function ambilPembuat(): PembuatPengenal | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: PembuatPengenal;
    webkitSpeechRecognition?: PembuatPengenal;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** null selama render pertama (server dan hidrasi), lalu true/false.
 *  FR1.D.7: peramban tanpa dukungan tidak boleh melihat tombolnya sama sekali. */
export function useDukunganSuara(): boolean | null {
  const [didukung, setDidukung] = useState<boolean | null>(null);
  useEffect(() => setDidukung(ambilPembuat() !== null), []);
  return didukung;
}

const CONTOH =
  "Hari ini nasi goreng lima belas, es teh dua puluh tiga, ayam geprek delapan, sama tujuh es jeruk";

export function RekamSuara({
  nilai,
  onUbah,
}: {
  nilai: string;
  onUbah: (teks: string) => void;
}) {
  const [merekam, setMerekam] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const pengenalRef = useRef<Pengenal | null>(null);
  // Teks yang sudah final saat perekaman ini dimulai. Hasil sementara ditempel
  // di belakangnya supaya suntingan pengguna sebelumnya tidak tertimpa.
  const dasarRef = useRef("");

  useEffect(() => () => pengenalRef.current?.stop(), []);

  function mulai() {
    const Pembuat = ambilPembuat();
    if (!Pembuat) return;

    setGalat(null);
    dasarRef.current = nilai ? `${nilai.trim()} ` : "";

    const p = new Pembuat();
    p.lang = "id-ID";
    p.continuous = true;
    p.interimResults = true;

    p.onresult = (e) => {
      let teks = "";
      for (let i = 0; i < e.results.length; i++) {
        teks += e.results[i][0].transcript;
      }
      onUbah(dasarRef.current + teks);
    };
    p.onerror = (e) => {
      setGalat(
        e.error === "not-allowed"
          ? "Izin mikrofon ditolak. Aktifkan dulu di pengaturan peramban, atau ketik saja."
          : "Perekaman terputus. Coba lagi, atau ketik saja teksnya.",
      );
      setMerekam(false);
    };
    p.onend = () => setMerekam(false);

    pengenalRef.current = p;
    p.start();
    setMerekam(true);
  }

  function berhenti() {
    pengenalRef.current?.stop();
    setMerekam(false);
  }

  return (
    <div className="space-y-4">
      {/* Contoh kalimat hanya saat belum ada apa-apa — sesudah itu jadi gangguan. */}
      {!nilai && !merekam && (
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="text-label">Sebutkan seperti ini:</p>
          <p className="mt-1 text-body text-muted-foreground">&ldquo;{CONTOH}&rdquo;</p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3 py-2">
        <Button
          type="button"
          variant={merekam ? "destructive" : "amber"}
          onClick={merekam ? berhenti : mulai}
          aria-label={merekam ? "Berhenti merekam" : "Mulai merekam"}
          className="size-28 flex-col gap-1 rounded-full [&_svg]:size-9"
        >
          {merekam ? <Square aria-hidden /> : <Mic aria-hidden />}
          <span className="text-label">{merekam ? "Berhenti" : "Mulai bicara"}</span>
        </Button>

        {/* Indikator perekaman: gerak DAN teks. Gerak saja tidak terbaca kalau
            pengguna mematikan animasi. */}
        <p aria-live="polite" className="flex items-center gap-2 text-body">
          {merekam ? (
            <>
              <span className="size-3 animate-pulse rounded-full bg-negative" aria-hidden />
              Sedang mendengarkan…
            </>
          ) : (
            <span className="text-muted-foreground">
              {nilai ? "Selesai. Periksa teksnya di bawah." : "Tekan tombol lalu sebutkan penjualan hari ini."}
            </span>
          )}
        </p>
      </div>

      {galat && (
        <p role="alert" className="rounded-lg bg-negative-soft px-4 py-3 text-body text-negative">
          {galat}
        </p>
      )}

      {(nilai || merekam) && (
        <div className="space-y-2">
          <Label htmlFor="transkripsi">Yang terdengar (boleh diperbaiki dulu)</Label>
          <Textarea
            id="transkripsi"
            value={nilai}
            onChange={(e) => onUbah(e.target.value)}
            rows={4}
            placeholder="Teks hasil rekaman muncul di sini"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              berhenti();
              onUbah("");
              setGalat(null);
            }}
          >
            <RotateCcw aria-hidden />
            Ulang rekam
          </Button>
        </div>
      )}
    </div>
  );
}
