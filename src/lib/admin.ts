/**
 * Админ API-н серверийн давхарга. Эрхийг үргэлж серверт Clerk-ээс шинээр уншиж шалгана —
 * browser-оос ирсэн мэдээлэлд итгэхгүй.
 */
import "server-only";
import { auth, clerkClient } from "@clerk/nextjs/server";
import type { User } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { storedPlanOf } from "./plan";
import { roleOf, type AdminUser } from "./roles";

export class AdminError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

/** Нэвтэрсэн, админ эрхтэй хэрэглэгч эсэхийг шалгана. Үгүй бол 401/403 шиднэ. */
export async function requireAdmin() {
  const { userId } = await auth();
  if (!userId) throw new AdminError("Нэвтэрнэ үү.", 401);
  const client = await clerkClient();
  const me = await client.users.getUser(userId);
  if (roleOf(me.publicMetadata) !== "admin") throw new AdminError("Энэ хэсэг зөвхөн админд нээлттэй.", 403);
  return { userId, client };
}

export function toAdminUser(u: User): AdminUser {
  const email = u.primaryEmailAddress?.emailAddress ?? u.emailAddresses[0]?.emailAddress ?? null;
  return {
    id: u.id,
    name: u.fullName || u.username || email?.split("@")[0] || "Нэргүй",
    email,
    imageUrl: u.imageUrl,
    role: roleOf(u.publicMetadata),
    plan: storedPlanOf(u.publicMetadata),
    createdAt: u.createdAt,
    lastSignInAt: u.lastSignInAt,
    lastActiveAt: u.lastActiveAt,
    banned: u.banned,
  };
}

export function adminErrorResponse(err: unknown) {
  if (err instanceof AdminError) return NextResponse.json({ error: err.message }, { status: err.status });
  // Clerk-ийн алдаа (жишээ нь устгагдсан хэрэглэгч) — status талбартай ирнэ
  if ((err as { status?: unknown })?.status === 404) {
    return NextResponse.json({ error: "Хэрэглэгч олдсонгүй." }, { status: 404 });
  }
  console.error("[admin]", err);
  return NextResponse.json({ error: "Clerk-ээс мэдээлэл авч чадсангүй. Дахин оролдоно уу." }, { status: 502 });
}
