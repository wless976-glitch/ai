import { addDays, engagementRate } from "./format";
import type { Post, PostStats } from "./types";

export type PublishedPost = Post & { stats: PostStats };

export function publishedPosts(posts: Post[]): PublishedPost[] {
  return posts.filter((p): p is PublishedPost => p.status === "published" && !!p.stats);
}

/** Энэ сард (today-ийн сар) төлөвлөсөн болон нийтэлсэн постын тоо — татгалзсаныг тооцохгүй */
export function monthPostCount(posts: Post[], today: string) {
  const month = today.slice(0, 7);
  return posts.filter((p) => p.date.startsWith(month) && p.status !== "rejected").length;
}

/** Багцын сарын хязгаарт тооцох пост: энэ сарын, татгалзаагүй пост */
export function planPostCount(posts: Post[], today: string) {
  return monthPostCount(posts, today);
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
export function boostSuggestions(posts: Post[], today: string): BoostSuggestion[] {
  const pub = publishedPosts(posts);
  const avg = averageRate(pub);
  const avgReach = pub.reduce((s, p) => s + p.stats.reach, 0) / Math.max(pub.length, 1);
  const since = addDays(today, -14);
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
