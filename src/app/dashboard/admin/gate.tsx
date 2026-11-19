"use client";

import { SignInButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { IconAlert, IconShield } from "@/components/icons";
import { PlusBadge } from "@/components/plus";
import { Badge, Button, ButtonLink, Card, cn, EmptyState } from "@/components/ui";
import { PLAN_LABELS, type Plan } from "@/lib/plan";
import { ROLE_LABELS, roleOf, type AdminUser, type Role } from "@/lib/roles";

/**
 * Админ хуудсуудыг зөвхөн админд харуулна. Энэ нь зөвхөн дэлгэцийн хамгаалалт —
 * жинхэнэ шалгалт /api/admin/* дээр серверт хийгдэнэ (src/lib/admin.ts).
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return <Card className="h-64 animate-pulse bg-zinc-900/[0.03]">{null}</Card>;
  }
  if (!isSignedIn) {
    return (
      <Card>
        <EmptyState
          icon={IconShield}
          title="Админ хэсэгт нэвтэрнэ үү"
          description="Энэ хэсгийг админ эрхтэй бүртгэлээр нэвтэрсний дараа үзнэ."
          action={
            <SignInButton>
              <Button>Нэвтрэх</Button>
            </SignInButton>
          }
        />
      </Card>
    );
  }
  if (roleOf(user.publicMetadata) !== "admin") {
    return (
      <Card>
        <EmptyState
          icon={IconShield}
          title="Зөвхөн админд нээлттэй"
          description="Таны бүртгэл энгийн хэрэглэгчийн эрхтэй. Админ эрхийг одоогийн админ “Хэрэглэгчид” хуудаснаас, эсвэл Clerk Dashboard-аас олгоно."
          action={
            <ButtonLink href="/dashboard" variant="secondary">
              Хянах самбар руу буцах
            </ButtonLink>
          }
        />
      </Card>
    );
  }
  return children;
}

const TABS = [
  { href: "/dashboard/admin", label: "Тойм" },
  { href: "/dashboard/admin/users", label: "Хэрэглэгчид" },
];

export function AdminTabs() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Админ хэсэг"
      className="inline-flex gap-1 rounded-full bg-zinc-900/[0.05] p-1 ring-1 ring-inset ring-zinc-900/[0.04]"
    >
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
              active ? "bg-zinc-900 text-zinc-50 shadow-sm" : "text-zinc-500 hover:bg-surface/70 hover:text-zinc-900",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Гарчгийн дээрх жижиг "Админ" шошго */
export function AdminEyebrow() {
  return (
    <div className="mb-3">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-lime ring-1 ring-inset ring-white/10">
        <IconShield className="size-3.5" /> Админ цэс
      </span>
    </div>
  );
}

/** Админ автоматаар Plus */
export function effectivePlan(u: AdminUser): Plan {
  return u.role === "admin" ? "plus" : u.plan;
}

export function PlanBadge({ user }: { user: AdminUser }) {
  if (effectivePlan(user) === "free") return <Badge>{PLAN_LABELS.free}</Badge>;
  return (
    <span className="inline-flex items-center gap-1.5">
      <PlusBadge className="py-0.5" />
      {user.role === "admin" && <span className="text-[11px] text-zinc-400">админ</span>}
    </span>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return role === "admin" ? (
    <Badge tone="brand">
      <IconShield className="size-3" /> {ROLE_LABELS.admin}
    </Badge>
  ) : (
    <Badge>{ROLE_LABELS.user}</Badge>
  );
}

export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200/70">
      <IconAlert className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      <Button variant="secondary" size="sm" onClick={onRetry}>
        Дахин ачаалах
      </Button>
    </div>
  );
}
