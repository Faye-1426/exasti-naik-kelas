import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase";

/** Tujuan tautan pemulihan kata sandi dari email. Menukar token jadi sesi,
 *  lalu melempar ke halaman pembuatan kata sandi baru. */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const token_hash = q.get("token_hash");
  const type = q.get("type") as EmailOtpType | null;

  if (token_hash && type) {
    const { error } = await supabaseServer().auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL("/sandi-baru", request.url));
  }

  return NextResponse.redirect(new URL("/lupa-sandi?galat=kedaluwarsa", request.url));
}
