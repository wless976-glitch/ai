"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import {
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconChevronDown,
  IconBulb,
  IconClock,
  IconCopy,
  IconFlame,
  IconFlask,
  IconHeart,
  IconImage,
  IconMessage,
  IconRefresh,
  IconSend,
  IconSliders,
  IconSparkles,
  IconSun,
  IconTarget,
  IconUpload,
  IconUsers,
  IconVideo,
  IconX,
} from "@/components/icons";
import {
  AiStatusLine,
  BIG_BUTTON,
  ComposerFooter,
  ComposerTabs,
  IdeaChips,
  pickOther,
  PromptBox,
  SelectPill,
  SettingGroup,
  ShuffleButton,
  StartOverButton,
  StaticPill,
  StepTitle,
  TogglePill,
  type ComposerTab as ComposerTabInfo,
  type Idea,
} from "@/components/composer";
import { PlusBadge } from "@/components/plus";
import { PostPreview } from "@/components/post-preview";
import { PostVisual } from "@/components/post-visual";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  inputClass,
  PageHeader,
  PlatformIcon,
  cn,
} from "@/components/ui";
import { addDays, formatDate, formatShortDate } from "@/lib/format";
import { useToday } from "@/lib/today";
import { errorMessage, generatePostsAI, textToImage, textToVideo } from "@/lib/ai-client";
import { shortModel } from "@/lib/ai-models";
import { generatePosts, generateWeekPlan, newId, visualFor, type GenerateInput, type Variant } from "@/lib/mock-ai";
import { MONTHLY_POSTS, WEEKLY_POSTS } from "@/lib/plan";
import { useStore } from "@/lib/store";
import { usePlan } from "@/lib/use-plan";
import { useAiUsage } from "@/lib/ai-usage";
import { planPostCount } from "@/lib/analytics";
import { Elapsed, TOOL_TIME } from "../studio/shared";
import {
  FORMAT_LABELS,
  LENGTH_LABELS,
  PLATFORM_LABELS,
  TONE_LABELS,
  type Length,
  type Platform,
  type PostFormat,
  type Tone,
  type VideoScene,
} from "@/lib/types";

const TOPIC_MAX = 300;
const DEFAULT_TIME = "12:00";
/** "Ухаалаг цаг" асаалттай үеийн анхдагч цаг — дагагчдын бодит статистик холбогдоогүй тул тогтмол */
const EVENING_TIME = "18:00";
/** Instagram-ийн caption (hashtag-тай нийлээд) ба hashtag-ийн дээд хэмжээ — засварын хэсэгт тоолно */
const IG_CAPTION_MAX = 2200;
const IG_HASHTAG_MAX = 30;

type ComposerTab = PostFormat | "week";

const TABS: (ComposerTabInfo<ComposerTab> & { subtitle: string })[] = [
  {
    value: "image",
    label: "Зурагтай пост",
    icon: IconImage,
    subtitle: "Зурагтай пост — юуны тухай болохыг бичээрэй, AI текст, hashtag-ийг нь бэлдэнэ.",
  },
  {
    value: "video",
    label: "Reel видео",
    icon: IconVideo,
    subtitle: "Reel видео — 15 секундын босоо бичлэг. AI текстээс гадна зураг авалтын төлөвлөгөөг гаргана.",
  },
  {
    value: "week",
    label: "7 хоногийн төлөвлөгөө",
    icon: IconCalendar,
    badge: "Хурдан",
    subtitle: "7 хоногийн төлөвлөгөө — ирэх 7 хоногийн постыг бэлэн загвараар нэг дор бэлдэнэ.",
  },
];

/** Санааны товч — `hot` нь одоо (улирал, баяр) эрэлттэй сэдэв */
const IDEAS: Record<PostFormat, Idea[]> = {
  image: [
    { text: "Шинэ жилийн урамшуулал", icon: IconFlame, hot: true },
    { text: "Өвлийн шинэ бүтээгдэхүүн", icon: IconFlame, hot: true },
    { text: "Хямдрал, урамшуулал", icon: IconTarget },
    { text: "Хэрэглэгчийн сэтгэгдэл", icon: IconMessage },
    { text: "Ажлын цагийн мэдээлэл", icon: IconClock },
    { text: "Хэрэгтэй зөвлөгөө", icon: IconBulb },
  ],
  video: [
    { text: "Шинэ жилийн бэлтгэл — ард талаас", icon: IconFlame, hot: true },
    { text: "Бүтээгдэхүүн хэрхэн бэлтгэгддэг вэ", icon: IconFlame, hot: true },
    { text: "1 минутын зөвлөгөө", icon: IconBulb },
    { text: "Хэрэглэгчийн хариу үйлдэл", icon: IconHeart },
    { text: "Өглөөний нээлт", icon: IconSun },
    { text: "Багаа танилцуулах", icon: IconUsers },
  ],
};

