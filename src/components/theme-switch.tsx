"use client";

import { setThemePref, type ThemePref, useThemePref } from "@/lib/theme";
import { IconMonitor, IconMoon, IconSun } from "./icons";
import { cn } from "./ui";

const THEME_OPTIONS: { value: ThemePref; label: string; icon: typeof IconSun }[] = [
  { value: "light", label: "Цайвар", icon: IconSun },
  { value: "dark", label: "Харанхуй", icon: IconMoon },
  { value: "system", label: "Системийн тохиргоо", icon: IconMonitor },
];

/**
 * Цайвар / харанхуй / систем — профайлын цэсэнд (үргэлж харанхуй дэвсгэр дээр).
 * `inMenu` үед товчнууд role="menuitemradio" (цэсний сумаар шилжих дараалалд орно), арай жижиг.
 */
export function ThemeSwitch({ inMenu }: { inMenu?: boolean }) {
  const pref = useThemePref();
  return (
    <div
      role={inMenu ? "group" : "radiogroup"}
      aria-label="Өнгөний горим"
      className="flex rounded-full bg-white/[0.06] p-0.5 ring-1 ring-inset ring-white/[0.08]"
    >
      {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = pref === value;
        return (
          <button
            key={value}
            type="button"
            role={inMenu ? "menuitemradio" : "radio"}
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setThemePref(value)}
            className={cn(
              "flex cursor-pointer items-center justify-center rounded-full transition-colors",
              inMenu ? "size-6" : "size-7",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-lime",
              active ? "bg-lime text-ink" : "text-white/50 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
