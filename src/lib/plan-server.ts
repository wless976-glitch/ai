/**
 * Багцын эрхийг серверт шалгана. AI route бүр Clerk-ээс хэрэглэгчийн багцыг уншиж,
 * Plus-ийн боломжийг түгжиж, Үнэгүй багцын өдрийн хязгаарыг тоолно.
 *
 * Анхаар: өдрийн тоолуур серверийн санах ойд байдаг тул сервер дахин асахад тэглэгдэнэ,
 * олон серверт хуваагдвал тус тусдаа тоолно. Бодит ашиглалтад өгөгдлийн сан (Redis гэх мэт) хэрэгтэй.
 */
import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { AiError } from "./ai-models";
import { FREE_DAILY, planOf, QUOTA_LABELS, type Plan, type PlanUsage, type Quota } from "./plan";

const store = globalThis as typeof globalThis & {
  __tugeePlanCache?: Map<string, { plan: Plan; at: number }>;
  __tugeeUsage?: Map<string, number>;
};
const planCache = (store.__tugeePlanCache ??= new Map());
const usage = (store.__tugeeUsage ??= new Map());

/** Clerk-ийг AI дуудлага бүрт асуухгүйн тулд 60 секунд санана */
const CACHE_MS = 60_000;

/** Админ багц өөрчилсний дараа шууд хүчинтэй болгоно */
export function forgetPlan(userId: string) {
  planCache.delete(userId);
}

export async function currentPlan(): Promise<{ who: string; plan: Plan }> {
  const { userId } = await auth();
  if (!userId) {
    // Нэвтрээгүй (зөвхөн хөгжүүлэлтийн үед AI ашиглаж болно) — IP-ээр нь тоолно
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    return { who: `anon:${ip}`, plan: "free" };
  }
  const hit = planCache.get(userId);
  if (hit && Date.now() - hit.at < CACHE_MS) return { who: userId, plan: hit.plan };
  const user = await (await clerkClient()).users.getUser(userId);
  const plan = planOf(user.publicMetadata);
  planCache.set(userId, { plan, at: Date.now() });
  return { who: userId, plan };
}

/** Монголын цагаар өнөөдрийн огноо — шөнө дундаас хязгаар шинэчлэгдэнэ */
function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" });
}

const key = (who: string, quota: Quota) => `${today()}:${who}:${quota}`;

export async function requirePlus(feature: string) {
  const { plan } = await currentPlan();
  if (plan !== "plus") {
    throw new AiError(`${feature} нь зөвхөн Plus багцад нээлттэй.`, 403, "plus_required");
  }
}

/**
 * Үнэгүй багцын өдрийн хязгаарыг шалгана. AI амжилттай хариулсны дараа `commit()` дуудаж тоолно
 * (алдаа гарвал хэрэглэгчийн хязгаар хасагдахгүй). `remaining` нь commit-ийн дараах үлдэгдэл, Plus-д null.
 */
export async function checkQuota(quota: Quota) {
  const { who, plan } = await currentPlan();
  if (plan === "plus") return { remaining: null, commit: () => {} };
  const limit = FREE_DAILY[quota];
  const k = key(who, quota);
  const used = usage.get(k) ?? 0;
  if (used >= limit) {
    throw new AiError(
      `Үнэгүй багцын өнөөдрийн хязгаар дууслаа (${QUOTA_LABELS[quota]}: ${limit}). Маргааш дахин боломжтой, эсвэл Plus-д шилжвэл хязгааргүй.`,
      429,
      "limit_reached",
    );
  }
  return {
    remaining: limit - used - 1,
    commit: () => {
      usage.set(k, (usage.get(k) ?? 0) + 1);
    },
  };
}

export async function planUsage(): Promise<PlanUsage> {
  const { who, plan } = await currentPlan();
  const quotas = Object.keys(FREE_DAILY) as Quota[];
  return {
    plan,
    used: Object.fromEntries(quotas.map((q) => [q, usage.get(key(who, q)) ?? 0])) as Record<Quota, number>,
    limits: plan === "plus" ? null : FREE_DAILY,
  };
}
