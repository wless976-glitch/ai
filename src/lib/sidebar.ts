"use client";

import { useSyncExternalStore } from "react";

/**
 * Хажуу цэсний төлөв, хоёулаа <html data-*> дээр (layout.tsx-ийн эхний script hydration-оос өмнө
 * сэргээнэ — анивчихгүй), CSS нь `collapsed:` / `daily:` variant-аар харуулна.
 *
 * - data-sidebar="collapsed": том дэлгэцэнд хажуу цэсийг дүрс төдий болгож хураана
 * - data-daily="on": "Өдөр тутам" горим (Claude-ийн Chat / Code шиг). Үгүй бол "Яриа" горим.
 *   Горимын хуудсанд (чат эсвэл хянах самбар г.м.) байхад тэр горим автоматаар сонгогдоно,
 *   бусад хуудсанд сүүлд сонгосон горим үлдэнэ.
 */
const SIDEBAR_KEY = "tg-sidebar";
const MODE_KEY = "tg-mode";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const store = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Хадгалж чадахгүй ч энэ хуудсанд ажиллана
  }
};

/* ---------- Хураах ---------- */

const isCollapsed = () => document.documentElement.dataset.sidebar === "collapsed";

export function toggleSidebar() {
  const next = !isCollapsed();
  if (next) document.documentElement.dataset.sidebar = "collapsed";
  else delete document.documentElement.dataset.sidebar;
  store(SIDEBAR_KEY, next ? "collapsed" : null);
  emit();
}

export function useSidebarCollapsed() {
  return useSyncExternalStore(subscribe, isCollapsed, () => false);
}

/* ---------- Горим: Яриа / Өдөр тутам ---------- */

export type SidebarMode = "chat" | "daily";

/** Горимын эхлэл хуудас — горимын товч дарахад энд очно */
export const MODE_HOME: Record<SidebarMode, string> = { chat: "/dashboard/ask", daily: "/dashboard" };

/** Энэ зам аль горимд хамаарах вэ (Студи, Тохиргоо г.м. аль алинд нь биш бол null) */
export function modeForPath(path: string): SidebarMode | null {
  if (path.startsWith("/dashboard/ask")) return "chat";
  if (path === "/dashboard" || /^\/dashboard\/(create|calendar|analytics)(\/|$)/.test(path)) return "daily";
  return null;
}

const currentMode = (): SidebarMode => (document.documentElement.dataset.daily === "on" ? "daily" : "chat");

export function setSidebarMode(mode: SidebarMode) {
  store(MODE_KEY, mode);
  if (mode === currentMode()) return;
  if (mode === "daily") document.documentElement.dataset.daily = "on";
  else delete document.documentElement.dataset.daily;
  emit();
}

export function useSidebarMode(): SidebarMode {
  return useSyncExternalStore(subscribe, currentMode, () => "chat");
}
