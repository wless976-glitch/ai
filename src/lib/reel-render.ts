/**
 * Reels түүхийг canvas дээр зурна (зөвхөн browser). Бүх загвар 720×1280 (9:16) координатаар зурдаг;
 * жижиг зураг (загварын жишээ) хэрэгтэй бол дуудагч нь ctx.scale хийнэ.
 */
import { REEL_TEMPLATES, VOICE_DELAY, type ReelScene, type ReelScript, type ReelTemplate, type ReelTimeline } from "./reel";

export const REEL_W = 720;
export const REEL_H = 1280;

export interface ReelBrand {
  name: string;
  handle: string;
}

export interface ReelFonts {
  sans: string;
  mono: string;
}

export interface Frame {
  /** Видеоны эхнээс хойших секунд */
  t: number;
  /** Кадрын дугаар; төгсгөлийн брэнд карт бол -1 */
  i: number;
  scene: ReelScene | null;
  /** Кадр эхэлснээс хойших секунд */
  local: number;
  dur: number;
  /** Кадрын явц 0..1 */
  p: number;
  script: ReelScript;
  tl: ReelTimeline;
  brand: ReelBrand;
  f: ReelFonts;
}

type Ctx = CanvasRenderingContext2D;

const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const SERIF = 'Georgia,"Times New Roman",serif';
const W = REEL_W;
const H = REEL_H;

/* ------------------------------------------------------------------ */
/* Туслах функцууд                                                      */
/* ------------------------------------------------------------------ */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
const easeInOut = (x: number) => {
  const v = clamp(x);
  return v < 0.5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2;
};
const easeBack = (x: number) => {
  const v = clamp(x);
  const c1 = 1.70158;
  return 1 + (c1 + 1) * Math.pow(v - 1, 3) + c1 * Math.pow(v - 1, 2);
};
/** `start` секундээс эхлэн `d` секундэд 0→1 */
const enter = (local: number, start: number, d: number) => clamp((local - start) / d);

function setFont(ctx: Ctx, weight: number | string, size: number, family: string) {
  ctx.font = `${weight} ${size}px ${family}`;
}

function wrap(ctx: Ctx, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (!line || ctx.measureText(test).width <= maxW) line = test;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const fitCache = new Map<string, { size: number; lines: string[] }>();

/** Текстийг өргөн, мөрийн тоонд багтаатал фонтын хэмжээг багасгана */
function fit(ctx: Ctx, text: string, maxW: number, maxLines: number, size: number, min: number, weight: number | string, family: string) {
  const key = `${text}|${maxW}|${maxLines}|${size}|${min}|${weight}|${family}`;
  const hit = fitCache.get(key);
  if (hit) {
    setFont(ctx, weight, hit.size, family);
    return hit;
  }
  let result = { size: min, lines: [] as string[] };
  for (let s = size; s >= min; s -= 2) {
    setFont(ctx, weight, s, family);
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= maxLines && lines.every((l) => ctx.measureText(l).width <= maxW)) {
      result = { size: s, lines };
      break;
    }
    if (s - 2 < min) result = { size: min, lines: lines.slice(0, maxLines) };
  }
  if (fitCache.size > 400) fitCache.clear();
  fitCache.set(key, result);
  setFont(ctx, weight, result.size, family);
  return result;
}

