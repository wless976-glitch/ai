import type { ReactNode } from "react";
import type { Block } from "@/lib/academy";
import { IconAlert, IconBulb, IconCheck, IconTarget } from "../icons";
import { cn } from "../ui";
import { RichText } from "./rich-text";
import { ToolCard } from "./tools";

/** Хичээлийн агуулгын блокуудыг харуулна */
export function LessonBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-4 text-[15px] leading-relaxed text-zinc-700">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </div>
  );
}

function BlockView({ block: b }: { block: Block }) {
  switch (b.type) {
    case "p":
      return (
        <p>
          <RichText text={b.text} />
        </p>
      );
    case "h":
      return <h3 className="pt-2 text-[16px] font-semibold tracking-[-0.01em] text-zinc-900">{b.text}</h3>;
    case "list":
      return b.ordered ? (
        <ol className="space-y-2.5">
          {b.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-zinc-50">
                {i + 1}
              </span>
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2">
          {b.items.map((item, i) => (
            <li key={i} className="flex gap-3">
              <IconCheck className="mt-1 size-4 shrink-0 text-brand-600" />
              <span>
                <RichText text={item} />
              </span>
            </li>
          ))}
        </ul>
      );
    case "tip":
      return (
        <Callout tone="amber" icon={IconBulb} label="Зөвлөгөө">
          <RichText text={b.text} />
        </Callout>
      );
    case "warn":
      return (
        <Callout tone="rose" icon={IconAlert} label="Анхаар">
          <RichText text={b.text} />
        </Callout>
      );
    case "example":
      return (
        <Callout tone="sky" icon={IconTarget} label={b.title ?? "Жишээ"}>
          <RichText text={b.text} />
        </Callout>
      );
    case "formula":
      return (
        <div className="rounded-xl bg-zinc-900/[0.04] p-4 ring-1 ring-inset ring-zinc-900/[0.06]">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500">{b.label}</p>
          <p className="mt-2 font-mono text-[13.5px] leading-relaxed text-zinc-900">
            <RichText text={b.text} />
          </p>
        </div>
      );
    case "table":
      return (
        <div className="-mx-1 overflow-x-auto px-1">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 overflow-hidden rounded-xl text-left text-[13.5px] ring-1 ring-zinc-900/[0.08]">
            <thead>
              <tr>
                {b.head.map((h, i) => (
                  <th key={i} className="bg-zinc-900/[0.04] px-3 py-2.5 font-semibold text-zinc-900">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className={cn(
                        "border-t border-zinc-900/[0.06] px-3 py-2.5 align-top",
                        c === 0 ? "font-medium text-zinc-900" : "text-zinc-700",
                      )}
                    >
                      <RichText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "tool":
      return <ToolCard tool={b.tool} />;
  }
}

const CALLOUT_TONES = {
  amber: "bg-amber-50 text-amber-900 ring-amber-200/70",
  rose: "bg-rose-50 text-rose-900 ring-rose-200/70",
  sky: "bg-sky-50 text-sky-900 ring-sky-200/70",
};

function Callout({
  tone,
  icon: Icon,
  label,
  children,
}: {
  tone: keyof typeof CALLOUT_TONES;
  icon: typeof IconBulb;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex gap-3 rounded-xl p-4 text-[14px] ring-1 ring-inset [&_strong]:text-current", CALLOUT_TONES[tone])}>
      <Icon className="mt-0.5 size-[18px] shrink-0" />
      <div>
        <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] opacity-80">{label}</p>
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
