import type { PartContent, RecallTask } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { progress, saveProgress } from '../progress';
import { paragraph, type Spoken } from '../ui/text';
import type { StepContext, StepView } from '../types';

interface RetrieveMemo {
  shown?: Record<string, boolean>;
  rated?: Record<string, 'got' | 'notYet'>;
}

/**
 * Warm-up: free recall. Students write first, then reveal the answer and
 * check themselves. Nothing is graded.
 */
export function retrieveStep(ctx: StepContext, ids: string[], content: PartContent): StepView {
  const memo = ctx.memo as RetrieveMemo;
  memo.shown ??= {};
  memo.rated ??= {};
  ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null });
  // The stage has no model during the warm-up; say so, so it does not look broken.
  const note = paragraph('ui.retrieve.stageNote', { total: ids.length }, 'div');
  const noteBox = h('div', { class: 'stage-note' }, note.el);
  ctx.stage.el.appendChild(noteBox);
  const intro = paragraph('ui.retrieve.intro');
  const readables: Spoken[] = [intro];
  ctx.body.appendChild(intro.el);

  const update = () => ctx.setDone(ids.every((id) => memo.shown![id]));

  ids.forEach((id, i) => {
    const task = content.tasks[id] as RecallTask;
    const prompt = paragraph(task.prompt);
    readables.push(prompt);
    const taId = `recall-${id}`;
    const ta = h('textarea', {
      id: taId,
      class: 'explain',
      rows: 2,
      oninput: (e: Event) => saveProgress({ responses: { ...progress().responses, [id]: (e.target as HTMLTextAreaElement).value } }),
    }) as HTMLTextAreaElement;
    ta.value = progress().responses[id] ?? '';
    const answerBox = h('div', { class: 'feedback good', hidden: !memo.shown![id] });
    const rateRow = h('div', { class: 'seg-options' });
    const showBtn = h('button', { class: 'btn', type: 'button' }, t('ui.retrieve.show'));
    const renderAnswer = () => {
      answerBox.replaceChildren(
        h('span', { class: 'mark', 'aria-hidden': 'true' }, '✎'),
        h('div', {}, h('strong', {}, `${t('ui.retrieve.answer')}: `), paragraph(task.answer, undefined, 'span').el, rateRow),
      );
      rateRow.replaceChildren(
        ...(['got', 'notYet'] as const).map((r) =>
          h(
            'button',
            {
              class: `btn${memo.rated![id] === r ? ' primary' : ''}`,
              type: 'button',
              'aria-pressed': String(memo.rated![id] === r),
              onclick: () => {
                memo.rated![id] = r;
                saveProgress({ responses: { ...progress().responses, [`${id}:rating`]: r } });
                renderAnswer();
              },
            },
            t(r === 'got' ? 'ui.retrieve.got' : 'ui.retrieve.notYet'),
          ),
        ),
      );
      rateRow.style.marginTop = '8px';
    };
    showBtn.addEventListener('click', () => {
      memo.shown![id] = true;
      answerBox.hidden = false;
      showBtn.hidden = true;
      renderAnswer();
      update();
      (answerBox.querySelector('button') as HTMLButtonElement | null)?.focus();
    });
    if (memo.shown![id]) {
      showBtn.hidden = true;
      renderAnswer();
    }
    ctx.body.appendChild(
      h(
        'div',
        { class: 'card' },
        h('h3', {}, t('ui.retrieve.itemOf', { n: i + 1, total: ids.length })),
        prompt.el,
        h('label', { for: taId, class: 'sr-only' }, t('ui.retrieve.write')),
        ta,
        h('div', {}, showBtn),
        answerBox,
      ),
    );
  });
  ctx.setReadables(readables);
  update();
  ctx.autoRead();
  return { dispose: () => noteBox.remove() };
}
