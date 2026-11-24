"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { IconArrowRight, IconCheck, IconRocket, IconX } from "./icons";
import { ButtonLink, Card, cn } from "./ui";


/**
 * Шинэ хэрэглэгчийг "юунаас эхлэх вэ?" гэдэгт хөтөлнө.
 * Алхам бүр хэрэглэгчийн бодит үйлдлээс (өгөгдлөөс) автоматаар "хийгдсэн" болно.
 */
export function GettingStarted() {
  const { posts, business, connections, readGuides, onboardingHidden, setOnboardingHidden } = useStore();

  const steps = [
    {
      id: "business",
      title: "Бизнесийнхээ тухай бичих",
      description: "Юу зардаг, хэн таны хэрэглэгч вэ гэдгийг бичвэл AI яг танд тохирсон пост бичнэ.",
      href: "/dashboard/settings",
      cta: "Мэдээлэл оруулах",
      done: business.name.trim().length > 0 && business.description.trim().length >= 20,
    },
    {
      id: "connect",
      title: "Facebook, Instagram-аа холбох",
      description: "Холбосны дараа батласан пост тань хуваарийн дагуу автоматаар нийтлэгдэнэ.",
      href: "/dashboard/settings",
      cta: "Холбох",
      done: connections.facebook || connections.instagram,
    },
    {
      id: "create",
      title: "Анхны постоо бэлдэх",
      description: "Юуны тухай пост хийхээ нэг өгүүлбэрээр бичихэд AI 3 өөр хувилбар санал болгоно.",
      href: "/dashboard/create",
      cta: "Пост бэлдэх",
      done: posts.length > 0,
    },
    {
      id: "approve",
      title: "Постоо шалгаж батлах",
      description: "Таны батласан пост л нийтлэгдэнэ. Хүссэнээрээ засаж, цагийг нь сольж болно.",
      href: "/dashboard#pending",
      cta: "Батлах руу очих",
      done: posts.some((p) => p.status === "scheduled" || p.status === "published"),
    },
    {
      id: "learn",
      title: "Сургалтаас эхний хичээлээ үзэх",
      description: "Маркетинг, boost, татварын үндсийг алхам алхмаар, жишээтэй сурна.",
      href: "/dashboard/guides",
      cta: "Сургалт эхлэх",
      done: readGuides.length > 0,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const nextIndex = steps.findIndex((s) => !s.done);
  if (onboardingHidden || nextIndex === -1) return null;
  const next = steps[nextIndex];

  return (
    <Card className="fade-up mb-6 overflow-hidden">
      <div className="flex items-start gap-3 px-5 pt-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-lime text-ink">
          <IconRocket className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold text-zinc-900">Эхлэх алхмууд</h2>
          <p className="text-[13px] text-zinc-500">5 энгийн алхмаар сошиал маркетингаа тогтмол болгоно.</p>
          <div className="mt-2 flex items-center gap-2.5">
            <div
              className="h-1.5 w-28 overflow-hidden rounded-full bg-zinc-900/[0.06]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={steps.length}
              aria-valuenow={doneCount}
              aria-label="Эхлэх алхмуудын явц"
            >
              <div
                className="h-full rounded-full bg-linear-to-r from-brand-400 to-lime transition-all"
                style={{ width: `${(doneCount / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-xs font-medium tabular-nums text-zinc-600">
              {doneCount}/{steps.length} хийгдсэн
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOnboardingHidden(true)}
          aria-label="Эхлэх алхмуудыг нуух"
          title="Нуух"
          className="-mr-1.5 -mt-1 cursor-pointer rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
        >
          <IconX className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[1fr_1.1fr]">
        {/* Дараагийн алхам — нэг л тодорхой үйлдэл */}
        <div className="flex flex-col rounded-xl bg-brand-50/70 p-4 ring-1 ring-brand-200/60">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Дараагийн алхам · {nextIndex + 1}
          </p>
          <p className="mt-1.5 text-base font-semibold text-zinc-900">{next.title}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-600">{next.description}</p>
          <div className="mt-auto pt-4">
            <ButtonLink href={next.href} size="sm">
              {next.cta} <IconArrowRight className="size-4" />
            </ButtonLink>
          </div>
        </div>

        <ol className="space-y-1">
          {steps.map((s, i) => {
            const current = i === nextIndex;
            return (
              <li key={s.id}>
                <Link
                  href={s.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-zinc-50",
                    current && "bg-zinc-50",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      s.done
                        ? "bg-emerald-500 text-white"
                        : current
                          ? "bg-ink text-lime"
                          : "bg-surface text-zinc-500 ring-1 ring-zinc-300",
                    )}
                  >
                    {s.done ? <IconCheck className="size-3.5" /> : i + 1}
                  </span>
                  <span
                    className={cn(
                      "flex-1",
                      s.done ? "text-zinc-400 line-through decoration-zinc-300" : "font-medium text-zinc-800",
                    )}
                  >
                    {s.title}
                  </span>
                  {s.done && <span className="sr-only">(хийгдсэн)</span>}
                  {current && <IconArrowRight className="size-4 text-brand-600" />}
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </Card>
  );
}
