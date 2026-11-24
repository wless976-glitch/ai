"use client";

import Link from "next/link";
import { useState } from "react";
import { BoostModal } from "@/components/boost-modal";
import { PlusBadge } from "@/components/plus";
import { EditPostModal } from "@/components/edit-post-modal";
import { GettingStarted } from "@/components/getting-started";
import { InfoTip, TermTip } from "@/components/info-tip";
import { Legend, MiniBars, TrendChart } from "@/components/charts";
import {
  IconArrowRight,
  IconBulb,
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconClock,
  IconEye,
  IconHeart,
  IconRocket,
  IconSparkles,
  IconUsers,
} from "@/components/icons";
import { PostVisual } from "@/components/post-visual";
import { IconChip, StatTile } from "@/components/stat-tile";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  PlatformIcons,
  Progress,
} from "@/components/ui";
import { averageRate, boostSuggestions, monthPostCount, publishedPosts, type BoostSuggestion } from "@/lib/analytics";
import {
  addDays,
  byDateTime,
  formatDate,
  formatMoney,
  formatNumber,
  formatPercent,
  parseDate,
  WEEKDAYS_FULL,
  weekday,
} from "@/lib/format";
import { DAILY_TIPS } from "@/lib/academy/tips";
import { HAS_LIVE_STATS, NEW_FOLLOWERS_7D, REACH_SERIES } from "@/lib/live-stats";
import { useStore } from "@/lib/store";
import { useToday } from "@/lib/today";
import { usePlan } from "@/lib/use-plan";
import type { Post } from "@/lib/types";

const SERIES = [
  { key: "facebook", name: "Facebook", color: "#1877f2" },
  { key: "instagram", name: "Instagram", color: "#e1306c" },
];

