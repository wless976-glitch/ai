import { GLOSSARY } from "./glossary";
import { MODULES } from "./index";
import type { Block } from "./types";

/**
 * Сургалтын хичээлүүдээс AI-д "мэдлэг" болгон өгөх хайлт (RAG). Загварыг дахин сургадаггүй —
 * асуулт бүрт хамгийн хамааралтай 2–3 хичээлийн хамааралтай мөрүүдийг prompt-д нэмнэ.
 * Ингэснээр хичээлээ засахад AI шууд шинэ мэдлэгээ ашиглана (жишээ нь 2027 оны татварын өөрчлөлт).
 *
 * AI дуудахгүй, токен зарцуулахгүй — серверт (prompt бэлдэх) ба «Токенгүй» горимын хариултад ашиглана.
 */

export interface KnowledgeSource {
  /** Сургалтын хуудас доторх холбоос: "#m=boost&l=bo-budget" эсвэл "#tab=glossary" */
  href: string;
  title: string;
  module: string;
}

export interface KnowledgeHit extends KnowledgeSource {
  score: number;
  summary: string;
  /** Асуулттай хамгийн хамааралтай мөрүүд, хичээл доторх дарааллаараа */
  lines: string[];
}

/* ---------------- Текстийг хайлтад бэлдэх ---------------- */

/** Кирилл → латин. Ө/О, Ү/У-г нэгтгэдэг тул латинаар бичсэн монгол асуулт ("tatvar", "zar") ч олдоно */
const FOLD: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l",
  м: "m", н: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "h", ц: "ts",
  ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "i", э: "e", ю: "yu", я: "ya",
};

function fold(text: string) {
  return text
    .toLowerCase()
    .replace(/[а-яёөү]/g, (c) => FOLD[c] ?? c)
    .replace(/kh/g, "h")
    .replace(/x/g, "h")
    .replace(/c(?!h)/g, "ts")
    .replace(/q/g, "k")
    .replace(/w/g, "v");
}

/** Асуултад байнга гардаг, утга агуулаагүй үгс (латинжуулсан хэлбэрээр) */
const STOP = new Set(
  [
    "вэ", "бэ", "юу", "юм", "бол", "нь", "энэ", "тэр", "эдгээр", "ба", "болон", "бас", "мөн", "эсвэл", "хэрхэн", "яаж",
    "яах", "би", "миний", "манай", "бид", "та", "таны", "чи", "чиний", "гэж", "гэх", "гэсэн", "байна", "байгаа", "байх",
    "байдаг", "уу", "үү", "хэд", "хэдэн", "ямар", "аль", "өгөөч", "өг", "өгнө", "ч", "л", "дээр", "тухай", "хийх", "хийж",
    "хийгээд", "хийвэл", "болох", "болно", "надад", "тэгвэл", "зөв", "вэй", "юунд", "хаана", "хэзээ", "яагаад", "зүгээр",
    "сайн", "сайхан", "бэлдэж", "бичиж", "тайлбарлаач", "хэлж", "өгөх", "хүсч", "хүсэж", "одоо", "биш", "ялгаа", "ялгаатай", "чухал", "илүү", "олон", "хоёр", "хоёрын", "the", "and",
    // Латинаар чатлахад түгээмэл товчлол
    "bn", "bna", "bnaa", "bnuu", "bgaa", "bga", "ym", "yu", "yaj", "gd", "gsn", "mini", "vv",
    // Зураасаар салсан нөхцөл ("НӨАТ-ын", "boost-ийн")
    "ын", "ийн", "ыг", "ийг", "аа", "ээ", "оо", "өө", "ууд", "үүд", "тай", "тэй", "той", "аар", "ээр", "оор", "д", "т",
  ].map(fold),
);

/** Товчлол, англи үг, латин бичлэгийг хичээлд байдаг үг рүү чиглүүлнэ */
const ALIASES: Record<string, string[]> = {
  fb: ["facebook"], feisbuk: ["facebook"], feysbuk: ["facebook"], fesbuk: ["facebook"], peisbuk: ["facebook"],
  ig: ["instagram"], insta: ["instagram"], instagram: ["instagram"],
  bust: ["boost"], buust: ["boost"], boost: ["boost"],
  reklam: ["zar"], ads: ["zar", "ads"], ad: ["zar"], advertising: ["zar"],
  tax: ["tatvar"], vat: ["noat"], llc: ["hhk"], ebarimt: ["barimt"],
  riils: ["reels"], rils: ["reels"], reel: ["reels"],
  chat: ["messej", "messenger"], inbox: ["messej", "messenger"], messej: ["messej", "messenger"],
};

