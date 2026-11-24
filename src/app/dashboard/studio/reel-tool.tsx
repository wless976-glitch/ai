"use client";

/**
 * Reels түүх (durs.ai-ийн "Ганц асуулт" шиг): асуулт → AI сценари → загварын дагуу хөдөлгөөнт
 * 9:16 видео (хадмал, хөгжим, эффект, монгол хоолой) → MP4 татах / пост болгох.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ChoicePills,
  IdeaChips,
  pickOther,
  PromptBox,
  SettingGroup,
  ShuffleButton,
  StepTitle,
  TogglePill,
  type Idea,
} from "@/components/composer";
import {
  IconAlert,
  IconCheck,
  IconFlame,
  IconPencil,
  IconRefresh,
  IconSparkles,
  IconSun,
  IconVideo,
  IconX,
} from "@/components/icons";
import { exportReel, reelMime, ReelPlayer, type ReelSource } from "@/components/reel-player";
import { Button, cn, inputClass } from "@/components/ui";
import { errorMessage, fetchVoiceStatus, generateReel, synthesizeVoice, type GeneratedMedia } from "@/lib/ai-client";
import { useAiUsage } from "@/lib/ai-usage";
import { MAX_PROMPT_CHARS } from "@/lib/ai-models";
import {
  buildTimeline,
  REEL_LENGTHS,
  REEL_TEMPLATE_ORDER,
  REEL_TEMPLATES,
  REEL_VOICES,
  type ReelLength,
  type ReelScene,
  type ReelScript,
  type ReelTemplate,
  type ReelVoice,
} from "@/lib/reel";
import { decodeVoice, renderSoundtrack } from "@/lib/reel-audio";
import { drawReel, frameAt, loadReelFonts, reelPopTimes, type ReelBrand, type ReelFonts } from "@/lib/reel-render";
import { useStore } from "@/lib/store";
import { CopyButton, MediaActions, ResultPanel, ToolFooter, ToolLayout, useTask } from "./shared";

const REEL_TIME = "20–40 секунд";

const REEL_IDEAS: Idea[] = [
  { text: "Хэрвээ кофе байгаагүй бол?", icon: IconFlame, hot: true },
  { text: "Шинэ жилийн бэлгийг яаж сонгох вэ?", icon: IconSparkles },
  { text: "Өглөө бүр кофе уувал юу болох вэ?", icon: IconSun },
  { text: "Манай бүтээгдэхүүн яаж бүтдэг вэ?", icon: IconRefresh },
];

const reelPool = (name: string) => [
  "Хэрвээ дэлхий эргэхээ 5 секунд зогсвол?",
  "Хэрвээ бүх дэлгүүр нэг өдөр хаагдвал?",
  "Яагаад гар хийцийн зүйл удаан эдэлгээтэй вэ?",
  "Өвөл халуун ундаа яагаад илүү амттай санагддаг вэ?",
  "Хэрвээ интернэт нэг өдөр тасарвал?",
  "Хүмүүс яагаад шинэ жилээр бэлэг өгдөг болсон бэ?",
  `${name} яаж эхэлсэн бэ?`,
  "Нэг аяга кофенд хэдэн ширхэг үр ордог вэ?",
];

/** Загварын жишээ зурагт ашиглах сценари */
const SAMPLE: ReelScript = {
  title: "Дэлхий 5 секунд зогсвол?",
  question: "Хэрвээ дэлхий эргэхээ 5 секунд зогсвол?",
  scenes: [
    {
      headline: "Дэлхий 5 секунд зогсвол?",
      narration: "Хэрвээ дэлхий эргэхээ гэнэт зогсвол юу болох вэ?",
      stat: "1,670 км/ц",
      emoji: "🌍",
    },
    { headline: "Бүх зүйл нисэнэ", narration: "Экватор дээр бид цагт 1,670 км хурдтай хөдөлж байдаг.", stat: "", emoji: "💨" },
  ],
  caption: "",
  hashtags: [],
};
const SAMPLE_TL = buildTimeline(SAMPLE.scenes);
const THUMB_T: Record<ReelTemplate, number> = { kinetic: 1.6, neon: 2.2, news: 1.4, chat: 2.4, trailer: 1.5, notebook: 1.7 };

/** Хоолойгоор уншуулсан кадруудыг санана — загвар солиход дахин уншуулахгүй */
const voiceCache = new Map<string, AudioBuffer>();

