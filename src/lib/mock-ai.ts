/**
 * ТЕСТ: Загвар (template) ашиглан пост "үүсгэдэг" генератор.
 * HF_TOKEN тохируулаагүй эсвэл AI алдаа гарсан үед нөөц (fallback) болж ажиллана.
 * Бодит AI дуудлага: ai-client.ts → /api/ai/* → hf.ts
 */
import { addDays, weekday } from "./format";
import { getToday } from "./today";
import type { BusinessProfile, Length, Platform, Post, PostFormat, PostStatus, PostVisual, Tone, VideoScene } from "./types";

export interface GenerateInput {
  topic: string;
  tone: Tone;
  length: Length;
  platforms: Platform[];
  useEmoji: boolean;
  useHashtags: boolean;
  business: BusinessProfile;
  /** Анхдагч нь зурагтай пост */
  format?: PostFormat;
}

export interface Variant {
  id: string;
  angle: string;
  caption: string;
  hashtags: string[];
  visual: PostVisual;
  /** Видео (Reel) хувилбарт — зураг авалтын төлөвлөгөө */
  script?: VideoScene[];
}

const OPENERS: Record<Tone, string[]> = {
  friendly: ["Сайн байна уу, найзуудаа! 👋", "Танд нэг сайхан мэдээ байна 😊", "Шинэ зүйл хуваалцъя ✨"],
  professional: ["Эрхэм харилцагч танаа,", "Танд мэдээлэхэд таатай байна.", "Шинэ мэдээлэл хүргэж байна 📌"],
  fun: ["Анхаар, анхаар! 🚨", "Хэн үүнийг хүлээж байсан бэ? 🙋", "Ингээд л боллоо! 🎉"],
  inspiring: ["Жижиг алхам бүр том амжилтын эхлэл ✨", "Өдөр бүр илүү сайн байхыг хичээдэг 🌱", "Таны өдрийг илүү гэрэлтэй болгоё 🌟"],
};

const CTAS: Record<Tone, string> = {
  friendly: "💬 Асуух зүйл байвал мессеж бичээрэй!",
  professional: "Дэлгэрэнгүй мэдээллийг мессежээр авна уу.",
  fun: "👉 Мессеж бичээд захиалаарай!",
  inspiring: "Бид таныг хүлээж байна 💛",
};

const ANGLES = ["Мэдээлэл өгөх", "Урамшуулал, уриалга", "Түүх ярих"] as const;
/** Reel-д тохирох өнцгүүд — эхний 3 секундэд анхаарал татах нь хамгийн чухал */
export const VIDEO_ANGLES = ["Анхаарал татах эхлэл", "Ард талын түүх", "Хэрэгтэй зөвлөгөө"] as const;

const VIDEO_HOOKS = [
  (t: string) => `Энийг үзэхээс өмнө гүйлгэж болохгүй 👀 ${t}!`,
  (t: string) => `${t} хэрхэн бэлэн болдгийг үзээрэй 🎬`,
  (t: string) => `15 секундэд: ${t} — 3 зөвлөгөө 💡`,
];

/** Reel-ийн богино текст: hook → нэг өгүүлбэр → уриалга */
function buildVideoCaption(input: GenerateInput, angleIndex: number) {
  const { topic, tone, business } = input;
  const t = topic.trim();
  const middle = [
    business.name ? `${business.name} дээр ирээд өөрөө мэдрээрэй.` : "Ирээд өөрөө мэдрээрэй.",
    "Сонирхож байвал мессеж бичээрэй.",
    "Хадгалаад аваарай — дараа хэрэг болно.",
  ][angleIndex];
  const caption = [VIDEO_HOOKS[angleIndex](t), middle, CTAS[tone]].join("\n\n");
  return input.useEmoji ? caption : stripEmoji(caption);
}

