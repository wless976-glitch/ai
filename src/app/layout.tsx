import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { clerkLocalization } from "@/lib/clerk-localization";
import "./globals.css";

// Үндсэн фонт (grotesk) болон жижиг шошго (mono).
// Монгол кирилл (Ө, Ү) нь cyrillic-ext дотор байдаг.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});

/**
 * Hydration-оос өмнө (анивчихгүйн тулд) өнгөний горимыг тавина: хадгалсан сонголт, байхгүй бол
 * системийн тохиргоо → <html data-theme>. Сонголтыг src/lib/theme.ts хадгална.
 * Мөн хураасан хажуу цэс (data-sidebar), "Өдөр тутам" горимыг (data-daily) сэргээнэ — горимыг эхлээд
 * хуудасны замаар (чат → Яриа, хянах самбар/пост/хуанли/үр дүн → Өдөр тутам), бусад үед сүүлд
 * сонгосноор (анхдагч нь Өдөр тутам). Дүрэм нь src/lib/sidebar.ts-ийн modeForPath-тай ижил.
 */
const THEME_SCRIPT = `try{var t=localStorage.getItem("tg-theme"),d=document.documentElement.dataset,p=location.pathname,m=localStorage.getItem("tg-mode")==="chat"?"chat":"daily";d.theme=t==="dark"||(t!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";if(localStorage.getItem("tg-sidebar")==="collapsed")d.sidebar="collapsed";if(p.indexOf("/dashboard/ask")===0)m="chat";else if(p==="/dashboard"||/^\\/dashboard\\/(create|calendar|analytics)(\\/|$)/.test(p))m="daily";if(m==="daily")d.daily="on"}catch(e){}`;

export const metadata: Metadata = {
  title: {
    default: "Түгээ — ЖДҮ-д зориулсан AI маркетинг туслах",
    template: "%s · Түгээ",
  },
  description:
    "Facebook, Instagram-д тогтмол пост бэлдэж, баталгаажуулж нийтлээд, үр дүнг нь хянадаг AI туслах. Тест хувилбар.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="mn"
      className={`${geist.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans">
        <ClerkProvider localization={clerkLocalization}>{children}</ClerkProvider>
      </body>
    </html>
  );
}
