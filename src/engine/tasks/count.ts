import type { CountTask, PartContent, WorkedAction } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { progress, recordResult } from '../progress';
import { CellScene } from '../stage/cellScene';
import { paragraph } from '../ui/text';
import type { StepContext, StepView } from '../types';
import { MAX_ATTEMPTS, Supports, feedback, setFeedback, supportsOn } from './common';

interface CountMemo {
  values?: { c: number; d: number };
  attempts?: number;
  done?: boolean;
  correct?: boolean;
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; mis?: string; vars?: Record<string, number> };
}

function numberStepper(id: string, labelText: string, value: number, onChange: (v: number) => void): { el: HTMLElement; input: HTMLInputElement; set: (v: number) => void; disable: () => void } {
  const input = h('input', { id, type: 'number', inputmode: 'numeric', min: '0', max: '99', value: String(value) }) as HTMLInputElement;
  const clamp = (v: number) => Math.max(0, Math.min(99, Math.round(v) || 0));
  const set = (v: number) => {
    input.value = String(clamp(v));
    onChange(clamp(v));
  };
  input.addEventListener('input', () => onChange(clamp(Number(input.value))));
  const less = h('button', { class: 'btn icon', type: 'button', 'aria-label': `${t('ui.task.less')}: ${labelText}`, onclick: () => set(Number(input.value) - 1) }, '−');
  const more = h('button', { class: 'btn icon', type: 'button', 'aria-label': `${t('ui.task.more')}: ${labelText}`, onclick: () => set(Number(input.value) + 1) }, '+');
  const el = h('div', { class: 'number-row' }, h('label', { for: id }, labelText), h('span', { class: 'stepper' }, less, input, more));
  return {
    el,
    input,
    set,
    disable: () => {
      input.disabled = true;
      less.disabled = true;
      more.disabled = true;
    },
  };
}

function matchRule(task: CountTask, c: number, d: number) {
  for (const r of task.feedback) {
    if (r.when === 'correct' || r.when === 'other' || 'pair' in r.when || 'divide' in r.when || 'switch' in r.when) continue;
    const w = r.when;
    const okC = w.chromosomes === undefined || w.chromosomes === c;
    const okD = w.dnaMolecules === undefined || w.dnaMolecules === d;
    if (okC && okD) return r;
  }
  return task.feedback.find((r) => r.when === 'other');
}

export function countTask(ctx: StepContext, task: CountTask, content: PartContent): StepView {
  const memo = ctx.memo as CountMemo;
  const scene = new CellScene(ctx.stage, task.cell, { layout: 'cell' });
  const answer = task.answer;
  // A checkpoint answer is final, even after a reload.
  if (task.phase === 'checkpoint' && !memo.done && progress().results[task.id]) {
    memo.done = true;
    memo.fb = { kind: 'info', text: 'ui.task.firstTry' };
  }

  const doAction = (a: WorkedAction) => {
    if (a === 'centromeres') scene.tagCentromeres();
    else if (a === 'chromatids') scene.tagChromatids();
    else if (a === 'chromosomeCount') ctx.counts.set({ chromosomes: answer.chromosomes, dnaMolecules: null, same: null });
    else if (a === 'dnaCount') ctx.counts.set({ chromosomes: answer.chromosomes, dnaMolecules: answer.dnaMolecules, same: null });
  };

  const prompt = paragraph(task.prompt);
  ctx.body.appendChild(prompt.el);
  ctx.setReadables([prompt]);

  // Worked example: the narrator's think-aloud, revealed one step at a time.
  if (task.phase === 'worked') {
    ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null, hidden: true });
    const supports = new Supports(ctx, task, doAction);
    const card = supports.workedCard(task.worked ?? [], task.workedActions ?? [], 0, 'worked', () => ctx.setDone(true));
    ctx.body.appendChild(card);
    ctx.setDone(((memo as Record<string, unknown>).worked as number | undefined ?? 0) >= (task.worked?.length ?? 0));
    ctx.autoRead();
    return { dispose: () => scene.dispose() };
  }

  ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null, hidden: !memo.done });
  if (memo.done) ctx.counts.set({ chromosomes: answer.chromosomes, dnaMolecules: answer.dnaMolecules, same: null });

  const supports = new Supports(ctx, task, doAction);
  const values = memo.values ?? { c: 0, d: 0 };
  memo.values = values;
  const cIn = numberStepper(`c-${task.id}`, t('ui.task.chromosomes'), values.c, (v) => (values.c = v));
  const dIn = numberStepper(`d-${task.id}`, t('ui.task.dna'), values.d, (v) => (values.d = v));
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, t('ui.task.check'));
  const fbSlot = h('div', {});
  const form = h('div', { class: 'card' }, cIn.el, dIn.el, h('div', {}, checkBtn));
  ctx.body.append(supports.top, form, fbSlot);
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);

  const lock = () => {
    cIn.disable();
    dIn.disable();
    checkBtn.disabled = true;
  };

  const showFb = (speak: boolean) => {
    const f = memo.fb;
    if (!f) return;
    const box = feedback(content, f.kind, f.text, f.mis, f.vars);
    if (speak) setFeedback(fbSlot, box);
    else {
      fbSlot.replaceChildren(box.el);
    }
  };

  const finish = (correct: boolean) => {
    memo.done = true;
    memo.correct = correct;
    lock();
    ctx.counts.set({ chromosomes: answer.chromosomes, dnaMolecules: answer.dnaMolecules, same: null });
    ctx.setDone(true);
  };

  checkBtn.addEventListener('click', () => {
    const c = values.c;
    const d = values.d;
    memo.attempts = (memo.attempts ?? 0) + 1;
    const correct = c === answer.chromosomes && d === answer.dnaMolecules;
    recordResult(task.id, correct);
    if (correct) {
      const rule = task.feedback.find((r) => r.when === 'correct');
      memo.fb = { kind: 'good', text: rule?.text ?? 'ui.task.correct' };
      scene.tagCentromeres();
      finish(true);
    } else {
      const rule = matchRule(task, c, d);
      memo.fb = { kind: 'warn', text: rule?.text ?? 'fb.recount', mis: rule?.misconception };
      if (task.phase === 'checkpoint') {
        finish(false);
      } else if (memo.attempts >= MAX_ATTEMPTS) {
        memo.fb = { kind: 'warn', text: 'ui.task.revealCount', mis: rule?.misconception, vars: { c: answer.chromosomes, d: answer.dnaMolecules } };
        scene.tagChromatids();
        finish(false);
      } else {
        supports.nextHint(false);
      }
    }
    showFb(true);
  });

  if (memo.done) {
    lock();
    cIn.input.value = String(values.c);
    dIn.input.value = String(values.d);
  }
  showFb(false);
  ctx.setDone(!!memo.done);
  ctx.autoRead();
  return { dispose: () => scene.dispose() };
}
