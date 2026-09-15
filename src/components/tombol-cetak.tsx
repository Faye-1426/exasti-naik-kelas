"use client";

import { FileDown, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Dua tombol, satu mekanisme: `window.print()`.
 *
 *  Peramban TIDAK punya API "simpan sebagai PDF" yang berdiri sendiri. PDF
 *  adalah salah satu TUJUAN di dalam dialog cetak bawaan, bukan aksi tersendiri,
 *  jadi kedua tombol ini memang membuka dialog yang sama. Itu dikatakan apa
 *  adanya di keterangan bawah form, bukan dibiarkan jadi kejutan setelah
 *  ditekan.
 *
 *  Memisahkannya tetap berguna: yang mau mengirim laporan lewat WhatsApp dan
 *  yang mau membawanya ke tukang fotokopi datang dengan niat berbeda, dan satu
 *  label gabungan "Cetak atau simpan PDF" memaksa keduanya membaca kalimat
 *  panjang untuk menemukan miliknya.
 *
 *  Simpan PDF yang jadi aksi utama (amber), bukan Cetak: penggunanya memegang
 *  ponsel Android, dan warung tidak punya pencetak. */
export function TombolCetak() {
  return (
    <>
      <Button type="button" variant="amber" size="lg" onClick={() => window.print()}>
        <FileDown aria-hidden />
        Simpan PDF
      </Button>
      <Button type="button" variant="outline" size="lg" onClick={() => window.print()}>
        <Printer aria-hidden />
        Cetak
      </Button>
    </>
  );
}
