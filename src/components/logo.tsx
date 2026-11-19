import Link from "next/link";
import { cn } from "./ui";

/** Брэндийн нэр түр зуурын — нэг газраас солиход хангалттай */
export const BRAND = "Түгээ";

const SEEDS = [
  [7.4, 7.4, 1.25],
  [16.6, 7.4, 1.25],
  [16.6, 16.6, 1.25],
  [7.4, 16.6, 1.25],
  [4.6, 4.6, 0.85],
  [19.4, 4.6, 0.85],
  [19.4, 19.4, 0.85],
  [4.6, 19.4, 0.85],
];

/** Түгээ-гийн тэмдэг: голдоо цэг, 4 туяа (currentColor), гадна талдаа "түгж" буй шар-ногоон үрс */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path d="M3.5 12H8M16 12h4.5M12 3.5V8M12 16v4.5" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      {SEEDS.map(([cx, cy, r], k) => (
        <circle key={k} cx={cx} cy={cy} r={r} fill="var(--color-lime)" />
      ))}
    </svg>
  );
}

/** Тэмдэг + нэр. Өнгө нь эцэг элементийн бичгийн өнгийг (currentColor) дагана. */
export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)} aria-label={`${BRAND} — нүүр`}>
      <LogoMark className="size-7" />
      <span className="font-display text-[17px] font-semibold tracking-[-0.02em]">{BRAND}</span>
    </Link>
  );
}
