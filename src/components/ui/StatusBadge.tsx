import { cn } from "@/lib/utils";

type StatusTone = "overdue" | "due-today" | "due-soon" | "on-track" | "archived";

const TONE_LABEL: Record<StatusTone, string> = {
  overdue: "Terlambat",
  "due-today": "Hari ini",
  "due-soon": "Segera",
  "on-track": "Sesuai jadwal",
  archived: "Arsip"
};

const TONE_CLASS: Record<StatusTone, string> = {
  overdue: "bg-danger-soft text-status-overdue",
  "due-today": "bg-warn-soft text-status-due-today",
  "due-soon": "bg-warn-soft text-status-due-soon",
  "on-track": "bg-primary-soft text-status-on-track",
  archived: "bg-muted text-status-archived"
};

export function StatusBadge({ tone, label }: { tone: StatusTone; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold", TONE_CLASS[tone])}>
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />
      {label ?? TONE_LABEL[tone]}
    </span>
  );
}
