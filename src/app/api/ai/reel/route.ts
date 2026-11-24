import { NextResponse } from "next/server";
import { requirePlus } from "@/lib/plan-server";
import { AiError, chat, errorResponse, guard, limitsFor, NO_INVENTED_FACTS, requireText } from "@/lib/hf";
import { parseReelScript, REEL_LENGTHS, REEL_TEMPLATES, type ReelLength, type ReelTemplate } from "@/lib/reel";

export const maxDuration = 120;

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Reels түүх: ганц асуултаас кадр бүрийн бичвэр, хоолойны текст, тоон карттай сценари */
export async function POST(req: Request) {
  try {
    await guard();
    await requirePlus("Reels түүх");
    const limits = limitsFor(req);
    const body = await req.json().catch(() => ({}));
    const question = requireText(body.question, "Асуулт", 3);
    const template: ReelTemplate = body.template in REEL_TEMPLATES ? body.template : "kinetic";
    const length: ReelLength = body.length in REEL_LENGTHS ? body.length : "medium";
    const n = REEL_LENGTHS[length].scenes;
    const b = body.business ?? {};
    const name = str(b.name, 80) || "Манай бизнес";

    const text = await chat(
      "text",
      [
        {
          role: "system",
          content: `Чи Instagram, TikTok Reels-ийн монгол сценарист. Зөвхөн монгол хэлээр, кирилл үсгээр, амьд ярианы хэллэгээр бичнэ. ${NO_INVENTED_FACTS} Хариултаа ЗӨВХӨН JSON хэлбэрээр өгнө, өөр тайлбар бүү нэм.`,
        },
        {
          role: "user",
          content: [
            `Бизнес: ${name} (${str(b.industry, 80)})`,
            `Тайлбар: ${str(b.description, 300)}`,
            `Асуулт / санаа: ${question}`,
            `Өнгө аяс: ${REEL_TEMPLATES[template].style}`,
            "",
            `Энэ асуултаас яг ${n} кадртай, эхлэл–өрнөл–эргэлт–төгсгөлтэй богино түүх бич:`,
            "- 1-р кадр: гүйлгэж буй хүнийг зогсоох hook — асуултыг сонирхолтой болгож тавь.",
            "- Дунд кадрууд: баримт, тоо, үр дагавар; нэг нь гэнэтийн эргэлт байна.",
            `- Сүүлийн кадр: дүгнэлт ба ${name}-тэй холбосон зөөлөн уриалга.`,
            "Кадр бүрт:",
            '- "headline": дэлгэц дээрх том бичиг, 2–6 үг',
            '- "narration": хоолойгоор уншигдах 1–2 богино өгүүлбэр, 22 үгээс ихгүй',
            '- "stat": тоо эсвэл богино хэмжүүр ("1,670 км/ц", "3 дахин") — тохирох тоо байхгүй бол ""',
            '- "emoji": кадрыг илэрхийлэх ганц emoji',
            "Тоо, баримт нь нийтэд мэдэгдэх, үнэн байх ёстой; эргэлзээтэй бол таамаг гэдгийг нь хэлж бич.",
            'Мөн "caption" (Instagram тайлбар, 2–3 өгүүлбэр, emoji-той, hashtag-гүй) ба "hashtags" (3–5, брэндийн нэрийг оролцуул) өг.',
            'JSON: {"title":"…","scenes":[{"headline":"…","narration":"…","stat":"…","emoji":"…"}],"caption":"…","hashtags":["#…"]}',
          ].join("\n"),
        },
      ],
      // Кирилл бичвэр токен их зарцуулдаг тул JSON таслагдахгүй байх хэмжээ
      Math.round(limits.posts * 1.6),
    );

    const cleaned = text.replace(/```(?:json)?/g, "");
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    let raw: unknown = null;
    if (start >= 0 && end > start) {
      try {
        raw = JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        raw = null;
      }
    }
    const script = parseReelScript(raw, question);
    if (!script) throw new AiError("AI-ийн сценарийг уншиж чадсангүй. Дахин оролдоно уу.", 502, "bad_output");
    return NextResponse.json({ script });
  } catch (err) {
    return errorResponse(err, "text");
  }
}
