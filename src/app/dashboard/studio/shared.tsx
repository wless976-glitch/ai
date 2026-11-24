"use client";

/**
 * AI студийн хэрэгслүүдэд нийтлэг хэсгүүд: карт, доод мөр, үр дүн, "Пост болгох".
 */
import Link from "next/link";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AiStatusLine, BIG_BUTTON, ComposerFooter } from "@/components/composer";
import {
  IconAlert,
  IconArrowRight,
  IconCheckCircle,
  IconClock,
  IconCopy,
  IconDownload,
  IconSend,
  IconSparkles,
} from "@/components/icons";
import { Badge, Button, ButtonLink, buttonClass, Card } from "@/components/ui";
import { AiRequestError, errorMessage, generateText, imageToText, type GeneratedMedia } from "@/lib/ai-client";
import { useAiUsage } from "@/lib/ai-usage";
import { AI_TASKS, type AiTask } from "@/lib/ai-models";
import { addDays } from "@/lib/format";
import { getToday } from "@/lib/today";
import { newId, visualFor } from "@/lib/mock-ai";
import { FREE_DAILY, type PlanUsage, type Quota } from "@/lib/plan";
import { useStore } from "@/lib/store";
import { usePlan } from "@/lib/use-plan";

export const TOOL_TIME: Record<AiTask, string> = {
  text: "5–20 секунд",
  vision: "5–20 секунд",
  image: "10–40 секунд",
  edit: "15–60 секунд",
  video: "1–5 минут",
};

/** Үнэгүй багцад өдрийн хязгаартай хэрэгслүүд */
export const TOOL_QUOTA: Partial<Record<AiTask, Quota>> = { text: "text", vision: "vision" };

export interface StudioShared {
  /** Таб, "Шинээр эхлэх" — хэрэгсэл бүрийн картын дээд хэсэг */
  header: ReactNode;
  usage: PlanUsage | null;
  refreshUsage: () => void;
}

export const Studio = createContext<StudioShared>({ header: null, usage: null, refreshUsage: () => {} });

export interface TaskState<T> {
  status: "idle" | "loading" | "done" | "error";
  data?: T;
  error?: string;
  code?: string;
}

export function useTask<T>() {
  const [state, setState] = useState<TaskState<T>>({ status: "idle" });
  async function run(fn: () => Promise<T>): Promise<T | undefined> {
    setState((s) => ({ ...s, status: "loading", error: undefined }));
    try {
      const data = await fn();
      setState({ status: "done", data });
      return data;
    } catch (err) {
      setState({
        status: "error",
        error: errorMessage(err),
        code: err instanceof AiRequestError ? err.code : undefined,
      });
      return undefined;
    }
  }
  return [state, run] as const;
}

