"use client";

import { useState } from "react";
import { EditPostModal } from "@/components/edit-post-modal";
import { IconCheck, IconChevronLeft, IconChevronRight, IconPencil, IconPlus, IconUndo } from "@/components/icons";
import { Modal } from "@/components/modal";
import { PostPreview } from "@/components/post-preview";
import { Button, ButtonLink, Card, PageHeader, PlatformIcons, StatusBadge, cn } from "@/components/ui";
import {
  byDateTime,
  daysInMonth,
  engagementRate,
  formatDate,
  formatNumber,
  formatPercent,
  monthLabel,
  parseDate,
  toDateStr,
  TODAY,
  WEEKDAYS_MON_FIRST,
  weekday,
} from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Post, PostStatus } from "@/lib/types";

const CHIP: Record<PostStatus, string> = {
  published: "bg-emerald-50 text-emerald-800 ring-emerald-200/70",
  scheduled: "bg-brand-50 text-brand-800 ring-brand-200/70",
  pending: "bg-amber-50 text-amber-900 ring-amber-200/70",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200/70",
};
const DOT: Record<PostStatus, string> = {
  published: "bg-emerald-500",
  scheduled: "bg-brand-500",
  pending: "bg-amber-400",
  rejected: "bg-rose-400",
};

export function CalendarView() {
  const { posts, business, updatePost, notify } = useStore();
  const today = parseDate(TODAY);
  const [ym, setYm] = useState({ y: today.y, m: today.m });
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Post | null>(null);

  const visible = posts.filter((p) => p.status !== "rejected");
  const open = posts.find((p) => p.id === openId) ?? null;

  // Даваагаар эхэлсэн 6 долоо хоногийн тор
  const first = toDateStr(ym.y, ym.m, 1);
  const lead = (weekday(first) + 6) % 7;
  const total = daysInMonth(ym.y, ym.m);
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: total }, (_, i) => toDateStr(ym.y, ym.m, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);

  const monthPrefix = `${ym.y}-${String(ym.m).padStart(2, "0")}`;
  const monthPosts = visible.filter((p) => p.date.startsWith(monthPrefix)).sort(byDateTime);

  function shift(delta: number) {
    setYm(({ y, m }) => {
      const nm = m + delta;
      if (nm < 1) return { y: y - 1, m: 12 };
      if (nm > 12) return { y: y + 1, m: 1 };
      return { y, m: nm };
    });
  }

  const counts = {
    published: monthPosts.filter((p) => p.status === "published").length,
    scheduled: monthPosts.filter((p) => p.status === "scheduled").length,
    pending: monthPosts.filter((p) => p.status === "pending").length,
  };

  return (
    <>
      <PageHeader
        title="Контент хуанли"
        description="Бүх постоо нэг дороос харж, тогтмол нийтэлж байгаа эсэхээ хянаарай."
        actions={
          <ButtonLink href="/dashboard/create">
            <IconPlus className="size-4" /> Пост нэмэх
          </ButtonLink>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => shift(-1)} aria-label="Өмнөх сар">
              <IconChevronLeft className="size-4" />
            </Button>
            <h2 className="min-w-36 text-center font-semibold text-zinc-900">{monthLabel(ym.y, ym.m)}</h2>
            <Button variant="ghost" size="sm" onClick={() => shift(1)} aria-label="Дараах сар">
              <IconChevronRight className="size-4" />
            </Button>
            {(ym.y !== today.y || ym.m !== today.m) && (
              <Button variant="secondary" size="sm" className="ml-1" onClick={() => setYm({ y: today.y, m: today.m })}>
                Өнөөдөр
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-zinc-600">
            <Legend dot={DOT.published} label={`Нийтлэгдсэн ${counts.published}`} />
            <Legend dot={DOT.scheduled} label={`Хуваарьт ${counts.scheduled}`} />
            <Legend dot={DOT.pending} label={`Батлах ${counts.pending}`} />
          </div>
        </div>

        {/* Desktop/tablet: сарын тор */}
        <div className="hidden md:block">
          <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50/60 text-center text-xs font-medium text-zinc-500">
            {WEEKDAYS_MON_FIRST.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((date, i) => {
              const dayPosts = date ? visible.filter((p) => p.date === date).sort(byDateTime) : [];
              const isToday = date === TODAY;
              return (
                <div
                  key={date ?? `empty-${i}`}
                  className={cn(
                    "min-h-28 border-b border-r border-zinc-100 p-1.5 [&:nth-child(7n)]:border-r-0",
                    !date && "bg-zinc-50/50",
                    date && date < TODAY && "bg-zinc-50/30",
                  )}
                >
                  {date && (
                    <>
                      <span
                        className={cn(
                          "inline-flex size-6 items-center justify-center rounded-full text-xs",
                          isToday ? "bg-lime font-semibold text-ink" : "text-zinc-500",
                        )}
                      >
                        {parseDate(date).d}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayPosts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setOpenId(p.id)}
                            className={cn(
                              "flex w-full cursor-pointer items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-[11px] font-medium ring-1 ring-inset transition hover:brightness-95",
                              CHIP[p.status],
                            )}
                          >
                            <span>{p.visual.emoji}</span>
                            <span className="hidden tabular-nums opacity-70 xl:inline">{p.time}</span>
                            <span className="truncate">{p.topic}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile: жагсаалт */}
        <ul className="divide-y divide-zinc-100 md:hidden">
          {monthPosts.length === 0 && <li className="px-4 py-10 text-center text-sm text-zinc-500">Энэ сард пост алга</li>}
          {monthPosts.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpenId(p.id)}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50"
              >
                <div className="w-10 shrink-0 text-center">
                  <p className="text-[11px] text-zinc-400">{WEEKDAYS_MON_FIRST[(weekday(p.date) + 6) % 7]}</p>
                  <p
                    className={cn(
                      "text-lg font-semibold leading-tight",
                      p.date === TODAY ? "text-brand-600" : "text-zinc-900",
                    )}
                  >
                    {parseDate(p.date).d}
                  </p>
                </div>
                <span className={cn("size-2 shrink-0 rounded-full", DOT[p.status])} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {p.visual.emoji} {p.topic}
                  </p>
                  <p className="text-xs text-zinc-500">{p.time}</p>
                </div>
                <PlatformIcons platforms={p.platforms} />
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {open && (
        <Modal
          open
          onClose={() => setOpenId(null)}
          title={open.topic}
          description={`${formatDate(open.date)} · ${open.time}`}
          size="lg"
          footer={
            <>
              {open.status === "pending" && (
                <Button
                  variant="success"
                  onClick={() => {
                    updatePost(open.id, { status: "scheduled" });
                    notify("Батлагдлаа");
                  }}
                >
                  <IconCheck className="size-4" /> Батлах
                </Button>
              )}
              {open.status === "scheduled" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    updatePost(open.id, { status: "pending" });
                    notify("Хуваариас хасаж, батлах руу буцаалаа", "info");
                  }}
                >
                  <IconUndo className="size-4" /> Хуваариас хасах
                </Button>
              )}
              {open.status !== "published" && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditing(open);
                    setOpenId(null);
                  }}
                >
                  <IconPencil className="size-4" /> Засах
                </Button>
              )}
              <Button variant="ghost" onClick={() => setOpenId(null)}>
                Хаах
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-[1fr_240px]">
            <PostPreview
              caption={open.caption}
              hashtags={open.hashtags}
              visual={open.visual}
              platforms={open.platforms}
              businessName={business.name}
              handle={business.handle}
            />
            <div className="space-y-4">
              <div>
                <p className="text-xs text-zinc-500">Төлөв</p>
                <div className="mt-1">
                  <StatusBadge status={open.status} />
                </div>
              </div>
              {open.stats && (
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Хүрэлт" value={formatNumber(open.stats.reach)} />
                  <Stat label="Идэвхийн хувь" value={formatPercent(engagementRate(open.stats))} />
                  <Stat label="Reaction" value={formatNumber(open.stats.reactions)} />
                  <Stat label="Сэтгэгдэл" value={formatNumber(open.stats.comments)} />
                  <Stat label="Хуваалцсан" value={formatNumber(open.stats.shares)} />
                  <Stat label="Линк дарсан" value={formatNumber(open.stats.clicks)} />
                </div>
              )}
              {open.status === "pending" && (
                <p className="rounded-lg bg-amber-50 p-3 text-[13px] text-amber-900">
                  Энэ пост таны батлахыг хүлээж байна. Батлахгүй бол нийтлэгдэхгүй.
                </p>
              )}
            </div>
          </div>
        </Modal>
      )}

      {editing && (
        <EditPostModal key={editing.id} post={editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", dot)} />
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-2.5 ring-1 ring-zinc-200/70">
      <p className="text-[11px] text-zinc-500">{label}</p>
      <p className="font-semibold tabular-nums text-zinc-900">{value}</p>
    </div>
  );
}