/** 15 секундын 4 хэсэгтэй зураг авалтын төлөвлөгөө */
function buildScript(input: GenerateInput, angleIndex: number): VideoScene[] {
  const t = input.topic.trim();
  const name = input.business.name || "Таны бизнес";
  const second: VideoScene[] = [
    { time: "3–8 сек", shot: `${t} — ойроос, гараар барьж эргүүлж харуулна`, text: "Яг одоо бэлэн" },
    { time: "3–8 сек", shot: "Бэлтгэл, хийц — гар, багаж, процесс ойроос", text: "Ингэж бэлтгэдэг" },
    { time: "3–8 сек", shot: "Зөвлөгөө бүрийг нэг кадраар харуулна", text: "1. … 2. … 3. …" },
  ];
  return [
    { time: "0–3 сек", shot: "Хамгийн гоё кадр — хөдөлгөөнтэй, ойроос эхэлнэ", text: VIDEO_HOOKS[angleIndex](t).replace(/[^\p{L}\p{N}\s—:!?.,-]/gu, "").trim() },
    second[angleIndex],
    { time: "8–12 сек", shot: `${name}-ийн орчин, баг эсвэл хэрэглэгчийн инээмсэглэл`, text: name },
    { time: "12–15 сек", shot: "Лого, хаяг эсвэл мессеж бичих уриалга", text: "Мессеж бичээрэй 💬" },
  ];
}

