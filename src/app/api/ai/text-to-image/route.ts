import { requirePlus } from "@/lib/plan-server";
import { binary, errorResponse, guard, IMAGE_SIZES, limitsFor, requireText, textToImage, type ImageSize } from "@/lib/hf";

export const maxDuration = 180;

/** Text to image: тайлбараас зураг үүсгээд PNG/JPEG байдлаар буцаана */
export async function POST(req: Request) {
  try {
    await guard();
    await requirePlus("Текст → Зураг");
    const body = await req.json().catch(() => ({}));
    const prompt = requireText(body.prompt, "Тайлбар", 3);
    const size: ImageSize = body.size in IMAGE_SIZES ? body.size : "square";
    const limits = limitsFor(req);
    return binary(
      await textToImage(prompt, size, { small: limits.smallImages, translateTokens: limits.translate }),
      "image/png",
    );
  } catch (err) {
    return errorResponse(err, "image");
  }
}
