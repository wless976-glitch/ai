import type { Metadata } from "next";
import { VideoStudioView } from "./view";

export const metadata: Metadata = { title: "Видео студи" };

export default function VideoStudioPage() {
  return <VideoStudioView />;
}
