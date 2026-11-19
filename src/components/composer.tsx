"use client";

/**
 * Алхамтай AI маягтын (Пост бэлдэх, AI студи) дундын хэсгүүд:
 * таб, дугаартай алхам, сэдвийн талбар, санааны товч, тохиргооны товчнууд, доод мөр.
 */

import type { ComponentType, ReactNode, SVGProps } from "react";
import { AI_TASKS, shortModel, type AiTask } from "@/lib/ai-models";
import { useAiUsage } from "@/lib/ai-usage";
import { useStore } from "@/lib/store";
import { IconBulb, IconChevronDown, IconDice, IconFlask, IconSparkles } from "./icons";
import { PlusBadge } from "./plus";
import { cn } from "./ui";

export type IconType = ComponentType<SVGProps<SVGSVGElement>>;

/** Гол үйлдлийн том товч (Button size="lg"-д нэмж өгнө) */
export const BIG_BUTTON = "h-14 rounded-2xl px-8 text-base";

export function StartOverButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-full bg-lime/15 px-4 text-sm font-medium text-brand-700 ring-1 ring-inset ring-lime/50 transition-colors hover:bg-lime/25"
    >
      <IconSparkles className="size-4" /> Шинээр эхлэх
    </button>
  );
}

export interface ComposerTab<T extends string> {
  value: T;
  label: string;
  icon: IconType;
  /** Ногоон жижиг шошго (жишээ нь "Хурдан") */
  badge?: string;
  /** Үнэгүй багцад түгжигдсэн — PLUS шошго харуулна */
  plus?: boolean;
}

export function ComposerTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: ComposerTab<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      // Олон мөр болж ороход ч гоё харагдахаар бүтэн бөөрөнхий биш, 20px радиус
      className="inline-flex flex-wrap gap-1 rounded-[20px] bg-zinc-900/[0.05] p-1 ring-1 ring-inset ring-zinc-900/[0.04]"
    >
      {tabs.map(({ value: v, label: text, icon: TabIcon, badge, plus }) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(v)}
            className={cn(
              "inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
              active ? "bg-zinc-900 text-zinc-50 shadow-sm" : "text-zinc-500 hover:text-zinc-900",
            )}
          >
            <TabIcon className="size-4 shrink-0" /> {text}
            {badge && (
              <span className="rounded-full bg-emerald-500/15 px-1.5 py-px font-mono text-[9.5px] uppercase tracking-[0.1em] text-emerald-700">
                {badge}
              </span>
            )}
            {plus && <PlusBadge />}
          </button>
        );
      })}
    </div>
  );
}

/** Маягтын алхмын гарчиг — дугаартай */
export function StepTitle({ n, title, aside }: { n: number; title: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <h2 className="flex items-center gap-2.5 text-[15px] font-medium text-zinc-900">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-semibold text-ink">
          {n}
        </span>
        {title}
      </h2>
      {aside && <div className="text-xs text-zinc-400">{aside}</div>}
    </div>
  );
}

/** Том сэдэв/тайлбарын талбар: бренд хүрээ, доор нь зөвлөгөө ба тэмдэгтийн тоо */
export function PromptBox({
  id,
  label,
  value,
  onChange,
  max,
  rows = 3,
  placeholder,
  tip,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  rows?: number;
  placeholder: string;
  tip: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface ring-2 ring-brand-400/60 transition-shadow focus-within:ring-brand-500 dark:bg-zinc-50">
      <textarea
        id={id}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={max}
        rows={rows}
        placeholder={placeholder}
        className="block w-full resize-none rounded-t-2xl bg-transparent px-4 pt-3.5 text-[15px] leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
      />
      <div className="flex items-end justify-between gap-4 px-4 pb-3 pt-1">
        <p className="flex items-start gap-1.5 text-xs leading-relaxed text-zinc-400">
          <IconBulb className="mt-px size-3.5 shrink-0" />
          {tip}
        </p>
        <span className="shrink-0 text-xs tabular-nums text-zinc-400">
          {value.length}/{max}
        </span>
      </div>
    </div>
  );
}

export interface Idea {
  /** Товчин дээрх богино бичиг */
  text: string;
  icon: IconType;
  /** Талбарт бичигдэх бүтэн текст (байхгүй бол `text`) */
  prompt?: string;
  /** Одоо (улирал, баяр) эрэлттэй сэдэв */
  hot?: boolean;
}

