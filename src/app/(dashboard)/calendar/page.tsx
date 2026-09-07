import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { PERMISSIONS } from "@/lib/permissions";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { classifyDeadline, getJakartaToday, type DeadlineTone } from "@/lib/format";

// Sama dengan token warna di StatusBadge, dipakai di sini karena chip kalender
// perlu label custom (nomor job) sehingga tidak bisa pakai komponen StatusBadge langsung.
const TONE_CHIP_CLASS: Record<DeadlineTone, string> = {
  overdue: "bg-status-overdue/10 text-status-overdue",
  "due-today": "bg-status-due-today/10 text-status-due-today",
  "due-soon": "bg-status-due-soon/10 text-status-due-soon",
  "on-track": "bg-status-on-track/10 text-status-on-track",
  archived: "bg-status-archived/10 text-status-archived"
};

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];
const DAY_NAMES = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

interface CalendarPageProps {
  searchParams: { year?: string; month?: string }; // month: 1-12
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  await requirePermission(PERMISSIONS.VIEW_JOBS);

  // "Hari ini" versi kantor (Asia/Jakarta), bukan timezone server -- dipakai
  // untuk default bulan yang ditampilkan dan penanda "hari ini" di grid.
  const jakartaToday = getJakartaToday();
  const todayYear = jakartaToday.getUTCFullYear();
  const todayMonth = jakartaToday.getUTCMonth();
  const todayDate = jakartaToday.getUTCDate();

  const year = searchParams.year ? parseInt(searchParams.year, 10) : todayYear;
  const month = searchParams.month ? parseInt(searchParams.month, 10) - 1 : todayMonth; // 0-indexed

  // UTC eksplisit (bukan local Date(y,m,1)) supaya konsisten dengan deadline
  // yang disimpan UTC-midnight, independen dari timezone server.
  const monthStart = new Date(Date.UTC(year, month, 1));
  const monthEnd = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  const [jobs, appointments] = await Promise.all([
    prisma.job.findMany({
      where: {
        deadline: { gte: monthStart, lte: monthEnd },
        recordStatus: "ACTIVE"
      },
      include: { client: true }
    }),
    prisma.appointment.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      include: { client: true, job: true }
    })
  ]);

  // Map tanggal (1-31) -> events
  type DayEvent = { type: "deadline" | "appointment"; label: string; href?: string; tone?: DeadlineTone };
  const eventsByDay = new Map<number, DayEvent[]>();

  for (const job of jobs) {
    if (!job.deadline) continue;
    // deadline disimpan UTC-midnight (date-only) -- getUTCDate supaya event
    // muncul di sel tanggal yang benar apa pun timezone server.
    const day = new Date(job.deadline).getUTCDate();
    const list = eventsByDay.get(day) ?? [];
    list.push({
      type: "deadline",
      label: `${job.jobNumber} — ${job.client.fullName}`,
      href: `/jobs/${job.id}`,
      // Konsisten dengan halaman Deadlines: warna chip ikut urgensi asli
      // (overdue/due today/due soon/on track), bukan selalu merah.
      tone: classifyDeadline(job.deadline, job.status)
    });
    eventsByDay.set(day, list);
  }

  for (const appt of appointments) {
    const day = new Date(appt.date).getUTCDate();
    const list = eventsByDay.get(day) ?? [];
    list.push({
      type: "appointment",
      label: `${appt.title}${appt.time ? ` (${appt.time})` : ""}`,
      href: appt.jobId ? `/jobs/${appt.jobId}` : undefined
    });
    eventsByDay.set(day, list);
  }

  const daysInMonth = monthEnd.getUTCDate();
  const firstWeekday = monthStart.getUTCDay(); // 0 = Sunday
  const totalCells = Math.ceil((daysInMonth + firstWeekday) / 7) * 7;

  const cells: (number | null)[] = [];
  for (let i = 0; i < totalCells; i++) {
    const day = i - firstWeekday + 1;
    cells.push(day >= 1 && day <= daysInMonth ? day : null);
  }

  const prevMonth = month === 0 ? { year: year - 1, month: 12 } : { year, month };
  const nextMonth = month === 11 ? { year: year + 1, month: 1 } : { year, month: month + 2 };

  const isCurrentMonth = year === todayYear && month === todayMonth;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground">Deadline job dan appointment dalam sebulan</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?year=${prevMonth.year}&month=${prevMonth.month}`}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="w-36 text-center text-sm font-medium text-foreground">
            {MONTH_NAMES[month]} {year}
          </span>
          <Link
            href={`/calendar?year=${nextMonth.year}&month=${nextMonth.month}`}
            className="rounded-md border border-border p-2 text-muted-foreground hover:bg-muted"
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <Card className="!p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase text-muted-foreground">
          {DAY_NAMES.map((d) => (
            <div key={d} className="py-2">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, idx) => {
            const events = day ? eventsByDay.get(day) ?? [] : [];
            const isToday = isCurrentMonth && day === todayDate;

            return (
              <div
                key={idx}
                className={cn(
                  "min-h-[92px] rounded-md border border-border p-1.5 text-left align-top",
                  day ? "bg-background" : "bg-muted/30"
                )}
              >
                {day && (
                  <>
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                        isToday ? "bg-primary font-semibold text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {day}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {events.slice(0, 3).map((e, i) =>
                        e.href ? (
                          <Link
                            key={i}
                            href={e.href}
                            className={cn(
                              "block truncate rounded px-1 py-0.5 text-[10px] font-medium",
                              e.type === "deadline" ? TONE_CHIP_CLASS[e.tone ?? "on-track"] : "bg-primary/10 text-primary"
                            )}
                            title={e.label}
                          >
                            {e.label}
                          </Link>
                        ) : (
                          <p
                            key={i}
                            className="truncate rounded bg-primary/10 px-1 py-0.5 text-[10px] font-medium text-primary"
                            title={e.label}
                          >
                            {e.label}
                          </p>
                        )
                      )}
                      {events.length > 3 && (
                        <p className="text-[10px] text-muted-foreground">+{events.length - 3} lagi</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      <p className="text-xs text-muted-foreground">
        Deadline job: 🔴 overdue · 🟠 due today · 🟡 due soon · 🟢 on track. 🔵 Appointment. Klik untuk buka detail terkait.
      </p>
    </div>
  );
}
