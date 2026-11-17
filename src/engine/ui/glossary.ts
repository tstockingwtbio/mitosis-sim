import { h } from '../dom';
import { t } from '../../i18n';

let pop: HTMLElement | null = null;
let returnFocus: HTMLElement | null = null;

function close(): void {
  if (!pop) return;
  pop.remove();
  pop = null;
  document.removeEventListener('keydown', onKey, true);
  document.removeEventListener('pointerdown', onOutside, true);
  returnFocus?.focus();
  returnFocus = null;
}

function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') {
    e.stopPropagation();
    close();
  }
}

function onOutside(e: PointerEvent): void {
  if (pop && !pop.contains(e.target as Node)) close();
}

export function openGlossary(term: string, word: string, anchor: HTMLElement): void {
  close();
  returnFocus = anchor;
  const closeBtn = h('button', { class: 'btn', type: 'button', onclick: close }, t('ui.close'));
  pop = h(
    'div',
    { class: 'gloss-pop', role: 'dialog', 'aria-label': t('glossary.title') },
    h('h3', {}, word),
    h('p', {}, t(`glossary.${term}`)),
    closeBtn,
  );
  document.body.appendChild(pop);
  const r = anchor.getBoundingClientRect();
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  let left = Math.min(window.innerWidth - pw - 8, Math.max(8, r.left));
  let top = r.bottom + 8;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 8);
  if (document.documentElement.dir === 'rtl') left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.right - pw));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
  closeBtn.focus();
  document.addEventListener('keydown', onKey, true);
  setTimeout(() => document.addEventListener('pointerdown', onOutside, true), 0);
}

export function closeGlossary(): void {
  close();
}
