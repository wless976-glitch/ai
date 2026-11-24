"use client";

import { useState, type ReactNode } from "react";
import { IconAlert, IconCheck, IconLink, IconSparkles, IconWallet } from "@/components/icons";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  Field,
  inputClass,
  PageHeader,
  PlatformIcon,
  Segmented,
  Toggle,
  cn,
} from "@/components/ui";
import { AI_ISSUE_LABELS, AI_TASK_ORDER, AI_TASKS, AI_USAGE_LABELS, AI_USAGE_OPTIONS, USES_OLLAMA } from "@/lib/ai-models";
import { setAiUsage, useAiUsage } from "@/lib/ai-usage";
import { formatMoney } from "@/lib/format";
import { MONTHLY_POSTS, PLAN_LABELS, PLUS_PRICE, WEEKLY_POSTS, type Plan } from "@/lib/plan";
import { useStore } from "@/lib/store";
import { usePlan } from "@/lib/use-plan";
import { PlusBadge } from "@/components/plus";
import { TONE_LABELS, type BusinessProfile, type Platform, type Tone } from "@/lib/types";

const INDUSTRIES = [
  "Кофе шоп, кафе",
  "Ресторан, хоолны газар",
  "Гоо сайхан, үсчин",
  "Хувцас, загвар",
  "Онлайн дэлгүүр",
  "Боловсрол, сургалт",
  "Фитнесс, спорт",
  "Бусад",
];

