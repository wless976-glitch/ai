"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useSyncExternalStore, type ComponentType, type SVGProps } from "react";
import { LessonBody } from "@/components/academy/lesson-body";
import { Quiz } from "@/components/academy/quiz";
import { RichText } from "@/components/academy/rich-text";
import { ToolCard } from "@/components/academy/tools";
import {
  IconArrowRight,
  IconBook,
  IconBulb,
  IconCalendar,
  IconChart,
  IconCheck,
  IconCheckCircle,
  IconChevronDown,
  IconChevronLeft,
  IconClock,
  IconFacebook,
  IconFlame,
  IconInstagram,
  IconLink,
  IconMessage,
  IconPencil,
  IconRocket,
  IconSearch,
  IconShield,
  IconSparkles,
  IconTarget,
  IconWallet,
} from "@/components/icons";
import { Badge, Button, Card, cn, inputClass, PageHeader, Progress, Segmented } from "@/components/ui";
import {
  ALL_LESSONS,
  GLOSSARY,
  MODULES,
  PASS_RATE,
  QUIZ_MODULES,
  RESOURCES,
  TOTAL_MINUTES,
  findModule,
  nextUnread,
  type GlossaryTerm,
  type Lesson,
  type Module,
  type ModuleIcon,
  type ModuleTone,
} from "@/lib/academy";
import { prefillAsk } from "@/lib/ask-history";
import { useStore } from "@/lib/store";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const ICONS: Record<ModuleIcon, Icon> = {
  sparkles: IconSparkles,
  target: IconTarget,
  shield: IconShield,
  wallet: IconWallet,
  bulb: IconBulb,
  facebook: IconFacebook,
  instagram: IconInstagram,
  rocket: IconRocket,
  chart: IconChart,
  message: IconMessage,
  calendar: IconCalendar,
  book: IconBook,
};

const TONES: Record<ModuleTone, string> = {
  brand: "bg-brand-50 text-brand-600 ring-brand-200/60",
  blue: "bg-blue-50 text-fb ring-blue-200/60",
  pink: "bg-pink-50 text-ig ring-pink-200/60",
  amber: "bg-amber-50 text-amber-600 ring-amber-200/60",
  violet: "bg-violet-50 text-violet-600 ring-violet-200/60",
  emerald: "bg-emerald-50 text-emerald-600 ring-emerald-200/60",
  rose: "bg-rose-50 text-rose-600 ring-rose-200/60",
  sky: "bg-sky-50 text-sky-600 ring-sky-200/60",
};

/* ---------------- Hash-аар чиглүүлэх: #m=boost&l=bo-budget, #tab=tools ---------------- */

type Route = { m?: string; l?: string; tab?: string };

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  window.addEventListener("popstate", cb);
  return () => {
    window.removeEventListener("hashchange", cb);
    window.removeEventListener("popstate", cb);
  };
}

