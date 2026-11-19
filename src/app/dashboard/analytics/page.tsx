import type { Metadata } from "next";
import { AnalyticsView } from "./view";

export const metadata: Metadata = { title: "Үр дүн & Boost" };

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
