"use client";

import { SignInButton, SignUpButton, useClerk, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ComponentType, type KeyboardEvent, type ReactNode, type SVGProps } from "react";
import { PLAN_LABELS, planOf, type Plan } from "@/lib/plan";
import { ROLE_LABELS, roleOf, type Role } from "@/lib/roles";
import { useSidebarCollapsed } from "@/lib/sidebar";
import { Avatar } from "./avatar";
import {
  IconBook,
  IconChevronsUpDown,
  IconLogIn,
  IconLogOut,
  IconMoon,
  IconPlus,
  IconShield,
  IconSliders,
  IconSparkles,
  IconUser,
  IconUsers,
} from "./icons";
import { PlusBadge } from "./plus";
import { ThemeSwitch } from "./theme-switch";
import { cn, MonoLabel } from "./ui";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

const USER_LINKS: { href: string; label: string; icon: Icon }[] = [
  { href: "/dashboard/settings", label: "Тохиргоо", icon: IconSliders },
  { href: "/dashboard/guides", label: "Заавар", icon: IconBook },
];

/** Сумаар шилжих боломжтой мөрүүд (өнгөний горимын товчнууд нь menuitemradio) */
const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"]';

const ADMIN_LINKS: { href: string; label: string; icon: Icon }[] = [
  { href: "/dashboard/admin", label: "Админ самбар", icon: IconShield },
  { href: "/dashboard/admin/users", label: "Хэрэглэгчид, эрх", icon: IconUsers },
];

/**
 * Хажуу цэсний доод талын хэрэглэгчийн хэсэг. Дарахад цэс нээгдэнэ:
 * хэрэглэгчийн цэс (бүгдэд), админ цэс (зөвхөн publicMetadata.role = "admin" үед).
 */
export function UserMenu({ businessName, onNavigate }: { businessName: string; onNavigate: () => void }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const collapsed = useSidebarCollapsed();

  const role: Role = isSignedIn ? roleOf(user.publicMetadata) : "user";
  const isAdmin = role === "admin";
  const plan: Plan = isSignedIn ? planOf(user.publicMetadata) : "free";
  const name = isSignedIn
    ? user.fullName || user.username || user.primaryEmailAddress?.emailAddress.split("@")[0] || businessName
    : businessName;
  const email = isSignedIn ? (user.primaryEmailAddress?.emailAddress ?? null) : null;
  // Энэ цэсээр нээгддэг хуудсанд байх үед товчийг тодруулна (хажуу цэсэнд эдгээр байхгүй)
  const onMenuPage = ["/dashboard/admin", "/dashboard/settings", "/dashboard/guides", "/dashboard/plan"].some((h) =>
    pathname.startsWith(h),
  );

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>(ITEM_SELECTOR)?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    onNavigate();
  }

  /** Сумаар дээш/доош шилжих, Tab дарвал хаах */
  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab") return setOpen(false);
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next =
      e.key === "ArrowDown" ? (i + 1) % items.length
      : e.key === "ArrowUp" ? (i - 1 + items.length) % items.length
      : e.key === "Home" ? 0
      : e.key === "End" ? items.length - 1
      : null;
    if (next === null) return;
    e.preventDefault();
    items[next]?.focus();
  }

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label="Хэрэглэгчийн цэс"
          onKeyDown={onMenuKey}
          className="tip-in absolute inset-x-0 bottom-full z-50 mb-2 lg:collapsed:right-auto lg:collapsed:w-64 max-h-[calc(100dvh-5rem)] overflow-y-auto rounded-2xl bg-[#1d1e1a] p-1.5 shadow-[0_24px_48px_-12px_rgb(0_0_0/0.6)] ring-1 ring-white/10"
        >
          {/* Толгой: хэн нэвтэрсэн, ямар эрхтэй */}
          <div className="flex items-start gap-3 px-2.5 pb-2.5 pt-2">
            <Avatar src={isSignedIn ? user.imageUrl : null} name={name} className="size-9" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{isSignedIn ? name : "Нэвтрээгүй байна"}</p>
              <p className="truncate text-xs text-white/45">{email ?? (isSignedIn ? businessName : "Зочноор үзэж байна")}</p>
              {isSignedIn && (
                <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <RolePill role={role} />
                  {plan === "plus" && <PlusBadge />}
                </span>
              )}
            </div>
          </div>

          <Divider />

          {isSignedIn ? (
            <>
              <SectionLabel>Хэрэглэгчийн цэс</SectionLabel>
              <MenuButton
                icon={IconUser}
                onClick={() => {
                  close();
                  openUserProfile();
                }}
              >
                Миний профайл
              </MenuButton>
              <MenuLink
                href="/dashboard/plan"
                label={`Миний багц · ${PLAN_LABELS[plan]}`}
                icon={IconSparkles}
                active={pathname === "/dashboard/plan"}
                onClick={close}
              />
              {USER_LINKS.map((l) => (
                <MenuLink key={l.href} {...l} active={pathname.startsWith(l.href)} onClick={close} />
              ))}
              <ThemeRow />

              {isAdmin && (
                <>
                  <Divider />
                  <SectionLabel>Админ цэс</SectionLabel>
                  {ADMIN_LINKS.map((l) => (
                    <MenuLink key={l.href} {...l} admin active={pathname === l.href} onClick={close} />
                  ))}
                </>
              )}

              <Divider />
              <MenuButton
                icon={IconLogOut}
                onClick={() => {
                  close();
                  void signOut({ redirectUrl: "/" });
                }}
              >
                Гарах
              </MenuButton>
            </>
          ) : (
            <>
              <SignInButton>
                <MenuButton icon={IconLogIn} onClick={close}>
                  Нэвтрэх
                </MenuButton>
              </SignInButton>
              <SignUpButton>
                <MenuButton icon={IconPlus} onClick={close}>
                  Бүртгүүлэх
                </MenuButton>
              </SignUpButton>
              <Divider />
              <SectionLabel>Хэрэглэгчийн цэс</SectionLabel>
              {USER_LINKS.map((l) => (
                <MenuLink key={l.href} {...l} active={pathname.startsWith(l.href)} onClick={close} />
              ))}
              <ThemeRow />
            </>
          )}
        </div>
      )}

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`${name} — хэрэглэгчийн цэс`}
        title={collapsed ? name : undefined}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "group flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-left lg:collapsed:justify-center lg:collapsed:px-0 ring-1 ring-inset transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-lime",
          open || onMenuPage
            ? "bg-white/[0.07] ring-white/[0.08]"
            : "ring-transparent hover:bg-white/[0.05]",
        )}
      >
        {isLoaded ? (
          <Avatar src={isSignedIn ? user.imageUrl : null} name={name} className="size-8" />
        ) : (
          <span className="size-8 shrink-0 rounded-full bg-white/10" />
        )}
        <span className="min-w-0 flex-1 lg:collapsed:hidden">
          <span className="block truncate text-sm font-medium text-white">{name}</span>
          <span
            className={cn(
              "block truncate font-mono text-[10px] uppercase leading-4 tracking-[0.12em]",
              isAdmin || plan === "plus" ? "text-lime" : "text-white/40",
            )}
          >
            {!isLoaded ? "…" : !isSignedIn ? "Нэвтрэх" : isAdmin ? `${ROLE_LABELS.admin} · Plus` : PLAN_LABELS[plan]}
          </span>
        </span>
        <IconChevronsUpDown className="size-4 shrink-0 text-white/35 transition-colors group-hover:text-white/70 lg:collapsed:hidden" />
      </button>
    </div>
  );
}

