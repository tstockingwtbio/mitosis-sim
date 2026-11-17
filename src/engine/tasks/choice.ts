import type { ChoiceTask, PartContent } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { getSettings } from '../settings';
import { recordResult } from '../progress';
import { paragraph, type Spoken } from '../ui/text';
import type { StepContext, StepView } from '../types';
import { MAX_ATTEMPTS, Supports, feedback, setFeedback, supportsOn } from './common';

interface ChoiceMemo {
  picked?: string;
  wrong?: string[];
  attempts?: number;
  done?: boolean;
  fb?: { kind: 'good' | 'warn'; text: string; mis?: string };
}

export function choiceTask(ctx: StepContext, task: ChoiceTask, content: PartContent): StepView {
  const memo = ctx.memo as ChoiceMemo;
  memo.wrong ??= [];
  ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null });

  const prompt = paragraph(task.prompt);
  const readables: Spoken[] = [prompt];
  ctx.body.appendChild(prompt.el);

  const fewer = getSettings().fewerChoices && supportsOn(task);
  const options = task.options.filter((o) => !(fewer && o.removable));
  const name = `choice-${task.id}`;
  const list = h('div', { class: 'choices', role: 'radiogroup', 'aria-label': t(task.prompt) });
  const labels = new Map<string, HTMLElement>();
  for (const o of options) {
    const sp = paragraph(o.text, undefined, 'span');
    readables.push(sp);
    const input = h('input', {
      type: 'radio',
      name,
      value: o.id,
      checked: memo.picked === o.id,
      onchange: () => (memo.picked = o.id),
    });
    const lab = h('label', { class: 'choice' }, input, sp.el);
    labels.set(o.id, lab);
    list.appendChild(lab);
  }
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, t('ui.task.check'));
  const fbSlot = h('div', {});
  const supports = new Supports(ctx, task, () => undefined);
  ctx.body.append(supports.top, h('div', { class: 'card' }, list, h('div', {}, checkBtn)), fbSlot);
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);
  ctx.setReadables(readables);

  const mark = () => {
    for (const [id, lab] of labels) {
      const opt = task.options.find((o) => o.id === id)!;
      lab.classList.toggle('wrong', memo.wrong!.includes(id));
      lab.classList.toggle('right', !!memo.done && !!opt.correct);
      const tag = lab.querySelector('.tag');
      tag?.remove();
      if (memo.wrong!.includes(id)) lab.appendChild(h('span', { class: 'tag', 'aria-hidden': 'true', style: { marginInlineStart: 'auto', fontWeight: '700' } }, '✗'));
      else if (memo.done && opt.correct) lab.appendChild(h('span', { class: 'tag', 'aria-hidden': 'true', style: { marginInlineStart: 'auto', fontWeight: '700' } }, '✓'));
    }
  };

  const showFb = (speak: boolean) => {
    if (!memo.fb) return;
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };

  const lock = () => {
    checkBtn.disabled = true;
    list.querySelectorAll('input').forEach((i) => ((i as HTMLInputElement).disabled = true));
  };

  checkBtn.addEventListener('click', () => {
    const opt = task.options.find((o) => o.id === memo.picked);
    if (!opt) {
      (list.querySelector('input') as HTMLInputElement | null)?.focus();
      return;
    }
    memo.attempts = (memo.attempts ?? 0) + 1;
    recordResult(task.id, !!opt.correct);
    if (opt.correct) {
      memo.fb = { kind: 'good', text: opt.feedback };
      memo.done = true;
    } else {
      if (!memo.wrong!.includes(opt.id)) memo.wrong!.push(opt.id);
      memo.fb = { kind: 'warn', text: opt.feedback, mis: opt.misconception };
      if (task.phase === 'checkpoint' || memo.attempts >= MAX_ATTEMPTS) memo.done = true;
      else supports.nextHint(false);
    }
    if (memo.done) {
      lock();
      ctx.setDone(true);
    }
    mark();
    showFb(true);
  });

  if (memo.done) lock();
  mark();
  showFb(false);
  ctx.setDone(!!memo.done);
  ctx.autoRead();
  return { dispose: () => undefined };
}
