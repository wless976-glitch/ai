import type { Metadata } from "next";
import { AdminGate } from "./gate";
import { AdminOverview } from "./view";

export const metadata: Metadata = { title: "Админ самбар" };

export default function AdminPage() {
  // Эрхийн шалгалт хуудас бүр дотор (layout биш) — Next-ийн instant navigation шалгалт хуудсыг үзэж чадна
  return (
    <AdminGate>
      <AdminOverview />
    </AdminGate>
  );
}
