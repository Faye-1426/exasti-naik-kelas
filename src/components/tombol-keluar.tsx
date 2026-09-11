import { LogOut } from "lucide-react";
import { keluar } from "@/lib/auth-actions";

/** Server Action lewat form biasa — tanpa JavaScript pun tetap jalan. */
export function TombolKeluar({ className = "" }: { className?: string }) {
  return (
    <form action={keluar}>
      <button
        type="submit"
        className={`flex min-h-touch items-center gap-2 rounded-lg px-2 text-body ${className}`}
      >
        <LogOut className="size-4 shrink-0" aria-hidden />
        Keluar
      </button>
    </form>
  );
}
