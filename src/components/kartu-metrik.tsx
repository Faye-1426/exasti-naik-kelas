import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatJumlah, formatRupiah } from "@/lib/format";

type Props = {
  label: string;
  /** null berarti data belum diketahui. Ditampilkan sebagai teks, tidak pernah 0. */
  nilai: number | null;
  catatan?: string;
  /** Angka yang artinya untung/rugi diwarnai semantik.
   *  Omzet dan uang masuk TIDAK — besar bukan berarti baik. */
  semantik?: boolean;
  /** "jumlah" untuk cacahan seperti banyaknya transaksi: 40 transaksi bukan
   *  Rp 40. Bawaannya rupiah karena itu yang paling sering. */
  jenis?: "rupiah" | "jumlah";
};

export function KartuMetrik({ label, nilai, catatan, semantik, jenis = "rupiah" }: Props) {
  const kosong = nilai === null;

  return (
    <Card className="rounded-lg border-border bg-card p-4 shadow-card">
      <p className="text-label text-muted-foreground">{label}</p>
      <p
        className={cn(
          "num mt-1",
          kosong ? "text-title text-unknown" : "text-metric",
          semantik && !kosong && nilai < 0 && "text-negative",
          semantik && !kosong && nilai > 0 && "text-positive"
        )}
      >
        {kosong ? "Belum ada data" : jenis === "jumlah" ? formatJumlah(nilai) : formatRupiah(nilai)}
      </p>
      {catatan ? (
        <p className="mt-1 text-caption text-muted-foreground">{catatan}</p>
      ) : null}
    </Card>
  );
}
