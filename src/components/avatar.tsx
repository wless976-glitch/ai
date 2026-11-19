import { cn } from "./ui";

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join("") || "?"
  );
}

/** Хэрэглэгчийн зураг; байхгүй бол нэрийн эхний үсгүүд lime дэвсгэр дээр */
export function Avatar({ src, name, className }: { src?: string | null; name: string; className?: string }) {
  if (src) {
    return (
      // Clerk-ийн CDN зураг — next/image-ийн remotePatterns тохиргоо шаардахгүйн тулд энгийн img
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" className={cn("shrink-0 rounded-full bg-white/10 object-cover", className)} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-lime text-[11px] font-bold text-ink",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