/** Нэг карт: таб → дугаартай алхмууд → доод мөр; үр дүн картын доор бүтэн өргөнөөр */
export function ToolLayout({
  status,
  steps,
  footer,
  result,
}: {
  status: TaskState<unknown>["status"];
  steps: ReactNode;
  footer: ReactNode;
  result: ReactNode;
}) {
  const { header } = useContext(Studio);
  const resultRef = useRef<HTMLDivElement>(null);

  // Үүсгэж эхлэхэд үр дүнгийн хэсэг рүү гүйлгэнэ — маягт өндөр тул доор нь харагдахгүй байж болно
  useEffect(() => {
    if (status === "loading") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [status]);

  return (
    <>
      <Card className="p-4 sm:p-6">
        {header}
        <div className="mt-6 space-y-8">{steps}</div>
        {footer}
      </Card>
      <div ref={resultRef} className="mt-6 scroll-mt-6 empty:hidden">
        {result}
      </div>
    </>
  );
}

/** Доод мөр: өдрийн хязгаар + AI-ийн төлөв, баруун талд том товч */
export function ToolFooter({
  task,
  loading,
  disabled,
  hint,
  onRun,
  children,
  time = TOOL_TIME[task],
  mockLabel = task === "video" ? "видео үүсгэхгүй (0 токен)" : "жишээ үр дүнгээр (0 токен)",
}: {
  task: AiTask;
  loading: boolean;
  disabled: boolean;
  hint: string;
  onRun: () => unknown;
  children: ReactNode;
  /** "Ихэвчлэн … үргэлжилнэ" */
  time?: string;
  /** Токенгүй горимын тайлбар */
  mockLabel?: string;
}) {
  const { usage, refreshUsage } = useContext(Studio);
  const { locked, isLoaded } = usePlan();
  const aiUsage = useAiUsage();
  const quota = TOOL_QUOTA[task];
  const limit = quota ? FREE_DAILY[quota] : null;
  const left = locked && quota && usage ? Math.max(0, FREE_DAILY[quota] - usage.used[quota]) : null;
  // Токенгүй горимд сервер дуудахгүй тул хязгаар хамаарахгүй
  const blocked = left === 0 && aiUsage !== "mock";

  return (
    <ComposerFooter
      info={
        <>
          {!isLoaded ? (
            <p className="text-zinc-400">Багцыг шалгаж байна…</p>
          ) : locked && limit !== null ? (
            <p className={left === 0 ? "text-amber-700" : "text-zinc-500"}>
              Өнөөдөр {left ?? "—"}/{limit} үлдсэн
              {" · "}
              <Link href="/dashboard/plan" className="font-medium text-emerald-700 hover:underline">
                Plus-д хязгааргүй →
              </Link>
            </p>
          ) : (
            <p className="text-zinc-500">Plus · өдрийн хязгааргүй</p>
          )}
          <AiStatusLine
            task={task}
            mock={mockLabel}
            fallback="AI ажиллахгүй"
          />
          {aiUsage !== "mock" && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <IconClock className="size-3.5 shrink-0" /> Ихэвчлэн {time} үргэлжилнэ
            </p>
          )}
        </>
      }
    >
      <Button
        size="lg"
        className={BIG_BUTTON}
        disabled={disabled || loading || blocked}
        onClick={async () => {
          await onRun();
          if (limit !== null && locked) refreshUsage();
        }}
      >
        {loading ? "Үүсгэж байна…" : blocked ? "Өнөөдрийн хязгаар дууссан" : children}
      </Button>
      {disabled && !loading && <p className="text-center text-xs text-zinc-400 sm:text-right">{hint}</p>}
    </ComposerFooter>
  );
}

export function ResultPanel<T>({
  task,
  state,
  children,
  time = TOOL_TIME[task],
  loadingLabel = "AI ажиллаж байна…",
  label = AI_TASKS[task].label,
}: {
  task: AiTask;
  state: TaskState<T>;
  children: ReactNode;
  time?: string;
  loadingLabel?: string;
  /** "Бэлэн боллоо" мөрийн шошго */
  label?: string;
}) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return (
      <Card className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
        <span className="size-10 animate-spin rounded-full border-[3px] border-violet-100 border-t-violet-600" />
        <p className="mt-4 font-medium text-zinc-900">{loadingLabel}</p>
        <p className="mt-1 text-sm text-zinc-500">
          Ихэвчлэн {time} үргэлжилнэ · <Elapsed />
        </p>
      </Card>
    );
  }
  if (state.status === "error") {
    const needsSetup = state.code === "no_token" || state.code === "bad_token" || state.code === "no_credits";
    return (
      <Card className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <IconAlert className="size-6" />
        </span>
        <p className="mt-4 font-semibold text-zinc-900">Үүсгэж чадсангүй</p>
        <p className="mt-1 max-w-md text-sm text-zinc-600">{state.error}</p>
        {needsSetup && (
          <ButtonLink href="/dashboard/settings#ai" variant="secondary" size="sm" className="mt-5">
            AI тохиргоо харах <IconArrowRight className="size-4" />
          </ButtonLink>
        )}
        {state.code === "limit_reached" && (
          <ButtonLink href="/dashboard/plan" variant="secondary" size="sm" className="mt-5">
            Plus-ийн тухай <IconArrowRight className="size-4" />
          </ButtonLink>
        )}
      </Card>
    );
  }
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <IconCheckCircle className="size-4 text-emerald-600" /> Бэлэн боллоо
        </p>
        <Badge tone="violet">
          <IconSparkles className="size-3" /> {label}
        </Badge>
      </div>
      {children}
    </Card>
  );
}

