"use client";

import Link from "next/link";
import type { AiIssue } from "@/lib/ai-models";
import { useStore } from "@/lib/store";
import { IconAlert, IconArrowRight } from "./icons";
import { buttonClass, Card } from "./ui";

/** AI холбогдоогүй эсвэл кредит/токены асуудалтай үед AI хэрэгслүүдийн дээр харуулна */
export function AiConnectNotice({ className }: { className?: string }) {
  const { ai } = useStore();
  if (!ai) return null;
  if (!ai.connected) return <Notice className={className} />;
  if (ai.issue) return <Notice issue={ai.issue} className={className} />;
  return null;
}

function Notice({ issue, className }: { issue?: AiIssue; className?: string }) {
  return (
    <Card className={`mb-6 flex flex-col gap-4 bg-amber-50/60 p-5 ring-amber-200 sm:flex-row sm:items-center ${className ?? ""}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
        <IconAlert className="size-5" />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {issue === "no_credits" ? (
          <>
            <p className="font-semibold text-zinc-900">Hugging Face кредит дууссан байна</p>
            <p className="mt-0.5 text-zinc-600">
              Кредит нэмэх хүртэл AI хэрэгслүүд ажиллахгүй. huggingface.co/settings/billing хуудаснаас шалгана уу.
            </p>
          </>
        ) : issue === "bad_token" ? (
          <>
            <p className="font-semibold text-zinc-900">Hugging Face токен ажиллахгүй байна</p>
            <p className="mt-0.5 text-zinc-600">
              Токен буруу эсвэл &ldquo;Make calls to Inference Providers&rdquo; эрхгүй байна.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-zinc-900">Hugging Face холбогдоогүй байна</p>
            <p className="mt-0.5 text-zinc-600">
              Хэрэгслүүд ажиллахын тулд{" "}
              <code className="rounded bg-surface px-1 py-0.5 text-[12px] ring-1 ring-zinc-200">train/.env.local</code>{" "}
              файлд <code className="rounded bg-surface px-1 py-0.5 text-[12px] ring-1 ring-zinc-200">HF_TOKEN=hf_…</code>{" "}
              нэмнэ үү.
            </p>
          </>
        )}
      </div>
      <Link href="/dashboard/settings#ai" className={buttonClass("secondary", "sm")}>
        Заавар харах <IconArrowRight className="size-4" />
      </Link>
    </Card>
  );
}
