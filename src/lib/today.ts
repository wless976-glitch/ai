import { useSyncExternalStore } from "react";
import { toDateStr } from "./format";

/**
 * "Өнөөдөр" — хэрэглэгчийн төхөөрөмжийн бодит огноо (YYYY-MM-DD).
 *
 * Хуудсууд build хийх үед урьдчилан render хийгддэг (Cache Components). Тэр үед new Date() дуудвал
 * алдаа гарах тул серверийн render нь build хийсэн өдрийг (next.config.ts → BUILD_DATE) ашиглаж,
 * browser-т ачаалагдмагц бодит өнөөдөр рүү шилжинэ (store.tsx-ийн localStorage өгөгдөлтэй ижил загвар).
 */
const SERVER_TODAY = process.env.BUILD_DATE || "2026-01-01";

/** Browser-т л дуудна (товч дарах үед гэх мэт) — render дотор useToday() ашигла */
export function getToday() {
  const d = new Date();
  return toDateStr(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/** Шөнө дундыг давж нээлттэй байсан tab ч өдрөө шинэчилнэ */
function subscribe(onChange: () => void) {
  const timer = window.setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onChange);
  };
}

export function useToday() {
  return useSyncExternalStore(subscribe, getToday, () => SERVER_TODAY);
}
