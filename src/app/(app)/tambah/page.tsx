import { TambahJalur } from "@/components/tambah-jalur";
import { supabaseServer } from "@/lib/supabase";
import type { Kanal, Produk } from "@/lib/parsing";

/** `?jalur=voice_input&kanal=...` datang dari penanda kelengkapan di dashboard
 *  dan halaman margin (FR10.3). Nilainya tidak dipercaya begitu saja: kanal
 *  dicocokkan ke daftar milik usaha ini di dalam TambahJalur. */
export default async function Halaman({
  searchParams,
}: {
  searchParams: { jalur?: string; kanal?: string };
}) {
  const supabase = supabaseServer();
  const [{ data }, { data: produkMentah }] = await Promise.all([
    supabase.from("channels").select("id, name").eq("is_active", true).order("name"),
    supabase.from("products").select("id, name, aliases, selling_price").order("name"),
  ]);

  // numeric Postgres sampai di sini sebagai string. Dibiarkan apa adanya,
  // harga "5000" akan masuk ke isian angka sebagai teks dan diam-diam
  // merusak penjumlahan di layar konfirmasi.
  const produk: Produk[] = (produkMentah ?? []).map((x) => ({
    ...x,
    selling_price: Number(x.selling_price),
  }));

  // Diperiksa di server, tempat kuncinya memang berada. Tanpa ini pengguna baru
  // tahu jalur otomatis tidak tersedia setelah memotret, mengunggah, dan
  // menunggu — lalu diberi pesan galat. GEMINI_API_KEY tidak pernah ikut ke
  // klien, hanya jawaban ya/tidak ini.
  const aiSiap = Boolean(process.env.GEMINI_API_KEY);

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="space-y-2">
        <h1 className="text-title">Tambah catatan</h1>
        <p className="text-body text-muted-foreground">
          {aiSiap
            ? "Unggah screenshot, tempel teks, foto catatan, sebutkan lewat suara, atau ketik sendiri. Hasil pembacaan selalu kamu periksa dulu sebelum tersimpan."
            : "Ketik penjualannya sendiri. Belum ada yang tersimpan sampai kamu tekan Simpan."}
        </p>
      </div>
      <TambahJalur
        kanal={(data ?? []) as Kanal[]}
        produk={produk}
        aiSiap={aiSiap}
        awalKanal={searchParams.kanal}
        mulaiSuara={searchParams.jalur === "voice_input"}
      />
    </div>
  );
}
