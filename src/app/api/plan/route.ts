import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/hf";
import { planUsage } from "@/lib/plan-server";

/** Одоогийн хэрэглэгчийн багц, өнөөдрийн AI хэрэглээ */
export async function GET() {
  try {
    return NextResponse.json(await planUsage());
  } catch (err) {
    return errorResponse(err);
  }
}
