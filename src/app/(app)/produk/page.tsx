import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatRupiah } from "@/lib/format";
import { hppDasar, hppSusut, marginPerKanal } from "@/lib/hitung";
import { daftarKanal, daftarProduk } from "@/lib/produk-actions";

/** F4 — master produk. Halaman ini adalah daftar; penyuntingan ada di
 *  /produk/[id]. Pemisahannya disengaja: form HPP butuh seluruh lebar layar
 *  ponsel, dan daftar butuh bisa dibandingkan antar baris.
 *
 *  Kolom terakhir sengaja bukan "untung rata-rata" melainkan untung TERTIPIS di
 *  antara kanal. Rata-rata menyembunyikan justru yang perlu dilihat: produk yang
 *  untung di warung tapi rugi begitu dijual lewat aplikasi. */
export default async function Halaman() {
  const [produk, kanal] = await Promise.all([daftarProduk(), daftarKanal()]);

  const baris = produk.map((p) => {
    const dasar = hppDasar(p.komponen);
    const adaBiaya = p.komponen.length > 0;
    // Kanal terburuk = komisi tertinggi. Kalau belum ada kanal sama sekali,
    // tidak ada yang bisa dibandingkan dan untungnya dibiarkan kosong.
    const perKanal = marginPerKanal(p, kanal);
    const tertipis = [...perKanal].sort((a, b) => a.nominal - b.nominal)[0] ?? null;
    return {
      ...p,
      modal: adaBiaya ? hppSusut(dasar, p.waste_pct) : null,
      tertipis: adaBiaya ? tertipis : null,
    };
  });

  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-title">Produk</h1>
          <p className="text-caption text-muted-foreground">
            Modal per porsi. Dari sinilah semua hitungan untung berasal.
          </p>
        </div>
        <Button asChild variant="amber" size="lg">
          <Link href="/produk/baru">
            <Plus aria-hidden />
            Tambah produk
          </Link>
        </Button>
      </header>

      {produk.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-strong bg-card p-6 text-center">
          <p className="text-section">Belum ada produk</p>
          <p className="mx-auto mt-1 max-w-sm text-body text-muted-foreground">
            Daftarkan dulu barang yang kamu jual beserta modalnya. Tanpa modal,
            omzet tetap bisa dicatat tapi untungnya belum bisa dihitung.
          </p>
          <Button asChild variant="amber" size="lg" className="mt-4">
            <Link href="/produk/baru">
              <Plus aria-hidden />
              Tambah produk pertama
            </Link>
          </Button>
        </div>
      ) : (
        <section aria-labelledby="daftar" className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="daftar" className="text-section">
              {produk.length} produk terdaftar
            </h2>
          </div>

          <div className="table-scroll rounded-lg">
            <div className="min-w-[460px] overflow-hidden rounded-lg border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    {/* Kolom nama menempel di kiri supaya angka tetap punya
                        pemiliknya saat tabel digulir mendatar. */}
                    <TableHead className="sticky left-0 z-20 bg-muted">Produk</TableHead>
                    <TableHead className="text-right">Harga jual</TableHead>
                    <TableHead className="text-right">Modal</TableHead>
                    <TableHead className="text-right">Untung tertipis</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {baris.map((p) => (
                    <TableRow key={p.id} className="group">
                      <TableCell className="sticky left-0 z-10 bg-card group-even:bg-muted/40">
                        <Link
                          href={`/produk/${p.id}`}
                          className="block min-w-0 font-medium underline-offset-4 hover:underline focus-visible:underline"
                        >
                          <span className="block truncate">{p.name}</span>
                          {p.category && (
                            <span className="block text-caption font-normal text-muted-foreground">
                              {p.category}
                            </span>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell className="num text-right">
                        {formatRupiah(p.selling_price)}
                      </TableCell>
                      <TableCell className="num text-right">
                        {/* Modal kosong tidak pernah tampil sebagai Rp 0 —
                            itu akan terbaca sebagai untung 100%. */}
                        {p.modal === null ? (
                          <Badge variant="unknown">Belum diisi</Badge>
                        ) : (
                          formatRupiah(Math.round(p.modal))
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.tertipis === null ? (
                          <span className="text-caption text-unknown">Belum bisa dihitung</span>
                        ) : (
                          <>
                            <span
                              className={
                                p.tertipis.nominal < 0
                                  ? "num block font-semibold text-negative"
                                  : "num block text-positive"
                              }
                            >
                              {formatRupiah(Math.round(p.tertipis.nominal))}
                            </span>
                            <span className="block text-caption text-muted-foreground">
                              di {p.tertipis.name}
                            </span>
                          </>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        <ChevronRight className="size-5" aria-hidden />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <p className="text-caption text-muted-foreground">
            &ldquo;Untung tertipis&rdquo; adalah untung di kanal dengan potongan
            terbesar. Produk yang merah di sini masih bisa untung di warung, tapi
            rugi tiap kali terjual lewat aplikasi.
          </p>
        </section>
      )}
    </div>
  );
}
