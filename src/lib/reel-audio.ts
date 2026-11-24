/**
 * Reels-ийн дуу: хөгжим (WebAudio-гоор нийлэгжүүлсэн), шилжилтийн эффект, монгол хоолой —
 * бүгдийг OfflineAudioContext-оор нэг AudioBuffer болгон урьдчилан бичнэ. Үзүүлэх, бичих үед
 * энэ buffer-ийг тоглуулж, түүний цагаар зургаа зурна (дуу, зураг зөрөхгүй).
 */
import { VOICE_DELAY, type ReelMood, type ReelTimeline } from "./reel";

const SR = 44100;

interface MoodSpec {
  bpm: number;
  /** MIDI дугаар */
  root: number;
  minor: boolean;
  /** Хэмжүүр бүрийн аккорд (гаммын алхам) */
  prog: number[];
  kick: "four" | "half" | "none";
  hat: boolean;
  bass: "quarter" | "eighth" | "none";
  arp: "eighth" | "sixteenth" | "none";
  pad: boolean;
  drone: boolean;
  wave: OscillatorType;
  sfx: "whoosh" | "blip" | "pop" | "boom" | "page";
}

const MOODS: Record<ReelMood, MoodSpec> = {
  upbeat: { bpm: 112, root: 57, minor: false, prog: [0, 4, 5, 3], kick: "four", hat: true, bass: "quarter", arp: "eighth", pad: false, drone: false, wave: "square", sfx: "whoosh" },
  synth: { bpm: 100, root: 50, minor: true, prog: [0, 5, 3, 4], kick: "half", hat: true, bass: "eighth", arp: "sixteenth", pad: true, drone: false, wave: "sawtooth", sfx: "blip" },
  urgent: { bpm: 124, root: 52, minor: true, prog: [0, 0, 5, 4], kick: "four", hat: true, bass: "eighth", arp: "none", pad: true, drone: false, wave: "sawtooth", sfx: "whoosh" },
  light: { bpm: 96, root: 60, minor: false, prog: [0, 3, 4, 0], kick: "half", hat: false, bass: "quarter", arp: "eighth", pad: false, drone: false, wave: "triangle", sfx: "pop" },
  epic: { bpm: 70, root: 45, minor: true, prog: [0, 5, 2, 6], kick: "none", hat: false, bass: "none", arp: "none", pad: true, drone: true, wave: "sawtooth", sfx: "boom" },
  soft: { bpm: 84, root: 55, minor: false, prog: [0, 5, 3, 4], kick: "none", hat: false, bass: "quarter", arp: "eighth", pad: true, drone: false, wave: "triangle", sfx: "page" },
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const MINOR = [0, 2, 3, 5, 7, 8, 10];
const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

/** Гаммын алхам → хагас тон (октав давбал 12 нэмнэ) */
function step(scale: number[], degree: number) {
  const oct = Math.floor(degree / scale.length);
  return scale[((degree % scale.length) + scale.length) % scale.length] + oct * 12;
}

export interface SoundtrackInput {
  tl: ReelTimeline;
  mood: ReelMood;
  music: boolean;
  /** i-р кадрын хоолой (байхгүй бол null) */
  voices: (AudioBuffer | null)[] | null;
  /** Чат загварт мессеж гарах мөчүүд — "поп" дуу */
  popTimes?: number[];
}

export async function renderSoundtrack({ tl, mood, music, voices, popTimes = [] }: SoundtrackInput): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.max(1, Math.ceil(tl.total * SR)), SR);
  const spec = MOODS[mood];
  const hasVoice = Boolean(voices?.some(Boolean));

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -12;
  comp.ratio.value = 4;
  const master = ctx.createGain();
  master.gain.setValueAtTime(1, 0);
  master.gain.setValueAtTime(1, Math.max(0, tl.total - 0.9));
  master.gain.linearRampToValueAtTime(0, tl.total);
  master.connect(comp).connect(ctx.destination);

  const musicBus = ctx.createGain();
  musicBus.gain.value = hasVoice ? 0.16 : 0.32;
  musicBus.connect(master);
  const sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.5;
  sfxBus.connect(master);

  const noise = ctx.createBuffer(1, SR, SR);
  const nd = noise.getChannelData(0);
  for (let k = 0; k < nd.length; k++) nd[k] = Math.random() * 2 - 1;

  /** Богино нот: осциллятор → (шүүлтүүр) → дугтуй */
  function note(t: number, f: number, dur: number, gain: number, wave: OscillatorType, cutoff?: number, out: AudioNode = musicBus) {
    const o = ctx.createOscillator();
    o.type = wave;
    o.frequency.setValueAtTime(f, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node: AudioNode = o;
    if (cutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = cutoff;
      node = o.connect(lp);
    }
    node.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noiseHit(t: number, dur: number, gain: number, type: BiquadFilterType, f0: number, f1 = f0, q = 1, out: AudioNode = sfxBus) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = type;
    bp.Q.value = q;
    bp.frequency.setValueAtTime(f0, t);
    bp.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }

  function kick(t: number) {
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(musicBus);
    o.start(t);
    o.stop(t + 0.3);
  }

  if (music) {
    const scale = spec.minor ? MINOR : MAJOR;
    const beat = 60 / spec.bpm;
    const bar = beat * 4;
    if (spec.drone) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = freq(spec.root - 12);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, 0);
      g.gain.exponentialRampToValueAtTime(0.35, 1.5);
      o.connect(g).connect(musicBus);
      o.start(0);
      o.stop(tl.total);
    }
    for (let b = 0; b * bar < tl.total; b++) {
      const t0 = b * bar;
      const degree = spec.prog[b % spec.prog.length];
      const chord = [0, 2, 4].map((k) => spec.root + step(scale, degree + k));
      if (spec.pad) {
        for (const m of chord) {
          for (const detune of [-7, 7]) {
            const o = ctx.createOscillator();
            o.type = spec.wave;
            o.frequency.value = freq(m);
            o.detune.value = detune;
            const lp = ctx.createBiquadFilter();
            lp.type = "lowpass";
            lp.frequency.value = 1300;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t0);
            g.gain.exponentialRampToValueAtTime(0.035, t0 + Math.min(0.8, bar / 3));
            g.gain.setValueAtTime(0.035, t0 + bar - 0.2);
            g.gain.exponentialRampToValueAtTime(0.0001, t0 + bar + 0.1);
            o.connect(lp).connect(g).connect(musicBus);
            o.start(t0);
            o.stop(t0 + bar + 0.15);
          }
        }
      }
      for (let k = 0; k < 4; k++) {
        const t = t0 + k * beat;
        if (t >= tl.total) break;
        if (spec.kick === "four" || (spec.kick === "half" && k % 2 === 0)) kick(t);
        if (spec.hat) noiseHit(t + beat / 2, 0.06, 0.12, "highpass", 7000, 7000, 0.7, musicBus);
        const bassNote = freq(chord[0] - 12);
        if (spec.bass === "quarter") note(t, bassNote, beat * 0.85, 0.32, "triangle", 600);
        if (spec.bass === "eighth") {
          note(t, bassNote, beat * 0.42, 0.3, "sawtooth", 420);
          note(t + beat / 2, bassNote, beat * 0.42, 0.24, "sawtooth", 420);
        }
        const div = spec.arp === "eighth" ? 2 : spec.arp === "sixteenth" ? 4 : 0;
        for (let s = 0; s < div; s++) {
          const m = chord[(k * div + s) % 3] + 12;
          note(t + (s * beat) / div, freq(m), 0.18, 0.07, spec.wave, 2600);
        }
      }
    }
  }

  // Кадр солигдох эффект
  tl.starts.concat(tl.outroStart).forEach((t, i) => {
    if (spec.sfx === "whoosh" && i > 0) noiseHit(Math.max(0, t - 0.12), 0.42, 0.35, "bandpass", 300, 3200, 1.2);
    if (spec.sfx === "blip") {
      note(t, 1320, 0.07, 0.16, "sine", undefined, sfxBus);
      note(t + 0.09, 1760, 0.08, 0.12, "sine", undefined, sfxBus);
    }
    if (spec.sfx === "boom" && i > 0) {
      const o = ctx.createOscillator();
      o.frequency.setValueAtTime(70, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 1.2);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.9, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      o.connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 1.6);
      noiseHit(t, 0.5, 0.3, "lowpass", 400, 120, 0.7);
    }
    if (spec.sfx === "page" && i > 0) noiseHit(t, 0.28, 0.16, "bandpass", 2200, 1400, 0.8);
  });
  for (const t of popTimes) {
    if (t >= tl.total) continue;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(520, t);
    o.frequency.exponentialRampToValueAtTime(980, t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g).connect(sfxBus);
    o.start(t);
    o.stop(t + 0.12);
  }

  // Хоолой
  voices?.forEach((buf, i) => {
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(master);
    src.start(tl.starts[i] + VOICE_DELAY);
  });

  return ctx.startRendering();
}

/** Серверээс ирсэн mp3-ыг AudioBuffer болгоно (хэрэглэгчийн товшилт шаардахгүй) */
export async function decodeVoice(blob: Blob): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, 1, SR);
  return ctx.decodeAudioData(await blob.arrayBuffer());
}
