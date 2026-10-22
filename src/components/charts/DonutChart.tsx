"use client";

import Link from "next/link";
import { useState } from "react";
import { CountUp } from "@/components/motion/CountUp";

/**
 * Diagram donat untuk komposisi satu keseluruhan (mis. pekerjaan aktif per
 * status). Setiap irisan dipisah celah putih 2px; angka total di tengah.
 * Arahkan kursor / fokus ke irisan atau baris legenda untuk menyorotnya;
 * legenda selalu menampilkan jumlah & persen (tidak bergantung warna saja).
 */
export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  href?: string;
}

const SIZE = 168;
const R = 70;
const STROKE = 22;
const C = 2 * Math.PI * R;

export function DonutChart({ slices, centerLabel }: { slices: DonutSlice[]; centerLabel: string }) {
  const [active, setActive] = useState<number | null>(null);
  const total = slices.reduce((s, x) => s + x.value, 0);
  const shown = slices.map((s, i) => ({ ...s, i })).filter((s) => s.value > 0);
  const gap = shown.length > 1 ? 3 : 0; // celah antar irisan (dalam satuan keliling)

  let offset = 0;
  const arcs = shown.map((s) => {
    const len = (s.value / total) * C;
    const arc = { ...s, dash: Math.max(0.5, len - gap), offset };
    offset += len;
    return arc;
  });

  const focus = active !== null ? slices[active] : null;

  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative mx-auto shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${centerLabel}: ${total}`} className="donut-spin">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="#F2F4F7" strokeWidth={STROKE} />
          {total > 0 &&
            arcs.map((a) => (
              <circle
                key={a.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth={active === a.i ? STROKE + 6 : STROKE}
                strokeDasharray={`${a.dash} ${C - a.dash}`}
                style={{
                  ["--dash" as string]: `${a.dash}`,
                  ["--rest" as string]: `${C - a.dash}`,
                  ["--c" as string]: `${C}`,
                  ["--d" as string]: `${100 + (a.offset / C) * 500}ms`
                }}
                strokeDashoffset={-a.offset}
                transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                opacity={active === null || active === a.i ? 1 : 0.35}
                className="donut-arc cursor-pointer transition-[stroke-width,opacity] duration-150"
                onPointerEnter={() => setActive(a.i)}
                onPointerLeave={() => setActive(null)}
              >
                <title>{`${a.label}: ${a.value}`}</title>
              </circle>
            ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold leading-none tracking-tight text-foreground">{focus ? focus.value : <CountUp value={total} duration={1000} />}</span>
          <span className="mt-1 max-w-[96px] text-xs font-medium leading-tight text-muted-foreground">{focus ? focus.label : centerLabel}</span>
        </div>
      </div>

      <ul className="min-w-[180px] flex-1 space-y-1">
        {slices.map((s, i) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          const row = (
            <>
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate text-[#344054]">{s.label}</span>
              <span className="font-bold tabular-nums text-foreground">{s.value}</span>
              <span className="w-9 text-right text-xs tabular-nums text-muted-foreground">{pct}%</span>
            </>
          );
          const cls = `flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm ${active === i ? "bg-muted" : ""}`;
          return (
            <li key={s.label} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)}>
              {s.href ? (
                <Link href={s.href} className={`${cls} hover:bg-muted`} onFocus={() => setActive(i)} onBlur={() => setActive(null)}>
                  {row}
                </Link>
              ) : (
                <div className={cls}>{row}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
