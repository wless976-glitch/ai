import { connection, NextResponse } from "next/server";
import { aiStatus } from "@/lib/hf";

/** HF_TOKEN тохируулсан эсэх, аль загварууд ашиглагдаж буйг буцаана (токеныг өөрийг нь биш) */
export async function GET() {
  await connection();
  return NextResponse.json(await aiStatus());
}
