import { NextResponse } from "next/server";
import { knowledgePrompt, searchKnowledge, toSources } from "@/lib/academy/knowledge";
import { checkQuota } from "@/lib/plan-server";
import { AiError, chat, errorResponse, guard, limitsFor, NO_INVENTED_FACTS, requireText } from "@/lib/hf";

export const maxDuration = 120;


type Msg = { role: "user" | "assistant"; content: string };

const isMsg = (m: unknown): m is Msg =>
  !!m &&
  typeof m === "object" &&
  ((m as Msg).role === "user" || (m as Msg).role === "assistant") &&
  typeof (m as Msg).content === "string";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** "AI-аас асуух" чат: ярианы түүх + бизнесийн мэдээлэл → дараагийн хариулт */
export async function POST(req: Request) {
  try {
    await guard();
    // Загварт илгээх ярианы түүх, хариултын урт — AI хэрэглээний түвшнээс (урт яриа кредит их зарцуулдаг)
    const limits = limitsFor(req);
    const body = await req.json().catch(() => ({}));
    const raw: unknown[] = Array.isArray(body.messages) ? body.messages : [];
    const history: Msg[] = raw
      .filter(isMsg)
      .slice(-limits.askHistory)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, m.role === "assistant" ? limits.askAssistantChars : Infinity) }));

    const last = history.at(-1);
    if (!last || last.role !== "user") throw new AiError("Асуултаа бичнэ үү.", 400, "bad_input");
    last.content = requireText(last.content, "Асуулт");
    // Өмнөх асуултуудыг ч мөн адил хязгаарлана
    for (const m of history) if (m.role === "user") m.content = m.content.slice(0, 1500);

    const b = typeof body.business === "object" && body.business ? body.business : {};
    const context = [
      ["Нэр", str(b.name, 80)],
      ["Салбар", str(b.industry, 80)],
      ["Байршил", str(b.location, 120)],
      ["Тайлбар", str(b.description, 600)],
    ]
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");

    // Сургалтаас хамааралтай хичээлүүд — сүүлийн 2 асуултаар хайна ("тэгвэл 2027 онд?" гэх мэт үргэлжлэлд)
    const query = history
      .filter((m) => m.role === "user")
      .slice(-2)
      .map((m) => m.content)
      .join("\n");
    const hits = searchKnowledge(query, { limit: limits.knowledgeHits, maxChars: limits.knowledgeChars });

    const system = `Чи "Түгээ" апп доторх AI туслах. Монголын жижиг, дунд бизнесүүдэд (ЖДҮ) Facebook, Instagram маркетинг, пост бичих, boost хийх, үр дүнгээ ойлгох, борлуулалт, бизнесийн суурь тооцоо, татвар, хуулийн ерөнхий ойлголтын талаар зөвлөнө.${
      context ? `\n\nХэрэглэгчийн бизнес:\n${context}` : ""
    }

Зөвхөн монгол хэлээр, кирилл үсгээр, ойлгомжтой, практик хариул. Хэрэглэгч латин үсгээр бичсэн ч кириллээр хариул. Товч бай — ихэвчлэн 3–8 өгүүлбэр эсвэл богино жагсаалт. Жагсаалтыг "- " эсвэл "1. "-ээр эхлүүл, чухал үгийг **тод** болгож болно. Markdown толгой (#), хүснэгт бүү ашигла. ${NO_INVENTED_FACTS} Мэдэхгүй, шалгах боломжгүй зүйлээ шууд хэл.${knowledgePrompt(hits)}`;

    // Үнэгүй багцын өдрийн хязгаар (Plus-д хязгааргүй)
    const quota = await checkQuota("ask");
    const text = await chat("text", [{ role: "system", content: system }, ...history], limits.ask);
    quota.commit();
    return NextResponse.json({ text, remaining: quota.remaining, sources: toSources(hits) });
  } catch (err) {
    return errorResponse(err, "text");
  }
}
