"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  ClipboardPaste,
  ImageUp,
  Loader2,
  Mic,
  NotebookPen,
  PencilLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RekamSuara, useDukunganSuara } from "@/components/rekam-suara";
import { LayarKonfirmasi } from "@/components/layar-konfirmasi";
import {
  hasilManual,
  type HasilParsing,
  type Kanal,
  type Produk,
  type SumberInput,
  type TingkatRincian,
} from "@/lib/parsing";
import { prosesUnggahan } from "@/lib/unggah-actions";

/** F1 — empat jalur masuk, satu muara.
 *
 *  Kanal ditentukan di sini, SEBELUM unggah, dan tidak pernah diubah oleh hasil
 *  parsing. `detected_platform` dari model hanya jadi pemeriksa silang di layar
 *  konfirmasi (lihat lib/parsing.ts `peringatanPlatform`). */

type Jalur = {
  sumber: SumberInput;
  judul: string;
  jelas: string;
  Icon: LucideIcon;
};

const JALUR: Jalur[] = [
  {
    sumber: "marketplace_screenshot",
    judul: "Unggah screenshot",
    jelas: "Laporan penjualan dari GoFood atau ShopeeFood",
    Icon: ImageUp,
  },
  {
    sumber: "pasted_text",
    judul: "Tempel teks pesanan",
    jelas: "Salin dari chat WhatsApp, lalu tempel di sini",
    Icon: ClipboardPaste,
  },
  {
    sumber: "handwritten_photo",
    judul: "Foto catatan tangan",
    jelas: "Buku kas atau nota yang ditulis tangan",
    Icon: NotebookPen,
  },
  {
    sumber: "voice_input",
    judul: "Rekam suara",
    jelas: "Sebutkan penjualan hari ini, tidak perlu mengetik",
    Icon: Mic,
  },
];

/** Contoh uji yang sudah diverifikasi, untuk tombol "Coba dengan contoh".
 *
 *  Berupa TEKS pesanan (jalur B), bukan berkas gambar. Tiga alasan, semuanya
 *  praktis: teks tidak butuh bucket penyimpanan yang harus sudah dimigrasi,
 *  tidak menambah satu berkas biner pun ke bundel yang diunduh pemilik warung
 *  berkuota terbatas, dan melewati jalur pembacaan AI yang sama persis dengan
 *  unggahan sungguhan — layar konfirmasi, pencocokan produk, dan pemeriksaan
 *  baris ragu semuanya berjalan apa adanya.
 *
 *  ponytail: satu contoh, jalur teks. Tambahkan contoh screenshot marketplace
 *  di public/ kalau demo perlu memperlihatkan jalur A tanpa berkas asli. */
const CONTOH_TEKS = `Pesanan hari ini bu:
Nasi Goreng Spesial 3x @18.000
Ayam Geprek 2 @20.000
Es Teh Manis 5x 5.000
Mie Goreng 1 16.000
Es Jeruk 2x @7.000`;

/** Jalur "ketik sendiri". Selalu ada, apa pun keadaan AI-nya (PRD 12.7).
 *
 *  Dipecah jadi dua pilihan, bukan satu pilihan dengan tombol radio di
 *  dalamnya: bedanya menentukan tabel tujuan (`sales` vs `sales_totals`) dan
 *  tidak bisa diubah setelah tersimpan, jadi lebih baik ditanyakan sebagai dua
 *  kalimat yang jelas daripada satu isian yang gampang terlewat. */
type JalurManual = {
  kunci: string;
  judul: string;
  jelas: string;
  Icon: LucideIcon;
  detail: TingkatRincian;
};

const MANUAL: JalurManual[] = [
  {
    kunci: "manual-rinci",
    judul: "Ketik rincian per produk",
    jelas: "Tahu persis apa saja yang terjual dan berapa banyak",
    Icon: PencilLine,
    detail: "itemized",
  },
  {
    kunci: "manual-total",
    judul: "Ketik total harian",
    jelas: "Cuma tahu jumlah uang masuknya, tanpa rincian barang",
    Icon: Calculator,
    detail: "total_only",
  },
];

