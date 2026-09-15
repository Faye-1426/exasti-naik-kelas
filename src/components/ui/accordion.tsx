"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/** Perubahan dari default shadcn (lihat DESIGN.md §4 dan §5):
 *  - Pemicu minimal 44px dan memakai text-body, bukan text-sm. Ini pertanyaan
 *    yang dibaca pemilik warung, bukan label antarmuka.
 *  - Isi memakai text-body juga; jawaban 14px tidak terbaca di bawah matahari.
 *  - Animasi buka/tutup memakai keyframes accordion-down / accordion-up di
 *    tailwind.config.ts. Ini SATU-SATUNYA animasi bergerak yang ditambahkan ke
 *    aplikasi selain umpan balik tekan: gunanya menunjukkan bahwa isi tumbuh
 *    dari pertanyaan yang ditekan, bukan menggantikan layar. 200ms, dan aturan
 *    prefers-reduced-motion di globals.css membuatnya langsung terbuka tanpa
 *    gerak — isinya tetap muncul, hanya perjalanannya yang hilang.
 *
 *  CATATAN: `npx shadcn add accordion` akan menimpa berkas ini. */
const Accordion = AccordionPrimitive.Root

const AccordionItem = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>
>(({ className, ...props }, ref) => (
  <AccordionPrimitive.Item
    ref={ref}
    className={cn("border-b border-border last:border-b-0", className)}
    {...props}
  />
))
AccordionItem.displayName = "AccordionItem"

const AccordionTrigger = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Header className="flex">
    <AccordionPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex min-h-touch-lg flex-1 items-center justify-between gap-3 py-3 text-left text-body font-medium transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&[data-state=open]>svg]:rotate-180",
        className
      )}
      {...props}
    >
      {children}
      {/* Panah ikut berputar — penanda kedua di samping tinggi isi, supaya
          keadaan terbuka tetap terlihat saat animasi dimatikan. */}
      <ChevronDown
        className="size-5 shrink-0 text-muted-foreground transition-transform duration-200"
        aria-hidden
      />
    </AccordionPrimitive.Trigger>
  </AccordionPrimitive.Header>
))
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
  React.ElementRef<typeof AccordionPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <AccordionPrimitive.Content
    ref={ref}
    className="overflow-hidden text-body data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
    {...props}
  >
    <div className={cn("space-y-3 pb-4 pr-8 text-muted-foreground", className)}>
      {children}
    </div>
  </AccordionPrimitive.Content>
))
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
