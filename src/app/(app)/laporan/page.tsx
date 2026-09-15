import { GrafikOmzet } from "@/components/grafik-omzet";
import { PenandaKelengkapan } from "@/components/penanda-kelengkapan";
import { TombolCetak } from "@/components/tombol-cetak";
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
import { hariIniLokal, keRinci, muatPeriode, muatSkor } from "@/lib/data-usaha";
import { formatJumlah, formatPersen, formatRupiah } from "@/lib/format";
import { ringkasMargin } from "@/lib/hitung";
import { kelengkapanKanal, periodeBulan } from "@/lib/parsing";
import {
  arusKasBulanan,
  komposisiKanal,
  labaRugi,
  metrikPeriode,
  trenHarian,
  type BagianKanal,
  type BarisLabaRugi,
} from "@/lib/ringkasan";
import { bulanTahun, tingkatSkor, type HasilSkor } from "@/lib/skor";

/** F6 — Export Laporan Keuangan.
 *
 *  Dokumennya adalah halaman ini sendiri: yang tercetak sama persis dengan yang
 *  terlihat, dibentuk `@media print` di globals.css dan dikeluarkan lewat
 *  `window.print()`. Tidak ada pustaka PDF (ponytail: cukup untuk anggaran
 *  waktu, dan dialog cetak bawaan sudah punya "Simpan sebagai PDF"; ganti ke
 *  render PDF di server kalau nanti laporan perlu dikirim lewat surel tanpa
 *  peramban).
 *
 *  Tujuh bagian sesuai PRD F6, dengan dua hal yang tidak boleh hilang dari
 *  kertas: bahwa angkanya berasal dari pencatatan mandiri pemilik usaha
 *  (FR6.5), dan bahwa ada kanal yang datanya belum lengkap kalau memang ada
 *  (FR6.6). Keduanya ditulis di halaman pertama, bukan sebagai catatan kaki —
 *  petugas bank yang membacanya berhak tahu batas datanya sebelum membaca
 *  angkanya. */

export const dynamic = "force-dynamic";

const TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

const tanggalPanjang = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function Halaman({
  searchParams,
}: {
  searchParams: { dari?: string; sampai?: string };
}) {
  const hariIni = hariIniLokal();
  const bulanIni = periodeBulan(hariIni);
  const dari = TANGGAL.test(searchParams.dari ?? "") ? searchParams.dari! : bulanIni.mulai;
  const sampai = TANGGAL.test(searchParams.sampai ?? "") ? searchParams.sampai! : bulanIni.selesai;

  const [data, skor] = await Promise.all([muatPeriode(dari, sampai), muatSkor(hariIni)]);

  const rinci = data.penjualan.map(keRinci);
  const metrik = metrikPeriode(rinci, data.totalHarian, data.pengeluaran);
  const komposisi = komposisiKanal(kelengkapanKanal(rinci, data.totalHarian, data.kanal));
  const tren = trenHarian(rinci, data.totalHarian, dari, sampai);
  const arus = arusKasBulanan([...rinci, ...data.totalHarian], data.pengeluaran);
  const rugiLaba = labaRugi(metrik.omzet, data.pengeluaran);
  const produk = ringkasMargin(data.penjualan, data.produk, data.kanal).sort(
    (a, b) => b.omzet - a.omzet,
  );

  const kanalSebagian = komposisi.filter((k) => k.tingkat === "partial");

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Penyaring dan tombol. Tidak ikut tercetak. */}
      <div data-cetak="sembunyi" className="space-y-4">
        <header className="space-y-1">
          <h1 className="text-title">Laporan keuangan</h1>
          <p className="text-body text-muted-foreground">
            Pilih rentangnya, periksa isinya, lalu cetak atau simpan sebagai PDF untuk dibawa
            ke bank.
          </p>
        </header>

        <form
          method="get"
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-card"
        >
          <div className="space-y-1">
            <label htmlFor="dari" className="block text-label">
              Dari tanggal
            </label>
            <input
              id="dari"
              name="dari"
              type="date"
              defaultValue={dari}
              max={sampai}
              className="h-touch rounded-lg border border-input bg-card px-3 text-body shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="sampai" className="block text-label">
              Sampai tanggal
            </label>
            <input
              id="sampai"
              name="sampai"
              type="date"
              defaultValue={sampai}
              min={dari}
              className="h-touch rounded-lg border border-input bg-card px-3 text-body shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <Button type="submit" variant="outline" size="lg">
            Tampilkan
          </Button>
          <TombolCetak />
        </form>

        <p className="text-caption text-muted-foreground">
          Isian tanggal memakai pemilih bawaan ponsel. Bagian di bawah ini persis yang akan
          tercetak — navigasi dan tombol tidak ikut. Kedua tombol membuka dialog cetak bawaan
          peramban; untuk menyimpan PDF, pilih <strong>Simpan sebagai PDF</strong> pada bagian
          tujuan di dialog itu.
        </p>
      </div>

      {/* ── Dokumen ────────────────────────────────────────────────────── */}
      <article className="space-y-6 rounded-lg border border-border bg-card p-5 shadow-card print:space-y-5 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <Identitas usaha={data.usaha} dari={dari} sampai={sampai} hariIni={hariIni} />

        <Penyangkalan kanalSebagian={kanalSebagian.map((k) => k.kanal.name)} />

        <Bagian nomor={2} judul="Laba rugi sederhana">
          <LabaRugi baris={rugiLaba} />
        </Bagian>

        <Bagian nomor={3} judul="Ringkasan uang masuk dan uang keluar per bulan">
          <ArusKas baris={arus} />
        </Bagian>

        <Bagian nomor={4} judul="Rekap penjualan per menu">
          <RekapProduk baris={produk} omzetTotal={metrik.omzet} omzetTerinci={metrik.omzetTerinci} />
        </Bagian>

        <Bagian nomor={5} judul="Rekap penjualan per kanal">
          <RekapKanal daftar={komposisi} total={metrik.omzet} />
        </Bagian>

        <Bagian nomor={6} judul="Tren uang masuk harian">
          <GrafikOmzet titik={tren} tinggi={180} />
        </Bagian>

        <Bagian nomor={7} judul="Ringkasan Skor Kesiapan KUR">
          <Skor hasil={skor.hasil} />
        </Bagian>
      </article>
    </div>
  );
}

