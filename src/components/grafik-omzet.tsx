"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatRingkas, formatRupiah } from "@/lib/format";
import type { TitikHari } from "@/lib/ringkasan";

/** Grafik tren omzet harian (F8, dan bagian 6 dokumen laporan F6).
 *
 *  Batang, bukan garis. Garis menyambungkan dua hari yang tercatat lewat hari
 *  yang tidak tercatat, dan sambungan itu terbaca sebagai jualan yang berjalan
 *  landai padahal di antaranya tidak ada catatan sama sekali. Batang tidak bisa
 *  berbohong seperti itu: hari tanpa catatan tidak punya batang.
 *
 *  Satu-satunya pekerjaan komponen ini menggambar. Setiap angkanya sudah
 *  dihitung di server (aturan keras 4) — di sini tidak ada penjumlahan, hanya
 *  pemformatan.
 */

/** "07" pada "2026-09-07" → "7". Nol di depan hanya menambah lebar tanpa
 *  menambah arti di sumbu yang sempit. */
const namaHari = (iso: string) => String(Number(iso.slice(8, 10)));

export function GrafikOmzet({
  titik,
  tinggi = 220,
}: {
  titik: TitikHari[];
  /** Laporan cetak memakai grafik yang lebih pendek supaya muat satu halaman. */
  tinggi?: number;
}) {
  if (titik.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border-strong p-6 text-center text-body text-muted-foreground">
        Belum ada penjualan tercatat pada periode ini.
      </p>
    );
  }

  const adaIsi = titik.some((t) => t.adaCatatan);

  return (
    <div>
      <div style={{ height: tinggi }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={titik} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--chart-grid))" />
            <XAxis
              dataKey="tanggal"
              tickFormatter={namaHari}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--chart-grid))" }}
              // Tanggal di sumbu tidak perlu lengkap — bulannya sudah tertulis
              // di judul bagian. Yang dibutuhkan pembaca hanya letak harinya.
              interval="preserveStartEnd"
              minTickGap={12}
              tick={{ fill: "hsl(var(--chart-axis))", fontSize: 13 }}
            />
            <YAxis
              tickFormatter={formatRingkas}
              tickLine={false}
              axisLine={false}
              width={52}
              tick={{ fill: "hsl(var(--chart-axis))", fontSize: 13 }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted))" }}
              content={({ active, payload }) => {
                const d = payload?.[0]?.payload as TitikHari | undefined;
                if (!active || !d) return null;
                return (
                  <div className="rounded-md border border-border bg-card px-3 py-2 shadow-card">
                    <p className="text-caption text-muted-foreground">{d.tanggal}</p>
                    <p className="num text-label">
                      {/* Hari tanpa catatan TIDAK ditulis "Rp 0": nol berarti
                          jualan nihil, dan itu bukan yang diketahui. */}
                      {d.adaCatatan ? formatRupiah(d.omzet) : "Belum dicatat"}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="omzet" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {titik.map((t) => (
                <Cell key={t.tanggal} fill="hsl(var(--chart-1))" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-caption text-muted-foreground">
        {adaIsi
          ? "Angka di sumbu bawah adalah tanggal. Hari tanpa batang berarti belum ada catatan, bukan jualan nihil."
          : "Belum ada satu hari pun yang tercatat pada periode ini."}
      </p>
    </div>
  );
}
