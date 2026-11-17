import type { PartContent, Task, WorkedAction } from '../../content/schema';
import { clear, h } from '../dom';
import { t } from '../../i18n';
import { getSettings } from '../settings';
import { progress, saveProgress } from '../progress';
import { paragraph, renderWords, type Spoken } from '../ui/text';
import { readAloud } from '../ui/reader';
import { playSfx } from '../sfx';
import type { StepContext } from '../types';

export const MAX_ATTEMPTS = 3;

export function supportsOn(task: Task): boolean {
  return task.phase !== 'checkpoint';
}

/** Speak a feedback box when read-aloud is on. */
export function speakIfOn(items: Spoken[]): void {
  if (getSettings().readAloud) void readAloud(items);
}

export function feedback(
  content: PartContent,
  kind: 'good' | 'warn',
  textKey: string,
  misconception?: string,
  vars?: Record<string, string | number>,
): { el: HTMLElement; spoken: Spoken[] } {
  const spoken: Spoken[] = [];
  const lead = renderWords(kind === 'good' ? t('ui.task.correct') : t('ui.task.notYet'), 'p', false);
  lead.el.style.fontWeight = '700';
  spoken.push(lead);
  const body = h('div', {}, lead.el);
  if (misconception && content.misconceptions[misconception]) {
    const mix = renderWords(`${t('ui.task.mixup')} “${t(content.misconceptions[misconception])}”`, 'p', false);
    mix.el.classList.add('mixup');
    spoken.push(mix);
    body.appendChild(mix.el);
  }
  const main = paragraph(textKey, vars);
  spoken.push(main);
  body.appendChild(main.el);
  const el = h(
    'div',
    { class: `feedback ${kind}`, role: 'status' },
    h('span', { class: 'mark', 'aria-hidden': 'true' }, kind === 'good' ? '✓' : '✗'),
    body,
  );
  playSfx(kind === 'good' ? 'SFX-04' : 'SFX-05');
  return { el, spoken };
}

/**
 * Supports for one task: worked steps (fading), hint ladder, sentence
 * starters with an optional word bank, and an explain box.
 */
export class Supports {
  /** Hints and the explain box: goes after the answer controls. */
  readonly el: HTMLElement;
  /** Worked steps: goes before the answer controls (example first, then attempt). */
  readonly top: HTMLElement;
  private hintList: HTMLOListElement | null = null;
  private hintBtn: HTMLButtonElement | null = null;
  private hintsShown: number;

  constructor(
    private ctx: StepContext,
    private task: Task,
    private onAction: (a: WorkedAction) => void,
  ) {
    this.el = h('div', { class: 'supports', style: { display: 'grid', gap: 'var(--gap)' } });
    this.top = h('div', { class: 'supports-top', style: { display: 'grid', gap: 'var(--gap)' } });
    const memo = ctx.memo;
    this.hintsShown = (memo.hints as number) ?? 0;
    const s = getSettings();
    const on = supportsOn(task);

    // Worked steps (guided practice only; independent practice has none).
    if (on && task.phase === 'guided' && 'worked' in task && task.worked?.length) {
      const total = task.worked.length;
      const faded = s.worked === 'all' ? 0 : Math.min(total, progress().fade);
      const shownDefault = total - faded;
      this.top.appendChild(this.workedCard(task.worked, [], shownDefault, 'worked'));
    }

    // Hint ladder.
    if (on && s.hints && 'hints' in task && task.hints?.length) {
      this.hintList = h('ol', { class: 'hints', style: { margin: '0', paddingInlineStart: '1.4em', display: 'grid', gap: '6px' } }) as HTMLOListElement;
      this.hintBtn = h('button', { class: 'btn', type: 'button', onclick: () => this.nextHint(true) }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '💡'), t('ui.task.hint'));
      const card = h('div', { class: 'card' }, this.hintBtn, this.hintList);
      this.el.appendChild(card);
      for (let i = 0; i < this.hintsShown; i++) this.renderHint(i, false);
      this.updateHintBtn();
    }