function tokens(text: string) {
  return fold(text.replace(/\*\*/g, ""))
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 2 && !STOP.has(t));
}

/** Нэрийн тийн ялгалын нөхцлүүд (латинжуулсан): зар → зарын, зарыг, зараа, зарууд */
const CASE_ENDINGS = new Set(
  ["in", "iin", "nii", "ig", "iig", "aa", "ee", "oo", "uud", "d", "t", "tai", "tei", "toi", "aar", "eer", "oor", "aas", "ees", "oos", "ni", "s"],
);

/**
 * Монгол үг нөхцөлтэй (татвар, татварын, татварт) тул эхний хэсгээр нь тааруулна.
 * Богино үгэнд (зар, бага) зөвхөн тийн ялгалын нөхцөл зөвшөөрнө — эс бөгөөс "зар" нь "зарим", "зардал",
 * "бага" нь "багана"-тай андуурагдана.
 */
function matches(a: string, b: string) {
  const [s, l] = a.length <= b.length ? [a, b] : [b, a];
  if (s.length < 3) return s === l;
  if (s.length <= 4) return l === s || (l.startsWith(s) && CASE_ENDINGS.has(l.slice(s.length)));
  return l.startsWith(s.slice(0, s.length <= 6 ? 4 : 5));
}

/* ---------------- Хичээлүүдийг индексжүүлэх ---------------- */

interface Line {
  text: string;
  /** Энэ мөр аль дэд гарчгийн доор байгаа (-1 = гарчиггүй) */
  section: number;
  tokens: string[];
}

interface Doc extends KnowledgeSource {
  summary: string;
  titleTokens: Set<string>;
  body: Map<string, number>;
  lines: Line[];
  headings: { text: string; tokens: string[] }[];
  /** Зөвхөн асуулттай таарсан мөрүүдийг өгнө (нэр томьёоны жагсаалт г.м.) */
  onlyMatching?: boolean;
}

const clean = (s: string) => s.replace(/\*\*/g, "").replace(/\s*\n\s*/g, "; ").trim();

/** Блок бүрийг бие даан ойлгогдох мөрүүд болгоно (хүснэгтийн мөр бүр "Багана: утга" хэлбэрээр) */
function blockLines(b: Block): string[] {
  switch (b.type) {
    case "p":
      return [clean(b.text)];
    case "list":
      return b.items.map((x, i) => `${b.ordered ? `${i + 1}.` : "-"} ${clean(x)}`);
    case "tip":
      return [`Зөвлөгөө: ${clean(b.text)}`];
    case "warn":
      return [`Анхаар: ${clean(b.text)}`];
    case "example":
      return [`Жишээ${b.title ? ` (${clean(b.title)})` : ""}: ${clean(b.text)}`];
    case "formula":
      return [`${b.label}: ${clean(b.text)}`];
    case "table":
      return b.rows.map(
        (r) =>
          "- " +
          r
            .map((cell, i) => (b.head[i] ? `${clean(b.head[i])}: ${clean(cell)}` : clean(cell)))
            .filter((c) => !/:\s*$/.test(c))
            .join("; "),
      );
    case "h":
    case "tool":
      return [];
  }
}

const LESSON_DOCS: Doc[] = MODULES.flatMap((mod) =>
  mod.lessons.map((lesson) => {
    const headings: Doc["headings"] = [];
    const lines: Line[] = [];
    for (const b of lesson.blocks) {
      if (b.type === "h") {
        headings.push({ text: b.text, tokens: tokens(b.text) });
        continue;
      }
      for (const text of blockLines(b)) lines.push({ text, section: headings.length - 1, tokens: tokens(text) });
    }
    if (lesson.task) lines.push({ text: `Дасгал: ${lesson.task}`, section: -1, tokens: tokens(lesson.task) });
    if (lesson.checked) lines.push({ text: `(Тоо баримтыг ${lesson.checked} шалгасан.)`, section: -1, tokens: [] });

    const body = new Map<string, number>();
    for (const t of [...tokens(lesson.summary), ...lines.flatMap((l) => l.tokens), ...headings.flatMap((h) => h.tokens)]) {
      body.set(t, (body.get(t) ?? 0) + 1);
    }
    return {
      href: `#m=${mod.id}&l=${lesson.id}`,
      title: lesson.title,
      module: mod.title,
      summary: clean(lesson.summary),
      titleTokens: new Set(tokens(`${lesson.title} ${mod.title}`)),
      body,
      lines,
      headings,
    };
  }),
);

