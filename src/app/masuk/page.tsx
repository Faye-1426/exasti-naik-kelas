import { FormAuth, Kolom, Tautan } from "@/components/form-auth";
import { masuk } from "@/lib/auth-actions";

export const metadata = { title: "Masuk — Naik Kelas" };

export default function Masuk() {
  return (
    <FormAuth
      judul="Masuk"
      keterangan="Buka catatan usaha Anda."
      aksi={masuk}
      tombol="Masuk"
      bawah={
        <div className="grid gap-2">
          <p>
            Lupa kata sandi? <Tautan href="/lupa-sandi" anak="Atur ulang" />
          </p>
          <p>
            Belum punya akun? <Tautan href="/daftar" anak="Daftar" />
          </p>
        </div>
      }
    >
      <Kolom nama="email" label="Email" tipe="email" autoComplete="email" />
      <Kolom nama="sandi" label="Kata sandi" tipe="password" autoComplete="current-password" />
    </FormAuth>
  );
}
