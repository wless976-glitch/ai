import { NextResponse } from "next/server";
import { knowledgePrompt, searchKnowledge } from "@/lib/academy/knowledge";
import { checkQuota } from "@/lib/plan-server";
import { chat, errorResponse, guard, limitsFor, NO_INVENTED_FACTS, requireText } from "@/lib/hf";

export const maxDuration = 120;

/** Text generation: чөлөөт даалгавар (санаа, хариулт, bio гэх мэт) */
export async function POST(req: Request) {
  try {
    await guard();
    const body = await req.json().catch(() => ({}));
    const prompt = requireText(body.prompt, "Даалгавар");
    const business = typeof body.businessName === "string" ? body.businessName.slice(0, 80) : "";
    const limits = limitsFor(req);
    // Чөлөөт даалгаварт (bio, санаа, зөвлөгөө) сургалтаас нэг хоёр хичээл хангалттай
    const hits = searchKnowledge(prompt, { limit: Math.min(2, limits.knowledgeHits), maxChars: Math.round(limits.knowledgeChars * 0.75) });

    // Үнэгүй багцын өдрийн хязгаар (Plus-д хязгааргүй)
    const quota = await checkQuota("text");
    const text = await chat("text", [
      {
        role: "system",
        content: `Чи Монголын жижиг, дунд бизнесүүдэд (ЖДҮ) зориулсан сошиал медиа маркетингийн туслах.${
          business ? ` Одоо "${business}" бизнест тусалж байна.` : ""
        } Зөвхөн монгол хэлээр, кирилл үсгээр, ойлгомжтой, практик хариулна. ${NO_INVENTED_FACTS} Markdown толгой (#) бүү ашигла.${knowledgePrompt(hits)}`,
      },
      { role: "user", content: prompt },
    ], limits.text);
    quota.commit();
    return NextResponse.json({ text, remaining: quota.remaining });
  } catch (err) {
    return errorResponse(err, "text");
  }
}
