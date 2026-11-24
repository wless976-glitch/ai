"use client";

import { useState } from "react";
import Link from "next/link";
import type { PublishedPost } from "@/lib/analytics";
import { engagementRate, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { useStore } from "@/lib/store";
import { IconArrowRight, IconFlask, IconWallet } from "./icons";
import { Modal } from "./modal";
import { PostVisual } from "./post-visual";
import { Button, Field, inputClass, PlatformIcons, Segmented } from "./ui";

const GOALS = [
  { value: "reach", label: "Олон хүнд хүрэх" },
  { value: "messages", label: "Мессеж авах" },
  { value: "follow", label: "Дагагч нэмэх" },
] as const;

export function BoostModal({
  post,
  initialBudget = 30000,
  onClose,
}: {
  post: PublishedPost;
  initialBudget?: number;
  onClose: () => void;
}) {
  const { updatePost, notify } = useStore();
  const [budget, setBudget] = useState(initialBudget);
  const [days, setDays] = useState<"3" | "5" | "7">("5");
  const [goal, setGoal] = useState<(typeof GOALS)[number]["value"]>("reach");
  const [location, setLocation] = useState("ub");
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(45);

  const perDay = Math.round(budget / Number(days) / 100) * 100;

  function start() {
    updatePost(post.id, { boosted: true });
    notify(`Boost эхэллээ (тест) — ${formatMoney(budget)}, ${days} хоног. Бодит төлбөр хийгдээгүй.`, "info");
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Постыг boost хийх"
      description="Постоо төлбөртэйгөөр илүү олон хүнд хүргэнэ."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Болих
          </Button>
          <Button onClick={start}>Boost эхлүүлэх · {formatMoney(budget)}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex gap-3 rounded-xl bg-zinc-50 p-3 ring-1 ring-zinc-200/70">
          <PostVisual visual={post.visual} size="sm" className="size-16 shrink-0 rounded-lg" />
          <div className="min-w-0 text-sm">
            <p className="flex items-center gap-2 font-medium text-zinc-900">
              {post.topic} <PlatformIcons platforms={post.platforms} />
            </p>
            <p className="mt-0.5 line-clamp-1 text-zinc-500">{post.caption}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Хүрэлт {formatNumber(post.stats.reach)} · Идэвхийн хувь{" "}
              <span className="font-semibold text-emerald-600">{formatPercent(engagementRate(post.stats))}</span>
            </p>
          </div>
        </div>

        <Field label="Зорилго">
          <Segmented value={goal} onChange={setGoal} options={GOALS.map((g) => ({ value: g.value, label: g.label }))} />
        </Field>

        <Field label={`Нийт төсөв: ${formatMoney(budget)}`} htmlFor="boost-budget">
          <input
            id="boost-budget"
            type="range"
            min={10000}
            max={200000}
            step={5000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="w-full accent-brand-600"
          />
          <div className="flex justify-between text-xs text-zinc-400">
            <span>₮10,000</span>
            <span>₮200,000</span>
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Хугацаа">
            <Segmented
              value={days}
              onChange={setDays}
              options={[
                { value: "3", label: "3 хоног" },
                { value: "5", label: "5 хоног" },
                { value: "7", label: "7 хоног" },
              ]}
            />
          </Field>
          <Field label="Байршил" htmlFor="boost-location">
            <select
              id="boost-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
            >
              <option value="ub">Улаанбаатар</option>
              <option value="mongolia">Бүх Монгол</option>
              <option value="near">Миний байршлаас 5 км</option>
            </select>
          </Field>
        </div>

        <Field label={`Нас: ${ageMin} – ${ageMax}`}>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={13}
              max={65}
              value={ageMin}
              aria-label="Доод нас"
              onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax - 1))}
              className="w-full accent-brand-600"
            />
            <input
              type="range"
              min={14}
              max={65}
              value={ageMax}
              aria-label="Дээд нас"
              onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin + 1))}
              className="w-full accent-brand-600"
            />
          </div>
        </Field>

        <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-200/70">
          <p className="flex items-center gap-2 text-sm font-medium text-brand-800">
            <IconWallet className="size-4" /> Өдрийн төсөв
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            ≈ {formatMoney(perDay)} <span className="text-base font-normal">/ өдөр</span>
          </p>
          <p className="mt-0.5 text-[13px] text-zinc-600">
            Хэдэн хүнд хүрэхийг Meta урьдчилан хэлдэг бөгөөд үзэгч, улирлаас хамаарна.{" "}
            <Link href="/dashboard/guides#m=boost&l=bo-budget" className="font-medium text-brand-700 hover:underline">
              Өөрийн CPM-ээр тооцоолох <IconArrowRight className="inline size-3.5" />
            </Link>
          </p>
        </div>

        <p className="flex items-start gap-2 text-xs text-zinc-500">
          <IconFlask className="mt-px size-4 shrink-0 text-amber-500" />
          Тест горим: бодит төлбөр, Meta Ads дуудлага хийгдэхгүй.
        </p>
      </div>
    </Modal>
  );
}
