"use client";

import { useState } from "react";
import type { Platform, PostVisual as Visual } from "@/lib/types";
import {
  IconBookmark,
  IconFacebook,
  IconGlobe,
  IconHeart,
  IconInstagram,
  IconMessage,
  IconSend,
  IconShare,
  IconThumb,
} from "./icons";
import { PostVisual } from "./post-visual";
import { cn } from "./ui";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PostPreview({
  caption,
  hashtags,
  visual,
  platforms,
  businessName: rawName,
  handle: rawHandle,
}: {
  caption: string;
  hashtags: string[];
  visual: Visual;
  platforms: Platform[];
  businessName: string;
  handle: string;
}) {
  // Бизнесийн нэр бөглөөгүй бол урьдчилан харахад ерөнхий нэр
  const businessName = rawName || "Таны бизнес";
  const handle = rawHandle || "tanii.biznes";
  const [tab, setTab] = useState<Platform>(platforms[0] ?? "facebook");
  const active = platforms.includes(tab) ? tab : (platforms[0] ?? "facebook");

  return (
    <div>
      {platforms.length > 1 && (
        <div className="mb-3 inline-flex gap-1 rounded-xl bg-zinc-100 p-1">
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setTab(p)}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium",
                active === p ? "bg-surface text-zinc-900 shadow-xs" : "text-zinc-500 hover:text-zinc-800",
              )}
            >
              {p === "facebook" ? <IconFacebook className="size-3.5" /> : <IconInstagram className="size-3.5" />}
              {p === "facebook" ? "Facebook" : "Instagram"}
            </button>
          ))}
        </div>
      )}

      {visual.video ? (
        <ReelPreview
          caption={caption}
          hashtags={hashtags}
          visual={visual}
          platform={active}
          name={active === "facebook" ? businessName : handle}
          initials={initials(businessName)}
        />
      ) : active === "facebook" ? (
        <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-zinc-200">
          <div className="flex items-center gap-2.5 px-3.5 pt-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-ink text-xs font-bold text-lime">
              {initials(businessName)}
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-semibold text-zinc-900">{businessName}</p>
              <p className="flex items-center gap-1 text-[11px] text-zinc-500">
                Хуваарьт · <IconGlobe className="size-3" />
              </p>
            </div>
          </div>
          <p className="whitespace-pre-line px-3.5 py-2.5 text-[13px] leading-relaxed text-zinc-800">
            {caption}
            {hashtags.length > 0 && <span className="mt-1 block text-fb">{hashtags.join(" ")}</span>}
          </p>
          <PostVisual visual={visual} />
          <div className="flex items-center justify-between px-3.5 py-2 text-[11px] text-zinc-500">
            <span>👍❤️ 0</span>
            <span>0 сэтгэгдэл</span>
          </div>
          <div className="mx-3.5 grid grid-cols-3 border-t border-zinc-200 py-1 text-[12px] font-medium text-zinc-500">
            <span className="flex items-center justify-center gap-1.5 py-1.5">
              <IconThumb className="size-4" /> Таалагдлаа
            </span>
            <span className="flex items-center justify-center gap-1.5 py-1.5">
              <IconMessage className="size-4" /> Сэтгэгдэл
            </span>
            <span className="flex items-center justify-center gap-1.5 py-1.5">
              <IconShare className="size-4" /> Хуваалцах
            </span>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-zinc-200">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="rounded-full bg-linear-to-tr from-amber-400 via-ig to-violet-600 p-[2px]">
              <div className="flex size-7 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-lime ring-2 ring-surface">
                {initials(businessName)}
              </div>
            </div>
            <p className="text-[13px] font-semibold text-zinc-900">{handle}</p>
          </div>
          <PostVisual visual={visual} />
          <div className="flex items-center gap-3.5 px-3 pt-2.5 text-zinc-800">
            <IconHeart className="size-5" />
            <IconMessage className="size-5" />
            <IconSend className="size-5" />
            <IconBookmark className="ml-auto size-5" />
          </div>
          <p className="whitespace-pre-line px-3 pb-3 pt-2 text-[13px] leading-relaxed text-zinc-800">
            <span className="font-semibold">{handle}</span> {caption}
            {hashtags.length > 0 && <span className="mt-1 block text-[#00376b] dark:text-[#8ab4f8]">{hashtags.join(" ")}</span>}
          </p>
        </div>
      )}
    </div>
  );
}

/** Reels (босоо 9:16) — Facebook, Instagram-д ижил төстэй: видео дээр текст, баруун талд үйлдлүүд */
function ReelPreview({
  caption,
  hashtags,
  visual,
  platform,
  name,
  initials,
}: {
  caption: string;
  hashtags: string[];
  visual: Visual;
  platform: Platform;
  name: string;
  initials: string;
}) {
  return (
    <div className="theme-light relative mx-auto aspect-[9/16] w-full max-w-[280px] overflow-hidden rounded-2xl bg-black ring-1 ring-zinc-200">
      <PostVisual visual={{ ...visual, video: false }} className="absolute inset-0 size-full" />
      {/* Цайвар жишээ дүрс дээр ч цагаан бичиг, дүрс уншигдахын тулд дээд талд бараан туяа */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-20 bg-linear-to-b from-black/50 to-transparent" />
      <div aria-hidden="true" className="absolute bottom-16 right-0 h-48 w-16 bg-linear-to-l from-black/35 to-transparent" />
      {!visual.videoUrl && (
        <span className="absolute right-3 top-3 rounded-full bg-black/55 px-2 py-0.5 text-[10.5px] font-medium text-white">
          Жишээ дүрс · видео нэмээгүй
        </span>
      )}
      <span className="absolute left-3 top-3 flex items-center gap-1.5 text-[13px] font-semibold text-white drop-shadow">
        {platform === "facebook" ? <IconFacebook className="size-4" /> : <IconInstagram className="size-4" />} Reels
      </span>
      <div className="absolute bottom-24 right-2.5 flex flex-col items-center gap-4 text-white drop-shadow">
        <IconHeart className="size-6" />
        <IconMessage className="size-6" />
        <IconSend className="size-6" />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/80 via-black/40 to-transparent px-3 pb-3 pt-12 text-white">
        <p className="flex items-center gap-2 text-[13px] font-semibold">
          <span className="flex size-7 items-center justify-center rounded-full bg-ink text-[10px] font-bold text-lime ring-2 ring-white/80">
            {initials}
          </span>
          {name}
        </p>
        <p className="mt-1.5 line-clamp-3 whitespace-pre-line pr-8 text-[12px] leading-snug text-white/90">
          {caption}
          {hashtags.length > 0 && <span className="text-white/70"> {hashtags.join(" ")}</span>}
        </p>
      </div>
    </div>
  );
}
