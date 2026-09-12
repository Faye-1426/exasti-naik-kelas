"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/** Satu-satunya bagian klien di halaman laporan: `window.print()`.
 *
 *  Dialog cetak bawaan peramban sudah punya "Simpan sebagai PDF" di Android
 *  maupun desktop, jadi tombol ini menghasilkan berkas PDF tanpa satu baris
 *  pustaka PDF pun ikut diunduh pemilik warung. */
export function TombolCetak() {
  return (
    <Button type="button" variant="amber" size="lg" onClick={() => window.print()}>
      <Printer aria-hidden />
      Cetak atau simpan PDF
    </Button>
  );
}
