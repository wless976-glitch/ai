import type { Metadata } from "next";
import { GuidesView } from "./view";

export const metadata: Metadata = { title: "Заавар" };

export default function GuidesPage() {
  return <GuidesView />;
}
