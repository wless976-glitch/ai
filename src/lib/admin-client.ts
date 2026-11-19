"use client";

import { useCallback, useEffect, useState } from "react";
import type { Plan } from "./plan";
import type { AdminUser, AdminUserList, Role } from "./roles";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!res.ok || !body) throw new Error(body?.error || "Сервертэй холбогдож чадсангүй.");
  return body;
}

/** Эрх ({ role }) эсвэл багц ({ plan }) солино */
export function updateUser(id: string, change: { role: Role } | { plan: Plan }) {
  return call<{ user: AdminUser }>(`/api/admin/users/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(change),
  }).then((r) => r.user);
}

/** Админ хуудсуудад хэрэглэгчдийн жагсаалт. `replace` нь эрх солисны дараа нэг мөрийг шинэчилнэ. */
export function useAdminUsers() {
  const [list, setList] = useState<AdminUserList | null>(null);
  /** Жагсаалт ирсэн мөч — "x өдрийн өмнө"-г тооцоход (render дотор Date.now() дуудахгүйн тулд) */
  const [fetchedAt, setFetchedAt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    call<AdminUserList>("/api/admin/users")
      .then((l) => {
        if (!alive) return;
        setList(l);
        setFetchedAt(Date.now());
        setError(null);
      })
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [version]);

  const reload = useCallback(() => {
    setError(null);
    setVersion((v) => v + 1);
  }, []);

  const replace = useCallback((user: AdminUser) => {
    setList((l) => (l ? { ...l, users: l.users.map((u) => (u.id === user.id ? user : u)) } : l));
  }, []);

  return { list, fetchedAt, error, reload, replace };
}

/** "5 минутын өмнө", "3 өдрийн өмнө" гэх мэт */
export function timeAgo(ms: number | null, now: number) {
  if (!ms) return "Хэзээ ч";
  const min = Math.round((now - ms) / 60000);
  if (min < 1) return "Дөнгөж сая";
  if (min < 60) return `${min} минутын өмнө`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} цагийн өмнө`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} өдрийн өмнө`;
  const dt = new Date(ms);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
