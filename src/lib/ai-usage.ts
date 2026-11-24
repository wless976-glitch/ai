"use client";

import { useSyncExternalStore } from "react";
import { AI_USAGE_OPTIONS, DEFAULT_AI_USAGE, type AiUsage } from "./ai-models";

/** AI хэрэглээний түвшин — тухайн хөтөч дээр хадгална (Тохиргоо → AI хэрэглээ) */
const KEY = "tg-ai-usage";
const listeners = new Set<() => void>();

export function getAiUsage(): AiUsage {
  try {
    const v = localStorage.getItem(KEY);
    // Унтраасан горим (жишээ нь өмнө хадгалсан "Хэмнэлттэй") хадгалагдсан байвал үндсэн горимоор ажиллана
    return v && AI_USAGE_OPTIONS.includes(v as AiUsage) ? (v as AiUsage) : DEFAULT_AI_USAGE;
  } catch {
    return DEFAULT_AI_USAGE;
  }
}

export function setAiUsage(usage: AiUsage) {
  try {
    if (usage === DEFAULT_AI_USAGE) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, usage);
  } catch {
    // Хадгалж чадахгүй ч энэ хуудсанд ажиллана
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAiUsage(): AiUsage {
  return useSyncExternalStore(subscribe, getAiUsage, () => DEFAULT_AI_USAGE);
}
