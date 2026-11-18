import * as THREE from 'three';
import type { ChromSpec, GameteError, GameteTask, PartContent } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { progress, recordResult } from '../progress';
import { countCell, sameInfo } from '../model/chromosome';
import { ChromosomeView } from '../stage/chromosomeView';
import { legend } from '../stage/cellScene';
import { PALETTE, ellipseShape, paper } from '../stage/paper';
import { label } from '../stage/stage';
import { paragraph } from '../ui/text';
import { playSfx } from '../sfx';
import type { StepContext, StepView } from '../types';
import { MAX_ATTEMPTS, Supports, feedback, setFeedback, supportsOn } from './common';

interface GameteMemo {
  picked?: string[];
  made?: string[][];
  attempts?: number;
  done?: boolean;
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; mis?: string; vars?: Record<string, string | number> };
}

/** What is wrong with an egg or sperm made from these chromosomes (null: one from every pair). */
export function judgeGamete(picked: ChromSpec[], parent: ChromSpec[]): GameteError | null {
  const pairs = [...new Set(parent.map((c) => c.pair))];
  if (picked.length === parent.length) return 'full-set';
  const per = pairs.map((p) => picked.filter((c) => c.pair === p).length);
  if (per.some((n) => n > 1)) return 'both-of-pair';
  if (per.some((n) => n === 0)) return 'missing-pair';
  return null;
}

/** How many different eggs (or sperm) a cell can make: 2 for each pair, multiplied. */
export function combinations(parent: ChromSpec[]): number {
  return 2 ** new Set(parent.map((c) => c.pair)).size;
}

const PARENT = { x: 0, y: 1.75, rx: 3.6, ry: 1.95 };
const NEW = { x: -3.7, y: -2.45, rx: 2.3, ry: 1.75 };
const TRAY = { x: 2.9, y: -2.45 };
const SCALE = 0.6;

/**
 * Make an egg or sperm. Click a chromosome (or its button in the panel) to put
 * it in the new cell or take it out, then press Make. With `collect`, students
 * keep making different ones until they have found them all.
 */
