import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi. Lihat .env.local.example");
}

/** Klien Supabase sisi server. Semua kueri lewat sini supaya RLS ikut sesi
 *  pengguna — tidak ada service role key di aplikasi. */
export function supabaseServer() {
  const store = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (daftar) => {
        try {
          daftar.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Dipanggil dari Server Component yang tidak boleh menulis cookie.
          // Middleware yang menyegarkan sesi, jadi aman diabaikan.
        }
      },
    },
  });
}

/** Usaha milik akun yang sedang masuk. Satu akun = satu usaha. */
export async function usahaSaya() {
  const supabase = supabaseServer();
  const { data } = await supabase.from("businesses").select("*").maybeSingle();
  return data;
}