const EMOJI_BY_KEYWORD: [RegExp, string][] = [
  [/хямдрал|урамшуулал|%/i, "🏷️"],
  [/шинэ/i, "✨"],
  [/баяр|мэндчилгээ|шинэ жил/i, "🎉"],
  [/өвөл|хүйтэн|цас/i, "❄️"],
  [/сэтгэгдэл/i, "💬"],
  [/зөвлөгөө/i, "💡"],
  [/цаг|мэдээлэл/i, "📢"],
  [/кофе|ундаа|латте/i, "☕"],
  [/амттан|бялуу|чийзкейк/i, "🍰"],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function stripEmoji(s: string) {
  return s
    .replace(new RegExp("[\\p{Extended_Pictographic}\\u{FE0F}\\u{200D}]", "gu"), "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

function pickEmoji(topic: string) {
  for (const [re, e] of EMOJI_BY_KEYWORD) if (re.test(topic)) return e;
  return "☕";
}

/** "Улаанбаатар, Сүхбаатар дүүрэг" → "Улаанбаатар" */
function city(business: BusinessProfile) {
  return business.location.split(",")[0].trim();
}

function buildHashtags(topic: string, business: BusinessProfile) {
  const brand = "#" + business.name.replace(/\s+/g, "");
  const place = city(business).replace(/\s+/g, "");
  const words = topic
    .toLowerCase()
    .replace(new RegExp("[^\\p{L}\\s]", "gu"), "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 2)
    .map((w) => "#" + w);
  return Array.from(new Set([brand, ...words, ...(place ? ["#" + place] : [])])).filter((h) => h.length > 1);
}

let seq = 0;
/** Хадгалагдсан постуудтай давхцахгүйн тулд цаг + санамсаргүй хэсэг нэмнэ */
export function newId(prefix = "n") {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function buildCaption(input: GenerateInput, angleIndex: number) {
  const { topic, tone, length, business } = input;
  const opener = OPENERS[tone][(hash(topic) + angleIndex) % OPENERS[tone].length];
  const cta = CTAS[tone];
  const t = topic.trim();

  // Нэрийн араас тийн ялгал (-д, -ийн) залгавал ихэнхдээ буруу болдог тул "дээр" гэх мэт сул үг ашиглана
  // Загвар нь бизнесийн тухай баримт (хугацаа, ажлын цаг, хямдрал) зохиохгүй — зөвхөн өгсөн мэдээллийг ашиглана
  const bodies = [
    `${t} — ${business.name ? `${business.name} дээр ирээд` : "ирээд"} өөрөө мэдрээрэй. Бид таныг хүлээж байна!`,
    `🎁 ${t}! Дэлгэрэнгүйг мессежээр асуугаарай.`,
    `Энэ удаагийн сэдэв: ${t}. Та үүнийг туршиж үзсэн үү? Сэтгэгдлээ үлдээгээрэй 💬`,
  ];

  const parts = [opener, bodies[angleIndex]];
  if (length !== "short") parts.push(cta);
  if (length === "long" && business.location) parts.push(`📍 ${business.location}`);

  const caption = parts.join("\n\n");
  return input.useEmoji ? caption : stripEmoji(caption);
}

/** Сэдвээс градиент + emoji жишээ дүрс (видео бол ▶ тэмдэгтэй, босоо) */
export function visualFor(topic: string, index = 0, format: PostFormat = "image"): PostVisual {
  return {
    preset: (hash(topic) + index) % 6,
    emoji: pickEmoji(topic),
    headline: topic.trim().slice(0, 40),
    ...(format === "video" ? { video: true } : {}),
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Нэг сэдвээр 3 өөр хувилбар "үүсгэнэ" (видео бол Reel-ийн текст + зураг авалтын төлөвлөгөө) */
export async function generatePosts(input: GenerateInput): Promise<Variant[]> {
  await sleep(1400);
  const video = input.format === "video";
  return (video ? VIDEO_ANGLES : ANGLES).map((angle, i) => ({
    id: newId("v"),
    angle,
    caption: video ? buildVideoCaption(input, i) : buildCaption(input, i),
    hashtags: input.useHashtags ? buildHashtags(input.topic, input.business) : [],
    visual: visualFor(input.topic, i, input.format),
    ...(video ? { script: buildScript(input, i) } : {}),
  }));
}

const WEEK_TOPICS = [
  "Энэ 7 хоногийн онцлох бүтээгдэхүүн",
  "Хэрэглэгчийн сэтгэгдэл",
  "Бидний түүх, баг",
  "Амралтын өдрийн урамшуулал",
  "Хэрэгтэй зөвлөгөө",
  "Шинэ бүтээгдэхүүн танилцуулга",
  "Асуулт: Та алинд нь дуртай вэ?",
];
/** "Ухаалаг цаг" асаалттай үеийн анхдагч цагууд — дагагчдын бодит статистик холбогдоогүй тул тогтмол */
const WEEK_TIMES = ["12:00", "18:00", "08:30", "19:00", "12:30", "18:00", "10:00"];
const PLAIN_TIME = "12:00";

/**
 * Ирэх 7 хоногийн контент төлөвлөгөө — бэлэн загвараар (AI дуудахгүй).
 * status: "Нийтлэхээс өмнө батлуулах" асаалттай бол pending, унтраалттай бол scheduled.
 */
export async function generateWeekPlan(
  business: BusinessProfile,
  count: number,
  platforms: Platform[],
  options: { status: Extract<PostStatus, "pending" | "scheduled">; smartTiming: boolean },
): Promise<Post[]> {
  await sleep(1800);
  // Ирэх Даваа гарагаас эхлэнэ
  const today = getToday();
  const daysToMonday = (8 - weekday(today)) % 7 || 7;
  const monday = addDays(today, daysToMonday);
  const step = 7 / count;
  return Array.from({ length: count }, (_, i) => {
    const topic = WEEK_TOPICS[i % WEEK_TOPICS.length];
    const input: GenerateInput = {
      topic,
      tone: business.tone,
      length: "medium",
      platforms,
      useEmoji: true,
      useHashtags: true,
      business,
    };
    return {
      id: newId("w"),
      topic,
      caption: buildCaption(input, i % 3),
      hashtags: buildHashtags(topic, business),
      platforms,
      date: addDays(monday, Math.floor(i * step)),
      time: options.smartTiming ? WEEK_TIMES[i % WEEK_TIMES.length] : PLAIN_TIME,
      status: options.status,
      visual: { preset: i % 6, emoji: pickEmoji(topic), headline: topic },
      aiGenerated: false,
    } satisfies Post;
  });
}
