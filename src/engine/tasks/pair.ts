import type { PairTask, PartContent } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { getSettings } from '../settings';
import { progress, recordResult } from '../progress';
import { pairError } from '../model/chromosome';
import { CellScene } from '../stage/cellScene';
import type { ChromosomeView } from '../stage/chromosomeView';
import { paragraph } from '../ui/text';
import { playSfx } from '../sfx';
import type { StepContext, StepView } from '../types';
import { MAX_ATTEMPTS, Supports, feedback, setFeedback, supportsOn } from './common';

interface PairMemo {
  pairs?: [string, string][];
  wrongs?: number;
  done?: boolean;
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; mis?: string };
}

export function pairTask(ctx: StepContext, task: PairTask, content: PartContent): StepView {
  const memo = ctx.memo as PairMemo;
  memo.pairs ??= [];
  memo.wrongs ??= 0;
  if (task.phase === 'checkpoint' && !memo.done && progress().results[task.id]) {
    memo.done = true;
    memo.pairs = task.answer.map(([a, b]) => [a, b] as [string, string]);
    memo.fb = { kind: 'info', text: 'ui.task.firstTry' };
  }
  const scene = new CellScene(ctx.stage, task.cell, { layout: 'tray', slots: task.answer.length });
  const home = new Map(task.cell.chromosomes.map((c) => [c.id, { x: c.x ?? 0, y: c.y ?? 0, a: c.angle ?? 0 }]));
  const counts = scene.counts();
  ctx.counts.set({ chromosomes: counts.chromosomes, dnaMolecules: counts.dnaMolecules, same: null });

  const prompt = paragraph(task.prompt);
  ctx.body.appendChild(prompt.el);
  ctx.setReadables([prompt]);

  const status = h('p', { role: 'status', 'aria-live': 'polite', style: { fontWeight: '700' } });
  const selection = h('p', { 'aria-live': 'polite' });
  const undoBtn = h('button', { class: 'btn', type: 'button' }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '↶'), t('ui.task.undo'));
  const fbSlot = h('div', {});
  const supports = new Supports(ctx, task, () => undefined);
  ctx.body.append(supports.top, h('div', { class: 'card' }, status, selection, h('div', {}, undoBtn)), fbSlot);
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);

  let selected: ChromosomeView | null = null;
  const instant = () => getSettings().reducedMotion;

  const isMatched = (v: ChromosomeView) => memo.pairs!.some(([a, b]) => a === v.spec.id || b === v.spec.id);

  const refresh = () => {
    status.textContent = t('ui.task.pairsMade', { n: memo.pairs!.length, total: task.answer.length });
    selection.textContent = memo.done ? '' : selected ? t('ui.task.pickPartner') : t('ui.task.pickFirst');
    undoBtn.disabled = !memo.pairs!.length || !!memo.done;
    for (const v of scene.views) {
      if (!v.hit) continue;
      const matched = isMatched(v);
      v.hit.setAttribute('aria-pressed', String(v === selected));
      v.hit.disabled = matched || !!memo.done;
      v.updateHitLabel(matched ? t('model.aria.paired') : v === selected ? t('model.aria.selected') : undefined);
    }
    ctx.stage.invalidate();
  };

  const place = (pairIdx: number, a: ChromosomeView, b: ChromosomeView, inst: boolean) => {
    const slot = scene.slotCenters[pairIdx];
    const [m, p] = a.spec.parent === 'M' ? [a, b] : [b, a];
    const rtl = document.documentElement.dir === 'rtl';
    void scene.slide(m, slot.x + (rtl ? 0.6 : -0.6), slot.y, 0, inst);
    void scene.slide(p, slot.x + (rtl ? -0.6 : 0.6), slot.y, 0, inst);
  };

  const showFb = (speak: boolean) => {
    if (!memo.fb) return fbSlot.replaceChildren();
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };

  const complete = (correct: boolean) => {
    memo.done = true;
    recordResult(task.id, correct);
    ctx.setDone(true);
  };

  const choose = (v: ChromosomeView) => {
    if (memo.done || isMatched(v)) return;
    if (!selected) {
      selected = v;
      playSfx('SFX-09');
      refresh();
      return;
    }
    if (selected === v) {
      selected = null;
      refresh();
      return;
    }
    const a = selected;
    selected = null;
    const err = pairError(a.spec, v.spec);
    if (!err) {
      memo.pairs!.push([a.spec.id, v.spec.id]);
      place(memo.pairs!.length - 1, a, v, instant());
      playSfx('SFX-10');
      if (memo.pairs!.length === task.answer.length) {
        const rule = task.feedback.find((r) => r.when === 'correct');
        memo.fb = { kind: 'good', text: rule?.text ?? 'ui.task.correct' };
        complete(memo.wrongs === 0);
        showFb(true);
      } else {
        memo.fb = undefined;
        showFb(false);
      }
    } else {
      memo.wrongs = (memo.wrongs ?? 0) + 1;
      const rule = task.feedback.find((r) => typeof r.when === 'object' && 'pair' in r.when && r.when.pair === err);
      memo.fb = { kind: 'warn', text: rule?.text ?? 'fb.pairByLook', mis: rule?.misconception };
      if (task.phase !== 'checkpoint' && memo.wrongs >= MAX_ATTEMPTS) {
        // Show the answer: place the remaining pairs.
        for (const [x, y] of task.answer) {
          if (memo.pairs!.some(([p, q]) => p === x || q === x)) continue;
          memo.pairs!.push([x, y]);
          place(memo.pairs!.length - 1, scene.find(x)!, scene.find(y)!, instant());
        }
        memo.fb = { kind: 'warn', text: 'ui.task.revealPairs', mis: rule?.misconception };
        complete(false);
      } else if (supportsOn(task)) {
        supports.nextHint(false);
      }
      showFb(true);
    }
    refresh();
  };

  undoBtn.addEventListener('click', () => {
    const last = memo.pairs!.pop();
    if (!last) return;
    for (const id of last) {
      const v = scene.find(id)!;
      const hm = home.get(id)!;
      void scene.slide(v, hm.x, hm.y, hm.a, instant());
    }
    memo.fb = undefined;
    showFb(false);
    refresh();
    scene.find(last[0])?.hit?.focus();
  });

  const upp = ctx.stage.unitsPerPixel();
  for (const v of scene.views) v.makeHit(() => choose(v), upp);
  ctx.stage.onResize(() => {
    const u = ctx.stage.unitsPerPixel();
    scene.views.forEach((v) => v.sizeHit(u));
  });

  // Restore after a re-render.
  memo.pairs.forEach(([a, b], i) => place(i, scene.find(a)!, scene.find(b)!, true));
  showFb(false);
  refresh();
  ctx.setDone(!!memo.done);
  ctx.autoRead();
  return { dispose: () => scene.dispose() };
}
