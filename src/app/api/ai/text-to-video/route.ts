import { requirePlus } from "@/lib/plan-server";
import { binary, errorResponse, guard, limitsFor, requireText, textToVideo } from "@/lib/hf";

// Видео үүсгэх 1–5 минут үргэлжилж болно
export const maxDuration = 600;

/** Text to video: богино видео (MP4) үүсгэнэ */
export async function POST(req: Request) {
  try {
    await guard();
    await requirePlus("Текст → Видео");
    const body = await req.json().catch(() => ({}));
    const prompt = requireText(body.prompt, "Тайлбар", 3);
    return binary(await textToVideo(prompt, limitsFor(req).translate), "video/mp4");
  } catch (err) {
    return errorResponse(err, "video");
  }
}
