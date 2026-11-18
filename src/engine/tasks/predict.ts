import type { PredictTask } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { getSettings } from '../settings';
import { progress, saveProgress } from '../progress';
import { paragraph } from '../ui/text';
import type { StepContext, StepView } from '../types';

interface PredictMemo {
  notSure?: boolean;
}

/**
 * Prediction before instruction (OBSERVE). Every student commits to an idea
 * in writing, or says they are not sure yet. Saved in this browser, not graded;
 * later chapters come back to it.
 */
export function predictTask(ctx: StepContext, task: PredictTask): StepView {
  const memo = ctx.memo as PredictMemo;
  const s = getSettings();
  const prompt = paragraph(task.prompt);
  const readables = [prompt];
  ctx.body.appendChild(prompt.el);

  const card = h('div', { class: 'card' });
  const id = `predict-${task.id}`;
  card.appendChild(h('label', { for: id, style: { fontWeight: '700' } }, t('ui.predict.label')));
  if (s.frames !== 'off' && task.frames) {
    const frame = paragraph(task.frames);
    frame.el.classList.add('frame');
    readables.push(frame);
    card.appendChild(frame.el);
    if (s.frames === 'bank' && task.wordBank) {
      card.appendChild(
        h('div', {}, h('strong', {}, t('ui.task.wordBank')), h('div', { class: 'wordbank' }, t(task.wordBank).split(',').map((w) => h('span', {}, w.trim())))),
      );
    }
  }
  const ta = h('textarea', { id, class: 'explain', rows: 4 }) as HTMLTextAreaElement;
  ta.value = progress().responses[task.id] ?? '';
  const status = h('p', { role: 'status', class: 'note', hidden: true }, t('ui.predict.saved'));
  const notSure = h('button', { class: 'btn', type: 'button', 'aria-pressed': String(!!memo.notSure) }, t('ui.predict.notSure'));
  card.append(ta, h('div', {}, notSure), status);
  ctx.body.appendChild(card);

  const update = () => {
    const ok = ta.value.trim().length >= 3 || !!memo.notSure;
    status.hidden = !ok;
    notSure.setAttribute('aria-pressed', String(!!memo.notSure));
    notSure.classList.toggle('primary', !!memo.notSure);
    ctx.setDone(ok);
  };
  ta.addEventListener('input', () => {
    saveProgress({ responses: { ...progress().responses, [task.id]: ta.value } });
    update();
  });
  notSure.addEventListener('click', () => {
    memo.notSure = !memo.notSure;
    saveProgress({ responses: { ...progress().responses, [`${task.id}:notSure`]: String(!!memo.notSure) } });
    update();
  });
  memo.notSure ??= progress().responses[`${task.id}:notSure`] === 'true';
  ctx.setReadables(readables);
  update();
  ctx.autoRead();
  return { dispose: () => undefined };
}
