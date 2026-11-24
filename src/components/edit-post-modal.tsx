"use client";

import { useState } from "react";
import { useToday } from "@/lib/today";
import { useStore } from "@/lib/store";
import type { Platform, Post } from "@/lib/types";
import { Modal } from "./modal";
import { PostPreview } from "./post-preview";
import { Button, Field, inputClass, PlatformIcon, cn } from "./ui";

/** Постыг засах (текст, hashtag, огноо, платформ). key={post.id}-тэй ашиглана. */
export function EditPostModal({
  post,
  onClose,
  onSave,
  saveLabel = "Хадгалах",
}: {
  post: Post;
  onClose: () => void;
  onSave?: (patch: Partial<Post>) => void;
  saveLabel?: string;
}) {
  const { business, connections, updatePost, notify } = useStore();
  const [caption, setCaption] = useState(post.caption);
  const [tags, setTags] = useState(post.hashtags.join(" "));
  const [date, setDate] = useState(post.date);
  const today = useToday();
  const [time, setTime] = useState(post.time);
  const [platforms, setPlatforms] = useState<Platform[]>(post.platforms);

  const hashtags = tags
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => (t.startsWith("#") ? t : `#${t}`));

  // Салгагдсан платформ руу нийтлэх боломжгүй
  const activePlatforms = platforms.filter((p) => connections[p]);
  const dateError = date < today ? "Өнгөрсөн огноо сонгох боломжгүй." : !date ? "Огноо сонгоно уу." : null;
  const canSave = caption.trim().length > 0 && activePlatforms.length > 0 && !dateError && !!time;

  function togglePlatform(p: Platform) {
    if (!connections[p]) return;
    setPlatforms((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function save() {
    if (!canSave) return;
    const patch: Partial<Post> = { caption, hashtags, date, time, platforms: activePlatforms };
    if (onSave) onSave(patch);
    else {
      updatePost(post.id, patch);
      notify("Өөрчлөлт хадгалагдлаа");
    }
    onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Пост засах"
      description={post.aiGenerated ? "AI-ийн бэлдсэн текстийг өөрийнхөөрөө засаж болно." : undefined}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Болих
          </Button>
          <Button onClick={save} disabled={!canSave}>
            {saveLabel}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Field label="Постын текст" htmlFor="edit-caption">
            <textarea
              id="edit-caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={8}
              className={cn(inputClass, "resize-y leading-relaxed")}
            />
            <p className="text-right text-xs text-zinc-400">{caption.length} тэмдэгт</p>
          </Field>
          <Field label="Hashtag" htmlFor="edit-tags" hint="Зайгаар тусгаарлана">
            <input id="edit-tags" value={tags} onChange={(e) => setTags(e.target.value)} className={inputClass} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Огноо" htmlFor="edit-date">
              <input
                id="edit-date"
                type="date"
                min={today}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-invalid={dateError ? true : undefined}
                className={cn(inputClass, "aria-invalid:ring-rose-300")}
              />
              {dateError && <p className="text-xs text-rose-600">{dateError}</p>}
            </Field>
            <Field label="Цаг" htmlFor="edit-time">
              <input
                id="edit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Платформ">
            <div className="flex gap-2">
              {(["facebook", "instagram"] as Platform[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  disabled={!connections[p]}
                  aria-pressed={activePlatforms.includes(p)}
                  title={connections[p] ? undefined : "Тохиргоо хэсэгт холбогдоогүй байна"}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm ring-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    activePlatforms.includes(p)
                      ? "bg-brand-50 font-medium text-zinc-900 ring-brand-300"
                      : "bg-surface text-zinc-500 ring-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  <PlatformIcon platform={p} className="size-5" />
                  {p === "facebook" ? "Facebook" : "Instagram"}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="w-full max-w-sm">
          <p className="mb-2 text-[13px] font-medium text-zinc-700">Урьдчилан харах</p>
          <PostPreview
            caption={caption}
            hashtags={hashtags}
            visual={post.visual}
            platforms={activePlatforms.length ? activePlatforms : post.platforms}
            businessName={business.name}
            handle={business.handle}
          />
        </div>
      </div>
    </Modal>
  );
}
