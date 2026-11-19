import type { PostVisual as Visual } from "@/lib/types";
import { cn } from "./ui";

/** Tailwind ангиудыг бүтнээр нь бичсэн байх ёстой (динамикаар угсрахгүй) */
const PRESETS = [
  "from-amber-200 via-orange-100 to-rose-200",
  "from-teal-200 via-emerald-100 to-lime-100",
  "from-sky-200 via-indigo-100 to-violet-200",
  "from-rose-200 via-pink-100 to-amber-100",
  "from-stone-300 via-amber-100 to-orange-100",
  "from-violet-200 via-fuchsia-100 to-sky-100",
];

export function PostVisual({
  visual,
  size = "md",
  className,
}: {
  visual: Visual;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  // className-д хэмжээ/харьцаа өгсөн бол default aspect-square-ийг хэрэглэхгүй (class зөрчлөөс сэргийлнэ)
  const custom = /(^|\s)(sm:|md:)?(aspect-|size-)/.test(className ?? "");

  if (visual.videoUrl || visual.imageUrl) {
    return (
      <div className={cn("theme-light relative overflow-hidden bg-zinc-100", !custom && "aspect-square", className)}>
        {visual.videoUrl ? (
          <video
            src={visual.videoUrl}
            muted
            loop
            autoPlay
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          // blob: URL тул next/image-ийн optimization хэрэггүй
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visual.imageUrl} alt={visual.headline} className="absolute inset-0 size-full object-cover" />
        )}
        {visual.videoUrl && size !== "xs" && (
          <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            ▶ Видео
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "theme-light relative flex flex-col items-center justify-center overflow-hidden bg-linear-to-br text-center",
        !custom && "aspect-square",
        PRESETS[visual.preset % PRESETS.length],
        className,
      )}
    >
      <span className={size === "xs" ? "text-lg" : size === "sm" ? "text-3xl" : "text-5xl"}>{visual.emoji}</span>
      {/* Видео пост — видео нь хараахан нэмэгдээгүй ч ▶ тэмдэгээр ялгана */}
      {visual.video &&
        (size === "xs" ? (
          <span className="absolute bottom-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-black/60 text-[8px] text-white">
            ▶
          </span>
        ) : (
          <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
            ▶ Видео
          </span>
        ))}
      {size === "md" && (
        <>
          <p className="mt-3 max-w-[80%] text-balance text-lg font-semibold leading-snug text-zinc-800">
            {visual.headline}
          </p>
          <span className="absolute bottom-2 right-2 rounded bg-white/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
            Жишээ зураг
          </span>
        </>
      )}
    </div>
  );
}
