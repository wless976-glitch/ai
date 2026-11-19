import { requirePlus } from "@/lib/plan-server";
import { binary, errorResponse, guard, imageToImage, limitsFor, requireImage, requireText } from "@/lib/hf";

export const maxDuration = 180;

/** Image to image: оруулсан зургийг зааврын дагуу өөрчилнө (фон солих, орчин нэмэх г.м.) */
export async function POST(req: Request) {
  try {
    await guard();
    await requirePlus("Зураг → Зураг");
    const form = await req.formData();
    const image = requireImage(form.get("image"));
    const prompt = requireText(form.get("prompt"), "Заавар", 3);
    return binary(await imageToImage(image, prompt, limitsFor(req).translate), "image/png");
  } catch (err) {
    return errorResponse(err, "edit");
  }
}
