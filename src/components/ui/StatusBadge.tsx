import { cn } from "@/lib/utils";

type StatusTone = "overdue" | "due-today" | "due-soon" | "on-track" | "archived";

const TONE_LABEL: Record<StatusTone, string> = {
  overdue: "🔴 Overdue",
  "due-today": "🟠 Due Today",
  "due-soon": "🟡 Due Soon",
  "on-track": "🟢 On Track",
  archived: "Archived"
};

const TONE_CLASS: Record<StatusTone, string> = {
  overdue: "bg-status-overdue/10 text-status-overdue",
  "due-today": "bg-status-due-today/10 text-status-due-today",
  "due-soon": "bg-status-due-soon/10 text-status-due-soon",
  "on-track": "bg-status-on-track/10 text-status-on-track",
  archived: "bg-status-archived/10 text-status-archived"
};

export function StatusBadge({ tone, label }: { tone: StatusTone; label?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", TONE_CLASS[tone])}>
      {label ?? TONE_LABEL[tone]}
    </span>
  );
}
