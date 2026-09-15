import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** Ukuran default shadcn (h-9 = 36px) diganti. Semua tombol minimal 44px,
 *  aksi utama 48px — lihat DESIGN.md §4. Ini syarat kelulusan, bukan gaya.
 *
 *  `active:scale-[0.97]` adalah SATU-SATUNYA gerak di berkas ini, dan gunanya
 *  umpan balik sentuhan: `hover:` tidak pernah terjadi di layar sentuh, jadi
 *  tanpa ini menekan tombol tidak memberi tanda apa pun sampai layar berikutnya
 *  selesai dirender. Di ponsel Android kelas menengah jeda itu cukup panjang
 *  untuk membuat orang menekan dua kali. 150ms (bawaan di tailwind.config)
 *  masih di dalam anggaran umpan balik tekan 100-160ms, dan `transform` tidak
 *  memicu layout sehingga tidak membebani GPU kelas bawah.
 *
 *  CATATAN: `npx shadcn add` akan menimpa berkas ini. Kalau tombol tiba-tiba
 *  mengecil lagi, itu penyebabnya — kembalikan dari git, jangan tulis ulang. */
const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-label transition-[color,background-color,border-color,transform] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Aksi utama. Satu per layar. Teks gelap di atas amber —
         *  amber + putih hanya 2.2:1 dan gagal kena sinar matahari. */
        amber:
          "bg-amber text-amber-foreground shadow-card hover:bg-amber-hover",
        default: "bg-ink text-primary-foreground hover:bg-ink-hover",
        outline: "border border-border-strong bg-card hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "hover:bg-muted",
        link: "text-ink underline-offset-4 hover:underline",
        /** Hanya untuk aksi yang benar-benar merusak data. Bukan untuk galat. */
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
      },
      size: {
        default: "h-touch px-4",
        lg: "h-touch-lg px-6 text-body",
        /** Tetap 44px. Tidak ada tombol lebih kecil di ponsel. */
        sm: "h-touch px-3",
        icon: "h-touch w-touch",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
