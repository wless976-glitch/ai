/**
 * Багц: Үнэгүй ба Plus. Clerk-ийн publicMetadata.plan дээр хадгална ({ "plan": "plus" }).
 * Админ бүх боломжийг ашиглана (автоматаар Plus). Хязгаарыг сервер (src/lib/plan-server.ts)
 * мөрдүүлнэ — browser дээрх түгжээ нь зөвхөн хэрэглэгчид ойлгомжтой болгох зорилготой.
 */
export type Plan = "free" | "plus";

export const PLAN_LABELS: Record<Plan, string> = { free: "Үнэгүй", plus: "Plus" };

/** Тест горимд төлбөр авахгүй — үнийг зөвхөн харуулна */
export const PLUS_PRICE = 99000;

/** Сард нийтлэх пост (татгалзсанаас бусад) */
export const MONTHLY_POSTS: Record<Plan, number> = { free: 12, plus: 30 };

/** 7 хоногийн төлөвлөгөөнд сонгох дээд тоо (сарын хязгаартай нийцүүлсэн) */
export const WEEKLY_POSTS: Record<Plan, number> = { free: 3, plus: 7 };

/** Нэг постыг зэрэг гаргах платформын тоо */
export const MAX_PLATFORMS: Record<Plan, number> = { free: 1, plus: 2 };

/** Үнэгүй багцын өдрийн AI хязгаар. Plus-д хязгааргүй. */
export type Quota = "ask" | "text" | "vision";
export const FREE_DAILY: Record<Quota, number> = { ask: 15, text: 10, vision: 5 };
export const QUOTA_LABELS: Record<Quota, string> = {
  ask: "AI-аас асуух",
  text: "AI текст (пост, студи)",
  vision: "Зураг → Текст",
};

/** Зөвхөн Plus-д нээлттэй боломжууд */
export const PLUS_FEATURES = [
  "AI студи: Текст → Зураг, Зураг → Зураг, Текст → Видео",
  "Facebook + Instagram-д зэрэг нийтлэх",
  `Сард ${MONTHLY_POSTS.plus} пост (үнэгүйд ${MONTHLY_POSTS.free})`,
  "Пост бүрийн статистик, Boost зөвлөмж",
  "AI асуулт, текст хязгааргүй",
];

export function planOf(publicMetadata: Record<string, unknown> | null | undefined): Plan {
  return publicMetadata?.role === "admin" || publicMetadata?.plan === "plus" ? "plus" : "free";
}

/** Админы хуудсанд: хэрэглэгчид Plus тусгайлан олгосон эсэх (админы автомат Plus-ийг тооцохгүй) */
export function storedPlanOf(publicMetadata: Record<string, unknown> | null | undefined): Plan {
  return publicMetadata?.plan === "plus" ? "plus" : "free";
}

export interface PlanUsage {
  plan: Plan;
  /** Өнөөдөр хэрэглэсэн тоо (Үнэгүй багцад л тоолно) */
  used: Record<Quota, number>;
  limits: Record<Quota, number> | null;
}
