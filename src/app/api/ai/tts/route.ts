import { NextResponse } from "next/server";
import { requirePlus } from "@/lib/plan-server";
import { AiError, errorResponse, guard } from "@/lib/hf";

export const maxDuration = 300;

/**
 * Монгол хоолой (text-to-speech). Хоёр эх үүсвэр:
 *
 * 1. VoiceStudio (үндсэн) — өөрийн компьютер/сервер дээр ажилладаг, үнэгүй, OmniVoice загвар монгол
 *    хэл (mn) дэмждэг. OpenAI-тэй ижил `POST /v1/audio/speech` API-тай.
 *    .env.local: VOICESTUDIO_URL (жишээ: http://127.0.0.1:3900)
 *    Заавал биш: VOICESTUDIO_MODEL (анх нь omnivoice), VOICESTUDIO_API_KEY (алсын сервер бол),
 *    VOICESTUDIO_VOICE_FEMALE /
 *    VOICESTUDIO_VOICE_MALE (VoiceStudio-д хадгалсан хоолойн нэр эсвэл id — clone хийсэн хоолой).
 *    Анхаар: Vercel дээрх сервер таны компьютерын localhost-д хүрэхгүй — тэнд ашиглах бол
 *    VoiceStudio-г интернэтээс хүрэх HTTPS хаяг дээр (API key-тэй) байрлуулна.
 *
 * 2. Azure AI Speech (нөөц) — сард 500,000 тэмдэгт үнэгүй.
 *    .env.local: AZURE_SPEECH_KEY, AZURE_SPEECH_REGION (жишээ: eastus)
 *
 * VoiceStudio тохируулсан ч асаагүй/холбогдохгүй бол Azure руу шилжинэ.
 */
type Gender = "female" | "male";
const AZURE_VOICES: Record<Gender, string> = { female: "mn-MN-YesuiNeural", male: "mn-MN-BataaNeural" };
/** Хадгалсан хоолой заагаагүй бол OmniVoice voice design-аар хүйсийг нь тодорхойлно */
const VOICESTUDIO_DESIGN: Record<Gender, string> = { female: "female, young adult", male: "male, middle-aged" };
const MAX_CHARS = 400;

function azureConfig() {
  const key = process.env.AZURE_SPEECH_KEY?.trim();
  const region = process.env.AZURE_SPEECH_REGION?.trim();
  return key && region ? { key, region } : null;
}

function voiceStudioConfig() {
  const url = process.env.VOICESTUDIO_URL?.trim().replace(/\/+$/, "");
  if (!url) return null;
  return {
    url,
    /** Монгол хэл дэмждэг engine (OmniVoice нь VoiceStudio-ийн үндсэн загвар) */
    model: process.env.VOICESTUDIO_MODEL?.trim() || "omnivoice",
    apiKey: process.env.VOICESTUDIO_API_KEY?.trim() || null,
    voices: {
      female: process.env.VOICESTUDIO_VOICE_FEMALE?.trim() || null,
      male: process.env.VOICESTUDIO_VOICE_MALE?.trim() || null,
    } satisfies Record<Gender, string | null>,
  };
}
type VoiceStudioConfig = NonNullable<ReturnType<typeof voiceStudioConfig>>;

const authHeaders = (cfg: VoiceStudioConfig): Record<string, string> =>
  cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {};

