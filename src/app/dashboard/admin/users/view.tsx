"use client";

import { useState } from "react";
import { Avatar } from "@/components/avatar";
import { IconSearch, IconShield, IconSparkles, IconUsers } from "@/components/icons";
import { Modal } from "@/components/modal";
import { Badge, Button, Card, EmptyState, inputClass, PageHeader, Segmented } from "@/components/ui";
import { timeAgo, updateUser, useAdminUsers } from "@/lib/admin-client";
import { MONTHLY_POSTS, type Plan } from "@/lib/plan";
import type { AdminUser, Role } from "@/lib/roles";
import { useStore } from "@/lib/store";
import { AdminEyebrow, AdminTabs, LoadError, PlanBadge, RoleBadge, effectivePlan } from "../gate";

type Filter = "all" | "admin" | Plan;
type Change = { role: Role } | { plan: Plan };

/** Баталгаажуулах цонхны гарчиг, тайлбар, товч, амжилтын мэдэгдэл */
function describe(change: Change, name: string) {
  if ("role" in change) {
    return change.role === "admin"
      ? {
          title: "Админ эрх олгох уу?",
          body: "Энэ хэрэглэгч админ цэсийг харж, бүх хэрэглэгчийн жагсаалтыг үзэж, бусдын эрх, багцыг өөрчлөх боломжтой болно. Админ автоматаар Plus-ийн бүх боломжийг ашиглана.",
          action: "Админ болгох",
          done: `${name} админ боллоо.`,
          danger: false,
        }
      : {
          title: "Админ эрхийг хасах уу?",
          body: "Энэ хэрэглэгч энгийн хэрэглэгч болж, админ цэс, админ хуудсууд түүнд харагдахаа болино. Багц нь тусгайлан олгосон хэвээр үлдэнэ.",
          action: "Эрхийг хасах",
          done: `${name}-ийн админ эрхийг хаслаа.`,
          danger: true,
        };
  }
  return change.plan === "plus"
    ? {
        title: "Plus багц олгох уу?",
        body: `Энэ хэрэглэгч зураг, видео үүсгэх, сард ${MONTHLY_POSTS.plus} пост, пост бүрийн статистик, хязгааргүй AI зэрэг Plus-ийн бүх боломжийг ашиглана. Тест горимд төлбөр авахгүй.`,
        action: "Plus олгох",
        done: `${name}-д Plus багц олголоо.`,
        danger: false,
      }
    : {
        title: "Plus багцыг хасах уу?",
        body: `Энэ хэрэглэгч Үнэгүй багц руу шилжинэ: зураг, видео үүсгэх түгжигдэж, сард ${MONTHLY_POSTS.free} пост, өдрийн AI хязгаар үйлчилнэ.`,
        action: "Plus хасах",
        done: `${name}-ийн Plus багцыг хаслаа.`,
        danger: true,
      };
}

