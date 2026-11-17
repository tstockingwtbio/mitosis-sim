// All visible text goes through t(). Entries are either a plain string or
// { building, beginning }. Missing translations fall back to English.

export type Entry = string | { building?: string; beginning?: string };
export type Dict = Record<string, Entry | Record<string, string>>;
export type Level = 'beginning' | 'building' | 'english';
export type Dir = 'ltr' | 'rtl';

export interface LangInfo {
  code: string;
  /** Name in its own script, then English, so anyone can find their language. */
  label: string;
  dir: Dir;
  /** BCP-47 tag for the Web Speech API. */
  speech: string;
}

export const LANGUAGES: LangInfo[] = [
  { code: 'en', label: 'English', dir: 'ltr', speech: 'en-US' },
  { code: 'es', label: 'Español (Spanish)', dir: 'ltr', speech: 'es-US' },
  { code: 'prs', label: 'دری (Dari)', dir: 'rtl', speech: 'fa-AF' },
  { code: 'fa', label: 'فارسی (Farsi)', dir: 'rtl', speech: 'fa-IR' },
  { code: 'ps', label: 'پښتو (Pashto)', dir: 'rtl', speech: 'ps-AF' },
  { code: 'ar', label: 'العربية (Arabic)', dir: 'rtl', speech: 'ar-SA' },
  { code: 'ru', label: 'Русский (Russian)', dir: 'ltr', speech: 'ru-RU' },
  { code: 'vi', label: 'Tiếng Việt (Vietnamese)', dir: 'ltr', speech: 'vi-VN' },
  { code: 'sw', label: 'Kiswahili (Swahili)', dir: 'ltr', speech: 'sw-KE' },
];

const modules = import.meta.glob<Dict>('./*.json', { eager: true, import: 'default' });
const dicts: Record<string, Dict> = {};
for (const [path, dict] of Object.entries(modules)) {
  const code = path.replace('./', '').replace('.json', '');
  dicts[code] = dict;
}

export function getDict(code: string): Dict {
  return dicts[code] ?? {};
}

let lang = 'en';
let level: Level = 'building';

export function setLanguage(code: string, lvl: Level): void {
  lang = dicts[code] ? code : 'en';
  level = lvl;
}

export function currentLang(): LangInfo {
  const code = level === 'english' ? 'en' : lang;
  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
}

/** Layout direction follows the chosen language even when text falls back. */
export function layoutDir(): Dir {
  return LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr';
}

export function languageInfo(code: string): LangInfo | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

function pick(entry: Entry | undefined, lvl: Level): string | undefined {
  if (entry == null) return undefined;
  if (typeof entry === 'string') return entry;
  if (lvl === 'beginning') return entry.beginning ?? entry.building;
  return entry.building ?? entry.beginning;
}

function raw(dict: Dict, key: string): Entry | undefined {
  const v = dict[key];
  if (v == null || key === '_meta') return undefined;
  return v as Entry;
}

function format(text: string, vars?: Record<string, string | number>): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export function hasKey(key: string): boolean {
  return raw(dicts.en, key) !== undefined;
}

/** True when the chosen language has its own text for this key. */
export function isTranslated(key: string): boolean {
  if (lang === 'en' || level === 'english') return true;
  return raw(dicts[lang] ?? {}, key) !== undefined;
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const useLevel: Level = level === 'english' ? 'building' : level;
  let text: string | undefined;
  if (level !== 'english' && lang !== 'en') text = pick(raw(dicts[lang] ?? {}, key), useLevel);
  if (text === undefined) text = pick(raw(dicts.en, key), useLevel);
  if (text === undefined) {
    if (import.meta.env.DEV) console.warn(`[i18n] missing key: ${key}`);
    return `⟦${key}⟧`;
  }
  return format(text, vars);
}

/** English text at the current level, for side-by-side display. */
export function tEn(key: string, vars?: Record<string, string | number>): string {
  const useLevel: Level = level === 'beginning' ? 'beginning' : 'building';
  return format(pick(raw(dicts.en, key), useLevel) ?? key, vars);
}

/** Voice-over direction tags like [dry] or [pause] are for the recording only. */
export function stripTags(text: string): string {
  return text.replace(/\s*\[[^\]]+\]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

export function voKey(voId: string): string {
  return `vo.${voId}`;
}

export function currentLevel(): Level {
  return level;
}