export function IdeaChips({ ideas, value, onPick }: { ideas: Idea[]; value: string; onPick: (v: string) => void }) {
  return (
    <>
      <p className="mt-4 text-sm text-zinc-500">Санаа хэрэгтэй юу? Нэгийг товш:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ideas.map(({ text, prompt, icon: IdeaIcon, hot }) => {
          const fill = prompt ?? text;
          const active = value === fill;
          return (
            <button
              key={text}
              type="button"
              onClick={() => onPick(fill)}
              aria-pressed={active}
              title={hot ? "Одоо эрэлттэй сэдэв" : prompt}
              className={cn(
                "inline-flex h-9 max-w-full cursor-pointer items-center gap-2 rounded-full px-3.5 text-[13px] ring-1 transition-colors",
                active
                  ? "bg-zinc-900 text-zinc-50 ring-zinc-900"
                  : hot
                    ? "bg-lime/10 font-medium text-brand-700 ring-brand-400/60 hover:bg-lime/20"
                    : "bg-surface text-zinc-600 ring-zinc-900/10 hover:text-zinc-900 hover:ring-zinc-900/20 dark:bg-zinc-50",
              )}
            >
              <IdeaIcon className="size-4 shrink-0" />
              <span className="truncate">{text}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/** "Санааны машин" — AI дуудахгүй, бэлэн санаанаас санамсаргүй сонгоно */
export function ShuffleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full bg-lime/10 px-4 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-400/50 transition-colors hover:bg-lime/20"
    >
      <IconDice className="size-[18px]" /> Санааны машин — санаа эргүүлэх
    </button>
  );
}

/** Жагсаалтаас одоогийнхоос өөр нэгийг санамсаргүй сонгоно */
export function pickOther(pool: string[], current: string) {
  const rest = pool.filter((t) => t !== current);
  return rest[Math.floor(Math.random() * rest.length)] ?? current;
}

/** Тохиргооны нэг бүлэг: mono шошго + удирдлага */
export function SettingGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-zinc-900/[0.03] p-2.5 pt-2 ring-1 ring-inset ring-zinc-900/[0.05]">
      <p className="px-1.5 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-500">{label}</p>
      {children}
    </div>
  );
}

const PILL = "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium ring-1";

export function SelectPill<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <span className="relative inline-flex">
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          PILL,
          "cursor-pointer appearance-none bg-surface pr-9 text-zinc-900 ring-zinc-900/10 hover:ring-zinc-900/20 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-zinc-50",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
    </span>
  );
}

/** Хэд хэдэн сонголтоос нэгийг — бүгд харагдах товчнууд */
export function ChoicePills<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode; icon?: IconType }[];
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map(({ value: v, label: text, icon: OptIcon }) => {
        const on = value === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(v)}
            className={cn(
              PILL,
              "cursor-pointer transition-colors",
              on
                ? "bg-zinc-900 text-zinc-50 ring-zinc-900"
                : "bg-surface text-zinc-600 ring-zinc-900/10 hover:text-zinc-900 hover:ring-zinc-900/20 dark:bg-zinc-50",
            )}
          >
            {OptIcon && <OptIcon className="size-4 shrink-0" />}
            {text}
          </button>
        );
      })}
    </div>
  );
}

export function TogglePill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        PILL,
        "cursor-pointer transition-colors",
        on
          ? "bg-zinc-900 text-zinc-50 ring-zinc-900"
          : "bg-surface text-zinc-400 line-through decoration-zinc-400/60 ring-zinc-900/10 hover:text-zinc-700 dark:bg-zinc-50",
      )}
    >
      {children}
    </button>
  );
}

/** Өөрчлөх боломжгүй мэдээлэл (Reel-ийн хэлбэр, урт гэх мэт) */
export function StaticPill({ children }: { children: ReactNode }) {
  return <span className={cn(PILL, "bg-transparent text-zinc-600 ring-zinc-900/10")}>{children}</span>;
}

/** Маягтын доод мөр: зүүн талд хязгаар, AI-ийн төлөв; баруун талд гол товч */
export function ComposerFooter({ info, children }: { info: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-8 flex flex-col-reverse gap-4 border-t border-dashed border-zinc-900/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1 text-[13px]">{info}</div>
      <div className="flex flex-col items-stretch gap-1.5 sm:items-end">{children}</div>
    </div>
  );
}

/**
 * Энэ даалгаварт AI яаж ажиллахыг нэг мөрөөр: Токенгүй горим, HF асуудал, загварын нэр.
 * `mock` — Токенгүй горимд юу болох, `fallback` — HF ажиллахгүй үед юу болох.
 */
export function AiStatusLine({ task, mock, fallback }: { task: AiTask; mock: string; fallback: string }) {
  const { ai } = useStore();
  const usage = useAiUsage();
  const model = ai?.models[task] ?? AI_TASKS[task].defaultModel;

  if (usage === "mock") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-zinc-400">
        <IconFlask className="size-3.5 shrink-0" /> «Токенгүй» горим — {mock}
      </p>
    );
  }
  if (ai?.connected && ai.issue) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-rose-600">
        <IconFlask className="size-3.5 shrink-0" />
        {ai.issue === "no_credits" ? "HF кредит дууссан" : "HF токен ажиллахгүй"} — {fallback}
      </p>
    );
  }
  if (ai?.connected) {
    return (
      <p className="flex items-center gap-1.5 text-xs text-zinc-400">
        <IconSparkles className="size-3.5 shrink-0 text-violet-500" /> Hugging Face ·{" "}
        <a
          href={`https://huggingface.co/${model}`}
          target="_blank"
          rel="noopener noreferrer"
          title={model}
          className="truncate hover:text-violet-700 hover:underline"
        >
          {shortModel(model)}
        </a>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-zinc-400">
      <IconFlask className="size-3.5 shrink-0" />
      {ai ? `HF_TOKEN байхгүй — ${fallback}` : "AI холболтыг шалгаж байна…"}
    </p>
  );
}
