/**
 * Хэрэглэгчийн эрх. Clerk-ийн publicMetadata.role дээр хадгална:
 * { "role": "admin" } бол админ, бусад бүх тохиолдолд энгийн хэрэглэгч.
 * publicMetadata-г зөвхөн сервер (эсвэл Clerk Dashboard) өөрчилж чадна — хэрэглэгч өөрөө биш.
 */
import type { Plan } from "./plan";

export type Role = "admin" | "user";

export const ROLE_LABELS: Record<Role, string> = { admin: "Админ", user: "Хэрэглэгч" };

export function roleOf(publicMetadata: Record<string, unknown> | null | undefined): Role {
  return publicMetadata?.role === "admin" ? "admin" : "user";
}

/** Админ хуудсанд харуулах хэрэглэгчийн мэдээлэл (Clerk-ийн User-ээс хэрэгтэй хэсэг нь) */
export interface AdminUser {
  id: string;
  name: string;
  email: string | null;
  imageUrl: string;
  role: Role;
  /** Тусгайлан олгосон багц (админ бол үүнээс үл хамааран Plus) */
  plan: Plan;
  createdAt: number;
  lastSignInAt: number | null;
  lastActiveAt: number | null;
  banned: boolean;
}

export interface AdminUserList {
  users: AdminUser[];
  /** Clerk дээрх нийт хэрэглэгч (users нь эхний 100 байж болно) */
  total: number;
  /** Одоо нэвтэрсэн админы id */
  me: string;
}
