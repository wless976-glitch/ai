"use client";

import { useEffect, useState, type ReactNode } from "react";
import { IconCheck, IconInfo, IconSparkles, IconX } from "@/components/icons";
import { PlusBadge } from "@/components/plus";
import { Card, CardHeader, cn, MonoLabel, PageHeader, Progress } from "@/components/ui";
import { fetchPlanUsage } from "@/lib/ai-client";
import { planPostCount } from "@/lib/analytics";
import { useToday } from "@/lib/today";
import { formatMoney } from "@/lib/format";
import { FREE_DAILY, MONTHLY_POSTS, PLAN_LABELS, PLUS_PRICE, QUOTA_LABELS, type PlanUsage, type Quota } from "@/lib/plan";
import { useStore } from "@/lib/store";
import { usePlan } from "@/lib/use-plan";

/** [боломж, Үнэгүй, Plus] — true = байгаа, false = байхгүй, текст = хязгаар */
const ROWS: [string, ReactNode, ReactNode][] = [
  ["AI-аас асуух", `Өдөрт ${FREE_DAILY.ask}`, "Хязгааргүй"],
  ["AI текст (пост, студи)", `Өдөрт ${FREE_DAILY.text}`, "Хязгааргүй"],
  ["Зураг → Текст", `Өдөрт ${FREE_DAILY.vision}`, "Хязгааргүй"],
  ["Текст → Зураг, Зураг → Зураг", false, true],
  ["Текст → Видео", false, true],
  ["Сард нийтлэх пост", `${MONTHLY_POSTS.free}`, `${MONTHLY_POSTS.plus}`],
  ["Платформ", "Нэг удаад нэг", "Facebook + Instagram зэрэг"],
  ["Пост бүрийн статистик, Boost зөвлөмж", false, true],
  ["Батлах, хуанли, заавар, тохиргоо", true, true],
];

export function PlanView() {
  const { posts } = useStore();
  const { plan, isPlus, isLoaded, monthlyPosts } = usePlan();
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const today = useToday();
  const monthCount = planPostCount(posts, today);

  useEffect(() => {
    if (!isLoaded) return;
    let alive = true;
    fetchPlanUsage()
      .then((u) => alive && setUsage(u))
      .catch(() => alive && setUsage(null));
    return () => {
      alive = false;
    };
  }, [isLoaded, plan]);

  return (
    <>
      <PageHeader
        title="Багц"
        description="Үнэгүй багцаар өдөр тутмын ажлаа хийнэ. Plus нь зураг, видео үүсгэх, илүү олон пост, дэлгэрэнгүй статистиктай."
      />

      {/* Одоогийн багц ба хэрэглээ */}
      <Card className="mb-6">
        <CardHeader
          icon={IconSparkles}
          title={
            <span className="flex items-center gap-2">
              Таны багц: {isLoaded ? PLAN_LABELS[plan] : "…"}
              {isPlus && <PlusBadge />}
            </span>
          }
          description={isPlus ? "Бүх боломж нээлттэй, AI хязгааргүй." : "Хязгаар нь өдөр бүр шөнө 00:00-д (Улаанбаатарын цагаар) шинэчлэгдэнэ."}
        />
        <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2">
          <Meter label="Энэ сард таны бэлдсэн пост" used={monthCount} limit={monthlyPosts} />
          {(Object.keys(FREE_DAILY) as Quota[]).map((q) =>
            isPlus ? (
              <Meter key={q} label={`${QUOTA_LABELS[q]} · өнөөдөр`} used={null} limit={null} />
            ) : (
              <Meter key={q} label={`${QUOTA_LABELS[q]} · өнөөдөр`} used={usage?.used[q] ?? null} limit={FREE_DAILY[q]} />
            ),
          )}
        </div>
      </Card>

      {/* Харьцуулалт */}
      <div className="grid gap-4 md:grid-cols-2">
        <PlanCard
          name={PLAN_LABELS.free}
          price="₮0"
          note="Дөнгөж эхэлж буй бизнест"
          current={isLoaded && !isPlus}
          column={1}
        />
        <PlanCard
          name={PLAN_LABELS.plus}
          price={`${formatMoney(PLUS_PRICE)} / сар`}
          note="Тогтмол өсөлт хүсэж буй бизнест"
          current={isPlus}
          column={2}
          dark
        >
          {!isPlus && isLoaded && (
            <p className="mt-5 flex gap-2 rounded-xl bg-white/[0.06] p-3 text-[13px] leading-relaxed text-white/70 ring-1 ring-inset ring-white/10">
              <IconInfo className="mt-0.5 size-4 shrink-0 text-lime" />
              Тест горимд төлбөрийн систем холбогдоогүй. Plus-ийг админ “Хэрэглэгчид” хуудаснаас олгоно.
            </p>
          )}
        </PlanCard>
      </div>
    </>
  );
}

function Meter({ label, used, limit }: { label: string; used: number | null; limit: number | null }) {
  const over = limit !== null && used !== null && used >= limit;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-zinc-600">{label}</span>
        <span className={cn("tabular-nums", over ? "font-medium text-rose-600" : "text-zinc-900")}>
          {limit === null ? "Хязгааргүй" : `${used ?? "—"} / ${limit}`}
        </span>
      </div>
      <Progress value={limit === null ? 1 : (used ?? 0) / limit} tone={over ? "amber" : "brand"} />
    </div>
  );
}

function PlanCard({
  name,
  price,
  note,
  current,
  column,
  dark,
  children,
}: {
  name: string;
  price: string;
  note: string;
  current: boolean;
  column: 1 | 2;
  dark?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-6 ring-1",
        dark ? "bg-ink text-white ring-white/10" : "bg-surface text-zinc-900 shadow-card ring-zinc-900/[0.07]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-medium tracking-[-0.02em]">
            {name} {dark && <PlusBadge />}
          </p>
          <p className={cn("mt-0.5 text-[13px]", dark ? "text-white/50" : "text-zinc-500")}>{note}</p>
        </div>
        {current && (
          <MonoLabel
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px]",
              dark ? "bg-lime text-ink" : "bg-zinc-900 text-zinc-50",
            )}
          >
            Одоогийн
          </MonoLabel>
        )}
      </div>
      <p className="mt-4 text-[28px] font-medium tabular-nums tracking-[-0.035em]">{price}</p>
      <ul className={cn("mt-5 space-y-2.5 border-t border-dashed pt-5 text-sm", dark ? "border-white/15" : "border-zinc-900/15")}>
        {ROWS.map(([label, ...values]) => {
          const v = values[column - 1];
          return (
            <li key={label} className="flex items-start gap-2.5">
              {v === false ? (
                <IconX className={cn("mt-0.5 size-4 shrink-0", dark ? "text-white/25" : "text-zinc-300")} />
              ) : (
                <IconCheck className={cn("mt-0.5 size-4 shrink-0", dark ? "text-lime" : "text-brand-600")} />
              )}
              <span className={cn("flex-1", v === false && (dark ? "text-white/35" : "text-zinc-400"))}>{label}</span>
              {typeof v === "string" && (
                <span className={cn("shrink-0 text-right tabular-nums", dark ? "text-white/70" : "text-zinc-500")}>{v}</span>
              )}
            </li>
          );
        })}
      </ul>
      {children}
    </div>
  );
}
