import Link from "next/link";
import { Landmark, Scale, Sparkles } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

/** Halaman tanya jawab.
 *
 *  Ada karena satu pertanyaan yang tidak punya tempat di layar mana pun: "angka
 *  ini dari mana?". Selama jawabannya cuma hidup di kepala tim, skor 0-100
 *  terlihat seperti ketentuan resmi — padahal sebagiannya kerangka kami sendiri.
 *
 *  Dua aturan yang dipegang seluruh isi halaman ini:
 *
 *  1. Yang PUNYA dasar hukum selalu disertai nomor pasalnya, supaya pembaca
 *     bisa memeriksanya sendiri. Yang TIDAK punya dasar dikatakan apa adanya —
 *     terutama bobot, ambang, dan pengali plafon.
 *  2. Bahasanya bahasa warung, bukan bahasa peraturan. Nomor pasal ditaruh
 *     sebagai catatan kecil di bawah jawaban, bukan di tengah kalimat.
 *
 *  Isinya statis, jadi halaman ini boleh dirender sekali saat build. Tidak ada
 *  satu pun angka pengguna di sini. */

export const metadata = { title: "Tanya jawab — Naik Kelas" };

type Butir = {
  tanya: string;
  jawab: React.ReactNode;
  /** Pasal yang mendasari jawaban. Kosong = memang tidak ada dasarnya. */
  dasar?: string;
};

type Bagian = {
  kunci: string;
  judul: string;
  jelas: string;
  Ikon: typeof Scale;
  butir: Butir[];
};

