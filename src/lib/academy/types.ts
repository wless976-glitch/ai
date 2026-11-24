/**
 * "Сургалт" хэсгийн өгөгдлийн бүтэц.
 * Модуль → хичээлүүд → агуулгын блокууд, модуль бүрийн төгсгөлд шалгалт.
 * Текст дотор **тод** бичиж болно (lesson-body.tsx-д тодруулна).
 */

export type ToolId = "boost" | "breakeven" | "tax";

export type Block =
  /** Энгийн догол мөр */
  | { type: "p"; text: string }
  /** Дэд гарчиг */
  | { type: "h"; text: string }
  /** Жагсаалт. ordered бол дугаартай алхам болж харагдана */
  | { type: "list"; items: string[]; ordered?: boolean }
  /** Зөвлөгөө (шар) */
  | { type: "tip"; text: string }
  /** Анхааруулга (улаан) */
  | { type: "warn"; text: string }
  /** Бодит жишээ (цэнхэр) */
  | { type: "example"; title?: string; text: string }
  /** Томьёо, тооцоо */
  | { type: "formula"; label: string; text: string }
  /** Хүснэгт */
  | { type: "table"; head: string[]; rows: string[][] }
  /** Тооцоолуурыг хичээл дотор шууд харуулна */
  | { type: "tool"; tool: ToolId };

export interface Source {
  label: string;
  url: string;
}

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  summary: string;
  blocks: Block[];
  /** Хичээлийн дараа хийх дасгал — бизнес дээрээ шууд хэрэгжүүлэх */
  task?: string;
  /** "AI-аас асуух" товч дарахад чатын талбарт бэлдэж өгөх асуулт */
  ask?: string;
  /** Тоо баримт нь хэзээ шалгагдсан (татвар зэрэг өөрчлөгддөг мэдээлэлд) */
  checked?: string;
  sources?: Source[];
}

export interface QuizQuestion {
  q: string;
  options: string[];
  /** options доторх зөв хариултын индекс */
  answer: number;
  explain: string;
}

export type ModuleTone = "brand" | "blue" | "pink" | "amber" | "violet" | "emerald" | "rose" | "sky";

export type ModuleIcon =
  | "sparkles"
  | "target"
  | "shield"
  | "wallet"
  | "bulb"
  | "facebook"
  | "instagram"
  | "rocket"
  | "chart"
  | "message"
  | "calendar"
  | "book";

export interface Module {
  id: string;
  title: string;
  /** Картан дээрх нэг өгүүлбэр */
  short: string;
  level: "Эхлэгч" | "Дунд" | "Ахисан";
  icon: ModuleIcon;
  tone: ModuleTone;
  lessons: Lesson[];
  quiz: QuizQuestion[];
}

export interface GlossaryTerm {
  term: string;
  en?: string;
  text: string;
  group: "Маркетинг" | "Зар & Boost" | "Санхүү" | "Татвар & Хууль";
}
