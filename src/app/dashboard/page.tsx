import type { Metadata } from "next";
import { DashboardView } from "./view";

export const metadata: Metadata = { title: "Хянах самбар" };

export default function DashboardPage() {
  return <DashboardView />;
}