export function gameteTask(ctx: StepContext, task: GameteTask, content: PartContent): StepView {
  const memo = ctx.memo as GameteMemo;
  const parent = task.cell.chromosomes.map((c) => ({ ...c, state: 'unreplicated' as const }));
  memo.picked ??= [];
  memo.made ??= [];
  if (task.phase === 'checkpoint' && !memo.done && progress().results[task.id]) {
    memo.done = true;
    memo.fb = { kind: 'info', text: 'ui.task.firstTry' };
  }
  const word = task.gamete;
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const legendEl = legend();
  ctx.stage.el.appendChild(legendEl);

  const parentCell = paper(ellipseShape(PARENT.rx, PARENT.ry), { color: PALETTE.cream, outline: 0.08 });
  parentCell.position.set(PARENT.x, PARENT.y, -0.5);
  const newCell = paper(ellipseShape(NEW.rx, NEW.ry), { color: '#f7efdc', outline: 0.08 });
  newCell.position.set(NEW.x, NEW.y, -0.5);
  root.add(parentCell, newCell);
  root.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t(`gamete.parent.${word}`)), { x: PARENT.x, y: PARENT.y + PARENT.ry + 0.3, z: 0.2 }));
  root.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t(`gamete.new.${word}`)), { x: NEW.x, y: NEW.y + NEW.ry + 0.3, z: 0.2 }));
  const trayLabel = label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t(`gamete.tray.${word}`, { n: task.collect ?? 0 })), { x: TRAY.x + 0.55, y: TRAY.y + 1.75, z: 0.2 });
  if (task.collect) root.add(trayLabel);

  let views: ChromosomeView[] = [];
  let tray: THREE.Group | null = null;

  // ---------- Panel ----------
  const prompt = paragraph(task.prompt);
  const supports = new Supports(ctx, task, () => undefined);
  const toggles = h('div', { class: 'seg-options', role: 'group', 'aria-label': t('gamete.ui.choose') });
  const makeBtn = h('button', { class: 'btn primary', type: 'button' }, t(`gamete.ui.make.${word}`));
  const clearBtn = h('button', { class: 'btn', type: 'button' }, t('gamete.ui.clear'));
  const status = h('p', { role: 'status', 'aria-live': 'polite' });
  const madeList = h('ol', { class: 'made-list' });
  const fbSlot = h('div', {});
  ctx.body.append(
    prompt.el,
    supports.top,
    h('div', { class: 'card' }, h('p', { style: { margin: '0', fontWeight: '700' } }, t('gamete.ui.choose')), toggles, status, h('div', { class: 'seg-options' }, clearBtn, makeBtn)),
    fbSlot,
  );
  if (task.collect) ctx.body.appendChild(h('div', { class: 'card' }, h('h3', {}, t(`gamete.ui.made.${word}`)), madeList));
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);
  ctx.setReadables([prompt]);

  const describe = (c: ChromSpec) =>
    t('gamete.ui.chrom', { pair: c.pair, parent: t(c.parent === 'M' ? 'model.aria.mother' : 'model.aria.father'), alleles: c.alleles.join(', ') });
  const pickedSpecs = () => parent.filter((c) => memo.picked!.includes(c.id));
  const locked = () => !!memo.done;

  const layout = (n: number, i: number, cell: { x: number; rx: number }) => (n === 1 ? cell.x : cell.x - cell.rx * 0.6 + (cell.rx * 1.2 * i) / (n - 1));

  const drawTray = () => {
    tray?.traverse((o) => (o as { element?: HTMLElement }).element?.remove());
    tray?.removeFromParent();
    tray = null;
    if (!task.collect) return;
    tray = new THREE.Group();
    const n = task.collect;
    const cols = n <= 4 ? 2 : 4;
    memo.made!.forEach((ids, i) => {
      const cx = TRAY.x + (i % cols) * 1.1;
      const cy = TRAY.y + 0.75 - Math.floor(i / cols) * 1.6;
      const g = paper(ellipseShape(0.5, 0.55), { color: '#f7efdc', outline: 0.05 });
      g.position.set(cx, cy, -0.4);
      tray!.add(g);
      const specs = parent.filter((c) => ids.includes(c.id));
      specs.forEach((c, j) => {
        const v = new ChromosomeView({ ...c, x: cx - 0.16 + 0.32 * j, y: cy }, { tabs: false });
        v.group.scale.setScalar(0.22);
        tray!.add(v.group);
      });
      tray!.add(label(h('div', { class: 'cell-tag', 'aria-hidden': 'true' }, specs.flatMap((c) => c.alleles).join(' ')), { x: cx, y: cy - 0.75, z: 0.2 }));
    });
    root.add(tray);
  };

  const render = () => {
    views.forEach((v) => {
      v.dispose();
      v.group.removeFromParent();
    });
    views = [];
    const inParent = parent.filter((c) => !memo.picked!.includes(c.id));
    const inNew = pickedSpecs();
    const place = (list: ChromSpec[], cell: typeof PARENT | typeof NEW) =>
      list.forEach((c, i) => {
        const v = new ChromosomeView({ ...c, x: layout(list.length, i, cell), y: cell.y - 0.05 });
        v.group.scale.setScalar(SCALE);
        root.add(v.group);
        if (!locked()) {
          v.makeHit(() => toggle(c.id), ctx.stage.unitsPerPixel() / SCALE);
          v.updateHitLabel(memo.picked!.includes(c.id) ? t(`gamete.ui.inNew.${word}`) : undefined);
        }
        views.push(v);
      });
    place(inParent, PARENT);
    place(inNew, NEW);
    toggles.replaceChildren(
      ...parent.map((c) =>
        h(
          'button',
          {
            class: `btn${memo.picked!.includes(c.id) ? ' primary' : ''}`,
            type: 'button',
            'aria-pressed': String(memo.picked!.includes(c.id)),
            disabled: locked(),
            onclick: () => toggle(c.id),
          },
          describe(c),
        ),
      ),
    );
    makeBtn.disabled = locked() || !memo.picked!.length;
    clearBtn.disabled = locked() || !memo.picked!.length;
    status.textContent = t(`gamete.ui.status.${word}`, { n: memo.picked!.length });
    madeList.replaceChildren(
      ...memo.made!.map((ids) => h('li', {}, parent.filter((c) => ids.includes(c.id)).map(describe).join('; '))),
    );
    if (!memo.made!.length) madeList.appendChild(h('li', { class: 'note' }, t('gamete.ui.noneYet')));
    const c = countCell({ chromosomes: inNew });
    ctx.counts.set({ chromosomes: c.chromosomes, dnaMolecules: c.dnaMolecules, same: inNew.length ? sameInfo({ chromosomes: inNew }, { chromosomes: parent }) : null });
    drawTray();
    ctx.stage.invalidate();
  };

  const toggle = (id: string) => {
    if (locked()) return;
    const on = memo.picked!.includes(id);
    memo.picked = on ? memo.picked!.filter((x) => x !== id) : [...memo.picked!, id];
    playSfx(on ? 'SFX-09' : 'SFX-10');
    render();
  };

  const showFb = (speak: boolean) => {
    if (!memo.fb) return;
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis, memo.fb.vars);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };

  clearBtn.addEventListener('click', () => {
    memo.picked = [];
    render();
  });

  makeBtn.addEventListener('click', () => {
    const picked = pickedSpecs();
    const err = judgeGamete(picked, parent);
    memo.attempts = (memo.attempts ?? 0) + 1;
    if (!err) {
      const ids = picked.map((c) => c.id).sort();
      const dup = memo.made!.some((m) => m.join() === ids.join());
      if (task.collect && dup) {
        memo.picked = [];
        memo.fb = { kind: 'info', text: `gamete.fb.duplicate.${word}` };
        showFb(true);
        render();
        return;
      }
      recordResult(task.id, true);
      playSfx('SFX-15');
      if (task.collect) {
        memo.made!.push(ids);
        memo.picked = [];
        const left = task.collect - memo.made!.length;
        if (left <= 0) {
          memo.done = true;
          const rule = task.feedback.find((r) => r.when === 'correct');
          memo.fb = { kind: 'good', text: rule?.text ?? 'ui.task.correct' };
        } else memo.fb = { kind: 'good', text: `gamete.fb.another.${word}`, vars: { n: left } };
      } else {
        memo.done = true;
        const rule = task.feedback.find((r) => r.when === 'correct');
        memo.fb = { kind: 'good', text: rule?.text ?? 'ui.task.correct' };
      }
    } else {
      recordResult(task.id, false);
      const rule = task.feedback.find((r) => typeof r.when === 'object' && 'gamete' in r.when && r.when.gamete === err);
      memo.fb = { kind: 'warn', text: rule?.text ?? `gamete.fb.${err}`, mis: rule?.misconception };
      if (task.phase === 'checkpoint' || (!task.collect && memo.attempts >= MAX_ATTEMPTS)) memo.done = true;
      else supports.nextHint(false);
    }
    ctx.setDone(!!memo.done);
    showFb(true);
    render();
  });

  const unResize = ctx.stage.onResize(render);
  render();
  showFb(false);
  ctx.setDone(!!memo.done);
  ctx.autoRead();
  return {
    dispose: () => {
      unResize();
      views.forEach((v) => v.dispose());
      legendEl.remove();
    },
  };
}