/** "Санааны машин" — AI дуудахгүй, бизнест тохируулсан санаанаас санамсаргүй сонгоно */
function ideaPool(format: PostFormat, name: string) {
  return format === "video"
    ? [
        "Нэг өдрийн ард тал — 15 секундэд",
        "Хамгийн их зарагддаг бүтээгдэхүүнээ ойроос",
        "Захиалга бэлдэх процесс",
        "Хэрэглэгч анх амсахдаа",
        `${name}-ийн тухай 3 баримт`,
        "Шинэ бүтээгдэхүүний нээлт",
        "Ажилтны өглөөний бэлтгэл",
        "Өмнө ба дараа — харьцуулалт",
      ]
    : [
        `${name}-ийн хамгийн их зарагддаг бүтээгдэхүүн`,
        "Өглөөний урамшуулал — 10:00 хүртэл",
        "Хэрэглэгчдийн байнга асуудаг асуулт",
        "Ажилтнаа танилцуулах",
        "Улирлын шинэ цэс",
        "Найзаа дагуулж ирвэл хөнгөлөлт",
        "Баасан гарагийн онцгой санал",
        "Бидний түүх — хэрхэн эхэлсэн бэ",
        "Хүргэлтийн үйлчилгээ",
      ];
}

const TIME_CHIPS = ["08:30", "12:00", EVENING_TIME, "20:00"];
const DATE_CHIPS = [
  { label: "Маргааш", days: 1 },
  { label: "Нөгөөдөр", days: 2 },
  { label: "7 хоногийн дараа", days: 7 },
];

type Phase = "idle" | "loading" | "done" | "sent";

