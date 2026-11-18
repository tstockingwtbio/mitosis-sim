import type { ClassifyTask, PartContent } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { progress, recordResult } from '../progress';
import { paragraph, type Spoken } from '../ui/text';
import { playSfx } from '../sfx';
import type { StepContext, StepView } from '../types';
import { MAX_ATTEMPTS, Supports, feedback, setFeedback, supportsOn } from './common';

interface ClassifyMemo {
  placed?: Record<string, number>;
  wrong?: string[];
  attempts?: number;
  done?: boolean;
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; mis?: string; vars?: Record<string, string | number> };
}

/**
 * Sort statement cards into bins (for example Mitosis / Meiosis / Both).
 * Each card has one button per bin; no dragging. Check marks every card;
 * feedback names the misconception behind the first wrong card.
 */
export function classifyTask(ctx: StepContext, task: ClassifyTask, content: PartContent): StepView {
  const memo = ctx.memo as ClassifyMemo;
  memo.placed ??= {};
  memo.wrong ??= [];
  if (task.phase === 'checkpoint' && !memo.done && progress().results[task.id]) {
    memo.done = true;
    memo.fb = { kind: 'info', text: 'ui.task.firstTry' };
  }
  ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null });

  const prompt = paragraph(task.prompt);
  const readables: Spoken[] = [prompt];
  const supports = new Supports(ctx, task, () => undefined);
  const list = h('div', { class: 'classify' });
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, t('ui.task.check'));
  const fbSlot = h('div', {});
  ctx.body.append(prompt.el, supports.top, h('div', { class: 'card' }, list, h('div', {}, checkBtn)), fbSlot);
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);

  const rows = task.items.map((item) => {
    const text = paragraph(item.text, undefined, 'span');
    readables.push(text);
    const group = h('div', { class: 'seg-options', role: 'radiogroup', 'aria-label': t(item.text) });
    const mark = h('span', { class: 'tag', 'aria-hidden': 'true' });
    const row = h('div', { class: 'classify-row' }, h('div', { class: 'classify-text' }, text.el, mark), group);
    list.appendChild(row);
    return { item, row, group, mark };
  });

  const render = () => {
    for (const { item, row, group, mark } of rows) {
      const wrong = memo.wrong!.includes(item.id);
      const right = !!memo.done && memo.placed![item.id] === item.bin;
      row.classList.toggle('wrong', wrong);
      row.classList.toggle('right', right);
      mark.textContent = wrong ? '✗' : right ? '✓' : '';
      group.replaceChildren(
        ...task.bins.map((bin, b) =>
          h(
            'button',
            {
              class: `btn${memo.placed![item.id] === b ? ' primary' : ''}`,
              type: 'button',
              role: 'radio',
              'aria-checked': String(memo.placed![item.id] === b),
              disabled: !!memo.done,
              onclick: () => {
                memo.placed![item.id] = b;
                memo.wrong = memo.wrong!.filter((x) => x !== item.id);
                playSfx('SFX-10');
                render();
              },
            },
            t(bin),
          ),
        ),
      );
    }
    checkBtn.disabled = !!memo.done || task.items.some((i) => memo.placed![i.id] === undefined);
  };

  const showFb = (speak: boolean) => {
    if (!memo.fb) return;
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis, memo.fb.vars);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };

  checkBtn.addEventListener('click', () => {
    const wrong = task.items.filter((i) => memo.placed![i.id] !== i.bin);
    memo.attempts = (memo.attempts ?? 0) + 1;
    recordResult(task.id, wrong.length === 0);
    memo.wrong = wrong.map((i) => i.id);
    if (!wrong.length) {
      memo.done = true;
      memo.fb = { kind: 'good', text: `${task.prompt.replace(/\.prompt$/, '')}.fb.correct` };
    } else {
      const first = wrong[0];
      memo.fb = {
        kind: 'warn',
        text: first.feedback ?? 'classify.fb.some',
        mis: first.misconception,
        vars: { n: wrong.length },
      };
      if (task.phase === 'checkpoint' || memo.attempts >= MAX_ATTEMPTS) memo.done = true;
      else supports.nextHint(false);
    }
    ctx.setDone(!!memo.done);
    render();
    showFb(true);
  });

  ctx.setReadables(readables);
  render();
  showFb(false);
  ctx.setDone(!!memo.done);
  ctx.autoRead();
  return { dispose: () => undefined };
}
