import { NextResponse } from "next/server";
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

    // Үнэгүй багцын өдрийн хязгаар (Plus-д хязгааргүй)
    const quota = await checkQuota("text");
    const text = await chat("text", [
      {
        role: "system",
        content: `Чи Монголын жижиг, дунд бизнесүүдэд (ЖДҮ) зориулсан сошиал медиа маркетингийн туслах.${
          business ? ` Одоо "${business}" бизнест тусалж байна.` : ""
        } Зөвхөн монгол хэлээр, кирилл үсгээр, ойлгомжтой, практик хариулна. ${NO_INVENTED_FACTS} Markdown толгой (#) бүү ашигла.`,
      },
      { role: "user", content: prompt },
    ], limitsFor(req).text);
    quota.commit();
    return NextResponse.json({ text, remaining: quota.remaining });
  } catch (err) {
    return errorResponse(err, "text");
  }
}
