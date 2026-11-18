import { h } from '../dom';
import { stripTags, t, tEn, isTranslated, currentLang, currentLevel, getDict } from '../../i18n';
import { getSettings } from '../settings';
import { openGlossary } from './glossary';

export interface WordSpan {
  start: number;
  end: number;
  el: HTMLElement;
}

export interface Spoken {
  el: HTMLElement;
  /** Exactly the text the speech engine will read. */
  text: string;
  spans: WordSpan[];
  lang: string;
  /** Recorded file for this text, if one may exist (fixed text only, no {numbers}). */
  audio?: string;
}

/** File name slot for recorded panel text: mm_txt_<key>_<lang>_<level>.mp3 */
export function textAudioFile(key: string, lang: string, level: 'building' | 'beginning'): string {
  return `mm_txt_${key.replace(/[^A-Za-z0-9]+/g, '-')}_${lang}_${level}.mp3`;
}

const GLOSSARY_TERMS = ['cell', 'tissue', 'nucleus', 'dna', 'chromosome', 'gene', 'pair', 'centromere', 'copy', 'version'];

let wordIndex: Map<string, string> | null = null;
let wordIndexLang = '';

function glossaryIndex(): Map<string, string> {
  const lang = currentLang().code;
  if (wordIndex && wordIndexLang === lang) return wordIndex;
  wordIndex = new Map();
  wordIndexLang = lang;
  for (const term of GLOSSARY_TERMS) {
    for (const w of t(`glossary.words.${term}`).split('|')) wordIndex.set(w.toLocaleLowerCase(), term);
  }
  return wordIndex;
}

/**
 * Render text as word spans (for read-aloud highlighting) with glossary
 * words as tappable buttons.
 */
export function renderWords(text: string, tag: 'p' | 'span' | 'div' = 'p', glossary = true): Spoken {
  const clean = stripTags(text);
  // dir=auto: English fallback text keeps its own direction inside a right-to-left layout.
  const el = h(tag, { dir: 'auto' });
  const spans: WordSpan[] = [];
  const index = glossary && getSettings().glossary ? glossaryIndex() : null;
  const re = /\S+/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clean))) {
    if (m.index > last) el.appendChild(document.createTextNode(clean.slice(last, m.index)));
    const token = m[0];
    const core = token.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/u)?.[0] ?? '';
    const span = h('span', { class: 'w' }, token);
    const term = index && core ? index.get(core.toLocaleLowerCase()) : undefined;
    if (term) {
      const btn = h('button', { class: 'gloss', type: 'button', onclick: () => openGlossary(term, core, btn) }, span);
      el.appendChild(btn);
    } else {
      el.appendChild(span);
    }
    spans.push({ start: m.index, end: m.index + token.length, el: span });
    last = m.index + token.length;
  }
  if (last < clean.length) el.appendChild(document.createTextNode(clean.slice(last)));
  return { el, text: clean, spans, lang: currentLang().speech };
}

/**
 * A translated paragraph for key, with the English version underneath when
 * side-by-side is on and the language is not English.
 */
export function paragraph(key: string, vars?: Record<string, string | number>, tag: 'p' | 'span' | 'div' = 'p'): Spoken {
  const spoken = renderWords(t(key, vars), tag);
  const s = getSettings();
  const lang = currentLang();
  if (s.sideBySide && lang.code !== 'en' && isTranslated(key)) {
    const side = h('span', { class: 'side', lang: 'en', dir: 'ltr' }, stripTags(tEn(key, vars)));
    spoken.el.appendChild(side);
  }
  spoken.el.setAttribute('lang', lang.code);
  if (!vars) {
    const entry = getDict('en')[key] as { beginning?: string } | string | undefined;
    const hasBeginning = typeof entry === 'object' && !!entry.beginning;
    const level = currentLevel() === 'beginning' && hasBeginning ? 'beginning' : 'building';
    spoken.audio = `audio/txt/${textAudioFile(key, lang.code, level)}`;
  }
  return spoken;
}
