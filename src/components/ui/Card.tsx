import { cn } from "@/lib/utils";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-border bg-background p-5 shadow-card", className)}>
      {children}
    </div>
  );
}
