/**
 * Facebook, Instagram-ийн бодит статистик (Meta Graph API).
 * Холболт хараахан хийгдээгүй тул хоосон. Өмнө нь энд зохиомол жишээ тоо (хүрэлт, дагагч, идэвхтэй цаг)
 * байсныг устгасан. Холбогдмогц эдгээрийг API-аас бөглөөд HAS_LIVE_STATS үнэн болно.
 * HAS_LIVE_STATS худал үед Хянах самбар, Үр дүн хуудас "статистик хараахан байхгүй" гэж харуулна.
 */
import type { Platform } from "./types";

export type DailyReach = {
  date: string;
  facebook: number;
  instagram: number;
};

/** Өдөр тутмын хүрэлт (хамгийн багадаа 60 хоног — 30 vs өмнөх 30 хоногийн харьцуулалтад) */
export const REACH_SERIES: DailyReach[] = [];
/** Нийт дагагч */
export const FOLLOWERS: Record<Platform, number> = { facebook: 0, instagram: 0 };
/** Сүүлийн 7 / 30 / 60 хоногт нэмэгдсэн дагагч (API-аас тус бүрээр нь — таамаглаж бүү тооцоол) */
export const NEW_FOLLOWERS: Record<"7" | "30" | "60", Record<Platform, number>> = {
  "7": { facebook: 0, instagram: 0 },
  "30": { facebook: 0, instagram: 0 },
  "60": { facebook: 0, instagram: 0 },
};
export const NEW_FOLLOWERS_7D = NEW_FOLLOWERS["7"];
/** Харагдалт ÷ хүрэлт — API-аас тооцно */
export const IMPRESSIONS_PER_REACH = 0;
/** Дагагчид идэвхтэй цаг (0–100). Мөр: Да..Ня, багана: HEATMAP_SLOTS */
export const HEATMAP_SLOTS: string[] = [];
export const HEATMAP: number[][] = [];

export const HAS_LIVE_STATS = REACH_SERIES.length > 0 && HEATMAP.length > 0;
