import * as React from "react"

import { cn } from "@/lib/utils"

/** Perubahan dari default shadcn — sama persis dengan perlakuan Textarea:
 *  - h-9 (36px) -> h-touch (44px). Syarat kelulusan, bukan gaya.
 *  - text-base + md:text-sm -> text-body. `md:text-sm` adalah varian responsif,
 *    jadi ia MENGALAHKAN `text-body` yang dikirim pemanggil lewat className:
 *    Tailwind menaruh seluruh varian responsif sesudah utilitas polos. Akibatnya
 *    setiap isian angka uang mengecil jadi 14px di layar >= 768px, padahal
 *    DESIGN.md melarang angka mengecil di desktop.
 *  - ring-1 -> ring-2. Satu tebal cincin fokus untuk seluruh aplikasi.
 *  - bg-transparent -> bg-card. Isian di dalam baris amber/merah di layar
 *    konfirmasi ikut berwarna kalau transparan, dan kotak isian berhenti
 *    terlihat seperti kotak isian justru di baris yang paling perlu disunting.
 *
 *  CATATAN: `npx shadcn add input` akan menimpa berkas ini. Kembalikan dari git,
 *  jangan tulis ulang. */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-touch w-full rounded-lg border border-input bg-card px-3 py-1 text-body shadow-card transition-colors file:border-0 file:bg-transparent file:text-label file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