export function AdminUsersView() {
  const { notify } = useStore();
  const { list, fetchedAt, error, reload, replace } = useAdminUsers();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  /** Баталгаажуулж буй өөрчлөлт: хэрэглэгч ба шинэ эрх эсвэл багц */
  const [pending, setPending] = useState<{ user: AdminUser; change: Change } | null>(null);
  const [saving, setSaving] = useState(false);

  const users = list?.users ?? [];
  const matches = (u: AdminUser, f: Filter) => f === "all" || (f === "admin" ? u.role === "admin" : effectivePlan(u) === f);
  const count = (f: Filter) => users.filter((u) => matches(u, f)).length;
  const q = query.trim().toLowerCase();
  const shown = users.filter(
    (u) => matches(u, filter) && (!q || u.name.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)),
  );
  const text = pending ? describe(pending.change, pending.user.name) : null;

  async function confirm() {
    if (!pending || !text) return;
    setSaving(true);
    try {
      replace(await updateUser(pending.user.id, pending.change));
      notify(text.done);
      setPending(null);
    } catch (e) {
      notify((e as Error).message, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AdminEyebrow />
      <PageHeader
        title="Хэрэглэгчид, эрх"
        description="Хэн админ, хэн Plus багцтай болохыг эндээс тохируулна. Админ нь энэ хэсгийг үзэж, бусдын эрх, багцыг өөрчилж чадна."
        actions={<AdminTabs />}
      />

      {error && <LoadError message={error} onRetry={reload} />}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-xs">
          <span className="sr-only">Хэрэглэгч хайх</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Нэр эсвэл имэйлээр хайх"
            className={`${inputClass} h-10 pl-9`}
          />
        </label>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `Бүгд · ${users.length}` },
            { value: "admin", label: `Админ · ${count("admin")}` },
            { value: "plus", label: `Plus · ${count("plus")}` },
            { value: "free", label: `Үнэгүй · ${count("free")}` },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {!list && !error ? (
          <div className="divide-y divide-zinc-900/[0.06]">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-4">
                <span className="size-9 animate-pulse rounded-full bg-zinc-900/[0.06]" />
                <span className="h-3.5 w-48 animate-pulse rounded-full bg-zinc-900/[0.06]" />
              </div>
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon={IconUsers}
            title={q || filter !== "all" ? "Илэрц олдсонгүй" : "Хэрэглэгч алга"}
            description={q || filter !== "all" ? "Хайлт эсвэл шүүлтүүрээ өөрчилж үзнэ үү." : undefined}
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-900/[0.06] bg-zinc-900/[0.02]">
              <tr className="whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.1em] text-zinc-500">
                <th scope="col" className="px-5 py-2.5 font-normal">Хэрэглэгч</th>
                <th scope="col" className="hidden px-3 py-2.5 font-normal sm:table-cell">Эрх</th>
                <th scope="col" className="hidden px-3 py-2.5 font-normal sm:table-cell">Багц</th>
                <th scope="col" className="hidden px-3 py-2.5 font-normal xl:table-cell">Бүртгүүлсэн</th>
                <th scope="col" className="hidden px-3 py-2.5 font-normal xl:table-cell">Сүүлд идэвхтэй</th>
                <th scope="col" className="px-5 py-2.5 text-right font-normal">
                  <span className="sr-only">Үйлдэл</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900/[0.06]">
              {shown.map((u) => {
                const isMe = u.id === list?.me;
                const isAdmin = u.role === "admin";
                return (
                  <tr key={u.id} className="transition-colors hover:bg-zinc-900/[0.015]">
                    <td className="w-full max-w-0 px-5 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={u.imageUrl} name={u.name} className="size-9" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 font-medium text-zinc-900">
                            <span className="truncate">{u.name}</span>
                            {isMe && <Badge className="shrink-0 py-0 text-[11px]">Та</Badge>}
                            {u.banned && (
                              <Badge tone="rose" className="shrink-0 py-0 text-[11px]">
                                Хаагдсан
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-xs text-zinc-500">{u.email ?? "Имэйлгүй"}</p>
                          {/* Нарийн дэлгэцэнд эрх, багцын багана нуугдах тул энд харуулна */}
                          <div className="mt-1 flex flex-wrap gap-1 sm:hidden">
                            <RoleBadge role={u.role} />
                            <PlanBadge user={u} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 sm:table-cell">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 sm:table-cell">
                      <PlanBadge user={u} />
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-zinc-500 xl:table-cell">
                      {timeAgo(u.createdAt, fetchedAt)}
                    </td>
                    <td className="hidden whitespace-nowrap px-3 py-3 text-xs text-zinc-500 xl:table-cell">
                      {timeAgo(u.lastActiveAt, fetchedAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col items-end gap-1.5 md:flex-row md:justify-end">
                        {/* Админ автоматаар Plus тул багцын товч хэрэггүй */}
                        {!isAdmin &&
                          (u.plan === "plus" ? (
                            <Button variant="ghost" size="sm" onClick={() => setPending({ user: u, change: { plan: "free" } })}>
                              Plus хасах
                            </Button>
                          ) : (
                            <Button variant="secondary" size="sm" onClick={() => setPending({ user: u, change: { plan: "plus" } })}>
                              <IconSparkles className="size-3.5" /> Plus олгох
                            </Button>
                          ))}
                        {isMe ? (
                          <span className="hidden whitespace-nowrap text-xs text-zinc-400 sm:inline">Таны бүртгэл</span>
                        ) : isAdmin ? (
                          <Button variant="danger" size="sm" onClick={() => setPending({ user: u, change: { role: "user" } })}>
                            Эрх хасах
                          </Button>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={() => setPending({ user: u, change: { role: "admin" } })}>
                            <IconShield className="size-3.5" /> Админ болгох
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {list && list.total > users.length && (
        <p className="mt-3 text-xs text-zinc-400">
          Сүүлд бүртгүүлсэн {users.length} хэрэглэгчийг харуулж байна (нийт {list.total}).
        </p>
      )}

      <Modal
        open={!!pending}
        onClose={() => !saving && setPending(null)}
        title={text?.title ?? ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPending(null)} disabled={saving}>
              Болих
            </Button>
            <Button variant={text?.danger ? "danger" : "primary"} onClick={confirm} disabled={saving}>
              {saving ? "Хадгалж байна…" : text?.action}
            </Button>
          </>
        }
      >
        {pending && text && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-zinc-900/[0.03] p-3 ring-1 ring-inset ring-zinc-900/[0.06]">
              <Avatar src={pending.user.imageUrl} name={pending.user.name} className="size-10" />
              <div className="min-w-0">
                <p className="truncate font-medium text-zinc-900">{pending.user.name}</p>
                <p className="truncate text-xs text-zinc-500">{pending.user.email ?? "Имэйлгүй"}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600">{text.body}</p>
          </div>
        )}
      </Modal>
    </>
  );
}