// ── Kerangka ────────────────────────────────────────────────────────────────

function Bagian({
  nomor,
  judul,
  children,
}: {
  nomor: number;
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <section data-cetak="bagian" aria-labelledby={`bagian-${nomor}`} className="space-y-2">
      <h2 id={`bagian-${nomor}`} className="text-section">
        {nomor}. {judul}
      </h2>
      {children}
    </section>
  );
}

function Bingkai({ children }: { children: React.ReactNode }) {
  return (
    <div className="table-scroll rounded-lg">
      <div className="min-w-[380px] overflow-hidden rounded-lg border border-border">
        {children}
      </div>
    </div>
  );
}

/** Nilai yang belum diketahui ditulis apa adanya, tidak pernah sebagai 0 dan
 *  tidak pernah sebagai sel kosong. Sel kosong di laporan yang diserahkan ke
 *  bank akan dibaca sebagai nol oleh siapa pun yang membacanya. */
function Nilai({ nilai, semantik }: { nilai: number | null; semantik?: boolean }) {
  if (nilai === null) return <span className="text-unknown">Belum ada data</span>;
  return (
    <span
      className={
        semantik ? (nilai < 0 ? "num text-negative" : "num text-positive") : "num"
      }
    >
      {formatRupiah(nilai)}
    </span>
  );
}

// ── 1. Identitas usaha ──────────────────────────────────────────────────────

