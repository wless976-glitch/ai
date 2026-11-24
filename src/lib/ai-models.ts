/**
 * Hugging Face загваруудын тохиргоо (клиент ба сервер хоёулаа ашиглана — нууц мэдээлэлгүй).
 * Загварыг солих бол .env.local-д HF_TEXT_MODEL=... гэх мэтээр дарж бичнэ.
 */
export type AiTask = "text" | "vision" | "image" | "edit" | "video";

export type AiProvider = "hf" | "ollama";

export interface AiTaskInfo {
  label: string;
  provider: AiProvider;
  /** Hugging Face дээрх task-ийн нэр, эсвэл Ollama-д зориулсан тайлбар */
  hfTask: string;
  env: string;
  defaultModel: string;
  description: string;
}

export const AI_TASKS: Record<AiTask, AiTaskInfo> = {
  text: {
    label: "Текст бичих",
    // Монгол текстэд локал 7B загвар сул, удаан байсан тул HF руу шилжүүлэв.
    // Локал руу буцаах бол: provider "ollama", env "OLLAMA_MODEL", defaultModel "qwen2.5".
    provider: "hf",
    hfTask: "Text generation",
    env: "HF_TEXT_MODEL",
    defaultModel: "google/gemma-4-26B-A4B-it",
    description: "Постын текст, санаа, хариулт бичнэ",
  },
  vision: {
    label: "Зураг → Текст",
    provider: "hf",
    hfTask: "Image to text",
    env: "HF_VISION_MODEL",
    defaultModel: "google/gemma-4-31B-it",
    description: "Бүтээгдэхүүний зургийг уншиж пост бичнэ",
  },
  image: {
    label: "Текст → Зураг",
    provider: "hf",
    hfTask: "Text to image",
    env: "HF_IMAGE_MODEL",
    defaultModel: "black-forest-labs/FLUX.1-schnell",
    description: "Тайлбараас постын зураг үүсгэнэ",
  },
  edit: {
    label: "Зураг → Зураг",
    provider: "hf",
    hfTask: "Image to image",
    env: "HF_EDIT_MODEL",
    defaultModel: "black-forest-labs/FLUX.2-klein-4B",
    description: "Өөрийн зургийн фон, орчныг өөрчилнө",
  },
  video: {
    label: "Текст → Видео",
    provider: "hf",
    hfTask: "Text to video",
    env: "HF_VIDEO_MODEL",
    defaultModel: "Wan-AI/Wan2.2-TI2V-5B",
    description: "Reel-д зориулсан богино видео үүсгэнэ",
  },
};

export const AI_TASK_ORDER: AiTask[] = ["text", "vision", "image", "edit", "video"];

/** Аль нэг даалгавар локал Ollama ашиглаж байгаа эсэх (статус шалгах, анхааруулга харуулахад) */
export const USES_OLLAMA = AI_TASK_ORDER.some((t) => AI_TASKS[t].provider === "ollama");

/** Сервер болон клиент хоёулаа ашиглана — prompt-ийн дээд урт */
export const MAX_PROMPT_CHARS = 1500;

/** Токен байгаа ч AI ажиллахгүй байгаа шалтгаан (сүүлийн дуудлагаас мэдэгдэнэ) */
export type AiIssue = "no_credits" | "bad_token";

export const AI_ISSUE_LABELS: Record<AiIssue, string> = {
  no_credits: "Кредит дууссан",
  bad_token: "Токен буруу",
};

export interface AiStatus {
  /** Hugging Face токен (vision/image/edit/video даалгаварт хэрэгтэй) тохируулсан эсэх */
  connected: boolean;
  models: Record<AiTask, string>;
  /** null = сүүлийн дуудлага амжилттай эсвэл одоогоор дуудаагүй */
  issue?: AiIssue | null;
  /** Локал Ollama server хүрэх боломжтой эсэх (Ollama ашигладаг даалгавар байхгүй бол шалгахгүй, false) */
  ollama: { reachable: boolean };
}

export function defaultModels(): Record<AiTask, string> {
  return Object.fromEntries(AI_TASK_ORDER.map((t) => [t, AI_TASKS[t].defaultModel])) as Record<AiTask, string>;
}

/** "black-forest-labs/FLUX.1-schnell" → "FLUX.1-schnell" */
export function shortModel(id: string) {
  return id.split("/").pop() ?? id;
}

export class AiError extends Error {
  constructor(
    message: string,
    public status = 500,
    public code = "error",
  ) {
    super(message);
  }
}

/**
 * AI хэрэглээний түвшин — тест хийхдээ HF кредит хэмнэхэд:
 * - mock: AI огт дуудахгүй, жишээ хариулт (0 токен) — browser талд шийдэгдэнэ
 * - lite: богино хариулт, богино ярианы түүх, жижиг зураг
 * - full: бүрэн хэмжээ
 * Browser нь `x-ai-usage` header-ээр илгээнэ, сервер AI_LIMITS-ийг ашиглана.
 */
export type AiUsage = "mock" | "lite" | "full";

/**
 * "Хэмнэлттэй" горим (үндсэн) — токен хэмнэнэ. `false` болговол бүх AI хүсэлт "Бүрэн" хязгаараар
 * явж, Тохиргоонд зөвхөн "Токенгүй" / "Бүрэн" сонголт үлдэнэ.
 */
export const LITE_MODE_ENABLED = true;
export const DEFAULT_AI_USAGE: AiUsage = LITE_MODE_ENABLED ? "lite" : "full";
/** Тохиргоонд харагдах сонголтууд */
export const AI_USAGE_OPTIONS: AiUsage[] = LITE_MODE_ENABLED ? ["mock", "lite", "full"] : ["mock", "full"];
export const AI_USAGE_HEADER = "x-ai-usage";

export const AI_USAGE_LABELS: Record<AiUsage, { label: string; hint: string }> = {
  mock: { label: "Токенгүй", hint: "AI дуудахгүй, жишээ хариулт — 0 токен. Дэлгэц, урсгалыг шалгахад." },
  lite: { label: "Хэмнэлттэй", hint: "Богино хариулт, сүүлийн 4 мессеж, 2 хичээлийн мэдлэг, жижиг зураг — тест хийхэд." },
  full: { label: "Бүрэн", hint: "Урт хариулт, сүүлийн 12 мессеж, 3 хичээлийн мэдлэг, бүтэн хэмжээтэй зураг." },
};

/** Хариултын дээд урт (max_tokens), ярианы түүх, зургийн хэмжээ */
export const AI_LIMITS: Record<Exclude<AiUsage, "mock">, {
  ask: number;
  askHistory: number;
  askAssistantChars: number;
  text: number;
  vision: number;
  posts: number;
  translate: number;
  smallImages: boolean;
  /** Сургалтаас AI-д нэмэх мэдлэгийн дээд урт (тэмдэгт) ба хичээлийн тоо — оролтын токен */
  knowledgeChars: number;
  knowledgeHits: number;
}> = {
  lite: { ask: 350, askHistory: 4, askAssistantChars: 800, text: 400, vision: 300, posts: 1100, translate: 120, smallImages: true, knowledgeChars: 1200, knowledgeHits: 2 },
  full: { ask: 1200, askHistory: 12, askAssistantChars: 4000, text: 1500, vision: 1200, posts: 2500, translate: 600, smallImages: false, knowledgeChars: 3200, knowledgeHits: 3 },
};
