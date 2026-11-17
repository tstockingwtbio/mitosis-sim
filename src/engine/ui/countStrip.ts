import { h } from '../dom';
import { t } from '../../i18n';

export interface CountState {
  chromosomes: number | null;
  dnaMolecules: number | null;
  /** null = no parent cell to compare with. */
  same: boolean | null;
  /** Hide numbers while the student is counting. */
  hidden?: boolean;
}

export class CountStrip {
  readonly el: HTMLElement;
  private chromo: HTMLElement;
  private dna: HTMLElement;
  private same: HTMLElement;
  private live: HTMLElement;
  private labels: HTMLElement[];
  private state: CountState = { chromosomes: null, dnaMolecules: null, same: null };

  constructor() {
    this.chromo = h('span', { class: 'value' });
    this.dna = h('span', { class: 'value' });
    this.same = h('span', { class: 'value' });
    this.labels = [h('span', { class: 'label' }), h('span', { class: 'label' }), h('span', { class: 'label' })];
    this.live = h('div', { class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    this.el = h(
      'section',
      { class: 'count-strip', role: 'group' },
      h('div', { class: 'count-cell', 'data-k': 'c' }, this.labels[0], this.chromo),
      h('div', { class: 'count-cell', 'data-k': 'd' }, this.labels[1], this.dna),
      h('div', { class: 'count-cell', 'data-k': 's' }, this.labels[2], this.same),
      this.live,
    );
    this.relabel();
  }

  relabel(): void {
    this.el.setAttribute('aria-label', t('ui.count.region'));
    this.labels[0].textContent = t('ui.count.chromosomes');
    this.labels[1].textContent = t('ui.count.dna');
    this.labels[2].textContent = t('ui.count.same');
    this.render(false);
  }

  set(next: CountState): void {
    const prev = this.state;
    this.state = next;
    const changed = prev.chromosomes !== next.chromosomes || prev.dnaMolecules !== next.dnaMolecules || prev.same !== next.same || prev.hidden !== next.hidden;
    if (changed) this.render(true, prev);
  }

  private render(announce: boolean, prev?: CountState): void {
    const s = this.state;
    const num = (el: HTMLElement, v: number | null) => {
      el.className = 'value';
      if (s.hidden) {
        el.textContent = '?';
        el.setAttribute('title', t('ui.count.hidden'));
        el.setAttribute('aria-label', t('ui.count.hidden'));
      } else {
        el.textContent = v == null ? '—' : String(v);
        el.removeAttribute('title');
        el.removeAttribute('aria-label');
      }
    };
    num(this.chromo, s.chromosomes);
    num(this.dna, s.dnaMolecules);
    if (s.same == null) {
      this.same.className = 'value small';
      this.same.textContent = t('ui.count.none');
    } else {
      this.same.className = 'value';
      this.same.textContent = s.same ? `✓ ${t('ui.count.yes')}` : `✗ ${t('ui.count.no')}`;
    }
    if (prev && !s.hidden) {
      if (prev.chromosomes !== s.chromosomes) this.flash('c');
      if (prev.dnaMolecules !== s.dnaMolecules) this.flash('d');
      if (prev.same !== s.same) this.flash('s');
    }
    if (announce && !s.hidden && s.chromosomes != null && s.dnaMolecules != null) {
      this.live.textContent = t('ui.count.announce', { c: s.chromosomes, d: s.dnaMolecules });
    }
  }

  private flash(k: string): void {
    const cell = this.el.querySelector<HTMLElement>(`[data-k="${k}"]`);
    if (!cell) return;
    cell.classList.remove('flash');
    void cell.offsetWidth;
    cell.classList.add('flash');
  }
}
