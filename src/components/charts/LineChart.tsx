"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * Grafik garis ringan tanpa pustaka (SVG). Satu sumbu Y, garis 2px, garis
 * bantu tipis, legenda + label di ujung garis, dan crosshair + tooltip yang
 * mengikuti bulan terdekat (mouse, sentuh, atau tombol panah saat difokus).
 * Nilai `null` = belum ada data (mis. bulan yang belum berjalan) -> garis berhenti.
 */
export interface LineSeries {
  name: string;
  color: string;
  values: (number | null)[];
}

type ValueFormat = "number" | "rupiah";

const PAD = { top: 16, right: 16, bottom: 30, left: 44 };
const END_LABEL_W = 96;

/** Skala Y "rapi": 4 interval dengan langkah 1/2/5 x 10^k (bilangan bulat untuk hitungan). */
function niceScale(v: number): { max: number; step: number } {
  const raw = Math.max(1, v) / 4;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = ([1, 2, 5, 10].map((m) => m * pow).find((m) => m >= raw) ?? 10 * pow);
  return { max: Math.max(1, step) * 4, step: Math.max(1, step) };
}

export function formatValue(v: number, format: ValueFormat, compact = false): string {
  if (format === "rupiah") {
    if (compact) {
      if (v >= 1e9) return `Rp ${(v / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`;
      if (v >= 1e6) return `Rp ${(v / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`;
      if (v >= 1e3) return `Rp ${(v / 1e3).toLocaleString("id-ID", { maximumFractionDigits: 0 })} rb`;
    }
    return `Rp ${v.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  }
  return v.toLocaleString("id-ID");
}

export function LineChart({
  labels,
  series,
  format = "number",
  height = 280,
  ariaLabel
}: {
  labels: string[];
  series: LineSeries[];
  format?: ValueFormat;
  height?: number;
  ariaLabel: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showEndLabels = width >= 520 && series.length <= 4;
  const right = PAD.right + (showEndLabels ? END_LABEL_W : 0);
  const plotW = width - PAD.left - right;
  const plotH = height - PAD.top - PAD.bottom;
  const n = labels.length;

  const { max, ticks } = useMemo(() => {
    const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
    const { max: m, step } = niceScale(Math.max(0, ...all));
    return { max: m, ticks: [0, step, 2 * step, 3 * step, m] };
  }, [series]);

  const x = (i: number) => PAD.left + (n <= 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;

  const paths = series.map((s) => {
    let d = "";
    let pen = false;
    s.values.forEach((v, i) => {
      if (v === null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  });

  // Label di ujung garis (titik terakhir yang punya data), dirapikan agar tidak bertumpuk.
  const endLabels = useMemo(() => {
    if (!showEndLabels) return [];
    const items = series
      .map((s, idx) => {
        let last = -1;
        s.values.forEach((v, i) => {
          if (v !== null) last = i;
        });
        return last < 0 ? null : { idx, i: last, v: s.values[last] as number, y: y(s.values[last] as number) };
      })
      .filter((e): e is { idx: number; i: number; v: number; y: number } => e !== null)
      .sort((a, b) => a.y - b.y);
    for (let k = 1; k < items.length; k++) {
      if (items[k].y - items[k - 1].y < 16) items[k].y = items[k - 1].y + 16;
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, showEndLabels, width, height, max]);

  function pick(clientX: number) {
    const el = boxRef.current;
    if (!el || n === 0) return;
    const rel = clientX - el.getBoundingClientRect().left - PAD.left;
    const i = Math.round((rel / Math.max(1, plotW)) * (n - 1));
    setActive(Math.min(n - 1, Math.max(0, i)));
  }

  // Tooltip di kanan crosshair; bila tidak muat, pindah ke kirinya.
  const tipLeft =
    active === null ? 0 : x(active) + 16 + 184 <= width ? x(active) + 16 : Math.max(8, x(active) - 16 - 184);

  return (
    <div>
      <ul className="mb-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px] text-[#475467]">
        {series.map((s) => (
          <li key={s.name} className="flex items-center gap-2">
            <span aria-hidden="true" className="h-[3px] w-4 rounded-full" style={{ background: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>

      <div
        ref={boxRef}
        className="relative outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        tabIndex={0}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={(e) => pick(e.clientX)}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((a) => a ?? n - 1)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
          if (e.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
        }}
      >
        <svg width={width} height={height} className="block max-w-full overflow-visible" aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={width - right} y1={y(t)} y2={y(t)} stroke="#EAECF0" strokeWidth={1} />
              <text x={PAD.left - 10} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="#667085">
                {formatValue(t, format, true)}
              </text>
            </g>
          ))}
          {labels.map((l, i) => (
            <text
              key={l}
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize={11}
              fill={active === i ? "#101828" : "#667085"}
              fontWeight={active === i ? 700 : 400}
            >
              {width < 440 && i % 2 === 1 ? "" : l}
            </text>
          ))}

          {active !== null && (
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotH} stroke="#98A2B3" strokeWidth={1} strokeDasharray="3 3" />
          )}

          {paths.map((d, k) => (
            <path
              key={series[k].name}
              d={d}
              pathLength={1}
              className="chart-draw"
              style={{ ["--d" as string]: `${120 + k * 160}ms` }}
              fill="none"
              stroke={series[k].color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {active !== null &&
            series.map((s) => {
              const v = s.values[active];
              return v === null ? null : (
                <circle key={s.name} cx={x(active)} cy={y(v)} r={4.5} fill={s.color} stroke="#FFFFFF" strokeWidth={2} />
              );
            })}

          {active === null && endLabels.map((e) => (
            <g key={series[e.idx].name} className="chart-fade" style={{ ["--d" as string]: `${1100 + e.idx * 160}ms` }}>
              <circle cx={x(e.i)} cy={y(e.v)} r={3.5} fill={series[e.idx].color} stroke="#FFFFFF" strokeWidth={2} />
              <text x={x(e.i) + 10} y={e.y} dy="0.32em" fontSize={12} fill="#344054" fontWeight={600}>
                {series[e.idx].name}
              </text>
            </g>
          ))}
        </svg>

        {active !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 w-[184px] rounded-md border border-border bg-background px-3 py-2.5 shadow-lg"
            style={{ left: tipLeft }}
          >
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{labels[active]}</p>
            <ul className="space-y-1">
              {series.map((s) => {
                const v = s.values[active];
                return (
                  <li key={s.name} className="flex items-center gap-2 text-xs">
                    <span aria-hidden="true" className="h-[3px] w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                    <span className="font-bold text-foreground">{v === null ? "–" : formatValue(v, format)}</span>
                    <span className="truncate text-muted-foreground">{s.name}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-primary">Lihat sebagai tabel</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1.5 pr-3 font-semibold">Seri</th>
                {labels.map((l) => (
                  <th key={l} className="px-1.5 py-1.5 text-right font-semibold">
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.name} className="border-t border-muted">
                  <td className="py-1.5 pr-3 font-semibold text-foreground">{s.name}</td>
                  {s.values.map((v, i) => (
                    <td key={i} className="px-1.5 py-1.5 text-right tabular-nums text-[#344054]">
                      {v === null ? "–" : formatValue(v, format, format === "rupiah")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
