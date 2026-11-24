import type { PostStats } from "./types";

/* "Өнөөдөр"-ийн бодит огноог today.ts-ийн useToday() / getToday()-аас авна. */

export const WEEKDAYS_FULL = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];
export const WEEKDAYS_SHORT = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
/** Даваагаас эхэлсэн 7 хоног */
export const WEEKDAYS_MON_FIRST = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

export function parseDate(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
}

export function toDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 0 = Ням ... 6 = Бямба */
export function weekday(s: string) {
  const { y, m, d } = parseDate(s);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(s: string, n: number) {
  const { y, m, d } = parseDate(s);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return toDateStr(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthLabel(y: number, m: number) {
  return `${y} оны ${m}-р сар`;
}

/** today — useToday()-аас (Өнөөдөр, Маргааш, Өчигдөр гэж харуулахад) */
export function formatDate(s: string, today: string) {
  if (s === today) return "Өнөөдөр";
  if (s === addDays(today, 1)) return "Маргааш";
  if (s === addDays(today, -1)) return "Өчигдөр";
  const { m, d } = parseDate(s);
  return `${m}-р сарын ${d}, ${WEEKDAYS_FULL[weekday(s)]}`;
}

export function formatShortDate(s: string) {
  const { m, d } = parseDate(s);
  return `${m}/${d}`;
}

export function formatNumber(n: number) {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatCompact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(Math.round(n));
}

export function formatMoney(n: number) {
  return `₮${formatNumber(n)}`;
}

export function formatPercent(x: number, digits = 1) {
  return `${(x * 100).toFixed(digits)}%`;
}

export function engagement(s: PostStats) {
  return s.reactions + s.comments + s.shares + s.saves;
}

export function engagementRate(s: PostStats) {
  return s.reach ? engagement(s) / s.reach : 0;
}

export function byDateTime(a: { date: string; time: string }, b: { date: string; time: string }) {
  return (a.date + a.time).localeCompare(b.date + b.time);
}
