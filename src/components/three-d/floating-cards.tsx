"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { IconCheck, IconPencil, IconRocket, IconSparkles, IconUsers } from "../icons";
import { PostVisual } from "../post-visual";
import { Badge, buttonClass, cn, PlatformIcons } from "../ui";
import "./three-d.css";

/**
 * В хувилбар — "Хөвөгч 3D картууд": бүтээгдэхүүний өөрийн дэлгэцүүд (пост, лайк, хүрэлт)
 * гүнзгий давхаргаар хөвж, хулганаар бүхэлдээ хазайна. Ард нь урсаж буй 3D тор шал.
 * WebGL шаардахгүй — зөвхөн CSS 3D transform.
 */
export function GridFloorBackground({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden bg-white", className)} aria-hidden="true">
      <div className="absolute -right-32 -top-40 size-[560px] rounded-full bg-brand-200/50 blur-3xl" />
      <div className="absolute -left-40 top-24 size-[420px] rounded-full bg-violet-200/40 blur-3xl" />
      <div className="absolute bottom-10 right-1/4 size-[320px] rounded-full bg-amber-100/60 blur-3xl" />
      <div
        className="absolute inset-x-0 bottom-0 h-[62%] [mask-image:linear-gradient(to_top,black_15%,transparent_85%)]"
        style={{ perspective: "520px" }}
      >
        <div
          className="grid-floor absolute -inset-x-1/2 bottom-0 top-0 origin-bottom"
          style={{ transform: "rotateX(64deg)" }}
        />
      </div>
    </div>
  );
}

function Floating({
  z,
  delay = 0,
  className,
  children,
}: {
  z: number;
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("float-3d absolute [transform-style:preserve-3d]", className)}
      style={{ "--z": `${z}px`, "--delay": `${delay}s` } as CSSProperties}
    >
      {children}
    </div>
  );
}