function Identitas({
  usaha,
  dari,
  sampai,
  hariIni,
}: {
  usaha: { name: string; owner_name: string | null; business_type: string | null; address: string | null; established_date: string | null } | null;
  dari: string;
  sampai: string;
  hariIni: string;
}) {
  const isi: [string, string][] = [
    ["Nama usaha", usaha?.name ?? "Belum diisi"],
    ["Pemilik", usaha?.owner_name ?? "Belum diisi"],
    ["Jenis usaha", usaha?.business_type ?? "Belum diisi"],
    ["Alamat", usaha?.address ?? "Belum diisi"],
    ["Mulai berjalan", usaha?.established_date ? bulanTahun(usaha.established_date) : "Belum diisi"],
    ["Periode laporan", `${tanggalPanjang(dari)} – ${tanggalPanjang(sampai)}`],
    ["Tanggal dibuat", tanggalPanjang(hariIni)],
  ];

  return (
    <section data-cetak="bagian" aria-labelledby="bagian-1" className="space-y-3">
      <div className="space-y-1 border-b border-border-strong pb-3">
        <h2 id="bagian-1" className="text-title">
          Laporan Keuangan {usaha?.name ?? "Usaha"}
        </h2>
        <p className="text-caption text-muted-foreground">
          {tanggalPanjang(dari)} sampai {tanggalPanjang(sampai)}
        </p>
      </div>

      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {isi.map(([k, v]) => (
          <div key={k} className="flex gap-2">
            <dt className="w-36 shrink-0 text-caption text-muted-foreground">{k}</dt>
            <dd className="min-w-0 text-body">{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** FR6.5 dan FR6.6. Wajib ada di dokumen, dan sengaja di halaman pertama. */
function Penyangkalan({ kanalSebagian }: { kanalSebagian: string[] }) {
  return (
    <section
      data-cetak="bagian"
      aria-label="Keterangan sumber data"
      className="space-y-2 rounded-lg border border-border-strong bg-muted p-4"
    >
      <p className="text-label">Keterangan sumber data</p>
      <p className="text-body text-muted-foreground">
        Laporan ini dihasilkan dari pencatatan mandiri pemilik usaha melalui aplikasi Naik
        Kelas. Angkanya belum diaudit akuntan publik dan tidak berasal dari sistem kasir
        atau rekening bank.
      </p>
      {kanalSebagian.length > 0 ? (
        <p className="text-body text-muted-foreground">
          <span className="font-medium text-foreground">Catatan kelengkapan:</span> kanal{" "}
          {kanalSebagian.join(" dan ")} tercatat hanya sebagai total harian tanpa rincian
          barang. Uang masuk dari kanal tersebut sudah termasuk pada seluruh jumlah di
          laporan ini, tetapi rekap per menu di bagian 4 belum mencakupnya. Rinciannya tidak
          diperkirakan dari kanal lain.
        </p>
      ) : (
        <p className="text-body text-muted-foreground">
          Seluruh penjualan pada periode ini tercatat beserta rincian barangnya.
        </p>
      )}
    </section>
  );
}

// ── 2. Laba rugi ────────────────────────────────────────────────────────────

function LabaRugi({ baris }: { baris: BarisLabaRugi[] }) {
  return (
    <Bingkai>
      <Table>
        <TableBody>
          {baris.map((b, i) => (
            <TableRow key={`${b.label}-${i}`} className={b.tebal ? "bg-muted" : undefined}>
              <TableCell className={b.tebal ? "font-medium" : undefined}>{b.label}</TableCell>
              <TableCell className="text-right">
                <Nilai nilai={b.nilai} semantik={b.label === "Untung bersih"} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Bingkai>
  );
}

// ── 3. Arus kas ─────────────────────────────────────────────────────────────

function ArusKas({ baris }: { baris: { bulan: string; masuk: number; keluar: number }[] }) {
  if (baris.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong p-4 text-body text-muted-foreground">
        Belum ada uang masuk maupun uang keluar yang tercatat pada periode ini.
      </p>
    );
  }

  return (
    <Bingkai>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Bulan</TableHead>
            <TableHead className="text-right">Uang masuk</TableHead>
            <TableHead className="text-right">Uang keluar</TableHead>
            <TableHead className="text-right">Sisa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {baris.map((b) => (
            <TableRow key={b.bulan}>
              <TableCell className="whitespace-nowrap">{bulanTahun(`${b.bulan}-01`)}</TableCell>
              <TableCell className="num text-right">{formatRupiah(b.masuk)}</TableCell>
              <TableCell className="num text-right">{formatRupiah(b.keluar)}</TableCell>
              <TableCell className="text-right">
                <Nilai nilai={b.masuk - b.keluar} semantik />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Jumlah</TableCell>
            <TableCell className="num text-right">
              {formatRupiah(baris.reduce((t, b) => t + b.masuk, 0))}
            </TableCell>
            <TableCell className="num text-right">
              {formatRupiah(baris.reduce((t, b) => t + b.keluar, 0))}
            </TableCell>
            <TableCell className="text-right">
              <Nilai nilai={baris.reduce((t, b) => t + b.masuk - b.keluar, 0)} semantik />
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </Bingkai>
  );
}

// ── 4. Rekap per produk ─────────────────────────────────────────────────────

function RekapProduk({
  baris,
  omzetTotal,
  omzetTerinci,
}: {
  baris: ReturnType<typeof ringkasMargin>;
  omzetTotal: number;
  omzetTerinci: number;
}) {
  if (baris.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong p-4 text-body text-muted-foreground">
        Belum ada penjualan berrincian barang pada periode ini, jadi rekap per menu belum
        bisa dibuat. Uang masuknya tetap terhitung pada bagian 2, 3, dan 5.
      </p>
    );
  }

  return (
    <>
      <p className="text-caption text-muted-foreground">
        Disusun dari penjualan yang ada rincian barangnya, yaitu{" "}
        {formatRupiah(omzetTerinci)} dari {formatRupiah(omzetTotal)} seluruh uang masuk.
      </p>

      <Bingkai>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Menu</TableHead>
              <TableHead className="text-right">Terjual</TableHead>
              <TableHead className="text-right">Uang masuk</TableHead>
              <TableHead className="text-right">Untung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.map((b) => (
              <TableRow key={b.produkId ?? b.nama}>
                <TableCell>
                  {b.nama}
                  {b.alasanKosong && (
                    <span className="block text-caption text-muted-foreground">
                      {b.alasanKosong}
                    </span>
                  )}
                </TableCell>
                <TableCell className="num text-right">{formatJumlah(b.qty)}</TableCell>
                <TableCell className="num text-right">{formatRupiah(b.omzet)}</TableCell>
                <TableCell className="text-right">
                  <Nilai nilai={b.marginNominal} semantik />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={2}>Jumlah penjualan berrincian</TableCell>
              <TableCell className="num text-right">
                {formatRupiah(baris.reduce((t, b) => t + b.omzet, 0))}
              </TableCell>
              <TableCell className="text-right">
                {/* Menu yang untungnya belum bisa dihitung TIDAK dianggap nol.
                    Menjumlahkannya sebagai nol akan melaporkan untung yang
                    lebih kecil dari kenyataan, dan tidak ada yang tahu. */}
                {baris.some((b) => b.marginNominal === null) ? (
                  <span className="text-unknown">Belum lengkap</span>
                ) : (
                  <Nilai nilai={baris.reduce((t, b) => t + (b.marginNominal ?? 0), 0)} semantik />
                )}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </Bingkai>
    </>
  );
}

// ── 5. Rekap per kanal ──────────────────────────────────────────────────────

function RekapKanal({ daftar, total }: { daftar: BagianKanal[]; total: number }) {
  if (daftar.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong p-4 text-body text-muted-foreground">
        Belum ada kanal jualan yang terdaftar.
      </p>
    );
  }

  return (
    <Bingkai>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kanal</TableHead>
            <TableHead className="text-right">Uang masuk</TableHead>
            <TableHead className="text-right">Porsi</TableHead>
            <TableHead>Kelengkapan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {daftar.map((k) => (
            <TableRow key={k.kanal.id}>
              <TableCell>{k.kanal.name}</TableCell>
              <TableCell className="num text-right">{formatRupiah(k.omzetTotal)}</TableCell>
              <TableCell className="num text-right">
                {k.persenOmzet === null ? "—" : formatPersen(k.persenOmzet)}
              </TableCell>
              <TableCell>
                <PenandaKelengkapan tingkat={k.tingkat} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Jumlah seluruh uang masuk</TableCell>
            <TableCell className="num text-right">{formatRupiah(total)}</TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      </Table>
    </Bingkai>
  );
}

// ── 7. Skor KUR ─────────────────────────────────────────────────────────────

function Skor({ hasil }: { hasil: HasilSkor }) {
  const tingkat = tingkatSkor(hasil.total);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-border-strong bg-muted p-4">
        <p className="num text-metric">
          {hasil.total}
          <span className="text-body text-muted-foreground"> / 100</span>
        </p>
        <p className="text-label">{tingkat.label}</p>
        {hasil.plafon && (
          <p className="num w-full text-caption text-muted-foreground">
            Perkiraan plafon {hasil.plafon.jenis}: {formatRupiah(hasil.plafon.bawah)} –{" "}
            {formatRupiah(hasil.plafon.atas)}, dihitung 3 sampai 6 kali rata-rata uang masuk
            bulanan dari {hasil.plafon.bulanDipakai} bulan penuh.
          </p>
        )}
      </div>

      <Bingkai>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kriteria</TableHead>
              <TableHead className="text-right">Skor</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hasil.kriteria.map((k) => (
              <TableRow key={k.kunci}>
                <TableCell className="whitespace-nowrap">{k.label}</TableCell>
                <TableCell className="num text-right">
                  {k.skor} / {k.bobot}
                </TableCell>
                <TableCell className="text-caption text-muted-foreground">{k.alasan}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Bingkai>

      <p className="text-caption text-muted-foreground">
        Skor Kesiapan KUR dihitung oleh aplikasi Naik Kelas memakai kriteria yang umum
        dipakai bank penyalur. Angka ini bersifat indikatif dan bukan keputusan kredit dari
        bank mana pun. Keputusan pemberian kredit sepenuhnya ada pada bank penyalur.
      </p>
    </div>
  );
}
