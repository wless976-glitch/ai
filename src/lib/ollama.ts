/**
 * Локал Ollama server-тэй ярилцах давхарга (текст generation).
 * Сервер дээр л ажиллана — browser руу шууд холболт хийхгүй.
 */
import "server-only";
import { AiError } from "./ai-models";

export interface OllamaMessage {
  role: string;
  content: string;
}

export function ollamaHost() {
  return process.env.OLLAMA_HOST?.trim() || "http://localhost:11434";
}

export function ollamaModel() {
  return process.env.OLLAMA_MODEL?.trim() || "qwen2.5";
}

/** Settings хуудасны статусад ашиглана — удаан бол 1.5с-д timeout */
export async function ollamaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${ollamaHost()}/api/tags`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function ollamaChat(messages: OllamaMessage[], maxTokens: number): Promise<string> {
  const model = ollamaModel();
  let res: Response;
  try {
    res = await fetch(`${ollamaHost()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { num_predict: maxTokens },
      }),
    });
  } catch {
    throw new AiError(
      `Ollama сервертэй холбогдож чадсангүй (${ollamaHost()}). "ollama serve" ажиллаж байгаа эсэхийг шалгана уу.`,
      503,
      "ollama_unreachable",
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 404 || /not found/i.test(body)) {
      throw new AiError(
        `"${model}" загвар татагдаагүй байна. "ollama pull ${model}" ажиллуулна уу.`,
        503,
        "model_unavailable",
      );
    }
    throw new AiError(`Ollama алдаа (${res.status}): ${body.slice(0, 240)}`, 502, "upstream");
  }

  const data = (await res.json().catch(() => ({}))) as { message?: { content?: string } };
  const text = data.message?.content?.trim();
  if (!text) throw new AiError("Ollama хоосон хариу буцаалаа. Дахин оролдоно уу.", 502, "empty");
  return text;
}
