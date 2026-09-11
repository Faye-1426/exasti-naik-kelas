"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_UTAMA, sedangAktif } from "@/lib/nav";

/** Navigasi ponsel. Di atas 1024px digantikan sidebar. */
export function NavBawah() {
  const path = usePathname();

  return (
    <nav
      aria-label="Navigasi utama"
      className="sticky bottom-0 z-20 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto flex max-w-3xl">
        {NAV_UTAMA.map(({ href, label, Icon }) => {
          const aktif = sedangAktif(path, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={aktif ? "page" : undefined}
                className={cn(
                  "flex h-touch-lg flex-col items-center justify-center gap-0.5 px-1 text-caption transition-colors",
                  aktif
                    ? "font-medium text-ink"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {/* Ikon selalu didampingi teks — bukan ikon saja. */}
                <span className="leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