function emoji(ctx: Ctx, e: string, x: number, y: number, size: number) {
  ctx.save();
  ctx.font = `${size}px ${EMOJI}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(e, x, y);
  ctx.restore();
}

function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "Т"
  );
}

/** Тогтмол "санамсаргүй" тоо — кадр бүрт ижил байрлал гаргана */
function seeded(seed: number) {
  let a = seed * 2654435761;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function setSpacing(ctx: Ctx, px: number) {
  if ("letterSpacing" in ctx) (ctx as Ctx & { letterSpacing: string }).letterSpacing = `${px}px`;
}

const timecode = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

/* ---------- Хадмал: хоолойтой зэрэгцэн 6 үгээр ээлжилж, одоогийн үг тодорно ---------- */

interface CaptionStyle {
  y: number;
  size: number;
  family: string;
  weight: number;
  color: string;
  hi: string;
  bg?: string;
  shadow?: string;
}

const CHUNK = 6;

function caption(ctx: Ctx, fr: Frame, st: CaptionStyle) {
  if (!fr.scene) return;
  const words = fr.scene.narration.split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const from = VOICE_DELAY;
  const to = Math.max(from + 0.5, fr.dur - 0.45);
  const prog = clamp((fr.local - from) / (to - from));
  const idx = Math.min(words.length - 1, Math.floor(prog * words.length));
  // Тэнцүү хэсгүүд (7 үг → 4 + 3) — ганц үг үлдэхгүй
  const size = Math.ceil(words.length / Math.ceil(words.length / CHUNK));
  const chunk = Math.floor(idx / size);
  const part = words.slice(chunk * size, chunk * size + size);
  const chunkStart = from + ((chunk * size) / words.length) * (to - from);
  const a = easeOut((fr.local - chunkStart) / 0.18);

  const { size: fontSize, lines } = fit(ctx, part.join(" "), 600, 2, st.size, Math.round(st.size * 0.7), st.weight, st.family);
  const lineH = fontSize * 1.28;
  const blockH = lines.length * lineH;
  const top = st.y - blockH / 2 + (1 - a) * 14;

  ctx.save();
  ctx.globalAlpha = a;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  if (st.bg) {
    const maxLine = Math.max(...lines.map((l) => ctx.measureText(l).width));
    ctx.fillStyle = st.bg;
    rr(ctx, W / 2 - maxLine / 2 - 22, top - 12, maxLine + 44, blockH + 24, 18);
    ctx.fill();
  }
  if (st.shadow) {
    ctx.shadowColor = st.shadow;
    ctx.shadowBlur = 12;
  }
  let k = chunk * size;
  lines.forEach((line, li) => {
    const lw = ctx.measureText(line).width;
    let x = W / 2 - lw / 2;
    const y = top + li * lineH + lineH / 2;
    for (const w of line.split(" ")) {
      ctx.fillStyle = k === idx ? st.hi : st.color;
      ctx.fillText(w, x, y);
      x += ctx.measureText(`${w} `).width;
      k++;
    }
  });
  ctx.restore();
}

/* ---------- Нийтлэг төгсгөлийн брэнд карт ---------- */

interface Palette {
  bg: string;
  fg: string;
  accent: string;
  onAccent: string;
  sub: string;
}

function outro(ctx: Ctx, fr: Frame, pal: Palette, family: string) {
  const local = fr.t - fr.tl.outroStart;
  const k = easeOut(local / 0.45);
  ctx.save();
  ctx.globalAlpha = 0.92 * k;
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = k;
  const s = 0.9 + 0.1 * easeBack(local / 0.5);
  ctx.translate(W / 2, 600);
  ctx.scale(s, s);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = pal.accent;
  ctx.beginPath();
  ctx.arc(0, -150, 78, 0, Math.PI * 2);
  ctx.fill();
  setFont(ctx, 800, 58, family);
  ctx.fillStyle = pal.onAccent;
  ctx.fillText(initials(fr.brand.name), 0, -146);

  const { size, lines } = fit(ctx, fr.brand.name, 600, 2, 64, 36, 800, family);
  ctx.fillStyle = pal.fg;
  lines.forEach((l, i) => ctx.fillText(l, 0, -20 + i * size * 1.15));
  const after = -20 + lines.length * size * 1.15;

  if (fr.brand.handle) {
    setFont(ctx, 500, 30, family);
    ctx.fillStyle = pal.sub;
    ctx.fillText(fr.brand.handle, 0, after + 10);
  }

  const pulse = 1 + Math.sin(local * 6) * 0.03;
  ctx.save();
  ctx.translate(0, after + 110);
  ctx.scale(pulse, pulse);
  setFont(ctx, 700, 34, family);
  const label = "Дагаарай 👉";
  const bw = ctx.measureText(label).width + 80;
  ctx.fillStyle = pal.accent;
  rr(ctx, -bw / 2, -38, bw, 76, 38);
  ctx.fill();
  ctx.fillStyle = pal.onAccent;
  ctx.fillText(label, 0, 2);
  ctx.restore();
  ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Загварууд                                                           */
/* ------------------------------------------------------------------ */

interface Template {
  palette: Palette;
  /** Арын дэвсгэр (төгсгөлийн карт дээр ч зурагдана) */
  bg(ctx: Ctx, fr: Frame): void;
  /** Кадрын агуулга */
  scene(ctx: Ctx, fr: Frame, scene: ReelScene): void;
  /** Хадмал / бичвэр нь кадрын дотор байдаг бол outro-д ч гэсэн зурагдана */
  family?: (fr: Frame) => string;
}

/* ---------- 1. Хөдөлгөөнт бичвэр (брэндийн өнгө) ---------- */

const kinetic: Template = {
  palette: { bg: "#10100e", fg: "#ffffff", accent: "#d4e93f", onAccent: "#10100e", sub: "rgba(255,255,255,0.6)" },
  bg(ctx, fr) {
    ctx.fillStyle = "#10100e";
    ctx.fillRect(0, 0, W, H);
    const blob = (x: number, y: number, r: number, color: string) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, color);
      g.addColorStop(1, "rgba(16,16,14,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };
    blob(360 + Math.sin(fr.t * 0.4) * 200, 330 + Math.cos(fr.t * 0.3) * 90, 460, "rgba(212,233,63,0.2)");
    blob(220 + Math.cos(fr.t * 0.35) * 140, 1020, 420, "rgba(124,58,237,0.2)");
  },
  scene(ctx, fr, s) {
    const { sans } = fr.f;
    const n = fr.script.scenes.length;
    // Story шиг дээд талын явцын зурвас
    const segW = (600 - (n - 1) * 8) / n;
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      rr(ctx, 60 + k * (segW + 8), 64, segW, 6, 3);
      ctx.fill();
      const fill = k < fr.i ? 1 : k === fr.i ? fr.p : 0;
      if (fill > 0) {
        ctx.fillStyle = "#d4e93f";
        rr(ctx, 60 + k * (segW + 8), 64, segW * fill, 6, 3);
        ctx.fill();
      }
    }
    ctx.fillStyle = "#d4e93f";
    ctx.beginPath();
    ctx.arc(78, 112, 18, 0, Math.PI * 2);
    ctx.fill();
    setFont(ctx, 800, 15, sans);
    ctx.fillStyle = "#10100e";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(fr.brand.name), 78, 113);
    setFont(ctx, 600, 24, sans);
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.textAlign = "left";
    ctx.fillText(fr.brand.name, 108, 113);

    // Emoji: үсэрч орж ирээд хөвнө
    const ea = easeBack(enter(fr.local, 0.05, 0.5));
    ctx.save();
    ctx.translate(360, 390 + Math.sin(fr.t * 2.2) * 10);
    ctx.scale(ea, ea);
    emoji(ctx, s.emoji, 0, 0, 170);
    ctx.restore();

    // Гарчиг: үг бүр ээлжлэн "поп" хийнэ, сүүлийн үг нь лайм дэвсгэртэй
    const { size, lines } = fit(ctx, s.headline, 600, 3, 86, 46, 800, sans);
    const lineH = size * 1.18;
    const top = 640 - (lines.length * lineH) / 2;
    const total = s.headline.split(/\s+/).filter(Boolean).length;
    let k = 0;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    lines.forEach((line, li) => {
      const parts = line.split(" ");
      const lw = ctx.measureText(line).width;
      let x = W / 2 - lw / 2;
      const y = top + li * lineH + lineH / 2;
      for (const w of parts) {
        const ww = ctx.measureText(w).width;
        const a = easeBack(enter(fr.local, 0.15 + k * 0.09, 0.32));
        ctx.save();
        ctx.translate(x + ww / 2, y);
        ctx.scale(a, a);
        ctx.globalAlpha = clamp(a);
        if (k === total - 1) {
          ctx.fillStyle = "#d4e93f";
          rr(ctx, -ww / 2 - 12, -size * 0.58, ww + 24, size * 1.12, 14);
          ctx.fill();
          ctx.fillStyle = "#10100e";
        } else ctx.fillStyle = "#ffffff";
        ctx.fillText(w, -ww / 2, 2);
        ctx.restore();
        x += ctx.measureText(`${w} `).width;
        k++;
      }
    });

    if (s.stat) {
      const a = easeOut(enter(fr.local, 0.55, 0.4));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(0, (1 - a) * 40);
      setFont(ctx, 800, 58, sans);
      const sw = ctx.measureText(s.stat).width + 64;
      ctx.strokeStyle = "#d4e93f";
      ctx.lineWidth = 4;
      rr(ctx, W / 2 - sw / 2, 790, sw, 92, 46);
      ctx.stroke();
      ctx.fillStyle = "#d4e93f";
      ctx.textAlign = "center";
      ctx.fillText(s.stat, W / 2, 838);
      ctx.restore();
    }

    caption(ctx, fr, { y: 1010, size: 40, family: sans, weight: 700, color: "#ffffff", hi: "#d4e93f", shadow: "rgba(0,0,0,0.6)" });

    // Кадр солигдоход лайм туузан шилжилт
    if (fr.i > 0 && fr.local < 0.4) {
      const y = H - easeInOut(fr.local / 0.4) * (H * 2);
      ctx.fillStyle = "#d4e93f";
      ctx.fillRect(0, y, W, H);
    }
  },
};

/* ---------- 2. Неон скан ---------- */

let scanlines: CanvasPattern | null = null;
function scanlinePattern(ctx: Ctx) {
  if (scanlines) return scanlines;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 4;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(0,0,0,0.28)";
  g.fillRect(0, 0, 4, 1);
  scanlines = ctx.createPattern(c, "repeat");
  return scanlines;
}

const NEON = "#39ff88";
const neon: Template = {
  palette: { bg: "#020806", fg: NEON, accent: NEON, onAccent: "#020806", sub: "rgba(57,255,136,0.6)" },
  bg(ctx, fr) {
    ctx.fillStyle = "#020806";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(57,255,136,0.07)";
    ctx.lineWidth = 1;
    const off = (fr.t * 24) % 60;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 60) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
    }
    for (let y = -60 + off; y <= H; y += 60) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
    }
    ctx.stroke();
    const v = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 900);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  },
  scene(ctx, fr, s) {
    const { mono } = fr.f;
    const n = fr.script.scenes.length;
    // Асаахад анивчина
    const flicker = fr.local < 0.35 && Math.sin(fr.local * 90) > 0.2 ? 0.45 : 1;
    ctx.save();
    ctx.globalAlpha = flicker;

    setFont(ctx, 500, 22, mono);
    ctx.fillStyle = "rgba(57,255,136,0.8)";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText(`> SCAN_${String(fr.i + 1).padStart(2, "0")}/${String(n).padStart(2, "0")}`, 56, 86);
    ctx.textAlign = "right";
    ctx.fillText(`T+${timecode(fr.t)}`, W - 56, 86);
    ctx.fillStyle = "rgba(57,255,136,0.35)";
    ctx.fillRect(56, 108, W - 112, 2);

    // Радар
    const cx = 360;
    const cy = 450;
    const R = 220;
    ctx.strokeStyle = "rgba(57,255,136,0.35)";
    ctx.lineWidth = 2;
    for (const k of [0.36, 0.68, 1]) {
      ctx.beginPath();
      ctx.arc(cx, cy, R * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();
    const ang = fr.t * 2.2;
    for (let k = 0; k < 10; k++) {
      ctx.fillStyle = `rgba(57,255,136,${0.16 * (1 - k / 10)})`;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, ang - (k + 1) * 0.07, ang - k * 0.07);
      ctx.closePath();
      ctx.fill();
    }
    ctx.strokeStyle = NEON;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * R, cy + Math.sin(ang) * R);
    ctx.stroke();
    const rnd = seeded(fr.i + 7);
    for (let k = 0; k < 5; k++) {
      const ba = rnd() * Math.PI * 2;
      const br = R * (0.3 + rnd() * 0.62);
      const since = (((ang - ba) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const a = Math.max(0, 1 - since / 2.2);
      ctx.fillStyle = `rgba(57,255,136,${0.15 + a * 0.85})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ba) * br, cy + Math.sin(ba) * br, 5 + a * 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Emoji-д сүүдэр (shadowBlur) хэрэглэхэд өнгө нь бүдэгрэдэг тул туяаг тусад нь зурна
    ctx.save();
    const ea = easeOut(enter(fr.local, 0.1, 0.5));
    ctx.globalAlpha *= ea;
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 130);
    glow.addColorStop(0, "rgba(57,255,136,0.45)");
    glow.addColorStop(1, "rgba(57,255,136,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - 130, cy - 130, 260, 260);
    emoji(ctx, s.emoji, cx, cy, 140 + (1 - ea) * 60);
    ctx.restore();

    // Гарчиг: бичгийн машин шиг үсэг үсгээр
    const { size, lines } = fit(ctx, s.headline.toUpperCase(), 600, 3, 54, 34, 700, mono);
    const chars = Math.floor(Math.max(0, fr.local - 0.3) * 30);
    const lineH = size * 1.3;
    ctx.save();
    ctx.shadowColor = NEON;
    ctx.shadowBlur = 18;
    ctx.fillStyle = NEON;
    ctx.textAlign = "left";
    let left = chars;
    let cursor: [number, number] = [60, 760];
    lines.forEach((line, li) => {
      if (li > 0 && left <= 0) return;
      const shown = line.slice(0, Math.max(0, left));
      const y = 760 + li * lineH;
      ctx.fillText(shown, 60, y);
      cursor = [60 + ctx.measureText(shown).width + 6, y];
      left -= line.length + 1;
    });
    if (Math.floor(fr.t * 2.5) % 2 === 0) {
      const [x, y] = cursor;
      ctx.fillRect(x, y - size * 0.45, size * 0.55, size * 0.9);
    }
    ctx.restore();

    if (s.stat) {
      const typed = s.headline.length;
      const a = easeOut(enter(fr.local, 0.3 + typed / 30 + 0.1, 0.35));
      ctx.save();
      ctx.globalAlpha *= a;
      setFont(ctx, 700, 46, mono);
      const label = `[ ${s.stat} ]`;
      ctx.fillStyle = "#22d3ee";
      ctx.shadowColor = "#22d3ee";
      ctx.shadowBlur = 20;
      ctx.textAlign = "left";
      ctx.fillText(label, 60, 760 + lines.length * lineH + 50);
      ctx.restore();
    }

    caption(ctx, fr, {
      y: 1100,
      size: 32,
      family: mono,
      weight: 500,
      color: "rgba(57,255,136,0.9)",
      hi: "#ffffff",
      bg: "rgba(0,18,9,0.78)",
    });
    ctx.restore();

    ctx.fillStyle = scanlinePattern(ctx) ?? "transparent";
    ctx.fillRect(0, 0, W, H);
  },
};

