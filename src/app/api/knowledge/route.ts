import { NextResponse } from "next/server";
import { knowledgeAnswer } from "@/lib/academy/knowledge";

/**
 * Сургалтаас хариулт хайх (AI дуудахгүй, токен зарцуулахгүй) — «Токенгүй» горимын чат ашиглана.
 * Агуулга нь Сургалт хуудастай ижил нийтийн мэдээлэл тул нэвтрэлт шаардахгүй.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.slice(0, 1500) : "";
  return NextResponse.json(knowledgeAnswer(question));
}
