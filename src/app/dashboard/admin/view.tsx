"use client";

import type { ReactNode } from "react";
import { Avatar } from "@/components/avatar";
import { IconAlert, IconFacebook, IconInstagram, IconShield, IconSparkles, IconTrendingUp, IconUsers, IconWand } from "@/components/icons";
import { StatTile } from "@/components/stat-tile";
import { Badge, ButtonLink, Card, CardHeader, PageHeader } from "@/components/ui";
import { timeAgo, useAdminUsers } from "@/lib/admin-client";
import { useStore } from "@/lib/store";
import { AdminEyebrow, AdminTabs, effectivePlan, LoadError, PlanBadge, RoleBadge } from "./gate";

const WEEK = 7 * 24 * 60 * 60 * 1000;

export function AdminOverview() {
  const { list, fetchedAt, error, reload } = useAdminUsers();
  const users = list?.users ?? [];
  const admins = users.filter((u) => u.role === "admin").length;
  const plusUsers = users.filter((u) => effectivePlan(u) === "plus").length;
  const newThisWeek = users.filter((u) => u.createdAt > fetchedAt - WEEK).length;
  const activeThisWeek = users.filter((u) => (u.lastActiveAt ?? 0) > fetchedAt - WEEK).length;
  const value = (n: number) => (list ? n : "—");

  return (
    <>
      <AdminEyebrow />
      <PageHeader
        title="Админ самбар"
        description="Хэдэн хэрэглэгч бүртгүүлсэн, хэн идэвхтэй байгаа, систем хэвийн ажиллаж байгаа эсэхийг эндээс харна."
        actions={<AdminTabs />}
      />

      {error && <LoadError message={error} onRetry={reload} />}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={IconUsers} tone="zinc" label="Нийт хэрэглэгч" value={value(list?.total ?? 0)} />
        <StatTile
          icon={IconShield}
          tone="brand"
          label="Plus багц"
          value={value(plusUsers)}
          sub={list ? `${admins} нь админ` : undefined}
        />
        <StatTile icon={IconSparkles} tone="violet" label="Шинэ · 7 хоног" value={value(newThisWeek)} />
        <StatTile icon={IconTrendingUp} tone="emerald" label="Идэвхтэй · 7 хоног" value={value(activeThisWeek)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={IconUsers}
            title="Сүүлд нэгдсэн хэрэглэгчид"
            description="Шинээр бүртгүүлсэн 5 хэрэглэгч"
            action={
              <ButtonLink href="/dashboard/admin/users" variant="secondary" size="sm">
                Бүгдийг харах
              </ButtonLink>
            }
          />
          <ul className="mt-3 divide-y divide-zinc-900/[0.06] px-5 pb-3">
            {!list &&
              !error &&
              Array.from({ length: 3 }, (_, i) => (
                <li key={i} className="flex items-center gap-3 py-3">
                  <span className="size-9 animate-pulse rounded-full bg-zinc-900/[0.06]" />
                  <span className="h-3.5 w-40 animate-pulse rounded-full bg-zinc-900/[0.06]" />
                </li>
              ))}
            {users.slice(0, 5).map((u) => (
              <li key={u.id} className="flex items-center gap-3 py-3">
                <Avatar src={u.imageUrl} name={u.name} className="size-9" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {u.name}
                    {u.id === list?.me && <span className="ml-1.5 text-xs font-normal text-zinc-400">(Та)</span>}
                  </p>
                  <p className="truncate text-xs text-zinc-500">{u.email ?? "Имэйлгүй"}</p>
                </div>
                <span className="flex shrink-0 flex-wrap justify-end gap-1">
                  <RoleBadge role={u.role} />
                  <PlanBadge user={u} />
                </span>
                <span className="hidden w-28 shrink-0 text-right text-xs text-zinc-400 sm:block">
                  {timeAgo(u.createdAt, fetchedAt)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <SystemStatus />
      </div>
    </>
  );
}

function SystemStatus() {
  const { ai } = useStore();
  const aiState: [ReactNode, string] = !ai
    ? [<Badge key="c">Шалгаж байна…</Badge>, "—"]
    : !ai.connected
      ? [<Badge key="n" tone="amber">Холбогдоогүй</Badge>, "HF_TOKEN тохируулаагүй — жишээ текст гарна"]
      : ai.issue
        ? [
            <Badge key="i" tone="rose">
              <IconAlert className="size-3" /> {ai.issue === "no_credits" ? "Кредит дууссан" : "Токен буруу"}
            </Badge>,
            ai.models.text,
          ]
        : [<Badge key="o" tone="emerald">Холбогдсон</Badge>, ai.models.text];

  return (
    <Card>
      <CardHeader icon={IconWand} title="Системийн төлөв" description="Гадны үйлчилгээний холболт" />
      <dl className="mt-3 divide-y divide-zinc-900/[0.06] px-5 pb-4">
        <StatusRow label="Нэвтрэлт (Clerk)" detail="Хэрэглэгчийн бүртгэл, эрх">
          <Badge tone="emerald">Холбогдсон</Badge>
        </StatusRow>
        <StatusRow label="AI (Hugging Face)" detail={aiState[1]}>
          {aiState[0]}
        </StatusRow>
        <StatusRow
          label={
            <span className="inline-flex items-center gap-1.5">
              <IconFacebook className="size-3.5 text-fb" />
              <IconInstagram className="size-3.5 text-ig" /> Meta API
            </span>
          }
          detail="Пост бодитоор нийтлэгдэхгүй"
        >
          <Badge tone="amber">Тест горим</Badge>
        </StatusRow>
      </dl>
      <div className="border-t border-dashed border-zinc-900/15 px-5 py-3">
        <ButtonLink href="/dashboard/settings#ai" variant="ghost" size="sm" className="-ml-3">
          AI тохиргоо руу очих
        </ButtonLink>
      </div>
    </Card>
  );
}

function StatusRow({ label, detail, children }: { label: ReactNode; detail: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <dt className="text-sm font-medium text-zinc-900">{label}</dt>
        <dd className="truncate text-xs text-zinc-500">{detail}</dd>
      </div>
      <dd className="shrink-0">{children}</dd>
    </div>
  );
}