export function CreateView() {
  const { business, settings, connections, connectedPlatforms, addPosts, notify, ai, posts } = useStore();
  const { plan, locked, isLoaded: planLoaded, monthlyPosts, maxPlatforms } = usePlan();
  const aiUsage = useAiUsage();
  const today = useToday();
  // Тохиргооны "7 хоногт хэдэн пост" — багцын дээд хэмжээгээр хязгаарлана
  const perWeek = Math.min(settings.postsPerWeek, WEEKLY_POSTS[plan]);
  // Багцын сарын постын хязгаар — энэ сард өөрөө бэлдсэн пост (жишээ постууд тоологдохгүй)
  const monthCount = planPostCount(posts, today);
  const postsLeft = monthlyPosts - monthCount;
  const atLimit = planLoaded && postsLeft <= 0;

  const [topic, setTopic] = useState("");
  const [tab, setTab] = useState<ComposerTab>("image");
  const format: PostFormat = tab === "video" ? "video" : "image";
  /** Бэлдэж эхлэхэд үр дүн рүү гүйлгэнэ (Видео студи шиг) — маягт өндөр тул доор нь харагдахгүй байж болно */
  const resultRef = useRef<HTMLDivElement>(null);
  // Хэрэглэгч өөрчлөх хүртэл холбогдсон платформууд, бизнесийн өнгө аясыг ашиглана
  const [platformsDraft, setPlatforms] = useState<Platform[] | null>(null);
  // Үнэгүй багцад нэг удаад нэг платформ
  const platforms = (platformsDraft ?? connectedPlatforms).filter((p) => connections[p]).slice(0, maxPlatforms);
  const [toneDraft, setTone] = useState<Tone | null>(null);
  const tone = toneDraft ?? business.tone;
  const [length, setLength] = useState<Length>("medium");
  const [useEmoji, setUseEmoji] = useState(true);
  const [useHashtags, setUseHashtags] = useState(true);

  const [phase, setPhase] = useState<Phase>("idle");
  const [variants, setVariants] = useState<Variant[]>([]);
  /** Одоогийн хувилбаруудыг ямар хэлбэрээр бэлдсэн (хэлбэрийг дараа нь сольж болно) */
  const [genFormat, setGenFormat] = useState<PostFormat>("image");
  const [selected, setSelected] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  // Хэрэглэгч сонгох хүртэл нөгөөдөр (бодит огноо ачаалагдмагц шинэчлэгдэнэ)
  const [dateDraft, setDate] = useState<string | null>(null);
  const date = dateDraft ?? addDays(today, 2);
  const [timeDraft, setTime] = useState<string | null>(null);
  const time = timeDraft ?? (settings.smartTiming ? EVENING_TIME : DEFAULT_TIME);
  const dateError = date < today ? "Өнгөрсөн огноо сонгох боломжгүй." : null;
  const [sentTo, setSentTo] = useState<"pending" | "scheduled">("pending");

  const [weekLoading, setWeekLoading] = useState(false);

  const [source, setSource] = useState<"hf" | "mock">("mock");
  const [image, setImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [video, setVideo] = useState<string | null>(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const variant = variants.find((v) => v.id === selected) ?? null;
  const isVideo = genFormat === "video";
  const visual = variant
    ? {
        ...variant.visual,
        imageUrl: isVideo ? undefined : (image ?? undefined),
        videoUrl: isVideo ? (video ?? undefined) : undefined,
      }
    : null;
  const igSelected = platforms.includes("instagram");
  const captionLength = caption.length + (hashtags.length ? hashtags.join(" ").length + 2 : 0);

  function togglePlatform(p: Platform) {
    if (!connections[p]) return;
    if (platforms.includes(p)) setPlatforms(platforms.filter((x) => x !== p));
    // Хязгаартаа хүрсэн бол (Үнэгүй: 1) өмнөхийг нь шинээр сонгосноор солино
    else setPlatforms(platforms.length >= maxPlatforms ? [p] : [...platforms, p]);
  }

  async function generate() {
    setPhase("loading");
    setImage(null);
    setVideo(null);
    const input: GenerateInput = { topic, tone, length, platforms, useEmoji, useHashtags, business, format };
    let result: Variant[];
    // "Токенгүй" горимд AI дуудахгүй — шууд жишээ текстээр
    if (ai?.connected && aiUsage !== "mock") {
      try {
        const variants = await generatePostsAI(input);
        result = variants.map((v, i) => ({ id: newId("v"), ...v, visual: visualFor(topic, i, format) }));
        setSource("hf");
      } catch (err) {
        notify(`AI алдаа: ${errorMessage(err)} Жишээ текстээр үргэлжлүүллээ.`, "error");
        result = await generatePosts(input);
        setSource("mock");
      }
    } else {
      result = await generatePosts(input);
      setSource("mock");
    }
    setGenFormat(format);
    setVariants(result);
    choose(result[0]);
    setPhase("done");
  }

  useEffect(() => {
    if (phase === "loading") resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [phase]);

  function shuffleIdea() {
    setTopic(pickOther(ideaPool(format, business.name || "Манай"), topic));
  }

  function choose(v: Variant) {
    setSelected(v.id);
    setCaption(v.caption);
    setHashtags(v.hashtags);
  }

  function addTag() {
    const tag = `#${tagDraft.replace(/^#+/, "").replace(/\s+/g, "")}`;
    setTagDraft("");
    if (tag.length < 2 || hashtags.some((h) => h.toLowerCase() === tag.toLowerCase())) return;
    if (hashtags.length >= IG_HASHTAG_MAX) {
      notify(`Instagram-д ${IG_HASHTAG_MAX}-аас олон hashtag нэмэх боломжгүй.`, "info");
      return;
    }
    setHashtags([...hashtags, tag]);
  }

  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === "," || e.key === " ") && !e.nativeEvent.isComposing) {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagDraft && hashtags.length) {
      setHashtags(hashtags.slice(0, -1));
    }
  }

  function submit(status: "pending" | "scheduled") {
    if (!variant || !visual || dateError || atLimit) return;
    addPosts([
      {
        id: newId("c"),
        topic: topic.trim(),
        caption,
        hashtags,
        platforms,
        date,
        time,
        status,
        visual,
        aiGenerated: source === "hf",
      },
    ]);
    setSentTo(status);
    setPhase("sent");
    notify(status === "pending" ? "Батлах жагсаалтад нэмэгдлээ" : `Хуваарьт орлоо: ${formatDate(date, today)} ${time}`);
  }

  function reset() {
    setPhase("idle");
    setVariants([]);
    setSelected(null);
    setTopic("");
    setHashtags([]);
    setImage(null);
    setVideo(null);
  }

  async function aiImage() {
    if (!ai?.connected && aiUsage !== "mock") {
      notify("Зураг үүсгэхэд HF_TOKEN хэрэгтэй. Тохиргоо → AI загварууд хэсгийг харна уу.", "info");
      return;
    }
    setImageLoading(true);
    try {
      const prompt = `${topic.trim()}. ${business.name} (${business.industry}) — сошиал медиа постын зураг, мэргэжлийн гэрэл зураг, бичиггүй`;
      const res = await textToImage(prompt, igSelected ? "portrait" : "square");
      setImage(res.url);
      notify("AI зураг бэлэн боллоо");
    } catch (err) {
      notify(errorMessage(err), "error");
    } finally {
      setImageLoading(false);
    }
  }

  async function aiVideo() {
    if (!ai?.connected && aiUsage !== "mock") {
      notify("Видео үүсгэхэд HF_TOKEN хэрэгтэй. Тохиргоо → AI загварууд хэсгийг харна уу.", "info");
      return;
    }
    setVideoLoading(true);
    try {
      // Төлөвлөгөөний эхний кадрыг тайлбарт нэмбэл видео сэдэвтээ илүү таарна
      const opening = variant?.script?.[0]?.shot ?? "";
      const prompt = `${topic.trim()}. ${opening}. ${business.name} (${business.industry}) — богино босоо сошиал медиа видео, бичиггүй`;
      const res = await textToVideo(prompt);
      setVideo(res.url);
      notify("AI видео бэлэн боллоо");
    } catch (err) {
      notify(errorMessage(err), "error");
    } finally {
      setVideoLoading(false);
    }
  }

  function upload(file: File | undefined, kind: "image" | "video") {
    if (!file) return;
    if (!file.type.startsWith(`${kind}/`)) {
      notify(kind === "image" ? "Зөвхөн зураг оруулна уу" : "Зөвхөн видео файл оруулна уу", "error");
      return;
    }
    const url = URL.createObjectURL(file);
    if (kind === "image") setImage(url);
    else setVideo(url);
  }

  function copyScript(script: VideoScene[]) {
    const text = script.map((s, i) => `${i + 1}. ${s.time} — ${s.shot}${s.text ? ` (Бичиг: ${s.text})` : ""}`).join("\n");
    navigator.clipboard.writeText(`${topic.trim()} — зураг авалтын төлөвлөгөө\n${text}`).then(
      () => notify("Төлөвлөгөө хуулагдлаа", "info"),
      () => notify("Хуулж чадсангүй", "error"),
    );
  }

  async function weekPlan() {
    setWeekLoading(true);
    const status = settings.requireApproval ? "pending" : "scheduled";
    const plan = await generateWeekPlan(business, perWeek, platforms, {
      status,
      smartTiming: settings.smartTiming,
    });
    addPosts(plan);
    setWeekLoading(false);
    notify(
      status === "pending"
        ? `${plan.length} пост бэлдэж, батлах жагсаалтад нэмлээ`
        : `${plan.length} пост бэлдэж, шууд хуваарьт орууллаа (батлах тохиргоо унтраалттай)`,
    );
  }

  const noPlatforms = connectedPlatforms.length === 0;
  const canGenerate = topic.trim().length > 2 && platforms.length > 0 && phase !== "loading" && !atLimit;
  const canSubmit = !!caption.trim() && !dateError && platforms.length > 0 && !atLimit;
  const mediaLoading = imageLoading || videoLoading;

  return (
    <>
      <PageHeader
        title="Пост бэлдэх"
        description="Сэдвээ бичихэд AI 3 хувилбар бэлдэнэ — зурагтай пост эсвэл Reel видео. Сонгоод, засаад хуваарьт оруулна."
      />

      <Card className="p-4 sm:p-6">
        {/* Таб: юу бэлдэх вэ */}
        <div className="flex flex-wrap items-center gap-2">
          <StartOverButton onClick={reset} />
          <ComposerTabs label="Юу бэлдэх вэ" tabs={TABS} value={tab} onChange={setTab} />
        </div>
        <p className="mt-3 text-sm text-zinc-500">{TABS.find((t) => t.value === tab)!.subtitle}</p>

        {tab === "week" ? (
          /* ---------- 7 хоногийн төлөвлөгөө ---------- */
          <div className="mt-5 flex flex-col gap-5 rounded-2xl bg-zinc-900/[0.03] p-5 ring-1 ring-inset ring-zinc-900/[0.05] sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="font-medium text-zinc-900">Ирэх 7 хоногийн {perWeek} пост</p>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
                Бэлэн загвараар нэг дор бэлдэж, {settings.requireApproval ? "батлах жагсаалтад нэмнэ" : "шууд хуваарьт оруулна"}.
                Тогтмол пост оруулах хамгийн хялбар арга. AI дуудахгүй тул токен зарцуулахгүй.
              </p>
              {noPlatforms && (
                <p className="mt-2 text-xs text-amber-700">
                  Нэг ч платформ холбогдоогүй байна.{" "}
                  <Link href="/dashboard/settings" className="font-medium underline-offset-2 hover:underline">
                    Тохиргоо → Холбогдсон аккаунт
                  </Link>
                </p>
              )}
              {planLoaded && postsLeft < perWeek && (
                <p className="mt-2 text-xs text-amber-700">
                  Энэ сард {Math.max(0, postsLeft)} пост үлдсэн тул {perWeek} пост нэг дор бэлдэх боломжгүй.
                </p>
              )}
            </div>
            <Button
              size="lg"
              className="h-14 shrink-0 rounded-2xl px-8 text-base"
              onClick={weekPlan}
              disabled={weekLoading || noPlatforms || (planLoaded && postsLeft < perWeek)}
            >
              <IconCalendar className="size-5" />
              {weekLoading ? "Төлөвлөж байна…" : `${perWeek} пост бэлдэх`}
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-8">
              {/* 1. Хаана нийтлэх */}
              <section>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <StepTitle n={1} title="Хаана нийтлэх вэ?" />
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {(["facebook", "instagram"] as Platform[]).map((p) => {
                        const on = platforms.includes(p);
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => togglePlatform(p)}
                            disabled={!connections[p]}
                            aria-pressed={on}
                            title={connections[p] ? undefined : "Тохиргоо хэсэгт холбогдоогүй байна"}
                            className={cn(
                              "flex size-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                              on
                                ? "border-brand-400 bg-brand-50 text-zinc-900"
                                : "border-dashed border-zinc-900/15 text-zinc-500 hover:border-zinc-900/30 hover:text-zinc-800",
                            )}
                          >
                            <PlatformIcon platform={p} className="size-6" />
                            {PLATFORM_LABELS[p]}
                          </button>
                        );
                      })}
                    </div>
                    {locked && connectedPlatforms.length >= 2 && (
                      <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                        Үнэгүй багцад нэг удаад нэг платформ.
                        <Link href="/dashboard/plan" className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
                          Хоёуланд нь зэрэг <PlusBadge />
                        </Link>
                      </p>
                    )}
                    {connectedPlatforms.length < 2 && (
                      <p className="mt-2 text-xs text-zinc-500">
                        {noPlatforms ? "Нэг ч платформ холбогдоогүй байна. " : "Холбогдоогүй платформыг сонгох боломжгүй. "}
                        <Link href="/dashboard/settings" className="font-medium text-brand-700 hover:underline">
                          Тохиргоо → Холбогдсон аккаунт
                        </Link>
                      </p>
                    )}
                  </div>
                  {/* AI ямар бизнесийн мэдээллээр бичихийг харуулна — засах бол Тохиргоо руу */}
                  <Link href="/dashboard/settings" className="group flex items-center gap-2.5 text-sm text-zinc-500">
                    <IconSliders className="size-4" /> Бизнес
                    <span className="inline-flex h-10 items-center gap-2 rounded-xl bg-surface px-3.5 font-medium text-zinc-900 ring-1 ring-zinc-900/10 transition-shadow group-hover:ring-zinc-900/20 dark:bg-zinc-50">
                      {business.name || "Нэргүй"}
                      <IconChevronDown className="size-4 -rotate-90 text-zinc-400" />
                    </span>
                  </Link>
                </div>
              </section>

              {/* 2. Юуны тухай */}
              <section>
                <StepTitle n={2} title={format === "video" ? "Видео юуны тухай вэ?" : "Юуны тухай пост хийх вэ?"} />
                <div className="mt-3">
                  <PromptBox
                    id="topic"
                    label="Постын сэдэв"
                    value={topic}
                    onChange={setTopic}
                    max={TOPIC_MAX}
                    placeholder={
                      format === "video"
                        ? "Видеонд юу харагдах вэ — жишээ нь: латте хэрхэн бэлтгэдгийг ойроос харуулах…"
                        : "Юуны тухай пост вэ — жишээ нь: өвлийн шинэ ундаа, цагаан шоколадтай латте…"
                    }
                    tip="Нэг өгүүлбэр хангалттай. Үнэ, хямдралын хувь, огноо зэрэг баримтаа бичвэл AI яг тэрийг ашиглана."
                  />
                </div>
                <IdeaChips ideas={IDEAS[format]} value={topic} onPick={setTopic} />
                <ShuffleButton onClick={shuffleIdea} />
              </section>

              {/* 3. Тохиргоо */}
              <section>
                <StepTitle n={3} title="Тохиргоо" />
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <SettingGroup label="Өнгө аяс">
                    <SelectPill
                      label="Өнгө аяс"
                      value={tone}
                      onChange={setTone}
                      options={(Object.keys(TONE_LABELS) as Tone[]).map((t) => ({ value: t, label: TONE_LABELS[t] }))}
                    />
                  </SettingGroup>
                  {format === "image" ? (
                    <SettingGroup label="Урт">
                      <SelectPill
                        label="Урт"
                        value={length}
                        onChange={setLength}
                        options={(Object.keys(LENGTH_LABELS) as Length[]).map((l) => ({ value: l, label: LENGTH_LABELS[l] }))}
                      />
                    </SettingGroup>
                  ) : (
                    <>
                      <SettingGroup label="Хэлбэр">
                        <StaticPill>9:16</StaticPill>
                      </SettingGroup>
                      <SettingGroup label="Урт">
                        <StaticPill>15 сек</StaticPill>
                      </SettingGroup>
                    </>
                  )}
                  <SettingGroup label="Emoji">
                    <TogglePill on={useEmoji} onClick={() => setUseEmoji(!useEmoji)}>
                      😊 Emoji
                    </TogglePill>
                  </SettingGroup>
                  <SettingGroup label="Hashtag">
                    <TogglePill on={useHashtags} onClick={() => setUseHashtags(!useHashtags)}>
                      # Hashtag
                    </TogglePill>
                  </SettingGroup>
                </div>
              </section>
            </div>

            {/* Доод мөр: хязгаар, AI-ийн төлөв, бэлдэх товч */}
            <ComposerFooter
              info={
                <>
                  <p className={atLimit ? "text-amber-700" : "text-zinc-500"}>
                    Энэ сард {monthCount}/{monthlyPosts} пост бэлдсэн
                    {locked && (
                      <>
                        {" · "}
                        <Link href="/dashboard/plan" className="font-medium text-emerald-700 hover:underline">
                          Plus-д сард {MONTHLY_POSTS.plus} пост →
                        </Link>
                      </>
                    )}
                  </p>
                  <AiStatusLine task="text" mock="жишээ текстээр (0 токен)" fallback="жишээ текстээр" />
                  {aiUsage !== "mock" && (
                    <p className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <IconClock className="size-3.5 shrink-0" /> Ихэвчлэн {TOOL_TIME.text} үргэлжилнэ
                    </p>
                  )}
                </>
              }
            >
              <Button size="lg" className={BIG_BUTTON} disabled={!canGenerate} onClick={generate}>
                <IconSparkles className="size-5" />
                {phase === "loading"
                  ? "Бэлдэж байна…"
                  : atLimit
                    ? `Сарын хязгаар дууссан (${monthCount}/${monthlyPosts})`
                    : phase === "done" && format === genFormat
                      ? "Дахин бэлдэх"
                      : format === "video"
                        ? "AI-аар 3 Reel санаа бэлдэх"
                        : "AI-аар 3 хувилбар бэлдэх"}
              </Button>
              {!canGenerate && !atLimit && phase !== "loading" && (
                <p className="text-center text-xs text-zinc-400 sm:text-right">
                  {platforms.length === 0 ? "Дор хаяж нэг платформ сонгоно уу." : "Эхлээд сэдвээ бичнэ үү ↑"}
                </p>
              )}
              {canGenerate && phase === "done" && format !== genFormat && (
                <p className="text-center text-xs text-amber-700 sm:text-right">
                  Доорх хувилбарууд {FORMAT_LABELS[genFormat].toLowerCase()} — шинээр бэлдэх үү?
                </p>
              )}
            </ComposerFooter>
          </>
        )}
      </Card>

      {/* ---------- Үр дүн ---------- */}
      <div ref={resultRef} className="mt-6 scroll-mt-6">
          {phase === "loading" && (
            <Card className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center">
              <span className="size-10 animate-spin rounded-full border-[3px] border-violet-100 border-t-violet-600" />
              <p className="mt-4 font-medium text-zinc-900">
                {format === "video" ? "AI 3 Reel санаа бэлдэж байна…" : "AI 3 хувилбар бэлдэж байна…"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                Ихэвчлэн {TOOL_TIME.text} үргэлжилнэ · <Elapsed />
              </p>
            </Card>
          )}

          {phase === "sent" && (
            <Card className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <IconCheckCircle className="size-7" />
              </div>
              <h2 className="mt-4 font-semibold text-zinc-900">
                {sentTo === "pending" ? "Батлах жагсаалтад нэмэгдлээ" : "Хуваарьт орлоо"}
              </h2>
              <p className="mt-1 max-w-sm text-sm text-zinc-500">
                {sentTo === "pending"
                  ? "Батласны дараа хуваарийн дагуу автоматаар нийтлэгдэнэ."
                  : `${formatDate(date, today)}, ${time} цагт автоматаар нийтлэгдэнэ.`}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <ButtonLink
                  href={sentTo === "pending" ? "/dashboard#pending" : "/dashboard/calendar"}
                  variant="secondary"
                >
                  {sentTo === "pending" ? "Батлах руу очих" : "Хуанли харах"}
                </ButtonLink>
                <Button onClick={reset}>
                  <IconRefresh className="size-4" /> Шинэ пост
                </Button>
              </div>
            </Card>
          )}

          {phase === "done" && variant && visual && (
            <Card>
              {/* Видео студийн үр дүн шиг: "Бэлэн боллоо" мөр → хувилбарууд → засах + урьдчилан харах */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-5 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                  <IconCheckCircle className="size-4 text-emerald-600" /> Бэлэн боллоо
                </p>
                  <div className="flex flex-wrap gap-1.5">
                    {isVideo && (
                      <Badge tone="sky">
                        <IconVideo className="size-3" /> {FORMAT_LABELS.video}
                      </Badge>
                    )}
                    {source === "hf" && ai ? (
                      <Badge tone="violet">
                        <IconSparkles className="size-3" /> AI · {shortModel(ai.models.text)}
                      </Badge>
                    ) : (
                      <Badge tone="amber">
                        <IconFlask className="size-3" /> Жишээ текст
                      </Badge>
                    )}
                  </div>
              </div>

              <div className="p-5">
                <p className="font-medium text-zinc-900">Таалагдсан хувилбараа сонгоно уу</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {variants.length} хувилбар · {FORMAT_LABELS[genFormat]} · сонгосноо доор засна
                </p>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  {variants.map((v, i) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => choose(v)}
                      aria-pressed={selected === v.id}
                      className={cn(
                        "flex cursor-pointer flex-col rounded-2xl bg-surface p-3 text-left shadow-xs ring-1 transition",
                        selected === v.id ? "ring-2 ring-brand-500" : "ring-zinc-200 hover:ring-zinc-300",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone={selected === v.id ? "brand" : "zinc"}>
                          {i + 1}. {v.angle}
                        </Badge>
                        {selected === v.id && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-ink text-lime">
                            <IconCheck className="size-3" />
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 line-clamp-5 flex-1 whitespace-pre-line text-[13px] leading-relaxed text-zinc-700">
                        {v.caption}
                      </p>
                      {v.script && (
                        <p className="mt-2.5 flex items-center gap-1.5 border-t border-dashed border-zinc-900/10 pt-2 text-[11.5px] text-zinc-500">
                          <IconVideo className="size-3.5" /> {v.script.length} хэсэгтэй зураг авалтын төлөвлөгөө
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>

                <div className="grid grid-cols-1 gap-6 border-t border-zinc-100 p-5 xl:grid-cols-[300px_minmax(0,1fr)]">
                  <div className="min-w-0 space-y-6 xl:order-last">
                    <div>
                      <p className="font-medium text-zinc-900">Засаад, {isVideo ? "видео" : "зураг"} нэмээд, хуваарьт оруулах</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Бүгдийг шууд засаж болно. Урьдчилан харах хэсэгт хэрэглэгчид яг ингэж харагдана.
                      </p>
                    </div>

                    {/* Текст */}
                    <Section title="Текст">
                      <textarea
                        id="caption"
                        aria-label="Постын текст"
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        rows={isVideo ? 5 : 8}
                        className={cn(inputClass, "resize-y leading-relaxed")}
                      />
                      <p className="mt-1.5 flex justify-between gap-3 text-xs text-zinc-400">
                        <span>{isVideo ? "Эхний мөр нь видеоны хамгийн чухал хэсэг — анхаарал татахуйц байлгаарай." : "Шууд засаж болно."}</span>
                        {igSelected && (
                          <span className={cn("shrink-0 tabular-nums", captionLength > IG_CAPTION_MAX && "font-medium text-rose-600")}>
                            {captionLength} / {IG_CAPTION_MAX}
                          </span>
                        )}
                      </p>
                    </Section>

                    {/* Hashtag — устгаж, нэмж болно */}
                    <Section
                      title="Hashtag"
                      aside={
                        <span className="tabular-nums">
                          {hashtags.length}
                          {igSelected && ` / ${IG_HASHTAG_MAX}`}
                        </span>
                      }
                    >
                      <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-surface p-2 ring-1 ring-zinc-900/10 focus-within:ring-2 focus-within:ring-brand-500 dark:bg-zinc-50">
                        {hashtags.map((h) => (
                          <span
                            key={h}
                            className="inline-flex items-center gap-1 rounded-full bg-sky-50 py-0.5 pl-2.5 pr-1 text-xs font-medium text-sky-700 ring-1 ring-inset ring-sky-200/70"
                          >
                            {h}
                            <button
                              type="button"
                              onClick={() => setHashtags(hashtags.filter((x) => x !== h))}
                              aria-label={`${h} хасах`}
                              className="flex size-4 cursor-pointer items-center justify-center rounded-full hover:bg-sky-100"
                            >
                              <IconX className="size-3" />
                            </button>
                          </span>
                        ))}
                        <input
                          value={tagDraft}
                          onChange={(e) => setTagDraft(e.target.value)}
                          onKeyDown={onTagKey}
                          onBlur={() => tagDraft.trim() && addTag()}
                          placeholder={hashtags.length ? "Нэмэх…" : "#hashtag нэмэх"}
                          aria-label="Hashtag нэмэх"
                          className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
                        />
                      </div>
                    </Section>

                    {/* Видео: зураг авалтын төлөвлөгөө */}
                    {isVideo && variant.script && (
                      <Section
                        title="Зураг авалтын төлөвлөгөө"
                        aside={
                          <button
                            type="button"
                            onClick={() => copyScript(variant.script!)}
                            className="inline-flex cursor-pointer items-center gap-1 font-medium text-brand-700 hover:underline"
                          >
                            <IconCopy className="size-3.5" /> Хуулах
                          </button>
                        }
                      >
                        <ol className="space-y-2">
                          {variant.script.map((s, i) => (
                            <li key={i} className="flex gap-3 rounded-xl bg-zinc-900/[0.03] p-3 ring-1 ring-inset ring-zinc-900/[0.05]">
                              <span className="w-16 shrink-0 font-mono text-[11px] uppercase tracking-[0.06em] text-zinc-500">{s.time}</span>
                              <div className="min-w-0 text-[13px] leading-snug">
                                <p className="text-zinc-800">{s.shot}</p>
                                {s.text && <p className="mt-1 text-xs text-zinc-500">Дэлгэц дээр: “{s.text}”</p>}
                              </div>
                            </li>
                          ))}
                        </ol>
                        <p className="mt-2 text-xs text-zinc-400">Утсаараа босоогоор бичээд доор оруулна уу, эсвэл AI-аар үүсгэнэ.</p>
                      </Section>
                    )}

                    {/* Зураг эсвэл видео */}
                    <Section title={isVideo ? "Видео" : "Зураг"}>
                      <div className="flex flex-col gap-3 rounded-xl p-3 ring-1 ring-zinc-900/10 sm:flex-row sm:items-center">
                        {mediaLoading ? (
                          <div className="size-14 shrink-0 animate-pulse rounded-lg bg-zinc-100" />
                        ) : (
                          <PostVisual
                            visual={visual}
                            size="xs"
                            className={cn("shrink-0 rounded-lg", isVideo ? "aspect-[9/16] w-10" : "size-14")}
                          />
                        )}
                        <p className="min-w-0 flex-1 text-[13px] text-zinc-500">
                          {isVideo
                            ? videoLoading
                              ? `${ai ? shortModel(ai.models.video) : "AI"} видео бэлдэж байна… (1–5 минут)`
                              : video
                                ? "Видео нэмэгдлээ. Урьдчилан харахад тоглоно."
                                : "Видео нэмээгүй. Reel нийтлэхэд видео хэрэгтэй — AI-аар үүсгэх эсвэл өөрийн бичлэгээ оруулна уу."
                            : imageLoading
                              ? `${ai ? shortModel(ai.models.image) : "AI"} зураг зурж байна… (10–40 сек)`
                              : image
                                ? "Зураг нэмэгдлээ. Урьдчилан харахад харагдана."
                                : "Одоогоор жишээ дүрс. AI-аар үүсгэх эсвэл өөрийн зургаа оруулна уу."}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {locked ? (
                            // AI зураг, видео нь зөвхөн Plus-д — өөрийнхөөрөө оруулах нь үнэгүй
                            <ButtonLink href="/dashboard/plan" size="sm" variant="secondary">
                              {isVideo ? <IconVideo className="size-4" /> : <IconImage className="size-4" />} AI-аар{" "}
                              <PlusBadge />
                            </ButtonLink>
                          ) : (
                            <Button size="sm" variant="secondary" onClick={isVideo ? aiVideo : aiImage} disabled={mediaLoading}>
                              {isVideo ? <IconVideo className="size-4" /> : <IconImage className="size-4" />}
                              {(isVideo ? video : image) ? "Дахин үүсгэх" : "AI-аар үүсгэх"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => (isVideo ? videoRef : imageRef).current?.click()}
                            disabled={mediaLoading}
                          >
                            <IconUpload className="size-4" /> Оруулах
                          </Button>
                          {(isVideo ? video : image) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => (isVideo ? setVideo(null) : setImage(null))}
                              aria-label={isVideo ? "Видео хасах" : "Зураг хасах"}
                            >
                              <IconX className="size-4" />
                            </Button>
                          )}
                          <input
                            ref={imageRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              upload(e.target.files?.[0], "image");
                              e.target.value = "";
                            }}
                          />
                          <input
                            ref={videoRef}
                            type="file"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              upload(e.target.files?.[0], "video");
                              e.target.value = "";
                            }}
                          />
                        </div>
                      </div>
                    </Section>

                    {/* Хэзээ */}
                    <Section title="Хэзээ гаргах вэ?">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <input
                            id="date"
                            type="date"
                            aria-label="Огноо"
                            min={today}
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            aria-invalid={dateError ? true : undefined}
                            className={cn(inputClass, "aria-invalid:ring-rose-300")}
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {DATE_CHIPS.map((c) => {
                              const value = addDays(today, c.days);
                              return (
                                <Chip key={c.label} active={date === value} onClick={() => setDate(value)} title={formatShortDate(value)}>
                                  {c.label}
                                </Chip>
                              );
                            })}
                          </div>
                          {dateError && <p className="text-xs text-rose-600">{dateError}</p>}
                        </div>
                        <div className="space-y-2">
                          <input
                            id="time"
                            type="time"
                            aria-label="Цаг"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className={inputClass}
                          />
                          <div className="flex flex-wrap gap-1.5">
                            {TIME_CHIPS.map((t) => (
                              <Chip key={t} active={time === t} onClick={() => setTime(t)}>
                                {t}
                              </Chip>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Section>

                    <div className="space-y-2.5 border-t border-dashed border-zinc-900/15 pt-5">
                      {isVideo && !video && (
                        <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-inset ring-amber-200/70">
                          <IconVideo className="mt-px size-3.5 shrink-0" />
                          Видео нэмээгүй ч хадгалж болно — нийтлэхээс өмнө видеогоо оруулахаа мартуузай.
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => submit("pending")} disabled={!canSubmit}>
                          <IconSend className="size-4" /> Батлуулахаар илгээх
                        </Button>
                        <Button variant="secondary" onClick={() => submit("scheduled")} disabled={!canSubmit}>
                          <IconCalendar className="size-4" /> Шууд хуваарьт оруулах
                        </Button>
                      </div>
                      <p className="text-xs leading-relaxed text-zinc-500">
                        <b className="font-medium text-zinc-700">Батлуулахаар илгээх</b> — дараа нь дахин шалгаад батална.{" "}
                        <b className="font-medium text-zinc-700">Шууд хуваарьт оруулах</b> — сонгосон цагт автоматаар
                        нийтлэгдэнэ.
                      </p>
                    </div>
                  </div>

                  <div className="mx-auto w-full max-w-sm xl:sticky xl:top-6 xl:order-first xl:mx-0 xl:max-w-none xl:self-start">
                    <p className="mb-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-500">Урьдчилан харах</p>
                    <PostPreview
                      caption={caption}
                      hashtags={hashtags}
                      visual={visual}
                      platforms={platforms}
                      businessName={business.name}
                      handle={business.handle}
                    />
                  </div>
                </div>
            </Card>
          )}
      </div>
    </>
  );
}

/** Засварын хэсгийн гарчиг (баруун талд нэмэлт мэдээлэл/үйлдэл) */
function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-zinc-500">{title}</h3>
        {aside && <div className="text-xs text-zinc-400">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** Жижиг сонголтын товч (сэдвийн санаа, огноо, цаг) */
function Chip({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "cursor-pointer rounded-full px-2.5 py-1 text-xs ring-1 transition-colors",
        active
          ? "bg-brand-50 text-brand-700 ring-brand-300"
          : "bg-surface text-zinc-600 ring-zinc-200 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200",
      )}
    >
      {children}
    </button>
  );
}