    // Explain box with sentence starters.
    if (task.kind === 'count' || task.kind === 'pair') {
      const card = h('div', { class: 'card' });
      const id = `explain-${task.id}`;
      card.appendChild(h('label', { for: id, style: { fontWeight: '700' } }, t('ui.task.explain')));
      if (on && s.frames !== 'off' && task.frames) {
        const frame = paragraph(task.frames);
        frame.el.classList.add('frame');
        card.appendChild(frame.el);
        if (s.frames === 'bank' && task.wordBank) {
          card.appendChild(
            h('div', {}, h('strong', {}, t('ui.task.wordBank')), h('div', { class: 'wordbank' }, t(task.wordBank).split(',').map((w) => h('span', {}, w.trim())))),
          );
        }
      }
      const ta = h('textarea', {
        id,
        class: 'explain',
        oninput: (e: Event) => {
          const responses = { ...progress().responses, [task.id]: (e.target as HTMLTextAreaElement).value };
          saveProgress({ responses });
        },
      }) as HTMLTextAreaElement;
      ta.value = progress().responses[task.id] ?? '';
      card.appendChild(ta);
      this.el.appendChild(card);
    }
  }

  /** A worked-example card: steps revealed one at a time, each driving the model. */
  workedCard(keys: string[], actions: WorkedAction[], shownDefault: number, memoKey: string, onAll?: () => void): HTMLElement {
    const memo = this.ctx.memo;
    let shown = (memo[memoKey] as number) ?? shownDefault;
    const list = h('ol', {});
    const btn = h('button', { class: 'btn', type: 'button' }, t('ui.task.nextWorked'));
    const done = h('p', { class: 'note', hidden: true }, t('ui.task.workedDone'));
    const spokens: Spoken[] = [];
    const renderStep = (i: number, speak: boolean) => {
      const sp = paragraph(keys[i], undefined, 'span');
      spokens[i] = sp;
      list.appendChild(h('li', {}, sp.el));
      this.onAction(actions[i] ?? 'none');
      if (speak) speakIfOn([sp]);
    };
    const update = () => {
      btn.hidden = shown >= keys.length;
      done.hidden = shown < keys.length;
      if (shown >= keys.length) onAll?.();
    };
    btn.addEventListener('click', () => {
      renderStep(shown, true);
      shown++;
      memo[memoKey] = shown;
      update();
      if (btn.hidden) done.focus?.();
      else btn.focus();
    });
    for (let i = 0; i < shown; i++) renderStep(i, false);
    update();
    return h('div', { class: 'card worked' }, h('h3', {}, t('ui.task.workedTitle')), list, btn, done);
  }

  get hasHints(): boolean {
    return !!this.hintList;
  }

  /** Reveal the next hint level. Returns false when none are left. */
  nextHint(speak = false): boolean {
    const task = this.task;
    if (!this.hintList || !('hints' in task) || !task.hints) return false;
    if (this.hintsShown >= task.hints.length) return false;
    this.renderHint(this.hintsShown, speak);
    this.hintsShown++;
    this.ctx.memo.hints = this.hintsShown;
    this.updateHintBtn();
    playSfx('SFX-07');
    return true;
  }

  private renderHint(i: number, speak: boolean): void {
    const task = this.task;
    if (!this.hintList || !('hints' in task) || !task.hints) return;
    const sp = paragraph(task.hints[i], undefined, 'span');
    this.hintList.appendChild(h('li', {}, h('strong', {}, `${t('ui.task.hintN', { n: i + 1 })}: `), sp.el));
    if (speak) speakIfOn([sp]);
  }

  private updateHintBtn(): void {
    const task = this.task;
    if (!this.hintBtn || !('hints' in task) || !task.hints) return;
    const left = this.hintsShown < task.hints.length;
    this.hintBtn.disabled = !left;
    if (!left) this.hintBtn.title = t('ui.task.noMoreHints');
  }
}

export function setFeedback(slot: HTMLElement, fb: { el: HTMLElement; spoken: Spoken[] } | null): void {
  clear(slot);
  if (fb) {
    slot.appendChild(fb.el);
    speakIfOn(fb.spoken);
  }
}
