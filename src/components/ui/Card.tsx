import { cn } from "@/lib/utils";

/** Panel dasar. Tampilannya mengikuti skin aktif (.surface: Liquid Glass / Klasik). */
export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("surface p-5", className)}>{children}</div>;
}
