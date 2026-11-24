/**
 * Browser талаас /api/ai/* route-уудыг дуудах функцууд.
 * HF_TOKEN энд хэзээ ч ирэхгүй — бүх дуудлага серверээр дамжина.
 */
import { AI_USAGE_HEADER, AI_USAGE_LABELS, DEFAULT_AI_USAGE, type AiIssue, type AiStatus } from "./ai-models";
import { getAiUsage } from "./ai-usage";
import type { KnowledgeSource } from "./academy/knowledge";
import type { GenerateInput } from "./mock-ai";
import type { PlanUsage } from "./plan";
import { mockReelScript, type ReelLength, type ReelScript, type ReelTemplate, type ReelVoice } from "./reel";
import type { BusinessProfile, VideoScene } from "./types";

export class AiRequestError extends Error {
  constructor(
    message: string,
    public code = "error",
  ) {
    super(message);
  }
}

/** AI дуудлага кредит/токены алдаа өгөх эсвэл дахин ажиллаж эхлэхэд store-д мэдэгдэнэ */
type IssueListener = (issue: AiIssue | null) => void;
const issueListeners = new Set<IssueListener>();

export function onAiIssue(listener: IssueListener) {
  issueListeners.add(listener);
  return () => {
    issueListeners.delete(listener);
  };
}

function reportIssue(issue: AiIssue | null) {
  issueListeners.forEach((l) => l(issue));
}

async function call(path: string, init: RequestInit) {
  let res: Response;
  // AI хэрэглээний түвшинг (Хэмнэлттэй / Бүрэн) серверт мэдэгдэнэ — хариултын урт, зургийн хэмжээг тохируулна
  const headers = new Headers(init.headers);
  headers.set(AI_USAGE_HEADER, getAiUsage());
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new AiRequestError("Сервертэй холбогдож чадсангүй.", "network");
  }
  const tracksIssue = path.startsWith("/api/ai/") && path !== "/api/ai/status";
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string; code?: string });
    const code = body.code ?? "error";
    if (tracksIssue && (code === "no_credits" || code === "bad_token")) reportIssue(code);
    throw new AiRequestError(body.error ?? `Алдаа гарлаа (${res.status})`, code);
  }
  if (tracksIssue) reportIssue(null);
  return res;
}

const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export interface GeneratedMedia {
  blob: Blob;
  url: string;
}

async function media(res: Response): Promise<GeneratedMedia> {
  const blob = await res.blob();
  return { blob, url: URL.createObjectURL(blob) };
}

export async function fetchAiStatus(): Promise<AiStatus> {
  const res = await call("/api/ai/status", { cache: "no-store" });
  return res.json();
}

/* ---------- "Токенгүй" горим: AI дуудахгүй, жишээ хариулт (0 токен) ---------- */

const isMock = () => getAiUsage() === "mock";
const pause = () => new Promise((r) => setTimeout(r, 500));
const MOCK_SWITCH = `Бодит хариулт авах бол Тохиргоо → AI хэрэглээ хэсгээс «${AI_USAGE_LABELS[DEFAULT_AI_USAGE].label}» горимыг сонгоно уу.`;

function mockAnswer(question: string) {
  const q = question.replace(/\s+/g, " ").trim().slice(0, 140);
  return [
    "**Жишээ хариулт** — «Токенгүй» горимд AI дуудахгүй, токен зарцуулахгүй.",
    "",
    `Таны асуулт: “${q}”`,
    "",
    "- Энд бодит AI-ийн хариулт гарна",
    "- Жагсаалт, **тод** үг зэрэг хэлбэржүүлэлт ингэж харагдана",
    `- ${MOCK_SWITCH}`,
  ].join("\n");
}

const escapeXml = (s: string) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Жишээ зураг: харанхуй дэвсгэр дээр тайлбар бичсэн SVG */
function mockImage(prompt: string, size: ImageSize): GeneratedMedia {
  const [w, h] = size === "portrait" ? [896, 1120] : size === "landscape" ? [1216, 688] : [1024, 1024];
  const text = escapeXml(prompt.replace(/\s+/g, " ").trim().slice(0, 60));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#10100e"/><circle cx="${w / 2}" cy="${h / 2 - 60}" r="70" fill="#d4e93f" opacity="0.9"/><text x="50%" y="${h / 2 + 70}" text-anchor="middle" font-family="sans-serif" font-size="40" fill="#ffffff">Жишээ зураг</text><text x="50%" y="${h / 2 + 125}" text-anchor="middle" font-family="sans-serif" font-size="26" fill="#ffffff" opacity="0.6">${text}</text></svg>`;
  const blob = new Blob([svg], { type: "image/svg+xml" });
  return { blob, url: URL.createObjectURL(blob) };
}

export async function generatePostsAI(input: GenerateInput) {
  if (isMock()) throw new AiRequestError(`«Токенгүй» горимд AI пост бичихгүй. ${MOCK_SWITCH}`, "mock_mode");
  const res = await call("/api/ai/posts", json(input));
  const data: { variants: { angle: string; caption: string; hashtags: string[]; script?: VideoScene[] }[] } =
    await res.json();
  return data.variants;
}

export async function generateText(prompt: string, businessName?: string) {
  if (isMock()) return pause().then(() => mockAnswer(prompt));
  const res = await call("/api/ai/text", json({ prompt, businessName }));
  return ((await res.json()) as { text: string }).text;
}

