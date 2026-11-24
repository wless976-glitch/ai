/**
 * Hugging Face Inference Providers-тэй ярилцах серверийн давхарга.
 * HF_TOKEN зөвхөн сервер дээр уншигдана — browser руу хэзээ ч очихгүй.
 */
import "server-only";
import { auth } from "@clerk/nextjs/server";
import {
  InferenceClient,
  InferenceClientHubApiError,
  InferenceClientInputError,
  InferenceClientProviderApiError,
  InferenceClientProviderOutputError,
  InferenceClientRoutingError,
} from "@huggingface/inference";
import { NextResponse } from "next/server";
import {
  AI_LIMITS,
  AI_TASK_ORDER,
  AI_TASKS,
  AI_USAGE_HEADER,
  AiError,
  LITE_MODE_ENABLED,
  MAX_PROMPT_CHARS,
  USES_OLLAMA,
  type AiIssue,
  type AiStatus,
  type AiTask,
} from "./ai-models";
export { AiError };
import { ollamaChat, ollamaReachable } from "./ollama";

type ChatMessages = Parameters<InferenceClient["chatCompletion"]>[0]["messages"];

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Загварууд "Урамшуулал" өнцгөөр бичихдээ байхгүй хямдрал зохиодог тул бүх пост бичих prompt-д нэмнэ.
 * (Gemma 4-ийн туршилтад "бялуугаа хямд авах боломж" гэж өгөгдөөгүй урамшуулал зохиосон.)
 */
export const NO_INVENTED_FACTS =
  "Өгөгдөөгүй хямдрал, үнэ, бэлэг, урамшуулал, ажлын цаг, утас, хаяг зэрэг баримтыг бүү зохио — зөвхөн өгсөн мэдээллийг ашигла. Урамшуулал өгөгдөөгүй бол уриалгаа ирж амсахад урьсан байдлаар бич.";
export { MAX_PROMPT_CHARS };

/**
 * Сүүлийн HF дуудлагын асуудал (кредит дууссан гэх мэт). Route бүр тусдаа bundle болдог тул
 * module хувьсагч биш globalThis дээр хадгална — нэг серверийн процесс дотор хуваалцагдана.
 */
const issueStore = globalThis as typeof globalThis & { __tugeeAiIssue?: AiIssue | null };

function setIssue(issue: AiIssue | null) {
  issueStore.__tugeeAiIssue = issue;
}

/** HF дуудлага амжилттай болбол өмнөх асуудлыг арилгана */
async function tracked<T>(promise: Promise<T>): Promise<T> {
  const result = await promise;
  setIssue(null);
  return result;
}

export function hfToken() {
  return process.env.HF_TOKEN?.trim() || null;
}

export function modelFor(task: AiTask) {
  return process.env[AI_TASKS[task].env]?.trim() || AI_TASKS[task].defaultModel;
}

export async function aiStatus(): Promise<AiStatus> {
  return {
    connected: Boolean(hfToken()),
    issue: issueStore.__tugeeAiIssue ?? null,
    models: Object.fromEntries(AI_TASK_ORDER.map((t) => [t, modelFor(t)])) as AiStatus["models"],
    ollama: { reachable: USES_OLLAMA ? await ollamaReachable() : false },
  };
}

function client() {
  const token = hfToken();
  if (!token) {
    throw new AiError(
      "HF_TOKEN тохируулаагүй байна. .env.local файлд HF_TOKEN=hf_... нэмээд дахин оролдоно уу.",
      503,
      "no_token",
    );
  }
  return new InferenceClient(token);
}

/**
 * Хөгжүүлэлтийн үед (next dev) нээлттэй. Production дээр зөвхөн нэвтэрсэн хэрэглэгч
 * дуудна — эс тэгвэл хэн ч таны HF кредитийг зарцуулж чадна.
 */
export async function guard() {
  if (process.env.NODE_ENV !== "production") return;
  const { userId } = await auth();
  if (!userId) throw new AiError("AI ашиглахын тулд нэвтэрнэ үү.", 401, "unauthorized");
}