function RolePill({ role, className }: { role: Role; className?: string }) {
  return (
    <MonoLabel
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] tracking-[0.1em]",
        role === "admin" ? "bg-lime text-ink" : "bg-white/[0.08] text-white/60",
        className,
      )}
    >
      {role === "admin" && <IconShield className="size-3" />}
      {ROLE_LABELS[role]}
    </MonoLabel>
  );
}

function ThemeRow() {
  return (
    <div className="flex items-center justify-between gap-2 py-1 pl-2.5 pr-1">
      <span className="flex min-w-0 items-center gap-2.5 whitespace-nowrap text-[13px] text-white/75">
        <IconMoon className="size-4 shrink-0 text-white/45" /> Өнгөний горим
      </span>
      <ThemeSwitch inMenu />
    </div>
  );
}

function Divider() {
  return <div role="separator" className="mx-1 my-1.5 h-px bg-white/[0.07]" />;
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <MonoLabel className="block px-2.5 pb-1 pt-1 text-[10px] text-white/35">{children}</MonoLabel>;
}

const ITEM =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-white/75 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:bg-white/[0.08] focus-visible:text-white";

function MenuLink({
  href,
  label,
  icon: Icon,
  active,
  admin,
  onClick,
}: {
  href: string;
  label: string;
  icon: Icon;
  active: boolean;
  admin?: boolean;
  onClick: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={cn(ITEM, active && "text-white")}
    >
      <Icon className={cn("size-4 shrink-0", admin ? "text-lime/85" : "text-white/45")} />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {active && <span aria-hidden="true" className="size-1.5 rounded-full bg-lime" />}
    </Link>
  );
}

function MenuButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: Icon;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={ITEM}>
      <Icon className="size-4 shrink-0 text-white/45" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}
