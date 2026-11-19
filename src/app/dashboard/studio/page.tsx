import type { Metadata } from "next";
import { StudioView } from "./view";

export const metadata: Metadata = { title: "AI студи" };

export default function StudioPage() {
  return <StudioView />;
}
