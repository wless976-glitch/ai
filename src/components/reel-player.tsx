"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReelScript, ReelTemplate, ReelTimeline } from "@/lib/reel";
import { drawReel, frameAt, REEL_H, REEL_W, type ReelBrand, type ReelFonts } from "@/lib/reel-render";
import { IconPause, IconPlay, IconRefresh, IconVolume, IconVolumeOff } from "./icons";
import { cn } from "./ui";

/** Нэг Reels-ийг зурах, тоглуулахад хэрэгтэй бүх зүйл */
export interface ReelSource {
  script: ReelScript;
  template: ReelTemplate;
  brand: ReelBrand;
  fonts: ReelFonts;
  tl: ReelTimeline;
  /** Хөгжим + эффект + хоолой — урьдчилан бичсэн */
  audio: AudioBuffer;
}

function paint(canvas: HTMLCanvasElement | null, src: ReelSource, t: number) {
  const ctx = canvas?.getContext("2d");
  if (!ctx) return;
  drawReel(ctx, src.template, frameAt(t, src.script, src.tl, src.brand, src.fonts));
}

const fmt = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/** 9:16 урьдчилан харах: тоглуулах/зогсоох, гүйлгэх, дуу хаах */
export function ReelPlayer({ src, className }: { src: ReelSource; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [muted, setMuted] = useState(false);
  const pos = useRef(0);
  const audio = useRef<{ ctx: AudioContext; gain: GainNode } | null>(null);
  const node = useRef<AudioBufferSourceNode | null>(null);
  const startAt = useRef(0);
  const raf = useRef(0);

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    try {
      node.current?.stop();
    } catch {
      // аль хэдийн зогссон
    }
    node.current?.disconnect();
    node.current = null;
  }, []);

  // Шинэ видео (загвар, бичвэр солигдсон) ирэхэд зогсоогоод одоогийн байрлалыг дахин зурна.
  // Эхэнд нь (0 сек) бичвэр дөнгөж гарч эхэлж буй тул нүүр зураг болгож 1.5 секундын кадрыг үзүүлнэ.
  useEffect(() => {
    stop();
    pos.current = Math.min(pos.current, src.tl.total - 0.01);
    paint(canvasRef.current, src, pos.current || Math.min(1.5, src.tl.total));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- гадны (WebAudio) төлөвтэй тааруулна
    setPlaying(false);
    setTime(pos.current);
  }, [src, stop]);

  useEffect(
    () => () => {
      stop();
      audio.current?.ctx.close().catch(() => {});
    },
    [stop],
  );

  useEffect(() => {
    if (audio.current) audio.current.gain.gain.value = muted ? 0 : 1;
  }, [muted]);

  async function play(from = pos.current) {
    if (!audio.current) {
      const ctx = new AudioContext();
      const gain = ctx.createGain();
      gain.gain.value = muted ? 0 : 1;
      gain.connect(ctx.destination);
      audio.current = { ctx, gain };
    }
    const { ctx, gain } = audio.current;
    await ctx.resume();
    stop();
    const start = from >= src.tl.total - 0.05 ? 0 : from;
    const n = ctx.createBufferSource();
    n.buffer = src.audio;
    n.connect(gain);
    const t0 = ctx.currentTime + 0.03;
    n.start(t0, start);
    node.current = n;
    startAt.current = t0 - start;
    setPlaying(true);
    let shown = -1;
    const tick = () => {
      const t = Math.max(0, ctx.currentTime - startAt.current);
      if (t >= src.tl.total) {
        pos.current = src.tl.total - 0.01;
        paint(canvasRef.current, src, pos.current);
        setTime(src.tl.total);
        setPlaying(false);
        stop();
        return;
      }
      paint(canvasRef.current, src, t);
      if (Math.abs(t - shown) > 0.1) {
        shown = t;
        setTime(t);
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }

  function pause() {
    if (audio.current && node.current) pos.current = Math.min(src.tl.total - 0.01, audio.current.ctx.currentTime - startAt.current);
    stop();
    setPlaying(false);
  }

  function seek(t: number) {
    pos.current = t;
    setTime(t);
    if (playing) play(t);
    else paint(canvasRef.current, src, t);
  }

  return (
    <div className={cn("w-full max-w-[300px]", className)}>
      <button
        type="button"
        onClick={() => (playing ? pause() : play())}
        aria-label={playing ? "Зогсоох" : "Тоглуулах"}
        className="group relative block w-full cursor-pointer overflow-hidden rounded-[22px] bg-black shadow-card ring-1 ring-zinc-900/10"
      >
        <canvas ref={canvasRef} width={REEL_W} height={REEL_H} className="block aspect-[9/16] w-full" />
        {!playing && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
            <span className="flex size-16 items-center justify-center rounded-full bg-white/90 text-zinc-900 shadow-lg">
              <IconPlay className="ml-1 size-7 fill-current" />
            </span>
          </span>
        )}
      </button>
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => (playing ? pause() : play())}
          aria-label={playing ? "Зогсоох" : "Тоглуулах"}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700"
        >
          {playing ? <IconPause className="size-4 fill-current" /> : <IconPlay className="ml-0.5 size-4 fill-current" />}
        </button>
        <input
          type="range"
          min={0}
          max={src.tl.total}
          step={0.01}
          value={Math.min(time, src.tl.total)}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Видеоны байрлал"
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-zinc-900"
        />
        <span className="w-[74px] shrink-0 text-right text-xs tabular-nums text-zinc-500">
          {fmt(time)} / {fmt(src.tl.total)}
        </span>
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Дуу нээх" : "Дуу хаах"}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900"
        >
          {muted ? <IconVolumeOff className="size-4" /> : <IconVolume className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => play(0)}
          aria-label="Эхнээс нь"
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900"
        >
          <IconRefresh className="size-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* MP4 / WebM болгон бичих                                              */
/* ------------------------------------------------------------------ */

const MIMES = [
  'video/mp4;codecs="avc1.42E01E,mp4a.40.2"',
  "video/mp4;codecs=avc1",
  "video/mp4",
  'video/webm;codecs="vp9,opus"',
  'video/webm;codecs="vp8,opus"',
  "video/webm",
];

/** Browser бичиж чадах хамгийн тохиромжтой формат (MP4 байвал түүнийг) */
export function reelMime() {
  if (typeof MediaRecorder === "undefined" || typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  return MIMES.find((m) => MediaRecorder.isTypeSupported(m)) ?? null;
}

/**
 * Видеог бодит хугацаанд тоглуулж бичнэ (видеоны урттай тэнцүү хугацаа шаардана).
 * Дууг чанга яригч руу биш, зөвхөн бичлэг рүү илгээнэ.
 */
export async function exportReel(src: ReelSource, onProgress: (p: number) => void, signal?: AbortSignal) {
  const mime = reelMime();
  if (!mime) throw new Error("Энэ browser видео бичиж чадахгүй байна. Chrome, Edge эсвэл Safari-ийн шинэ хувилбар ашиглана уу.");

  const canvas = document.createElement("canvas");
  canvas.width = REEL_W;
  canvas.height = REEL_H;
  canvas.style.cssText = "position:fixed;left:-10000px;top:0;width:2px;height:2px;pointer-events:none";
  document.body.appendChild(canvas);
  const ctx = new AudioContext();
  try {
    await ctx.resume();
    const dest = ctx.createMediaStreamDestination();
    const n = ctx.createBufferSource();
    n.buffer = src.audio;
    n.connect(dest);

    paint(canvas, src, 0);
    const stream = canvas.captureStream(30);
    dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000, audioBitsPerSecond: 128_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    const done = new Promise<void>((resolve) => (rec.onstop = () => resolve()));

    rec.start(250);
    const t0 = ctx.currentTime + 0.1;
    n.start(t0);
    await new Promise<void>((resolve, reject) => {
      const tick = () => {
        if (signal?.aborted) {
          reject(new DOMException("Цуцаллаа", "AbortError"));
          return;
        }
        const t = Math.max(0, ctx.currentTime - t0);
        paint(canvas, src, Math.min(t, src.tl.total - 0.01));
        onProgress(Math.min(1, t / src.tl.total));
        if (t >= src.tl.total + 0.15) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }).finally(() => {
      if (rec.state !== "inactive") rec.stop();
      try {
        n.stop();
      } catch {
        // аль хэдийн зогссон
      }
    });
    await done;
    stream.getTracks().forEach((track) => track.stop());
    const blob = new Blob(chunks, { type: mime.split(";")[0] });
    return { blob, url: URL.createObjectURL(blob) };
  } finally {
    ctx.close().catch(() => {});
    canvas.remove();
  }
}
