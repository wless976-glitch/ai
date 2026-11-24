/**
 * "Reels түүх" — ганц асуултаас AI түүх бичиж, загварын дагуу хөдөлгөөнт 9:16 видео болгоно.
 * Энэ файл browser, сервер хоёуланд ажиллана (төрөл, загварууд, сценарийг шалгах).
 */

export interface ReelScene {
  /** Дэлгэц дээрх том бичиг (2–6 үг) */
  headline: string;
  /** Хоолойгоор уншигдах / хадмал болох 1–2 өгүүлбэр */
  narration: string;
  /** Тоон карт: "1,670 км/ц", "3 дахин" — байхгүй бол хоосон */
  stat: string;
  emoji: string;
}

export interface ReelScript {
  title: string;
  question: string;
  scenes: ReelScene[];
  caption: string;
  hashtags: string[];
}

export type ReelMood = "upbeat" | "synth" | "urgent" | "light" | "epic" | "soft";

export type ReelTemplate = "kinetic" | "neon" | "news" | "chat" | "trailer" | "notebook";

export const REEL_TEMPLATES: Record<
  ReelTemplate,
  { label: string; description: string; mood: ReelMood; /** AI-д өгөх өнгө аяс */ style: string }
> = {
  kinetic: {
    label: "Хөдөлгөөнт бичвэр",
    description: "Том үгс ээлжлэн гарч, тоо нь тодорно — брэндийн өнгөөр.",
    mood: "upbeat",
    style: "эрч хүчтэй, богино, цохилттой өгүүлбэрүүд",
  },
  neon: {
    label: "Неон скан",
    description: "Хар терминал, радар, неон бичиг — баримт бүрийг «скан» хийнэ.",
    mood: "synth",
    style: "нууцлаг, шинжлэх ухааны баримт мэт, техникийн хэллэгтэй",
  },
  news: {
    label: "Шуурхай мэдээ",
    description: "ТВ студи, шууд холболт, гүйдэг мөр — мэдээ мэт.",
    mood: "urgent",
    style: "ТВ мэдээний хөтлөгч шиг, яаралтай, тодорхой",
  },
  chat: {
    label: "Чат түүх",
    description: "Утасны чат: асуулт, хариулт мессежээр ээлжлэн гарна.",
    mood: "light",
    style: "найзтайгаа чатлаж буй мэт энгийн, хөгжилтэй",
  },
  trailer: {
    label: "Кино трейлер",
    description: "Хар хүрээ, драмын карт, том гарчиг — кино шиг.",
    mood: "epic",
    style: "кино трейлер шиг драмтай, ихэмсэг, түгшүүртэй",
  },
  notebook: {
    label: "Дэвтрийн тэмдэглэл",
    description: "Шугамтай хуудас, тодруулагч, наалт — дугаартай баримтууд.",
    mood: "soft",
    style: "сурагчийн тэмдэглэл шиг ойлгомжтой, дугаарласан баримтууд",
  },
};

export const REEL_TEMPLATE_ORDER = Object.keys(REEL_TEMPLATES) as ReelTemplate[];

export type ReelLength = "short" | "medium" | "long";

export const REEL_LENGTHS: Record<ReelLength, { label: string; scenes: number; seconds: string }> = {
  short: { label: "Богино", scenes: 4, seconds: "~20 сек" },
  medium: { label: "Дунд", scenes: 6, seconds: "~35 сек" },
  long: { label: "Урт", scenes: 8, seconds: "~50 сек" },
};

export type ReelVoice = "none" | "female" | "male";

export const REEL_VOICES: Record<ReelVoice, string> = {
  none: "Хоолойгүй",
  female: "Эмэгтэй",
  male: "Эрэгтэй",
};

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Эхний emoji-г (тугны, арьсны өнгөтэй нийлмэлийг оролцуулан) салгаж авна */
function firstEmoji(v: unknown) {
  const s = typeof v === "string" ? v.trim() : "";
  const m = s.match(/\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/u);
  return m?.[0] ?? "";
}

