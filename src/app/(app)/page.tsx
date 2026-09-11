import Link from "next/link";
import { FileText } from "lucide-react";

import { KartuMetrik } from "@/components/kartu-metrik";
import { DaftarKelengkapan } from "@/components/penanda-kelengkapan";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/format";
import { semuaBaris } from "@/lib/paginasi";
import { kelengkapanKanal, periodeBulan } from "@/lib/parsing";
import { daftarKanal } from "@/lib/produk-actions";
import { supabaseServer } from "@/lib/supabase";

/** CONTOH TAMPILAN — angka statis untuk menguji keterbacaan.
 *  Belum ada logika, belum ada basis data. Baris "GoFood" sengaja bertingkat
 *  `partial`: ada omzet, tidak ada rincian item, jadi untungnya belum bisa
 *  dihitung dan ditampilkan sebagai teks, bukan angka 0. */
const CONTOH = [
  { tgl: "3 Sep", kanal: "Offline", omzet: 1_240_000, untung: 372_000 },
  { tgl: "2 Sep", kanal: "Offline", omzet: 980_000, untung: 294_000 },
  { tgl: "2 Sep", kanal: "GoFood", omzet: 1_450_000, untung: null },
  { tgl: "1 Sep", kanal: "Offline", omzet: 1_115_000, untung: 334_500 },
  { tgl: "31 Agu", kanal: "ShopeeFood", omzet: 720_000, untung: -45_000 },
];

export const dynamic = "force-dynamic";

export default async function Ringkasan() {
  // F10 sudah tersambung ke data asli; kartu metrik dan tabel di bawah belum.
  const { mulai, selesai } = periodeBulan(new Date().toLocaleDateString("sv-SE"));
  const supabase = supabaseServer();

  const [kanal, rinci, total] = await Promise.all([
    daftarKanal(),
    semuaBaris<{ channel_id: string; total_amount: number }>((d, s) =>
      supabase
        .from("sales")
        .select("channel_id, total_amount")
        .gte("sale_date", mulai)
        .lte("sale_date", selesai)
        .order("id")
        .range(d, s),
    ),
    semuaBaris<{ channel_id: string; total_amount: number }>((d, s) =>
      supabase
        .from("sales_totals")
        .select("channel_id, total_amount")
        .gte("sale_date", mulai)
        .lte("sale_date", selesai)
        .order("id")
        .range(d, s),
    ),
  ]);

  const kelengkapan = kelengkapanKanal(rinci, total, kanal);

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-title">Ringkasan</h1>
          <p className="text-caption text-muted-foreground">
            Warung Bu Siti · Agustus 2026
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

      <section aria-labelledby="angka-utama">
        <h2 id="angka-utama" className="sr-only">
          Angka utama
        </h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:gap-6">
          <KartuMetrik
            label="Omzet bulan ini"
            nilai={12_450_000}
            catatan="Gabungan semua kanal"
          />
          <KartuMetrik
            label="Untung bersih"
            nilai={3_120_000}
            catatan="Baru dari penjualan berrincian"
            semantik
          />
          <KartuMetrik
            label="Untung dari GoFood"
            nilai={null}
            catatan="Belum ada rincian item"
          />
        </div>
      </section>

      {/* Desktop: tabel dua kolom di kiri, ajakan melengkapi data di kanan.
          Ponsel: ajakan lebih dulu karena itu tindakan, tabel menyusul. */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* FR10.2 — penanda kelengkapan per kanal, dari data asli bulan ini.
            Tingkat `partial`: omzet tetap tampil, margin ditandai belum
            tersedia, dan tersedia tautan langsung ke jalur suara. Tidak
            menebak, dan penandanya tidak mengandalkan warna. */}
        <section
          aria-labelledby="lengkapi"
          className="space-y-3 lg:col-start-3 lg:row-start-1 lg:self-start"
        >
          <h2 id="lengkapi" className="text-section">
            Kelengkapan catatan
          </h2>
          {kelengkapan.length === 0 ? (
            <p className="text-body text-muted-foreground">
              Belum ada kanal jualan yang terdaftar.
            </p>
          ) : (
            <DaftarKelengkapan daftar={kelengkapan} ringkas />
          )}
          <p className="text-caption text-muted-foreground">
            Kanal bertanda Sebagian omzetnya sudah tercatat, tapi untungnya belum bisa
            dihitung karena belum tahu barang apa saja yang terjual.
          </p>
        </section>

        <section
          aria-labelledby="penjualan"
          className="space-y-3 lg:col-span-2 lg:col-start-1 lg:row-start-1"
        >
          <h2 id="penjualan" className="text-section">
            Penjualan terakhir
          </h2>

          <div className="table-scroll rounded-lg">
            <div className="min-w-[420px] overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[76px]">Tanggal</TableHead>
                    <TableHead>Kanal</TableHead>
                    <TableHead className="text-right">Omzet</TableHead>
                    <TableHead className="text-right">Untung</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONTOH.map((baris, i) => (
                    <TableRow key={i}>
                      <TableCell className="whitespace-nowrap">
                        {baris.tgl}
                      </TableCell>
                      <TableCell>{baris.kanal}</TableCell>
                      <TableCell className="num text-right">
                        {formatRupiah(baris.omzet)}
                      </TableCell>
                      <TableCell className="text-right">
                        {baris.untung === null ? (
                          // Tidak pernah 0, tidak pernah sel kosong.
                          <Badge variant="unknown">Belum ada rincian</Badge>
                        ) : (
                          <span
                            className={
                              baris.untung < 0
                                ? "num text-negative"
                                : "num text-positive"
                            }
                          >
                            {formatRupiah(baris.untung)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={2}>Jumlah</TableCell>
                    <TableCell className="num text-right">
                      {formatRupiah(CONTOH.reduce((t, b) => t + b.omzet, 0))}
                    </TableCell>
                    <TableCell className="num text-right text-unknown">
                      Belum lengkap
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </div>

          <p className="text-caption text-muted-foreground">
            Contoh tampilan. Tabel dan kartu metrik di atas belum tersambung ke data
            asli — penanda kelengkapan di samping sudah.
          </p>
        </section>
      </div>
    </div>
  );
}
