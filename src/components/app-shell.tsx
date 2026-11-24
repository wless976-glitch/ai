"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useState, type ComponentType, type ReactNode, type SVGProps } from "react";
import { deleteChat, newChat, openChat, useChats, useCurrentChatId, type Conversation } from "@/lib/ask-history";
import {
  MODE_HOME,
  modeForPath,
  setSidebarMode,
  toggleSidebar,
  useSidebarCollapsed,
  useSidebarMode,
  type SidebarMode,
} from "@/lib/sidebar";
import { AI_USAGE_LABELS } from "@/lib/ai-models";
import { useAiUsage } from "@/lib/ai-usage";
import { useStore } from "@/lib/store";
import {
  IconAlert,
  IconBook,
  IconCalendar,
  IconChart,
  IconCheck,
  IconDashboard,
  IconFlask,
  IconInfo,
  IconMenu,
  IconMessage,
  IconPlus,
  IconSidebar,
  IconSparkles,
  IconTrash,
  IconVideo,
  IconWand,
  IconX,
} from "./icons";
import { InfoTip } from "./info-tip";
import { Logo } from "./logo";
import { Modal } from "./modal";
import { UserMenu } from "./user-menu";
import { Button, cn, MonoLabel } from "./ui";

/**
 * Claude-ийн нүүр хуудастай төстэй хажуу цэс. Дээд талын горимын товчоор (Claude-ийн Chat / Code шиг)
 * агуулга солигдоно:
 * - Яриа: "Шинэ яриа", AI студи, Видео студи, Сургалт, сүүлийн ярианууд
 * - Өдөр тутам: Хянах самбар, Пост бэлдэх, Хуанли, Үр дүн, Сургалт
 * Хамгийн доор профайл (Тохиргоо, Сургалт, Багц, өнгөний горим — user-menu.tsx).
 * Том дэлгэцэнд дүрс төдий болгож хураана (src/lib/sidebar.ts).
 */
const NAV_ITEMS = [
  { href: "/dashboard/studio", label: "AI студи", icon: IconWand },
  { href: "/dashboard/video", label: "Видео студи", icon: IconVideo },
  { href: "/dashboard/guides", label: "Сургалт", icon: IconBook },
];

const MODES: { mode: SidebarMode; label: string; icon: Icon }[] = [
  { mode: "chat", label: "Яриа", icon: IconMessage },
  { mode: "daily", label: "Өдөр тутам", icon: IconDashboard },
];

