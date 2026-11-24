import type { Metadata } from "next";
import { GuidesView } from "./view";

export const metadata: Metadata = { title: "Сургалт" };

export default function GuidesPage() {
  return <GuidesView />;
}
