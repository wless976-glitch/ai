import type { Metadata } from "next";
import { AskScreen } from "./view";

export const metadata: Metadata = { title: "AI-аас асуух" };

export default function AskPage() {
  return <AskScreen />;
}
