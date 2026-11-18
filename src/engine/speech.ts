// Read-aloud: a recorded voice-over file when one exists, otherwise the
// browser's built-in speech (Web Speech API). One voice at a time.

export interface SpeakOptions {
  lang: string;
  rate: number;
  /** Recorded file to try first. */
  audioUrl?: string;
  onWord?: (start: number, end: number) => void;
}

import { fileExists } from './assets';

const synth: SpeechSynthesis | null = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

let voices: SpeechSynthesisVoice[] = [];
function loadVoices(): void {
  if (synth) voices = synth.getVoices();
}
if (synth) {
  loadVoices();
  synth.addEventListener?.('voiceschanged', loadVoices);
}

function pickVoice(lang: string): SpeechSynthesisVoice | undefined {
  if (!voices.length) loadVoices();
  const lower = lang.toLowerCase();
  const base = lower.split('-')[0];
  const exact = voices.filter((v) => v.lang.toLowerCase().replace('_', '-') === lower);
  const near = voices.filter((v) => v.lang.toLowerCase().startsWith(base));
  const pool = exact.length ? exact : near;
  // Prefer natural-sounding voices (closest to the recorded narrator), then
  // local ones (they send word-boundary events for highlighting; the
  // highlighter falls back to timing when they don't).
  const natural = /natural|neural|online|google|enhanced|premium|siri|samantha/i;
  const male = /\b(male|guy|david|mark|james|daniel|aaron|andrew|brian|christopher|eric|guy|roger|steffan)\b/i;
  return (
    pool.find((v) => natural.test(v.name) && male.test(v.name)) ??
    pool.find((v) => natural.test(v.name)) ??
    pool.find((v) => v.localService) ??
    pool[0]
  );
}

let token = 0;
let audio: HTMLAudioElement | null = null;
let estimator: number | null = null;
let finish: (() => void) | null = null;

export function speechSupported(): boolean {
  return !!synth;
}

export function isSpeaking(): boolean {
  return finish !== null;
}

export function stopSpeaking(): void {
  token++;
  if (estimator !== null) window.clearInterval(estimator);
  estimator = null;
  if (audio) {
    audio.pause();
    audio = null;
  }
  try {
    synth?.cancel();
  } catch {
    /* ignore */
  }
  const f = finish;
  finish = null;
  f?.();
}

function wordRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) out.push([m.index, m.index + m[0].length]);
  return out;
}

/** Fallback highlighting when no boundary events arrive: estimate by time. */
function startEstimator(text: string, rate: number, onWord: (s: number, e: number) => void, durationMs?: () => number): void {
  const words = wordRanges(text);
  const started = performance.now();
  const charsPerMs = 0.0145 * rate;
  let lastIdx = -1;
  estimator = window.setInterval(() => {
    const elapsed = performance.now() - started;
    let charPos: number;
    const d = durationMs?.();
    if (d && isFinite(d) && d > 0) charPos = (elapsed / d) * text.length;
    else charPos = elapsed * charsPerMs;
    let idx = words.findIndex(([, e]) => e > charPos);
    if (idx < 0) idx = words.length - 1;
    if (idx !== lastIdx && words[idx]) {
      lastIdx = idx;
      onWord(words[idx][0], words[idx][1]);
    }
  }, 90);
}

export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  stopSpeaking();
  const my = ++token;
  if (opts.audioUrl && (await fileExists(opts.audioUrl, 'audio'))) {
    if (my !== token) return;
    return new Promise<void>((resolve) => {
      finish = resolve;
      const a = new Audio(opts.audioUrl);
      audio = a;
      a.playbackRate = opts.rate;
      a.addEventListener('ended', () => my === token && stopSpeaking());
      a.addEventListener('error', () => my === token && stopSpeaking());
      if (opts.onWord) startEstimator(text, opts.rate, opts.onWord, () => (a.duration * 1000) / opts.rate);
      a.play().catch(() => my === token && stopSpeaking());
    });
  }
  if (!synth) return;
  return new Promise<void>((resolve) => {
    finish = resolve;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = opts.lang;
    u.rate = opts.rate;
    const v = pickVoice(opts.lang);
    if (v) u.voice = v;
    let gotBoundary = false;
    u.onboundary = (e) => {
      if (my !== token || e.name === 'sentence') return;
      gotBoundary = true;
      if (estimator !== null) {
        window.clearInterval(estimator);
        estimator = null;
      }
      const start = e.charIndex;
      const len = (e as SpeechSynthesisEvent & { charLength?: number }).charLength;
      const end = len ? start + len : (text.slice(start).search(/\s|$/) + start);
      opts.onWord?.(start, end);
    };
    u.onstart = () => {
      if (my !== token || !opts.onWord) return;
      window.setTimeout(() => {
        if (my === token && !gotBoundary && estimator === null && finish) startEstimator(text, opts.rate, opts.onWord!);
      }, 500);
    };
    u.onend = () => my === token && stopSpeaking();
    u.onerror = () => my === token && stopSpeaking();
    // Chrome sometimes stays paused after a cancel; resume first.
    try {
      synth.resume();
    } catch {
      /* ignore */
    }
    synth.speak(u);
  });
}
