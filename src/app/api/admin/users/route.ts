import { NextResponse } from "next/server";
import { adminErrorResponse, requireAdmin, toAdminUser } from "@/lib/admin";
import type { AdminUserList } from "@/lib/roles";

/** Бүх хэрэглэгч (шинэ нь эхэндээ, хамгийн ихдээ 100). Зөвхөн админ. */
export async function GET() {
  try {
    const { userId, client } = await requireAdmin();
    const { data, totalCount } = await client.users.getUserList({ limit: 100, orderBy: "-created_at" });
    const body: AdminUserList = { users: data.map(toAdminUser), total: totalCount, me: userId };
    return NextResponse.json(body);
  } catch (err) {
    return adminErrorResponse(err);
  }
}
