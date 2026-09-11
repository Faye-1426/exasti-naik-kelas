import { FormAuth, Kolom, Tautan } from "@/components/form-auth";
import { daftar } from "@/lib/auth-actions";

export const metadata = { title: "Daftar — Naik Kelas" };

export default function Daftar() {
  return (
    <FormAuth
      judul="Daftar"
      keterangan="Satu akun untuk satu usaha."
      aksi={daftar}
      tombol="Buat akun"
      bawah={
        <p>
          Sudah punya akun? <Tautan href="/masuk" anak="Masuk" />
        </p>
      }
    >
      <Kolom nama="nama_usaha" label="Nama usaha" placeholder="Warung Bu Sri" />
      <Kolom nama="nama_pemilik" label="Nama Anda" autoComplete="name" />
      <Kolom nama="email" label="Email" tipe="email" autoComplete="email" />
      <Kolom
        nama="sandi"
        label="Kata sandi"
        tipe="password"
        autoComplete="new-password"
        minLength={8}
        bantuan="Minimal 8 huruf atau angka."
      />
    </FormAuth>
  );
}
