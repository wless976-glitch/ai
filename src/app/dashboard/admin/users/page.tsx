import type { Metadata } from "next";
import { AdminGate } from "../gate";
import { AdminUsersView } from "./view";

export const metadata: Metadata = { title: "Хэрэглэгчид, эрх" };

export default function AdminUsersPage() {
  // Эрхийн шалгалт хуудас бүр дотор (layout биш) — Next-ийн instant navigation шалгалт хуудсыг үзэж чадна
  return (
    <AdminGate>
      <AdminUsersView />
    </AdminGate>
  );
}