async function voicesFor(scenes: ReelScene[], voice: Exclude<ReelVoice, "none">) {
  const out: (AudioBuffer | null)[] = new Array(scenes.length).fill(null);
  let next = 0;
  // Нэг дор 3 хүсэлт
  await Promise.all(
    Array.from({ length: Math.min(3, scenes.length) }, async () => {
      while (next < scenes.length) {
        const k = next++;
        const text = scenes[k].narration.trim();
        if (!text) continue;
        const key = `${voice}|${text}`;
        let buf = voiceCache.get(key);
        if (!buf) {
          buf = await decodeVoice(await synthesizeVoice(text, voice));
          voiceCache.set(key, buf);
        }
        out[k] = buf;
      }
    }),
  );
  return out;
}

type ExportState =
  | { status: "idle" }
  | { status: "recording"; progress: number }
  | { status: "done"; media: GeneratedMedia }
  | { status: "error"; error: string };

export function ReelTool({ modeSwitch }: { modeSwitch: ReactNode }) {
  const { business } = useStore();
  const aiUsage = useAiUsage();
  const [question, setQuestion] = useState("");
  const [template, setTemplate] = useState<ReelTemplate>("kinetic");
  const [length, setLength] = useState<ReelLength>("medium");
  const [voice, setVoice] = useState<ReelVoice>("none");
  const [music, setMusic] = useState(true);
  const [voiceAvailable, setVoiceAvailable] = useState<boolean | null>(null);
  const [voiceStudioOffline, setVoiceStudioOffline] = useState(false);
  const [fonts, setFonts] = useState<ReelFonts | null>(null);
  const [task, run] = useTask<ReelScript>();
  const [script, setScript] = useState<ReelScript | null>(null);
  const [draft, setDraft] = useState<ReelScript | null>(null);
  const [source, setSource] = useState<ReelSource | null>(null);
  const [building, setBuilding] = useState<"voice" | "audio" | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [exp, setExp] = useState<ExportState>({ status: "idle" });
  // Видео бичих формат — зөвхөн browser-т (үр дүн нь хэрэглэгч товшсоны дараа л харагдана)
  const [mime] = useState(() => (typeof window === "undefined" ? null : reelMime()));
  const abortRef = useRef<AbortController | null>(null);
  const brand = useMemo<ReelBrand>(() => ({ name: business.name || "Манай бизнес", handle: business.handle }), [business.name, business.handle]);
  const mock = aiUsage === "mock";
  const voiceOn = voice !== "none" && voiceAvailable === true && !mock;

  useEffect(() => {
    let alive = true;
    loadReelFonts().then((f) => alive && setFonts(f));
    fetchVoiceStatus().then((s) => {
      if (!alive) return;
      setVoiceAvailable(s.available);
      setVoiceStudioOffline(s.voiceStudioOffline);
      if (s.available) setVoice((cur) => (cur === "none" ? "female" : cur));
    });
    return () => {
      alive = false;
      abortRef.current?.abort();
    };
  }, []);

  // Сценари, загвар, дуу солигдох бүрт видеог (дуу + цагийн хуваарь) дахин угсарна
  useEffect(() => {
    if (!script || !fonts) return;
    let alive = true;
    (async () => {
      // Загвар л солигдсон бол зургийг шууд солиод, дууг нь ард нь дахин бичнэ
      setSource((prev) => (prev && prev.script === script && prev.template !== template ? { ...prev, template } : prev));
      let voices: (AudioBuffer | null)[] | null = null;
      if (voiceOn) {
        setBuilding("voice");
        try {
          voices = await voicesFor(script.scenes, voice as Exclude<ReelVoice, "none">);
          if (alive) setVoiceError(null);
        } catch (err) {
          if (alive) setVoiceError(`Монгол хоолой бичүүлж чадсангүй: ${errorMessage(err)} Хоолойгүйгээр үргэлжлүүллээ.`);
        }
      }
      if (!alive) return;
      setBuilding("audio");
      const tl = buildTimeline(
        script.scenes,
        voices?.map((b) => b?.duration ?? null),
      );
      const audio = await renderSoundtrack({
        tl,
        mood: REEL_TEMPLATES[template].mood,
        music,
        voices,
        popTimes: reelPopTimes(template, script, tl),
      });
      if (!alive) return;
      setSource({ script, template, brand, fonts, tl, audio });
      setExp({ status: "idle" });
      setBuilding(null);
    })();
    return () => {
      alive = false;
    };
  }, [script, template, music, voice, voiceOn, fonts, brand]);

  async function submit() {
    abortRef.current?.abort();
    setSource(null);
    setExp({ status: "idle" });
    const out = await run(() =>
      generateReel({
        question,
        template,
        length,
        business: { name: business.name, industry: business.industry, description: business.description },
      }),
    );
    if (out) {
      setScript(out);
      setDraft(out);
    }
  }

  async function startExport() {
    if (!source) return;
    const ac = new AbortController();
    abortRef.current = ac;
    setExp({ status: "recording", progress: 0 });
    try {
      const media = await exportReel(source, (p) => setExp({ status: "recording", progress: p }), ac.signal);
      setExp({ status: "done", media });
    } catch (err) {
      setExp(ac.signal.aborted ? { status: "idle" } : { status: "error", error: errorMessage(err) });
    }
  }

  const dirty = draft !== null && script !== null && JSON.stringify(draft.scenes) !== JSON.stringify(script.scenes);
  const ext = mime?.startsWith("video/mp4") ? "MP4" : "WebM";

  return (
    <ToolLayout
      status={task.status}
      steps={
        <>
          {modeSwitch}
          <section>
            <StepTitle n={1} title="Асуултаа бич" aside={<span className="text-xs text-zinc-400">Нэг өгүүлбэр л хангалттай</span>} />
            <div className="mt-3">
              <PromptBox
                id="reel-question"
                label="Асуулт эсвэл санаа"
                value={question}
                onChange={setQuestion}
                max={MAX_PROMPT_CHARS}
                placeholder="Жишээ: Хэрвээ кофе байгаагүй бол?"
                tip="AI үүнийг эхлэл, баримт, эргэлт, төгсгөлтэй түүх болгоод сүүлд нь танай бизнестэй холбоно."
              />
            </div>
            <IdeaChips ideas={REEL_IDEAS} value={question} onPick={setQuestion} />
            <ShuffleButton onClick={() => setQuestion(pickOther(reelPool(brand.name), question))} />
          </section>

          <section>
            <StepTitle n={2} title="Загвараа сонго" aside={<span className="text-xs text-zinc-400">Дараа нь ч сольж болно</span>} />
            <div role="radiogroup" aria-label="Видеоны загвар" className="mt-3 grid grid-cols-3 gap-2 sm:gap-3">
              {REEL_TEMPLATE_ORDER.map((t) => (
                <TemplateCard key={t} template={t} on={template === t} fonts={fonts} brand={brand} onPick={() => setTemplate(t)} />
              ))}
            </div>
          </section>

          <section>
            <StepTitle n={3} title="Тохиргоо" />
            <div className="mt-3 flex flex-wrap gap-2.5">
              <SettingGroup label="Урт">
                <ChoicePills
                  label="Видеоны урт"
                  value={length}
                  onChange={setLength}
                  options={(Object.keys(REEL_LENGTHS) as ReelLength[]).map((l) => ({
                    value: l,
                    label: `${REEL_LENGTHS[l].label} · ${REEL_LENGTHS[l].seconds}`,
                  }))}
                />
              </SettingGroup>
              <SettingGroup label="Монгол хоолой">
                {voiceAvailable && !mock ? (
                  <ChoicePills
                    label="Хоолой"
                    value={voice}
                    onChange={setVoice}
                    options={(Object.keys(REEL_VOICES) as ReelVoice[]).map((v) => ({ value: v, label: REEL_VOICES[v] }))}
                  />
                ) : (
                  <p className="max-w-[260px] px-1.5 pb-1 text-xs leading-relaxed text-zinc-500">
                    {mock
                      ? "«Токенгүй» горимд хоолойгүй — хадмал, хөгжимтэй гарна."
                      : voiceAvailable === null
                        ? "Шалгаж байна…"
                        : voiceStudioOffline
                          ? "VoiceStudio асаагүй байна. Програмаа нээгээд хуудсаа сэргээнэ үү."
                          : "Тохируулаагүй байна. Админ VOICESTUDIO_URL (эсвэл AZURE_SPEECH_KEY) нэмбэл монголоор уншдаг болно."}
                  </p>
                )}
              </SettingGroup>
              <SettingGroup label="Дуу">
                <TogglePill on={music} onClick={() => setMusic((m) => !m)}>
                  Хөгжим, эффект
                </TogglePill>
              </SettingGroup>
            </div>
          </section>
        </>
      }
      footer={
        <ToolFooter
          task="video"
          loading={task.status === "loading"}
          disabled={question.trim().length < 3}
          hint="Эхлээд асуултаа бичнэ үү ↑"
          time={REEL_TIME}
          mockLabel="жишээ сценариар (0 токен)"
          onRun={submit}
        >
          <IconVideo className="size-5" /> Видео болгох
        </ToolFooter>
      }
      result={
        <ResultPanel task="video" state={task} time={REEL_TIME} loadingLabel="AI түүх бичиж байна…" label="Reels түүх">
          {script && draft && (
            <div className="grid gap-6 p-5 md:grid-cols-[300px_minmax(0,1fr)]">
              <div className="mx-auto w-full max-w-[300px]">
                {source ? (
                  <ReelPlayer src={source} />
                ) : (
                  <div className="flex aspect-[9/16] w-full flex-col items-center justify-center rounded-[22px] bg-zinc-900/[0.04] text-center ring-1 ring-inset ring-zinc-900/[0.06]">
                    <span className="size-8 animate-spin rounded-full border-[3px] border-violet-100 border-t-violet-600" />
                    <p className="mt-3 text-sm text-zinc-600">
                      {building === "voice" ? "Монгол хоолойгоор уншуулж байна…" : "Видео угсарч байна…"}
                    </p>
                  </div>
                )}
              </div>

              <div className="min-w-0 space-y-5">
                <div>
                  <p className="font-medium text-zinc-900">{script.title}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    {script.scenes.length} кадр
                    {source && ` · ${Math.round(source.tl.total)} сек`} · {REEL_TEMPLATES[template].label}
                    {source && voiceOn && !voiceError && " · монгол хоолойтой"}
                  </p>
                  {building && source && (
                    <p className="mt-1 text-xs text-violet-600">
                      {building === "voice" ? "Хоолойг шинэчилж байна…" : "Шинэчилж байна…"}
                    </p>
                  )}
                </div>

                {voiceError && (
                  <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-800 ring-1 ring-inset ring-amber-200">
                    <IconAlert className="mt-px size-4 shrink-0" /> {voiceError}
                  </p>
                )}

                {/* Видео файл болгох */}
                <div className="rounded-2xl bg-zinc-900/[0.03] p-4 ring-1 ring-inset ring-zinc-900/[0.06]">
                  {exp.status === "done" ? (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                        <IconCheck className="size-4" /> {ext} файл бэлэн боллоо
                      </p>
                      <MediaActions
                        media={exp.media}
                        filename="reels"
                        onMake={(make) =>
                          make({
                            topic: question,
                            caption: [script.caption, script.hashtags.join(" ")].filter(Boolean).join("\n\n"),
                            videoUrl: exp.media.url,
                          })
                        }
                      />
                    </div>
                  ) : exp.status === "recording" ? (
                    <div>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-zinc-900">Бичиж байна… {Math.round(exp.progress * 100)}%</span>
                        <button
                          type="button"
                          onClick={() => abortRef.current?.abort()}
                          className="inline-flex cursor-pointer items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900"
                        >
                          <IconX className="size-3.5" /> Цуцлах
                        </button>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-900/10">
                        <div className="h-full rounded-full bg-violet-600 transition-[width]" style={{ width: `${exp.progress * 100}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">Видеог бодит хугацаанд бичдэг тул энэ табыг нээлттэй байлгана уу.</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm">
                        <p className="font-medium text-zinc-900">Instagram, TikTok, Facebook-т бэлэн</p>
                        <p className="text-xs text-zinc-500">
                          {mime
                            ? `720×1280 ${ext} · ${source ? `~${Math.round(source.tl.total)} сек` : "…"} бичнэ`
                            : "Энэ browser видео бичиж чадахгүй — Chrome эсвэл Safari ашиглана уу."}
                        </p>
                        {exp.status === "error" && <p className="mt-1 text-xs text-rose-600">{exp.error}</p>}
                      </div>
                      <Button size="sm" disabled={!source || !mime || building !== null || dirty} onClick={startExport}>
                        <IconVideo className="size-4" /> {ext} файл болгох
                      </Button>
                    </div>
                  )}
                </div>

                {script.caption && (
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-500">Тайлбар</p>
                      <CopyButton text={[script.caption, script.hashtags.join(" ")].filter(Boolean).join("\n\n")} />
                    </div>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700">{script.caption}</p>
                    {script.hashtags.length > 0 && <p className="mt-1 text-sm text-emerald-700">{script.hashtags.join(" ")}</p>}
                  </div>
                )}

                <SceneEditor draft={draft} onChange={setDraft} dirty={dirty} onApply={() => setScript(draft)} onReset={() => setDraft(script)} />
              </div>
            </div>
          )}
        </ResultPanel>
      }
    />
  );
}

/* ---------- Загварын карт: тухайн загвараар зурсан жинхэнэ жишээ кадр ---------- */

function TemplateCard({
  template,
  on,
  fonts,
  brand,
  onPick,
}: {
  template: ReelTemplate;
  on: boolean;
  fonts: ReelFonts | null;
  brand: ReelBrand;
  onPick: () => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx || !fonts) return;
    ctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
    drawReel(ctx, template, frameAt(THUMB_T[template], SAMPLE, SAMPLE_TL, brand, fonts));
  }, [template, fonts, brand]);

  const info = REEL_TEMPLATES[template];
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onPick}
      className={cn(
        "group flex min-w-0 cursor-pointer flex-col gap-2 rounded-2xl p-2 text-left ring-1 transition-colors sm:flex-row sm:gap-3",
        on ? "bg-zinc-900/[0.04] ring-2 ring-zinc-900" : "ring-zinc-900/10 hover:bg-zinc-900/[0.02] hover:ring-zinc-900/20",
      )}
    >
      <canvas
        ref={ref}
        width={360}
        height={640}
        className="aspect-[9/16] w-full shrink-0 rounded-lg bg-zinc-900/10 sm:w-[72px]"
      />
      <span className="min-w-0 sm:py-1">
        <span className="flex items-start gap-1 text-xs font-medium leading-snug text-zinc-900 sm:text-sm">
          <span className="min-w-0 break-words">{info.label}</span>
          {on && <IconCheck className="mt-0.5 hidden size-3.5 shrink-0 text-emerald-600 sm:block" />}
        </span>
        <span className="mt-1 line-clamp-3 hidden text-xs leading-snug text-zinc-500 sm:block">{info.description}</span>
      </span>
    </button>
  );
}

/* ---------- Кадр бүрийн бичвэрийг засах ---------- */

function SceneEditor({
  draft,
  onChange,
  dirty,
  onApply,
  onReset,
}: {
  draft: ReelScript;
  onChange: (s: ReelScript) => void;
  dirty: boolean;
  onApply: () => void;
  onReset: () => void;
}) {
  const set = (i: number, patch: Partial<ReelScene>) =>
    onChange({ ...draft, scenes: draft.scenes.map((s, k) => (k === i ? { ...s, ...patch } : s)) });

  return (
    <details className="group rounded-2xl ring-1 ring-inset ring-zinc-900/10 open:pb-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-zinc-900">
        <IconPencil className="size-4 text-zinc-500" /> Кадр бүрийн бичвэрийг засах
        <span className="ml-auto text-xs font-normal text-zinc-400 group-open:hidden">{draft.scenes.length} кадр</span>
      </summary>
      <ol className="space-y-3 px-4">
        {draft.scenes.map((s, i) => (
          <li key={i} className="rounded-xl bg-zinc-900/[0.03] p-3 ring-1 ring-inset ring-zinc-900/[0.05]">
            {/* inputClass нь w-full тул өргөнийг grid-ээр тогтооно (утсан дээр "Тоо" доод мөрөнд) */}
            <div className="grid grid-cols-[1.5rem_3rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[1.5rem_3rem_minmax(0,1fr)_6rem]">
              <span className="flex size-6 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                {i + 1}
              </span>
              <input
                aria-label={`${i + 1}-р кадрын emoji`}
                value={s.emoji}
                onChange={(e) => set(i, { emoji: e.target.value.slice(0, 8) })}
                className={cn(inputClass, "h-9 px-0 text-center")}
              />
              <input
                aria-label={`${i + 1}-р кадрын гарчиг`}
                value={s.headline}
                maxLength={60}
                onChange={(e) => set(i, { headline: e.target.value })}
                className={cn(inputClass, "h-9 font-medium")}
              />
              <input
                aria-label={`${i + 1}-р кадрын тоо`}
                value={s.stat}
                maxLength={18}
                placeholder="Тоо (заавал биш)"
                onChange={(e) => set(i, { stat: e.target.value })}
                className={cn(inputClass, "col-span-2 col-start-2 h-9 sm:col-span-1 sm:col-start-auto")}
              />
            </div>
            <textarea
              aria-label={`${i + 1}-р кадрын хоолой, хадмал`}
              value={s.narration}
              maxLength={220}
              rows={2}
              onChange={(e) => set(i, { narration: e.target.value })}
              className={cn(inputClass, "mt-2 h-auto w-full resize-none py-2 text-sm")}
            />
          </li>
        ))}
      </ol>
      {dirty && (
        <div className="mt-3 flex flex-wrap justify-end gap-2 px-4">
          <Button size="sm" variant="secondary" onClick={onReset}>
            Буцаах
          </Button>
          <Button size="sm" onClick={onApply}>
            <IconRefresh className="size-4" /> Видеог шинэчлэх
          </Button>
        </div>
      )}
    </details>
  );
}
