import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentType, ReactNode, SVGProps } from "react";
import type { Platform, PostStatus } from "@/lib/types";
import { PLATFORM_LABELS, STATUS_LABELS } from "@/lib/types";
import { IconFacebook, IconInstagram } from "./icons";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success" | "dark";
type Size = "sm" | "md" | "lg";

/** Нүүр хуудастай ижил: бүх товч бөөрөнхий (pill), үндсэн товч нь тод lime + бараан бичиг */
const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-lime text-ink shadow-[inset_0_1px_0_rgb(255_255_255/0.45),inset_0_-1px_0_rgb(0_0_0/0.08),0_6px_16px_-10px_rgb(122_138_14/0.7)] hover:bg-lime-hover",
  secondary:
    "bg-surface text-zinc-800 shadow-xs ring-1 ring-zinc-900/10 hover:bg-zinc-50 hover:ring-zinc-900/15 dark:bg-zinc-50 dark:hover:bg-zinc-100",
  ghost: "text-zinc-600 hover:bg-zinc-900/[0.05] hover:text-zinc-900",
  danger: "bg-surface text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50",
  success: "bg-[#059669] text-white shadow-sm shadow-black/15 hover:bg-[#047857]",
  dark: "bg-zinc-900 text-zinc-50 shadow-xs hover:bg-zinc-800",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3.5 text-[13px]",
  md: "h-10 gap-2 px-4.5 text-sm",
  lg: "h-12 gap-2 px-6 text-[15px]",
};

const BUTTON_BASE =
  "inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-full font-medium tracking-[-0.01em] transition-all duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-50";

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(BUTTON_BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export function Card({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <div id={id} className={cn("rounded-2xl bg-surface shadow-card ring-1 ring-zinc-900/[0.07]", className)}>
      {children}
    </div>
  );
}

/** Жижиг, бүгд том үсгээр, тэлсэн зайтай mono шошго (нүүр хуудасны хэв маяг) */
export function MonoLabel({ className, children }: { className?: string; children: ReactNode }) {
  return <span className={cn("font-mono text-[11px] uppercase tracking-[0.14em]", className)}>{children}</span>;
}

export function CardHeader({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
      {/* Нарийн дэлгэцэнд action (жишээ нь сонголт) гарчгийн доор шилжинэ */}
      <div className="flex min-w-0 flex-[1_1_14rem] items-start gap-2.5">
        {Icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
            <Icon className="size-[17px]" />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-medium tracking-[-0.01em] text-zinc-900">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] text-zinc-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

type Tone = "zinc" | "brand" | "amber" | "emerald" | "rose" | "sky" | "violet";
const TONES: Record<Tone, string> = {
  zinc: "bg-zinc-100 text-zinc-700",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70",
  amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200/70",
  emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200/70",
  rose: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200/70",
  sky: "bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-200/70",
  violet: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200/70",
};

export function Badge({ tone = "zinc", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<PostStatus, Tone> = {
  pending: "amber",
  scheduled: "brand",
  published: "emerald",
  rejected: "rose",
};

export function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <Badge tone={STATUS_TONES[status]}>
      <span className="size-1.5 rounded-full bg-current opacity-70" />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function PlatformIcon({ platform, className }: { platform: Platform; className?: string }) {
  if (platform === "facebook") {
    return (
      <span
        title={PLATFORM_LABELS.facebook}
        className={cn("inline-flex size-6 items-center justify-center rounded-full bg-fb text-white", className)}
      >
        <IconFacebook className="size-3.5" />
      </span>
    );
  }
  return (
    <span
      title={PLATFORM_LABELS.instagram}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-full bg-linear-to-tr from-amber-400 via-ig to-violet-600 text-white",
        className,
      )}
    >
      <IconInstagram className="size-3.5" />
    </span>
  );
}

export function PlatformIcons({ platforms, className }: { platforms: Platform[]; className?: string }) {
  return (
    <span className={cn("inline-flex -space-x-1.5", className)}>
      {platforms.map((p) => (
        <PlatformIcon key={p} platform={p} className="ring-2 ring-surface" />
      ))}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[28px] font-medium leading-tight tracking-[-0.035em] text-zinc-900 sm:text-[34px]">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Progress({ value, className, tone = "brand" }: { value: number; className?: string; tone?: "brand" | "amber" }) {
  return (
    <div className={cn("h-2 overflow-hidden rounded-full bg-zinc-900/[0.06]", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all duration-500",
          tone === "brand" ? "bg-linear-to-r from-brand-400 to-lime" : "bg-amber-400",
        )}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-zinc-900 dark:bg-lime" : "bg-zinc-300",
      )}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full shadow-sm transition-[transform,background-color]",
          checked ? "translate-x-[22px] bg-lime dark:bg-ink" : "translate-x-0.5 bg-white",
        )}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn("inline-flex flex-wrap gap-1 rounded-full bg-zinc-900/[0.05] p-1 ring-1 ring-inset ring-zinc-900/[0.04]", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-500",
            value === o.value
              ? "bg-zinc-900 text-zinc-50 shadow-sm"
              : "text-zinc-500 hover:bg-surface/70 hover:text-zinc-900",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-200/60">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 font-medium tracking-[-0.01em] text-zinc-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const inputClass =
  "w-full rounded-xl border-0 bg-surface px-3 py-2 text-sm text-zinc-900 shadow-xs ring-1 ring-zinc-900/10 transition-shadow placeholder:text-zinc-400 hover:ring-zinc-900/20 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-zinc-50";

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-zinc-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}