/* ---------- 3. Шуурхай мэдээ ---------- */

const news: Template = {
  palette: { bg: "#0b1f4d", fg: "#ffffff", accent: "#e11d2a", onAccent: "#ffffff", sub: "rgba(255,255,255,0.7)" },
  bg(ctx, fr) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#0a1a3f");
    g.addColorStop(1, "#16367c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.045)";
    for (let y = 14; y < H; y += 28) for (let x = 14; x < W; x += 28) ctx.fillRect(x, y, 2, 2);
    for (let k = 0; k < 3; k++) {
      const x = 120 + k * 240 + Math.sin(fr.t * 0.5 + k) * 40;
      ctx.fillStyle = "rgba(255,255,255,0.035)";
      ctx.beginPath();
      ctx.moveTo(x - 30, 0);
      ctx.lineTo(x + 30, 0);
      ctx.lineTo(x + 180, H);
      ctx.lineTo(x - 180, H);
      ctx.closePath();
      ctx.fill();
    }
  },
  scene(ctx, fr, s) {
    const { sans } = fr.f;
    ctx.textBaseline = "middle";
    // Дээд мөр: ШУУД, суваг, цаг
    ctx.fillStyle = "#e11d2a";
    rr(ctx, 50, 56, 128, 48, 10);
    ctx.fill();
    ctx.fillStyle = Math.floor(fr.t * 2) % 2 ? "#ffffff" : "rgba(255,255,255,0.35)";
    ctx.beginPath();
    ctx.arc(76, 80, 8, 0, Math.PI * 2);
    ctx.fill();
    setFont(ctx, 800, 24, sans);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText("ШУУД", 94, 81);
    setFont(ctx, 700, 24, sans);
    ctx.textAlign = "right";
    ctx.fillText(`${fr.brand.name.toUpperCase()} · ${timecode(fr.t)}`.slice(0, 34), W - 50, 81);

    // Видео дэлгэц
    ctx.save();
    rr(ctx, 50, 136, 620, 520, 22);
    ctx.clip();
    const sg = ctx.createLinearGradient(50, 136, 670, 656);
    sg.addColorStop(0, "#1d4ed8");
    sg.addColorStop(1, "#0ea5e9");
    ctx.fillStyle = sg;
    ctx.fillRect(50, 136, 620, 520);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 26;
    for (let x = -600 + ((fr.t * 40) % 80); x < 700; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 136);
      ctx.lineTo(x + 520, 656);
      ctx.stroke();
    }
    const z = 1 + fr.p * 0.12;
    ctx.save();
    ctx.translate(360, 396);
    ctx.scale(z, z);
    emoji(ctx, s.emoji, 0, 0, 230);
    ctx.restore();
    if (s.stat) {
      const a = easeOut(enter(fr.local, 0.5, 0.35));
      ctx.globalAlpha = a;
      setFont(ctx, 800, 50, sans);
      const sw = Math.max(ctx.measureText(s.stat).width + 48, 170);
      ctx.fillStyle = "#ffffff";
      rr(ctx, 74 - (1 - a) * 60, 540, sw, 92, 12);
      ctx.fill();
      ctx.fillStyle = "#0b1f4d";
      ctx.textAlign = "left";
      ctx.fillText(s.stat, 98 - (1 - a) * 60, 588);
      ctx.globalAlpha = 1;
    }
    // Кадр солигдоход улаан туузаар арчина
    if (fr.local < 0.4) {
      const x = -700 + easeInOut(fr.local / 0.4) * 1500;
      ctx.fillStyle = "#e11d2a";
      ctx.fillRect(x, 136, 160, 520);
    }
    ctx.restore();

    // Доод гарчиг (lower third)
    const slide = (1 - easeOut(fr.local / 0.45)) * -720;
    ctx.save();
    ctx.translate(slide, 0);
    setFont(ctx, 800, 24, sans);
    const tag = "ШУУРХАЙ МЭДЭЭ";
    const tw = ctx.measureText(tag).width + 36;
    ctx.fillStyle = "#e11d2a";
    ctx.fillRect(50, 690, tw, 50);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(tag, 68, 716);
    const { size, lines } = fit(ctx, s.headline, 572, 2, 50, 32, 800, sans);
    const lineH = size * 1.2;
    const boxH = lines.length * lineH + 36;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(50, 740, 620, boxH);
    ctx.fillStyle = "#0b1f4d";
    lines.forEach((l, li) => ctx.fillText(l, 74, 740 + 18 + li * lineH + lineH / 2));
    ctx.restore();

    caption(ctx, fr, { y: 1000, size: 34, family: sans, weight: 600, color: "#ffffff", hi: "#fde047", bg: "rgba(0,0,0,0.38)" });

    // Гүйдэг мөр
    ctx.fillStyle = "#e11d2a";
    ctx.fillRect(0, 1150, 150, 56);
    setFont(ctx, 800, 24, sans);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText("ТОВЧ", 75, 1179);
    ctx.save();
    ctx.beginPath();
    ctx.rect(150, 1150, W - 150, 56);
    ctx.clip();
    ctx.fillStyle = "#081633";
    ctx.fillRect(150, 1150, W - 150, 56);
    setFont(ctx, 600, 24, sans);
    const ticker = `${fr.script.scenes.map((x) => x.headline).join("   •   ")}   •   `;
    const tw2 = ctx.measureText(ticker).width;
    const off = (fr.t * 110) % tw2;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.fillText(ticker, 166 - off, 1179);
    ctx.fillText(ticker, 166 - off + tw2, 1179);
    ctx.restore();
  },
};

