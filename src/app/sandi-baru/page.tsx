import { FormAuth, Kolom } from "@/components/form-auth";
import { gantiSandi } from "@/lib/auth-actions";

export const metadata = { title: "Kata sandi baru — Naik Kelas" };

/** Dibuka dari tautan email lewat /auth/konfirmasi, jadi sesinya sudah aktif. */
export default function SandiBaru() {
  return (
    <FormAuth
      judul="Buat kata sandi baru"
      keterangan="Setelah disimpan, Anda langsung masuk."
      aksi={gantiSandi}
      tombol="Simpan kata sandi"
    >
      <Kolom
        nama="sandi"
        label="Kata sandi baru"
        tipe="password"
        autoComplete="new-password"
        minLength={8}
        bantuan="Minimal 8 huruf atau angka."
      />
    </FormAuth>
  );
}
