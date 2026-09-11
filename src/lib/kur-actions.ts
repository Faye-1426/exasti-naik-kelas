"use server";

import { revalidatePath } from "next/cache";

import { supabaseServer } from "./supabase";

/** FR5.5 — daftar dokumen yang bisa ditandai pengguna.
 *
 *  Satu-satunya masukan pengguna di halaman /kur. Sengaja berupa form HTML
 *  biasa dengan tombol Simpan, bukan saklar yang menyimpan saat disentuh:
 *  centang yang tidak sengaja kena jari akan langsung menaikkan skor 5 poin
 *  tanpa pengguna sadar apa yang berubah, dan skornya dibawa ke bank.
 *
 *  Kepemilikan dijaga RLS (policy `usaha_sendiri`), jadi tidak ada pemeriksaan
 *  id di sini — `eq("id", ...)` hanya menunjuk baris, bukan menjaganya. */
export async function simpanDokumen(data: FormData): Promise<void> {
  const supabase = supabaseServer();
  const { data: usaha } = await supabase.from("businesses").select("id").maybeSingle();
  if (!usaha) return;

  // Checkbox yang tidak dicentang tidak ikut terkirim sama sekali. Itulah cara
  // menghapus centang: nilainya dibaca sebagai ada/tidak ada, bukan true/false.
  await supabase
    .from("businesses")
    .update({
      has_nib: data.get("nib") !== null,
      has_npwp: data.get("npwp") !== null,
    })
    .eq("id", usaha.id);

  revalidatePath("/kur");
}
