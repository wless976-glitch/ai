"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";
import { AiConnectNotice } from "@/components/ai-connect-notice";
import {
  AiStatusLine,
  BIG_BUTTON,
  ChoicePills,
  ComposerFooter,
  ComposerTabs,
  IdeaChips,
  pickOther,
  PromptBox,
  SettingGroup,
  ShuffleButton,
  StartOverButton,
  StaticPill,
  StepTitle,
  TogglePill,
  type IconType,
  type Idea,
} from "@/components/composer";
import { PlusLock } from "@/components/plus";
import {
  IconAlert,
  IconArrowRight,
  IconCalendar,
  IconCheckCircle,
  IconClock,
  IconCopy,
  IconDownload,
  IconEye,
  IconFlame,
  IconImage,
  IconInstagram,
  IconMessage,
  IconPencil,
  IconRefresh,
  IconRocket,
  IconSend,
  IconSparkles,
  IconSun,
  IconText,
  IconUpload,
  IconVideo,
  IconWand,
  IconX,
} from "@/components/icons";
import { Badge, Button, ButtonLink, buttonClass, Card, cn, inputClass, PageHeader } from "@/components/ui";
import {
  AiRequestError,
  errorMessage,
  fetchPlanUsage,
  generateText,
  imageToImage,
  imageToText,
  prepareImage,
  textToImage,
  textToVideo,
  type GeneratedMedia,
  type ImageSize,
} from "@/lib/ai-client";
import { useAiUsage } from "@/lib/ai-usage";
import { AI_TASK_ORDER, AI_TASKS, MAX_PROMPT_CHARS, type AiTask } from "@/lib/ai-models";
import { addDays, TODAY } from "@/lib/format";
import { newId, visualFor } from "@/lib/mock-ai";
import { FREE_DAILY, type PlanUsage, type Quota } from "@/lib/plan";
import { useStore } from "@/lib/store";
import { usePlan } from "@/lib/use-plan";

const TOOL_ICON: Record<AiTask, IconType> = {
  text: IconText,
  vision: IconEye,
  image: IconImage,
  edit: IconWand,
  video: IconVideo,
};

const TOOL_TIME: Record<AiTask, string> = {
  text: "5–20 секунд",
  vision: "5–20 секунд",
  image: "10–40 секунд",
  edit: "15–60 секунд",
  video: "1–5 минут",
};

const TOOL_SUBTITLE: Record<AiTask, string> = {
  text: "Текст бичих — пост, санаа, сэтгэгдлийн хариу, bio зэргийг AI бичнэ. Гарсан текстийг нэг товчоор пост болгоно.",
  vision: "Зураг → Текст — бүтээгдэхүүнийхээ зургийг оруулбал AI уншиж, пост бичнэ эсвэл тайлбарлана.",
  image: "Текст → Зураг — юу хэрэгтэйгээ монголоор тайлбарлахад постын зураг үүсгэнэ.",
  edit: "Зураг → Зураг — өөрийн зургийн фон, орчныг үгээр тайлбарлаад өөрчилнө.",
  video: "Текст → Видео — Reel-д зориулсан 5 орчим секундын богино клип үүсгэнэ.",
};

/** Зөвхөн Plus багцад: зураг, видео үүсгэх нь HF кредит хамгийн их зарцуулдаг */
const PLUS_TOOLS: AiTask[] = ["image", "edit", "video"];

/** Үнэгүй багцад өдрийн хязгаартай хэрэгслүүд */
const TOOL_QUOTA: Partial<Record<AiTask, Quota>> = { text: "text", vision: "vision" };

/* ---------- Санаанууд: товч нь богино, талбарт бүтэн тайлбар бичигдэнэ ---------- */

const TEXT_IDEAS: Idea[] = [
  {
    text: "Шинэ жилийн мэндчилгээ",
    icon: IconFlame,
    hot: true,
    prompt: "Шинэ жилийн баярын мэндчилгээний пост бич — урамшууллын мэдээлэлтэй",
  },
  { text: "7 хоногийн 5 постын санаа", icon: IconCalendar, prompt: "Энэ 7 хоногт оруулах 5 постын санаа бич" },
  { text: "Сөрөг сэтгэгдэлд хариу", icon: IconMessage, prompt: "Сөрөг сэтгэгдэлд эелдэг, мэргэжлийн хариу бич" },
  { text: "Instagram bio", icon: IconInstagram, prompt: "Instagram bio бич (150 тэмдэгтэд багтаа)" },
  { text: "Шинэ бүтээгдэхүүн", icon: IconRocket, prompt: "Шинэ бүтээгдэхүүний танилцуулга бич" },
];

