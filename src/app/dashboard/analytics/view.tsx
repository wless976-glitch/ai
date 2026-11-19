"use client";

import { useState } from "react";
import { BoostModal } from "@/components/boost-modal";
import { Legend, SegmentedBar, TrendChart } from "@/components/charts";
import {
  IconCalendar,
  IconChevronDown,
  IconClock,
  IconCursor,
  IconDownload,
  IconEye,
  IconHeart,
  IconLink,
  IconRocket,
  IconTarget,
  IconTrendingUp,
  IconUsers,
} from "@/components/icons";
import { TermTip } from "@/components/info-tip";
import { ENGAGEMENT_KINDS, METRIC_BY_KEY, POST_METRICS, type StatKey } from "@/components/post-metrics";
import { PlusLock } from "@/components/plus";
import { PostStatsModal } from "@/components/post-stats-modal";
import { PostVisual } from "@/components/post-visual";
import { DeltaPill, StatTile } from "@/components/stat-tile";
import { Badge, Button, Card, CardHeader, PageHeader, PlatformIcon, PlatformIcons, Segmented, cn } from "@/components/ui";
import {
  averageRate,
  boostSuggestions,
  change,
  clickRate,
  publishedPosts,
  sumStats,
  type PublishedPost,
} from "@/lib/analytics";
import {
  addDays,
  engagement,
  engagementRate,
  formatCompact,
  formatMoney,
  formatNumber,
  formatPercent,
  formatShortDate,
  TODAY,
  WEEKDAYS_MON_FIRST,
} from "@/lib/format";
import {
  FOLLOWERS,
  HEATMAP,
  HEATMAP_SLOTS,
  IMPRESSIONS_PER_REACH,
  NEW_FOLLOWERS_7D,
  REACH_SERIES,
} from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { usePlan } from "@/lib/use-plan";
import { PLATFORM_LABELS, type Platform } from "@/lib/types";

const PLATFORM_SERIES = [
  { key: "facebook", name: "Facebook", color: "#1877f2" },
  { key: "instagram", name: "Instagram", color: "#e1306c" },
];

type Range = "7" | "30" | "60";
type SortKey = "date" | "rate" | StatKey;
type PlatformFilter = "all" | Platform;

/** Өмнөх үед дагагч илүү удаан өсч байсан тул урт хугацаанд дундаж бага (жишээ өгөгдөл) */
const FOLLOWER_SLOWDOWN: Record<Range, number> = { "7": 1, "30": 1.15, "60": 1.3 };

