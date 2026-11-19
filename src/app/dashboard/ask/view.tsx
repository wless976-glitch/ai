"use client";

import Link from "next/link";
import { type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react";
import { AiConnectNotice } from "@/components/ai-connect-notice";
import {
  IconAlert,
  IconCalendar,
  IconChart,
  IconClock,
  IconCopy,
  IconMessage,
  IconPencil,
  IconPlus,
  IconRefresh,
  IconRocket,
  IconSend,
} from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { Button, ButtonLink, cn, MonoLabel } from "@/components/ui";
import { AiRequestError, askAI, errorMessage, fetchPlanUsage } from "@/lib/ai-client";
import { MAX_PROMPT_CHARS } from "@/lib/ai-models";
import {
  type ChatMessage,
  newChat,
  newMessageId,
  setChatMessages,
  useChatMessages,
  useCurrentChatId,
} from "@/lib/ask-history";
import { useStore } from "@/lib/store";
import { usePlan } from "@/lib/use-plan";

const SUGGESTIONS = [
  { icon: IconCalendar, text: "Энэ 7 хоногт ямар пост оруулбал дээр вэ?" },
  { icon: IconRocket, text: "Boost хийхэд хэдэн төгрөг зарцуулах нь зөв бэ?" },
  { icon: IconClock, text: "Instagram-д хэдэн цагт пост оруулбал илүү олон хүнд хүрэх вэ?" },
  { icon: IconPencil, text: "Шинэ бүтээгдэхүүний тухай постын текст бичээд өгөөч" },
  { icon: IconMessage, text: "Муу сэтгэгдэлд хэрхэн эелдэг хариулах вэ?" },
  { icon: IconChart, text: "Хүрэлт, идэвх хоёрын ялгаа юу вэ? Аль нь илүү чухал вэ?" },
];

const COMPOSER_MAX_PX = 200;

/**
 * "AI-аас асуух" — сошиал маркетингийн талаар чатаар асууж, бизнест тохирсон хариулт авна.
 * Сайтын нүүр (/) шууд энд ордог.
 */
/** Нээлттэй ярианы id-гаар AskView-г шинээр mount хийнэ — яриа солиход бичиж буй текст, алдаа цэвэрлэгдэнэ */
export function AskScreen() {
  const id = useCurrentChatId();
  return <AskView key={id} chatId={id} />;
}

export function AskView({ chatId }: { chatId: string }) {
  const { business, notify } = useStore();
  const messages = useChatMessages(chatId);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Үнэгүй багцын өдрийн хязгаарт хүрсэн эсэх — алдааны оронд Plus санал болгоно */
  const [limitHit, setLimitHit] = useState(false);
  const { locked } = usePlan();
  /** Үнэгүй багцад өнөөдөр үлдсэн асуулт (Plus эсвэл тодорхойгүй бол null) */
  const [left, setLeft] = useState<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Нэг ярианд давхардсан хүсэлтийн зөвхөн сүүлийнх нь UI-г шинэчилнэ
  const epoch = useRef(0);

  useEffect(() => {
    if (!locked) return;
    let alive = true;
    fetchPlanUsage()
      .then((u) => alive && u.limits && setLeft(Math.max(0, u.limits.ask - u.used.ask)))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [locked]);

  // Шинэ мессеж, хүлээлт, алдаа гарах бүрт доош гүйлгэнэ
  useEffect(() => {
    if (messages.length === 0 && !pending) return;
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length, pending, error]);

  function resizeInput(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_PX)}px`;
  }

  async function request(history: ChatMessage[]) {
    const mine = ++epoch.current;
    setPending(true);
    setError(null);
    setLimitHit(false);
    try {
      const { text: answer, remaining } = await askAI(
        history.map(({ role, content }) => ({ role, content })),
        business,
      );
      if (epoch.current !== mine) return;
      // Хэрэглэгч өөр яриа руу шилжсэн ч хариулт өөрийн ярианд хадгалагдана
      setChatMessages(chatId, [...history, { id: newMessageId(), role: "assistant", content: answer }]);
      setLeft(remaining);
    } catch (err) {
      if (epoch.current !== mine) return;
      setError(errorMessage(err));
      if (err instanceof AiRequestError && err.code === "limit_reached") {
        setLimitHit(true);
        setLeft(0);
      }
    } finally {
      if (epoch.current === mine) setPending(false);
    }
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || pending) return;
    const next: ChatMessage[] = [...messages, { id: newMessageId(), role: "user", content }];
    setChatMessages(chatId, next);
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "";
    void request(next);
  }

  function regenerate() {
    const history = messages.at(-1)?.role === "assistant" ? messages.slice(0, -1) : messages;
    setChatMessages(chatId, history);
    void request(history);
  }

  function reset() {
    newChat();
    setPending(false);
    setError(null);
    setLimitHit(false);
    setDraft("");
    if (inputRef.current) inputRef.current.style.height = "";
    inputRef.current?.focus();
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(
      () => notify("Хуулагдлаа", "info"),
      () => notify("Хуулж чадсангүй", "error"),
    );
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    send(draft);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    // Монгол/Хятад гарын composition үед Enter нь үсэг сонгоно — илгээхгүй
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send(draft);
    }
  }

  function onChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setDraft(e.target.value);
    resizeInput(e.target);
  }

  const empty = messages.length === 0 && !pending && !error;
  const lastAssistant = messages.at(-1)?.role === "assistant" ? messages.at(-1)!.id : null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-9rem)] max-w-3xl flex-col">
      <AiConnectNotice />

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-ink text-white shadow-[0_0_40px_-8px_rgb(212_233_63/0.6)] ring-1 ring-white/10">
            <LogoMark className="size-8" />
          </span>
          <h1 className="mt-6 text-balance text-[30px] font-medium leading-tight tracking-[-0.035em] text-zinc-900 sm:text-[40px]">
            Юу асуух вэ?
          </h1>
          <p className="mt-2 max-w-md text-pretty text-[15px] text-zinc-500">
            Пост, boost, үр дүн — сошиал маркетингийн талаар юу ч асуугаарай.{" "}
            {business.name && <span className="text-zinc-700">{business.name}</span>}-д тохируулж хариулна.
          </p>
          <div className="mt-8 grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-2">
            {SUGGESTIONS.map(({ icon: Icon, text }) => (
              <button
                key={text}
                type="button"
                onClick={() => send(text)}
                className="group flex cursor-pointer items-start gap-3 rounded-2xl bg-surface p-3.5 text-[14px] leading-snug text-zinc-700 shadow-xs ring-1 ring-zinc-900/[0.07] transition hover:-translate-y-px hover:text-zinc-900 hover:ring-zinc-900/15 focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
                  <Icon className="size-4" />
                </span>
                <span className="pt-0.5">{text}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 border-b border-dashed border-zinc-900/15 pb-3">
            <div className="min-w-0">
              <h1 className="text-lg font-medium tracking-[-0.02em] text-zinc-900">AI-аас асуух</h1>
              {business.name && <MonoLabel className="text-[10px] text-zinc-400">{business.name}</MonoLabel>}
            </div>
            <Button variant="secondary" size="sm" onClick={reset}>
              <IconPlus className="size-4" /> Шинэ яриа
            </Button>
          </div>

          <ol className="flex-1 space-y-6 py-6" aria-live="polite">
            {messages.map((m) =>
              m.role === "user" ? (
                <li key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap break-words rounded-[22px] rounded-br-md bg-zinc-900 px-4 py-2.5 text-[15px] leading-relaxed text-zinc-50">
                    {m.content}
                  </p>
                </li>
              ) : (
                <li key={m.id} className="flex gap-3">
                  <Avatar />
                  <div className="min-w-0 flex-1 pt-1">
                    <RichText text={m.content} />
                    <div className="mt-2 flex gap-1 text-zinc-400">
                      <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" onClick={() => copy(m.content)}>
                        <IconCopy className="size-3.5" /> Хуулах
                      </Button>
                      {m.id === lastAssistant && !pending && (
                        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[12px]" onClick={regenerate}>
                          <IconRefresh className="size-3.5" /> Дахин бичүүлэх
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ),
            )}

            {pending && (
              <li className="flex gap-3" aria-label="AI хариулт бичиж байна">
                <Avatar />
                <div className="flex items-center gap-3 pt-2">
                  <span className="flex gap-1" aria-hidden="true">
                    {[0, 150, 300].map((d) => (
                      <span
                        key={d}
                        className="size-1.5 animate-bounce rounded-full bg-zinc-400"
                        style={{ animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                  <MonoLabel className="text-[10px] text-zinc-400">Бодож байна</MonoLabel>
                </div>
              </li>
            )}

            {error && !pending && (
              <li className="flex gap-3">
                <Avatar />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200 sm:flex-row sm:items-center">
                  <span className="flex flex-1 items-start gap-2">
                    <IconAlert className="mt-px size-4 shrink-0" /> {error}
                  </span>
                  {limitHit ? (
                    <ButtonLink href="/dashboard/plan" size="sm">
                      Plus-ийн тухай
                    </ButtonLink>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => void request(messages)}>
                      <IconRefresh className="size-4" /> Дахин оролдох
                    </Button>
                  )}
                </div>
              </li>
            )}
          </ol>
          <div ref={endRef} />
        </>
      )}

      {/* Бичих хэсэг — дэлгэцийн доод талд наалдсан */}
      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 z-10 -mx-4 bg-linear-to-t from-[var(--color-canvas)] from-60% to-transparent px-4 pb-4 pt-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-end gap-2 rounded-[26px] bg-surface p-2 pl-4 shadow-card ring-1 ring-zinc-900/10 transition-shadow focus-within:ring-2 focus-within:ring-brand-500 dark:bg-zinc-50">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={onChange}
              onKeyDown={onKeyDown}
              maxLength={MAX_PROMPT_CHARS}
              placeholder="Асуултаа бичнэ үү…"
              aria-label="Асуулт"
              className="min-h-10 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
              style={{ maxHeight: COMPOSER_MAX_PX }}
            />
            <button
              type="submit"
              disabled={!draft.trim() || pending}
              aria-label="Илгээх"
              className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-lime text-ink transition hover:bg-lime-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconSend className="size-[18px]" />
            </button>
          </div>
          <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-400">
            {locked && left !== null ? (
              <>
                <span className={left === 0 ? "text-rose-500" : undefined}>Өнөөдөр {left} асуулт үлдсэн</span> ·{" "}
                <Link href="/dashboard/plan" className="text-zinc-600 underline-offset-2 hover:underline">
                  Plus-д хязгааргүй
                </Link>
              </>
            ) : (
              <>
                <span className="max-sm:hidden">Enter — илгээх · Shift+Enter — шинэ мөр · </span>
                AI алдаа гаргаж болно — чухал зүйлээ шалгаарай
              </>
            )}
            {draft.length > MAX_PROMPT_CHARS - 200 && (
              <span className="text-amber-600">
                {" "}
                · {draft.length}/{MAX_PROMPT_CHARS}
              </span>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}

function Avatar() {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-white ring-1 ring-white/10">
      <LogoMark className="size-5" />
    </span>
  );
}

/**
 * AI-ийн хариултыг энгийн форматаар харуулна: догол мөр, "- " / "1. " жагсаалт, **тод** үг.
 * HTML-ээр биш React элементээр зурдаг тул аюулгүй.
 */
function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    if (!list) return;
    const { ordered, items } = list;
    const Tag = ordered ? "ol" : "ul";
    blocks.push(
      <Tag
        key={blocks.length}
        className={cn("space-y-1.5 pl-5 marker:text-zinc-400", ordered ? "list-decimal" : "list-disc")}
      >
        {items.map((item, i) => (
          <li key={i} className="pl-1">
            {inline(item)}
          </li>
        ))}
      </Tag>,
    );
    list = null;
  };

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    flush();
    if (!line) continue;
    const heading = /^#+\s*(.*)$/.exec(line);
    blocks.push(
      <p key={blocks.length} className={heading ? "font-medium text-zinc-900" : undefined}>
        {inline(heading ? heading[1] : line)}
      </p>,
    );
  }
  flush();

  return <div className="space-y-3 break-words text-[15px] leading-relaxed text-zinc-800">{blocks}</div>;
}

function inline(s: string): ReactNode[] {
  return s.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold text-zinc-900">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}
