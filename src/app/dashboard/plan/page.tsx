import type { Metadata } from "next";
import { PlanView } from "./view";

export const metadata: Metadata = { title: "Багц" };

export default function PlanPage() {
  return <PlanView />;
}
