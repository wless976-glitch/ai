import type { ReactNode } from "react";
import { IconLock } from "./icons";
import { ButtonLink, cn } from "./ui";

/** Жижиг "PLUS" шошго — Plus-д нээлттэй боломжийн хажууд */
export function PlusBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full bg-ink px-1.5 py-px font-mono text-[9.5px] font-medium uppercase tracking-[0.12em] text-lime ring-1 ring-inset ring-white/10",
        className,
      )}
    >
      Plus
    </span>
  );
}

/** Үнэгүй багцад түгжигдсэн боломжийн оронд харагдах самбар */
export function PlusLock({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: ReactNode;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className="relative">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-ink text-lime ring-1 ring-white/10">
          <IconLock className="size-5" />
        </div>
        <PlusBadge className="absolute -right-4 -top-2" />
      </div>
      <h3 className="mt-4 font-medium tracking-[-0.01em] text-zinc-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{description}</p>
      {children}
      <ButtonLink href="/dashboard/plan" className="mt-5">
        Plus-ийн тухай
      </ButtonLink>
    </div>
  );
}