export function AnalyticsView() {
  const { posts, notify } = useStore();
  const { locked } = usePlan();
  const [range, setRange] = useState<Range>("30");
  const [metric, setMetric] = useState<"reach" | "impressions">("reach");
  const [showDaily, setShowDaily] = useState(false);
  const [platform, setPlatform] = useState<PlatformFilter>("all");
  const [sort, setSortKey] = useState<SortKey>("date");
  const [desc, setDesc] = useState(true);
  const [boost, setBoost] = useState<{ post: PublishedPost; budget: number } | null>(null);
  const [detail, setDetail] = useState<PublishedPost | null>(null);
  const [cell, setCell] = useState<{ d: number; s: number } | null>(null);

  /** Ижил баганыг дахин дарвал эрэмбийн чиглэл солигдоно */
  function setSort(k: SortKey) {
    if (k === sort) setDesc((d) => !d);
    else {
      setSortKey(k);
      setDesc(true);
    }
  }

  // ---------- Хугацаа ----------
  const days = Number(range);
  const since = addDays(TODAY, -days + 1);
  const prevSince = addDays(since, -days);
  const series = REACH_SERIES.slice(-days);
  // 60 хоногийн өмнөх үеийн өгөгдөл байхгүй — харьцуулалтыг нуух
  const prevSeries = days * 2 <= REACH_SERIES.length ? REACH_SERIES.slice(-days * 2, -days) : [];

  // ---------- Хүрэлт, харагдалт (өдөр тутмын цуваа) ----------
  const dailyTotal = series.map((r) => r.facebook + r.instagram);
  const reach = dailyTotal.reduce((a, b) => a + b, 0);
  const prevReach = prevSeries.reduce((s, r) => s + r.facebook + r.instagram, 0);
  const fbReach = series.reduce((s, r) => s + r.facebook, 0);
  const igReach = reach - fbReach;
  const impressions = Math.round(reach * IMPRESSIONS_PER_REACH);
  const chartData =
    metric === "reach"
      ? series
      : series.map((r) => ({
          date: r.date,
          facebook: Math.round(r.facebook * IMPRESSIONS_PER_REACH),
          instagram: Math.round(r.instagram * IMPRESSIONS_PER_REACH),
        }));

  // ---------- Постын үзүүлэлтүүд ----------
  const pub = publishedPosts(posts);
  const inRange = pub.filter((p) => p.date >= since && p.date <= TODAY);
  const prevPosts = pub.filter((p) => p.date >= prevSince && p.date < since);
  const hasPrev = prevSeries.length > 0;
  const cur = sumStats(inRange);
  const prev = sumStats(prevPosts);
  const eng = engagement(cur);
  const prevEng = engagement(prev);
  const rate = averageRate(inRange);
  const prevRate = averageRate(prevPosts);
  const ctr = clickRate(cur);
  const prevCtr = clickRate(prev);
  const cmp = (a: number, b: number) => (hasPrev ? change(a, b) : undefined);

  const newFollowers = {
    facebook: Math.round((NEW_FOLLOWERS_7D.facebook * days) / 7 / FOLLOWER_SLOWDOWN[range]),
    instagram: Math.round((NEW_FOLLOWERS_7D.instagram * days) / 7 / FOLLOWER_SLOWDOWN[range]),
  };
  const followersGain = newFollowers.facebook + newFollowers.instagram;

  // ---------- Хүснэгт ----------
  const rows = inRange.filter((p) => platform === "all" || p.platforms.includes(platform));
  const sorted = [...rows].sort((x, y) => {
    const [a, b] = desc ? [x, y] : [y, x];
    if (sort === "date") return (b.date + b.time).localeCompare(a.date + a.time);
    if (sort === "rate") return engagementRate(b.stats) - engagementRate(a.stats);
    return b.stats[sort] - a.stats[sort];
  });
  const rowsTotal = sumStats(rows);
  const rowsRate = averageRate(rows);
  const avgAll = averageRate(pub);
  const colMax = Object.fromEntries(POST_METRICS.map((m) => [m.key, Math.max(0, ...rows.map((p) => p.stats[m.key]))])) as Record<
    StatKey,
    number
  >;

  const topPosts = [...inRange].sort((a, b) => engagementRate(b.stats) - engagementRate(a.stats)).slice(0, 3);

  const suggestions = boostSuggestions(posts);
  const suggestedIds = new Set(suggestions.map((s) => s.post.id));

  // ---------- Heatmap ----------
  const heatMax = Math.max(...HEATMAP.flat());
  const heatMin = Math.min(...HEATMAP.flat());
  /** Хамгийн бага → 6%, хамгийн их → 100% брэнд өнгө: нүднүүд хоорондоо тод ялгарна */
  const heatShade = (v: number) => Math.round(6 + ((v - heatMin) / (heatMax - heatMin || 1)) * 94);
  let best = { d: 0, s: 0 };
  HEATMAP.forEach((row, d) =>
    row.forEach((v, s) => {
      if (v > HEATMAP[best.d][best.s]) best = { d, s };
    }),
  );
  const shownCell = cell ?? best;

  function downloadCsv() {
    const head = [
      "Пост",
      "Огноо",
      "Цаг",
      "Платформ",
      ...POST_METRICS.map((m) => m.label),
      "Нийт идэвх",
      "Идэвхийн хувь (%)",
      "Boost",
    ];
    const lines = sorted.map((p) => [
      p.topic,
      p.date,
      p.time,
      p.platforms.map((x) => PLATFORM_LABELS[x]).join(" + "),
      ...POST_METRICS.map((m) => p.stats[m.key]),
      engagement(p.stats),
      (engagementRate(p.stats) * 100).toFixed(2),
      p.boosted ? "Тийм" : "Үгүй",
    ]);
    const esc = (v: string | number) => {
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    // BOM нь Excel-д кирилл үсгийг зөв харуулна
    const csv = "﻿" + [head, ...lines].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `tugee-statistic-${since}_${TODAY}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`${sorted.length} постын статистикийг CSV-ээр татлаа`);
  }

  return (
    <>
      <PageHeader
        title="Үр дүн & Boost"
        description="Постуудыг тань хэдэн хүн харж, хэд нь сонирхсоныг үзүүлэлт бүрээр харуулна. Хамгийн сайн постоо boost хийж илүү олон хүнд хүргээрэй."
        actions={
          <Segmented
            value={range}
            onChange={setRange}
            options={[
              { value: "7", label: "7 хоног" },
              { value: "30", label: "30 хоног" },
              { value: "60", label: "60 хоног" },
            ]}
          />
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        <Badge tone="sky">Meta Graph API</Badge>
        <span>
          {formatShortDate(since)} – {formatShortDate(TODAY)} · Жишээ өгөгдөл · Сүүлд шинэчилсэн: өнөөдөр 09:00
        </span>
        {!hasPrev && <span className="text-zinc-400">· 60 хоногийн өмнөх үетэй харьцуулах өгөгдөл алга</span>}
      </div>

      {/* ---------- Ерөнхий үзүүлэлтүүд ---------- */}
      <SectionTitle>Хүрэлт ба өсөлт</SectionTitle>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          icon={IconEye}
          tone="brand"
          label="Хүрэлт"
          tip={<TermTip term="Хүрэлт" />}
          value={formatNumber(reach)}
          delta={cmp(reach, prevReach)}
          sub={`өдөрт ~${formatNumber(reach / days)}`}
          spark={dailyTotal}
        />
        <StatTile
          icon={IconTrendingUp}
          tone="sky"
          label="Харагдалт"
          tip={<TermTip term="Харагдалт" />}
          value={formatNumber(impressions)}
          delta={cmp(impressions, prevReach * IMPRESSIONS_PER_REACH)}
          sub={`хүн бүр ~${IMPRESSIONS_PER_REACH.toFixed(1)} удаа`}
          spark={dailyTotal.map((v) => v * IMPRESSIONS_PER_REACH)}
        />
        <StatTile
          icon={IconUsers}
          tone="indigo"
          label="Шинэ дагагч"
          tip={<TermTip term="Дагагч" />}
          value={`+${formatNumber(followersGain)}`}
          sub={`FB +${newFollowers.facebook} · IG +${newFollowers.instagram}`}
        />
        <StatTile
          icon={IconCalendar}
          tone="zinc"
          label="Нийтэлсэн пост"
          value={inRange.length}
          delta={cmp(inRange.length, prevPosts.length)}
          sub={`7 хоногт ~${((inRange.length / days) * 7).toFixed(1)}`}
        />
      </div>

      <SectionTitle className="mt-6">Идэвх</SectionTitle>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatTile
          icon={IconHeart}
          tone="rose"
          label="Нийт идэвх"
          tip={<TermTip term="Идэвх" />}
          value={formatNumber(eng)}
          delta={cmp(eng, prevEng)}
          sub={inRange.length ? `пост тутамд ${formatNumber(eng / inRange.length)}` : "пост алга"}
        />
        <StatTile
          icon={IconTarget}
          tone="rose"
          label="Идэвхийн хувь"
          tip={<TermTip term="Идэвхийн хувь" />}
          value={formatPercent(rate)}
          delta={cmp(rate, prevRate)}
          sub={rate > 0.03 ? "Сайн · ердийн нь 1–3%" : "ердийн нь 1–3%"}
        />
        <StatTile
          icon={IconCursor}
          tone="fuchsia"
          label="Линк дарсан"
          tip={<TermTip term="Линк дарсан" />}
          value={formatNumber(cur.clicks)}
          delta={cmp(cur.clicks, prev.clicks)}
          sub={inRange.length ? `пост тутамд ${formatNumber(cur.clicks / inRange.length)}` : undefined}
        />
        <StatTile
          icon={IconLink}
          tone="fuchsia"
          label="Линк дарсан хувь"
          value={formatPercent(ctr)}
          delta={cmp(ctr, prevCtr)}
          sub="линк ÷ постын хүрэлт"
        />
      </div>

      {/* ---------- Хүрэлтийн график + платформ ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={metric === "reach" ? "Өдөр тутмын хүрэлт" : "Өдөр тутмын харагдалт"}
            description="Цэг бүр дээр хулгана аваачиж тухайн өдрийн тоог харна"
            action={
              <Segmented
                value={metric}
                onChange={setMetric}
                options={[
                  { value: "reach", label: "Хүрэлт" },
                  { value: "impressions", label: "Харагдалт" },
                ]}
              />
            }
          />
          <div className="px-5 pb-4 pt-4">
            <Legend series={PLATFORM_SERIES} />
            <div className="mt-4">
              <TrendChart data={chartData} series={PLATFORM_SERIES} height={230} />
            </div>
          </div>
          <div className="border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setShowDaily((v) => !v)}
              aria-expanded={showDaily}
              className="flex w-full cursor-pointer items-center justify-between px-5 py-3 text-[13px] font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              Өдөр бүрийн тоог хүснэгтээр харах
              <IconChevronDown className={cn("size-4 transition-transform", showDaily && "rotate-180")} />
            </button>
            {showDaily && (
              <div className="fade-up max-h-72 overflow-y-auto border-t border-zinc-100">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-zinc-50 text-xs text-zinc-500">
                    <tr>
                      <th className="px-5 py-2 text-left font-medium">Огноо</th>
                      <th className="px-3 py-2 text-right font-medium">Facebook</th>
                      <th className="px-3 py-2 text-right font-medium">Instagram</th>
                      <th className="px-5 py-2 text-right font-medium">Нийт</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 tabular-nums">
                    {[...chartData].reverse().map((r) => (
                      <tr key={r.date} className="hover:bg-zinc-50/70">
                        <td className="px-5 py-1.5 text-zinc-600">{formatShortDate(r.date)}</td>
                        <td className="px-3 py-1.5 text-right text-zinc-700">{formatNumber(r.facebook)}</td>
                        <td className="px-3 py-1.5 text-right text-zinc-700">{formatNumber(r.instagram)}</td>
                        <td className="px-5 py-1.5 text-right font-medium text-zinc-900">
                          {formatNumber(r.facebook + r.instagram)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Платформоор" description={`Сүүлийн ${days} хоног`} />
          <div className="space-y-4 p-5">
            {(
              [
                { p: "facebook", reach: fbReach, color: "bg-fb" },
                { p: "instagram", reach: igReach, color: "bg-ig" },
              ] as const
            ).map((row) => (
              <div key={row.p} className="rounded-xl p-3 ring-1 ring-zinc-900/[0.06]">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 font-medium text-zinc-800">
                    <PlatformIcon platform={row.p} />
                    {PLATFORM_LABELS[row.p]}
                  </span>
                  <span className="text-xs text-zinc-500">{formatPercent(row.reach / reach, 0)} хүрэлт</span>
                </div>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", row.color)}
                    style={{ width: `${(row.reach / reach) * 100}%` }}
                  />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  <MiniStat label="Хүрэлт" value={formatNumber(row.reach)} />
                  <MiniStat label="Өдөрт дундаж" value={formatNumber(row.reach / days)} />
                  <MiniStat label="Нийт дагагч" value={formatNumber(FOLLOWERS[row.p])} />
                  <MiniStat label="Шинэ дагагч" value={`+${newFollowers[row.p]}`} />
                </dl>
              </div>
            ))}
            <div className="rounded-xl bg-linear-to-br from-brand-50 to-surface p-3 text-[13px] leading-relaxed text-zinc-600 ring-1 ring-brand-200/50">
              Instagram-д цөөн дагагчтай ч шинэ дагагч илүү хурдан нэмэгдэж байна. Reels видео нэмбэл илүү өснө.
            </div>
          </div>
        </Card>
      </div>

      {/* ---------- Идэвхийн бүтэц + Heatmap ---------- */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            icon={IconHeart}
            title="Идэвхийн бүтэц"
            description={`${inRange.length} постын нийт ${formatNumber(eng)} үйлдлийг төрлөөр нь`}
          />
          <div className="p-5">
            {eng === 0 ? (
              <p className="py-6 text-center text-sm text-zinc-500">Энэ хугацаанд нийтэлсэн пост алга.</p>
            ) : (
              <SegmentedBar
                parts={ENGAGEMENT_KINDS.map((k) => ({
                  key: k.key,
                  label: METRIC_BY_KEY[k.key].label,
                  value: cur[k.key],
                  color: k.color,
                  ink: k.ink,
                }))}
              />
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              {ENGAGEMENT_KINDS.map((k) => {
                const m = METRIC_BY_KEY[k.key];
                const d = cmp(cur[k.key], prev[k.key]);
                return (
                  <div key={k.key} className="rounded-xl bg-zinc-50/70 p-3 ring-1 ring-inset ring-zinc-900/[0.05]">
                    <p className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                      <span className="size-2.5 rounded-sm" style={{ background: k.color }} />
                      {m.label}
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-zinc-900">{formatNumber(cur[k.key])}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                      {d !== undefined && <DeltaPill value={d} />}
                      {inRange.length > 0 && `пост тутамд ${formatNumber(cur[k.key] / inRange.length)}`}
                    </p>
                  </div>
                );
              })}
            </div>

            {topPosts.length > 0 && (
              <div className="mt-5">
                <p className="text-[13px] font-semibold text-zinc-900">Хамгийн идэвхтэй постууд</p>
                <p className="text-xs text-zinc-500">Идэвхийн хувиар · дарж дэлгэрэнгүйг харна</p>
                <ol className="mt-2 divide-y divide-zinc-100">
                  {topPosts.map((p, i) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setDetail(p)}
                        className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-zinc-50"
                      >
                        <span
                          className={cn(
                            "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                            i === 0 ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-500",
                          )}
                        >
                          {i + 1}
                        </span>
                        <PostVisual visual={p.visual} size="xs" className="size-8 shrink-0 rounded-md" />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{p.topic}</span>
                        <span className="hidden text-xs tabular-nums text-zinc-500 sm:inline">
                          {formatNumber(engagement(p.stats))} үйлдэл · {formatCompact(p.stats.reach)} хүрэлт
                        </span>
                        <span className="w-14 text-right text-sm font-semibold tabular-nums text-zinc-900">
                          {formatPercent(engagementRate(p.stats))}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader
            icon={IconClock}
            title="Дагагчид хэзээ идэвхтэй вэ?"
            description={`Хамгийн сайн цаг: ${WEEKDAYS_MON_FIRST[best.d]} ${HEATMAP_SLOTS[best.s]}`}
          />
          <div className="p-5">
            <div
              className="mx-auto grid max-w-sm grid-cols-[28px_repeat(6,1fr)] gap-1 text-[10px] text-zinc-400"
              onMouseLeave={() => setCell(null)}
            >
              <span />
              {HEATMAP_SLOTS.map((s) => (
                <span key={s} className="text-center">
                  {s.slice(0, 2)}
                </span>
              ))}
              {HEATMAP.map((row, d) => (
                <div key={WEEKDAYS_MON_FIRST[d]} className="contents">
                  <span className="flex items-center text-[11px] text-zinc-500">{WEEKDAYS_MON_FIRST[d]}</span>
                  {row.map((v, s) => (
                    <span
                      key={s}
                      onMouseEnter={() => setCell({ d, s })}
                      title={`${WEEKDAYS_MON_FIRST[d]} ${HEATMAP_SLOTS[s]} — ${v}%`}
                      className={cn(
                        "aspect-square rounded-md transition-transform duration-100 hover:scale-110",
                        d === shownCell.d && s === shownCell.s && "ring-2 ring-zinc-900 ring-offset-1 ring-offset-surface",
                      )}
                      style={{
                        background: `color-mix(in oklab, var(--color-brand-600) ${heatShade(v)}%, var(--color-heat-0))`,
                      }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mx-auto mt-3 flex max-w-sm items-center justify-between gap-2 text-[11px]">
              <span className="font-medium text-zinc-700">
                {WEEKDAYS_MON_FIRST[shownCell.d]} {HEATMAP_SLOTS[shownCell.s]} ·{" "}
                <span className="tabular-nums">{HEATMAP[shownCell.d][shownCell.s]}%</span> идэвхтэй
              </span>
              <span className="flex items-center gap-1.5 text-zinc-400">
                бага
                <span
                  className="h-2 w-14 rounded-full"
                  style={{ background: "linear-gradient(to right, var(--color-heat-0), var(--color-brand-600))" }}
                />
                их
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* ---------- Boost зөвлөмж ---------- */}
      <Card className="mt-6">
        <CardHeader
          icon={IconRocket}
          title={
            <span className="flex items-center gap-1.5">
              Boost зөвлөмж <TermTip term="Boost" />
            </span>
          }
          description={`Таны дундаж идэвхийн хувь ${formatPercent(avgAll)}. Үүнээс өндөр идэвхтэй ч цөөн хүнд хүрсэн постуудыг boost хийх нь хамгийн үр ашигтай.`}
        />
        {locked ? (
          <PlusLock
            className="py-8"
            title="Boost зөвлөмж — Plus багцад"
            description="Аль постыг хэдэн төгрөгөөр boost хийвэл хамгийн үр ашигтайг AI тооцож санал болгоно."
          />
        ) : (
        <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-3">
          {suggestions.length === 0 && (
            <p className="col-span-full py-6 text-center text-sm text-zinc-500">Одоогоор boost хийх тохиромжтой пост алга.</p>
          )}
          {suggestions.map((s, i) => (
            <div
              key={s.post.id}
              className="flex flex-col overflow-hidden rounded-xl bg-surface ring-1 ring-zinc-900/[0.07] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <button type="button" onClick={() => setDetail(s.post)} className="relative cursor-pointer text-left">
                <PostVisual visual={s.post.visual} size="sm" className="aspect-[16/9]" />
                {i === 0 && (
                  <Badge tone="emerald" className="absolute left-2 top-2 bg-surface">
                    Хамгийн сайн
                  </Badge>
                )}
              </button>
              <div className="flex flex-1 flex-col p-3">
                <p className="text-sm font-medium text-zinc-900">{s.post.topic}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{s.reason}</p>
                <div className="mt-2 flex items-center gap-3 text-xs">
                  <span className="font-semibold text-emerald-700">{formatPercent(s.rate)} идэвх</span>
                  <span className="text-zinc-500">{formatCompact(s.post.stats.reach)} хүрэлт</span>
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => setBoost({ post: s.post, budget: s.budget })}>
                  {formatMoney(s.budget)}-өөр boost
                </Button>
              </div>
            </div>
          ))}
        </div>
        )}
      </Card>

      {/* ---------- Пост бүрийн статистик ---------- */}
      {locked ? (
        <Card className="mt-6">
          <CardHeader title="Пост бүрийн статистик" description="Пост тус бүрийн хүрэлт, идэвх, CSV татах" />
          <PlusLock
            className="py-8"
            title="Пост бүрийн статистик — Plus багцад"
            description="Үнэгүй багцад дээрх нийт үзүүлэлтүүд харагдана. Plus-д пост бүрийн дэлгэрэнгүй тоо, эрэмбэлэх, CSV татах, boost хийх боломжтой."
          />
        </Card>
      ) : (
      <Card className="mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 px-5 pt-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-zinc-900">Пост бүрийн статистик</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">
              Мөр дээр дарж бүх үзүүлэлтийг дэлгэрэнгүй харна. Баганын нэрийг дарж эрэмбэлнэ.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented
              value={platform}
              onChange={setPlatform}
              options={[
                { value: "all", label: "Бүгд" },
                { value: "facebook", label: "Facebook" },
                { value: "instagram", label: "Instagram" },
              ]}
            />
            <Button variant="secondary" size="sm" onClick={downloadCsv} disabled={!rows.length}>
              <IconDownload className="size-4" /> CSV татах
            </Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-zinc-500">Энэ хугацаанд тохирох пост алга.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead>
                <tr className="border-y border-zinc-100 bg-zinc-50/80 text-xs text-zinc-500">
                  <th className="sticky left-0 z-[1] bg-zinc-50 px-5 py-2.5 text-left font-medium">Пост</th>
                  <SortTh label="Огноо" k="date" sort={sort} desc={desc} setSort={setSort} align="left" />
                  {POST_METRICS.map((m) => (
                    <SortTh key={m.key} label={m.label} k={m.key} sort={sort} desc={desc} setSort={setSort} />
                  ))}
                  <SortTh label="Идэвх %" k="rate" sort={sort} desc={desc} setSort={setSort} />
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sorted.map((p) => {
                  const r = engagementRate(p.stats);
                  return (
                    <tr key={p.id} onClick={() => setDetail(p)} className="group cursor-pointer transition-colors hover:bg-brand-50/40">
                      <td className="sticky left-0 z-[1] bg-surface px-5 py-3 transition-colors group-hover:bg-zinc-50">
                        <div className="flex items-center gap-3">
                          <PostVisual visual={p.visual} size="xs" className="size-10 shrink-0 rounded-lg" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetail(p);
                              }}
                              className="block max-w-48 cursor-pointer truncate text-left font-medium text-zinc-900 hover:text-brand-700 hover:underline"
                            >
                              {p.topic}
                            </button>
                            <PlatformIcons platforms={p.platforms} className="mt-1 origin-left scale-75" />
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-zinc-600">{formatShortDate(p.date)}</td>
                      {POST_METRICS.map((m) => {
                        const v = p.stats[m.key];
                        const top = v === colMax[m.key] && rows.length > 1;
                        return (
                          <td key={m.key} className="px-3 py-3 text-right tabular-nums">
                            <span
                              className={cn(
                                "rounded-md px-1.5 py-0.5",
                                top ? "bg-brand-50 font-semibold text-brand-800 ring-1 ring-inset ring-brand-200/60" : "text-zinc-700",
                              )}
                              title={top ? `Хамгийн өндөр ${m.label.toLowerCase()}` : undefined}
                            >
                              {formatNumber(v)}
                            </span>
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-right">
                        <span
                          className={cn(
                            "font-semibold tabular-nums",
                            r >= avgAll * 1.15 ? "text-emerald-700" : r < avgAll * 0.75 ? "text-rose-700" : "text-zinc-700",
                          )}
                        >
                          {r >= avgAll * 1.15 ? "▲ " : r < avgAll * 0.75 ? "▼ " : ""}
                          {formatPercent(r)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {p.boosted ? (
                          <Badge tone="brand">
                            <IconRocket className="size-3" /> Boost хийгдсэн
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant={suggestedIds.has(p.id) ? "primary" : "secondary"}
                            onClick={() => setBoost({ post: p, budget: 30000 })}
                          >
                            Boost
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-200 bg-zinc-50/80 text-[13px]">
                  <td className="sticky left-0 z-[1] bg-zinc-50 px-5 py-3 font-semibold text-zinc-900">
                    Нийт · {rows.length} пост
                  </td>
                  <td />
                  {POST_METRICS.map((m) => (
                    <td key={m.key} className="px-3 py-3 text-right">
                      <span className="px-1.5 font-semibold tabular-nums text-zinc-900">{formatNumber(rowsTotal[m.key])}</span>
                      <span className="block px-1.5 text-[11px] tabular-nums text-zinc-400">
                        дундаж {formatNumber(rowsTotal[m.key] / rows.length)}
                      </span>
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right">
                    <span className="font-semibold tabular-nums text-zinc-900">{formatPercent(rowsRate)}</span>
                    <span className="block text-[11px] text-zinc-400">дундаж</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>
      )}

      {detail && (
        <PostStatsModal
          key={detail.id}
          post={detail}
          all={pub}
          onClose={() => setDetail(null)}
          onBoost={() => {
            setBoost({ post: detail, budget: suggestions.find((s) => s.post.id === detail.id)?.budget ?? 30000 });
            setDetail(null);
          }}
        />
      )}
      {boost && (
        <BoostModal key={boost.post.id} post={boost.post} initialBudget={boost.budget} onClose={() => setBoost(null)} />
      )}
    </>
  );
}

function SectionTitle({ children, className }: { children: string; className?: string }) {
  return (
    <h2 className={cn("mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400", className)}>{children}</h2>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-400">{label}</dt>
      <dd className="font-semibold tabular-nums text-zinc-800">{value}</dd>
    </div>
  );
}

function SortTh({
  label,
  k,
  sort,
  desc,
  setSort,
  align = "right",
}: {
  label: string;
  k: SortKey;
  sort: SortKey;
  desc: boolean;
  setSort: (k: SortKey) => void;
  align?: "left" | "right";
}) {
  return (
    <th
      className={cn("whitespace-nowrap px-3 py-2.5 font-medium", align === "right" ? "text-right" : "text-left")}
      aria-sort={sort === k ? (desc ? "descending" : "ascending") : "none"}
    >
      <button
        type="button"
        onClick={() => setSort(k)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 transition-colors hover:bg-zinc-200/60 hover:text-zinc-800",
          sort === k && "text-zinc-900",
        )}
      >
        {label}
        <IconChevronDown
          className={cn(
            "size-3.5 transition-transform",
            sort === k ? "opacity-100" : "opacity-30",
            sort === k && !desc && "rotate-180",
          )}
        />
      </button>
    </th>
  );
}
