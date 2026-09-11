import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

/** IBM Plex Sans, tiga berat saja. 300 terlalu tipis untuk layar Android murah,
 *  700 tidak perlu karena 600 sudah cukup tegas. Lihat DESIGN.md §2.1. */
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Naik Kelas",
  description: "Catatan penjualan warung jadi bukti kelayakan kredit.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale sengaja tidak dibatasi — pengguna usia 40-an memakai zoom.
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={plex.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
