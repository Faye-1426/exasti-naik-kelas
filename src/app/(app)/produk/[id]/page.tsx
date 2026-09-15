import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { EditorProduk } from "@/components/editor-produk";
import { daftarKanal, jumlahPenjualan, satuProduk } from "@/lib/produk-actions";

/** F4 + F6 — satu halaman untuk menyunting produk sekaligus melihat rinciannya.
 *
 *  Dipakai sebagai dua hal sekaligus karena memang satu hal: struktur biaya yang
 *  disunting di kiri adalah struktur biaya yang dirinci di kanan, dan harga jual
 *  yang diketik langsung mengubah perbandingan margin antar kanal sebelum apa
 *  pun tersimpan. Memisahkannya jadi halaman "lihat" dan halaman "ubah" berarti
 *  pengguna harus menyimpan dulu untuk tahu akibat perubahannya. */
export default async function Halaman({ params }: { params: { id: string } }) {
  const baru = params.id === "baru";

  const [produk, kanal, terpakai] = await Promise.all([
    baru ? Promise.resolve(null) : satuProduk(params.id),
    daftarKanal(),
    baru ? Promise.resolve(0) : jumlahPenjualan(params.id),
  ]);

  if (!baru && !produk) notFound();

  return (
    <div className="space-y-6 lg:space-y-8">
      <Link
        href="/produk"
        className="inline-flex h-touch items-center gap-1 text-label text-muted-foreground underline-offset-4 hover:underline"
      >
        <ChevronLeft className="size-5" aria-hidden />
        Semua produk
      </Link>

      <EditorProduk produk={produk} kanal={kanal} jumlahPenjualan={terpakai} />
    </div>
  );
}
