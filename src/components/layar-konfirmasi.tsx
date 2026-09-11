"use client";

import { useMemo, useState, useTransition } from "react";
import { AlertTriangle, Camera, Eye, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatRupiah } from "@/lib/format";
import {
  AMBANG_RAGU,
  tambalanNama,
  totalPenjualan,
  urutkanRagu,
  type BarisKonfirmasi,
  type HasilParsing,
  type Produk,
} from "@/lib/parsing";
import { daftarProdukCepat, simpanBatch } from "@/lib/unggah-actions";

/** F2 — SATU layar konfirmasi untuk keempat jalur input (FR2.8).
 *
 *  Ini aturan arsitektur, bukan selera: kalau tiap jalur punya layar sendiri,
 *  logika penyimpanan terduplikasi empat kali dan cepat atau lambat salah satu
 *  cabang lupa memeriksa sesuatu. Keempat jalur bermuara pada `HasilParsing`
 *  yang bentuknya sama, jadi komponen ini tidak tahu — dan tidak perlu tahu —
 *  data ini datang dari screenshot, teks, foto, atau suara.
 *
 *  Tata letak kartu per baris, bukan tabel dengan gulir mendatar: ini permukaan
 *  MENYUNTING dengan empat isian per baris, dan di layar 360px tabel seperti itu
 *  memaksa pengguna menggeser bolak-balik sambil mengetik angka uang. */

type Props = {
  hasil: HasilParsing;
  /** Master produk, untuk menautkan nama yang diketik ke produk terdaftar. */
  produk: Produk[];
  onBatal: () => void;
  onSelesai: (jumlahBaris: number) => void;
};

/** Satu daftar saran dipakai bersama semua baris. <datalist> bawaan peramban,
 *  bukan dropdown buatan sendiri: di Android ia muncul sebagai daftar yang
 *  menyempit sambil mengetik, tanpa satu baris pun kode pencarian. */
const ID_DAFTAR = "daftar-produk";

let nomorBarisManual = 0;

