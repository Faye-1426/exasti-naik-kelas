"use server";

import { revalidatePath } from "next/cache";

import { TIPE_BIAYA, type KomponenBiaya, type ProdukBiaya, type TipeBiaya } from "./hitung";
import { supabaseServer } from "./supabase";
import type { Balasan } from "./unggah-actions";

/** CRUD master produk dan komponen biaya (F4).
 *
 *  Kepemilikan dijaga RLS, bukan oleh berkas ini — setiap kueri lewat klien
 *  bersesi, jadi produk milik usaha lain tidak pernah terlihat apalagi tersunting.
 *  Yang diperiksa di sini adalah isi datanya: layar produk adalah UI, bukan
 *  penjaga, dan angka yang lolos ke sini langsung mengubah setiap perhitungan
 *  margin di seluruh aplikasi. */

const gagal = (galat: string): Balasan<never> => ({ ok: false, galat });

const TIPE_SAH = TIPE_BIAYA.map((t) => t.nilai) as string[];

export type ProdukMasukan = {
  /** null berarti produk baru. */
  id: string | null;
  nama: string;
  aliases: string[];
  kategori: string | null;
  hargaJual: number;
  susutPct: number;
  komponen: { nama: string; tipe: TipeBiaya; biaya: number }[];
};

/** Satu produk beserta komponen biayanya, siap dipakai mesin perhitungan. */
export type ProdukLengkap = ProdukBiaya & {
  aliases: string[];
  category: string | null;
};

// ── Pembacaan ───────────────────────────────────────────────────────────────

type BarisProduk = {
  id: string;
  name: string;
  aliases: string[] | null;
  category: string | null;
  selling_price: number;
  waste_pct: number;
  cost_components: (KomponenBiaya & { id: string })[] | null;
};

/** Angka dari Postgres numeric sampai di JavaScript sebagai string. Dibiarkan
 *  apa adanya, "5000" + 100 menjadi "5000100" dan seluruh margin salah tanpa
 *  satu pun galat muncul. Konversinya dipusatkan di sini. */
function rapikan(b: BarisProduk): ProdukLengkap {
  return {
    id: b.id,
    name: b.name,
    aliases: b.aliases ?? [],
    category: b.category,
    selling_price: Number(b.selling_price),
    waste_pct: Number(b.waste_pct),
    komponen: (b.cost_components ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      type: k.type,
      cost_per_unit: Number(k.cost_per_unit),
    })),
  };
}

const PILIH = "id, name, aliases, category, selling_price, waste_pct, cost_components (id, name, type, cost_per_unit)";

export async function daftarProduk(): Promise<ProdukLengkap[]> {
  const { data } = await supabaseServer()
    .from("products")
    .select(PILIH)
    .order("name");
  return ((data ?? []) as BarisProduk[]).map(rapikan);
}

export async function satuProduk(id: string): Promise<ProdukLengkap | null> {
  const { data } = await supabaseServer()
    .from("products")
    .select(PILIH)
    .eq("id", id)
    .maybeSingle();
  return data ? rapikan(data as BarisProduk) : null;
}

/** Kanal beserta persentase komisinya. Inilah SATU-SATUNYA sumber potongan
 *  platform untuk perhitungan margin — bukan `fees[]` dari hasil parsing AI. */
export async function daftarKanal() {
  const { data } = await supabaseServer()
    .from("channels")
    .select("id, name, commission_pct")
    .eq("is_active", true)
    .order("name");
  return (data ?? []).map((k) => ({ ...k, commission_pct: Number(k.commission_pct) }));
}

// ── Penyimpanan ─────────────────────────────────────────────────────────────

