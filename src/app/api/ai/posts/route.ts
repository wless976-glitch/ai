import { NextResponse } from "next/server";
import { checkQuota } from "@/lib/plan-server";
import { POST_WRITING_RULES } from "@/lib/academy/knowledge";
import { AiError, chat, errorResponse, guard, limitsFor, NO_INVENTED_FACTS, requireText } from "@/lib/hf";
import { LENGTH_LABELS, PLATFORM_LABELS, TONE_LABELS, type Length, type Platform, type Tone } from "@/lib/types";

export const maxDuration = 120;

const LENGTH_GUIDE: Record<Length, string> = {
  short: "1–2 өгүүлбэр",
  medium: "3–5 өгүүлбэр, төгсгөлд уриалга (call to action)",
  long: "6–8 өгүүлбэр, уриалга, хаяг ба ажлын цагийн мэдээлэлтэй",
};

const ANGLES = ["Мэдээлэл өгөх", "Урамшуулал, уриалга", "Түүх ярих"];
const VIDEO_ANGLES = ["Анхаарал татах эхлэл", "Ард талын түүх", "Хэрэгтэй зөвлөгөө"];

interface RawVariant {
  angle?: unknown;
  caption?: unknown;
  hashtags?: unknown;
  script?: unknown;
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Reel-ийн зураг авалтын төлөвлөгөө — дутуу/буруу мөрийг хаяна */
function parseScript(raw: unknown) {
  if (!Array.isArray(raw)) return undefined;
  const scenes = raw
    .map((s) => ({ time: str(s?.time, 20), shot: str(s?.shot, 160), text: str(s?.text, 80) }))
    .filter((s) => s.shot)
    .slice(0, 5);
  return scenes.length ? scenes : undefined;
}

function parseVariants(text: string, angles: string[]) {
  const cleaned = text.replace(/```(?:json)?/g, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new AiError("AI-ийн хариуг уншиж чадсангүй. Дахин оролдоно уу.", 502, "bad_output");
  let data: { variants?: RawVariant[] };
  try {
    data = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    throw new AiError("AI-ийн хариуг уншиж чадсангүй. Дахин оролдоно уу.", 502, "bad_output");
  }
  const variants = (data.variants ?? [])
    .filter((v) => typeof v?.caption === "string" && v.caption.trim())
    .slice(0, 3)
    .map((v, i) => ({
      angle: typeof v.angle === "string" && v.angle.trim() ? v.angle.trim() : angles[i],
      caption: String(v.caption).trim(),
      hashtags: Array.isArray(v.hashtags)
        ? v.hashtags
            .filter((h): h is string => typeof h === "string" && h.trim().length > 1)
            .map((h) => (h.trim().startsWith("#") ? h.trim() : `#${h.trim()}`).replace(/\s+/g, ""))
            .slice(0, 6)
        : [],
      script: parseScript(v.script),
    }));
  if (!variants.length) throw new AiError("AI хувилбар буцаасангүй. Дахин оролдоно уу.", 502, "bad_output");
  return variants;
}

/** Text generation: нэг сэдвээр 3 өөр өнцгийн пост */
export async function POST(req: Request) {
  try {
    await guard();
    const limits = limitsFor(req);
    const body = await req.json().catch(() => ({}));
    const topic = requireText(body.topic, "Сэдэв", 3);
    const tone: Tone = body.tone in TONE_LABELS ? body.tone : "friendly";
    const length: Length = body.length in LENGTH_LABELS ? body.length : "medium";
    const platforms: Platform[] = Array.isArray(body.platforms)
      ? body.platforms.filter((p: string): p is Platform => p in PLATFORM_LABELS)
      : ["facebook"];
    const b = body.business ?? {};
    // Видео (Reel): богино hook-той текст + зураг авалтын төлөвлөгөө — хариулт урт тул токен арай их
    const video = body.format === "video";
    const angles = video ? VIDEO_ANGLES : ANGLES;
    const maxTokens = Math.round(limits.posts * (video ? 1.5 : 1));

    // Үнэгүй багцын өдрийн хязгаар (Plus-д хязгааргүй)
    const quota = await checkQuota("text");
    const text = await chat(
      "text",
      [
        {
          role: "system",
          content: `Чи Монголын жижиг бизнесүүдэд зориулсан туршлагатай SMM мэргэжилтэн. Зөвхөн монгол хэлээр, кирилл үсгээр, байгалийн, ярианы хэллэгээр бичнэ. ${POST_WRITING_RULES} ${NO_INVENTED_FACTS} Хариултаа ЗӨВХӨН JSON хэлбэрээр өгнө, өөр тайлбар бүү нэм.`,
        },
        {
          role: "user",
          content: [
            `Бизнес: ${str(b.name, 80)} (${str(b.industry, 80)})`,
            `Тайлбар: ${str(b.description, 400)}`,
            `Байршил: ${str(b.location, 120)}`,
            `Платформ: ${platforms.map((p) => PLATFORM_LABELS[p]).join(", ") || "Facebook"}`,
            `Постын сэдэв: ${topic}`,
            `Өнгө аяс: ${TONE_LABELS[tone]}`,
            video
              ? "Хэлбэр: Instagram/Facebook Reels — 15 секундын босоо видео. Caption-ий эхний мөр нь гүйлгэж буй хүнийг зогсоох hook, нийт 2–3 өгүүлбэр, төгсгөлд уриалга."
              : `Урт: ${LENGTH_GUIDE[length]}`,
            body.useEmoji === false ? "Emoji огт бүү ашигла." : "Тохиромжтой газар emoji ашигла.",
            body.useHashtags === false
              ? 'Hashtag бүү бич ("hashtags": []).'
              : "Hashtag-ийг caption дотор бүү бич, тусад нь 3–5 ширхэгийг hashtags массивт өг (брэндийн нэрийг оролцуул).",
            "",
            `3 өөр хувилбар бич: 1) ${angles[0]}, 2) ${angles[1]}, 3) ${angles[2]}.`,
            ...(video
              ? [
                  'Хувилбар бүрт видеоны 4 хэсэгтэй зураг авалтын төлөвлөгөө "script" өг: time ("0–3 сек" г.м.), shot (юуг яаж бичих, утсаар бичиж болохуйц энгийн), text (дэлгэц дээрх 2–5 үгтэй бичиг).',
                  'JSON хэлбэр: {"variants":[{"angle":"…","caption":"…","hashtags":["#…"],"script":[{"time":"0–3 сек","shot":"…","text":"…"}]}]}',
                ]
              : ['JSON хэлбэр: {"variants":[{"angle":"…","caption":"…","hashtags":["#…"]}]}']),
            // Хэмнэлттэй горимд хариулт богино тул JSON таслагдахгүйн тулд caption-ийг богиносгоно
            ...(limits.posts < 2500 ? ["Товч бич: caption бүр 3 өгүүлбэрээс ихгүй."] : []),
          ].join("\n"),
        },
      ],
      maxTokens,
    );

    const variants = parseVariants(text, angles).map((v) => (body.useHashtags === false ? { ...v, hashtags: [] } : v));
    quota.commit();
    return NextResponse.json({ variants, remaining: quota.remaining });
  } catch (err) {
    return errorResponse(err, "text");
  }
}
