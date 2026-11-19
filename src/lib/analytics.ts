import { addDays, engagementRate, TODAY } from "./format";
import { INITIAL_POSTS } from "./mock-data";
import type { Post, PostStats } from "./types";

export type PublishedPost = Post & { stats: PostStats };

export function publishedPosts(posts: Post[]): PublishedPost[] {
  return posts.filter((p): p is PublishedPost => p.status === "published" && !!p.stats);
}

/** Энэ сард (TODAY-ийн сар) төлөвлөсөн болон нийтэлсэн постын тоо — татгалзсаныг тооцохгүй */
export function monthPostCount(posts: Post[]) {
  const month = TODAY.slice(0, 7);
  return posts.filter((p) => p.date.startsWith(month) && p.status !== "rejected").length;
}

const SAMPLE_POST_IDS = new Set(INITIAL_POSTS.map((p) => p.id));

/**
 * Багцын сарын хязгаарт тооцох пост: энэ сарын, хэрэглэгч өөрөө бэлдсэн пост.
 * Тест горимын жишээ постууд (INITIAL_POSTS) тоологдохгүй — эс тэгвэл Үнэгүй багц анхнаасаа хязгаартаа хүрнэ.
 */
export function planPostCount(posts: Post[]) {
  return monthPostCount(posts.filter((p) => !SAMPLE_POST_IDS.has(p.id)));
}

/** "1.7 дахин өндөр" эсвэл бага зөрүүтэй үед "12%-иар өндөр" */
function higherBy(times: number) {
  return times >= 1.5 ? `${times.toFixed(1)} дахин өндөр` : `${Math.max(1, Math.round((times - 1) * 100))}%-иар өндөр`;
}

/** Тухайн бизнесийн дундаж идэвхийн хувь */
export function averageRate(posts: PublishedPost[]) {
  if (!posts.length) return 0;
  return posts.reduce((s, p) => s + engagementRate(p.stats), 0) / posts.length;
}

export interface BoostSuggestion {
  post: PublishedPost;
  rate: number;
  reason: string;
  budget: number;
}

/**
 * Boost зөвлөмж: сүүлийн 14 хоногт нийтлэгдсэн, идэвхийн хувь нь дунджаас өндөр
 * боловч хүрэлт нь бага хэвээр байгаа постуудыг санал болгоно.
 */
export function boostSuggestions(posts: Post[]): BoostSuggestion[] {
  const pub = publishedPosts(posts);
  const avg = averageRate(pub);
  const avgReach = pub.reduce((s, p) => s + p.stats.reach, 0) / Math.max(pub.length, 1);
  const since = addDays(TODAY, -14);
  return pub
    .filter((p) => !p.boosted && p.date >= since)
    .map((p) => ({ post: p, rate: engagementRate(p.stats) }))
    .filter((x) => x.rate > avg)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 3)
    .map(({ post, rate }) => {
      const times = rate / avg;
      const reason =
        post.stats.reach < avgReach
          ? `Идэвхийн хувь дунджаас ${higherBy(times)} ч цөөн хүнд хүрсэн`
          : `Идэвхийн хувь дунджаас ${higherBy(times)} — хүмүүст таалагдаж байна`;
      return { post, rate, reason, budget: post.stats.clicks > 80 ? 40000 : 30000 };
    });
}

/** Boost-ийн хүрэлтийн тооцоо (тест — бодит Meta тооцоолол биш) */
export function estimateBoost(budget: number, days: number, location: string) {
  const factor = location === "mongolia" ? 1.25 : location === "ub" ? 1 : 0.8;
  const low = Math.round(((budget / 1000) * 140 * factor) / 100) * 100;
  const high = Math.round(((budget / 1000) * 230 * factor) / 100) * 100;
  return { low, high, perDay: Math.round(budget / days / 100) * 100 };
}

export const EMPTY_STATS: PostStats = { reach: 0, impressions: 0, reactions: 0, comments: 0, shares: 0, saves: 0, clicks: 0 };

/** Олон постын үзүүлэлтийг нэгтгэнэ */
export function sumStats(posts: PublishedPost[]): PostStats {
  return posts.reduce<PostStats>(
    (acc, p) => ({
      reach: acc.reach + p.stats.reach,
      impressions: acc.impressions + p.stats.impressions,
      reactions: acc.reactions + p.stats.reactions,
      comments: acc.comments + p.stats.comments,
      shares: acc.shares + p.stats.shares,
      saves: acc.saves + p.stats.saves,
      clicks: acc.clicks + p.stats.clicks,
    }),
    { ...EMPTY_STATS },
  );
}

/** Өмнөх үетэй харьцуулсан өөрчлөлт (0.12 = +12%). Өмнөх үед өгөгдөлгүй бол undefined */
export function change(current: number, previous: number) {
  return previous > 0 ? current / previous - 1 : undefined;
}

/** Линк дарсан хувь (CTR) = линк дарсан ÷ хүрэлт */
export function clickRate(s: PostStats) {
  return s.reach ? s.clicks / s.reach : 0;
}