export function DashboardView() {
  const { posts, business, settings, updatePost, notify } = useStore();
  const { locked } = usePlan();
  const [boost, setBoost] = useState<BoostSuggestion | null>(null);
  const [viewing, setViewing] = useState<Post | null>(null);
  const today = useToday();

  const pending = posts.filter((p) => p.status === "pending").sort(byDateTime);
  const upcoming = posts
    .filter((p) => p.status === "scheduled" && p.date >= today)
    .sort(byDateTime)
    .slice(0, 4);
  const pub = publishedPosts(posts);

  const sum = (rows: typeof REACH_SERIES) => rows.reduce((s, r) => s + r.facebook + r.instagram, 0);
  const reach7 = sum(REACH_SERIES.slice(-7));
  const reachPrev7 = sum(REACH_SERIES.slice(-14, -7));
  const reachChange = reach7 / reachPrev7 - 1;
  const rate = averageRate(pub.filter((p) => p.date >= addDays(today, -14)));
  const followers = NEW_FOLLOWERS_7D.facebook + NEW_FOLLOWERS_7D.instagram;
  const goal = settings.postsPerWeek * 4;
  const monthCount = monthPostCount(posts, today);
  const weekEnd = addDays(today, 6);
  const thisWeek = posts.filter(
    (p) => (p.status === "scheduled" || p.status === "pending") && p.date >= today && p.date <= weekEnd,
  ).length;
  const topBoost = boostSuggestions(posts, today)[0];
  const { m, d } = parseDate(today);
  // Сүүлийн 8 долоо хоногт нийтэлсэн/төлөвлөсөн постын тоо — хэрэглэгчийн бодит постуудаас
  const weeklyPosts = Array.from({ length: 8 }, (_, i) => {
    const start = addDays(today, -7 * (7 - i) - 6);
    const end = addDays(start, 6);
    const { m: sm, d: sd } = parseDate(start);
    const count = posts.filter(
      (p) => (p.status === "published" || p.status === "scheduled") && p.date >= start && p.date <= end,
    ).length;
    return { label: `${sm}/${sd}`, count };
  });
  const thisWeekCount = weeklyPosts[7].count;
  const tip = DAILY_TIPS[weekday(today) % DAILY_TIPS.length];

  function approve(id: string) {
    updatePost(id, { status: "scheduled" });
    notify("Батлагдлаа — хуваарийн дагуу автоматаар нийтлэгдэнэ");
  }

  return (
    <>
      <PageHeader
        title={business.name ? `Сайн байна уу, ${business.name} 👋` : "Сайн байна уу 👋"}
        description={
          <>
            {m}-р сарын {d}, {WEEKDAYS_FULL[weekday(today)]}. Ирэх 7 хоногт {thisWeek} пост төлөвлөгдсөн.
            {pending.length > 0 && (
              <>
                {" "}
                <Link href="#pending" className="font-medium text-amber-700 hover:underline">
                  {pending.length} пост таны батлахыг хүлээж байна →
                </Link>
              </>
            )}
          </>
        }
        actions={
          <ButtonLink href="/dashboard/create">
            <IconSparkles className="size-4" /> Пост бэлдэх
          </ButtonLink>
        }
      />

      <GettingStarted />

      {/* 1. Ажлын урсгал — Түгээ-г энгийн AI-аас ялгадаг хэсэг: батлах → хуваарь, тогтмол байдал */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {/* Батлах — тусдаа хуудас байхгүй тул хүлээгдэж буй бүх пост энд харагдана */}
          <Card id="pending" className="scroll-mt-20">
            <CardHeader
              icon={IconCheckCircle}
              title={
                <span className="flex items-center gap-2">
                  Батлах хүлээгдэж буй
                  {pending.length > 0 && <Badge tone="amber">{pending.length}</Badge>}
                </span>
              }
              description="AI бэлдсэн. Та батлах хүртэл нийтлэгдэхгүй."
            />
            {pending.length === 0 ? (
              <EmptyState
                icon={IconCheck}
                title="Бүх пост батлагдсан"
                description="Ирэх 7 хоногийн контентоо AI-аар бэлдүүлээрэй."
                action={
                  <ButtonLink href="/dashboard/create" variant="secondary" size="sm">
                    Пост бэлдэх
                  </ButtonLink>
                }
              />
            ) : (
              <ul className="mt-3 divide-y divide-zinc-100">
                {pending.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3">
                    <PostVisual visual={p.visual} size="xs" className="size-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">{p.topic}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-zinc-500">
                        <PlatformIcons platforms={p.platforms} className="scale-75 origin-left" />
                        <span className="-ml-2">
                          {formatDate(p.date, today)} · {p.time}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="ghost" size="sm" className="max-sm:hidden" onClick={() => setViewing(p)}>
                        Харах
                      </Button>
                      <Button size="sm" variant="success" onClick={() => approve(p.id)}>
                        <IconCheck className="size-4" /> Батлах
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="h-2" />
          </Card>

          {/* Ойрын хуваарь */}
          <Card>
            <CardHeader
              icon={IconClock}
              title="Ойрын хуваарь"
              description="Батлагдсан, автоматаар гарах постууд"
              action={
                <Link href="/dashboard/calendar" className="text-[13px] font-medium text-brand-700 hover:underline">
                  Хуанли
                </Link>
              }
            />
            {upcoming.length === 0 && (
              <p className="px-5 pb-5 pt-3 text-[13px] text-zinc-500">
                Хуваарьт пост алга. Постоо батлахад энд харагдана.
              </p>
            )}
            <ul className="mt-2 px-2 pb-3">
              {upcoming.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <div className="w-11 shrink-0 text-center">
                    <p className="text-[11px] uppercase text-zinc-400">
                      {WEEKDAYS_FULL[weekday(p.date)].slice(0, 3)}
                    </p>
                    <p className="text-lg font-semibold leading-tight text-zinc-900">{parseDate(p.date).d}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-800">{p.topic}</p>
                    <p className="text-xs text-zinc-500">{p.time}</p>
                  </div>
                  <PlatformIcons platforms={p.platforms} />
                </li>
              ))}
            </ul>
          </Card>

        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-1 xl:content-start">
          {/* Тогтмол байдал */}
          <Card className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-zinc-900">
                  Тогтмол байдал
                  <InfoTip label="Тогтмол байдал">
                    Багана бүр нэг 7 хоногт нийтэлсэн, төлөвлөсөн постын тоо. Тасархай зураас бол таны зорилго (7
                    хоногт {settings.postsPerWeek}).
                  </InfoTip>
                </h2>
                <p className="mt-0.5 text-[13px] text-zinc-500">7 хоног тутмын постын тоо</p>
              </div>
            </div>
            <div className="mt-5">
              <MiniBars data={weeklyPosts} goal={settings.postsPerWeek} />
            </div>
            <p className="mt-3 text-[13px] text-zinc-600">
              Энэ 7 хоногт <b className="text-zinc-900">{thisWeekCount}</b> / {settings.postsPerWeek} пост.
            </p>
          </Card>

          {/* Зөвлөгөө */}
          <Card className="p-5">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-amber-700">
              <IconBulb className="size-4" /> Өнөөдрийн зөвлөгөө
            </p>
            <p className="mt-2 text-sm leading-relaxed text-zinc-700">{tip.text}</p>
            <Link
              href={`/dashboard/guides${tip.href}`}
              className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-700 hover:underline"
            >
              Хичээлийг үзэх <IconArrowRight className="size-3.5" />
            </Link>
          </Card>
        </div>
      </div>

      {/* 2. Үр дүн — тоон үзүүлэлт, хүрэлт, boost */}
      <h2 className="mb-3 mt-10 text-lg font-medium tracking-[-0.02em] text-zinc-900">Үр дүн</h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {HAS_LIVE_STATS ? (
          <>
        <StatTile
          icon={IconEye}
          tone="brand"
          label="Хүрэлт · 7 хоног"
          tip={<TermTip term="Хүрэлт" />}
          value={formatNumber(reach7)}
          delta={reachChange}
          deltaLabel="өмнөх 7 хоногоос"
          spark={REACH_SERIES.slice(-14).map((r) => r.facebook + r.instagram)}
        />
        <StatTile
          icon={IconHeart}
          tone="rose"
          label="Идэвхийн хувь"
          tip={<TermTip term="Идэвхийн хувь" />}
          value={formatPercent(rate)}
          sub={
            <>

              · 14 хоног
            </>
          }
        />
        <StatTile
          icon={IconUsers}
          tone="indigo"
          label="Шинэ дагагч"
          tip={<TermTip term="Дагагч" />}
          value={`+${followers}`}
          sub={`FB +${NEW_FOLLOWERS_7D.facebook} · IG +${NEW_FOLLOWERS_7D.instagram} · 7 хоног`}
        />
          </>
        ) : (
          <Card className="col-span-2 flex gap-3 p-4 lg:col-span-3">
            <IconChip icon={IconEye} tone="brand" />
            <div>
              <p className="text-sm font-medium text-zinc-900">Хүрэлт, идэвх, дагагчийн статистик хараахан байхгүй</p>
              <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-500">
                Facebook, Instagram-ийн бодит статистикийг Meta-тай холбогдсоны дараа энд харуулна. Одоогоор тест горимд
                зохиомол тоо харуулахгүй.
              </p>
            </div>
          </Card>
        )}
        <Card className="p-4 transition-shadow duration-200 hover:shadow-card-hover">
          <div className="flex items-center gap-2.5">
            <IconChip icon={IconCalendar} tone="amber" />
            <p className="flex items-center gap-1 font-mono text-[10.5px] uppercase leading-tight tracking-[0.1em] text-zinc-500">
              Энэ сарын пост
              <InfoTip label="Сарын зорилго">
                Та 7 хоногт {settings.postsPerWeek} пост оруулахаар тохируулсан тул сард {goal} пост. Тохиргоо хэсгээс
                өөрчилнө.
              </InfoTip>
            </p>
          </div>
          <p className="mt-3 text-2xl font-medium leading-8 tracking-[-0.035em] text-zinc-900 tabular-nums sm:text-[28px]">
            {monthCount}
            <span className="text-base font-normal text-zinc-400"> / {goal}</span>
          </p>
          <Progress value={monthCount / goal} className="mt-2.5" />
          <p className="mt-1.5 text-xs text-zinc-500">
            {monthCount >= goal ? "Зорилгодоо хүрлээ 🎉" : `Зорилгод хүрэхэд ${goal - monthCount} пост дутуу`}
          </p>
        </Card>
      </div>


      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {HAS_LIVE_STATS && (
        <div className={topBoost ? "xl:col-span-2" : "xl:col-span-3"}>
          {/* Хүрэлт */}
          <Card>
            <CardHeader
              title="Хүрэлт — сүүлийн 14 хоног"
              description="Meta Graph API"
              action={
                <Link href="/dashboard/analytics" className="text-[13px] font-medium text-brand-700 hover:underline">
                  Дэлгэрэнгүй
                </Link>
              }
            />
            <div className="px-5 pb-5 pt-4">
              <Legend series={SERIES} />
              <div className="mt-4">
                <TrendChart data={REACH_SERIES.slice(-14)} series={SERIES} height={180} />
              </div>
            </div>
          </Card>
        </div>
        )}
        <div className="xl:content-start">
          {/* Boost зөвлөмж */}
          {topBoost && (
            <Card className="overflow-hidden">
              <div className="relative bg-ink p-5 text-white">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-[radial-gradient(closest-side,rgb(212_233_63/0.28),transparent)]"
                />
                <p className="relative flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-lime">
                  <IconRocket className="size-4" /> Boost зөвлөмж
                  <TermTip term="Boost" className="text-white/40 hover:text-white" />
                  {locked && <PlusBadge className="ml-auto" />}
                </p>
                {locked ? (
                  <>
                    <p className="relative mt-2.5 text-[17px] font-medium leading-snug tracking-[-0.015em]">
                      Аль постыг хэдэн төгрөгөөр boost хийвэл үр ашигтайг AI санал болгоно
                    </p>
                    <p className="relative mt-1 text-[13px] text-white/55">Plus багцад нээлттэй.</p>
                    <ButtonLink href="/dashboard/plan" size="sm" className="relative mt-4">
                      Plus-ийн тухай <IconArrowRight className="size-4" />
                    </ButtonLink>
                  </>
                ) : (
                  <>
                    <p className="relative mt-2.5 text-[17px] font-medium leading-snug tracking-[-0.015em]">
                      &ldquo;{topBoost.post.topic}&rdquo; постыг boost хийгээрэй
                    </p>
                    <p className="relative mt-1 text-[13px] text-white/55">{topBoost.reason}.</p>
                    <Button variant="primary" size="sm" className="relative mt-4" onClick={() => setBoost(topBoost)}>
                      {formatMoney(topBoost.budget)}-өөр boost хийх <IconArrowRight className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            </Card>
          )}

        </div>
      </div>

      {boost && <BoostModal post={boost.post} initialBudget={boost.budget} onClose={() => setBoost(null)} />}
      {viewing && (
        <EditPostModal
          key={viewing.id}
          post={viewing}
          onClose={() => setViewing(null)}
          saveLabel="Хадгалаад батлах"
          onSave={(patch) => {
            updatePost(viewing.id, { ...patch, status: "scheduled" });
            notify("Засаж, баталлаа");
          }}
        />
      )}
    </>
  );
}
