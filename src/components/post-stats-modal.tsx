"use client";

import { averageRate, clickRate, type PublishedPost } from "@/lib/analytics";
import { engagement, engagementRate, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { SegmentedBar } from "./charts";
import { IconRocket, IconSparkles } from "./icons";
import { TermTip } from "./info-tip";
import { Modal } from "./modal";
import { ENGAGEMENT_KINDS, METRIC_BY_KEY, POST_METRICS } from "./post-metrics";
import { PostVisual } from "./post-visual";
import { DeltaPill, IconChip, STAT_STROKE } from "./stat-tile";
import { Badge, Button, PlatformIcons } from "./ui";

/** Нэг постын бүх статистик: үзүүлэлт бүрийг бусад постын дундаж, хамгийн өндөртэй харьцуулна */
export function PostStatsModal({
  post,
  all,
  onClose,
  onBoost,
}: {
  post: PublishedPost;
  /** Харьцуулалт хийх бүх нийтлэгдсэн пост */
  all: PublishedPost[];
  onClose: () => void;
  onBoost: () => void;
}) {
  const n = Math.max(all.length, 1);
  const rate = engagementRate(post.stats);
  const avgRate = averageRate(all);
  const ctr = clickRate(post.stats);
  const avgCtr = all.reduce((s, p) => s + clickRate(p.stats), 0) / n;
  const eng = engagement(post.stats);
  const avgEng = all.reduce((s, p) => s + engagement(p.stats), 0) / n;

  const ratios = [
    { label: "Нийт идэвх", term: "Идэвх", value: formatNumber(eng), avg: formatNumber(avgEng), delta: eng / avgEng - 1 },
    { label: "Идэвхийн хувь", term: "Идэвхийн хувь", value: formatPercent(rate), avg: formatPercent(avgRate), delta: rate / avgRate - 1 },
    { label: "Линк дарсан хувь", term: "Линк дарсан", value: formatPercent(ctr), avg: formatPercent(avgCtr), delta: ctr / avgCtr - 1 },
  ];

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={post.topic}
      description={`${formatDate(post.date)} · ${post.time}-д нийтлэгдсэн`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Хаах
          </Button>
          {!post.boosted && (
            <Button onClick={onBoost}>
              <IconRocket className="size-4" /> Boost хийх
            </Button>
          )}
        </>
      }
    >
      <div className="flex gap-4">
        <PostVisual visual={post.visual} size="sm" className="size-24 shrink-0 rounded-xl sm:size-28" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <PlatformIcons platforms={post.platforms} />
            {post.boosted && (
              <Badge tone="brand">
                <IconRocket className="size-3" /> Boost хийгдсэн
              </Badge>
            )}
            {post.aiGenerated && (
              <Badge tone="violet">
                <IconSparkles className="size-3" /> AI бичсэн
              </Badge>
            )}
          </div>
          <p className="mt-2 line-clamp-4 whitespace-pre-line text-[13px] leading-relaxed text-zinc-600">{post.caption}</p>
          {post.hashtags.length > 0 && (
            <p className="mt-1.5 truncate text-xs text-brand-700">{post.hashtags.join(" ")}</p>
          )}
        </div>
      </div>

      {/* Харьцаа үзүүлэлтүүд */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        {ratios.map((r) => (
          <div key={r.label} className="rounded-xl bg-zinc-50 p-2.5 ring-1 ring-inset ring-zinc-900/[0.05] sm:p-3">
            <p className="text-xs font-medium leading-tight text-zinc-500">
              {r.label}{" "}
              <span className="inline-flex align-middle">
                <TermTip term={r.term} />
              </span>
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 sm:text-xl">{r.value}</p>
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
              {Number.isFinite(r.delta) && <DeltaPill value={r.delta} />}
              дундаж {r.avg}
            </p>
          </div>
        ))}
      </div>

      {/* Идэвхийн бүтэц */}
      <div className="mt-5">
        <p className="text-[13px] font-semibold text-zinc-900">Идэвхийн бүтэц</p>
        <SegmentedBar
          className="mt-2"
          parts={ENGAGEMENT_KINDS.map((k) => ({
            key: k.key,
            label: METRIC_BY_KEY[k.key].label,
            value: post.stats[k.key],
            color: k.color,
            ink: k.ink,
          }))}
        />
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
          {ENGAGEMENT_KINDS.map((k) => (
            <span key={k.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: k.color }} />
              {METRIC_BY_KEY[k.key].label}
              <b className="font-semibold tabular-nums text-zinc-800">{formatNumber(post.stats[k.key])}</b>
            </span>
          ))}
        </div>
      </div>

      {/* Үзүүлэлт бүр */}
      <div className="mt-5">
        <p className="text-[13px] font-semibold text-zinc-900">Үзүүлэлт бүрээр</p>
        <p className="text-xs text-zinc-500">
          Багана нь таны хамгийн өндөр үзүүлэлттэй постыг 100% гэж харьцуулна. Босоо зураас — {all.length} постын дундаж.
        </p>
        <ul className="mt-3 divide-y divide-zinc-100 rounded-xl ring-1 ring-zinc-900/[0.06]">
          {POST_METRICS.map((m) => {
            const value = post.stats[m.key];
            const values = all.map((p) => p.stats[m.key]);
            const max = Math.max(...values, value, 1);
            const avg = values.reduce((a, b) => a + b, 0) / n;
            const rank = values.filter((v) => v > value).length + 1;
            return (
              <li key={m.key} className="flex items-center gap-3 px-3 py-2.5">
                <IconChip icon={m.icon} tone={m.tone} className="size-7" />
                <div className="w-28 shrink-0 sm:w-32">
                  <p className="text-[13px] font-medium text-zinc-800">{m.label}</p>
                  <p className="truncate text-[11px] text-zinc-400">{m.hint}</p>
                </div>
                <div className="hidden min-w-0 flex-1 sm:block">
                  <div className="relative h-2 rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${(value / max) * 100}%`, background: STAT_STROKE[m.tone] }}
                    />
                    <span
                      title={`Дундаж: ${formatNumber(avg)}`}
                      className="absolute -top-1 h-4 w-0.5 -translate-x-1/2 rounded-full bg-zinc-700"
                      style={{ left: `${(avg / max) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {all.length}-аас {rank}-р байр · дундаж {formatNumber(avg)}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-sm font-semibold tabular-nums text-zinc-900">{formatNumber(value)}</p>
                  {avg > 0 && <DeltaPill value={value / avg - 1} className="mt-0.5" />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
