import type { Metadata } from "next";
import { CreateView } from "./view";

export const metadata: Metadata = { title: "Пост бэлдэх" };

export default function CreatePage() {
  return <CreateView />;
}
