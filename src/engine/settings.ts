import { readJSON, writeJSON } from './storage';
import { layoutDir, setLanguage, type Level } from '../i18n';

export interface Settings {
  readAloud: boolean;
  speechRate: number;
  highlightWords: boolean;
  textSize: '100' | '125' | '150';
  lang: string;
  level: Level;
  sideBySide: boolean;
  glossary: boolean;
  hints: boolean;
  worked: 'all' | 'fade';
  frames: 'off' | 'frames' | 'bank';
  fewerChoices: boolean;
  goFurther: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  largeButtons: boolean;
  sfx: boolean;
  ambience: boolean;
  captions: boolean;
}

const KEY = 'mm.settings.v1';

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function defaults(): Settings {
  return {
    readAloud: false,
    speechRate: 1,
    highlightWords: true,
    textSize: '100',
    lang: 'en',
    level: 'building',
    sideBySide: false,
    glossary: true,
    hints: true,
    worked: 'fade',
    frames: 'frames',
    fewerChoices: false,
    goFurther: false,
    highContrast: false,
    reducedMotion: prefersReducedMotion(),
    largeButtons: false,
    sfx: true,
    ambience: true,
    captions: true,
  };
}

type Listener = (s: Settings, changed: (keyof Settings)[]) => void;

let current: Settings = { ...defaults(), ...readJSON<Partial<Settings>>(KEY, {}) };
const listeners = new Set<Listener>();

export function getSettings(): Settings {
  return current;
}

export function updateSettings(patch: Partial<Settings>): void {
  const changed = (Object.keys(patch) as (keyof Settings)[]).filter((k) => patch[k] !== current[k]);
  if (!changed.length) return;
  current = { ...current, ...patch };
  writeJSON(KEY, current);
  applySettings();
  for (const l of listeners) l(current, changed);
}

export function resetSettings(): void {
  current = defaults();
  writeJSON(KEY, current);
  applySettings();
  for (const l of listeners) l(current, Object.keys(current) as (keyof Settings)[]);
}

export function onSettings(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function applySettings(): void {
  const s = current;
  setLanguage(s.lang, s.level);
  const root = document.documentElement;
  root.lang = s.level === 'english' ? 'en' : s.lang;
  root.dir = layoutDir();
  root.dataset.text = s.textSize;
  root.dataset.contrast = String(s.highContrast);
  root.dataset.motion = s.reducedMotion ? 'reduce' : 'full';
  root.dataset.big = String(s.largeButtons);
}