const BAGIAN: Bagian[] = [
  {
    kunci: "skor",
    judul: "Tentang skor kesiapan",
    jelas: "Pertanyaan yang paling sering muncul: angkanya dari mana.",
    Ikon: Scale,
    butir: [
      {
        tanya: "Angka 0 sampai 100 ini dari mana?",
        jawab: (
          <>
            <p>
              Dari catatan Anda sendiri, dihitung di server kami, bukan dari data usaha orang
              lain dan bukan dari bank.
            </p>
            <p>
              Enam hal yang dinilai — seberapa rajin Anda mencatat, seberapa stabil omzet,
              berapa untung bersihnya, sudah berapa lama usaha berjalan, perbandingan uang
              masuk dan uang keluar, serta kelengkapan dokumen. Empat dari enam mengambil nama
              yang sama persis dengan komponen penilaian kredit yang diatur OJK.
            </p>
          </>
        ),
        dasar:
          "POJK 40/POJK.03/2019 Pasal 11 ayat (2) dan (3) — profitabilitas, arus kas, ketersediaan dan keakuratan informasi keuangan debitur, kelengkapan dokumentasi",
      },
      {
        tanya: "Kenapa bobotnya 25, 20, 20, 15, 10, dan 10? Siapa yang menetapkan?",
        jawab: (
          <>
            <p>
              <strong className="text-foreground">Kami sendiri.</strong> Tidak ada peraturan
              yang menetapkan angka-angka itu, dan kami tidak akan mengaku sebaliknya.
            </p>
            <p>
              Peraturan OJK memang menyebutkan komponen apa saja yang dinilai, tapi
              menuliskannya secara bertingkat — &ldquo;perolehan laba tinggi dan
              stabil&rdquo;, &ldquo;perolehan laba rendah&rdquo; — bukan berangka. Cara
              mengubah tingkatan itu jadi angka diserahkan ke model internal masing-masing
              bank, dan model itu tidak pernah dipublikasikan.
            </p>
            <p>
              Hal yang sama berlaku untuk ambangnya: untung bersih 20% untuk nilai penuh, uang
              masuk 1,25 kali uang keluar, naik turun omzet 10%. Semua itu kerangka kami,
              dipilih supaya langkah perbaikannya masuk akal dikerjakan pemilik warung.
            </p>
          </>
        ),
      },
      {
        tanya: "Kalau skor saya 80, berarti pasti diterima?",
        jawab: (
          <>
            <p>
              Tidak. Skor ini sama sekali bukan keputusan kredit, dan Naik Kelas bukan bank.
            </p>
            <p>
              Bank memakai data yang tidak terlihat aplikasi ini — terutama riwayat pinjaman
              Anda di lembaga lain. Gunakan halaman Kesiapan KUR untuk tahu apa yang perlu
              dibereskan sebelum mengajukan, bukan untuk menebak diterima atau ditolak.
            </p>
          </>
        ),
      },
      {
        tanya: "Kenapa perkiraan plafonnya berupa rentang, bukan satu angka?",
        jawab: (
          <>
            <p>
              Karena satu angka bulat akan terbaca sebagai janji, dan kami tidak berada dalam
              posisi menjanjikan apa pun.
            </p>
            <p>
              Perlu dikatakan terus terang: rentang 3 sampai 6 kali omzet bulanan itu{" "}
              <strong className="text-foreground">bukan aturan</strong>. Kami sudah membaca
              seluruh peraturan KUR yang berlaku, dan tidak ada satu pasal pun yang mengaitkan
              besar pinjaman dengan kelipatan omzet. Itu kebiasaan penilaian bank. Yang punya
              dasar hukum hanya batas atasnya.
            </p>
          </>
        ),
        dasar:
          "Pagu: Permenko 1/2026 Pasal 29 ayat (1), Pasal 36 ayat (1), dan Pasal 43 ayat (1). Pengali 3–6 kali: tidak ada dasar peraturan.",
      },
    ],
  },
  {
    kunci: "kur",
    judul: "Tentang KUR",
    jelas: "Syaratnya diatur pemerintah, dan seluruhnya bisa diperiksa sendiri.",
    Ikon: Landmark,
    butir: [
      {
        tanya: "Apa itu KUR, dan berapa yang bisa saya pinjam?",
        jawab: (
          <>
            <p>
              KUR adalah kredit usaha dengan bunga disubsidi pemerintah, disalurkan lewat bank
              biasa. Ada tiga ukuran:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">KUR Super Mikro</strong> — sampai Rp 10
                juta, bunga 3% setahun
              </li>
              <li>
                <strong className="text-foreground">KUR Mikro</strong> — di atas Rp 10 juta
                sampai Rp 100 juta
              </li>
              <li>
                <strong className="text-foreground">KUR Kecil</strong> — di atas Rp 100 juta
                sampai Rp 500 juta
              </li>
            </ul>
            <p>
              Sampai Rp 100 juta tidak boleh diminta jaminan tambahan; yang jadi jaminan cuma
              usaha yang dibiayai.
            </p>
          </>
        ),
        dasar:
          "Permenko 1/2026 Pasal 29, 36, 43 (plafon), Pasal 30 dan 37 (bunga), Pasal 20 ayat (2) (agunan tambahan)",
      },
      {
        tanya: "Usaha saya baru jalan 3 bulan. Harus menunggu dulu?",
        jawab: (
          <>
            <p>
              Belum tentu. Syarat umumnya memang usaha sudah berjalan minimal 6 bulan, tapi
              untuk KUR Super Mikro peraturannya sendiri menyediakan empat jalan keluar. Cukup
              salah satu:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>mengikuti pendampingan usaha</li>
              <li>mengikuti pelatihan kewirausahaan atau pelatihan lainnya</li>
              <li>tergabung dalam kelompok usaha</li>
              <li>punya anggota keluarga yang sudah menjalankan usaha</li>
            </ul>
            <p>Tanyakan keempatnya ke petugas bank — ini hak Anda, bukan kelonggaran.</p>
          </>
        ),
        dasar: "Permenko 1/2026 Pasal 26 ayat (2)",
      },
      {
        tanya: "Saya belum punya NPWP. Pengajuan saya gagal?",
        jawab: (
          <>
            <p>Belum tentu, dan ini sering disalahpahami.</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">KUR Super Mikro</strong> — NPWP tidak
                disyaratkan sama sekali
              </li>
              <li>
                <strong className="text-foreground">KUR Mikro</strong> — baru disyaratkan kalau
                pinjamannya di atas Rp 50 juta
              </li>
              <li>
                <strong className="text-foreground">KUR Kecil</strong> — disyaratkan
              </li>
            </ul>
            <p>
              Karena itu halaman Kesiapan KUR tidak lagi mengurangi nilai Anda kalau skema yang
              diperkirakan memang tidak memintanya.
            </p>
          </>
        ),
        dasar:
          "Permenko 1/2026 Pasal 26 ayat (1) untuk super mikro, Pasal 34 ayat (1) huruf d untuk mikro, Pasal 41 ayat (1) huruf d untuk kecil",
      },
      {
        tanya: "Saya cuma punya surat keterangan usaha dari kelurahan, bukan NIB. Cukup?",
        jawab: (
          <p>
            Cukup. Peraturannya menulis &ldquo;NIB <strong className="text-foreground">atau</strong>{" "}
            surat keterangan usaha mikro dan kecil yang diterbitkan pejabat yang
            berwenang&rdquo;. Keduanya setara. Kalau Anda ingin mengurus NIB, gratis lewat
            oss.go.id dan biasanya terbit hari itu juga.
          </p>
        ),
        dasar: "Permenko 1/2026 Pasal 26, 34, dan 41 ayat (1) huruf b",
      },
      {
        tanya: "Apa ada batas omzet supaya masih dianggap usaha kecil?",
        jawab: (
          <p>
            Ada. Omzet setahun paling banyak Rp 4,8 miliar. Di atas itu usaha Anda tidak lagi
            tergolong mikro atau kecil, jadi tidak berhak KUR — berapa pun skor kesiapannya.
            Yang menarik: peraturannya menerima laporan perpajakan atau penilaian bank sebagai
            bukti skala usaha, dan laporan yang dicetak Naik Kelas dibuat untuk keperluan
            seperti itu.
          </p>
        ),
        dasar: "Permenko 1/2026 Pasal 3 ayat (2) dan ayat (3)",
      },
    ],
  },
  {
    kunci: "angka",
    judul: "Tentang angka di aplikasi",
    jelas: "Kenapa sebagian tempat sengaja dibiarkan kosong.",
    Ikon: Sparkles,
    butir: [
      {
        tanya: "Kenapa untung beberapa menu tertulis “belum bisa dihitung”?",
        jawab: (
          <>
            <p>
              Karena modal per porsinya belum diisi, atau penjualannya tercatat hanya sebagai
              total harian tanpa rincian barang.
            </p>
            <p>
              Kami memilih menuliskannya apa adanya daripada menebak. Menganggap modal yang
              kosong sebagai nol akan melaporkan untung 100% — dan angka itu ikut terbawa ke
              bank.
            </p>
          </>
        ),
      },
      {
        tanya: "Di grafik, hari yang kosong kenapa tidak ditulis Rp 0?",
        jawab: (
          <p>
            Karena keduanya berbeda arti. &ldquo;Rp 0&rdquo; berarti hari itu benar-benar tidak
            ada yang terjual; kosong berarti hari itu belum dicatat. Menyamakan keduanya akan
            menampilkan usaha Anda seolah lebih sepi dari kenyataannya.
          </p>
        ),
      },
      {
        tanya: "Pembacaan otomatis bisa salah tidak?",
        jawab: (
          <>
            <p>
              Bisa, dan karena itu tidak ada satu pun hasil pembacaan yang langsung tersimpan.
              Semuanya lewat layar pemeriksaan dulu, dan Anda yang menekan tombol simpan.
            </p>
            <p>
              Baris yang kurang meyakinkan ditandai supaya diperiksa lebih dulu. Baris yang
              terlihat ada tapi tidak terbaca tidak dibuang — ditampilkan dengan angka kosong
              supaya Anda bisa mengisinya, sebab baris yang hilang diam-diam mengurangi omzet
              tanpa ada yang tahu.
            </p>
          </>
        ),
      },
      {
        tanya: "Kenapa satu menu untungnya beda-beda tiap tempat jualan?",
        jawab: (
          <p>
            Karena aplikasi pesan-antar memotong komisi, sedangkan jualan di warung tidak. Es
            teh yang untung Rp 820 di warung bisa jadi rugi Rp 180 begitu terjual lewat
            aplikasi berkomisi 20%. Inilah yang paling sering tidak terlihat tanpa dicatat, dan
            halaman Margin dibuat khusus untuk menunjukkannya.
          </p>
        ),
      },
    ],
  },
];

