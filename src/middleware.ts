import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Halaman yang boleh dibuka tanpa masuk. Sisanya wajib punya sesi. */
const PUBLIK = ["/masuk", "/daftar", "/lupa-sandi", "/sandi-baru", "/auth"];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (daftar) => {
          daftar.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          daftar.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  // getUser(), bukan getSession() — hanya ini yang memverifikasi token ke server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const publik = PUBLIK.some((p) => path === p || path.startsWith(p + "/"));

  if (!user && !publik) {
    return NextResponse.redirect(new URL("/masuk", request.url));
  }
  // Sudah masuk tapi membuka halaman masuk/daftar → lempar ke dasbor.
  // /sandi-baru dan /auth dikecualikan: keduanya justru dipakai saat sesi aktif.
  if (user && publik && path !== "/sandi-baru" && !path.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