const DAILY_ITEMS = [
  { href: "/dashboard", label: "Хянах самбар", icon: IconDashboard },
  { href: "/dashboard/create", label: "Пост бэлдэх", icon: IconSparkles },
  { href: "/dashboard/calendar", label: "Хуанли", icon: IconCalendar },
  { href: "/dashboard/analytics", label: "Үр дүн & Boost", icon: IconChart },
  { href: "/dashboard/guides", label: "Сургалт", icon: IconBook },
];

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<Conversation | null>(null);
  const { business, ai, notify } = useStore();
  const collapsed = useSidebarCollapsed();
  /** Зөвхөн горимын товчийг тодруулахад — хэсгүүдийг өөрсдийг нь CSS (`daily:`) харуулна, анивчихгүй */
  const mode = useSidebarMode();
  const aiUsage = useAiUsage();
  const close = () => setOpen(false);

  // Горимын хуудсанд очиход (жишээ нь хянах самбарын холбоосоор) тэр горим автоматаар сонгогдоно
  useEffect(() => {
    const m = modeForPath(pathname);
    if (m) setSidebarMode(m);
  }, [pathname]);

  return (
    <div className="app-theme flex min-h-dvh">
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-ink/40 backdrop-blur-[2px] lg:hidden" onClick={close} aria-hidden="true" />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink text-white transition-[transform,width] duration-300 lg:translate-x-0 lg:collapsed:w-[60px] dark:border-r dark:border-white/[0.06]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Дээд талын бүдэг шар-ногоон туяа. Профайлын цэс хажуу цэснээс гарч харагдах ёстой тул
            overflow-hidden-ийг зөвхөн энэ давхаргад тавина */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-40 h-80 w-96 bg-[radial-gradient(closest-side,rgb(212_233_63/0.12),transparent)]" />
        </div>

        <div className="relative flex h-14 shrink-0 items-center justify-between gap-2 px-3 lg:collapsed:justify-center lg:collapsed:px-0">
          <Logo href="/dashboard" className="pl-1.5 lg:collapsed:hidden" />
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={collapsed ? "Хажуу цэсийг дэлгэх" : "Хажуу цэсийг хураах"}
            aria-expanded={!collapsed}
            title={collapsed ? "Дэлгэх" : "Хураах"}
            className="hidden size-9 cursor-pointer items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-lime lg:flex"
          >
            <IconSidebar className="size-[18px]" />
          </button>
          <button
            type="button"
            onClick={close}
            aria-label="Цэс хаах"
            className="cursor-pointer rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white lg:hidden"
          >
            <IconX />
          </button>
        </div>

        {/* Горимын товч — дарахад хажуу цэсийн агуулга солигдож, тухайн горимын эхлэл хуудас нээгдэнэ */}
        <div
          role="group"
          aria-label="Горим"
          className="relative mx-2 mb-3 flex gap-0.5 rounded-xl bg-white/[0.05] p-0.5 ring-1 ring-inset ring-white/[0.07] lg:collapsed:flex-col"
        >
          {MODES.map(({ mode: m, label, icon: Icon }) => {
            const active = mode === m;
            return (
              <Link
                key={m}
                href={MODE_HOME[m]}
                onClick={() => {
                  setSidebarMode(m);
                  close();
                }}
                aria-current={active ? "true" : undefined}
                aria-label={label}
                title={collapsed ? label : undefined}
                className={cn(
                  // Хураасан үед доош доошоо байрлах тул flex-1 өндрийг нь шахахгүйн тулд flex-none
                  "flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[10px] text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lime lg:collapsed:flex-none",
                  active ? "bg-white/[0.12] text-white shadow-sm" : "text-white/50 hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate lg:collapsed:hidden">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Яриа горим */}
        <div className="relative flex min-h-0 flex-1 flex-col daily:hidden">
          <nav aria-label="Яриа" className="space-y-0.5 px-2">
            <SideLink
              href="/dashboard/ask"
              label="Шинэ яриа"
              icon={IconPlus}
              accent
              collapsed={collapsed}
              onClick={() => {
                newChat();
                close();
              }}
            />
            {NAV_ITEMS.map((item) => (
              <SideLink
                key={item.href}
                {...item}
                active={pathname.startsWith(item.href)}
                collapsed={collapsed}
                onClick={close}
              />
            ))}
          </nav>

          {/* Сүүлийн ярианууд — хураасан үед нуугдана (зай нь үлдэж профайлыг доор нь барина) */}
          <div className="mt-6 min-h-0 flex-1 overflow-y-auto px-2 pb-2 lg:collapsed:invisible">
            <MonoLabel className="block px-2.5 pb-1.5 text-[10px] text-white/35">Сүүлийн яриа</MonoLabel>
            <RecentChats onOpen={close} onDelete={setDeleting} />
          </div>
        </div>

        {/* Өдөр тутам горим */}
        <nav aria-label="Өдөр тутам" className="relative hidden min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 daily:block">
          {DAILY_ITEMS.map((item) => (
            <SideLink
              key={item.href}
              {...item}
              // Хянах самбар нь бусад бүх хуудасны эх зам тул зөвхөн яг таарахад идэвхтэй
              active={item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href)}
              collapsed={collapsed}
              onClick={close}
            />
          ))}
        </nav>

        {/* Профайл: дарахад хэрэглэгчийн цэс (Тохиргоо, Сургалт, Багц, өнгөний горим), админд админ цэс */}
        <div className="relative shrink-0 border-t border-white/[0.06] p-2">
          <Suspense fallback={<div className="h-11 rounded-xl bg-white/[0.04]" />}>
            <UserMenu businessName={business.name} onNavigate={close} />
          </Suspense>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col transition-[padding] duration-300 lg:pl-64 lg:collapsed:pl-[60px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 bg-ink/95 px-4 text-white backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Цэс нээх"
            className="-ml-1 cursor-pointer rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <IconMenu />
          </button>
          <Logo href="/dashboard" />
          <Link
            href="/dashboard/ask"
            onClick={newChat}
            aria-label="Шинэ яриа"
            className="ml-auto flex size-9 items-center justify-center rounded-full bg-lime text-ink transition-colors hover:bg-lime-hover"
          >
            <IconPlus className="size-4" />
          </Link>
        </header>

        <div className="flex items-center justify-center gap-2.5 border-b border-dashed border-zinc-900/15 px-4 py-2 text-[12.5px] text-zinc-600 sm:px-6">
          <MonoLabel className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10.5px] text-amber-900 ring-1 ring-inset ring-amber-200/70">
            <IconFlask className="size-3.5" /> Тест горим
          </MonoLabel>
          <span className="hidden min-w-0 truncate sm:inline">Юу ч бодитоор нийтлэгдэхгүй, статистик холбогдоогүй.</span>
          <InfoTip label="Тест горим гэж юу вэ?" className="text-zinc-400 hover:text-zinc-900">
            Facebook, Instagram (Meta Graph API) холбогдоогүй тул пост бодитоор нийтлэгдэхгүй, статистик харуулахгүй.{" "}
            {ai?.connected && !ai.issue
              ? "AI (Hugging Face) холбогдсон — текст, зургийг бодитоор үүсгэнэ."
              : ai?.connected
                ? "AI түр ажиллахгүй байгаа тул жишээ текст ашиглаж байна."
                : "AI холбогдоогүй тул жишээ текст ашиглаж байна."}
          </InfoTip>
          {/* AI хэрэглээний түвшин — тест хийхдээ хэр их токен зарцуулж буйг харуулна */}
          <Link
            href="/dashboard/settings#ai"
            title="AI хэрэглээ — Тохиргоо"
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] ring-1 ring-inset transition-colors",
              aiUsage === "full"
                ? "text-zinc-600 ring-zinc-900/15 hover:bg-zinc-900/[0.04]"
                : "bg-emerald-50 text-emerald-800 ring-emerald-200/70 hover:bg-emerald-100",
            )}
          >
            AI · {AI_USAGE_LABELS[aiUsage].label}
          </Link>
          {ai?.connected && ai.issue && (
            <Link
              href="/dashboard/settings#ai"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-medium text-rose-800 hover:bg-rose-200"
            >
              <IconAlert className="size-3.5" />
              {ai.issue === "no_credits" ? "AI кредит дууссан" : "AI токен буруу"}
            </Link>
          )}
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Яриаг устгах уу?"
        description={deleting?.title}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Болих
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleting) deleteChat(deleting.id);
                setDeleting(null);
                notify("Яриа устгагдлаа", "info");
              }}
            >
              Устгах
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">Энэ ярианы бүх асуулт, хариулт энэ хөтчөөс бүрмөсөн устна.</p>
      </Modal>

      <Toaster />
    </div>
  );
}