function useRoute(): Route {
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash, () => "");
  return useMemo(() => Object.fromEntries(new URLSearchParams(hash.replace(/^#/, ""))) as Route, [hash]);
}

/** Хуудас солигдохгүй, зөвхөн hash солино — browser-ийн "Буцах" товч ажиллана */
function go(route: Route | null) {
  const clean = Object.fromEntries(Object.entries(route ?? {}).filter(([, v]) => v)) as Record<string, string>;
  const qs = new URLSearchParams(clean).toString();
  const hash = qs ? `#${qs}` : "";
  if (hash !== window.location.hash) {
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
  window.scrollTo({ top: 0 });
}

const formatHours = (min: number) => (min >= 60 ? `${Math.floor(min / 60)} цаг ${min % 60} мин` : `${min} мин`);

/* ---------------- Үндсэн хуудас ---------------- */

export function GuidesView() {
  const route = useRoute();
  const mod = findModule(route.m);
  if (mod) return <ModuleView key={mod.id} module={mod} lessonId={route.l} />;
  return <Overview tab={route.tab} />;
}

type Tab = "lessons" | "tools" | "glossary" | "resources";
const TABS: { value: Tab; label: string }[] = [
  { value: "lessons", label: "Хичээлүүд" },
  { value: "tools", label: "Тооцоолуур" },
  { value: "glossary", label: "Нэр томьёо" },
  { value: "resources", label: "Эх сурвалж" },
];

function Overview({ tab: rawTab }: { tab?: string }) {
  const { readGuides, quizScores } = useStore();
  const tab: Tab = TABS.some((t) => t.value === rawTab) ? (rawTab as Tab) : "lessons";

  const done = ALL_LESSONS.filter(({ lesson }) => readGuides.includes(lesson.id)).length;
  const passed = QUIZ_MODULES.filter((m) => (quizScores[m.id] ?? 0) >= PASS_RATE).length;
  const next = nextUnread(readGuides);

  return (
    <>
      <PageHeader
        title="Сургалт"
        description="Жижиг, дунд бизнес эрхлэгчдэд зориулсан бүтэн сургалт: бизнесийн суурь, маркетинг, Facebook, Instagram, boost ба зар, борлуулалт, хууль, татвар. Алхам алхмаар, жишээ, дасгал, шалгалттай."
        actions={
          next && (
            <Button onClick={() => go({ m: next.module.id, l: next.lesson.id })}>
              {done > 1 ? "Үргэлжлүүлэх" : "Эхлэх"} <IconArrowRight className="size-4" />
            </Button>
          )
        }
      />

      <Card className="mb-6 grid grid-cols-1 gap-5 p-5 sm:grid-cols-[1fr_auto_auto] sm:items-center">
        <div>
          <p className="font-medium text-zinc-900">
            Таны ахиц: {done} / {ALL_LESSONS.length} хичээл
          </p>
          <Progress value={done / ALL_LESSONS.length} className="mt-2 max-w-md" />
          {next && (
            <p className="mt-2 text-[13px] text-zinc-500">
              Дараагийнх: <span className="text-zinc-700">{next.lesson.title}</span>
            </p>
          )}
        </div>
        <div className="flex gap-6 sm:border-l sm:border-zinc-900/[0.07] sm:pl-6">
          <MiniStat label="Модуль" value={String(MODULES.length)} />
          <MiniStat label="Шалгалт тэнцсэн" value={`${passed}/${QUIZ_MODULES.length}`} />
          <MiniStat label="Нийт хугацаа" value={`~${Math.round(TOTAL_MINUTES / 60)} цаг`} />
        </div>
      </Card>

      <Segmented<Tab> value={tab} onChange={(t) => go(t === "lessons" ? null : { tab: t })} options={TABS} className="mb-5" />

      {tab === "lessons" && <ModuleGrid />}
      {tab === "tools" && (
        <div className="grid grid-cols-1 gap-5">
          <ToolCard tool="boost" />
          <ToolCard tool="breakeven" />
          <ToolCard tool="tax" />
        </div>
      )}
      {tab === "glossary" && <Glossary />}
      {tab === "resources" && <Resources />}
    </>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[12px] text-zinc-500">{label}</p>
      <p className="mt-0.5 text-[18px] font-semibold tabular-nums tracking-[-0.01em] text-zinc-900">{value}</p>
    </div>
  );
}

function ModuleGrid() {
  const { readGuides, quizScores } = useStore();
  return (
    <>
      <button
        type="button"
        onClick={() => go({ m: "tax", l: "tx-cit" })}
        className="mb-5 flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-rose-50 p-4 text-left ring-1 ring-inset ring-rose-200/70 transition hover:ring-rose-300"
      >
        <IconFlame className="mt-0.5 size-5 shrink-0 text-rose-600" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-rose-900">2027 оны 1-р сарын 1-нээс татвар өөрчлөгдөнө</span>
          <span className="mt-0.5 block text-[13px] text-rose-800/80">
            НӨАТ-ын босго ₮50 саяас ₮400 сая, 1%-ийн хөнгөлөлтийн босго ₮2.5 тэрбум болно. Бизнест тань юу өөрчлөгдөхийг үзээрэй.
          </span>
        </span>
        <IconArrowRight className="mt-0.5 size-4 shrink-0 text-rose-600" />
      </button>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MODULES.map((m, i) => {
          const Icon = ICONS[m.icon];
          const read = m.lessons.filter((l) => readGuides.includes(l.id)).length;
          const minutes = m.lessons.reduce((n, l) => n + l.minutes, 0);
          const score = quizScores[m.id];
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => go({ m: m.id })}
              className="group flex cursor-pointer flex-col rounded-2xl bg-surface p-5 text-left shadow-card ring-1 ring-zinc-900/[0.07] transition hover:-translate-y-px hover:ring-zinc-900/15 focus-visible:outline-2 focus-visible:outline-brand-500"
            >
              <div className="flex items-start justify-between gap-3">
                <span className={cn("flex size-11 items-center justify-center rounded-xl ring-1 ring-inset", TONES[m.tone])}>
                  <Icon className="size-5" />
                </span>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Badge>{m.level}</Badge>
                  {score !== undefined && score >= PASS_RATE && (
                    <Badge tone="emerald">
                      <IconCheck className="size-3" /> Тэнцсэн
                    </Badge>
                  )}
                </div>
              </div>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">Модуль {i + 1}</p>
              <h3 className="mt-1 text-[16px] font-medium tracking-[-0.01em] text-zinc-900">{m.title}</h3>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-zinc-500">{m.short}</p>
              <div className="mt-4 flex items-center justify-between text-[12px] text-zinc-500">
                <span>
                  {m.lessons.length} хичээл · {formatHours(minutes)}
                  {m.quiz.length > 0 && " · шалгалт"}
                </span>
                <span className="tabular-nums">
                  {read}/{m.lessons.length}
                </span>
              </div>
              <Progress value={read / m.lessons.length} className="mt-2 h-1.5" />
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------------- Модуль ба хичээл ---------------- */

function ModuleView({ module, lessonId }: { module: Module; lessonId?: string }) {
  const { readGuides, quizScores } = useStore();
  const index = MODULES.indexOf(module);
  const nextModule = MODULES[index + 1];
  const isQuiz = lessonId === "quiz" && module.quiz.length > 0;
  const lesson =
    module.lessons.find((l) => l.id === lessonId) ??
    module.lessons.find((l) => !readGuides.includes(l.id)) ??
    module.lessons[0];
  const read = module.lessons.filter((l) => readGuides.includes(l.id)).length;
  const score = quizScores[module.id];

  const list = (
    <nav aria-label="Хичээлүүд" className="space-y-0.5">
      {module.lessons.map((l, i) => {
        const active = !isQuiz && l.id === lesson.id;
        const isRead = readGuides.includes(l.id);
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => go({ m: module.id, l: l.id })}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex w-full cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition",
              active ? "bg-zinc-900 text-zinc-50" : "text-zinc-700 hover:bg-zinc-900/[0.04]",
            )}
          >
            <span
              className={cn(
                "mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                isRead ? "bg-emerald-500 text-white" : active ? "bg-lime text-ink" : "bg-zinc-900/[0.07] text-zinc-500",
              )}
            >
              {isRead ? <IconCheck className="size-3" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1 leading-snug">{l.title}</span>
          </button>
        );
      })}
      {module.quiz.length > 0 && (
        <button
          type="button"
          onClick={() => go({ m: module.id, l: "quiz" })}
          aria-current={isQuiz ? "page" : undefined}
          className={cn(
            "flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[13.5px] transition",
            isQuiz ? "bg-zinc-900 text-zinc-50" : "text-zinc-700 hover:bg-zinc-900/[0.04]",
          )}
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full",
              score !== undefined && score >= PASS_RATE ? "bg-emerald-500 text-white" : "bg-violet-100 text-violet-700",
            )}
          >
            <IconPencil className="size-3" />
          </span>
          <span className="flex-1">Шалгалт</span>
          {score !== undefined && <span className="text-[12px] tabular-nums opacity-70">{Math.round(score * 100)}%</span>}
        </button>
      )}
    </nav>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => go(null)}
        className="mb-4 inline-flex cursor-pointer items-center gap-1 text-[13px] font-medium text-zinc-500 hover:text-zinc-900"
      >
        <IconChevronLeft className="size-4" /> Бүх модуль
      </button>

      <div className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
          Модуль {index + 1} / {MODULES.length} · {module.level}
        </p>
        <h1 className="mt-1 text-[26px] font-medium leading-tight tracking-[-0.035em] text-zinc-900 sm:text-[30px]">{module.title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">{module.short}</p>
        <div className="mt-3 flex max-w-md items-center gap-3">
          <Progress value={read / module.lessons.length} className="flex-1" />
          <span className="text-[12px] tabular-nums text-zinc-500">
            {read}/{module.lessons.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          {/* Том дэлгэцэнд хажууд наалттай, жижиг дэлгэцэнд нээгддэг жагсаалт */}
          <Card className="sticky top-6 hidden p-2 lg:block">{list}</Card>
          <details className="group rounded-2xl bg-surface shadow-card ring-1 ring-zinc-900/[0.07] lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-zinc-900">
              Хичээлүүд ({read}/{module.lessons.length})
              <IconChevronDown className="size-4 text-zinc-400 transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-zinc-900/[0.06] p-2">{list}</div>
          </details>
        </aside>

        <Card className="min-w-0 p-5 sm:p-8">
          {isQuiz ? (
            <Quiz
              key={module.id}
              module={module}
              onNext={nextModule ? () => go({ m: nextModule.id }) : undefined}
            />
          ) : (
            <LessonView key={lesson.id} module={module} lesson={lesson} nextModule={nextModule} />
          )}
        </Card>
      </div>
    </>
  );
}

function LessonView({ module, lesson, nextModule }: { module: Module; lesson: Lesson; nextModule?: Module }) {
  const router = useRouter();
  const { readGuides, toggleGuideRead, markGuideRead, notify } = useStore();
  const i = module.lessons.indexOf(lesson);
  const prev = module.lessons[i - 1];
  const next = module.lessons[i + 1];
  const isRead = readGuides.includes(lesson.id);

  /** Дараагийн алхам: модулийн дараагийн хичээл → шалгалт → дараагийн модуль */
  const nextStep = next
    ? { label: "Дараагийн хичээл", route: { m: module.id, l: next.id } }
    : module.quiz.length > 0
      ? { label: "Шалгалт өгөх", route: { m: module.id, l: "quiz" } }
      : nextModule
        ? { label: "Дараагийн модуль", route: { m: nextModule.id } }
        : null;

  function finish() {
    if (!isRead) {
      markGuideRead(lesson.id);
      notify("Сайн байна! Хичээл дууслаа");
    }
    if (nextStep) go(nextStep.route);
  }

  function ask(question: string) {
    prefillAsk(question);
    router.push("/dashboard/ask");
  }

  return (
    <article>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-zinc-500">
        <span>
          Хичээл {i + 1} / {module.lessons.length}
        </span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1">
          <IconClock className="size-3.5" /> {lesson.minutes} мин
        </span>
        {lesson.checked && <Badge tone="sky">Мэдээллийг шалгасан: {lesson.checked}</Badge>}
        {isRead && (
          <Badge tone="emerald">
            <IconCheck className="size-3" /> Уншсан
          </Badge>
        )}
      </div>
      <h2 className="mt-2 text-[24px] font-medium leading-tight tracking-[-0.025em] text-zinc-900 sm:text-[28px]">{lesson.title}</h2>
      <p className="mt-2 text-[15.5px] leading-relaxed text-zinc-600">
        <RichText text={lesson.summary} />
      </p>

      <div className="mt-6">
        <LessonBody blocks={lesson.blocks} />
      </div>

      {lesson.task && (
        <div className="mt-6 flex gap-3 rounded-xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-200/70">
          <IconCheckCircle className="mt-0.5 size-[18px] shrink-0 text-brand-600" />
          <div className="text-[14px] leading-relaxed text-zinc-800">
            <p className="mb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-brand-700">Дасгал</p>
            {lesson.task}
          </div>
        </div>
      )}

      {lesson.ask && (
        <button
          type="button"
          onClick={() => ask(lesson.ask!)}
          className="mt-4 flex w-full cursor-pointer items-center gap-3 rounded-xl bg-zinc-900/[0.03] p-3.5 text-left ring-1 ring-inset ring-zinc-900/[0.07] transition hover:bg-zinc-900/[0.05]"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-ink text-lime">
            <IconSparkles className="size-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] text-zinc-500">AI-аас өөрийн бизнест тохируулж асуух</span>
            <span className="block text-[14px] text-zinc-800">“{lesson.ask}”</span>
          </span>
          <IconArrowRight className="size-4 shrink-0 text-zinc-400" />
        </button>
      )}

      {lesson.sources && lesson.sources.length > 0 && (
        <div className="mt-6 border-t border-zinc-900/[0.06] pt-4">
          <p className="text-[12px] font-medium uppercase tracking-[0.08em] text-zinc-400">Эх сурвалж</p>
          <ul className="mt-2 space-y-1">
            {lesson.sources.map((s) => (
              <li key={s.url + s.label}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-zinc-600 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
                >
                  <IconLink className="size-3.5 shrink-0" /> {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-zinc-900/[0.06] pt-5">
        {prev && (
          <Button variant="ghost" onClick={() => go({ m: module.id, l: prev.id })}>
            <IconChevronLeft className="size-4" /> Өмнөх
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="secondary" size="md" onClick={() => toggleGuideRead(lesson.id)}>
          {isRead ? "Уншаагүй болгох" : "Уншсан гэж тэмдэглэх"}
        </Button>
        {nextStep && (
          <Button onClick={finish}>
            {isRead ? nextStep.label : `Дуусгаад: ${nextStep.label.toLowerCase()}`} <IconArrowRight className="size-4" />
          </Button>
        )}
      </div>
    </article>
  );
}

/* ---------------- Нэр томьёо ---------------- */

const GROUPS: GlossaryTerm["group"][] = ["Маркетинг", "Зар & Boost", "Санхүү", "Татвар & Хууль"];

function Glossary() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = (t: GlossaryTerm) =>
    !q || t.term.toLowerCase().includes(q) || (t.en ?? "").toLowerCase().includes(q) || t.text.toLowerCase().includes(q);

  return (
    <div>
      <div className="relative mb-5 max-w-md">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Хайх: CPM, НӨАТ, хүрэлт…"
          aria-label="Нэр томьёо хайх"
          className={cn(inputClass, "pl-9")}
        />
      </div>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {GROUPS.map((g) => {
          const terms = GLOSSARY.filter((t) => t.group === g && matches(t));
          if (!terms.length) return null;
          return (
            <Card key={g} className="p-5">
              <h2 className="font-medium text-zinc-900">{g}</h2>
              <dl className="mt-4 space-y-3.5">
                {terms.map((t) => (
                  <div key={t.term}>
                    <dt className="text-sm font-medium text-zinc-900">
                      {t.term} {t.en && <span className="font-normal text-zinc-400">· {t.en}</span>}
                    </dt>
                    <dd className="mt-0.5 text-[13px] leading-relaxed text-zinc-600">{t.text}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
      </div>
      {GLOSSARY.every((t) => !matches(t)) && <p className="text-sm text-zinc-500">“{query}” олдсонгүй.</p>}
    </div>
  );
}

/* ---------------- Эх сурвалж ---------------- */

function Resources() {
  return (
    <div className="space-y-5">
      <Card className="flex gap-3 p-5">
        <IconBulb className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <p className="text-[13.5px] leading-relaxed text-zinc-600">
          Энэ сургалтыг Meta-ийн албан ёсны заавар, Монголын татварын хууль, 2026 оны татварын багц хуулийн талаарх мэдээллүүд
          дээр үндэслэн бэлдсэн. Хуулийн тоо баримт өөрчлөгдөж болох тул чухал шийдвэрийн өмнө доорх албан эх сурвалж эсвэл
          мэргэжлийн хүнээр баталгаажуулаарай. Видео хэлбэрээр суралцах бол Meta Blueprint-ийн үнэгүй курсуудыг үзээрэй.
        </p>
      </Card>
      {RESOURCES.map((g) => (
        <Card key={g.group} className="p-5">
          <h2 className="font-medium text-zinc-900">{g.group}</h2>
          <ul className="mt-3 divide-y divide-zinc-900/[0.06]">
            {g.items.map((r) => (
              <li key={r.url}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-3 py-3 first:pt-1 last:pb-1"
                >
                  <IconLink className="mt-0.5 size-4 shrink-0 text-zinc-400 group-hover:text-zinc-900" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-zinc-900 group-hover:underline">{r.label}</span>
                    <span className="block text-[13px] text-zinc-500">{r.note}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