/* ---------- 4. Чат түүх ---------- */

interface ChatMsg {
  side: "in" | "out";
  title?: string;
  body: string;
  big?: boolean;
  at: number;
}

function chatMessages(script: ReelScript, tl: ReelTimeline): ChatMsg[] {
  const msgs: ChatMsg[] = [{ side: "out", body: script.question, at: 0.1 }];
  script.scenes.forEach((s, i) => {
    const st = tl.starts[i] + (i === 0 ? 0.5 : 0);
    msgs.push({ side: "in", title: `${s.emoji} ${s.headline}`, body: s.narration, at: st + 0.7 });
    if (s.stat) msgs.push({ side: "in", body: `${s.emoji} ${s.stat}`, big: true, at: st + 1.5 });
  });
  return msgs;
}

const chat: Template = {
  palette: { bg: "#efeae2", fg: "#111b21", accent: "#25d366", onAccent: "#ffffff", sub: "#667781" },
  bg(ctx, fr) {
    const { sans } = fr.f;
    ctx.fillStyle = "#efeae2";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0,0,0,0.035)";
    for (let y = 20; y < H; y += 44) for (let x = (y / 44) % 2 ? 20 : 42; x < W; x += 44) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    const msgs = chatMessages(fr.script, fr.tl);
    const typing = msgs.find((m) => m.side === "in" && !m.big && fr.t >= m.at - 0.65 && fr.t < m.at);
    const maxTextW = 470;
    const pad = 22;
    const laid = msgs
      .filter((m) => fr.t >= m.at)
      .map((m) => {
        if (m.big) {
          setFont(ctx, 800, 46, sans);
          const w = Math.min(560, ctx.measureText(m.body).width + pad * 2);
          return { m, w, h: 96, title: [] as string[], body: [m.body] };
        }
        setFont(ctx, 700, 30, sans);
        const title = m.title ? wrap(ctx, m.title, maxTextW) : [];
        setFont(ctx, 400, 30, sans);
        const body = wrap(ctx, m.body, maxTextW);
        const widths = [...body.map((l) => ctx.measureText(l).width)];
        setFont(ctx, 700, 30, sans);
        widths.push(...title.map((l) => ctx.measureText(l).width));
        const w = Math.max(...widths) + pad * 2;
        const h = pad * 2 + title.length * 38 + (title.length ? 8 : 0) + body.length * 40;
        return { m, w, h, title, body };
      });

    const areaTop = 150;
    const areaBottom = 1170;
    const gap = 16;
    let total = 0;
    const appear = laid.map((b) => easeOut((fr.t - b.m.at) / 0.25));
    laid.forEach((b, k) => (total += (b.h + gap) * appear[k]));
    if (typing) total += 80;
    const offset = Math.max(0, total - (areaBottom - areaTop - 20));

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, areaTop, W, areaBottom - areaTop);
    ctx.clip();
    let y = areaTop + 20 - offset;
    laid.forEach((b, k) => {
      const a = appear[k];
      const out = b.m.side === "out";
      const x = out ? W - 36 - b.w : 36;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(out ? x + b.w : x, y);
      ctx.scale(0.88 + 0.12 * a, 0.88 + 0.12 * a);
      ctx.translate(out ? -b.w : 0, 0);
      ctx.fillStyle = out ? "#d9fdd3" : "#ffffff";
      ctx.shadowColor = "rgba(0,0,0,0.08)";
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      rr(ctx, 0, 0, b.w, b.h, 24);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.textBaseline = "top";
      ctx.textAlign = "left";
      if (b.m.big) {
        setFont(ctx, 800, 46, sans);
        ctx.fillStyle = "#111b21";
        ctx.fillText(b.body[0], pad, 24);
      } else {
        let ty = pad;
        setFont(ctx, 700, 30, sans);
        ctx.fillStyle = "#075e54";
        for (const l of b.title) {
          ctx.fillText(l, pad, ty);
          ty += 38;
        }
        if (b.title.length) ty += 8;
        setFont(ctx, 400, 30, sans);
        ctx.fillStyle = "#111b21";
        for (const l of b.body) {
          ctx.fillText(l, pad, ty);
          ty += 40;
        }
      }
      ctx.restore();
      y += (b.h + gap) * a;
    });
    if (typing) {
      ctx.fillStyle = "#ffffff";
      rr(ctx, 36, y, 120, 64, 24);
      ctx.fill();
      for (let k = 0; k < 3; k++) {
        const b = Math.sin(fr.t * 9 - k * 0.8);
        ctx.fillStyle = `rgba(102,119,129,${0.45 + 0.35 * b})`;
        ctx.beginPath();
        ctx.arc(66 + k * 30, y + 32 - Math.max(0, b) * 6, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    // Толгой хэсэг
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, 130);
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(0, 130, W, 2);
    setFont(ctx, 400, 48, sans);
    ctx.fillStyle = "#111b21";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("‹", 26, 76);
    ctx.fillStyle = "#25d366";
    ctx.beginPath();
    ctx.arc(104, 76, 34, 0, Math.PI * 2);
    ctx.fill();
    setFont(ctx, 800, 24, sans);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(initials(fr.brand.name), 104, 77);
    const { lines } = fit(ctx, fr.brand.name, 440, 1, 30, 22, 700, sans);
    ctx.fillStyle = "#111b21";
    ctx.textAlign = "left";
    ctx.fillText(lines[0] ?? "", 154, 62);
    setFont(ctx, 400, 22, sans);
    ctx.fillStyle = typing ? "#25d366" : "#667781";
    ctx.fillText(typing ? "бичиж байна…" : "онлайн", 154, 96);

    // Бичих талбар
    ctx.fillStyle = "#f0f2f5";
    ctx.fillRect(0, 1170, W, 110);
    ctx.fillStyle = "#ffffff";
    rr(ctx, 24, 1192, 570, 66, 33);
    ctx.fill();
    setFont(ctx, 400, 26, sans);
    ctx.fillStyle = "#8696a0";
    ctx.fillText("Мессеж", 56, 1226);
    ctx.fillStyle = "#25d366";
    ctx.beginPath();
    ctx.arc(650, 1225, 34, 0, Math.PI * 2);
    ctx.fill();
    emoji(ctx, "🎤", 650, 1226, 30);
  },
  scene() {
    // Бүх мессеж bg() дотор (төгсгөлийн карт дээр ч харагдана)
  },
};