/**
 * Browser-оос ирсэн AI хэрэглээний түвшин (Хэмнэлттэй / Бүрэн) → хязгаарууд. Header байхгүй бол
 * хэмнэлттэй. Зөвхөн хэрэглээг багасгадаг тул browser-т итгэхэд аюулгүй.
 */
export function limitsFor(req: Request) {
  // "Хэмнэлттэй" горим түр унтраалттай бол үргэлж бүрэн хязгаар
  if (!LITE_MODE_ENABLED) return AI_LIMITS.full;
  return AI_LIMITS[req.headers.get(AI_USAGE_HEADER) === "full" ? "full" : "lite"];
}

export function requireText(value: unknown, name: string, min = 2) {
  const s = typeof value === "string" ? value.trim() : "";
  if (s.length < min) throw new AiError(`${name} хэт богино байна.`, 400, "bad_input");
  if (s.length > MAX_PROMPT_CHARS) throw new AiError(`${name} хэт урт байна (${MAX_PROMPT_CHARS} тэмдэгтээс ихгүй).`, 400, "bad_input");
  return s;
}

export function requireImage(value: FormDataEntryValue | null) {
  if (!(value instanceof Blob) || value.size === 0) throw new AiError("Зураг оруулна уу.", 400, "bad_input");
  if (!value.type.startsWith("image/")) throw new AiError("Зөвхөн зураг (JPG, PNG, WebP) оруулна уу.", 400, "bad_input");
  if (value.size > MAX_IMAGE_BYTES) throw new AiError("Зураг 8MB-аас ихгүй байх ёстой.", 413, "bad_input");
  return value;
}

/** Reasoning загварууд <think>…</think> буцааж болох тул цэвэрлэнэ */
function stripThinking(s: string) {
  return s.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
}

export async function chat(task: "text" | "vision", messages: ChatMessages, maxTokens = 1500) {
  if (AI_TASKS[task].provider === "ollama") {
    const text = stripThinking(
      await tracked(ollamaChat(messages as { role: string; content: string }[], maxTokens)),
    );
    if (!text) throw new AiError("AI хоосон хариу буцаалаа. Дахин оролдоно уу.", 502, "empty");
    return text;
  }

  const model = modelFor(task);
  const res = await tracked(client().chatCompletion({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.8,
    // gpt-oss нь бодох хэсгээ max_tokens-оос зарцуулдаг тул бага байлгана
    ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
  }));
  const content = res.choices[0]?.message?.content;
  const text = stripThinking(typeof content === "string" ? content : "");
  if (!text) throw new AiError("AI хоосон хариу буцаалаа. Дахин оролдоно уу.", 502, "empty");
  return text;
}

/** Зураг/видео загварууд англи хэлийг хамгийн сайн ойлгодог тул монгол тайлбарыг орчуулна */
export async function toEnglishPrompt(prompt: string, maxTokens = 600) {
  if (!/[Ѐ-ӿ]/.test(prompt)) return prompt;
  try {
    return await chat(
      "text",
      [
        {
          role: "system",
          content:
            "Translate the user's Mongolian description into one concise, vivid English prompt for an image/video generation model. Keep every concrete detail (products, colors, setting, text). Output only the prompt, no quotes.",
        },
        { role: "user", content: prompt },
      ],
      maxTokens,
    );
  } catch {
    return prompt; // орчуулга бүтэлгүйтвэл эх текстээр нь үргэлжлүүлнэ
  }
}

export async function blobToDataUrl(blob: Blob) {
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  return `data:${blob.type || "image/png"};base64,${base64}`;
}

export const IMAGE_SIZES = {
  square: { width: 1024, height: 1024 },
  portrait: { width: 896, height: 1120 },
  landscape: { width: 1216, height: 688 },
} as const;
export type ImageSize = keyof typeof IMAGE_SIZES;

/** "Хэмнэлттэй" горимд ойролцоогоор хагас хэмжээ (16-д хуваагддаг) — тооцоолол, кредит бага */
const SMALL_IMAGE_SIZES: Record<ImageSize, { width: number; height: number }> = {
  square: { width: 512, height: 512 },
  portrait: { width: 448, height: 560 },
  landscape: { width: 608, height: 336 },
};