export function FloatingCardsMock() {
  const sceneRef = useRef<HTMLDivElement>(null);

  // Хулганы байрлалаар бүх үзэгдлийг хазайлгана (React state ашиглахгүй — CSS хувьсагч шууд солино)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth) * 2 - 1;
        const y = (e.clientY / window.innerHeight) * 2 - 1;
        scene.style.setProperty("--rx", `${8 - y * 7}deg`);
        scene.style.setProperty("--ry", `${-14 + x * 12}deg`);
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="relative mx-auto h-[440px] w-full max-w-md sm:h-[480px]" style={{ perspective: "1100px" }}>
      <div
        ref={sceneRef}
        className="relative size-full transition-transform duration-500 ease-out [transform-style:preserve-3d]"
        style={
          {
            "--rx": "8deg",
            "--ry": "-14deg",
            transform: "rotateX(var(--rx)) rotateY(var(--ry))",
          } as CSSProperties
        }
      >
        {/* Ард талын Instagram пост */}
        <Floating z={-110} delay={1.2} className="right-[-12%] top-[10%] w-44 opacity-90">
          <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-zinc-200">
            <PostVisual visual={{ preset: 5, emoji: "🍰", headline: "Шинэ чийзкейк" }} className="aspect-square" />
            <div className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-zinc-500">
              <PlatformIcons platforms={["instagram"]} /> Нийтлэгдсэн
            </div>
          </div>
        </Floating>

        {/* Гол пост — батлах хүлээгдэж буй */}
        <Floating z={30} className="left-[6%] top-[8%] w-[80%]">
          <div className="rounded-3xl bg-white p-3.5 shadow-2xl shadow-brand-900/15 ring-1 ring-zinc-200">
            <div className="flex items-center justify-between px-1 pb-2.5">
              <p className="text-sm font-semibold text-zinc-900">Батлах хүлээгдэж буй</p>
              <Badge tone="violet">
                <IconSparkles className="size-3" /> AI бэлдсэн
              </Badge>
            </div>
            <div className="overflow-hidden rounded-2xl ring-1 ring-zinc-200">
              <PostVisual visual={{ preset: 2, emoji: "❄️", headline: "Өвлийн дулаахан ундаа" }} className="aspect-[16/10]" />
              <div className="p-3.5">
                <div className="flex items-center gap-2 text-xs text-zinc-500">
                  <PlatformIcons platforms={["facebook", "instagram"]} />
                  Лхагва · 19:00
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-zinc-700">
                  Гадаа −20°C байхад танд юу хэрэгтэй вэ? ❄️ Мэдээж дулаахан ундаа!
                </p>
                <div className="mt-3 flex gap-2">
                  <span className={buttonClass("success", "sm", "flex-1")}>
                    <IconCheck className="size-4" /> Батлах
                  </span>
                  <span className={buttonClass("secondary", "sm", "flex-1")}>
                    <IconPencil className="size-4" /> Засах
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Floating>

        {/* AI бичиж байна */}
        <Floating z={110} delay={0.6} className="-left-[4%] top-[1%]">
          <div className="flex items-center gap-2 rounded-full bg-violet-600 px-3.5 py-2 text-xs font-medium text-white shadow-xl shadow-violet-900/25">
            <IconSparkles className="size-3.5" /> AI бичиж байна
            <span className="flex gap-0.5" aria-hidden="true">
              {[0, 0.2, 0.4].map((d) => (
                <span key={d} className="typing-dot size-1 rounded-full bg-white" style={{ animationDelay: `${d}s` }} />
              ))}
            </span>
          </div>
        </Floating>

        {/* Лайк, сэтгэгдэл */}
        <Floating z={150} delay={1.8} className="right-[-4%] top-[30%]">
          <div className="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-2.5 text-sm font-semibold text-zinc-800 shadow-xl ring-1 ring-zinc-200">
            <span className="flex items-center gap-1">❤️ 1.2K</span>
            <span className="flex items-center gap-1">💬 86</span>
            <span className="flex items-center gap-1">↗ 41</span>
          </div>
        </Floating>

        {/* Шинэ дагагч */}
        <Floating z={90} delay={2.4} className="-left-[8%] bottom-[16%]">
          <div className="flex items-center gap-2.5 rounded-2xl bg-white px-3.5 py-2.5 shadow-xl ring-1 ring-zinc-200">
            <span className="flex -space-x-2">
              {["bg-amber-300", "bg-sky-300", "bg-rose-300"].map((c) => (
                <span key={c} className={cn("size-6 rounded-full ring-2 ring-white", c)} />
              ))}
            </span>
            <span>
              <span className="flex items-center gap-1 text-sm font-semibold text-zinc-900">
                <IconUsers className="size-3.5 text-brand-600" /> +42
              </span>
              <span className="block text-[11px] text-zinc-500">шинэ дагагч</span>
            </span>
          </div>
        </Floating>

        {/* Хүрэлт + жижиг график */}
        <Floating z={170} delay={0.9} className="bottom-[2%] right-[-6%] w-48">
          <div className="rounded-2xl bg-zinc-900 p-3.5 text-white shadow-2xl">
            <p className="flex items-center gap-1.5 text-[11px] text-zinc-400">
              <IconRocket className="size-3.5" /> 7 хоногийн хүрэлт
            </p>
            <p className="mt-0.5 text-xl font-semibold tabular-nums">12,480</p>
            <svg viewBox="0 0 120 32" className="mt-1 h-8 w-full" aria-hidden="true">
              <defs>
                <linearGradient id="reach-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#45bca8" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#45bca8" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 26 L15 22 L30 24 L45 16 L60 18 L75 10 L90 12 L105 5 L120 3 L120 32 L0 32Z" fill="url(#reach-fill)" />
              <path
                d="M0 26 L15 22 L30 24 L45 16 L60 18 L75 10 L90 12 L105 5 L120 3"
                fill="none"
                stroke="#7bd7c5"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-[11px] font-medium text-emerald-400">▲ 18% өмнөх 7 хоногоос</p>
          </div>
        </Floating>
      </div>
    </div>
  );
}
