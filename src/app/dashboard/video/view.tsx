"use client";

import { useCallback, useEffect, useState } from "react";
import { AiConnectNotice } from "@/components/ai-connect-notice";
import { StartOverButton } from "@/components/composer";
import { PlusLock } from "@/components/plus";
import { Card, PageHeader } from "@/components/ui";
import { fetchPlanUsage } from "@/lib/ai-client";
import type { PlanUsage } from "@/lib/plan";
import { usePlan } from "@/lib/use-plan";
import { ReelTool } from "../studio/reel-tool";
import { Studio } from "../studio/shared";

const SUBTITLE =
  "Ганц асуултаас эхлэл, баримт, эргэлт, төгсгөлтэй Reels түүх — хадмал, хөгжим, монгол хоолойтой. Гарсан видеог MP4 болгож татах эсвэл шууд пост болгоно.";

/**
 * Видео студи — AI студийн «Текст → Видео · Reels»-ийг тусдаа хуудсанд, шууд нээгддэгээр.
 * Хэрэгсэл нь өөрөө (сценари, загвар, монгол хоолой, тоглуулагч) studio/reel-tool.tsx-д.
 */
export function VideoStudioView() {
  const { locked, isLoaded } = usePlan();
  // "Шинээр эхлэх" — key-г өөрчилж бүх төлөвийг цэвэрлэнэ
  const [reset, setReset] = useState(0);
  const [usage, setUsage] = useState<PlanUsage | null>(null);

  const refreshUsage = useCallback(() => {
    fetchPlanUsage().then(setUsage, () => {});
  }, []);

  useEffect(() => {
    if (isLoaded && locked) refreshUsage();
  }, [isLoaded, locked, refreshUsage]);

  const header = (
    <>
      <StartOverButton onClick={() => setReset((r) => r + 1)} />
      <p className="mt-3 text-sm text-zinc-500">{SUBTITLE}</p>
    </>
  );

  return (
    <Studio.Provider value={{ header, usage, refreshUsage }}>
      <PageHeader
        title="Видео студи"
        description="Юу хэлмээр байгаагаа нэг өгүүлбэрээр бичээд загвараа сонго — AI түүх бичиж, монгол хоолойгоор уншуулаад 9:16 видео болгоно."
      />

      <AiConnectNotice />

      {locked ? (
        <Card className="p-4 sm:p-6">
          {header}
          <PlusLock
            className="mt-4 rounded-2xl bg-zinc-900/[0.03] ring-1 ring-inset ring-zinc-900/[0.05]"
            title="Видео студи — Plus багцад"
            description="Видео үүсгэх нь хамгийн их AI нөөц зарцуулдаг тул зөвхөн Plus багцад нээлттэй. Үнэгүй багцад AI студийн Текст бичих, Зураг → Текст хэрэгслийг ашиглаж болно."
          />
        </Card>
      ) : (
        <ReelTool key={reset} modeSwitch={null} />
      )}
    </Studio.Provider>
  );
}
