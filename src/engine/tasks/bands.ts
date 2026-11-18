import type { BandsTask, PartContent, Profile } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { progress, recordResult, saveProgress } from '../progress';
import { Gel, gelTable, type Lane } from '../stage/gel';
import { paragraph, type Spoken } from '../ui/text';
import { playSfx } from '../sfx';
import type { StepContext, StepView } from '../types';
import { MAX_ATTEMPTS, Supports, feedback, setFeedback, supportsOn } from './common';

interface BandsMemo {
  marked?: string[];
  tested?: string[];
  attempts?: number;
  done?: boolean;
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; mis?: string };
}

/** Lane names: profile ID -> i18n key. */
export const laneLabel = (id: string): string => `gel.lane.${id}`;

/** Bands (marker|size) in `target` that also appear in `compare` at the same marker. */
export function matchingBands(target: Profile, compare: Profile): string[] {
  const out: string[] = [];
  target.forEach((sizes, m) => {
    for (const s of new Set(sizes)) if (compare[m]?.includes(s)) out.push(`${m}|${s}`);
  });
  return out;
}

/** Evidence locker: cards are saved in this browser for the claim in B6. */
export function fileEvidence(card: string): void {
  const responses = progress().responses;
  if (responses[`locker:${card}`]) return;
  saveProgress({ responses: { ...responses, [`locker:${card}`]: '1' } });
  playSfx('SFX-08');
}

export function lockerCards(): string[] {
  return Object.keys(progress().responses)
    .filter((k) => k.startsWith('locker:'))
    .map((k) => k.slice('locker:'.length));
}

/**
 * DNA profiles. 'match': mark every band in the target lane that also shows
 * up in the compare lane (one panel button per band; the gel marks it).
 * 'tissues': choose samples of Fig to test; each test adds a lane and an
 * evidence card. Done once the egg cells and one body tissue are tested.
 */
