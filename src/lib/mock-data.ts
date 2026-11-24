/**
 * Апп эхлэх үеийн анхдагч утгууд.
 * Өмнө нь энд зохиомол жишээ бизнес ("Сэрүүн Кофе"), пост, статистик байсан — устгасан.
 * Бодит статистикийг live-stats.ts-д Meta-тай холбогдсоны дараа бөглөнө.
 */
import type { AutomationSettings, BusinessProfile } from "./types";

/** Хэрэглэгч Тохиргоо хэсэгт өөрөө бөглөнө */
export const BUSINESS: BusinessProfile = {
  name: "",
  handle: "",
  industry: "",
  location: "",
  description: "",
  tone: "friendly",
};

export const SETTINGS: AutomationSettings = {
  postsPerWeek: 4,
  requireApproval: true,
  smartTiming: true,
  weeklyReport: true,
};

/**
 * Өмнөх хувилбарын зохиомол жишээ өгөгдлийг хэрэглэгчийн browser-т хадгалагдсан өгөгдлөөс цэвэрлэхэд
 * (store.tsx) ашиглана — зөвхөн танигч, агуулга биш.
 */
export const LEGACY_DEMO_POST_IDS = new Set([
  ...["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10"],
  ...["s1", "s2", "s3", "s4", "a1", "a2", "a3", "a4", "r1"],
]);
export const LEGACY_DEMO_BUSINESS = { name: "Сэрүүн Кофе", handle: "seruun.coffee" };