export function Elapsed() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const m = Math.floor(sec / 60);
  return (
    <span className="tabular-nums">
      {m > 0 ? `${m} мин ` : ""}
      {sec % 60} сек
    </span>
  );
}
export function CopyButton({ text }: { text: string }) {
  const { notify } = useStore();
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => notify("Хуулагдлаа", "info"),
          () => notify("Хуулж чадсангүй", "error"),
        )
      }
    >
      <IconCopy className="size-4" /> Хуулах
    </Button>
  );
}

export const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export function MediaActions({ media, filename, onMake }: { media: GeneratedMedia; filename: string; onMake: MakeHandler }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <MakePostButton key={media.url} onMake={onMake} />
      <a
        href={media.url}
        download={`${filename}.${EXT[media.blob.type] ?? "bin"}`}
        className={buttonClass("secondary", "sm")}
      >
        <IconDownload className="size-4" /> Татах
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "Пост болгох" — үр дүнг батлах жагсаалтад нэмнэ                     */
/* ------------------------------------------------------------------ */

export interface MakeInput {
  topic: string;
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  /** Текст байхгүй бол энэ зургаас vision загвараар текст бичүүлнэ */
  imageBlob?: Blob;
}
export type MakeHandler = (make: (input: MakeInput) => Promise<void>) => Promise<void>;

/** Текстийн төгсгөлийн hashtag-уудыг тусад нь салгана */
export function splitHashtags(text: string) {
  const hashtags = Array.from(new Set(text.match(/#[\p{L}\p{N}_]+/gu) ?? [])).slice(0, 6);
  const caption = text
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { caption, hashtags };
}

export function MakePostButton({ onMake }: { onMake: MakeHandler }) {
  const { addPosts, notify, business, settings, connectedPlatforms } = useStore();
  const [state, setState] = useState<"idle" | "working" | "added">("idle");
  const status = settings.requireApproval ? "pending" : "scheduled";

  async function make({ topic, caption, imageUrl, videoUrl, imageBlob }: MakeInput) {
    let text = caption?.trim() ?? "";
    // Студийн үр дүнгийн текст AI-аас ирсэн; текстгүй бол доор AI-аар бичүүлнэ
    let aiMade = text.length > 0;
    if (!text) {
      try {
        text = imageBlob
          ? await imageToText(imageBlob, "caption", business.name)
          : await generateText(
              `"${topic}" сэдвээр ${business.name ? `${business.name}-ийн ` : ""}Facebook, Instagram постын текст бич. 3–4 өгүүлбэр, тохиромжтой emoji, төгсгөлд 3 hashtag. Зөвхөн постын текстийг буцаа.`,
              business.name,
            );
        aiMade = true;
      } catch {
        text = topic; // текст бичүүлж чадаагүй бол тайлбарыг нь ашиглаад батлах үед засна
      }
    }
    const { caption: body, hashtags } = splitHashtags(text);
    addPosts([
      {
        id: newId("s"),
        topic: topic.trim().slice(0, 60) || "AI студи",
        caption: body || topic,
        hashtags,
        platforms: connectedPlatforms,
        date: addDays(getToday(), 2),
        time: settings.smartTiming ? "18:00" : "12:00",
        status,
        visual: { ...visualFor(topic), imageUrl, videoUrl },
        aiGenerated: aiMade,
      },
    ]);
    notify(
      status === "pending"
        ? "Пост болгож, батлах жагсаалтад нэмлээ"
        : "Пост болгож, шууд хуваарьт орууллаа (батлах тохиргоо унтраалттай)",
    );
  }

  if (state === "added") {
    return status === "pending" ? (
      <ButtonLink href="/dashboard#pending" size="sm" variant="success">
        <IconCheckCircle className="size-4" /> Батлах руу очих
      </ButtonLink>
    ) : (
      <ButtonLink href="/dashboard/calendar" size="sm" variant="success">
        <IconCheckCircle className="size-4" /> Хуанли харах
      </ButtonLink>
    );
  }
  if (connectedPlatforms.length === 0) {
    return (
      <ButtonLink href="/dashboard/settings" size="sm" variant="secondary">
        Платформ холбох
      </ButtonLink>
    );
  }
  return (
    <Button
      size="sm"
      disabled={state === "working"}
      onClick={async () => {
        setState("working");
        await onMake(make);
        setState("added");
      }}
    >
      <IconSend className="size-4" /> {state === "working" ? "Текст бичиж байна…" : "Пост болгох"}
    </Button>
  );
}