/** Хажуу цэсний мөр: дүрс + нэр. Хураасан үед зөвхөн дүрс (нэр нь title, aria-label-д) */
function SideLink({
  href,
  label,
  icon: Icon,
  active,
  accent,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: Icon;
  active?: boolean;
  accent?: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-lg px-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lime lg:collapsed:justify-center lg:collapsed:px-0",
        active ? "bg-white/[0.08] text-white" : "text-white/70 hover:bg-white/[0.05] hover:text-white",
      )}
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full transition-colors",
          accent
            ? "bg-lime text-ink shadow-[0_0_16px_-4px_rgb(212_233_63/0.6)] group-hover:bg-lime-hover"
            : "text-white/60 group-hover:text-white",
          active && !accent && "text-white",
        )}
      >
        <Icon className={accent ? "size-4" : "size-[18px]"} />
      </span>
      <span className={cn("truncate lg:collapsed:hidden", accent && "font-medium text-white")}>{label}</span>
    </Link>
  );
}

/** Сүүлийн ярианууд — сүүлд шинэчлэгдсэн нь дээрээ. Мөр дээр очиход устгах товч гарна. */
function RecentChats({ onOpen, onDelete }: { onOpen: () => void; onDelete: (c: Conversation) => void }) {
  const chats = useChats();
  const current = useCurrentChatId();
  const pathname = usePathname();
  const onAsk = pathname === "/dashboard/ask";

  if (chats.length === 0) {
    return <p className="px-2.5 py-1 text-[12.5px] leading-relaxed text-white/35">Асуусан яриа тань энд хадгалагдана.</p>;
  }
  return (
    <ul className="space-y-px">
      {chats.map((c) => {
        const active = onAsk && c.id === current;
        return (
          <li key={c.id} className="group/chat relative">
            <Link
              href="/dashboard/ask"
              onClick={() => {
                openChat(c.id);
                onOpen();
              }}
              aria-current={active ? "page" : undefined}
              title={c.title}
              className={cn(
                "block truncate rounded-lg py-1.5 pl-2.5 pr-8 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lime",
                active ? "bg-white/[0.08] text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white",
              )}
            >
              {c.title}
            </Link>
            <button
              type="button"
              onClick={() => onDelete(c)}
              aria-label={`“${c.title}” яриаг устгах`}
              className="absolute right-1 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-white/45 opacity-0 transition hover:bg-white/10 hover:text-white focus-visible:opacity-100 group-hover/chat:opacity-100 pointer-coarse:opacity-100"
            >
              <IconTrash className="size-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function Toaster() {
  const { toasts, dismissToast } = useStore();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "toast-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ring-1",
            t.tone === "success" && "bg-ink text-white ring-white/10",
            t.tone === "info" && "bg-surface text-zinc-800 ring-zinc-200",
            t.tone === "error" && "bg-[#e11d48] text-white ring-black/10",
          )}
        >
          <span className="mt-px shrink-0">
            {t.tone === "success" ? (
              <IconCheck className="size-4 text-lime" />
            ) : t.tone === "error" ? (
              <IconAlert className="size-4" />
            ) : (
              <IconInfo className="size-4 text-brand-600" />
            )}
          </span>
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Хаах"
            className="cursor-pointer opacity-60 hover:opacity-100"
          >
            <IconX className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