/** Нэр томьёоны тайлбар — "X гэж юу вэ?" асуултад тодорхойлолтыг нь өгнө */
const glossaryLines: Line[] = GLOSSARY.map((t) => {
  const text = `${t.term}${t.en ? ` (${t.en})` : ""}: ${t.text}`;
  return { text, section: -1, tokens: tokens(`${t.term} ${t.en ?? ""}`) };
});
const GLOSSARY_DOC: Doc = {
  href: "#tab=glossary",
  title: "Нэр томьёоны тайлбар",
  module: "Сургалт",
  summary: "Маркетинг, зар, санхүү, татварын нэр томьёо.",
  titleTokens: new Set(tokens("нэр томьёо тайлбар")),
  // Зөвхөн нэр томьёо өөрөө (тайлбарын үгс биш) таарахад олдоно
  body: new Map(glossaryLines.flatMap((l) => l.tokens).map((t) => [t, 1] as const)),
  lines: glossaryLines,
  headings: [],
  onlyMatching: true,
};

const DOCS: Doc[] = [...LESSON_DOCS, GLOSSARY_DOC];

/* ---------------- Хайлт ---------------- */

function queryTokens(query: string) {
  const out = new Set<string>();
  for (const t of tokens(query)) {
    out.add(t);
    for (const a of ALIASES[t] ?? []) out.add(a);
  }
  return [...out].slice(0, 24);
}

const anyMatch = (q: string, list: Iterable<string>) => {
  for (const t of list) if (matches(q, t)) return true;
  return false;
};

function bodyCount(q: string, body: Map<string, number>) {
  let n = 0;
  for (const [t, c] of body) if (matches(q, t)) n += c;
  return n;
}

function lineScore(qs: { q: string; idf: number }[], toks: string[]) {
  let s = 0;
  for (const { q, idf } of qs) if (toks.some((t) => matches(q, t))) s += idf;
  return s;
}

/**
 * Асуултад хамгийн хамааралтай хичээлүүд. `maxChars` нь бүх хичээлийн мөрүүдийн нийт урт —
 * хичээл бүрээс асуулттай хамгийн их таарах мөрүүдийг (гарчигтай нь) сонгоно.
 */
export function searchKnowledge(query: string, { limit = 3, maxChars = 2400 } = {}): KnowledgeHit[] {
  const qTokens = queryTokens(query);
  if (!qTokens.length) return [];

  const N = DOCS.length;
  const qs = qTokens
    .map((q) => {
      const df = DOCS.filter((d) => anyMatch(q, d.titleTokens) || bodyCount(q, d.body) > 0).length;
      return { q, df, idf: df ? Math.log(1 + N / df) : 0 };
    })
    // Бараг бүх хичээлд гардаг үг ялгах чадваргүй
    .filter((x) => x.df > 0 && x.df < N * 0.6);
  if (!qs.length) return [];

  const scored = DOCS.map((d) => {
    let score = 0;
    for (const { q, idf } of qs) {
      if (anyMatch(q, d.titleTokens)) score += idf * 2.5;
      const n = bodyCount(q, d.body);
      if (n) score += idf * (1 + Math.log(n));
    }
    return { d, score };
  }).sort((a, b) => b.score - a.score);

  const top = scored[0]?.score ?? 0;
  // Нэг ч утгатай үг таараагүй бол ("сайн байна уу" г.м.) мэдлэг нэмэхгүй
  if (top < 2) return [];
  const picked = scored.filter((s) => s.score >= top * 0.55).slice(0, limit);
  const budget = Math.floor(maxChars / picked.length);

  return picked.map(({ d, score }) => ({
    href: d.href,
    title: d.title,
    module: d.module,
    score: Math.round(score * 10) / 10,
    summary: d.summary,
    lines: pickLines(d, qs, budget - d.summary.length),
  }));
}

