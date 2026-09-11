"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Hasil } from "@/lib/auth-actions";

/** Satu kolom isian. Label selalu terlihat — bukan placeholder, karena
 *  placeholder hilang begitu diketik dan pengguna kehilangan konteks. */
export function Kolom({
  nama,
  label,
  tipe = "text",
  bantuan,
  ...sisa
}: {
  nama: string;
  label: string;
  tipe?: string;
  bantuan?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={nama} className="text-label">
        {label}
      </label>
      <Input
        id={nama}
        name={nama}
        type={tipe}
        required
        className="h-touch text-body"
        aria-describedby={bantuan ? `${nama}-bantuan` : undefined}
        {...sisa}
      />
      {bantuan && (
        <p id={`${nama}-bantuan`} className="text-caption text-muted-foreground">
          {bantuan}
        </p>
      )}
    </div>
  );
}

function Tombol({ anak }: { anak: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-touch-lg w-full text-body">
      {pending ? "Sebentar…" : anak}
    </Button>
  );
}

/** Kerangka semua halaman auth: judul, galat, isian, tombol, tautan bawah. */
export function FormAuth({
  judul,
  keterangan,
  aksi,
  tombol,
  bawah,
  children,
}: {
  judul: string;
  keterangan?: string;
  aksi: (sebelumnya: Hasil, data: FormData) => Promise<Hasil>;
  tombol: string;
  bawah?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [galat, kirim] = useFormState(aksi, null);

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-4 py-8">
      <div className="grid gap-1">
        <h1 className="text-title">{judul}</h1>
        {keterangan && <p className="text-body text-muted-foreground">{keterangan}</p>}
      </div>

      {galat && galat !== "TERKIRIM" && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-body text-destructive">
          {galat}
        </p>
      )}
      {galat === "TERKIRIM" && (
        <p role="status" className="rounded-lg bg-muted px-3 py-2 text-body">
          Kalau email itu terdaftar, tautan penggantian kata sandi sudah kami kirim.
          Cek kotak masuk dan folder spam.
        </p>
      )}

      <form action={kirim} className="grid gap-4">
        {children}
        <Tombol anak={tombol} />
      </form>

      {bawah && <div className="text-body text-muted-foreground">{bawah}</div>}
    </main>
  );
}

export function Tautan({ href, anak }: { href: string; anak: string }) {
  return (
    <Link href={href} className="font-medium text-ink underline underline-offset-4">
      {anak}
    </Link>
  );
}