const textPool = (name: string) => [
  `${name}-ийн тухай богино танилцуулга бич`,
  "Хэрэглэгчдийн хамгийн их асуудаг 3 асуултад хариулт бич",
  "Хямдралын зарлалын текст бич — 3 хувилбар",
  "Ажилтан авах зарын текст бич",
  "Хэрэглэгчдээ талархсан пост бич",
  "Story-д тавих 3 богино текст бич",
  "Ажлын цаг өөрчлөгдсөн тухай мэдэгдэл бич",
  "Хүргэлтийн үйлчилгээний тухай пост бич",
];

const IMAGE_IDEAS: Idea[] = [
  {
    text: "Шинэ жилийн чимэглэл",
    icon: IconFlame,
    hot: true,
    prompt: "Шинэ жилийн гацуур, гэрлэн чимэглэлийн дэргэд халуун ундаа, дулаахан орчин",
  },
  { text: "Өвлийн гудамжинд кофе", icon: IconFlame, hot: true, prompt: "Цастай өвлийн гудамжинд халуун кофе барьсан гар" },
  { text: "Латте, өглөөний гэрэл", icon: IconSun, prompt: "Цагаан шоколадтай латте, модон ширээн дээр, өглөөний зөөлөн гэрэл" },
  { text: "Студийн бүтээгдэхүүн", icon: IconImage, prompt: "Минималист цагаан фон дээр шинэ бүтээгдэхүүн, студийн гэрэл" },
];

const IMAGE_POOL = [
  "Дулаахан кафены дотор орчин, цонхоор нар тусна, хүнгүй",
  "Модон тавиур дээр эгнүүлсэн гар хийцийн бүтээгдэхүүн",
  "Ширээн дээрх өглөөний цай, шинэ талх, ойроос",
  "Хаврын цэцэгтэй фон дээр бүтээгдэхүүний зураг",
  "Хотын шөнийн гэрэлтэй гудамж, бүдэг фон",
  "Хоёр аяга кофе барьсан найзуудын гар, ойроос",
];

const EDIT_IDEAS: Idea[] = [
  { text: "Шинэ жилийн орчин", icon: IconFlame, hot: true, prompt: "Шинэ жилийн баярын чимэглэлтэй орчинд байрлуул" },
  { text: "Цагаан фон", icon: IconWand, prompt: "Арын фоныг цэвэр цагаан болго" },
  { text: "Кафены ширээн дээр", icon: IconSun, prompt: "Кафены ширээн дээр, өглөөний нарны гэрэлтэй болго" },
  { text: "Мэргэжлийн гэрэл", icon: IconSparkles, prompt: "Илүү тод, мэргэжлийн гэрэл зураг шиг болго" },
];

const EDIT_POOL = [
  "Арын фоныг бүдэг болгож, бүтээгдэхүүнийг тодруул",
  "Гантиг ширээн дээр байрлуул",
  "Цастай өвлийн орчинд байрлуул",
  "Ногоон ургамалтай, байгалийн гэрэлтэй орчинд байрлуул",
  "Дулаан өнгө аястай болго",
];

const VIDEO_IDEAS: Idea[] = [
  { text: "Цас орж буй кафе", icon: IconFlame, hot: true, prompt: "Кафены цонхоор цас орж буй дулаахан орчин" },
  { text: "Латте арт", icon: IconVideo, prompt: "Аяганд латте арт хийж буй бариста, ойроос, удаан хөдөлгөөн" },
  { text: "Эргэлдэх бүтээгдэхүүн", icon: IconRefresh, prompt: "Шинэ бүтээгдэхүүн эргэлдэж буй студийн зураг авалт" },
];

const VIDEO_POOL = [
  "Аяганаас уур савсаж буй халуун ундаа, ойроос, удаан хөдөлгөөн",
  "Гурилан бүтээгдэхүүн зууханд хөөж буй, ойроос",
  "Хотын гудамжаар алхаж буй хүмүүс, бүрэнхий, зөөлөн гэрэл",
  "Ширээн дээр бүтээгдэхүүнийг гараар байрлуулж буй, дээрээс",
  "Цэцэг аажмаар дэлгэрч буй, ойроос",
];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

interface StudioShared {
  /** Таб, "Шинээр эхлэх" — хэрэгсэл бүрийн картын дээд хэсэг */
  header: ReactNode;
  usage: PlanUsage | null;
  refreshUsage: () => void;
}

const Studio = createContext<StudioShared>({ header: null, usage: null, refreshUsage: () => {} });

const NO_RESETS: Record<AiTask, number> = { text: 0, vision: 0, image: 0, edit: 0, video: 0 };