export default function Halaman() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <header className="space-y-1">
        <h1 className="text-title">Tanya jawab</h1>
        <p className="text-caption text-muted-foreground">
          Dari mana angka-angka di aplikasi ini berasal, dan mana yang punya dasar peraturan.
        </p>
      </header>

      {/* Ditaruh paling atas, bukan sebagai catatan kaki. Inilah satu kalimat
          yang paling ingin diketahui siapa pun yang membuka halaman ini. */}
      <div className="rounded-lg border-l-4 border-ink border-y border-r border-border bg-card p-4 shadow-card">
        <p className="text-label">Ringkasnya</p>
        <p className="mt-1 text-body text-muted-foreground">
          Syarat kelayakan KUR dan pagunya diatur pemerintah, dan setiap angkanya kami sebutkan
          pasalnya. Bobot serta ambang skor kesiapan adalah kerangka Naik Kelas sendiri —
          tidak ada peraturan yang mengaturnya, dan kami tidak berpura-pura ada.
        </p>
      </div>

      {BAGIAN.map((b) => (
        <section key={b.kunci} aria-labelledby={b.kunci} className="space-y-3">
          <div className="space-y-1">
            <h2 id={b.kunci} className="flex items-center gap-2 text-section">
              <b.Ikon className="size-5 shrink-0 text-ink" aria-hidden />
              {b.judul}
            </h2>
            <p className="text-caption text-muted-foreground">{b.jelas}</p>
          </div>

          <div className="rounded-lg border border-border bg-card px-4 shadow-card">
            {/* collapsible: satu jawaban terbuka pada satu waktu, dan boleh
                ditutup semua. Membuka semuanya sekaligus membuat halaman ini
                panjang sekali di layar 360px. */}
            <Accordion type="single" collapsible>
              {b.butir.map((x, i) => (
                <AccordionItem key={i} value={`${b.kunci}-${i}`}>
                  <AccordionTrigger>{x.tanya}</AccordionTrigger>
                  <AccordionContent>
                    {x.jawab}
                    {x.dasar ? (
                      <p className="border-t border-border pt-3 text-caption text-unknown">
                        Dasar: {x.dasar}
                      </p>
                    ) : (
                      <p className="border-t border-border pt-3 text-caption text-unknown">
                        Dasar: tidak ada peraturan yang mengatur ini. Ini kerangka Naik Kelas.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      ))}

      <section
        aria-labelledby="sumber"
        className="space-y-3 rounded-lg border border-border-strong bg-muted p-4"
      >
        <h2 id="sumber" className="text-label">
          Peraturan yang dirujuk halaman ini
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-body text-muted-foreground">
          <li>
            Peraturan Menteri Koordinator Bidang Perekonomian Nomor 1 Tahun 2026 tentang
            Pedoman Pelaksanaan Kredit Usaha Rakyat — berlaku 13 Januari 2026
          </li>
          <li>
            Peraturan Otoritas Jasa Keuangan Nomor 40/POJK.03/2019 tentang Penilaian Kualitas
            Aset Bank Umum
          </li>
          <li>
            Undang-Undang Nomor 10 Tahun 1998 atas Undang-Undang Nomor 7 Tahun 1992 tentang
            Perbankan, Pasal 8 beserta penjelasannya
          </li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button asChild variant="outline" size="sm">
            <Link href="/kur">Lihat kesiapan KUR saya</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/laporan">Siapkan laporan untuk bank</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
