import type { ComponentType, SVGProps } from "react";
import type { PostStats } from "@/lib/types";
import type { Part } from "./charts";
import { IconBookmark, IconCursor, IconEye, IconHeart, IconMessage, IconShare, IconTrendingUp } from "./icons";
import type { StatTone } from "./stat-tile";

export type StatKey = keyof PostStats;

export interface MetricDef {
  key: StatKey;
  label: string;
  /** GLOSSARY-д тайлбартай нэр томьёо */
  term?: string;
  hint: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  tone: StatTone;
}

/** Meta Graph API-аас ирдэг постын 7 үзүүлэлт — хүснэгт, дэлгэрэнгүй цонх, хавтангууд бүгд үүнийг ашиглана */
export const POST_METRICS: MetricDef[] = [
  { key: "reach", label: "Хүрэлт", term: "Хүрэлт", hint: "Харсан хүний тоо", icon: IconEye, tone: "brand" },
  { key: "impressions", label: "Харагдалт", term: "Харагдалт", hint: "Дэлгэцэнд гарсан удаа", icon: IconTrendingUp, tone: "sky" },
  { key: "reactions", label: "Реакц", hint: "Like, ❤️ гэх мэт", icon: IconHeart, tone: "orange" },
  { key: "comments", label: "Сэтгэгдэл", hint: "Бичсэн сэтгэгдэл", icon: IconMessage, tone: "violet" },
  { key: "shares", label: "Хуваалцсан", hint: "Бусдад дамжуулсан", icon: IconShare, tone: "amber" },
  { key: "saves", label: "Хадгалсан", hint: "Дараа үзэхээр хадгалсан", icon: IconBookmark, tone: "emerald" },
  { key: "clicks", label: "Линк дарсан", term: "Линк дарсан", hint: "Линк, товч дарсан", icon: IconCursor, tone: "fuchsia" },
];

/** Идэвхийн 4 төрөл — globals.css-ийн --color-m-* (шалгасан дараалал) */
export const ENGAGEMENT_KINDS: { key: "reactions" | "comments" | "shares" | "saves"; color: string; ink: Part["ink"] }[] = [
  { key: "reactions", color: "var(--color-m-react)", ink: "light" },
  { key: "comments", color: "var(--color-m-comment)", ink: "light" },
  { key: "shares", color: "var(--color-m-share)", ink: "dark" },
  { key: "saves", color: "var(--color-m-save)", ink: "light" },
];

export const METRIC_BY_KEY = Object.fromEntries(POST_METRICS.map((m) => [m.key, m])) as Record<StatKey, MetricDef>;