/** Хичээл доторх мөрүүдийг асуулттай таарах байдлаар эрэмбэлж, төсөвт багтаан анхны дарааллаар нь буцаана */
function pickLines(d: Doc, qs: { q: string; idf: number }[], budget: number) {
  const headingScore = d.headings.map((h) => lineScore(qs, h.tokens));
  const ranked = d.lines
    .map((line, i) => ({ i, line, score: lineScore(qs, line.tokens) + (line.section >= 0 ? headingScore[line.section] * 0.6 : 0) }))
    .sort((a, b) => b.score - a.score || a.i - b.i);

  const chosen = new Set<number>();
  const usedSections = new Set<number>();
  let used = 0;
  for (const { i, line, score } of ranked) {
    if (d.onlyMatching && score === 0) continue;
    const headingCost = line.section >= 0 && !usedSections.has(line.section) ? d.headings[line.section].text.length + 2 : 0;
    const cost = line.text.length + 1 + headingCost;
    if (used + cost > budget) continue;
    chosen.add(i);
    if (line.section >= 0) usedSections.add(line.section);
    used += cost;
  }

  const out: string[] = [];
  let lastSection = -1;
  d.lines.forEach((line, i) => {
    if (!chosen.has(i)) return;
    if (line.section >= 0 && line.section !== lastSection) out.push(`${d.headings[line.section].text}:`);
    lastSection = line.section;
    out.push(line.text);
  });
  return out;
}

/* ---------------- Prompt-д оруулах ---------------- */

/** Системийн prompt-д нэмэх мэдлэгийн хэсэг (хайлт юу ч олоогүй бол хоосон) */
export function knowledgePrompt(hits: KnowledgeHit[]) {
  if (!hits.length) return "";
  const body = hits
    .map((h) => [`[${h.module} › ${h.title}]`, h.summary, ...h.lines].join("\n"))
    .join("\n\n");
  return `

Түгээ-ийн "Сургалт" хэсгийн энэ асуулттай холбоотой хичээлүүд (шалгагдсан мэдлэг):
<<<
${body}
>>>
Энэ мэдлэгийг хариултынхаа үндэс болго: тоо, хувь, босго, хугацаа, дүрмийг эндээс ав, өөрчилж бүү бич. Энд байхгүй тоог бүү зохио. Татвар, хуулийн асуултад 2026 онд мөрдөж буй ба 2027.01.01-нээс хэрэгжих дүрмийг ялгаж хэлээд, нягтлан бодогч эсвэл татварын албанаас баталгаажуулахыг товч сануул. Асуулт эдгээр хичээлтэй холбоогүй бол энэ хэсгийг үл тоо.`;
}

export const toSources = (hits: KnowledgeHit[]): KnowledgeSource[] =>
  hits.map(({ href, title, module }) => ({ href, title, module }));

/** «Токенгүй» горимд AI-ийн оронд хамгийн хамааралтай хичээлээс хариулт бүрдүүлнэ */
export function knowledgeAnswer(question: string) {
  const hits = searchKnowledge(question, { limit: 2, maxChars: 1400 });
  if (!hits.length) return { text: "", sources: [] as KnowledgeSource[] };
  const [first] = hits;
  const points = first.lines.filter((l) => !l.endsWith(":")).slice(0, 6);
  const text = [
    `**${first.title}** (Сургалт › ${first.module})`,
    "",
    first.summary,
    "",
    ...points.map((p) => (/^(-|\d+\.)\s/.test(p) ? p : `- ${p}`)),
  ].join("\n");
  return { text, sources: toSources(hits) };
}

/**
 * Пост бичих prompt-д нэмэх сургалтын дүрмүүд (Контент, Facebook модулиас) — хайлтгүй, тогтмол, богино.
 */
export const POST_WRITING_RULES =
  "Сайн постын дүрэм: эхний мөр нь гүйлгэж буй хүнийг зогсоох hook (асуулт, тоо, гэнэтийн мэдээ); нэг пост — нэг гол санаа; төгсгөлд нэг тодорхой уриалга (мессеж бичих, захиалах г.м.); боломжтой бол сэтгэгдэл бичүүлэх жинхэнэ асуулт тавь. \"Like дараад share хийгээрэй\", \"найзаа tag-лаарай\" гэх мэт зөвхөн харьцаа гуйсан бичвэр бүү бич (Facebook хүрэлтийг нь бууруулдаг). Үнэ өгөгдсөн бол нээлттэй бич, \"үнэ inbox-оор\" гэж бүү бич.";
