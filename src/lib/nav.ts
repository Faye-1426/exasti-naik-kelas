import {
  FileText,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  Package,
  Percent,
  PlusCircle,
  type LucideIcon,
} from "lucide-react";

export type ButirNav = {
  href: string;
  label: string;
  /** Keterangan satu baris. Hanya dipakai di sidebar desktop yang punya ruang. */
  jelas: string;
  Icon: LucideIcon;
};

/** Nav bawah ponsel dibatasi 5 butir (DESIGN.md §4), jadi ini isinya persis 5. */
export const NAV_UTAMA: ButirNav[] = [
  {
    href: "/",
    label: "Ringkasan",
    jelas: "Omzet dan untung bulan ini",
    Icon: LayoutDashboard,
  },
  {
    href: "/tambah",
    label: "Tambah",
    jelas: "Catat penjualan baru",
    Icon: PlusCircle,
  },
  {
    href: "/produk",
    label: "Produk",
    jelas: "Modal per porsi",
    Icon: Package,
  },
  {
    href: "/margin",
    label: "Margin",
    jelas: "Untung per produk dan kanal",
    Icon: Percent,
  },
  {
    href: "/kur",
    label: "Skor KUR",
    jelas: "Perkiraan kesiapan pinjaman",
    Icon: Gauge,
  },
];

/** Desktop punya ruang untuk butir yang jarang dipakai. Di ponsel, /laporan
 *  dijangkau lewat tombol di header Ringkasan. */
export const NAV_LAINNYA: ButirNav[] = [
  {
    href: "/laporan",
    label: "Laporan",
    jelas: "Berkas untuk dibawa ke bank",
    Icon: FileText,
  },
  {
    href: "/tanya-jawab",
    label: "Tanya jawab",
    jelas: "Dari mana angka-angka ini berasal",
    Icon: HelpCircle,
  },
];

export function sedangAktif(path: string, href: string): boolean {
  return href === "/" ? path === "/" : path.startsWith(href);
}