export interface AskMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AskResult {
  text: string;
  /** Үнэгүй багцад өнөөдөр үлдсэн асуулт (Plus-д null) */
  remaining: number | null;
  /** Хариултад ашигласан сургалтын хичээлүүд */
  sources: KnowledgeSource[];
}

/**
 * "AI-аас асуух" чат — ярианы түүхийг илгээж дараагийн хариултыг авна.
 * «Токенгүй» горимд AI-ийн оронд Сургалтаас хамгийн хамааралтай хичээлийг хариулна (0 токен).
 */
export async function askAI(messages: AskMessage[], business?: Partial<BusinessProfile>): Promise<AskResult> {
  if (isMock()) {
    const question = messages.at(-1)?.content ?? "";
    const found = await call("/api/knowledge", json({ question }))
      .then((r) => r.json() as Promise<{ text: string; sources: KnowledgeSource[] }>)
      .catch(() => ({ text: "", sources: [] }));
    if (found.text) {
      return {
        text: `${found.text}\n\n«Токенгүй» горим: AI биш, Сургалтын хичээлээс ишлэв. ${MOCK_SWITCH}`,
        remaining: null,
        sources: found.sources,
      };
    }
    await pause();
    return { text: mockAnswer(question), remaining: null, sources: [] };
  }
  const res = await call("/api/ai/ask", json({ messages, business }));
  const data = (await res.json()) as Partial<AskResult> & { text: string };
  return { text: data.text, remaining: data.remaining ?? null, sources: Array.isArray(data.sources) ? data.sources : [] };
}

/** Одоогийн багц ба өнөөдрийн AI хэрэглээ */
export async function fetchPlanUsage(): Promise<PlanUsage> {
  const res = await call("/api/plan", { cache: "no-store" });
  return res.json();
}

export async function imageToText(image: Blob, mode: "caption" | "describe", businessName?: string) {
  if (isMock()) {
    await pause();
    return `**Жишээ ${mode === "describe" ? "тайлбар" : "пост"}** — «Токенгүй» горимд зургийг AI уншихгүй. ${MOCK_SWITCH}`;
  }
  const form = new FormData();
  form.append("image", image, "image.jpg");
  form.append("mode", mode);
  if (businessName) form.append("businessName", businessName);
  const res = await call("/api/ai/image-to-text", { method: "POST", body: form });
  return ((await res.json()) as { text: string }).text;
}

export type ImageSize = "square" | "portrait" | "landscape";

export async function textToImage(prompt: string, size: ImageSize = "square") {
  if (isMock()) return pause().then(() => mockImage(prompt, size));
  return media(await call("/api/ai/text-to-image", json({ prompt, size })));
}

export async function imageToImage(image: Blob, prompt: string) {
  // Токенгүй горимд оруулсан зургийг өөрчлөлгүй буцаана
  if (isMock()) return pause().then(() => ({ blob: image, url: URL.createObjectURL(image) }));
  const form = new FormData();
  form.append("image", image, "image.jpg");
  form.append("prompt", prompt);
  return media(await call("/api/ai/image-to-image", { method: "POST", body: form }));
}

export async function textToVideo(prompt: string) {
  if (isMock()) throw new AiRequestError(`«Токенгүй» горимд видео үүсгэхгүй. ${MOCK_SWITCH}`, "mock_mode");
  return media(await call("/api/ai/text-to-video", json({ prompt })));
}

export interface ReelInput {
  question: string;
  template: ReelTemplate;
  length: ReelLength;
  business: Pick<BusinessProfile, "name" | "industry" | "description">;
}

/** Reels түүхийн сценари. Токенгүй горимд жишээ сценари буцаана (видеог нь бүрэн зурна). */
export async function generateReel(input: ReelInput): Promise<ReelScript> {
  if (isMock()) return pause().then(() => mockReelScript(input.question, input.business.name, input.length));
  const res = await call("/api/ai/reel", json(input));
  return ((await res.json()) as { script: ReelScript }).script;
}

export interface VoiceStatus {
  available: boolean;
  provider: "voicestudio" | "azure" | null;
  /** VOICESTUDIO_URL тохируулсан ч програм нь асаагүй */
  voiceStudioOffline: boolean;
}

/** Монгол хоолой (VoiceStudio эсвэл Azure Speech) ашиглах боломжтой эсэх */
export async function fetchVoiceStatus(): Promise<VoiceStatus> {
  try {
    const res = await fetch("/api/ai/tts", { cache: "no-store" });
    if (!res.ok) throw new Error();
    const body = (await res.json()) as { available?: boolean; provider?: VoiceStatus["provider"]; voiceStudioConfigured?: boolean };
    const available = Boolean(body.available);
    return { available, provider: body.provider ?? null, voiceStudioOffline: !available && Boolean(body.voiceStudioConfigured) };
  } catch {
    return { available: false, provider: null, voiceStudioOffline: false };
  }
}

export async function synthesizeVoice(text: string, voice: Exclude<ReelVoice, "none">): Promise<Blob> {
  if (isMock()) throw new AiRequestError("«Токенгүй» горимд хоолой үүсгэхгүй.", "mock_mode");
  const res = await call("/api/ai/tts", json({ text, voice }));
  return res.blob();
}

/**
 * Утасны том зургийг (12MP+) 1280px болгож багасгана — upload хурдан, AI-д хангалттай.
 * Багасгах боломжгүй бол эх файлыг нь буцаана.
 */
export async function prepareImage(file: File, maxSide = 1280): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", 0.9),
    );
  } catch {
    return file;
  }
}

export function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Алдаа гарлаа.";
}