/** VoiceStudio асаалттай эсэх (UI-д хоолойны сонголт харуулахын тулд хурдан шалгана) */
async function voiceStudioUp(cfg: VoiceStudioConfig) {
  try {
    const res = await fetch(`${cfg.url}/health`, {
      headers: authHeaders(cfg),
      cache: "no-store",
      signal: AbortSignal.timeout(2_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Холбогдож чадаагүй (асаагүй) үед Azure руу шилжихийн тулд тусад нь ялгана */
class Unreachable extends Error {}

/**
 * VoiceStudio-д зарцуулах нийт хугацаа (maxDuration-аас бага). Анхны дуудлагад загвараа санах ойд
 * ачаалдаг тул удаан (8 GB Mac дээр ~2 мин), мөн дүүрсэн үед дахин оролдох хугацаа үүнд багтана.
 */
const VOICESTUDIO_BUDGET_MS = 280_000;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function viaVoiceStudio(cfg: VoiceStudioConfig, text: string, gender: Gender): Promise<ArrayBuffer> {
  const saved = cfg.voices[gender];
  const body = JSON.stringify({
    model: cfg.model,
    input: text,
    language: "mn",
    response_format: "mp3",
    speed: 1.06,
    ...(saved ? { voice: saved } : { voice: "default", instruct: VOICESTUDIO_DESIGN[gender] }),
  });
  const deadline = Date.now() + VOICESTUDIO_BUDGET_MS;

  for (;;) {
    let res: Response;
    try {
      res = await fetch(`${cfg.url}/v1/audio/speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders(cfg) },
        body,
        signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "TimeoutError") {
        throw new AiError("VoiceStudio хэт удаан хариулж байна. Загвар ачаалж дуусахыг хүлээгээд дахин оролдоно уу.", 504, "upstream");
      }
      throw new Unreachable();
    }
    if (res.ok) return res.arrayBuffer();

    // VoiceStudio (ялангуяа Mac дээр) нэг удаад нэг л хоолой үүсгэж, дараалалд нэгийг хүлээлгэдэг.
    // Reels кадруудыг зэрэг илгээхэд илүүдэл нь 429 (эсвэл retryable 503) авна — хэлсэн
    // хугацаагаар нь хүлээгээд дахин оролдоно. Санамсаргүй нэмэлт нь хүлээж буй хүсэлтүүдийг
    // яг нэг мөчид дахин мөргөлдүүлэхгүй.
    const retryable = res.status === 429 || res.headers.get("X-OmniVoice-Retryable") === "true";
    const wait = Math.min(15, Math.max(2, Number(res.headers.get("Retry-After")) || 5)) * 1000 + Math.random() * 1500;
    if (retryable && Date.now() + wait < deadline) {
      await res.body?.cancel();
      await sleep(wait);
      continue;
    }
    return voiceStudioFailure(res, cfg, saved);
  }
}

async function voiceStudioFailure(res: Response, cfg: VoiceStudioConfig, saved: string | null): Promise<never> {
  // OpenAI хэлбэрийн алдаа: {"error": {"message", "code"}}
  const detail = await res
    .json()
    .then((b: { error?: { message?: string } }) => b?.error?.message ?? "")
    .catch(() => "");
  if (res.status === 401 || res.status === 403) {
    throw new AiError("VoiceStudio API key буруу байна (VOICESTUDIO_API_KEY).", 401, "bad_tts_key");
  }
  if (res.status === 404) {
    throw new AiError(`VoiceStudio-д «${cfg.model}» загвар суулгаагүй байна. Model Manager-аас суулгана уу.`, 503, "no_tts");
  }
  if (res.status === 409) {
    throw new AiError(`VoiceStudio-д «${saved}» нэртэй хэд хэдэн хоолой байна — нэрийг нь өөрчлөх эсвэл id-г нь заана уу.`, 400, "bad_voice");
  }
  if (res.status === 429) {
    throw new AiError("VoiceStudio завгүй байна (өөр хоолой үүсгэж байна). Түр хүлээгээд дахин оролдоно уу.", 429, "rate_limited");
  }
  console.error("VoiceStudio TTS алдаа", res.status, detail);
  throw new AiError(`VoiceStudio хоолой үүсгэж чадсангүй (${res.status})${detail ? `: ${detail}` : "."}`, 502, "upstream");
}

const escapeXml = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

async function viaAzure(cfg: { key: string; region: string }, text: string, gender: Gender): Promise<ArrayBuffer> {
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="mn-MN"><voice name="${AZURE_VOICES[gender]}"><prosody rate="+6%">${escapeXml(text)}</prosody></voice></speak>`;
  let res: Response;
  try {
    res = await fetch(`https://${cfg.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": cfg.key,
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "tugee",
      },
      body: ssml,
      signal: AbortSignal.timeout(30_000),
    });
  } catch {
    throw new AiError("Хоолойны сервертэй холбогдож чадсангүй.", 502, "upstream");
  }
  if (res.status === 401 || res.status === 403) {
    throw new AiError("Azure Speech түлхүүр буруу эсвэл бүс (region) таарахгүй байна.", 401, "bad_tts_key");
  }
  if (res.status === 429) throw new AiError("Хоолойны хязгаар хэтэрлээ. Түр хүлээгээд дахин оролдоно уу.", 429, "rate_limited");
  if (!res.ok) throw new AiError(`Хоолой үүсгэхэд алдаа гарлаа (${res.status}).`, 502, "upstream");
  return res.arrayBuffer();
}

/** Хоолой ашиглах боломжтой эсэх — UI сонголтыг нээх/хаахад */
export async function GET() {
  const vs = voiceStudioConfig();
  if (vs && (await voiceStudioUp(vs))) return NextResponse.json({ available: true, provider: "voicestudio" });
  if (azureConfig()) return NextResponse.json({ available: true, provider: "azure" });
  return NextResponse.json({ available: false, provider: null, voiceStudioConfigured: vs !== null });
}

export async function POST(req: Request) {
  try {
    await guard();
    await requirePlus("Монгол хоолой");
    const vs = voiceStudioConfig();
    const azure = azureConfig();
    if (!vs && !azure) {
      throw new AiError("Монгол хоолой тохируулаагүй байна (VOICESTUDIO_URL эсвэл AZURE_SPEECH_KEY).", 503, "no_tts");
    }
    const body = await req.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.replace(/\s+/g, " ").trim() : "";
    if (text.length < 1) throw new AiError("Унших бичвэр хоосон байна.", 400, "bad_input");
    if (text.length > MAX_CHARS) throw new AiError(`Бичвэр ${MAX_CHARS} тэмдэгтээс ихгүй байх ёстой.`, 400, "bad_input");
    const gender: Gender = body.voice === "male" ? "male" : "female";

    let audio: ArrayBuffer | null = null;
    if (vs) {
      try {
        audio = await viaVoiceStudio(vs, text, gender);
      } catch (err) {
        if (!(err instanceof Unreachable)) throw err;
        if (!azure) {
          throw new AiError(`VoiceStudio (${vs.url}) асаагүй байна. Програмаа нээгээд дахин оролдоно уу.`, 503, "no_tts");
        }
      }
    }
    audio ??= await viaAzure(azure!, text, gender);

    return new Response(audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