/* ---------- 5. Кино трейлер ---------- */

let grain: HTMLCanvasElement | null = null;
function grainCanvas() {
  if (grain) return grain;
  grain = document.createElement("canvas");
  grain.width = 256;
  grain.height = 256;
  const g = grain.getContext("2d")!;
  const img = g.createImageData(256, 256);
  const rnd = seeded(3);
  for (let k = 0; k < img.data.length; k += 4) {
    const v = rnd() * 255;
    img.data[k] = img.data[k + 1] = img.data[k + 2] = v;
    img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return grain;
}

const GOLD = "#e8b04a";
const BAR = 170;
const trailer: Template = {
  palette: { bg: "#000000", fg: "#f5f0e6", accent: GOLD, onAccent: "#000000", sub: "rgba(245,240,230,0.6)" },
  bg(ctx, fr) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);
    const g = ctx.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 760);
    g.addColorStop(0, "#3a2412");
    g.addColorStop(1, "#000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, BAR, W, H - BAR * 2);
    const s = fr.scene;
    if (s) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.translate(W / 2, H / 2);
      const z = 1.05 + fr.p * 0.12;
      ctx.scale(z, z);
      ctx.filter = "blur(5px)";
      emoji(ctx, s.emoji, 0, 0, 520);
      ctx.restore();
    }
    const lx = 600 + Math.sin(fr.t * 0.6) * 160;
    const leak = ctx.createRadialGradient(lx, 260, 0, lx, 260, 420);
    leak.addColorStop(0, "rgba(255,140,40,0.2)");
    leak.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = leak;
    ctx.fillRect(0, BAR, W, H - BAR * 2);
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = "screen";
    const gc = grainCanvas();
    const ox = Math.floor(seeded(Math.floor(fr.t * 24))() * 256);
    for (let y = -ox; y < H; y += 256) for (let x = -ox; x < W; x += 256) ctx.drawImage(gc, x, y);
    ctx.restore();
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, BAR);
    ctx.fillRect(0, H - BAR, W, BAR);
  },
  scene(ctx, fr, s) {
    const { sans, mono } = fr.f;
    const n = fr.script.scenes.length;
    const fadeOut = 1 - enter(fr.local, fr.dur - 0.3, 0.3);
    const a = easeOut(enter(fr.local, 0.12, 0.7)) * fadeOut;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    setFont(ctx, 500, 22, mono);
    setSpacing(ctx, 6);
    ctx.fillStyle = GOLD;
    const label = fr.i === 0 ? `${fr.brand.name.toUpperCase()} ТАНИЛЦУУЛЖ БАЙНА` : `${String(fr.i + 1).padStart(2, "0")} / ${String(n).padStart(2, "0")}`;
    ctx.fillText(label.slice(0, 40), W / 2, 420);
    setSpacing(ctx, 3);
    const z = 1.08 - fr.p * 0.08;
    ctx.translate(W / 2, 610);
    ctx.scale(z, z);
    const { size, lines } = fit(ctx, s.headline.toUpperCase(), 600, 3, 76, 40, 700, SERIF);
    const lineH = size * 1.15;
    ctx.fillStyle = "#f5f0e6";
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 20;
    lines.forEach((l, li) => ctx.fillText(l, 0, (li - (lines.length - 1) / 2) * lineH));
    ctx.shadowColor = "transparent";
    if (s.stat) {
      const sy = ((lines.length + 1) / 2) * lineH + 50;
      setSpacing(ctx, 2);
      setFont(ctx, "italic 400", 46, SERIF);
      ctx.fillStyle = GOLD;
      ctx.fillText(s.stat, 0, sy);
      const sw = ctx.measureText(s.stat).width;
      ctx.fillRect(-sw / 2 - 90, sy, 60, 2);
      ctx.fillRect(sw / 2 + 30, sy, 60, 2);
    }
    setSpacing(ctx, 0);
    ctx.restore();

    caption(ctx, fr, { y: H - BAR / 2, size: 30, family: sans, weight: 500, color: "rgba(245,240,230,0.92)", hi: GOLD });

    if (fr.i > 0 && fr.local < 0.18) {
      ctx.fillStyle = `rgba(255,248,230,${1 - fr.local / 0.18})`;
      ctx.fillRect(0, 0, W, H);
    }
  },
};

