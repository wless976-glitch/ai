"use client";

import { useId, useState, type MouseEvent } from "react";
import { formatCompact, formatNumber, formatPercent, formatShortDate } from "@/lib/format";
import { cn } from "./ui";

export interface Series {
  key: string;
  name: string;
  color: string;
}

/** 4 тэнцүү хуваагдах "гоё" дээд утга (жишээ нь 2,400 → 600-аар) */
function niceMax(v: number) {
  if (v <= 0) return 10;
  const raw = v / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((s) => s * pow >= raw)! * pow;
  return step * 4;
}

/** Тэнхлэгийн шошго: 10,000-аас бага бол бүтнээр, их бол товчоор (нэг тэнхлэгт нэг хэв маяг) */
function tickFormatter(max: number) {
  return (v: number) => (max < 10_000 ? formatNumber(v) : formatCompact(v));
}

/**
 * Monotone cubic муруй (Fritsch–Carlson). Цэгүүдийн дундуур зөөлөн өнгөрөх ч
 * өгөгдөлд байхгүй оргил/хонхор зурахгүй — хүрэлт сөрөг рүү "унахгүй".
 */
export function smoothPath(pts: [number, number][]) {
  const n = pts.length;
  if (n === 0) return "";
  if (n === 1) return `M${pts[0][0]},${pts[0][1]}`;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0] || 1e-6;
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) {
    t[i] =
      m[i - 1] * m[i] <= 0
        ? 0
        : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  }
  t[n - 1] = m[n - 2];
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h},${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h},${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/**
 * Area/line график. SVG нь 0–100 координатад зурагдаж, текст шошгууд
 * HTML-ээр байрлах тул ямар ч өргөнд уншигдахуйц хэвээр үлдэнэ.
 */
export function TrendChart({
  data,
  series,
  height = 220,
  showTotal = series.length > 1,
}: {
  data: ({ date: string } & Record<string, number | string>)[];
  series: Series[];
  height?: number;
  /** Tooltip-д бүх цувааны нийлбэрийг харуулах */
  showTotal?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const n = data.length;
  const values = data.map((d) => series.map((s) => Number(d[s.key])));
  const max = niceMax(Math.max(...values.flat()) * 1.08);
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v: number) => 100 - (v / max) * 100;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const fmt = tickFormatter(max);
  const labelEvery = Math.ceil(n / 6);
  const active = hover ?? n - 1;

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(n - 1, Math.round(ratio * (n - 1)))));
  }

  return (
    <div>
      <div className="flex gap-3">
        <div className="relative w-10 shrink-0 text-right text-[11px] tabular-nums text-zinc-400" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${y(t)}%` }}>
              {fmt(t)}
            </span>
          ))}
        </div>
        <div
          className="relative flex-1 cursor-crosshair"
          style={{ height }}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
            <defs>
              {series.map((s) => (
                <linearGradient key={s.key} id={`${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={0.16} />
                  <stop offset="100%" stopColor={s.color} stopOpacity={0.01} />
                </linearGradient>
              ))}
            </defs>
            {ticks.map((t) => (
              <line
                key={t}
                x1="0"
                x2="100"
                y1={y(t)}
                y2={y(t)}
                stroke={t === 0 ? "var(--color-axis)" : "var(--color-grid)"}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {series.map((s, si) => {
              const line = smoothPath(values.map((v, i) => [x(i), y(v[si])]));
              return (
                <g key={s.key}>
                  <path d={`${line}L100,100L0,100Z`} fill={`url(#${uid}-${s.key})`} />
                  <path
                    d={line}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              );
            })}
          </svg>

          {hover !== null && (
            <div className="pointer-events-none absolute inset-y-0 w-px bg-zinc-300" style={{ left: `${x(hover)}%` }} />
          )}
          {/* Хулгана аваагүй үед сүүлийн цэгийг, авсан үед тухайн өдрийг тодруулна */}
          {series.map((s, si) => (
            <span
              key={s.key}
              className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface transition-[left,top] duration-75"
              style={{ left: `${x(active)}%`, top: `${y(values[active][si])}%`, background: s.color }}
            />
          ))}
          {hover !== null && (
            <div
              className={cn(
                "pointer-events-none absolute top-0 z-10 min-w-40 rounded-xl bg-ink/95 px-3 py-2.5 text-xs text-white shadow-xl ring-1 ring-white/10 backdrop-blur",
                x(hover) > 60 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3",
              )}
              style={{ left: `${x(hover)}%` }}
            >
              <p className="mb-1.5 font-medium text-zinc-400">{formatShortDate(String(data[hover].date))}</p>
              {series.map((s, si) => (
                <p key={s.key} className="flex items-center justify-between gap-4 py-0.5">
                  <span className="flex items-center gap-1.5 text-zinc-200">
                    <span className="size-2 rounded-full" style={{ background: s.color }} />
                    {s.name}
                  </span>
                  <span className="font-semibold tabular-nums">{formatNumber(values[hover][si])}</span>
                </p>
              ))}
              {showTotal && (
                <p className="mt-1 flex items-center justify-between gap-4 border-t border-white/10 pt-1.5">
                  <span className="text-zinc-400">Нийт</span>
                  <span className="font-semibold tabular-nums">
                    {formatNumber(values[hover].reduce((a, b) => a + b, 0))}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="relative ml-[52px] mt-2 h-4 text-[11px] text-zinc-400">
        {data.map((d, i) =>
          // Сүүлийн огноо үргэлж харагдана; түүнд хэт ойр байгаа тогтмол шошгыг алгасна (давхцахаас сэргийлж)
          (i % labelEvery === 0 && n - 1 - i >= Math.ceil(labelEvery / 2)) || i === n - 1 ? (
            <span
              key={String(d.date)}
              className={cn(
                "absolute whitespace-nowrap",
                i === 0 ? "" : i === n - 1 ? "-translate-x-full" : "-translate-x-1/2",
              )}
              style={{ left: `${x(i)}%` }}
            >
              {formatShortDate(String(d.date))}
            </span>
          ) : null,
        )}
      </div>
    </div>
  );
}

export function Legend({ series }: { series: Series[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
      {series.map((s) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded-full" style={{ background: s.color }} />
          {s.name}
        </span>
      ))}
    </div>
  );
}

/** Статистикийн хавтан дотор өөрчлөлтийн чиг хандлагыг харуулах жижиг шугам */
export function Sparkline({
  values,
  color = "var(--color-brand-500)",
  className,
  label,
}: {
  values: number[];
  color?: string;
  className?: string;
  /** Дэлгэц уншигчид зориулсан тайлбар */
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * 100, 92 - ((v - min) / span) * 84] as [number, number]);
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  return (
    <div className={cn("relative h-9", className)} role={label ? "img" : undefined} aria-label={label}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-spark`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={`${line}L100,100L0,100Z`} fill={`url(#${uid}-spark)`} />
        <path d={line} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      </svg>
      <span
        aria-hidden="true"
        className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
        style={{ left: `${last[0]}%`, top: `${last[1]}%`, background: color }}
      />
    </div>
  );
}

export interface Part {
  key: string;
  label: string;
  value: number;
  color: string;
  /** Өнгөн дотор бичих бичгийн өнгө: шар мэт цайвар өнгөнд "dark" */
  ink?: "light" | "dark";
}

/**
 * Нэг бүхлийг хэсгүүдэд хуваасан өндөр багана (жишээ нь идэвхийн бүтэц).
 * Хэсэг бүр өөрийн хувийг дотроо бичнэ; багтахгүй бол tooltip, тайлбар хэсэгт л харагдана.
 */
export function SegmentedBar({ parts, className }: { parts: Part[]; className?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const total = parts.reduce((s, p) => s + p.value, 0);
  const visible = parts.filter((p) => p.value > 0);
  if (!total) return <div className={cn("h-7 rounded-md bg-zinc-100", className)} />;
  const label = visible.map((p) => `${p.label} ${formatNumber(p.value)} (${formatPercent(p.value / total, 0)})`).join(", ");
  const hovered = visible.find((p) => p.key === hover);
  return (
    <div className={cn("relative", className)}>
      <div className="flex h-7 w-full gap-0.5" role="img" aria-label={label}>
        {visible.map((p) => {
          const share = p.value / total;
          return (
            <div
              key={p.key}
              onMouseEnter={() => setHover(p.key)}
              onMouseLeave={() => setHover(null)}
              className={cn(
                "flex min-w-1 items-center rounded px-2 text-[11px] font-semibold tabular-nums transition-opacity",
                p.ink === "dark" ? "text-ink" : "text-white",
                hover && hover !== p.key && "opacity-45",
              )}
              style={{ flex: `${p.value} 1 0%`, background: p.color }}
            >
              {share >= 0.09 && formatPercent(share, 0)}
            </div>
          );
        })}
      </div>
      {hovered && (
        <div className="pointer-events-none absolute -top-2 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg">
          <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: hovered.color }} />
          {hovered.label}: <b className="tabular-nums">{formatNumber(hovered.value)}</b> ·{" "}
          {formatPercent(hovered.value / total, 0)}
        </div>
      )}
    </div>
  );
}

/** Жижиг багана график (жишээ нь 7 хоног тутмын постын тоо) */
export function MiniBars({
  data,
  goal,
}: {
  data: { label: string; count: number }[];
  goal: number;
}) {
  const max = Math.max(goal, ...data.map((d) => d.count), 1);
  return (
    <div>
      <div className="relative flex h-24 items-end justify-between gap-1.5">
        <div
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-brand-400"
          style={{ bottom: `${(goal / max) * 100}%` }}
        >
          <span className="absolute -top-4 right-0 text-[10px] font-medium text-brand-700">зорилго {goal}</span>
        </div>
        {data.map((d, i) => (
          <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end">
            <div
              title={`${d.label}: ${d.count} пост`}
              className={cn(
                "w-full max-w-6 rounded-t transition-all duration-300 group-hover:opacity-80",
                d.count >= goal ? "bg-brand-500" : i === data.length - 1 ? "bg-brand-300" : "bg-zinc-300",
              )}
              style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between gap-1.5 border-t border-(--color-axis) pt-1.5 text-[10px] text-zinc-400">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