export function LayarKonfirmasi({ hasil, produk, onBatal, onSelesai }: Props) {
  // Baris ragu diurutkan ke atas SEKALI di awal (FR2.2). Kalau diurutkan ulang
  // di setiap ketikan, baris melompat di bawah jari pengguna saat disunting.
  const [baris, setBaris] = useState<BarisKonfirmasi[]>(() => urutkanRagu(hasil.baris));
  const [tanggal, setTanggal] = useState(hasil.tanggal || hariIni());
  const [totalOnly, setTotalOnly] = useState(hasil.totalOnlyAmount ?? 0);
  const [jumlahTransaksi, setJumlahTransaksi] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [menyimpan, mulaiSimpan] = useTransition();

  const rinci = hasil.detailLevel === "itemized";
  // Tidak ada batch berarti tidak ada yang dibaca mesin: pengguna mengetik
  // sendiri. Yang berubah cuma kata-katanya — tidak ada yang perlu "diperiksa"
  // kalau angkanya baru saja diketik orangnya sendiri.
  const manual = hasil.batchId === null;
  const total = useMemo(() => totalPenjualan(baris), [baris]);
  const barisKosong = baris.filter((b) => b.qty <= 0 || b.total <= 0);

  function ubah(kunci: string, tambalan: Partial<BarisKonfirmasi>) {
    setBaris((lama) =>
      lama.map((b) => {
        if (b.kunci !== kunci) return b;
        const baru = { ...b, ...tambalan };
        // Total ikut jumlah × harga saat salah satunya disunting, tapi total
        // yang diketik langsung tetap menang — laporan marketplace kerap punya
        // total yang tidak sama dengan jumlah × harga karena promo.
        if (tambalan.qty !== undefined || tambalan.hargaSatuan !== undefined) {
          baru.total = baru.qty * baru.hargaSatuan;
        }
        // Harga yang diketik sendiri bukan lagi isian dari daftar produk.
        // Tapi kalau tambalannya sendiri yang menyebutkan asalnya (hasil
        // pencocokan nama), keterangan itu yang menang.
        if (tambalan.hargaSatuan !== undefined && tambalan.hargaDariMaster === undefined) {
          baru.hargaDariMaster = false;
        }
        // Begitu disentuh manusia, baris tidak lagi "tidak terbaca".
        baru.kosong = b.kosong && baru.qty <= 0 && baru.total <= 0;
        return baru;
      }),
    );
  }

  function tambahBaris() {
    setBaris((lama) => [
      ...lama,
      {
        kunci: `manual-${nomorBarisManual++}`,
        nama: "",
        namaAsli: "",
        produkId: null,
        qty: 0,
        hargaSatuan: 0,
        total: 0,
        confidence: 1, // diisi manusia, bukan dibaca AI
        kosong: false,
        hargaDariMaster: false,
      },
    ]);
  }

  function simpan() {
    setGalat(null);
    mulaiSimpan(async () => {
      const balasan = await simpanBatch({
        batchId: hasil.batchId,
        channelId: hasil.channelId,
        detailLevel: hasil.detailLevel,
        tanggal,
        baris: baris.map((b) => ({
          nama: b.nama,
          produkId: b.produkId,
          qty: b.qty,
          hargaSatuan: b.hargaSatuan,
          total: b.total,
          confidence: b.confidence,
        })),
        totalOnly: rinci ? null : totalOnly,
        transactionCount: jumlahTransaksi ? Number(jumlahTransaksi) : null,
      });
      if (!balasan.ok) setGalat(balasan.galat);
      else onSelesai(balasan.data.jumlahBaris);
    });
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-section">
            {manual ? "Isi penjualannya" : "Periksa dulu sebelum disimpan"}
          </h2>
          {hasil.perluPerhatian && (
            <Badge variant="negative" className="gap-1">
              <AlertTriangle className="size-4" aria-hidden />
              Perlu perhatian
            </Badge>
          )}
        </div>
        <p className="text-body text-muted-foreground">
          {manual ? (
            <>
              Diketik sendiri untuk kanal <strong>{hasil.namaKanal}</strong>. Belum ada yang
              tersimpan sampai kamu tekan Simpan di bawah.
            </>
          ) : (
            <>
              Hasil pembacaan otomatis dari kanal <strong>{hasil.namaKanal}</strong>. Belum ada
              yang tersimpan. Perbaiki yang keliru, lalu tekan Konfirmasi di bawah.
            </>
          )}
        </p>
      </section>

      {/* Dugaan platform TIDAK pernah mengubah kanal — pengguna yang memutuskan. */}
      {hasil.peringatanPlatform && (
        <Pemberitahuan nada="peringatan" Ikon={Eye} judul="Kanalnya sudah benar?">
          {hasil.peringatanPlatform}
        </Pemberitahuan>
      )}

      {hasil.fotoBuruk && (
        <Pemberitahuan nada="peringatan" Ikon={Camera} judul="Fotonya kurang jelas">
          Sebagian besar catatan sulit dibaca. Hasilnya boleh dipakai, tapi memotret ulang dengan
          cahaya lebih terang biasanya jauh lebih akurat.
        </Pemberitahuan>
      )}

      {/* Bagian yang terlihat ada tapi tidak terbaca. Ini yang membuat confidence
          saja tidak cukup jadi penjaga mutu: baris yang tertutup penuh tidak
          punya confidence karena tidak terdeteksi sama sekali. */}
      {hasil.unreadableRegions.length > 0 && (
        <Pemberitahuan nada="peringatan" Ikon={AlertTriangle} judul="Ada bagian yang tidak terbaca">
          <ul className="ml-4 list-disc space-y-1">
            {hasil.unreadableRegions.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          <p className="mt-2">
            Kalau ada penjualan yang hilang di daftar bawah, tambahkan sendiri dengan tombol
            &ldquo;Tambah baris&rdquo;.
          </p>
        </Pemberitahuan>
      )}

      {hasil.unmatchedPhrases.length > 0 && (
        <Pemberitahuan nada="netral" Ikon={AlertTriangle} judul="Sebutan yang belum dikenal">
          <p>Bagian ini terdengar, tapi tidak cocok dengan produk mana pun:</p>
          <ul className="ml-4 mt-1 list-disc space-y-1">
            {hasil.unmatchedPhrases.map((f, i) => (
              <li key={i}>&ldquo;{f}&rdquo;</li>
            ))}
          </ul>
          <p className="mt-2">Tambahkan sebagai baris baru kalau itu memang penjualan.</p>
        </Pemberitahuan>
      )}

      <div className="space-y-2">
        <Label htmlFor="tanggal-jual">Tanggal penjualan</Label>
        <Input
          id="tanggal-jual"
          type="date"
          value={tanggal}
          onChange={(e) => setTanggal(e.target.value)}
          className="h-touch w-full max-w-56 text-body"
        />
      </div>

      {rinci ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-section">Rincian penjualan</h3>
            <span className="text-caption text-muted-foreground">{baris.length} baris</span>
          </div>

          {baris.length === 0 && (
            <p className="rounded-lg border border-dashed border-border-strong p-4 text-body text-muted-foreground">
              {manual
                ? "Belum ada baris. Tekan “Tambah baris” untuk mulai mengisi."
                : "Tidak ada baris terbaca. Tambahkan sendiri di bawah."}
            </p>
          )}

          <ul className="space-y-3">
            {baris.map((b) => (
              <BarisSunting
                key={b.kunci}
                baris={b}
                produk={produk}
                onUbah={(t) => ubah(b.kunci, t)}
                onHapus={() => setBaris((lama) => lama.filter((x) => x.kunci !== b.kunci))}
              />
            ))}
          </ul>

          <datalist id={ID_DAFTAR}>
            {produk.map((p) => (
              <option key={p.id} value={p.name} label={formatRupiah(p.selling_price)} />
            ))}
          </datalist>

          <Button type="button" variant="outline" onClick={tambahBaris} className="w-full">
            <Plus aria-hidden />
            Tambah baris
          </Button>

          <div className="flex items-baseline justify-between rounded-lg bg-muted px-4 py-3">
            <span className="text-label">Total penjualan</span>
            <span className="num text-metric">{formatRupiah(total)}</span>
          </div>
        </section>
      ) : (
        <section className="space-y-3">
          <h3 className="text-section">Total penjualan</h3>
          <p className="text-body text-muted-foreground">
            Laporan ini hanya memuat total, tanpa rincian per produk. Datanya disimpan sebagai
            total harian — margin per produk belum bisa dihitung dari sini.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="total-only">Nilai total</Label>
              <Input
                id="total-only"
                type="number"
                inputMode="numeric"
                min={0}
                value={totalOnly || ""}
                onChange={(e) => setTotalOnly(Number(e.target.value))}
                className="num h-touch text-body"
              />
              <p className="text-caption text-muted-foreground">{formatRupiah(totalOnly)}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jumlah-transaksi">Jumlah transaksi (boleh dikosongkan)</Label>
              <Input
                id="jumlah-transaksi"
                type="number"
                inputMode="numeric"
                min={0}
                value={jumlahTransaksi}
                onChange={(e) => setJumlahTransaksi(e.target.value)}
                className="num h-touch text-body"
              />
            </div>
          </div>
        </section>
      )}

      {hasil.ringkasan && <RincianBiaya ringkasan={hasil.ringkasan} totalBiaya={hasil.totalBiaya} />}

      {/* Baris kosong tidak boleh tersimpan tanpa disadari: kalau lolos, produknya
          tercatat, omzetnya nol, dan selisihnya tidak pernah ketahuan. */}
      {rinci && barisKosong.length > 0 && (
        <Pemberitahuan nada="peringatan" Ikon={AlertTriangle} judul="Masih ada baris kosong">
          {barisKosong.length} baris belum ada jumlah atau nilainya. Isi angkanya, atau hapus
          barisnya kalau memang tidak ada penjualannya.
        </Pemberitahuan>
      )}

      {galat && (
        <p role="alert" className="rounded-lg bg-negative-soft px-4 py-3 text-body text-negative">
          {galat}
        </p>
      )}

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row-reverse">
        <Button
          type="button"
          variant="amber"
          size="lg"
          onClick={simpan}
          disabled={menyimpan || (rinci && (baris.length === 0 || barisKosong.length > 0))}
          className="sm:flex-1"
        >
          {menyimpan ? "Menyimpan…" : manual ? "Simpan penjualan" : "Konfirmasi dan simpan"}
        </Button>
        <Button type="button" variant="outline" size="lg" onClick={onBatal} disabled={menyimpan}>
          Batal
        </Button>
      </div>
    </div>
  );
}