export function SettingsView() {
  const { business, setBusiness, connections, setConnections, settings, setSettings, resetData, notify, ai } =
    useStore();
  const { plan, isLoaded: planLoaded } = usePlan();
  const aiUsage = useAiUsage();
  // Засварлаж эхлэх хүртэл хадгалсан утгыг шууд харуулна (refresh-ийн дараа ч зөв утга гарна)
  const [draft, setDraft] = useState<BusinessProfile | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const form = draft ?? business;
  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(business);
  const nameError = form.name.trim() ? null : "Бизнесийн нэрээ оруулна уу — AI пост бичихэд ашиглана.";

  function set<K extends keyof BusinessProfile>(key: K, value: BusinessProfile[K]) {
    setDraft((d) => ({ ...(d ?? business), [key]: value }));
  }

  function save() {
    if (nameError) return;
    setBusiness({
      ...form,
      name: form.name.trim(),
      handle: form.handle.trim().replace(/^@/, ""),
      location: form.location.trim(),
    });
    setDraft(null);
    notify("Бизнесийн мэдээлэл хадгалагдлаа");
  }

  function toggleConnection(p: Platform) {
    const next = { ...connections, [p]: !connections[p] };
    setConnections(next);
    notify(
      next[p]
        ? `${p === "facebook" ? "Facebook Page" : "Instagram"} холбогдлоо (тест)`
        : `${p === "facebook" ? "Facebook Page" : "Instagram"} салгагдлаа`,
      "info",
    );
  }

  return (
    <>
      <PageHeader title="Тохиргоо" description="Бизнесийн мэдээлэл, холбогдсон аккаунт, автоматжуулалт." />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {/* Бизнес */}
          <Card>
            <CardHeader
              title="Бизнесийн мэдээлэл"
              description="AI энэ мэдээллийг ашиглан танд тохирсон пост бичнэ."
            />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Бизнесийн нэр" htmlFor="b-name">
                <input
                  id="b-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  maxLength={60}
                  required
                  aria-invalid={nameError ? true : undefined}
                  aria-describedby={nameError ? "b-name-error" : undefined}
                  className={cn(inputClass, "aria-invalid:ring-rose-300")}
                />
                {nameError && (
                  <p id="b-name-error" className="text-xs text-rose-600">
                    {nameError}
                  </p>
                )}
              </Field>
              <Field label="Instagram хэрэглэгчийн нэр" htmlFor="b-handle">
                <input
                  id="b-handle"
                  value={form.handle}
                  onChange={(e) => set("handle", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label="Салбар" htmlFor="b-industry">
                <select
                  id="b-industry"
                  value={form.industry}
                  onChange={(e) => set("industry", e.target.value)}
                  className={inputClass}
                >
                  {INDUSTRIES.map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <Field label="Байршил" htmlFor="b-location">
                <input
                  id="b-location"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field
                  label="Бизнесийн товч тайлбар"
                  htmlFor="b-desc"
                  hint="Юу зардаг, юугаараа онцлог, хэн таны хэрэглэгч вэ?"
                >
                  <textarea
                    id="b-desc"
                    rows={3}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    className={cn(inputClass, "resize-none")}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Үндсэн өнгө аяс">
                  <Segmented
                    value={form.tone}
                    onChange={(v) => set("tone", v)}
                    options={(Object.keys(TONE_LABELS) as Tone[]).map((t) => ({ value: t, label: TONE_LABELS[t] }))}
                  />
                </Field>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-zinc-100 px-5 py-3.5">
              <Button variant="ghost" disabled={!dirty} onClick={() => setDraft(null)}>
                Буцаах
              </Button>
              <Button disabled={!dirty || !!nameError} onClick={save}>
                Хадгалах
              </Button>
            </div>
          </Card>

          {/* Автоматжуулалт */}
          <Card>
            <CardHeader title="Автоматжуулалт" description="Хэр олон пост, хэрхэн нийтлэхийг тохируулна." />
            <div className="divide-y divide-zinc-100 px-5 pb-2 pt-3">
              <div className="py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-zinc-900">7 хоногт хэдэн пост?</p>
                  <span className="text-lg font-semibold text-brand-700">{settings.postsPerWeek}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={WEEKLY_POSTS[plan]}
                  value={Math.min(settings.postsPerWeek, WEEKLY_POSTS[plan])}
                  aria-label="7 хоногт хэдэн пост"
                  onChange={(e) => setSettings({ ...settings, postsPerWeek: Number(e.target.value) })}
                  className="mt-3 w-full accent-brand-600"
                />
                <p className="mt-1 text-xs text-zinc-500">
                  Санал болгох: 3–5 пост. Тогтмол байдал олон пост оруулахаас чухал. {PLAN_LABELS[plan]} багцад 7 хоногт{" "}
                  {WEEKLY_POSTS[plan]} хүртэл.
                </p>
              </div>
              <SettingRow
                title="Нийтлэхээс өмнө батлуулах"
                description="AI бэлдсэн пост бүрийг та шалгаж батласны дараа л нийтлэгдэнэ."
                checked={settings.requireApproval}
                onChange={(v) => setSettings({ ...settings, requireApproval: v })}
              >
                {!settings.requireApproval && (
                  <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                    <IconAlert className="size-4 shrink-0" />
                    Унтраавал AI-ийн бэлдсэн пост (7 хоногийн төлөвлөгөө, AI студи) батлалгүйгээр шууд хуваарьт орж
                    нийтлэгдэнэ. Эхний үед асаалттай байлгахыг зөвлөж байна.
                  </p>
                )}
              </SettingRow>
              <SettingRow
                title="Ухаалаг цаг"
                description="Постуудыг өдрийн өөр өөр цагт тараан хуваарьлана. Дагагчдын бодит идэвхтэй цагийг Meta-тай холбогдсоны дараа ашиглах боломжтой болно."
                checked={settings.smartTiming}
                onChange={(v) => setSettings({ ...settings, smartTiming: v })}
              />
              <SettingRow
                title="7 хоног бүрийн тайлан"
                description="Даваа гариг бүр үр дүнгийн товч тайланг имэйлээр илгээнэ. Тест горимд имэйл илгээгдэхгүй."
                checked={settings.weeklyReport}
                onChange={(v) => setSettings({ ...settings, weeklyReport: v })}
              />
            </div>
          </Card>

          {/* AI загварууд */}
          <section id="ai" className="scroll-mt-24">
            <Card>
              <CardHeader
                icon={IconSparkles}
                title="AI загварууд"
                description={
                  USES_OLLAMA
                    ? "Текст — локал Ollama, бусад (зураг/видео) — Hugging Face Inference Providers-ээр ажиллана."
                    : "Бүх даалгавар Hugging Face Inference Providers-ээр ажиллана."
                }
                action={
                  ai === null ? (
                    <Badge>Шалгаж байна…</Badge>
                  ) : ai.connected && ai.issue ? (
                    <Badge tone="rose">
                      <IconAlert className="size-3" /> {AI_ISSUE_LABELS[ai.issue]}
                    </Badge>
                  ) : ai.connected ? (
                    <Badge tone="emerald">
                      <IconCheck className="size-3" /> HF холбогдсон
                    </Badge>
                  ) : (
                    <Badge tone="amber">HF токен байхгүй</Badge>
                  )
                }
              />
              {/* AI хэрэглээ — тест хийхдээ HF кредит хэмнэх */}
              <div className="mx-5 mt-4 rounded-xl bg-zinc-900/[0.03] p-3.5 ring-1 ring-inset ring-zinc-900/[0.06]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900">AI хэрэглээ</p>
                    <p className="mt-0.5 text-xs text-zinc-500">{AI_USAGE_LABELS[aiUsage].hint}</p>
                  </div>
                  <Segmented
                    value={aiUsage}
                    onChange={(v) => {
                      setAiUsage(v);
                      notify(`AI хэрэглээ: ${AI_USAGE_LABELS[v].label}`, "info");
                    }}
                    options={AI_USAGE_OPTIONS.map((u) => ({ value: u, label: AI_USAGE_LABELS[u].label }))}
                    className="shrink-0"
                  />
                </div>
              </div>
              <ul className="divide-y divide-zinc-100 px-5 pt-3">
                {AI_TASK_ORDER.map((t) => {
                  const model = ai?.models[t] ?? AI_TASKS[t].defaultModel;
                  const isOllama = AI_TASKS[t].provider === "ollama";
                  return (
                    <li key={t} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="sm:w-40 sm:shrink-0">
                        <p className="text-sm font-medium text-zinc-900">{AI_TASKS[t].label}</p>
                        <p className="text-xs text-zinc-400">{AI_TASKS[t].hfTask}</p>
                      </div>
                      {isOllama ? (
                        <code className="min-w-0 flex-1 truncate text-[13px] text-zinc-700">{model}</code>
                      ) : (
                        <a
                          href={`https://huggingface.co/${model}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-w-0 flex-1 truncate text-[13px] text-violet-700 hover:underline"
                        >
                          {model}
                        </a>
                      )}
                      {isOllama && ai !== null && (
                        <Badge tone={ai.ollama.reachable ? "emerald" : "amber"}>
                          {ai.ollama.reachable ? (
                            <>
                              <IconCheck className="size-3" /> Ollama ажиллаж байна
                            </>
                          ) : (
                            "Ollama хүрэхгүй байна"
                          )}
                        </Badge>
                      )}
                      <code className="w-fit rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500">
                        {AI_TASKS[t].env}
                      </code>
                    </li>
                  );
                })}
              </ul>

              {USES_OLLAMA && ai !== null && !ai.ollama.reachable && (
                <div className="mx-5 mt-2 rounded-xl bg-amber-50 p-4 text-[13px] text-amber-950 ring-1 ring-amber-200/70">
                  <p className="font-semibold">Ollama ажиллахгүй байна</p>
                  <p className="mt-1.5 leading-relaxed">
                    Терминал дээр <code className="rounded bg-surface px-1 py-0.5 ring-1 ring-amber-200">ollama serve</code>{" "}
                    ажиллуулж, <code className="rounded bg-surface px-1 py-0.5 ring-1 ring-amber-200">ollama pull qwen2.5</code>{" "}
                    хийгдсэн эсэхийг шалгана уу.
                  </p>
                </div>
              )}

              {ai?.connected && ai.issue && (
                <div className="mx-5 mt-2 rounded-xl bg-rose-50 p-4 text-[13px] text-rose-950 ring-1 ring-rose-200/70">
                  <p className="font-semibold">
                    {ai.issue === "no_credits" ? "Hugging Face кредит дууссан" : "Hugging Face токен ажиллахгүй байна"}
                  </p>
                  <p className="mt-1.5 leading-relaxed">
                    {ai.issue === "no_credits" ? (
                      <>
                        AI дуудлага бүр 402 алдаа өгч байгаа тул пост үүсгэх нь жишээ текстээр ажиллаж байна.{" "}
                        <a
                          href="https://huggingface.co/settings/billing"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium underline"
                        >
                          huggingface.co/settings/billing
                        </a>{" "}
                        хуудаснаас кредит нэмэх эсвэл сарын үнэгүй кредит шинэчлэгдэхийг хүлээнэ үү.
                      </>
                    ) : (
                      <>
                        Токен буруу эсвэл &ldquo;Make calls to Inference Providers&rdquo; эрхгүй байна. Шинэ токен үүсгээд{" "}
                        <code className="rounded bg-surface px-1 py-0.5 ring-1 ring-rose-200">train/.env.local</code>-д солино
                        уу.
                      </>
                    )}
                  </p>
                </div>
              )}

              {ai && !ai.connected && (
                <div className="mx-5 mt-2 rounded-xl bg-amber-50 p-4 text-[13px] text-amber-950 ring-1 ring-amber-200/70">
                  <p className="font-semibold">Холбох алхам</p>
                  <ol className="mt-2 list-decimal space-y-1.5 pl-5 leading-relaxed">
                    <li>
                      <a
                        href="https://huggingface.co/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium underline"
                      >
                        huggingface.co/settings/tokens
                      </a>{" "}
                      → Create new token → Fine-grained → &ldquo;Make calls to Inference Providers&rdquo;-г чагтална.
                    </li>
                    <li>
                      <code className="rounded bg-surface px-1 py-0.5 ring-1 ring-amber-200">train/.env.local</code> файлд{" "}
                      <code className="rounded bg-surface px-1 py-0.5 ring-1 ring-amber-200">HF_TOKEN=hf_…</code> мөр нэмнэ.
                    </li>
                    <li>Хуудсаа refresh хийнэ (dev server .env.local-ийг автоматаар дахин уншина).</li>
                  </ol>
                </div>
              )}

              <p className="p-5 text-xs leading-relaxed text-zinc-500">
                Загвар солих бол .env.local-д дээрх нэрээр (жишээ нь{" "}
                <code className="text-zinc-700">HF_IMAGE_MODEL=stabilityai/stable-diffusion-3.5-large</code> эсвэл{" "}
                <code className="text-zinc-700">HF_TEXT_MODEL=google/gemma-4-31B-it</code>) зааж өгнө. Hugging Face сар
                бүр бага хэмжээний үнэгүй кредит олгодог; зураг, ялангуяа видео үүсгэх нь илүү их кредит зарцуулна.
                {USES_OLLAMA && (
                  <>
                    {" "}
                    Ollama нь сервертэй нэг компьютер дээр локал ажиллах шаардлагатай (анхны байршуулалт{" "}
                    <code className="text-zinc-700">http://localhost:11434</code>, шаардлагатай бол{" "}
                    <code className="text-zinc-700">OLLAMA_HOST</code>-оор солино).
                  </>
                )}
              </p>
            </Card>
          </section>
        </div>

        <div className="space-y-6">
          {/* Холболт */}
          <Card>
            <CardHeader icon={IconLink} title="Холбогдсон аккаунт" description="Meta Graph API-аар холбогдоно." />
            <ul className="space-y-2 p-5">
              {(["facebook", "instagram"] as Platform[]).map((p) => (
                <li key={p} className="flex items-center gap-3 rounded-xl p-3 ring-1 ring-zinc-200">
                  <PlatformIcon platform={p} className="size-9" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-zinc-900">
                      {p === "facebook" ? "Facebook Page" : "Instagram Business"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">
                      {connections[p]
                        ? (p === "facebook" ? business.name : business.handle && "@" + business.handle) || "Холбогдсон (тест)"
                        : "Холбогдоогүй"}
                    </p>
                  </div>
                  <Button size="sm" variant={connections[p] ? "ghost" : "primary"} onClick={() => toggleConnection(p)}>
                    {connections[p] ? "Салгах" : "Холбох"}
                  </Button>
                </li>
              ))}
              <li className="flex items-center gap-3 rounded-xl p-3 opacity-60 ring-1 ring-dashed ring-zinc-300">
                <span className="flex size-9 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-zinc-50">
                  T
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-900">TikTok</p>
                  <p className="text-xs text-zinc-500">Удахгүй</p>
                </div>
              </li>
            </ul>
            <p className="px-5 pb-5 text-xs leading-relaxed text-zinc-500">
              Шаардлагатай зөвшөөрөл: пост нийтлэх, Page болон Instagram-ийн статистик унших. Тест горимд бодит холболт
              хийгдэхгүй.
            </p>
          </Card>

          {/* Багц */}
          <Card>
            <CardHeader icon={IconWallet} title="Багц" />
            <div className="space-y-2 p-5">
              {(["free", "plus"] as Plan[]).map((p) => {
                const current = planLoaded && p === plan;
                return (
                  <div
                    key={p}
                    className={cn(
                      "flex items-center gap-3 rounded-xl p-3 ring-1",
                      current ? "bg-brand-50/60 ring-brand-300" : "ring-zinc-200",
                    )}
                  >
                    <div className="flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-zinc-900">
                        {PLAN_LABELS[p]} {p === "plus" && <PlusBadge />} {current && <Badge tone="brand">Одоогийн</Badge>}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Сард {MONTHLY_POSTS[p]} пост · {p === "plus" ? "Зураг, видео, хязгааргүй AI" : "Өдрийн AI хязгаартай"}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {p === "plus" ? formatMoney(PLUS_PRICE) : "₮0"}
                      <span className="text-xs font-normal text-zinc-400">/сар</span>
                    </p>
                  </div>
                );
              })}
              <ButtonLink href="/dashboard/plan" variant="secondary" className="mt-2 w-full">
                Багц харьцуулах
              </ButtonLink>
              <p className="flex items-center justify-center gap-1 pt-1 text-xs text-zinc-500">
                <IconCheck className="size-3.5 text-emerald-600" /> Маркетингийн агентлагаас 15 дахин хямд
              </p>
            </div>
          </Card>

          {/* Тест өгөгдөл */}
          <Card className="p-5">
            <p className="text-sm font-medium text-zinc-900">Тест өгөгдөл</p>
            <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">
              Таны үүсгэсэн пост, тохиргоо энэ browser-т хадгалагдана. Анхны жишээ өгөгдөл рүү буцааж болно.
            </p>
            {confirmReset ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => {
                    resetData();
                    setDraft(null);
                    setConfirmReset(false);
                    notify("Жишээ өгөгдөл рүү буцаалаа", "info");
                  }}
                >
                  Тийм, бүгдийг арилгах
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmReset(false)}>
                  Болих
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setConfirmReset(true)}>
                Жишээ өгөгдөл рүү буцаах
              </Button>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

function SettingRow({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-900">{title}</p>
          <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>
        </div>
        <Toggle checked={checked} onChange={onChange} label={title} />
      </div>
      {children}
    </div>
  );
}