/* ---------- 6. Тэмдэглэлийн дэвтэр ---------- */

const INK = "#1f2937";
const RED = "#e11d48";
const notebook: Template = {
  palette: { bg: "#fbf8ef", fg: INK, accent: RED, onAccent: "#ffffff", sub: "#64748b" },
  bg(ctx, fr) {
    const { sans } = fr.f;
    ctx.fillStyle = "#fbf8ef";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#c9d8ee";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let y = 250; y < H; y += 56) {
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(225,29,72,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(98, 0);
    ctx.lineTo(98, H);
    ctx.stroke();
    ctx.fillStyle = "#e7e2d4";
    for (let y = 160; y < H; y += 260) {
      ctx.beginPath();
      ctx.arc(46, y, 16, 0, Math.PI * 2);
      ctx.fill();
    }

    // Гарчиг: асуулт + тодруулагч
    const { size, lines } = fit(ctx, fr.script.question, 560, 2, 44, 30, 800, sans);
    const lineH = size * 1.2;
    const hl = easeOut(fr.t / 0.9);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    lines.forEach((l, li) => {
      const y = 112 + li * lineH;
      const lw = ctx.measureText(l).width;
      ctx.fillStyle = "rgba(253,224,71,0.75)";
      ctx.fillRect(124, y - size * 0.3, (lw + 16) * hl, size * 0.7);
      ctx.fillStyle = INK;
      ctx.fillText(l, 132, y);
    });
    ctx.save();
    ctx.translate(560, 26);
    ctx.rotate(0.12);
    ctx.fillStyle = "rgba(250,204,21,0.5)";
    ctx.fillRect(-70, -18, 140, 40);
    ctx.restore();

    // Тэмдэглэлүүд: кадр бүр нэг дугаартай баримт болж нэмэгдэнэ
    const shown = fr.script.scenes.map((s, i) => ({ s, i, at: fr.tl.starts[i] })).filter((x) => fr.t >= x.at);
    const laid = shown.map(({ s, i, at }) => {
      setFont(ctx, 800, 38, sans);
      const head = wrap(ctx, s.headline, 470);
      setFont(ctx, 400, 28, sans);
      const body = wrap(ctx, s.narration, 520);
      const h = head.length * 48 + body.length * 40 + 44;
      return { s, i, at, head, body, h };
    });
    const top = 262;
    const appear = laid.map((x) => easeOut((fr.t - x.at) / 0.4));
    const total = laid.reduce((sum, x, k) => sum + x.h * appear[k], 0);
    const offset = Math.max(0, total - (H - 60 - top));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, top - 10, W, H - top + 10);
    ctx.clip();
    let y = top - offset;
    laid.forEach((x, k) => {
      const local = fr.t - x.at;
      const a = appear[k];
      const current = x.i === fr.i;
      ctx.save();
      ctx.globalAlpha = a;
      // Дугаар — улаан бэхээр дугуйлсан
      ctx.strokeStyle = RED;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(66, y + 26, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * easeOut(local / 0.4));
      ctx.stroke();
      setFont(ctx, 800, 26, sans);
      ctx.fillStyle = RED;
      ctx.textAlign = "center";
      ctx.fillText(String(x.i + 1), 66, y + 28);
      // Гарчиг гараар бичиж буй мэт зүүнээс баруун тийш гарна
      ctx.textAlign = "left";
      setFont(ctx, 800, 38, sans);
      x.head.forEach((l, li) => {
        const ly = y + 26 + li * 48;
        const lw = ctx.measureText(l).width;
        if (current) {
          ctx.fillStyle = "rgba(253,224,71,0.6)";
          ctx.fillRect(116, ly - 14, (lw + 12) * easeOut((local - 0.3) / 0.6), 30);
        }
        ctx.save();
        ctx.beginPath();
        ctx.rect(116, ly - 30, (lw + 20) * easeOut(local / 0.55), 60);
        ctx.clip();
        ctx.fillStyle = INK;
        ctx.fillText(l, 122, ly);
        ctx.restore();
      });
      setFont(ctx, 400, 28, sans);
      ctx.fillStyle = "#475569";
      ctx.globalAlpha = a * easeOut((local - 0.4) / 0.4);
      x.body.forEach((l, li) => ctx.fillText(l, 122, y + 26 + x.head.length * 48 + li * 40));
      ctx.globalAlpha = a;
      // Emoji наалт
      ctx.save();
      ctx.translate(650, y + 34);
      ctx.rotate(((x.i % 3) - 1) * 0.18);
      const sa = easeBack((local - 0.2) / 0.35);
      ctx.scale(sa, sa);
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "rgba(0,0,0,0.08)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 42, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      emoji(ctx, x.s.emoji, 0, 2, 54);
      ctx.restore();
      ctx.restore();
      y += x.h * a;
    });
    ctx.restore();

    // Одоогийн кадрын тоог улаан бэхээр дугуйлна
    const cur = fr.scene;
    if (cur?.stat) {
      const a = easeOut(enter(fr.local, 0.7, 0.5));
      ctx.save();
      ctx.translate(520, H - 150);
      ctx.rotate(-0.06);
      setFont(ctx, 800, 44, sans);
      const sw = ctx.measureText(cur.stat).width;
      ctx.globalAlpha = a;
      ctx.fillStyle = "#fbf8ef";
      ctx.beginPath();
      ctx.ellipse(0, 0, sw / 2 + 40, 50, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = RED;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(0, 0, sw / 2 + 40, 50, 0, 0, Math.PI * 2 * a);
      ctx.stroke();
      ctx.fillStyle = RED;
      ctx.textAlign = "center";
      ctx.fillText(cur.stat, 0, 2);
      ctx.restore();
    }
  },
  scene() {
    // Тэмдэглэлүүд bg() дотор хуримтлагдана
  },
};

const TEMPLATES: Record<ReelTemplate, Template> = { kinetic, neon, news, chat, trailer, notebook };

/* ------------------------------------------------------------------ */
/* Гадагш                                                               */
/* ------------------------------------------------------------------ */

export function frameAt(t: number, script: ReelScript, tl: ReelTimeline, brand: ReelBrand, f: ReelFonts): Frame {
  let i = -1;
  if (t < tl.outroStart) {
    i = 0;
    for (let k = 0; k < tl.starts.length; k++) if (t >= tl.starts[k]) i = k;
  }
  const scene = i >= 0 ? script.scenes[i] : null;
  const start = i >= 0 ? tl.starts[i] : tl.outroStart;
  const dur = i >= 0 ? tl.durs[i] : tl.total - tl.outroStart;
  const local = Math.max(0, t - start);
  return { t, i, scene, local, dur, p: clamp(local / dur), script, tl, brand, f };
}

export function drawReel(ctx: Ctx, template: ReelTemplate, fr: Frame) {
  const tpl = TEMPLATES[template];
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  tpl.bg(ctx, fr);
  ctx.restore();
  ctx.save();
  if (fr.scene) tpl.scene(ctx, fr, fr.scene);
  else outro(ctx, fr, tpl.palette, fr.f.sans);
  ctx.restore();
}

export const REEL_MOOD = (t: ReelTemplate) => REEL_TEMPLATES[t].mood;

/** Чат загварт мессеж гарах мөчүүд — дуунд "поп" эффект тавина */
export function reelPopTimes(template: ReelTemplate, script: ReelScript, tl: ReelTimeline) {
  return template === "chat" ? chatMessages(script, tl).map((m) => m.at) : [];
}

/** Canvas-д ашиглах фонтуудыг (кирилл хэсгийг оролцуулан) урьдчилан ачаална */
export async function loadReelFonts(): Promise<ReelFonts> {
  const css = getComputedStyle(document.documentElement);
  const sans = `${css.getPropertyValue("--font-geist").trim() || "system-ui"}, system-ui, sans-serif`;
  const mono = `${css.getPropertyValue("--font-geist-mono").trim() || "ui-monospace"}, ui-monospace, monospace`;
  const sample = "Өө Үү Аа Яя Шуурхай 0123";
  await Promise.allSettled(
    [400, 500, 600, 700, 800].flatMap((w) => [document.fonts.load(`${w} 40px ${sans}`, sample), document.fonts.load(`${w} 40px ${mono}`, sample)]),
  );
  return { sans, mono };
}