export function TambahJalur({
  kanal,
  produk,
  aiSiap,
  awalKanal,
  mulaiSuara,
}: {
  kanal: Kanal[];
  produk: Produk[];
  aiSiap: boolean;
  /** Kanal yang sudah dipilihkan lewat URL, dari penanda kelengkapan (F10). */
  awalKanal?: string;
  /** FR10.3: buka langsung jalur rekam suara. */
  mulaiSuara?: boolean;
}) {
  const [kanalId, setKanalId] = useState(
    kanal.find((k) => k.id === awalKanal)?.id ?? kanal[0]?.id ?? "",
  );
  const [jalur, setJalur] = useState<Jalur | null>(null);
  const [teks, setTeks] = useState("");
  const [berkas, setBerkas] = useState<File | null>(null);
  const [hasil, setHasil] = useState<HasilParsing | null>(null);
  const [sukses, setSukses] = useState<number | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memproses, mulaiProses] = useTransition();
  const inputBerkas = useRef<HTMLInputElement>(null);
  const dukunganSuara = useDukunganSuara();

  /** FR10.3 — tautan "Sebutkan lewat suara" dari penanda kelengkapan mendarat
   *  langsung di layar rekam, bukan di daftar pilihan. Dipasang lewat efek,
   *  bukan sebagai nilai awal state: dukungan Web Speech API baru diketahui
   *  setelah komponen terpasang, dan mendaratkan pengguna di layar rekam yang
   *  tombolnya mati lebih buruk daripada menunjukkan daftar pilihan. */
  const [awalDipakai, setAwalDipakai] = useState(false);
  useEffect(() => {
    if (awalDipakai || !mulaiSuara || !aiSiap || dukunganSuara !== true) return;
    setAwalDipakai(true);
    setJalur(JALUR.find((j) => j.sumber === "voice_input") ?? null);
  }, [awalDipakai, mulaiSuara, aiSiap, dukunganSuara]);

  function ulangDariAwal() {
    setJalur(null);
    setTeks("");
    setBerkas(null);
    setHasil(null);
    setGalat(null);
  }

  /** F-tahap 4 — "Coba dengan contoh", berdampingan dengan opsi unggah bebas.
   *  Membuka jalur tempel teks dengan contoh yang sudah terisi lalu langsung
   *  membacanya: yang mau dilihat penguji adalah hasil pembacaannya, bukan
   *  proses menempelkan teks. Teksnya tetap terlihat dan bisa disunting kalau
   *  pembacaannya perlu diulang. */
  function cobaContoh() {
    const j = JALUR.find((x) => x.sumber === "pasted_text")!;
    setJalur(j);
    setTeks(CONTOH_TEKS);
    proses({ jalur: j, teks: CONTOH_TEKS });
  }

  function mulaiManual(m: JalurManual) {
    setGalat(null);
    setHasil(
      hasilManual(
        kanalId,
        kanal.find((k) => k.id === kanalId)?.name ?? "",
        m.detail,
        new Date().toLocaleDateString("sv-SE"), // sv-SE = YYYY-MM-DD, waktu lokal
      ),
    );
  }

  /** `pakai` memungkinkan tombol contoh memproses isinya sendiri tanpa
   *  menunggu satu putaran render: state React baru terbarui setelah komponen
   *  dirender ulang, jadi membaca `teks` di sini akan mengirim teks kosong. */
  function proses(pakai?: { jalur: Jalur; teks: string }) {
    const j = pakai?.jalur ?? jalur;
    if (!j) return;
    setGalat(null);
    const fd = new FormData();
    fd.set("sumber", j.sumber);
    fd.set("channel_id", kanalId);
    // Tanggal awal; hasil parsing boleh menggesernya, pengguna boleh menggantinya lagi.
    fd.set("tanggal", new Date().toLocaleDateString("sv-SE"));
    if (!pakai && berkas) fd.set("berkas", berkas);
    fd.set("teks", pakai?.teks ?? teks);

    mulaiProses(async () => {
      const balasan = await prosesUnggahan(fd);
      if (balasan.ok) setHasil(balasan.data);
      else setGalat(balasan.galat);
    });
  }

  if (sukses !== null) {
    return (
      <div className="space-y-4 rounded-lg border border-positive bg-positive-soft p-6">
        <h2 className="text-section text-positive">Tersimpan</h2>
        <p className="text-body">
          {sukses === 1 ? "1 catatan" : `${sukses} baris penjualan`} sudah masuk ke pembukuan.
        </p>
        <Button
          type="button"
          variant="amber"
          size="lg"
          onClick={() => {
            setSukses(null);
            ulangDariAwal();
          }}
        >
          Catat lagi
        </Button>
      </div>
    );
  }

  if (hasil) {
    return (
      <LayarKonfirmasi
        hasil={hasil}
        produk={produk}
        onBatal={ulangDariAwal}
        onSelesai={(jumlah) => setSukses(jumlah)}
      />
    );
  }

  if (!kanal.length) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong p-6 text-body text-muted-foreground">
        Belum ada kanal penjualan. Kanal dibuat otomatis saat mendaftar — hubungi kami kalau
        daftarnya kosong.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="kanal">Penjualan dari kanal mana?</Label>
        {/* Select bawaan peramban: di Android memunculkan pemilih layar penuh
            yang jauh lebih mudah ditekan daripada dropdown buatan sendiri. */}
        <select
          id="kanal"
          value={kanalId}
          onChange={(e) => setKanalId(e.target.value)}
          disabled={memproses}
          className="h-touch w-full max-w-sm rounded-lg border border-input bg-card px-3 text-body shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {kanal.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <p className="text-caption text-muted-foreground">
          Kanal ditentukan di sini, bukan ditebak dari isi laporan.
        </p>
      </div>

      {!jalur ? (
        <div className="space-y-6">
          {aiSiap ? (
            <div className="space-y-2">
              <h2 className="text-section">Datanya mau dimasukkan lewat mana?</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {JALUR.map((j) => {
                  // FR1.D.7: peramban tanpa Web Speech API tidak melihat tombolnya.
                  if (j.sumber === "voice_input" && dukunganSuara !== true) return null;
                  return (
                    <li key={j.sumber}>
                      <Kotak judul={j.judul} jelas={j.jelas} Icon={j.Icon} onClick={() => setJalur(j)} />
                    </li>
                  );
                })}
              </ul>
              {/* Berdampingan dengan opsi unggah bebas, tapi selebar dua kolom:
                  ini jalan masuk untuk yang belum punya data sendiri, bukan
                  jalur kelima yang setara. */}
              <div className="pt-1">
                <Kotak
                  judul="Coba dengan contoh"
                  jelas="Teks pesanan uji yang sudah diverifikasi. Tidak ada yang tersimpan sampai kamu setujui."
                  Icon={Sparkles}
                  onClick={cobaContoh}
                />
              </div>

              {dukunganSuara === false && (
                <p className="text-caption text-muted-foreground">
                  Peramban ini belum bisa merekam suara. Pakai &ldquo;Tempel teks pesanan&rdquo; —
                  hasilnya sama saja.
                </p>
              )}
            </div>
          ) : (
            /* Kunci AI belum dipasang di server, jadi keempat jalur otomatis
               PASTI gagal. Tombolnya ditutup di sini, bukan dibiarkan lalu
               gagal di akhir: pengguna tidak perlu memotret, mengunggah, dan
               menunggu setengah menit hanya untuk diberi tahu bahwa jalurnya
               memang tidak tersedia. */
            <div className="flex gap-3 rounded-lg border border-amber bg-amber-soft p-4 text-body">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium">Pembacaan otomatis sedang tidak aktif</p>
                <p className="mt-1 text-muted-foreground">
                  Unggah screenshot, foto catatan tangan, dan rekam suara belum bisa dipakai
                  karena kunci AI belum dipasang di server. Penjualannya tetap bisa dicatat —
                  ketik sendiri di bawah, hasilnya sama saja di pembukuan.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-section">{aiSiap ? "Atau ketik sendiri" : "Ketik sendiri"}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {MANUAL.map((m) => (
                <li key={m.kunci}>
                  <Kotak
                    judul={m.judul}
                    jelas={m.jelas}
                    Icon={m.Icon}
                    onClick={() => mulaiManual(m)}
                  />
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={ulangDariAwal} disabled={memproses}>
              <ArrowLeft aria-hidden />
              Ganti cara
            </Button>
            <h2 className="text-section">{jalur.judul}</h2>
          </div>

          {(jalur.sumber === "marketplace_screenshot" || jalur.sumber === "handwritten_photo") && (
            <div className="space-y-2">
              <input
                ref={inputBerkas}
                id="berkas"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                // capture: di ponsel langsung membuka kamera untuk foto catatan.
                capture={jalur.sumber === "handwritten_photo" ? "environment" : undefined}
                onChange={(e) => setBerkas(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => inputBerkas.current?.click()}
                disabled={memproses}
              >
                <jalur.Icon aria-hidden />
                {berkas ? "Ganti berkas" : jalur.sumber === "handwritten_photo" ? "Ambil atau pilih foto" : "Pilih screenshot"}
              </Button>
              <p className="text-caption text-muted-foreground">
                {berkas ? berkas.name : "JPG, PNG, atau WEBP. Paling besar 10 MB."}
              </p>
            </div>
          )}

          {jalur.sumber === "pasted_text" && (
            <div className="space-y-2">
              <Label htmlFor="teks-pesanan">Tempel teks pesanannya di sini</Label>
              <Textarea
                id="teks-pesanan"
                value={teks}
                onChange={(e) => setTeks(e.target.value)}
                rows={8}
                maxLength={5000}
                placeholder={"Contoh:\nNasi goreng 2x\nEs teh manis 3\nAyam bakar 1"}
                disabled={memproses}
              />
              <p className="text-caption text-muted-foreground">{teks.length} / 5.000 huruf</p>
            </div>
          )}

          {jalur.sumber === "voice_input" && <RekamSuara nilai={teks} onUbah={setTeks} />}

          {galat && (
            <p role="alert" className="rounded-lg bg-negative-soft px-4 py-3 text-body text-negative">
              {galat}
            </p>
          )}

          <Button
            type="button"
            variant="amber"
            size="lg"
            className="w-full"
            onClick={() => proses()}
            disabled={memproses || (berkas === null && teks.trim() === "")}
          >
            {memproses ? (
              <>
                <Loader2 className="gerak-proses animate-spin" aria-hidden />
                Sedang dibaca…
              </>
            ) : (
              "Baca datanya"
            )}
          </Button>
          {memproses && (
            <p aria-live="polite" className="text-center text-caption text-muted-foreground">
              Butuh beberapa detik. Belum ada yang tersimpan — nanti kamu periksa dulu hasilnya.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Satu kotak pilihan. Dipakai jalur AI dan jalur manual supaya keduanya punya
 *  target sentuh dan tata letak yang sama persis.
 *
 *  `active:scale-[0.98]` sama alasannya dengan tombol (lihat ui/button.tsx):
 *  kotak inilah ketukan pertama di seluruh alur unggah, dan `hover:bg-muted` di
 *  bawahnya tidak pernah aktif di layar sentuh. */
function Kotak({
  judul,
  jelas,
  Icon,
  onClick,
}: {
  judul: string;
  jelas: string;
  Icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-border-strong bg-card p-4 text-left shadow-card transition-[background-color,transform] active:scale-[0.98] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Icon className="mt-0.5 size-6 shrink-0 text-ink" aria-hidden />
      <span className="min-w-0">
        <span className="block text-body font-medium">{judul}</span>
        <span className="block text-caption text-muted-foreground">{jelas}</span>
      </span>
    </button>
  );
}