// ── Satu baris yang bisa disunting ──────────────────────────────────────────

function BarisSunting({
  baris,
  produk,
  onUbah,
  onHapus,
}: {
  baris: BarisKonfirmasi;
  produk: Produk[];
  onUbah: (t: Partial<BarisKonfirmasi>) => void;
  onHapus: () => void;
}) {
  const [mendaftar, mulaiDaftar] = useTransition();
  const [galatDaftar, setGalatDaftar] = useState<string | null>(null);
  const ragu = baris.confidence < AMBANG_RAGU;
  const belumDikenal = baris.produkId === null && baris.nama.trim() !== "";

  function daftarkan() {
    setGalatDaftar(null);
    mulaiDaftar(async () => {
      const balasan = await daftarProdukCepat(baris.nama, baris.hargaSatuan);
      if (!balasan.ok) setGalatDaftar(balasan.galat);
      else onUbah({ produkId: balasan.data.id, nama: balasan.data.name });
    });
  }

  return (
    <li
      className={[
        "rounded-lg border p-3",
        baris.kosong
          ? "border-dashed border-negative bg-negative-soft"
          : ragu
            ? "border-amber bg-amber-soft"
            : "border-border bg-card",
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Input
            aria-label="Nama produk"
            list={ID_DAFTAR}
            value={baris.nama}
            placeholder={baris.kosong ? "Baris ini tidak terbaca — isi namanya" : "Nama produk"}
            // Nama yang cocok dengan master (termasuk aliasnya) langsung
            // ditautkan dan harganya ikut terisi; yang tidak cocok melepas
            // tautannya. Keputusannya ada di tambalanNama supaya bisa diuji.
            onChange={(e) => onUbah(tambalanNama(e.target.value, baris, produk))}
            className="h-touch text-body"
          />
          {baris.namaAsli && baris.namaAsli !== baris.nama && (
            <p className="text-caption text-muted-foreground">
              Terbaca sebagai: &ldquo;{baris.namaAsli}&rdquo;
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onHapus}
          aria-label={`Hapus baris ${baris.nama || "kosong"}`}
          className="text-muted-foreground hover:text-negative"
        >
          <Trash2 aria-hidden />
        </Button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Angka label="Jumlah" nilai={baris.qty} onUbah={(n) => onUbah({ qty: n })} />
        <Angka label="Harga" nilai={baris.hargaSatuan} onUbah={(n) => onUbah({ hargaSatuan: n })} />
        <Angka label="Total" nilai={baris.total} onUbah={(n) => onUbah({ total: n })} />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* Baris kosong dibedakan dari penjualan senilai nol: yang satu menunggu
            diisi, yang satu memang tidak laku. */}
        {baris.kosong && (
          <Badge variant="negative">Terlihat ada, tidak terbaca — isi angkanya</Badge>
        )}
        {ragu && !baris.kosong && <Badge variant="unknown">Kurang yakin, periksa lagi</Badge>}
        {/* Angka yang diisikan sistem tidak boleh terlihat sama dengan angka
            yang dibaca dari catatan. Pengguna harus bisa membedakannya sebelum
            menekan Konfirmasi. */}
        {baris.hargaDariMaster && (
          <Badge variant="default">Harga dari daftar produk</Badge>
        )}
        {belumDikenal && (
          <>
            <Badge variant="unknown">Belum terdaftar</Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={daftarkan}
              disabled={mendaftar || baris.hargaSatuan <= 0}
            >
              {mendaftar ? "Mendaftarkan…" : "Daftarkan produk"}
            </Button>
          </>
        )}
        {belumDikenal && baris.hargaSatuan <= 0 && (
          <span className="text-caption text-muted-foreground">Isi harga dulu untuk mendaftarkan.</span>
        )}
        {galatDaftar && <span className="text-caption text-negative">{galatDaftar}</span>}
      </div>
    </li>
  );
}

function Angka({
  label,
  nilai,
  onUbah,
}: {
  label: string;
  nilai: number;
  onUbah: (n: number) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-caption text-muted-foreground">{label}</span>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={nilai || ""}
        placeholder="0"
        onChange={(e) => onUbah(Number(e.target.value) || 0)}
        className="num h-touch w-full text-right text-body"
      />
    </label>
  );
}

// ── Rincian biaya, baris per baris sesuai screenshot ────────────────────────

function RincianBiaya({
  ringkasan,
  totalBiaya,
}: {
  ringkasan: NonNullable<HasilParsing["ringkasan"]>;
  totalBiaya: number | null;
}) {
  return (
    <section className="space-y-3 rounded-lg border p-4">
      <h3 className="text-section">Rincian dari laporan</h3>
      <p className="text-caption text-muted-foreground">
        Disalin apa adanya supaya bisa dicocokkan baris per baris dengan screenshot aslinya.
        Potongan di sini <strong>tidak</strong> dipakai menghitung margin — margin memakai
        persentase komisi kanal yang kamu atur sendiri, karena potongan di laporan berubah tiap
        hari akibat promo dan subsidi.
      </p>

      <dl className="space-y-2 text-body">
        <BarisNilai label="Penjualan kotor" nilai={ringkasan.grossRevenue} />
        {ringkasan.fees.map((f, i) => (
          <BarisNilai
            key={i}
            label={f.label}
            nilai={f.amount}
            ragu={f.confidence < AMBANG_RAGU}
          />
        ))}
        {ringkasan.fees.length === 0 && (
          <p className="text-body text-unknown">Tidak ada baris potongan yang terbaca.</p>
        )}
        {totalBiaya !== null && ringkasan.fees.length > 0 && (
          <BarisNilai label="Jumlah semua potongan" nilai={totalBiaya} hitungan />
        )}
        <BarisNilai label="Penerimaan bersih" nilai={ringkasan.netRevenue} />
      </dl>
    </section>
  );
}

function BarisNilai({
  label,
  nilai,
  ragu,
  hitungan,
}: {
  label: string;
  nilai: number;
  ragu?: boolean;
  hitungan?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-baseline justify-between gap-4 border-b border-border pb-2 last:border-0",
        hitungan ? "bg-muted -mx-2 rounded px-2 pt-2" : "",
      ].join(" ")}
    >
      <dt className="min-w-0 text-muted-foreground">
        <span className="break-words">{label}</span>
        {/* Angka hitungan dibedakan dari angka bacaan: pengguna harus tahu mana
            yang tertulis di screenshot dan mana yang dijumlahkan sistem. */}
        {hitungan && <span className="ml-2 text-caption">(dihitung sistem, bukan dibaca)</span>}
        {ragu && <span className="ml-2 text-caption text-negative">kurang yakin</span>}
      </dt>
      <dd className="num shrink-0 tabular-nums">{formatRupiah(nilai)}</dd>
    </div>
  );
}

function Pemberitahuan({
  nada,
  Ikon,
  judul,
  children,
}: {
  nada: "peringatan" | "netral";
  Ikon: typeof AlertTriangle;
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[
        "flex gap-3 rounded-lg border p-4 text-body",
        nada === "peringatan" ? "border-amber bg-amber-soft" : "border-border bg-muted",
      ].join(" ")}
    >
      <Ikon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="min-w-0">
        <p className="font-medium">{judul}</p>
        <div className="mt-1 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function hariIni(): string {
  return new Date().toLocaleDateString("sv-SE"); // sv-SE = YYYY-MM-DD, waktu lokal
}
