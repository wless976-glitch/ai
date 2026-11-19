"use client";

/**
 * Тест горимын клиент талын state.
 * Пост, бизнесийн мэдээлэл, тохиргоо зэрэг өгөгдөл browser-ийн localStorage-д хадгалагдана —
 * refresh хийсэн ч алга болохгүй. Тохиргоо → "Жишээ өгөгдөл рүү буцаах"-аар анхны байдалд орно.
 * Дараа нь API / өгөгдлийн сангийн дуудлагаар солино.
 */
import { createContext, use, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { defaultModels, type AiStatus } from "./ai-models";
import { fetchAiStatus, onAiIssue } from "./ai-client";
import { BUSINESS, INITIAL_POSTS, SETTINGS } from "./mock-data";
import type { AutomationSettings, BusinessProfile, Connections, Platform, Post } from "./types";

export type ToastTone = "success" | "info" | "error";
export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

/* ---------------- Хадгалагдах өгөгдөл (localStorage) ---------------- */

interface Data {
  posts: Post[];
  business: BusinessProfile;
  connections: Connections;
  settings: AutomationSettings;
  readGuides: string[];
  /** Хянах самбарын "Эхлэх алхмууд" картыг нуусан эсэх */
  onboardingHidden: boolean;
}

const STORAGE_KEY = "tugee:data:v1";

/** Серверийн render болон анхны hydration энэ тогтмол объектыг ашиглана */
const DEFAULT_DATA: Data = {
  posts: INITIAL_POSTS,
  business: BUSINESS,
  connections: { facebook: true, instagram: true },
  settings: SETTINGS,
  readGuides: ["connect-tugee"],
  onboardingHidden: false,
};

let data: Data | null = null;
const listeners = new Set<() => void>();

function readStorage(): Data {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_DATA;
    const saved = JSON.parse(raw) as Partial<Data>;
    return {
      posts: Array.isArray(saved.posts) ? saved.posts : DEFAULT_DATA.posts,
      business: { ...DEFAULT_DATA.business, ...saved.business },
      connections: { ...DEFAULT_DATA.connections, ...saved.connections },
      settings: { ...DEFAULT_DATA.settings, ...saved.settings },
      readGuides: Array.isArray(saved.readGuides) ? saved.readGuides : DEFAULT_DATA.readGuides,
      onboardingHidden: saved.onboardingHidden === true,
    };
  } catch {
    return DEFAULT_DATA;
  }
}

/** blob: URL нь хуудас хаагдахад хүчингүй болдог тул хадгалахгүй — жишээ дүрс рүү буцна */
function withoutBlobUrls(posts: Post[]): Post[] {
  return posts.map((p) => {
    const { imageUrl, videoUrl } = p.visual;
    if (!imageUrl?.startsWith("blob:") && !videoUrl?.startsWith("blob:")) return p;
    return {
      ...p,
      visual: {
        ...p.visual,
        imageUrl: imageUrl?.startsWith("blob:") ? undefined : imageUrl,
        videoUrl: videoUrl?.startsWith("blob:") ? undefined : videoUrl,
      },
    };
  });
}

function writeStorage(next: Data) {
  try {
    if (next === DEFAULT_DATA) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...next, posts: withoutBlobUrls(next.posts) }));
  } catch {
    // Хувийн цонх, дүүрсэн storage — санах ойд үргэлжлүүлэн ажиллана
  }
}

function getData(): Data {
  data ??= readStorage();
  return data;
}

function emit() {
  listeners.forEach((l) => l());
}

function update(fn: (d: Data) => Data) {
  data = fn(getData());
  writeStorage(data);
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Өөр tab дээр өөрчлөгдвөл энд ч шинэчлэгдэнэ
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    data = readStorage();
    emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const getServerData = () => DEFAULT_DATA;

/* ---------------- Store ---------------- */

interface Store extends Data {
  toasts: Toast[];
  /** Hugging Face холболтын төлөв (null = шалгаж байна) */
  ai: AiStatus | null;
  /** Холбогдсон платформууд (пост үүсгэхэд анхдагч сонголт) */
  connectedPlatforms: Platform[];
  addPosts: (posts: Post[]) => void;
  updatePost: (id: string, patch: Partial<Post>) => void;
  setBusiness: (b: BusinessProfile) => void;
  setConnections: (c: Connections) => void;
  setSettings: (s: AutomationSettings) => void;
  toggleGuideRead: (id: string) => void;
  setOnboardingHidden: (hidden: boolean) => void;
  resetData: () => void;
  notify: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
}

const StoreContext = createContext<Store | null>(null);

let toastSeq = 0;

export function StoreProvider({ children }: { children: ReactNode }) {
  const current = useSyncExternalStore(subscribe, getData, getServerData);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ai, setAi] = useState<AiStatus | null>(null);

  useEffect(() => {
    let alive = true;
    fetchAiStatus()
      .then((s) => alive && setAi(s))
      .catch(() => alive && setAi({ connected: false, models: defaultModels(), ollama: { reachable: false } }));
    // AI дуудлагын үр дүнгээр (жишээ нь 402 — кредит дууссан) төлөвийг шууд шинэчилнэ
    const off = onAiIssue((issue) => setAi((prev) => (prev ? { ...prev, issue } : prev)));
    return () => {
      alive = false;
      off();
    };
  }, []);

  function dismissToast(id: number) {
    setToasts((t) => t.filter((x) => x.id !== id));
  }

  function notify(message: string, tone: ToastTone = "success") {
    toastSeq += 1;
    const id = toastSeq;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    window.setTimeout(() => dismissToast(id), 3500);
  }

  const connectedPlatforms = (["facebook", "instagram"] as Platform[]).filter((p) => current.connections[p]);

  const value: Store = {
    ...current,
    toasts,
    ai,
    connectedPlatforms,
    addPosts: (next) => update((d) => ({ ...d, posts: [...d.posts, ...next] })),
    updatePost: (id, patch) =>
      update((d) => ({ ...d, posts: d.posts.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
    setBusiness: (business) => update((d) => ({ ...d, business })),
    setConnections: (connections) => update((d) => ({ ...d, connections })),
    setSettings: (settings) => update((d) => ({ ...d, settings })),
    toggleGuideRead: (id) =>
      update((d) => ({
        ...d,
        readGuides: d.readGuides.includes(id) ? d.readGuides.filter((g) => g !== id) : [...d.readGuides, id],
      })),
    setOnboardingHidden: (onboardingHidden) => update((d) => ({ ...d, onboardingHidden })),
    resetData: () => update(() => DEFAULT_DATA),
    notify,
    dismissToast,
  };

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore() {
  const ctx = use(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
