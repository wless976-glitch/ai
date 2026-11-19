"use client";

import { useState } from "react";
import {
  IconBook,
  IconBulb,
  IconCheck,
  IconChevronDown,
  IconFacebook,
  IconInstagram,
  IconMessage,
  IconRocket,
  IconSparkles,
} from "@/components/icons";
import { Badge, Button, Card, PageHeader, Progress, cn } from "@/components/ui";
import { GLOSSARY, GUIDES } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { GUIDE_CATEGORY_LABELS, type GuideCategory } from "@/lib/types";

const CATEGORY_ICON: Record<GuideCategory, typeof IconBook> = {
  start: IconSparkles,
  facebook: IconFacebook,
  instagram: IconInstagram,
  content: IconBulb,
  boost: IconRocket,
};
const CATEGORY_COLOR: Record<GuideCategory, string> = {
  start: "bg-brand-50 text-brand-600",
  facebook: "bg-blue-50 text-fb",
  instagram: "bg-pink-50 text-ig",
  content: "bg-amber-50 text-amber-600",
  boost: "bg-violet-50 text-violet-600",
};

export function GuidesView() {
  const { readGuides, toggleGuideRead, notify } = useStore();
  const [category, setCategory] = useState<GuideCategory | "all">("all");
  const [openId, setOpenId] = useState<string | null>(GUIDES[1].id);

  const list = category === "all" ? GUIDES : GUIDES.filter((g) => g.category === category);
  const done = GUIDES.filter((g) => readGuides.includes(g.id)).length;

  return (
    <>
      <PageHeader
        title="Заавар"
        description="Facebook, Instagram-ийг сайн мэдэхгүй ч болно. Алхам алхмаар энгийн заавар, нэр томьёоны тайлбар."
      />

      <Card className="mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <IconBook className="size-6" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-zinc-900">
            Таны ахиц: {done} / {GUIDES.length} заавар
          </p>
          <Progress value={done / GUIDES.length} className="mt-2 max-w-md" />
        </div>
        <p className="text-[13px] text-zinc-500 sm:max-w-56 sm:text-right">
          Бүгдийг уншвал сошиал маркетингийн үндсийг бүрэн эзэмшинэ 💪
        </p>
      </Card>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["all", ...Object.keys(GUIDE_CATEGORY_LABELS)] as (GuideCategory | "all")[]).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn(
              "cursor-pointer rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors",
              category === c ? "bg-zinc-900 text-zinc-50" : "bg-surface text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-50",
            )}
          >
            {c === "all" ? "Бүгд" : GUIDE_CATEGORY_LABELS[c]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-3">
          {list.map((g) => {
            const Icon = CATEGORY_ICON[g.category];
            const isOpen = openId === g.id;
            const isRead = readGuides.includes(g.id);
            return (
              <Card key={g.id} className={cn("overflow-hidden transition", isOpen && "ring-zinc-300")}>
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : g.id)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center gap-3.5 p-4 text-left"
                >
                  <span
                    className={cn(
                      "flex size-10 shrink-0 items-center justify-center rounded-xl",
                      CATEGORY_COLOR[g.category],
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900">{g.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {GUIDE_CATEGORY_LABELS[g.category]} · {g.minutes} мин · {g.steps.length} алхам
                    </p>
                  </div>
                  {isRead && (
                    <Badge tone="emerald" className="max-sm:hidden">
                      <IconCheck className="size-3" /> Уншсан
                    </Badge>
                  )}
                  <IconChevronDown className={cn("size-5 shrink-0 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="border-t border-zinc-100 px-4 pb-5 pt-4 sm:pl-[70px]">
                    <p className="text-sm text-zinc-600">{g.summary}</p>
                    <ol className="mt-4 space-y-3">
                      {g.steps.map((s, i) => (
                        <li key={s} className="flex gap-3 text-sm leading-relaxed text-zinc-800">
                          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-zinc-50">
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{s}</span>
                        </li>
                      ))}
                    </ol>
                    {g.tip && (
                      <p className="mt-4 flex gap-2 rounded-lg bg-amber-50 p-3 text-[13px] text-amber-900">
                        <IconBulb className="mt-px size-4 shrink-0" /> {g.tip}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant={isRead ? "secondary" : "primary"}
                      className="mt-4"
                      onClick={() => {
                        toggleGuideRead(g.id);
                        if (!isRead) notify("Сайн байна! Дараагийн заавар руу орцгооё");
                      }}
                    >
                      <IconCheck className="size-4" /> {isRead ? "Уншаагүй болгох" : "Уншсан гэж тэмдэглэх"}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="font-semibold text-zinc-900">Нэр томьёоны тайлбар</h2>
            <p className="mt-0.5 text-[13px] text-zinc-500">Статистик дээр гардаг үгс</p>
            <dl className="mt-4 space-y-3.5">
              {GLOSSARY.map((t) => (
                <div key={t.term}>
                  <dt className="text-sm font-medium text-zinc-900">
                    {t.term} <span className="font-normal text-zinc-400">· {t.en}</span>
                  </dt>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-zinc-600">{t.text}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card className="p-5">
            <p className="flex items-center gap-2 font-semibold text-zinc-900">
              <IconMessage className="size-[18px] text-brand-600" /> Тусламж хэрэгтэй юу?
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Манай баг Page нээх, аккаунт холбоход тань үнэгүй тусална.
            </p>
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => notify("Тест горим: чат одоогоор холбогдоогүй", "info")}
            >
              Чатаар асуух
            </Button>
          </Card>
        </div>
      </div>
    </>
  );
}