export async function simpanProduk(
  masukan: ProdukMasukan,
): Promise<Balasan<{ id: string }>> {
  const supabase = supabaseServer();

  const nama = masukan.nama.trim();
  if (!nama) return gagal("Nama produk belum diisi.");
  if (!Number.isFinite(masukan.hargaJual) || masukan.hargaJual < 0)
    return gagal("Harga jual belum diisi dengan benar.");
  if (!Number.isFinite(masukan.susutPct) || masukan.susutPct < 0 || masukan.susutPct > 100)
    return gagal("Persentase susut harus antara 0 dan 100.");

  // Komponen tanpa nama dibuang tanpa ribut — itu baris kosong yang tertinggal
  // dari tombol "Tambah komponen". Yang bernama tapi angkanya janggal ditolak,
  // karena diam-diam membuangnya akan mengecilkan HPP dan membesarkan untung.
  const komponen = masukan.komponen.filter((k) => k.nama.trim() !== "");
  const janggal = komponen.find(
    (k) => !Number.isFinite(k.biaya) || k.biaya < 0 || !TIPE_SAH.includes(k.tipe),
  );
  if (janggal) return gagal(`Biaya komponen "${janggal.nama}" belum benar.`);

  const isi = {
    name: nama,
    aliases: masukan.aliases.map((a) => a.trim()).filter(Boolean),
    category: masukan.kategori?.trim() || null,
    selling_price: masukan.hargaJual,
    waste_pct: masukan.susutPct,
  };

  let produkId = masukan.id;

  if (produkId) {
    const { error } = await supabase.from("products").update(isi).eq("id", produkId);
    if (error) return gagal("Produk gagal disimpan. Coba lagi.");
  } else {
    const { data: usaha } = await supabase.from("businesses").select("id").maybeSingle();
    if (!usaha) return gagal("Data usaha tidak ditemukan. Coba masuk ulang.");
    const { data, error } = await supabase
      .from("products")
      .insert({ ...isi, business_id: usaha.id })
      .select("id")
      .single();
    if (error || !data) return gagal("Produk gagal dibuat. Coba lagi.");
    produkId = data.id;
  }

  // ponytail: komponen lama dihapus lalu ditulis ulang, bukan dicocokkan satu
  // per satu. Tidak ada tabel lain yang menunjuk cost_components.id, jadi id
  // baru tidak merusak apa pun, dan jumlah komponennya belasan — bukan ribuan.
  // Ganti dengan upsert ber-id kalau nanti ada riwayat perubahan biaya.
  await supabase.from("cost_components").delete().eq("product_id", produkId);
  if (komponen.length) {
    const { error } = await supabase.from("cost_components").insert(
      komponen.map((k) => ({
        product_id: produkId,
        name: k.nama.trim(),
        type: k.tipe,
        cost_per_unit: k.biaya,
      })),
    );
    if (error) return gagal("Komponen biaya gagal disimpan. Periksa lalu coba lagi.");
  }

  revalidatePath("/produk", "layout");
  revalidatePath("/margin");
  return { ok: true, data: { id: produkId! } };
}

export async function hapusProduk(id: string): Promise<Balasan<null>> {
  const supabase = supabaseServer();

  // Penjualan yang sudah tercatat TIDAK ikut terhapus: sales.product_id
  // ber-`on delete set null`, jadi barisnya tetap ada dengan nama mentahnya dan
  // omzetnya tidak berkurang. Yang hilang cuma tautan ke HPP, sehingga
  // marginnya berubah jadi "belum bisa dihitung" — lihat `jumlahPenjualan`,
  // yang memberitahu dampaknya SEBELUM tombol hapus ditekan.
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return gagal("Produk gagal dihapus. Coba lagi.");

  revalidatePath("/produk", "layout");
  revalidatePath("/margin");
  return { ok: true, data: null };
}

/** Berapa baris penjualan yang menunjuk produk ini. Dipakai layar produk untuk
 *  memberi tahu apa yang akan terjadi SEBELUM tombol hapus ditekan. */
export async function jumlahPenjualan(id: string): Promise<number> {
  const { count } = await supabaseServer()
    .from("sales")
    .select("id", { count: "exact", head: true })
    .eq("product_id", id);
  return count ?? 0;
}
