"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { supabaseServer } from "./supabase";

/** Semua aksi mengembalikan pesan galat berbahasa Indonesia, atau null kalau
 *  berhasil. Dipakai lewat useFormState. */
export type Hasil = string | null;

/** Galat 5xx dari Supabase BUKAN salah pengguna. Menyamarkannya jadi "sandi
 *  salah" pernah menyembunyikan kerusakan basis data berjam-jam: layar bilang
 *  sandinya keliru, padahal sandinya tidak pernah sempat diperiksa.
 *  Kode galatnya ikut ditampilkan supaya bisa dicari saat menelusuri. */
function galatServer(error: { status?: number; code?: string }): string | null {
  if (!error.status || error.status < 500) return null;
  return `Ada gangguan di server, bukan kata sandimu. Coba beberapa saat lagi. (kode: ${error.code ?? error.status})`;
}

export async function masuk(_sebelumnya: Hasil, data: FormData): Promise<Hasil> {
  const { error } = await supabaseServer().auth.signInWithPassword({
    email: String(data.get("email")),
    password: String(data.get("sandi")),
  });
  if (error) return galatServer(error) ?? "Email atau kata sandi salah. Coba lagi.";
  revalidatePath("/", "layout");
  redirect("/");
}

export async function daftar(_sebelumnya: Hasil, data: FormData): Promise<Hasil> {
  const sandi = String(data.get("sandi"));
  if (sandi.length < 8) return "Kata sandi minimal 8 huruf atau angka.";

  const supabase = supabaseServer();
  const { data: akun, error } = await supabase.auth.signUp({
    email: String(data.get("email")),
    password: sandi,
  });
  if (error) {
    return (
      galatServer(error) ??
      (error.message.includes("already")
        ? "Email ini sudah terdaftar. Silakan masuk."
        : "Pendaftaran gagal. Coba beberapa saat lagi.")
    );
  }
  if (!akun.user) return "Pendaftaran gagal. Coba beberapa saat lagi.";

  // Satu akun = satu usaha. Dibuat sekaligus supaya tidak ada akun tanpa usaha.
  const { data: usaha, error: galatUsaha } = await supabase
    .from("businesses")
    .insert({
      auth_user_id: akun.user.id,
      name: String(data.get("nama_usaha")),
      owner_name: String(data.get("nama_pemilik")),
    })
    .select("id")
    .single();
  if (galatUsaha || !usaha) return "Akun dibuat tapi data usaha gagal disimpan. Hubungi kami.";

  // Kanal bawaan. Tanpa ini /tambah tidak punya kanal untuk dipilih dan
  // pengguna baru mentok di layar kosong. Komisinya 0 sampai diisi sendiri —
  // menebak 20% akan mencemari perhitungan margin (aturan keras 2).
  await supabase.from("channels").insert(
    ["Offline", "GoFood", "ShopeeFood", "WhatsApp"].map((name) => ({
      business_id: usaha.id,
      name,
    })),
  );

  revalidatePath("/", "layout");
  redirect("/");
}

export async function keluar() {
  await supabaseServer().auth.signOut();
  revalidatePath("/", "layout");
  redirect("/masuk");
}

export async function kirimPemulihan(_sebelumnya: Hasil, data: FormData): Promise<Hasil> {
  const asal = headers().get("origin") ?? "";
  const { error } = await supabaseServer().auth.resetPasswordForEmail(
    String(data.get("email")),
    { redirectTo: `${asal}/auth/konfirmasi` },
  );
  // Sengaja tidak membedakan email terdaftar atau tidak — supaya daftar email
  // pengguna tidak bisa diintip dari luar.
  if (error) return "Gagal mengirim. Coba beberapa saat lagi.";
  return "TERKIRIM";
}

export async function gantiSandi(_sebelumnya: Hasil, data: FormData): Promise<Hasil> {
  const sandi = String(data.get("sandi"));
  if (sandi.length < 8) return "Kata sandi minimal 8 huruf atau angka.";

  const { error } = await supabaseServer().auth.updateUser({ password: sandi });
  if (error) return "Tautan pemulihan sudah kedaluwarsa. Minta tautan baru.";
  revalidatePath("/", "layout");
  redirect("/");
}
