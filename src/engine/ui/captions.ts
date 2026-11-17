import { clear, h } from '../dom';
import { currentLang, currentLevel, t, voKey } from '../../i18n';
import { getSettings } from '../settings';
import { voUrl } from '../assets';
import { paragraph, type Spoken } from './text';
import { readAloud, stopReading } from './reader';

/**
 * Caption bar for narrated lines (voice-over IDs from the story bible).
 * Every narrated line is shown as a caption; read-aloud plays it.
 */
export class Captions {
  readonly el: HTMLElement;
  private textEl: HTMLElement;
  private readBtn: HTMLButtonElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private lineOf: HTMLElement;
  private lines: string[] = [];
  private index = 0;
  private reading = false;
  private autoAdvance = true;
  private listeners = new Set<(i: number) => void>();
  private spoken: Spoken | null = null;

  constructor() {
    this.readBtn = h('button', { class: 'btn icon', type: 'button', onclick: () => this.toggleRead() });
    this.prevBtn = h('button', { class: 'btn icon', type: 'button', onclick: () => this.go(this.index - 1, true) });
    this.nextBtn = h('button', { class: 'btn icon', type: 'button', onclick: () => this.go(this.index + 1, true) });
    this.textEl = h('div', { class: 'text', 'aria-live': 'polite' });
    this.lineOf = h('span', { class: 'line-of' });
    this.el = h(
      'section',
      { class: 'captions', hidden: true },
      this.readBtn,
      this.textEl,
      h('div', { class: 'lines' }, this.prevBtn, this.lineOf, this.nextBtn),
    );
    this.relabel();
  }

  onChange(fn: (i: number) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  relabel(): void {
    this.el.setAttribute('aria-label', t('ui.cap.region'));
    this.setReadButton();
    this.prevBtn.setAttribute('aria-label', t('ui.cap.prev'));
    this.prevBtn.title = t('ui.cap.prev');
    this.prevBtn.innerHTML = '<span class="ico flip" aria-hidden="true">◀</span>';
    this.nextBtn.setAttribute('aria-label', t('ui.cap.next'));
    this.nextBtn.title = t('ui.cap.next');
    this.nextBtn.innerHTML = '<span class="ico flip" aria-hidden="true">▶</span>';
    if (this.lines.length) this.render();
  }

  private setReadButton(): void {
    const label = this.reading ? t('ui.cap.stop') : t('ui.cap.read');
    this.readBtn.setAttribute('aria-label', label);
    this.readBtn.title = label;
    this.readBtn.innerHTML = `<span class="ico" aria-hidden="true">${this.reading ? '■' : '🔊'}</span>`;
  }

  /** Show a set of narrated lines. autoAdvance: read the next line when one ends. */
  setLines(lines: string[], opts: { autoAdvance?: boolean; autoplay?: boolean } = {}): void {
    this.stop();
    this.lines = lines;
    this.index = 0;
    this.autoAdvance = opts.autoAdvance ?? true;
    this.el.hidden = !lines.length || !getSettings().captions;
    if (!lines.length) {
      clear(this.textEl);
      return;
    }
    this.render();
    if (opts.autoplay ?? getSettings().readAloud) void this.read();
  }

  clearLines(): void {
    this.setLines([]);
  }

  current(): number {
    return this.index;
  }

  go(i: number, speakIt = false): void {
    if (!this.lines.length) return;
    const next = Math.max(0, Math.min(this.lines.length - 1, i));
    const changed = next !== this.index;
    this.stop();
    this.index = next;
    this.render();
    if (changed) for (const l of this.listeners) l(this.index);
    if (speakIt && getSettings().readAloud) void this.read();
  }

  private render(): void {
    clear(this.textEl);
    const spoken = paragraph(voKey(this.lines[this.index]), undefined, 'div');
    this.textEl.appendChild(spoken.el);
    this.lineOf.textContent = t('ui.cap.lineOf', { n: this.index + 1, total: this.lines.length });
    this.prevBtn.disabled = this.index === 0;
    this.nextBtn.disabled = this.index >= this.lines.length - 1;
    this.el.hidden = !getSettings().captions;
    this.spoken = spoken;
  }

  private async read(): Promise<void> {
    const spoken = this.spoken;
    if (!spoken) return;
    this.reading = true;
    this.setReadButton();
    const lvl = currentLevel() === 'beginning' ? 'beginning' : 'building';
    const lang = currentLang().code;
    const finished = await readAloud([spoken], [voUrl(this.lines[this.index], lang, lvl)]);
    this.reading = false;
    this.setReadButton();
    if (finished && this.autoAdvance && this.index < this.lines.length - 1) {
      this.index++;
      this.render();
      for (const l of this.listeners) l(this.index);
      void this.read();
    }
  }

  private toggleRead(): void {
    if (this.reading) this.stop();
    else void this.read();
  }

  stop(): void {
    if (this.reading) stopReading();
    this.reading = false;
    this.setReadButton();
  }

  /** Re-read the caption setting (show or hide the bar). */
  refreshVisibility(): void {
    this.el.hidden = !this.lines.length || !getSettings().captions;
  }

  /** Text for the panel when captions are off (narration must stay available). */
  lineKeys(): string[] {
    return this.lines.map(voKey);
  }
}
