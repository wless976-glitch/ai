import { NextResponse } from "next/server";
import { checkQuota } from "@/lib/plan-server";
import { blobToDataUrl, chat, errorResponse, guard, limitsFor, NO_INVENTED_FACTS, requireImage } from "@/lib/hf";

export const maxDuration = 120;

/** Image to text: зургийг vision загвараар уншиж пост бичих эсвэл тайлбарлах */
export async function POST(req: Request) {
  try {
    await guard();
    const form = await req.formData();
    const image = requireImage(form.get("image"));
    const mode = form.get("mode") === "describe" ? "describe" : "caption";
    const business = String(form.get("businessName") ?? "").slice(0, 80);

    const instruction =
      mode === "describe"
        ? "Энэ зурагт юу байгааг монгол хэлээр (кирилл) товч бөгөөд тодорхой тайлбарла: гол объект, өнгө, орчин, зураг дээрх бичиг."
        : `Энэ зурган дээрх бүтээгдэхүүн/үйлчилгээг ашиглан ${
            business ? `"${business}"-ийн ` : ""
          }Facebook, Instagram-д зориулсан сонирхолтой пост бич. Монгол хэлээр (кирилл), 3–5 өгүүлбэр, тохиромжтой emoji, төгсгөлд уриалга, хамгийн сүүлд 3–5 hashtag. ${NO_INVENTED_FACTS} Зөвхөн постын текстийг буцаа.`;

    // Үнэгүй багцын өдрийн хязгаар (Plus-д хязгааргүй)
    const quota = await checkQuota("vision");
    const text = await chat(
      "vision",
      [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: await blobToDataUrl(image) } },
            { type: "text", text: instruction },
          ],
        },
      ],
      limitsFor(req).vision,
    );
    quota.commit();
    return NextResponse.json({ text, remaining: quota.remaining });
  } catch (err) {
    return errorResponse(err, "vision");
  }
}