export function bandsTask(ctx: StepContext, task: BandsTask, content: PartContent): StepView {
  const memo = ctx.memo as BandsMemo;
  memo.marked ??= [];
  memo.tested ??= [];
  const profiles = content.profiles ?? {};
  if (task.phase === 'checkpoint' && !memo.done && progress().results[task.id]) {
    memo.done = true;
    memo.fb = { kind: 'info', text: 'ui.task.firstTry' };
  }
  ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null });
  const lanesNow = (): Lane[] => [...task.lanes, ...memo.tested!].map((id) => ({ id, label: laneLabel(id) }));
  const gel = new Gel(ctx.stage, profiles, lanesNow());

  const prompt = paragraph(task.prompt);
  const readables: Spoken[] = [prompt];
  const supports = new Supports(ctx, task, () => undefined);
  const fbSlot = h('div', {});
  const controls = h('div', { class: 'card' });
  let tableSlot = gelTable(profiles, lanesNow());
  ctx.body.append(prompt.el, supports.top, controls, fbSlot);
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.append(supports.el, tableSlot);

  const refreshTable = () => {
    const next = gelTable(profiles, lanesNow());
    tableSlot.replaceWith(next);
    tableSlot = next;
  };

  const showFb = (speak: boolean) => {
    if (!memo.fb) return;
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };

  if (task.mode === 'match') {
    const target = profiles[task.target!];
    const answer = matchingBands(target, profiles[task.compare!]);
    const checkBtn = h('button', { class: 'btn primary', type: 'button' }, t('ui.task.check'));
    const rows = h('div', { class: 'band-rows' });
    controls.append(h('p', { style: { margin: '0', fontWeight: '700' } }, t('gel.ui.markIn', { lane: t(laneLabel(task.target!)) })), rows, h('div', {}, checkBtn));
    const render = () => {
      gel.clearMarks();
      rows.replaceChildren(
        ...target.map((sizes, m) => {
          const uniq = [...new Set(sizes)].sort((a, b) => a - b);
          return h(
            'div',
            { class: 'band-row' },
            h('span', { class: 'band-row-label' }, t('gel.ui.marker', { n: m + 1 })),
            ...uniq.map((s, i) => {
              const key = `${m}|${s}`;
              const on = memo.marked!.includes(key);
              if (on) gel.mark(task.target!, m, s, true);
              return h(
                'button',
                {
                  class: `btn${on ? ' primary' : ''}`,
                  type: 'button',
                  'aria-pressed': String(on),
                  disabled: !!memo.done,
                  'aria-label': t('gel.ui.bandAria', { n: m + 1, which: t(uniq.length === 1 ? 'gel.ui.only' : i === 0 ? 'gel.ui.upper' : 'gel.ui.lower'), row: s }),
                  onclick: () => {
                    memo.marked = on ? memo.marked!.filter((k) => k !== key) : [...memo.marked!, key];
                    playSfx('SFX-01');
                    render();
                  },
                },
                t(uniq.length === 1 ? 'gel.ui.only' : i === 0 ? 'gel.ui.upper' : 'gel.ui.lower'),
              );
            }),
          );
        }),
      );
      checkBtn.disabled = !!memo.done;
    };
    checkBtn.addEventListener('click', () => {
      const missed = answer.filter((k) => !memo.marked!.includes(k));
      const extra = memo.marked!.filter((k) => !answer.includes(k));
      const ok = !missed.length && !extra.length;
      memo.attempts = (memo.attempts ?? 0) + 1;
      recordResult(task.id, ok);
      if (ok) {
        memo.done = true;
        memo.fb = { kind: 'good', text: task.feedback.find((r) => r.when === 'correct')?.text ?? 'ui.task.correct' };
      } else {
        const err = extra.length ? 'extra' : 'missed';
        const rule = task.feedback.find((r) => typeof r.when === 'object' && 'bands' in r.when && r.when.bands === err);
        memo.fb = { kind: 'warn', text: rule?.text ?? `gel.fb.${err}`, mis: rule?.misconception };
        if (task.phase === 'checkpoint' || memo.attempts >= MAX_ATTEMPTS) memo.done = true;
        else supports.nextHint(false);
      }
      ctx.setDone(!!memo.done);
      render();
      showFb(true);
    });
    render();
  } else {
    const samples = task.samples ?? [];
    const buttons = h('div', { class: 'seg-options' });
    const results = h('ul', { class: 'test-results' });
    controls.append(h('p', { style: { margin: '0', fontWeight: '700' } }, t('gel.ui.choose')), buttons, results);
    const ready = () => memo.tested!.includes(samples[samples.length - 1]) && memo.tested!.length >= 2;
    const render = () => {
      buttons.replaceChildren(
        ...samples.map((id) =>
          h(
            'button',
            {
              class: 'btn',
              type: 'button',
              disabled: memo.tested!.includes(id),
              onclick: () => {
                memo.tested!.push(id);
                playSfx('SFX-22');
                fileEvidence(`test-${id}`);
                gel.setLanes(lanesNow());
                refreshTable();
                if (ready() && !memo.done) {
                  memo.done = true;
                  recordResult(task.id, true);
                  memo.fb = { kind: 'good', text: task.feedback.find((r) => r.when === 'correct')?.text ?? 'ui.task.correct' };
                  showFb(true);
                }
                ctx.setDone(ready());
                render();
              },
            },
            t('gel.ui.test', { sample: t(laneLabel(id)) }),
          ),
        ),
      );
      results.replaceChildren(...memo.tested!.map((id) => h('li', {}, paragraph(`gel.result.${id}`, undefined, 'span').el)));
    };
    render();
    ctx.setDone(ready());
  }

  ctx.setReadables(readables);
  showFb(false);
  if (task.mode === 'match') ctx.setDone(!!memo.done);
  ctx.autoRead();
  const unResize = ctx.stage.onResize(() => gel.setLanes(lanesNow()));
  return {
    dispose: () => {
      unResize();
      gel.dispose();
    },
  };
}
