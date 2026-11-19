export type Platform = "facebook" | "instagram";
export type PostStatus = "pending" | "scheduled" | "published" | "rejected";
export type Tone = "friendly" | "professional" | "fun" | "inspiring";
export type Length = "short" | "medium" | "long";
/** Постын хэлбэр: зурагтай энгийн пост эсвэл богино босоо видео (Reel) */
export type PostFormat = "image" | "video";

export const FORMAT_LABELS: Record<PostFormat, string> = {
  image: "Зурагтай пост",
  video: "Видео (Reel)",
};

/** Reel-ийн зураг авалтын төлөвлөгөөний нэг хэсэг */
export interface VideoScene {
  /** "0–3 сек" */
  time: string;
  /** Юуг яаж бичих вэ */
  shot: string;
  /** Дэлгэц дээр гарах бичиг */
  text: string;
}

export const TONE_LABELS: Record<Tone, string> = {
  friendly: "Найрсаг",
  professional: "Мэргэжлийн",
  fun: "Хөгжилтэй",
  inspiring: "Урам зоригтой",
};

export const LENGTH_LABELS: Record<Length, string> = {
  short: "Богино",
  medium: "Дунд",
  long: "Урт",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
};

export const STATUS_LABELS: Record<PostStatus, string> = {
  pending: "Батлах хүлээгдэж буй",
  scheduled: "Хуваарьт орсон",
  published: "Нийтлэгдсэн",
  rejected: "Татгалзсан",
};

/** Постын дүрс: AI/өөрийн зураг, видео байхгүй бол градиент + emoji жишээ дүрс харуулна */
export interface PostVisual {
  preset: number;
  emoji: string;
  headline: string;
  /** AI-аар үүсгэсэн эсвэл оруулсан зураг (blob: URL) */
  imageUrl?: string;
  /** AI-аар үүсгэсэн эсвэл оруулсан видео (blob: URL) */
  videoUrl?: string;
  /** Видео (Reel) пост — видео нь хараахан нэмэгдээгүй/хадгалагдаагүй ч ▶ тэмдэгтэй, босоо харагдана */
  video?: boolean;
}

/** Meta Graph API insights-ээс ирэх үзүүлэлтүүдийн хялбарчилсан хэлбэр */
export interface PostStats {
  reach: number;
  impressions: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface Post {
  id: string;
  topic: string;
  caption: string;
  hashtags: string[];
  platforms: Platform[];
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  time: string;
  status: PostStatus;
  visual: PostVisual;
  aiGenerated: boolean;
  stats?: PostStats;
  boosted?: boolean;
}

export interface BusinessProfile {
  name: string;
  handle: string;
  industry: string;
  location: string;
  description: string;
  tone: Tone;
}

export interface Connections {
  facebook: boolean;
  instagram: boolean;
}

export interface AutomationSettings {
  postsPerWeek: number;
  requireApproval: boolean;
  smartTiming: boolean;
  weeklyReport: boolean;
}

export interface Guide {
  id: string;
  category: GuideCategory;
  title: string;
  minutes: number;
  summary: string;
  steps: string[];
  tip?: string;
}

export type GuideCategory = "start" | "facebook" | "instagram" | "content" | "boost";

export const GUIDE_CATEGORY_LABELS: Record<GuideCategory, string> = {
  start: "Эхлэх",
  facebook: "Facebook",
  instagram: "Instagram",
  content: "Контент",
  boost: "Boost & Статистик",
};