/** AI-ийн JSON-ийг шалгаж, урт хэтэрсэн, дутуу хэсгийг засна. Кадр олдохгүй бол null. */
export function parseReelScript(raw: unknown, question: string): ReelScript | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const scenes = (Array.isArray(r.scenes) ? r.scenes : [])
    .map((s: Record<string, unknown> | null) => ({
      headline: str(s?.headline, 60),
      narration: str(s?.narration, 220),
      stat: str(s?.stat, 18),
      emoji: firstEmoji(s?.emoji) || "✨",
    }))
    .filter((s) => s.headline || s.narration)
    .map((s) => ({ ...s, headline: s.headline || s.narration.split(" ").slice(0, 4).join(" ") }))
    .slice(0, 10);
  if (scenes.length < 2) return null;
  const hashtags = (Array.isArray(r.hashtags) ? r.hashtags : [])
    .filter((h): h is string => typeof h === "string" && h.trim().length > 1)
    .map((h) => (h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`).replace(/\s+/g, ""))
    .slice(0, 6);
  return {
    title: str(r.title, 80) || question.slice(0, 80),
    question: question.slice(0, 200),
    scenes,
    caption: typeof r.caption === "string" ? r.caption.trim().slice(0, 1200) : "",
    hashtags,
  };
}

/** "Токенгүй" горим: AI дуудахгүй, загварыг шалгах жишээ сценари (0 токен) */
export function mockReelScript(question: string, businessName: string, length: ReelLength): ReelScript {
  const q = question.replace(/\s+/g, " ").trim() || "Хэрвээ кофе байгаагүй бол?";
  const name = businessName.trim() || "Манай";
  const middle: Omit<ReelScene, "emoji">[] = [
    { headline: "Эхлээд баримт", narration: "Энд AI бичсэн эхний баримт гарна — богино, тод өгүүлбэрээр.", stat: "3 дахин" },
    { headline: "Тоо ярина", narration: "Тоо, хэмжүүр том картаар тодорч, хоолой түүнийг уншина.", stat: "1,670 км/ц" },
    { headline: "Гэнэтийн эргэлт", narration: "Түүхийн дунд үзэгчийн бодоогүй эргэлт гарч ирнэ.", stat: "" },
    { headline: "Үр дагавар", narration: "Дараа нь юу болохыг энгийн үгээр тайлбарлана.", stat: "24 цаг" },
    { headline: "Хүмүүс юу гэж бодох вэ", narration: "Үзэгчдийн өөрсдийнх нь амьдралтай холбоно.", stat: "80%" },
    { headline: "Нэг сонирхолтой зүйл", narration: "Хадгалж аваад найздаа илгээмээр нэг баримт.", stat: "" },
  ];
  const emojis = ["🤔", "📊", "⚡", "🔄", "🌍", "💡", "🎯", "☕"];
  const n = REEL_LENGTHS[length].scenes;
  const scenes: ReelScene[] = [
    { headline: q.split(" ").slice(0, 6).join(" "), narration: `${q} Өнөөдөр хамтдаа нэг харцгаая.`, stat: "", emoji: emojis[0] },
    ...middle.slice(0, n - 2).map((s, i) => ({ ...s, emoji: emojis[i + 1] })),
    {
      headline: `${name}-д ирээрэй`,
      narration: `Жишээ сценари — «Токенгүй» горимд AI түүх бичихгүй. ${name}-ийг дагаарай!`,
      stat: "",
      emoji: "🎯",
    },
  ];
  return {
    title: q.slice(0, 80),
    question: q,
    scenes,
    caption: `${q}\n\nЖишээ тайлбар — «Токенгүй» горимд AI бичихгүй. 👀`,
    hashtags: ["#Түгээ", "#Reels", `#${name.replace(/\s+/g, "")}`],
  };
}

/* ---------- Цагийн хуваарь: кадр бүрийн эхлэл, урт ---------- */

export interface ReelTimeline {
  starts: number[];
  durs: number[];
  /** Төгсгөлийн брэнд карт */
  outroStart: number;
  total: number;
}

export const OUTRO_SECONDS = 2.4;
/** Кадр эхэлснээс хоолой эхлэх хүртэлх зай */
export const VOICE_DELAY = 0.3;

/**
 * Хоолойтой бол кадр нь хоолойны уртаар, хоолойгүй бол бичвэрийн уртаар (уншиж амжих хугацаа).
 * `voiceSeconds[i]` нь i-р кадрын хоолойны урт (секунд) эсвэл null.
 */
export function buildTimeline(scenes: ReelScene[], voiceSeconds?: (number | null)[]): ReelTimeline {
  const starts: number[] = [];
  const durs: number[] = [];
  let t = 0;
  scenes.forEach((s, i) => {
    const voice = voiceSeconds?.[i];
    const words = s.narration.split(/\s+/).filter(Boolean).length;
    const dur = voice ? Math.max(2.4, voice + VOICE_DELAY + 0.45) : Math.min(7, Math.max(2.8, 1.4 + words * 0.36));
    starts.push(t);
    durs.push(dur);
    t += dur;
  });
  return { starts, durs, outroStart: t, total: t + OUTRO_SECONDS };
}
