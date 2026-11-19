import { NextResponse, type NextRequest } from "next/server";
import { AdminError, adminErrorResponse, requireAdmin, toAdminUser } from "@/lib/admin";
import { forgetPlan } from "@/lib/plan-server";

/** Хэрэглэгчийн эрх эсвэл багцыг солино: { role: "admin" | "user" } эсвэл { plan: "plus" | "free" }. Зөвхөн админ. */
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  try {
    const { userId, client } = await requireAdmin();
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as { role?: unknown; plan?: unknown } | null;

    if (body?.plan !== undefined) {
      const plan = body.plan;
      if (plan !== "plus" && plan !== "free") throw new AdminError("Багц буруу байна.", 400);
      const user = await client.users.updateUserMetadata(id, {
        publicMetadata: { plan: plan === "plus" ? "plus" : null },
      });
      forgetPlan(id);
      return NextResponse.json({ user: toAdminUser(user) });
    }

    const role = body?.role;
    if (role !== "admin" && role !== "user") throw new AdminError("Эрх буруу байна.", 400);
    // Сүүлийн админ өөрийгөө хасвал хэн ч админ хуудсанд орж чадахгүй болно
    if (id === userId && role !== "admin") throw new AdminError("Өөрийнхөө админ эрхийг хасах боломжгүй.", 400);

    // null нь publicMetadata-аас role-ийг устгана (энгийн хэрэглэгч)
    const user = await client.users.updateUserMetadata(id, {
      publicMetadata: { role: role === "admin" ? "admin" : null },
    });
    forgetPlan(id);
    return NextResponse.json({ user: toAdminUser(user) });
  } catch (err) {
    return adminErrorResponse(err);
  }
}
