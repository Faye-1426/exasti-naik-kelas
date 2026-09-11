"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, RotateCcw, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPersen, formatRupiah } from "@/lib/format";
import {
  TIPE_BIAYA,
  hppDasar,
  hppSusut,
  labelTipe,
  marginPerKanal,
  type Kanal,
  type TipeBiaya,
} from "@/lib/hitung";
import { hapusProduk, simpanProduk, type ProdukLengkap } from "@/lib/produk-actions";

/** Form ini dipakai berkali-kali berturut-turut saat setup awal, jadi yang
 *  dioptimalkan adalah kecepatan mengetik, bukan kerapian tampilan:
 *
 *  - Tambah komponen tidak memuat ulang apa pun; barisnya muncul dan kursornya
 *    langsung pindah ke nama komponen baru.
 *  - Enter di kolom biaya = tambah baris berikutnya. Tangan tidak perlu pindah
 *    ke tetikus untuk 12 produk × 4 komponen.
 *  - Seluruh hitungan berjalan seketika di layar mengikuti ketikan.
 *
 *  Angka di layar ini adalah TAMPILAN, bukan sumber kebenaran. Yang disimpan
 *  hanyalah harga, susut, dan biaya komponen; margin dihitung ulang di server
 *  setiap kali dibutuhkan (aturan keras 4). Rumusnya sendiri diimpor dari
 *  hitung.ts — tidak ditulis ulang di sini, supaya tidak pernah ada dua versi
 *  rumus yang diam-diam berbeda. */

type BarisKomponen = {
  kunci: string;
  nama: string;
  tipe: TipeBiaya;
  biaya: number;
};

let nomorBaris = 0;
const barisBaru = (): BarisKomponen => ({
  kunci: `k-${nomorBaris++}`,
  nama: "",
  tipe: "material",
  biaya: 0,
});

