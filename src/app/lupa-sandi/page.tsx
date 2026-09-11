import { FormAuth, Kolom, Tautan } from "@/components/form-auth";
import { kirimPemulihan } from "@/lib/auth-actions";

export const metadata = { title: "Lupa kata sandi — Naik Kelas" };

export default function LupaSandi() {
  return (
    <FormAuth
      judul="Lupa kata sandi"
      keterangan="Masukkan email Anda. Kami kirim tautan untuk membuat kata sandi baru."
      aksi={kirimPemulihan}
      tombol="Kirim tautan"
      bawah={
        <p>
          Ingat kata sandinya? <Tautan href="/masuk" anak="Masuk" />
        </p>
      }
    >
      <Kolom nama="email" label="Email" tipe="email" autoComplete="email" />
    </FormAuth>
  );
}
