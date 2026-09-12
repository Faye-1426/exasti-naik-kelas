import { NavBawah } from "@/components/nav-bawah";
import { NavSamping } from "@/components/nav-samping";
import { SidebarProvider } from "@/components/ui/sidebar";
import { TombolKeluar } from "@/components/tombol-keluar";
import { usahaSaya } from "@/lib/supabase";

/** Dua bentuk navigasi, satu sumber data (src/lib/nav.ts):
 *    < 1024px  → nav bawah, 5 butir, jempol
 *    ≥ 1024px  → sidebar ink, 6 butir + keterangan
 *
 *  /masuk sengaja di luar grup ini supaya tanpa navigasi. */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Middleware sudah menjamin ada sesi di sini.
  const usaha = await usahaSaya();
  const nama = usaha?.name ?? "Usaha saya";

  return (
    <SidebarProvider>
      {/* Lompat ke konten — tanpa ini pengguna keyboard menembus 6 tautan dulu. */}
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-body focus:text-white"
      >
        Lompat ke isi halaman
      </a>

      <NavSamping namaUsaha={nama} />

      <div className="flex min-h-svh min-w-0 flex-1 flex-col">
        {/* Sidebar desktop sudah memuat nama usaha dan tombol keluar.
            Di ponsel keduanya butuh tempatnya sendiri. */}
        <header
          data-cetak="sembunyi"
          className="flex items-center justify-between gap-2 border-b px-4 py-2 lg:hidden"
        >
          <p className="truncate text-label">{nama}</p>
          <TombolKeluar className="text-muted-foreground" />
        </header>

        <main
          id="konten"
          className="mx-auto w-full max-w-3xl flex-1 px-4 py-4 pb-8 lg:max-w-6xl lg:px-8 lg:py-8"
        >
          {children}
        </main>
        <NavBawah />
      </div>
    </SidebarProvider>
  );
}
