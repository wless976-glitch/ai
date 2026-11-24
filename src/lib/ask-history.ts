"use client";

import { useSyncExternalStore } from "react";
import type { KnowledgeSource } from "./academy/knowledge";

/**
 * "AI-аас асуух" ярианы түүх — олон яриа, тухайн хөтөч дээр localStorage-д хадгална.
 * Аль яриа нээлттэй байгааг (current) sessionStorage-д хадгалдаг тул tab бүр өөр яриа нээж болно,
 * хуудсаа сэргээхэд нээлттэй яриа хэвээр үлдэнэ. Сервер дээр үргэлж хоосон.
 *
 * `current` нь үргэлж id-тай: шинэ яриа эхлэхэд id үүсгэх ч мессежгүй бол жагсаалтад орохгүй.
 */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** AI хариултад ашигласан Сургалтын хичээлүүд — хариултын доор холбоос болж харагдана */
  sources?: KnowledgeSource[];
}

export interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messages: ChatMessage[];
}

interface State {
  current: string;
  chats: Conversation[];
}

const KEY = "tg-ask-chats";
/** Өмнөх хувилбар нэг л яриа хадгалдаг байсан — анх ачаалахад шинэ бүтэц рүү шилжүүлнэ */
const OLD_KEY = "tg-ask-chat";
const CURRENT_KEY = "tg-ask-current";
const MAX_CHATS = 30;
const MAX_MESSAGES = 40;
const EMPTY: ChatMessage[] = [];
const SERVER: State = { current: "", chats: [] };

const listeners = new Set<() => void>();
let state: State | null = null;

export const newMessageId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const validMessage = (m: unknown): m is ChatMessage =>
  !!m &&
  typeof m === "object" &&
  typeof (m as ChatMessage).id === "string" &&
  ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
  typeof (m as ChatMessage).content === "string";

/** Эхний асуултаас гарчиг гаргана */
function titleOf(messages: ChatMessage[]) {
  const first = messages.find((m) => m.role === "user")?.content.replace(/\s+/g, " ").trim() ?? "";
  if (!first) return "Шинэ яриа";
  return first.length > 48 ? `${first.slice(0, 47).trimEnd()}…` : first;
}

function readChats(): Conversation[] {
  let chats: Conversation[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (Array.isArray(parsed)) {
      chats = parsed
        .filter((c): c is Conversation => !!c && typeof c === "object" && typeof c.id === "string" && Array.isArray(c.messages))
        .map((c) => ({
          id: c.id,
          title: typeof c.title === "string" && c.title ? c.title : titleOf(c.messages),
          updatedAt: typeof c.updatedAt === "number" ? c.updatedAt : 0,
          messages: c.messages.filter(validMessage).slice(-MAX_MESSAGES),
        }))
        .filter((c) => c.messages.length > 0);
    }
    const old: unknown = JSON.parse(localStorage.getItem(OLD_KEY) ?? "null");
    if (Array.isArray(old)) {
      const messages = old.filter(validMessage).slice(-MAX_MESSAGES);
      if (messages.length) chats.push({ id: newMessageId(), title: titleOf(messages), updatedAt: Date.now(), messages });
      localStorage.removeItem(OLD_KEY);
      localStorage.setItem(KEY, JSON.stringify(chats));
    }
  } catch {
    // Эвдэрсэн өгөгдөл — хоосноор эхэлнэ
  }
  return chats.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, MAX_CHATS);
}

function readCurrent() {
  try {
    return sessionStorage.getItem(CURRENT_KEY) || newMessageId();
  } catch {
    return newMessageId();
  }
}

function getState(): State {
  state ??= { current: readCurrent(), chats: readChats() };
  return state;
}

function write(next: State) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next.chats));
    sessionStorage.setItem(CURRENT_KEY, next.current);
  } catch {
    // Хадгалж чадахгүй ч энэ хуудсанд яриа үргэлжилнэ
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Өөр tab дээр яриа нэмэгдэх/устгагдахад жагсаалт шинэчлэгдэнэ (нээлттэй яриа нь tab бүрт тусдаа)
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return;
    state = { current: getState().current, chats: readChats() };
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Тухайн ярианы мессежийг солино (хоосон бол яриаг жагсаалтаас хасна) */
export function setChatMessages(id: string, messages: ChatMessage[]) {
  const s = getState();
  const others = s.chats.filter((c) => c.id !== id);
  const kept = messages.slice(-MAX_MESSAGES);
  const prev = s.chats.find((c) => c.id === id);
  const chats = kept.length
    ? [{ id, title: prev?.title ?? titleOf(kept), updatedAt: Date.now(), messages: kept }, ...others].slice(0, MAX_CHATS)
    : others;
  write({ ...s, chats });
}

/** Шинэ яриа — одоогийнх нь аль хэдийн хоосон бол хэвээр нь үлдээнэ */
export function newChat() {
  const s = getState();
  if (!s.chats.some((c) => c.id === s.current)) return;
  write({ ...s, current: newMessageId() });
}

export function openChat(id: string) {
  const s = getState();
  if (s.current !== id) write({ ...s, current: id });
}

export function deleteChat(id: string) {
  const s = getState();
  write({ current: s.current === id ? newMessageId() : s.current, chats: s.chats.filter((c) => c.id !== id) });
}

/** Сүүлд шинэчлэгдсэн нь эхэндээ */
export function useChats(): Conversation[] {
  return useSyncExternalStore(subscribe, () => getState().chats, () => SERVER.chats);
}

export function useCurrentChatId(): string {
  return useSyncExternalStore(subscribe, () => getState().current, () => SERVER.current);
}

export function useChatMessages(id: string): ChatMessage[] {
  return useSyncExternalStore(
    subscribe,
    () => getState().chats.find((c) => c.id === id)?.messages ?? EMPTY,
    () => EMPTY,
  );
}

/* ---------- Бусад хуудаснаас асуулт бэлдэж өгөх (жишээ нь Сургалтын "AI-аас асуух") ---------- */

const PREFILL_KEY = "tg-ask-prefill";

/** Шинэ яриа нээж, асуултыг чатын талбарт бэлдэнэ. Автоматаар илгээхгүй — хэрэглэгч засаад өөрөө илгээнэ */
export function prefillAsk(text: string) {
  try {
    sessionStorage.setItem(PREFILL_KEY, text);
  } catch {
    // Хадгалж чадахгүй бол зүгээр л хоосон чат нээгдэнэ
  }
  newChat();
}

/** Бэлдсэн асуултыг нэг удаа авна (дараа нь устгана) */
export function takeAskPrefill() {
  try {
    const text = sessionStorage.getItem(PREFILL_KEY);
    sessionStorage.removeItem(PREFILL_KEY);
    return text ?? "";
  } catch {
    return "";
  }
}
