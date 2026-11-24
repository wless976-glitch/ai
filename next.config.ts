import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Урьдчилсан render-ийн "өнөөдөр" (src/lib/today.ts) — browser-т ачаалагдмагц бодит огноо руу шилжинэ
  env: {
    BUILD_DATE: new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ulaanbaatar" }),
  },
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  // Тусдаа нүүр хуудас байхгүй — сайтыг нээхэд шууд "AI-аас асуух" чат руу орно
  async redirects() {
    return [{ source: "/", destination: "/dashboard/ask", permanent: false }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
