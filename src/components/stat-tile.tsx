"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { formatPercent } from "@/lib/format";
import { Sparkline } from "./charts";
import { Card, cn } from "./ui";

/** Үзүүлэлт бүр өөрийн өнгөтэй — нэг үзүүлэлт бүх хуудсанд ижил өнгөөр харагдана */
export type StatTone = "brand" | "sky" | "indigo" | "violet" | "orange" | "amber" | "emerald" | "rose" | "fuchsia" | "zinc";

export const STAT_CHIP: Record<StatTone, string> = {
  brand: "bg-brand-50 text-brand-600 ring-brand-200/70",
  sky: "bg-sky-50 text-sky-600 ring-sky-200/70",
  indigo: "bg-indigo-50 text-indigo-600 ring-indigo-200/70",
  violet: "bg-violet-50 text-violet-600 ring-violet-200/70",
  orange: "bg-orange-50 text-orange-600 ring-orange-200/70",
  amber: "bg-amber-50 text-amber-600 ring-amber-200/70",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200/70",
  rose: "bg-rose-50 text-rose-600 ring-rose-200/70",
  fuchsia: "bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-200/70",
  zinc: "bg-zinc-100 text-zinc-600 ring-zinc-200/70",
};

/** Sparkline-ийн өнгө (chip-ийн өнгөтэй ижил гэр бүл, Tailwind-ийн 500 алхам) */
export const STAT_STROKE: Record<StatTone, string> = {
  brand: "#9db01c",
  sky: "#0ea5e9",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  orange: "#f97316",
  amber: "#f59e0b",
  emerald: "#10b981",
  rose: "#f43f5e",
  fuchsia: "#d946ef",
  zinc: "#71717a",
};

export function IconChip({
  icon: Icon,
  tone,
  className,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: StatTone;
  className?: string;
}) {
  return (
    <span
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset", STAT_CHIP[tone], className)}
    >
      <Icon className="size-4" />
    </span>
  );
}

/** ▲ 12% / ▼ 4% — өсөлт ногоон, бууралт улаан (сум + текстээр давхар илэрхийлнэ) */
export function DeltaPill({ value, className }: { value: number; className?: string }) {
  // 0.5%-иас бага өөрчлөлтийг "өөрчлөлтгүй" гэж саарал харуулна
  const flat = Math.abs(value) < 0.005;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
        flat ? "bg-zinc-100 text-zinc-600" : up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700",
        className,
      )}
    >
      <span aria-hidden="true">{flat ? "=" : up ? "▲" : "▼"}</span>
      <span className="sr-only">{flat ? "Өөрчлөлтгүй" : up ? "Өссөн" : "Буурсан"}</span>
      {formatPercent(Math.abs(value), 0)}
    </span>
  );
}

export function StatTile({
  icon,
  tone = "brand",
  label,
  tip,
  value,
  delta,
  deltaLabel = "өмнөх үеэс",
  sub,
  spark,
  className,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: StatTone;
  label: string;
  tip?: ReactNode;
  value: ReactNode;
  /** Өмнөх үетэй харьцуулсан өөрчлөлт (0.12 = +12%). Харьцуулах өгөгдөлгүй бол undefined */
  delta?: number;
  deltaLabel?: string;
  sub?: ReactNode;
  spark?: number[];
  className?: string;
}) {
  const hasDelta = delta !== undefined && Number.isFinite(delta);
  return (
    <Card className={cn("group p-3.5 transition-shadow duration-200 hover:shadow-card-hover sm:p-4", className)}>
      <div className="flex items-center gap-2 sm:gap-2.5">
        <IconChip icon={icon} tone={tone} className="max-sm:size-7" />
        {/* Нарийн дэлгэцэнд нэрийг тасалдаггүй — 2 мөрөнд шилжинэ */}
        <p className="min-w-0 font-mono text-[10.5px] uppercase leading-tight tracking-[0.1em] text-zinc-500">
          {label}
          {tip && <span className="ml-1 inline-flex align-middle">{tip}</span>}
        </p>
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-2xl font-medium leading-8 tracking-[-0.035em] text-zinc-900 tabular-nums sm:text-[28px]">{value}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-zinc-400">
            {hasDelta && (
              <>
                <DeltaPill value={delta} />
                <span>{deltaLabel}</span>
              </>
            )}
            {hasDelta && sub && <span aria-hidden="true">·</span>}
            {sub}
          </p>
        </div>
        {spark && spark.length > 1 && (
          <Sparkline values={spark} color={STAT_STROKE[tone]} className="w-20 shrink-0 max-sm:hidden" label={`${label}-ийн чиг хандлага`} />
        )}
      </div>
    </Card>
  );
}