export async function textToImage(
  prompt: string,
  size: ImageSize,
  { small = false, translateTokens = 600 }: { small?: boolean; translateTokens?: number } = {},
) {
  const { width, height } = (small ? SMALL_IMAGE_SIZES : IMAGE_SIZES)[size];
  return tracked(client().textToImage(
    {
      model: modelFor("image"),
      provider: "auto",
      inputs: await toEnglishPrompt(prompt, translateTokens),
      // fal-ai нь image_size, бусад provider нь width/height хүлээж авдаг
      parameters: { width, height, image_size: { width, height } },
    },
    { outputType: "blob" },
  ));
}

export async function imageToImage(image: Blob, prompt: string, translateTokens = 600) {
  return tracked(client().imageToImage({
    model: modelFor("edit"),
    provider: "auto",
    inputs: image,
    parameters: { prompt: await toEnglishPrompt(prompt, translateTokens) },
  }));
}

export async function textToVideo(prompt: string, translateTokens = 600) {
  return tracked(client().textToVideo({
    model: modelFor("video"),
    provider: "auto",
    inputs: await toEnglishPrompt(prompt, translateTokens),
  }));
}

export function binary(blob: Blob, fallbackType: string) {
  return new Response(blob, {
    headers: { "Content-Type": blob.type || fallbackType, "Cache-Control": "no-store" },
  });
}

/** Бүх алдааг хэрэглэгчид ойлгомжтой монгол мессеж болгоно */
export function errorResponse(err: unknown, task?: AiTask) {
  const model = task ? modelFor(task) : "";
  let status = 500;
  let code = "error";
  let message = "AI дуудахад алдаа гарлаа.";

  if (err instanceof AiError) {
    ({ status, code, message } = err);
  } else if (err instanceof InferenceClientProviderApiError || err instanceof InferenceClientHubApiError) {
    const upstream = err.httpResponse.status;
    status = 502;
    code = "upstream";
    if (upstream === 401 || upstream === 403) {
      status = 401;
      code = "bad_token";
      message =
        "Hugging Face токен буруу эсвэл эрх хүрэлцэхгүй байна. Токен үүсгэхдээ \"Make calls to Inference Providers\" эрхийг сонгоно уу.";
    } else if (upstream === 402) {
      status = 402;
      code = "no_credits";
      message = "Hugging Face кредит дууссан байна. huggingface.co/settings/billing хуудаснаас шалгана уу.";
    } else if (upstream === 404) {
      code = "model_unavailable";
      message = `${model} загвар одоогоор ямар ч provider дээр ажиллахгүй байна. .env.local-д өөр загвар зааж өгнө үү.`;
    } else if (upstream === 429) {
      status = 429;
      code = "rate_limited";
      message = "Хэт олон хүсэлт илгээлээ. Түр хүлээгээд дахин оролдоно уу.";
    } else {
      message = `Hugging Face алдаа (${upstream}): ${err.message.slice(0, 240)}`;
    }
  } else if (err instanceof InferenceClientRoutingError) {
    status = 502;
    code = "model_unavailable";
    message = `${model} загварыг ажиллуулах provider олдсонгүй. huggingface.co/settings/inference-providers хуудаснаас provider идэвхжүүлэх эсвэл өөр загвар сонгоно уу.`;
  } else if (err instanceof InferenceClientInputError || err instanceof InferenceClientProviderOutputError) {
    status = 502;
    code = "upstream";
    message = `AI буруу хариу буцаалаа: ${err.message.slice(0, 240)}`;
  } else if (err instanceof Error) {
    message = `AI дуудахад алдаа гарлаа: ${err.message.slice(0, 240)}`;
  }

  if (code === "no_credits" || code === "bad_token") setIssue(code);
  if (status >= 500 && code !== "no_token") console.error(`[ai${task ? `:${task}` : ""}]`, err);
  return NextResponse.json({ error: message, code }, { status });
}