export function StudioView() {
  const { locked, isLoaded } = usePlan();
  const [tool, setTool] = useState<AiTask>("text");
  // "Шинээр эхлэх" — тухайн хэрэгслийн key-г өөрчилж бүх төлөвийг нь цэвэрлэнэ
  const [resets, setResets] = useState(NO_RESETS);
  const [usage, setUsage] = useState<PlanUsage | null>(null);
  const isLocked = (t: AiTask) => locked && PLUS_TOOLS.includes(t);

  const refreshUsage = useCallback(() => {
    fetchPlanUsage().then(setUsage, () => {});
  }, []);

  useEffect(() => {
    if (isLoaded && locked) refreshUsage();
  }, [isLoaded, locked, refreshUsage]);

  const header = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <StartOverButton onClick={() => setResets((r) => ({ ...r, [tool]: r[tool] + 1 }))} />
        <ComposerTabs
          label="AI хэрэгслүүд"
          tabs={AI_TASK_ORDER.map((t) => ({ value: t, label: AI_TASKS[t].label, icon: TOOL_ICON[t], plus: isLocked(t) }))}
          value={tool}
          onChange={setTool}
        />
      </div>
      <p className="mt-3 text-sm text-zinc-500">{TOOL_SUBTITLE[tool]}</p>
    </>
  );

  return (
    <Studio.Provider value={{ header, usage, refreshUsage }}>
      <PageHeader
        title="AI студи"
        description="Хэрэгслээ сонгоод, юу хүсч байгаагаа монголоор бичнэ үү. Гарсан текст, зураг, видеог нэг товчоор пост болгоно."
      />

      <AiConnectNotice />

      {/* Табыг солиход үр дүн алга болохгүйн тулд бүгдийг mount хэвээр нь үлдээнэ */}
      <div hidden={tool !== "text"}>
        <TextTool key={resets.text} />
      </div>
      <div hidden={tool !== "vision"}>
        <VisionTool key={resets.vision} />
      </div>
      <div hidden={tool !== "image"}>{isLocked("image") ? <StudioLock task="image" /> : <ImageTool key={resets.image} />}</div>
      <div hidden={tool !== "edit"}>{isLocked("edit") ? <StudioLock task="edit" /> : <EditTool key={resets.edit} />}</div>
      <div hidden={tool !== "video"}>{isLocked("video") ? <StudioLock task="video" /> : <VideoTool key={resets.video} />}</div>
    </Studio.Provider>
  );
}

