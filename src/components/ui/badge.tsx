import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/** text-xs (12px) diganti text-caption (13px) — tidak ada teks di bawah 13px.
 *  Varian positive/negative/unknown adalah lapis SEMANTIK: dipakai untuk arti
 *  untung/rugi/belum-diketahui, tidak pernah sebagai hiasan. */
const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-caption font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-ink-soft text-ink",
        outline: "border-border-strong text-foreground",
        positive: "border-transparent bg-positive-soft text-positive",
        negative: "border-transparent bg-negative-soft text-negative",
        /** Data belum ada. Bukan nol, bukan tebakan. */
        unknown: "border-transparent bg-unknown-soft text-unknown",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
