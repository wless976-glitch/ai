"use client";

import { useSyncExternalStore } from "react";

/**
 * Хянах самбарын өнгөний горим. "system" нь үйлдлийн системийн тохиргоог дагана.
 * Сонголтыг тухайн хөтөч дээр localStorage-д хадгална; <html data-theme>-ийг анх
 * layout.tsx-ийн script тавьдаг тул энд зөвхөн дараагийн өөрчлөлтийг хэрэгжүүлнэ.
 */
export type ThemePref = "light" | "dark" | "system";

const KEY = "tg-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia(DARK_QUERY).matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function setThemePref(pref: ThemePref) {
  try {
    if (pref === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    // Хадгалж чадахгүй ч энэ хуудсанд горим солигдоно
  }
  apply(pref);
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const mq = matchMedia(DARK_QUERY);
  // Систем горимд байхад үйлдлийн систем солигдвол дагана
  const onSystem = () => {
    if (readPref() === "system") apply("system");
    onChange();
  };
  // Өөр таб дээр сольсон бол энд ч мөн адил
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    apply(readPref());
    onChange();
  };
  mq.addEventListener("change", onSystem);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    mq.removeEventListener("change", onSystem);
    window.removeEventListener("storage", onStorage);
  };
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(subscribe, readPref, () => "system");
}