export function EditorProduk({
  produk,
  kanal,
  jumlahPenjualan,
}: {
  produk: ProdukLengkap | null;
  kanal: Kanal[];
  jumlahPenjualan: number;
}) {
  const router = useRouter();

  const [nama, setNama] = useState(produk?.name ?? "");
  const [aliases, setAliases] = useState((produk?.aliases ?? []).join(", "));
  const [kategori, setKategori] = useState(produk?.category ?? "");
  const [harga, setHarga] = useState(produk?.selling_price ?? 0);
  const [susut, setSusut] = useState(produk?.waste_pct ?? 0);
  const [komponen, setKomponen] = useState<BarisKomponen[]>(() =>
    (produk?.komponen ?? []).map((k) => ({
      kunci: `k-${nomorBaris++}`,
      nama: k.name,
      tipe: k.type,
      biaya: k.cost_per_unit,
    })),
  );
  const [fokus, setFokus] = useState<string | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, mulaiSimpan] = useTransition();

  const hitungan = useMemo(() => {
    const isi = komponen.filter((k) => k.nama.trim() !== "");
    const dasar = hppDasar(isi.map((k) => ({ name: k.nama, type: k.tipe, cost_per_unit: k.biaya })));
    return {
      adaBiaya: isi.length > 0,
      dasar,
      modal: hppSusut(dasar, susut),
      perKanal: marginPerKanal(
        {
          selling_price: harga,
          waste_pct: susut,
          komponen: isi.map((k) => ({ name: k.nama, type: k.tipe, cost_per_unit: k.biaya })),
        },
        kanal,
      ),
    };
  }, [komponen, susut, harga, kanal]);

  // Harga yang sedang diketik belum tentu harga yang tersimpan. Selisihnya
  // ditandai supaya perubahan angka di layar tidak disangka sudah tersimpan.
  const simulasi = produk !== null && harga !== produk.selling_price;

  function ubahKomponen(kunci: string, tambalan: Partial<BarisKomponen>) {
    setKomponen((lama) => lama.map((k) => (k.kunci === kunci ? { ...k, ...tambalan } : k)));
  }

  function tambah() {
    const b = barisBaru();
    setKomponen((lama) => [...lama, b]);
    setFokus(b.kunci);
  }

  function simpan() {
    setGalat(null);
    mulaiSimpan(async () => {
      const balasan = await simpanProduk({
        id: produk?.id ?? null,
        nama,
        // Alias dipisah koma. Dipakai mencocokkan hasil input suara ke produk,
        // jadi "es teh, teh manis" cukup ditulis seperti orang bicara.
        aliases: aliases.split(",").map((a) => a.trim()).filter(Boolean),
        kategori: kategori || null,
        hargaJual: harga,
        susutPct: susut,
        komponen: komponen.map((k) => ({ nama: k.nama, tipe: k.tipe, biaya: k.biaya })),
      });
      if (!balasan.ok) setGalat(balasan.galat);
      else router.push("/produk");
    });
  }

  function hapus() {
    setGalat(null);
    mulaiSimpan(async () => {
      const balasan = await hapusProduk(produk!.id);
      if (!balasan.ok) setGalat(balasan.galat);
      else router.push("/produk");
    });
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-title">{produk ? produk.name : "Produk baru"}</h1>
        <p className="text-caption text-muted-foreground">
          Isi modalnya sampai komponen terkecil. Makin rinci, makin bisa
          dipercaya angka untungnya.
        </p>
      </header>

      {/* Desktop: isian di kiri, hasil hitungan menempel di kanan supaya angka
          bergerak di depan mata sambil mengetik. Ponsel: hitungan menyusul di
          bawah — di layar 360px tidak ada ruang untuk berdampingan. */}
      <div className="grid gap-6 lg:grid-cols-5 lg:items-start lg:gap-8">
        <div className="space-y-6 lg:col-span-3">
          <section className="space-y-4 rounded-lg border border-border bg-card p-4">
            <h2 className="text-section">Keterangan produk</h2>

            <div className="space-y-2">
              <Label htmlFor="nama">Nama produk</Label>
              <Input
                id="nama"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Es Teh Manis"
                className="h-touch text-body"
                autoFocus={produk === null}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="harga">Harga jual per porsi</Label>
                <Input
                  id="harga"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={harga || ""}
                  placeholder="0"
                  onChange={(e) => setHarga(Number(e.target.value) || 0)}
                  className="num h-touch text-body"
                />
                <p className="text-caption text-muted-foreground">{formatRupiah(harga)}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="susut">Susut (%)</Label>
                <Input
                  id="susut"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={100}
                  value={susut || ""}
                  placeholder="0"
                  onChange={(e) => setSusut(Number(e.target.value) || 0)}
                  className="num h-touch text-body"
                />
                <p className="text-caption text-muted-foreground">
                  Bagian yang terbuang: es mencair, tumpah, tidak habis terjual.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kategori">Kategori (boleh dikosongkan)</Label>
                <Input
                  id="kategori"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  placeholder="Minuman"
                  className="h-touch text-body"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aliases">Sebutan lain</Label>
                <Input
                  id="aliases"
                  value={aliases}
                  onChange={(e) => setAliases(e.target.value)}
                  placeholder="es teh, teh manis"
                  className="h-touch text-body"
                />
                <p className="text-caption text-muted-foreground">
                  Dipisah koma. Dipakai saat kamu menyebutkan penjualan lewat suara.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-section">Modal per porsi</h2>
              <span className="text-caption text-muted-foreground">
                {komponen.length} komponen
              </span>
            </div>

            {komponen.length === 0 && (
              <p className="rounded-lg border border-dashed border-border-strong p-4 text-body text-muted-foreground">
                Belum ada komponen biaya. Selama kosong, untung produk ini
                ditandai <strong>belum bisa dihitung</strong> — tidak dianggap
                nol.
              </p>
            )}

            <ul className="space-y-3">
              {komponen.map((k) => (
                <BarisBiaya
                  key={k.kunci}
                  baris={k}
                  dasar={hitungan.dasar}
                  fokusOtomatis={k.kunci === fokus}
                  onUbah={(t) => ubahKomponen(k.kunci, t)}
                  onHapus={() => setKomponen((lama) => lama.filter((x) => x.kunci !== k.kunci))}
                  onEnter={tambah}
                />
              ))}
            </ul>

            <Button type="button" variant="outline" onClick={tambah} className="w-full">
              <Plus aria-hidden />
              Tambah komponen
            </Button>
            <p className="text-caption text-muted-foreground">
              Tekan Enter di kolom biaya untuk langsung menambah komponen berikutnya.
            </p>
          </section>
        </div>

        {/* Hasil hitungan. Seluruhnya turunan dari isian di kiri — tidak ada
            satu pun angka di sini yang disimpan ke basis data. */}
        <div className="space-y-6 lg:sticky lg:top-8 lg:col-span-2">
          <section className="space-y-3 rounded-lg border border-border bg-muted p-4">
            <h2 className="text-section">Hitungan modal</h2>

            <dl className="space-y-2 text-body">
              <Baris label="Jumlah semua komponen" nilai={hitungan.adaBiaya ? hitungan.dasar : null} />
              <Baris
                label={`Ditambah susut ${formatPersen(susut)}`}
                nilai={hitungan.adaBiaya ? hitungan.modal - hitungan.dasar : null}
              />
              <div className="flex items-baseline justify-between gap-3 border-t border-border-strong pt-2">
                <dt className="text-label">Modal per porsi</dt>
                <dd className="num text-metric">
                  {hitungan.adaBiaya ? formatRupiah(Math.round(hitungan.modal)) : "—"}
                </dd>
              </div>
            </dl>

            {!hitungan.adaBiaya && (
              <p className="text-caption text-unknown">
                Belum bisa dihitung sampai ada komponen biaya.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-section">Untung per kanal</h2>
              {simulasi && (
                <Badge variant="unknown" className="gap-1">
                  Simulasi — belum disimpan
                </Badge>
              )}
            </div>

            {simulasi && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-amber-soft px-3 py-2 text-caption">
                <span>
                  Harga tersimpan {formatRupiah(produk!.selling_price)}, di layar{" "}
                  {formatRupiah(harga)}.
                </span>
                <button
                  type="button"
                  onClick={() => setHarga(produk!.selling_price)}
                  className="inline-flex h-touch items-center gap-1 font-medium underline underline-offset-4"
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Kembalikan
                </button>
              </div>
            )}

            {kanal.length === 0 ? (
              <p className="text-body text-unknown">Belum ada kanal penjualan aktif.</p>
            ) : !hitungan.adaBiaya ? (
              <p className="text-body text-unknown">
                Isi komponen biaya dulu untuk melihat untung per kanal.
              </p>
            ) : (
              <table className="w-full text-body">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-2 text-left text-label text-muted-foreground">Kanal</th>
                    <th className="py-2 text-right text-label text-muted-foreground">Potongan</th>
                    <th className="py-2 text-right text-label text-muted-foreground">Untung</th>
                  </tr>
                </thead>
                <tbody>
                  {hitungan.perKanal.map((k) => (
                    <tr key={k.id} className="border-b border-border last:border-0">
                      <td className="py-2">
                        <span className="block">{k.name}</span>
                        <span className="block text-caption text-muted-foreground">
                          {k.commission_pct > 0 ? `potongan ${formatPersen(k.commission_pct)}` : "tanpa potongan"}
                        </span>
                      </td>
                      <td className="num py-2 text-right text-muted-foreground">
                        {k.potongan > 0 ? `−${formatRupiah(Math.round(k.potongan))}` : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <span
                          className={
                            k.nominal < 0 ? "num block font-semibold text-negative" : "num block text-positive"
                          }
                        >
                          {formatRupiah(Math.round(k.nominal))}
                        </span>
                        <span className="block text-caption text-muted-foreground">
                          {formatPersen(k.persen)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {hitungan.perKanal.some((k) => k.nominal < 0) && hitungan.adaBiaya && (
              <p className="rounded-lg bg-negative-soft px-3 py-2 text-caption text-negative">
                Produk ini rugi di sebagian kanal. Naikkan harga di kolom atas
                untuk melihat berapa harga yang membuatnya tidak lagi rugi.
              </p>
            )}
          </section>
        </div>
      </div>

      {galat && (
        <p role="alert" className="rounded-lg bg-negative-soft px-4 py-3 text-body text-negative">
          {galat}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row-reverse sm:items-center">
        <Button
          type="button"
          variant="amber"
          size="lg"
          onClick={simpan}
          disabled={menyimpan || nama.trim() === ""}
          className="sm:flex-1"
        >
          {menyimpan ? "Menyimpan…" : "Simpan produk"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={() => router.push("/produk")}
          disabled={menyimpan}
        >
          Batal
        </Button>
        {produk && <TombolHapus jumlahPenjualan={jumlahPenjualan} onHapus={hapus} sibuk={menyimpan} />}
      </div>
    </div>
  );
}

// ── Satu komponen biaya ─────────────────────────────────────────────────────

function BarisBiaya({
  baris,
  dasar,
  fokusOtomatis,
  onUbah,
  onHapus,
  onEnter,
}: {
  baris: BarisKomponen;
  dasar: number;
  fokusOtomatis: boolean;
  onUbah: (t: Partial<BarisKomponen>) => void;
  onHapus: () => void;
  onEnter: () => void;
}) {
  const bagian = dasar > 0 ? (baris.biaya / dasar) * 100 : null;

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start gap-2">
        <Input
          aria-label="Nama komponen biaya"
          value={baris.nama}
          placeholder="Teh tubruk dan gula"
          onChange={(e) => onUbah({ nama: e.target.value })}
          className="h-touch min-w-0 flex-1 text-body"
          autoFocus={fokusOtomatis}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onHapus}
          aria-label={`Hapus komponen ${baris.nama || "kosong"}`}
          className="text-muted-foreground hover:text-negative"
        >
          <Trash2 aria-hidden />
        </Button>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block space-y-1">
          <span className="text-caption text-muted-foreground">Jenis</span>
          {/* <select> bawaan, bukan komponen dropdown: di Android ia membuka
              pemilih layar penuh yang lebih mudah ditekan daripada daftar
              melayang mana pun yang bisa kita buat sendiri. */}
          <select
            value={baris.tipe}
            onChange={(e) => onUbah({ tipe: e.target.value as TipeBiaya })}
            className="h-touch w-full rounded-md border border-input bg-card px-2 text-body focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TIPE_BIAYA.map((t) => (
              <option key={t.nilai} value={t.nilai}>
                {t.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-caption text-muted-foreground">Biaya</span>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={baris.biaya || ""}
            placeholder="0"
            onChange={(e) => onUbah({ biaya: Number(e.target.value) || 0 })}
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              // Enter di kolom terakhir = baris berikutnya. Tanpa ini, setup 12
              // produk berarti 48 kali pindah tangan ke tetikus.
              e.preventDefault();
              onEnter();
            }}
            className="num h-touch w-full text-right text-body"
          />
        </label>
      </div>

      {bagian !== null && baris.biaya > 0 && (
        <p className="mt-2 text-caption text-muted-foreground">
          {labelTipe(baris.tipe)} · {formatPersen(bagian)} dari modal
        </p>
      )}
    </li>
  );
}

function Baris({ label, nilai }: { label: string; nilai: number | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="num shrink-0">
        {nilai === null ? <span className="text-unknown">—</span> : formatRupiah(Math.round(nilai))}
      </dd>
    </div>
  );
}

// ── Hapus, dengan akibatnya disebutkan lebih dulu ───────────────────────────

function TombolHapus({
  jumlahPenjualan,
  onHapus,
  sibuk,
}: {
  jumlahPenjualan: number;
  onHapus: () => void;
  sibuk: boolean;
}) {
  const [yakin, setYakin] = useState(false);

  if (!yakin) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="lg"
        onClick={() => setYakin(true)}
        disabled={sibuk}
        className="text-negative hover:bg-negative-soft sm:mr-auto"
      >
        <Trash2 aria-hidden />
        Hapus produk
      </Button>
    );
  }

  return (
    <div
      role="alert"
      className="space-y-3 rounded-lg border border-negative bg-negative-soft p-4 sm:mr-auto"
    >
      <p className="text-body">
        Hapus produk ini?{" "}
        {jumlahPenjualan > 0 ? (
          <>
            <strong>{jumlahPenjualan} baris penjualan</strong> yang sudah tercatat
            tetap ada dan omzetnya tidak berkurang, tapi untungnya berubah jadi
            belum bisa dihitung karena modalnya ikut terhapus.
          </>
        ) : (
          "Belum ada penjualan yang memakai produk ini."
        )}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="destructive" onClick={onHapus} disabled={sibuk}>
          {sibuk ? "Menghapus…" : "Ya, hapus"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setYakin(false)} disabled={sibuk}>
          Batal
        </Button>
      </div>
    </div>
  );
}
