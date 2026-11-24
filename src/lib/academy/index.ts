import { ADS, BOOST, SALES } from "./modules-ads";
import { LEGAL, PLAN30, TAX } from "./modules-business";
import { BASICS, CONTENT, FACEBOOK, INSTAGRAM, MARKETING } from "./modules-growth";
import type { Lesson, Module } from "./types";

export type * from "./types";
export { GLOSSARY, RESOURCES } from "./glossary";

/** Санал болгох дараалал: суурь → маркетинг → платформ → контент → зар → борлуулалт → хууль, татвар → практик */
export const MODULES: Module[] = [BASICS, MARKETING, FACEBOOK, INSTAGRAM, CONTENT, BOOST, ADS, SALES, LEGAL, TAX, PLAN30];

export const ALL_LESSONS: { lesson: Lesson; module: Module }[] = MODULES.flatMap((module) =>
  module.lessons.map((lesson) => ({ lesson, module })),
);

export const TOTAL_MINUTES = ALL_LESSONS.reduce((n, { lesson }) => n + lesson.minutes, 0);

/** Шалгалттай модулиуд (30 хоногийн хөтөлбөрт шалгалт байхгүй) */
export const QUIZ_MODULES = MODULES.filter((m) => m.quiz.length > 0);

/** Шалгалтад тэнцэх хувь */
export const PASS_RATE = 0.7;

export function findModule(id: string | null | undefined) {
  return MODULES.find((m) => m.id === id);
}

/** Уншаагүй эхний хичээл (бүгдийг уншсан бол null) */
export function nextUnread(read: string[]) {
  return ALL_LESSONS.find(({ lesson }) => !read.includes(lesson.id)) ?? null;
}
