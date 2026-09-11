"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { TombolKeluar } from "@/components/tombol-keluar";
import { NAV_LAINNYA, NAV_UTAMA, sedangAktif, type ButirNav } from "@/lib/nav";

/** collapsible="none" disengaja.
 *  Mode ciut jadi ikon-saja melanggar DESIGN.md §4 — setiap butir wajib
 *  ikon + teks. Efek sampingnya bagus: jalur cookie penyimpanan state di
 *  komponen shadcn tidak pernah dijalankan. */
export function NavSamping({ namaUsaha }: { namaUsaha: string }) {
  const path = usePathname();

  const butir = (b: ButirNav) => {
    const aktif = sedangAktif(path, b.href);
    return (
      <SidebarMenuItem key={b.href}>
        <SidebarMenuButton
          asChild
          size="lg"
          isActive={aktif}
          // h-auto: butir dua baris (label + keterangan) tidak muat di h-12
          // bawaan. min-h tetap 48px supaya lolos syarat target sentuh.
          className="h-auto min-h-touch-lg py-2 text-body data-[active=true]:font-semibold"
        >
          <Link href={b.href} aria-current={aktif ? "page" : undefined}>
            <b.Icon className="size-5 shrink-0" aria-hidden />
            <span className="flex flex-col gap-0.5 overflow-hidden">
              <span className="truncate leading-tight">{b.label}</span>
              <span className="truncate text-caption font-normal opacity-70">
                {b.jelas}
              </span>
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="none"
      // Di bawah 1024px navigasi ditangani nav bawah, sidebar disembunyikan.
      className="sticky top-0 hidden h-svh border-r border-sidebar-border lg:flex"
    >
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2.5">
          <Store className="size-6 shrink-0 text-white" aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-white">
              Naik Kelas
            </p>
            <p className="truncate text-caption opacity-80">{namaUsaha}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">{NAV_UTAMA.map(butir)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-caption opacity-70">
            Lainnya
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {NAV_LAINNYA.map(butir)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border gap-3 p-4">
        <TombolKeluar className="w-full hover:bg-sidebar-accent" />
        <p className="text-caption opacity-70">
          Skor KUR bersifat indikatif, bukan keputusan bank.
        </p>
      </SidebarFooter>
    </Sidebar>
  );
}