function StudioLock({ task }: { task: AiTask }) {
  const { header } = useContext(Studio);
  return (
    <Card className="p-4 sm:p-6">
      {header}
      <PlusLock
        className="mt-4 rounded-2xl bg-zinc-900/[0.03] ring-1 ring-inset ring-zinc-900/[0.05]"
        title={`${AI_TASKS[task].label} — Plus багцад`}
        description="Зураг, видео үүсгэх нь хамгийн их AI нөөц зарцуулдаг тул зөвхөн Plus багцад нээлттэй. Үнэгүй багцад Текст бичих, Зураг → Текст хэрэгслийг ашиглаж болно."
      />
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Tools                                                               */
/* ------------------------------------------------------------------ */

type TextLength = "short" | "medium" | "long";

/** Тохиргоог AI-д ойлгомжтой нэмэлт заавар болгоно ("Дунд" нь юу ч нэмэхгүй) */
const LENGTH_NOTE: Record<TextLength, string> = {
  short: "Товч бич — 2–3 өгүүлбэр.",
  medium: "",
  long: "Дэлгэрэнгүй бич.",
};

function TextTool() {
  const { business } = useStore();
  const [prompt, setPrompt] = useState("");
  const [length, setLength] = useState<TextLength>("medium");
  const [emoji, setEmoji] = useState(true);
  const [task, run] = useTask<string>();
  const [text, setText] = useState("");

  async function submit() {
    const full = [prompt.trim(), LENGTH_NOTE[length], emoji ? "" : "Emoji бүү ашигла."].filter(Boolean).join("\n\n");
    const out = await run(() => generateText(full, business.name));
    if (out) setText(out);
  }

  return (
    <ToolLayout
      status={task.status}
      steps={
        <>
          <section>
            <StepTitle n={1} title="Юу бичүүлэх вэ?" />
            <div className="mt-3">
              <PromptBox
                id="text-prompt"
                label="Юу бичүүлэх вэ"
                value={prompt}
                onChange={setPrompt}
                max={MAX_PROMPT_CHARS}
                placeholder="Жишээ: Энэ 7 хоногт оруулах 5 постын санаа бич…"
                tip="Хэнд, юуны тулд бичихийг хэлбэл AI илүү оновчтой бичнэ. Үнэ, огноо зэрэг баримтаа оруулаарай."
              />
            </div>
            <IdeaChips ideas={TEXT_IDEAS} value={prompt} onPick={setPrompt} />
            <ShuffleButton onClick={() => setPrompt(pickOther(textPool(business.name || "Манай"), prompt))} />
          </section>
          <section>
            <StepTitle n={2} title="Тохиргоо" />
            <div className="mt-3 flex flex-wrap gap-2.5">
              <SettingGroup label="Урт">
                <ChoicePills
                  label="Урт"
                  value={length}
                  onChange={setLength}
                  options={[
                    { value: "short", label: "Товч" },
                    { value: "medium", label: "Дунд" },
                    { value: "long", label: "Дэлгэрэнгүй" },
                  ]}
                />
              </SettingGroup>
              <SettingGroup label="Emoji">
                <TogglePill on={emoji} onClick={() => setEmoji(!emoji)}>
                  😊 Emoji
                </TogglePill>
              </SettingGroup>
            </div>
          </section>
        </>
      }
      footer={
        <ToolFooter
          task="text"
          loading={task.status === "loading"}
          disabled={prompt.trim().length < 3}
          hint="Эхлээд юу бичүүлэхээ бичнэ үү ↑"
          onRun={submit}
        >
          <IconSparkles className="size-5" /> AI-аар бичүүлэх
        </ToolFooter>
      }
      result={
        <ResultPanel task="text" state={task}>
          <div className="space-y-3 p-5">
            <textarea
              aria-label="AI-ийн бичсэн текст"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={14}
              className={cn(inputClass, "resize-y leading-relaxed")}
            />
            <div className="flex flex-wrap gap-2">
              <MakePostButton key={task.data} onMake={(make) => make({ topic: prompt, caption: text })} />
              <CopyButton text={text} />
            </div>
          </div>
        </ResultPanel>
      }
    />
  );
}

function VisionTool() {
  const { business } = useStore();
  const [image, setImage] = useState<Picked | null>(null);
  const [mode, setMode] = useState<"caption" | "describe">("caption");
  const [task, run] = useTask<string>();
  const [text, setText] = useState("");

  async function submit() {
    if (!image) return;
    const out = await run(() => imageToText(image.blob, mode, business.name));
    if (out) setText(out);
  }

  return (
    <ToolLayout
      status={task.status}
      steps={
        <>
          <section>
            <StepTitle n={1} title="Зургаа оруулна уу" />
            <div className="mt-3">
              <ImageDrop value={image} onChange={setImage} />
            </div>
          </section>
          <section>
            <StepTitle n={2} title="Юу хийх вэ?" />
            <div className="mt-3 flex flex-wrap gap-2.5">
              <SettingGroup label="Үр дүн">
                <ChoicePills
                  label="Юу хийх вэ"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "caption", label: "Пост бичих", icon: IconPencil },
                    { value: "describe", label: "Зургийг тайлбарлах", icon: IconEye },
                  ]}
                />
              </SettingGroup>
            </div>
          </section>
        </>
      }
      footer={
        <ToolFooter
          task="vision"
          loading={task.status === "loading"}
          disabled={!image}
          hint="Эхлээд зургаа оруулна уу ↑"
          onRun={submit}
        >
          <IconEye className="size-5" /> Зургийг уншуулах
        </ToolFooter>
      }
      result={
        <ResultPanel task="vision" state={task}>
          <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-[160px_1fr]">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image.url} alt="Оруулсан зураг" className="aspect-square w-full max-w-40 rounded-xl object-cover" />
            )}
            <div className="space-y-3">
              <textarea
                aria-label="Зургаас гаргасан текст"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                className={cn(inputClass, "resize-y leading-relaxed")}
              />
              <div className="flex flex-wrap gap-2">
                <MakePostButton
                  key={task.data}
                  onMake={(make) => make({ topic: "Зурагтай пост", caption: text, imageUrl: image?.url })}
                />
                <CopyButton text={text} />
              </div>
            </div>
          </div>
        </ResultPanel>
      }
    />
  );
}

/** Харьцааны жижиг дүрс (1:1, 4:5, 16:9) */
function aspectIcon(w: number, h: number, name: string): IconType {
  const Icon = ({ className = "size-4", ...rest }: SVGProps<SVGSVGElement>) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true" className={className} {...rest}>
      <rect x={12 - w / 2} y={12 - h / 2} width={w} height={h} rx={2} />
    </svg>
  );
  Icon.displayName = name;
  return Icon;
}

const SIZE_OPTIONS: { value: ImageSize; label: string; icon: IconType }[] = [
  { value: "square", label: "1:1 Пост", icon: aspectIcon(14, 14, "AspectSquare") },
  { value: "portrait", label: "4:5 Instagram", icon: aspectIcon(13, 16, "AspectPortrait") },
  { value: "landscape", label: "16:9 Хавтас", icon: aspectIcon(18, 10, "AspectLandscape") },
];

const SIZE_ASPECT: Record<ImageSize, string> = {
  square: "aspect-square",
  portrait: "aspect-[4/5]",
  landscape: "aspect-video",
};

