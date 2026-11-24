"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY } from "@/lib/academy/glossary";
import { IconInfo } from "./icons";
import { cn } from "./ui";

const TIP_WIDTH = 260;
const EDGE = 12;

/**
 * Жижиг ⓘ товч — хулгана авчрах, Tab-аар очих эсвэл хуруугаар дарахад тайлбар гарна.
 * Тайлбар нь дэлгэцийн ирмэгээс гарахгүйгээр байрлана.
 */
export function InfoTip({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const id = useId();
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);

  function show() {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = Math.min(TIP_WIDTH, window.innerWidth - EDGE * 2);
    const left = Math.min(Math.max(r.left + r.width / 2 - width / 2, EDGE), window.innerWidth - width - EDGE);
    const above = r.top > 160;
    setPos({ left, top: above ? r.top - 8 : r.bottom + 8, above });
  }

  const hide = () => setPos(null);

  useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPos(null);
    const onScroll = () => setPos(null);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [pos]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`${label} гэж юу вэ?`}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={show}
        className={cn(
          "inline-flex size-4 shrink-0 cursor-help items-center justify-center rounded-full text-zinc-400 transition-colors hover:text-brand-600 focus-visible:text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
          className,
        )}
      >
        <IconInfo className="size-3.5" />
      </button>
      {pos &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ left: pos.left, top: pos.top, width: Math.min(TIP_WIDTH, window.innerWidth - EDGE * 2) }}
            className={cn(
              "tip-in pointer-events-none fixed z-[70] rounded-xl bg-ink px-3.5 py-2.5 text-[12.5px] leading-relaxed text-zinc-100 shadow-xl",
              pos.above && "-translate-y-full",
            )}
          >
            <p className="font-semibold text-white">{label}</p>
            <div className="mt-0.5 text-zinc-300">{children}</div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Нэр томьёоны тайлбарыг GLOSSARY-аас авч ⓘ болгон харуулна */
export function TermTip({ term, className }: { term: string; className?: string }) {
  const entry = GLOSSARY.find((g) => g.term === term);
  if (!entry) return null;
  return (
    <InfoTip label={entry.en && entry.en !== entry.term ? `${entry.term} (${entry.en})` : entry.term} className={className}>
      {entry.text}
    </InfoTip>
  );
}