function ImageTool() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<ImageSize>("square");
  const [task, run] = useTask<GeneratedMedia & { size: ImageSize }>();

  return (
    <ToolLayout
      status={task.status}
      steps={
        <>
          <section>
            <StepTitle n={1} title="Ямар зураг хэрэгтэй вэ?" />
            <div className="mt-3">
              <PromptBox
                id="image-prompt"
                label="Ямар зураг хэрэгтэй вэ"
                value={prompt}
                onChange={setPrompt}
                max={MAX_PROMPT_CHARS}
                placeholder="Жишээ: Цагаан шоколадтай латте, модон ширээн дээр, өглөөний зөөлөн гэрэл…"
                tip="Монголоор бичиж болно — автоматаар англи руу орчуулна. Юу, хаана, ямар гэрэлтэйг бичээрэй."
              />
            </div>
            <IdeaChips ideas={IMAGE_IDEAS} value={prompt} onPick={setPrompt} />
            <ShuffleButton onClick={() => setPrompt(pickOther(IMAGE_POOL, prompt))} />
          </section>
          <section>
            <StepTitle n={2} title="Тохиргоо" />
            <div className="mt-3 flex flex-wrap gap-2.5">
              <SettingGroup label="Хэмжээ">
                <ChoicePills label="Хэмжээ" value={size} onChange={setSize} options={SIZE_OPTIONS} />
              </SettingGroup>
            </div>
          </section>
        </>
      }
      footer={
        <ToolFooter
          task="image"
          loading={task.status === "loading"}
          disabled={prompt.trim().length < 3}
          hint="Эхлээд ямар зураг хэрэгтэйгээ бичнэ үү ↑"
          onRun={() => run(async () => ({ ...(await textToImage(prompt, size)), size }))}
        >
          <IconImage className="size-5" /> Зураг үүсгэх
        </ToolFooter>
      }
      result={
        <ResultPanel task="image" state={task}>
          {task.data && (
            <div className="space-y-3 p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={task.data.url}
                alt={prompt}
                className={cn("mx-auto w-full max-w-md rounded-xl object-cover", SIZE_ASPECT[task.data.size])}
              />
              <MediaActions
                media={task.data}
                filename="ai-zurag"
                onMake={(make) => make({ topic: prompt, imageUrl: task.data!.url, imageBlob: task.data!.blob })}
              />
            </div>
          )}
        </ResultPanel>
      }
    />
  );
}

function EditTool() {
  const [image, setImage] = useState<Picked | null>(null);
  const [prompt, setPrompt] = useState("");
  const [task, run] = useTask<GeneratedMedia>();

  return (
    <ToolLayout
      status={task.status}
      steps={
        <>
          <section>
            <StepTitle n={1} title="Зургаа оруулна уу" />
            <div className="mt-3">
              <ImageDrop value={image} onChange={setImage} />
            </div>
          </section>
          <section>
            <StepTitle n={2} title="Яаж өөрчлөх вэ?" />
            <div className="mt-3">
              <PromptBox
                id="edit-prompt"
                label="Яаж өөрчлөх вэ"
                value={prompt}
                onChange={setPrompt}
                max={MAX_PROMPT_CHARS}
                rows={2}
                placeholder="Жишээ: Арын фоныг цэвэр цагаан болго…"
                tip="Нэг өөрчлөлтийг тодорхой бичвэл хамгийн сайн гарна."
              />
            </div>
            <IdeaChips ideas={EDIT_IDEAS} value={prompt} onPick={setPrompt} />
            <ShuffleButton onClick={() => setPrompt(pickOther(EDIT_POOL, prompt))} />
          </section>
        </>
      }
      footer={
        <ToolFooter
          task="edit"
          loading={task.status === "loading"}
          disabled={!image || prompt.trim().length < 3}
          hint={!image ? "Эхлээд зургаа оруулна уу ↑" : "Яаж өөрчлөхөө бичнэ үү ↑"}
          onRun={() => image && run(() => imageToImage(image.blob, prompt))}
        >
          <IconWand className="size-5" /> Зургийг өөрчлөх
        </ToolFooter>
      }
      result={
        <ResultPanel task="edit" state={task}>
          {task.data && (
            <div className="space-y-3 p-5">
              <div className="grid grid-cols-2 gap-3">
                <figure>
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.url} alt="Өмнө" className="aspect-square w-full rounded-xl object-cover" />
                  )}
                  <figcaption className="mt-1.5 text-center text-xs text-zinc-500">Өмнө</figcaption>
                </figure>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={task.data.url} alt="Дараа" className="aspect-square w-full rounded-xl object-cover" />
                  <figcaption className="mt-1.5 text-center text-xs font-medium text-violet-600">Дараа · AI</figcaption>
                </figure>
              </div>
              <MediaActions
                media={task.data}
                filename="ai-zasvar"
                onMake={(make) => make({ topic: prompt, imageUrl: task.data!.url, imageBlob: task.data!.blob })}
              />
            </div>
          )}
        </ResultPanel>
      }
    />
  );
}

function VideoTool() {
  const [prompt, setPrompt] = useState("");
  const [task, run] = useTask<GeneratedMedia>();

  return (
    <ToolLayout
      status={task.status}
      steps={
        <>
          <section>
            <StepTitle n={1} title="Ямар видео хэрэгтэй вэ?" />
            <div className="mt-3">
              <PromptBox
                id="video-prompt"
                label="Ямар видео хэрэгтэй вэ"
                value={prompt}
                onChange={setPrompt}
                max={MAX_PROMPT_CHARS}
                placeholder="Жишээ: Аяганд латте арт хийж буй бариста, ойроос, удаан хөдөлгөөн…"
                tip="Нэг үзэгдэл, нэг хөдөлгөөнийг бичээрэй — богино клипэд хамгийн сайн тохирно."
              />
            </div>
            <IdeaChips ideas={VIDEO_IDEAS} value={prompt} onPick={setPrompt} />
            <ShuffleButton onClick={() => setPrompt(pickOther(VIDEO_POOL, prompt))} />
          </section>
          <section>
            <StepTitle n={2} title="Тохиргоо" />
            <div className="mt-3 flex flex-wrap gap-2.5">
              <SettingGroup label="Урт">
                <StaticPill>≈ 5 сек</StaticPill>
              </SettingGroup>
              <SettingGroup label="Хугацаа">
                <StaticPill>1–5 минут</StaticPill>
              </SettingGroup>
            </div>
            <p className="mt-3 flex items-start gap-1.5 text-xs leading-relaxed text-amber-700">
              <IconAlert className="mt-px size-3.5 shrink-0" />
              Видео нь зурагнаас хамаагүй их кредит шаардана. Үүсгэж байх хооронд хуудсаа хаалгүй хүлээнэ үү.
            </p>
          </section>
        </>
      }
      footer={
        <ToolFooter
          task="video"
          loading={task.status === "loading"}
          disabled={prompt.trim().length < 3}
          hint="Эхлээд ямар видео хэрэгтэйгээ бичнэ үү ↑"
          onRun={() => run(() => textToVideo(prompt))}
        >
          <IconVideo className="size-5" /> Видео үүсгэх
        </ToolFooter>
      }
      result={
        <ResultPanel task="video" state={task}>
          {task.data && (
            <div className="space-y-3 p-5">
              <video
                src={task.data.url}
                controls
                autoPlay
                loop
                muted
                playsInline
                className="mx-auto w-full max-w-md rounded-xl bg-black"
              />
              <MediaActions
                media={task.data}
                filename="ai-video"
                onMake={(make) => make({ topic: prompt, videoUrl: task.data!.url })}
              />
            </div>
          )}
        </ResultPanel>
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

interface TaskState<T> {
  status: "idle" | "loading" | "done" | "error";
  data?: T;
  error?: string;
  code?: string;
}

function useTask<T>() {
  const [state, setState] = useState<TaskState<T>>({ status: "idle" });
  async function run(fn: () => Promise<T>): Promise<T | undefined> {
    setState((s) => ({ ...s, status: "loading", error: undefined }));
    try {
      const data = await fn();
      setState({ status: "done", data });
      return data;
    } catch (err) {
      setState({
        status: "error",
        error: errorMessage(err),
        code: err instanceof AiRequestError ? err.code : undefined,
      });
      return undefined;
    }
  }
  return [state, run] as const;
}

/** Нэг карт: таб → дугаартай алхмууд → доод мөр; үр дүн картын доор бүтэн өргөнөөр */
function ToolLayout({
  status,
  steps,
  footer,
  result,
}: {
  status: TaskState<unknown>["status"];
  steps: ReactNode;
  footer: ReactNode;
  result: ReactNode;
}) {
  const { header } = useContext(Studio);
  const resultRef = useRef<HTMLDivElement>(null);

  // Үүсгэж эхлэхэд үр дүнгийн хэсэг рүү гүйлгэнэ — маягт өндөр тул доор нь харагдахгүй байж болно
  useEffect(() => {
    if (status === "loading") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [status]);

  return (
    <>
      <Card className="p-4 sm:p-6">
        {header}
        <div className="mt-6 space-y-8">{steps}</div>
        {footer}
      </Card>
      <div ref={resultRef} className="mt-6 scroll-mt-6 empty:hidden">
        {result}
      </div>
    </>
  );
}

/** Доод мөр: өдрийн хязгаар + AI-ийн төлөв, баруун талд том товч */
function ToolFooter({
  task,
  loading,
  disabled,
  hint,
  onRun,
  children,
}: {
  task: AiTask;
  loading: boolean;
  disabled: boolean;
  hint: string;
  onRun: () => unknown;
  children: ReactNode;
}) {
  const { usage, refreshUsage } = useContext(Studio);
  const { locked, isLoaded } = usePlan();
  const aiUsage = useAiUsage();
  const quota = TOOL_QUOTA[task];
  const limit = quota ? FREE_DAILY[quota] : null;
  const left = locked && quota && usage ? Math.max(0, FREE_DAILY[quota] - usage.used[quota]) : null;
  // Токенгүй горимд сервер дуудахгүй тул хязгаар хамаарахгүй
  const blocked = left === 0 && aiUsage !== "mock";

  return (
    <ComposerFooter
      info={
        <>
          {!isLoaded ? (
            <p className="text-zinc-400">Багцыг шалгаж байна…</p>
          ) : locked && limit !== null ? (
            <p className={left === 0 ? "text-amber-700" : "text-zinc-500"}>
              Өнөөдөр {left ?? "—"}/{limit} үлдсэн
              {" · "}
              <Link href="/dashboard/plan" className="font-medium text-emerald-700 hover:underline">
                Plus-д хязгааргүй →
              </Link>
            </p>
          ) : (
            <p className="text-zinc-500">Plus · өдрийн хязгааргүй</p>
          )}
          <AiStatusLine
            task={task}
            mock={task === "video" ? "видео үүсгэхгүй (0 токен)" : "жишээ үр дүнгээр (0 токен)"}
            fallback="AI ажиллахгүй"
          />
          {aiUsage !== "mock" && (
            <p className="flex items-center gap-1.5 text-xs text-zinc-400">
              <IconClock className="size-3.5 shrink-0" /> Ихэвчлэн {TOOL_TIME[task]} үргэлжилнэ
            </p>
          )}
        </>
      }
    >
      <Button
        size="lg"
        className={BIG_BUTTON}
        disabled={disabled || loading || blocked}
        onClick={async () => {
          await onRun();
          if (limit !== null && locked) refreshUsage();
        }}
      >
        {loading ? "Үүсгэж байна…" : blocked ? "Өнөөдрийн хязгаар дууссан" : children}
      </Button>
      {disabled && !loading && <p className="text-center text-xs text-zinc-400 sm:text-right">{hint}</p>}
    </ComposerFooter>
  );
}

function ResultPanel<T>({ task, state, children }: { task: AiTask; state: TaskState<T>; children: ReactNode }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") {
    return (
      <Card className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
        <span className="size-10 animate-spin rounded-full border-[3px] border-violet-100 border-t-violet-600" />
        <p className="mt-4 font-medium text-zinc-900">AI ажиллаж байна…</p>
        <p className="mt-1 text-sm text-zinc-500">
          Ихэвчлэн {TOOL_TIME[task]} үргэлжилнэ · <Elapsed />
        </p>
      </Card>
    );
  }
  if (state.status === "error") {
    const needsSetup = state.code === "no_token" || state.code === "bad_token" || state.code === "no_credits";
    return (
      <Card className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <IconAlert className="size-6" />
        </span>
        <p className="mt-4 font-semibold text-zinc-900">Үүсгэж чадсангүй</p>
        <p className="mt-1 max-w-md text-sm text-zinc-600">{state.error}</p>
        {needsSetup && (
          <ButtonLink href="/dashboard/settings#ai" variant="secondary" size="sm" className="mt-5">
            AI тохиргоо харах <IconArrowRight className="size-4" />
          </ButtonLink>
        )}
        {state.code === "limit_reached" && (
          <ButtonLink href="/dashboard/plan" variant="secondary" size="sm" className="mt-5">
            Plus-ийн тухай <IconArrowRight className="size-4" />
          </ButtonLink>
        )}
      </Card>
    );
  }
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3">
        <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
          <IconCheckCircle className="size-4 text-emerald-600" /> Бэлэн боллоо
        </p>
        <Badge tone="violet">
          <IconSparkles className="size-3" /> {AI_TASKS[task].label}
        </Badge>
      </div>
      {children}
    </Card>
  );
}

function Elapsed() {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, []);
  const m = Math.floor(sec / 60);
  return (
    <span className="tabular-nums">
      {m > 0 ? `${m} мин ` : ""}
      {sec % 60} сек
    </span>
  );
}

interface Picked {
  blob: Blob;
  url: string;
  name: string;
}

function ImageDrop({ value, onChange }: { value: Picked | null; onChange: (v: Picked | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Зөвхөн зураг (JPG, PNG, WebP) оруулна уу.");
      return;
    }
    setError(null);
    const blob = await prepareImage(file);
    if (blob.size > 8 * 1024 * 1024) {
      setError("Зураг 8MB-аас ихгүй байх ёстой.");
      return;
    }
    onChange({ blob, url: URL.createObjectURL(blob), name: file.name });
  }

  return (
    <div>
      {value ? (
        <div className="relative overflow-hidden rounded-2xl bg-zinc-900/[0.03] ring-1 ring-inset ring-zinc-900/[0.06]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value.url} alt={value.name} className="max-h-72 w-full object-contain" />
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button
              type="button"
              onClick={() => ref.current?.click()}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-surface/90 px-3 text-xs font-medium text-zinc-700 shadow-sm hover:text-zinc-900"
            >
              <IconRefresh className="size-3.5" /> Солих
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Зураг хасах"
              className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-surface/90 text-zinc-600 shadow-sm hover:text-zinc-900"
            >
              <IconX className="size-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            pick(e.dataTransfer.files[0]);
          }}
          className={cn(
            "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors",
            drag
              ? "border-brand-400 bg-brand-50"
              : "border-zinc-900/15 hover:border-zinc-900/30 hover:bg-zinc-900/[0.02]",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-lime/15 text-brand-700 ring-1 ring-inset ring-lime/50">
            <IconUpload className="size-5" />
          </span>
          <span className="mt-1 text-sm font-medium text-zinc-800">Зураг сонгох эсвэл энд чирж оруулах</span>
          <span className="text-xs text-zinc-400">JPG, PNG, WebP · 8MB хүртэл</span>
        </button>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const { notify } = useStore();
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={() =>
        navigator.clipboard.writeText(text).then(
          () => notify("Хуулагдлаа", "info"),
          () => notify("Хуулж чадсангүй", "error"),
        )
      }
    >
      <IconCopy className="size-4" /> Хуулах
    </Button>
  );
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
};

function MediaActions({ media, filename, onMake }: { media: GeneratedMedia; filename: string; onMake: MakeHandler }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      <MakePostButton key={media.url} onMake={onMake} />
      <a
        href={media.url}
        download={`${filename}.${EXT[media.blob.type] ?? "bin"}`}
        className={buttonClass("secondary", "sm")}
      >
        <IconDownload className="size-4" /> Татах
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* "Пост болгох" — үр дүнг батлах жагсаалтад нэмнэ                     */
/* ------------------------------------------------------------------ */

interface MakeInput {
  topic: string;
  caption?: string;
  imageUrl?: string;
  videoUrl?: string;
  /** Текст байхгүй бол энэ зургаас vision загвараар текст бичүүлнэ */
  imageBlob?: Blob;
}
type MakeHandler = (make: (input: MakeInput) => Promise<void>) => Promise<void>;

/** Текстийн төгсгөлийн hashtag-уудыг тусад нь салгана */
function splitHashtags(text: string) {
  const hashtags = Array.from(new Set(text.match(/#[\p{L}\p{N}_]+/gu) ?? [])).slice(0, 6);
  const caption = text
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { caption, hashtags };
}

function MakePostButton({ onMake }: { onMake: MakeHandler }) {
  const { addPosts, notify, business, settings, connectedPlatforms } = useStore();
  const [state, setState] = useState<"idle" | "working" | "added">("idle");
  const status = settings.requireApproval ? "pending" : "scheduled";

  async function make({ topic, caption, imageUrl, videoUrl, imageBlob }: MakeInput) {
    let text = caption?.trim() ?? "";
    // Студийн үр дүнгийн текст AI-аас ирсэн; текстгүй бол доор AI-аар бичүүлнэ
    let aiMade = text.length > 0;
    if (!text) {
      try {
        text = imageBlob
          ? await imageToText(imageBlob, "caption", business.name)
          : await generateText(
              `"${topic}" сэдвээр ${business.name}-ийн Facebook, Instagram постын текст бич. 3–4 өгүүлбэр, тохиромжтой emoji, төгсгөлд 3 hashtag. Зөвхөн постын текстийг буцаа.`,
              business.name,
            );
        aiMade = true;
      } catch {
        text = topic; // текст бичүүлж чадаагүй бол тайлбарыг нь ашиглаад батлах үед засна
      }
    }
    const { caption: body, hashtags } = splitHashtags(text);
    addPosts([
      {
        id: newId("s"),
        topic: topic.trim().slice(0, 60) || "AI студи",
        caption: body || topic,
        hashtags,
        platforms: connectedPlatforms,
        date: addDays(TODAY, 2),
        time: settings.smartTiming ? "18:00" : "12:00",
        status,
        visual: { ...visualFor(topic), imageUrl, videoUrl },
        aiGenerated: aiMade,
      },
    ]);
    notify(
      status === "pending"
        ? "Пост болгож, батлах жагсаалтад нэмлээ"
        : "Пост болгож, шууд хуваарьт орууллаа (батлах тохиргоо унтраалттай)",
    );
  }

  if (state === "added") {
    return status === "pending" ? (
      <ButtonLink href="/dashboard#pending" size="sm" variant="success">
        <IconCheckCircle className="size-4" /> Батлах руу очих
      </ButtonLink>
    ) : (
      <ButtonLink href="/dashboard/calendar" size="sm" variant="success">
        <IconCheckCircle className="size-4" /> Хуанли харах
      </ButtonLink>
    );
  }
  if (connectedPlatforms.length === 0) {
    return (
      <ButtonLink href="/dashboard/settings" size="sm" variant="secondary">
        Платформ холбох
      </ButtonLink>
    );
  }
  return (
    <Button
      size="sm"
      disabled={state === "working"}
      onClick={async () => {
        setState("working");
        await onMake(make);
        setState("added");
      }}
    >
      <IconSend className="size-4" /> {state === "working" ? "Текст бичиж байна…" : "Пост болгох"}
    </Button>
  );
}
