import * as THREE from 'three';
import type { ChromSpec, DivideError, DivideTask, PartContent } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { getSettings } from '../settings';
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

/** Where each piece is. A piece is a whole chromosome, or one half (chromatid) of a copied one. */
interface Piece {
  key: string;
  spec: ChromSpec;
  place: 'parent' | 'left' | 'right';
}

interface DivideMemo {
  copied?: boolean;
  pieces?: Piece[];
  history?: { copied: boolean; pieces: Piece[] }[];
  divided?: boolean;
  attempts?: number;
  done?: boolean;
  view?: 'left' | 'right';
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; mis?: string };
}

const CELLS = {
  parent: { x: 0, y: 1.95, rx: 3.5, ry: 1.75 },
  left: { x: -3.35, y: -2.35, rx: 2.85, ry: 1.75 },
  right: { x: 3.35, y: -2.35, rx: 2.85, ry: 1.75 },
} as const;
const SCALE = 0.62;

function signatureCount(pieces: ChromSpec[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of pieces) m.set(p.id, (m.get(p.id) ?? 0) + 1);
  return m;
}

/** Judge one new cell against the parent. */
export function judgeCell(cell: ChromSpec[], parent: ChromSpec[]): DivideError | null {
  if (sameInfo({ chromosomes: cell }, { chromosomes: parent })) return null;
  const got = signatureCount(cell);
  const missing = parent.some((p) => !got.has(p.id));
  const extra = [...got.values()].some((n) => n > 1);
  if (missing && extra) return 'mixed';
  return missing ? 'missing' : 'extra';
}

/**
 * The mistake behind a whole division. One cell with an extra and the other
 * missing one means both halves of an X went to the same cell.
 */
export function overallError(left: DivideError | null, right: DivideError | null): DivideError | null {
  if (!left && !right) return null;
  if ((left === 'extra' && right === 'missing') || (left === 'missing' && right === 'extra')) return 'extra';
  if (left === 'mixed' || right === 'mixed') return 'mixed';
  return left ?? right;
}

/**
 * Divide-a-cell task. Students may copy the chromosomes first (every rod
 * becomes an X); then they place each chromosome, or each half of an X, in
 * new cell 1 or new cell 2, and divide. Select-then-place: click (or Tab +
 * Enter) a chromosome, then a new cell (or its button in the panel).
 */
export function divideTask(ctx: StepContext, task: DivideTask, content: PartContent): StepView {
  const memo = ctx.memo as DivideMemo;
  const parentSpecs = task.cell.chromosomes.map((c) => ({ ...c, state: 'unreplicated' as const }));
  const fresh = () => parentSpecs.map((c) => ({ key: c.id, spec: { ...c }, place: 'parent' as const }));
  memo.pieces ??= fresh();
  memo.history ??= [];
  memo.copied ??= false;
  if (task.phase === 'checkpoint' && !memo.done && progress().results[task.id]) {
    memo.done = true;
    memo.fb = { kind: 'info', text: 'ui.task.firstTry' };
  }

  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const legendEl = legend();
  ctx.stage.el.appendChild(legendEl);
  const cellHits: Record<'left' | 'right', HTMLButtonElement> = {
    left: h('button', { class: 'hit cell-hit', type: 'button' }),
    right: h('button', { class: 'hit cell-hit', type: 'button' }),
  };
  for (const [name, c] of Object.entries(CELLS)) {
    const g = paper(ellipseShape(c.rx, c.ry), { color: name === 'parent' ? PALETTE.cream : '#f7efdc', outline: 0.08 });
    g.position.set(c.x, c.y, -0.5);
    root.add(g);
    const lab = h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t(name === 'parent' ? 'A2.cell.parent' : name === 'left' ? 'A2.cell.one' : 'A2.cell.two'));
    root.add(label(lab, { x: c.x, y: c.y + c.ry + 0.3, z: 0.2 }));
  }
  for (const side of ['left', 'right'] as const) {
    const c = CELLS[side];
    root.add(label(cellHits[side], { x: c.x, y: c.y, z: 0.15 }));
    cellHits[side].addEventListener('click', () => placeSelected(side));
  }
  const sizeCellHits = () => {
    const u = ctx.stage.unitsPerPixel();
    for (const side of ['left', 'right'] as const) {
      cellHits[side].style.width = `${(CELLS[side].rx * 2) / u}px`;
      cellHits[side].style.height = `${(CELLS[side].ry * 2) / u}px`;
    }
  };
  sizeCellHits();

  let views: { piece: Piece; view: ChromosomeView }[] = [];
  let selected: string | null = null;

  // ---------- Panel ----------
  const prompt = paragraph(task.prompt);
  const supports = new Supports(ctx, task, () => undefined);
  const copyBtn = h('button', { class: 'btn', type: 'button' }, t('A2.ui.copy'));
  const toLeft = h('button', { class: 'btn', type: 'button' }, t('A2.ui.toOne'));
  const toRight = h('button', { class: 'btn', type: 'button' }, t('A2.ui.toTwo'));
  const undoBtn = h('button', { class: 'btn', type: 'button' }, h('span', { class: 'ico', 'aria-hidden': 'true' }, '↶'), t('A2.ui.undo'));
  const resetBtn = h('button', { class: 'btn', type: 'button' }, t('A2.ui.reset'));
  const divideBtn = h('button', { class: 'btn primary', type: 'button' }, t('A2.ui.divide'));
  const status = h('p', { role: 'status', 'aria-live': 'polite' });
  const viewRow = h('div', { class: 'seg-options', hidden: true });
  const fbSlot = h('div', {});
  ctx.body.append(
    prompt.el,
    supports.top,
    h(
      'div',
      { class: 'card' },
      status,
      h('div', { class: 'seg-options' }, copyBtn),
      h('div', { class: 'seg-options' }, toLeft, toRight),
      h('div', { class: 'seg-options' }, undoBtn, resetBtn, divideBtn),
      viewRow,
    ),
    fbSlot,
  );
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);
  ctx.setReadables([prompt]);

  // ---------- Model ----------
  const snapshot = () => ({ copied: !!memo.copied, pieces: memo.pieces!.map((p) => ({ ...p, spec: { ...p.spec } })) });
  const push = () => memo.history!.push(snapshot());

  const layout = (place: Piece['place'], i: number, n: number) => {
    const c = CELLS[place];
    const span = c.rx * 1.5;
    const x = n === 1 ? c.x : c.x - span / 2 + (span * i) / (n - 1);
    return { x, y: c.y - 0.05 };
  };

  const counts = (place: Piece['place']) => {
    const specs = memo.pieces!.filter((p) => p.place === place).map((p) => p.spec);
    return { specs, ...countCell({ chromosomes: specs }) };
  };

  const updateStrip = () => {
    if (memo.divided) {
      const side = memo.view ?? 'left';
      const c = counts(side);
      ctx.counts.set({ chromosomes: c.chromosomes, dnaMolecules: c.dnaMolecules, same: judgeCell(c.specs, parentSpecs) === null });
    } else {
      const c = counts('parent');
      ctx.counts.set({ chromosomes: c.chromosomes, dnaMolecules: c.dnaMolecules, same: null });
    }
  };

  const render = () => {
    for (const { view } of views) {
      view.dispose();
      view.group.removeFromParent();
    }
    views = [];
    for (const place of ['parent', 'left', 'right'] as const) {
      // New cells list their chromosomes by pair (M then P), so they are easy to compare with the parent.
      const here = memo.pieces!
        .filter((p) => p.place === place)
        .sort((x, y) => (place === 'parent' ? 0 : x.spec.pair - y.spec.pair || x.spec.parent.localeCompare(y.spec.parent)));
      here.forEach((piece, i) => {
        const pos = layout(place, i, here.length);
        const view = new ChromosomeView({ ...piece.spec, x: pos.x, y: pos.y, angle: 0 });
        view.group.scale.setScalar(SCALE);
        root.add(view.group);
        if (place === 'parent' && !memo.divided && !memo.done) {
          view.makeHit(() => select(piece.key), ctx.stage.unitsPerPixel() / SCALE);
          view.hit!.setAttribute('aria-pressed', String(selected === piece.key));
          view.updateHitLabel(selected === piece.key ? t('model.aria.selected') : undefined);
        }
        views.push({ piece, view });
      });
    }
    const inParent = memo.pieces!.filter((p) => p.place === 'parent').length;
    copyBtn.disabled = !!memo.copied || memo.pieces!.some((p) => p.place !== 'parent') || !!memo.divided || !!memo.done;
    toLeft.disabled = toRight.disabled = !selected;
    cellHits.left.disabled = cellHits.right.disabled = !selected;
    undoBtn.disabled = !memo.history!.length || !!memo.divided || !!memo.done;
    resetBtn.disabled = !!memo.done && task.phase === 'checkpoint';
    divideBtn.disabled = inParent > 0 || !!memo.divided || !!memo.done;
    status.textContent = memo.divided
      ? t('A2.ui.divided')
      : inParent > 0
        ? selected
          ? t('A2.ui.pickCell')
          : t('A2.ui.left', { n: inParent })
        : t('A2.ui.ready');
    viewRow.hidden = !memo.divided;
    viewRow.replaceChildren(
      ...(['left', 'right'] as const).map((side) =>
        h(
          'button',
          {
            class: `btn${(memo.view ?? 'left') === side ? ' primary' : ''}`,
            type: 'button',
            'aria-pressed': String((memo.view ?? 'left') === side),
            onclick: () => {
              memo.view = side;
              render();
            },
          },
          t('A2.ui.show', { name: t(side === 'left' ? 'A2.cell.one' : 'A2.cell.two') }),
        ),
      ),
    );
    updateStrip();
    ctx.stage.invalidate();
  };

  const select = (key: string) => {
    selected = selected === key ? null : key;
    if (selected) playSfx('SFX-09');
    render();
    // Keep keyboard focus on the chosen chromosome.
    views.find((v) => v.piece.key === key)?.view.hit?.focus();
  };

  function placeSelected(side: 'left' | 'right'): void {
    if (!selected) return;
    const piece = memo.pieces!.find((p) => p.key === selected);
    if (!piece) return;
    push();
    if (piece.spec.state === 'replicated') {
      // Split the X: one half goes to the chosen cell, its sister stays to be placed.
      piece.spec = { ...piece.spec, state: 'unreplicated' };
      memo.pieces!.push({ key: `${piece.key}-b`, spec: { ...piece.spec }, place: side });
    } else {
      piece.place = side;
    }
    selected = null;
    playSfx('SFX-10');
    render();
    const next = views.find((v) => v.piece.place === 'parent')?.view.hit;
    (next ?? divideBtn).focus();
  }

  copyBtn.addEventListener('click', () => {
    push();
    memo.copied = true;
    memo.pieces!.forEach((p) => (p.spec = { ...p.spec, state: 'replicated' }));
    playSfx('SFX-11');
    render();
  });
  toLeft.addEventListener('click', () => placeSelected('left'));
  toRight.addEventListener('click', () => placeSelected('right'));
  undoBtn.addEventListener('click', () => {
    const last = memo.history!.pop();
    if (!last) return;
    memo.copied = last.copied;
    memo.pieces = last.pieces;
    selected = null;
    render();
  });
  resetBtn.addEventListener('click', () => {
    memo.copied = false;
    memo.pieces = fresh();
    memo.history = [];
    memo.divided = false;
    memo.fb = undefined;
    selected = null;
    fbSlot.replaceChildren();
    ctx.captions.clearLines();
    render();
  });

  const showFb = (speak: boolean) => {
    if (!memo.fb) return;
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };

  divideBtn.addEventListener('click', () => {
    memo.divided = true;
    memo.attempts = (memo.attempts ?? 0) + 1;
    playSfx('SFX-12');
    const left = judgeCell(counts('left').specs, parentSpecs);
    const right = judgeCell(counts('right').specs, parentSpecs);
    const ok = !left && !right;
    recordResult(task.id, ok);
    const err = overallError(left, right);
    memo.view = left ? 'left' : right ? 'right' : 'left';
    if (ok) {
      const rule = task.feedback.find((r) => r.when === 'correct');
      memo.fb = { kind: 'good', text: rule?.text ?? 'ui.task.correct' };
      ctx.captions.setLines(['VO-A11'], { autoAdvance: false, autoplay: getSettings().readAloud });
    } else {
      const rule = task.feedback.find((r) => typeof r.when === 'object' && 'divide' in r.when && r.when.divide === err);
      memo.fb = { kind: 'warn', text: rule?.text ?? 'A2.fb.mixed', mis: rule?.misconception };
      if (err === 'missing') ctx.captions.setLines(['VO-A10'], { autoAdvance: false, autoplay: getSettings().readAloud });
      if (task.phase !== 'checkpoint' && task.phase !== 'attempt') supports.nextHint(false);
    }
    // Attempt-first: one try is enough to move on. Otherwise: correct, 3 tries, or the checkpoint.
    if (ok || task.phase === 'attempt' || task.phase === 'checkpoint' || memo.attempts >= MAX_ATTEMPTS) {
      memo.done = task.phase === 'checkpoint' || ok ? true : memo.done;
      ctx.setDone(true);
    }
    showFb(true);
    render();
  });

  const unResize = ctx.stage.onResize(() => {
    sizeCellHits();
    render();
  });
  render();
  showFb(false);
  ctx.setDone(!!memo.done || (task.phase === 'attempt' && !!memo.attempts) || (memo.attempts ?? 0) >= MAX_ATTEMPTS);
  ctx.autoRead();
  return {
    dispose: () => {
      unResize();
      views.forEach(({ view }) => view.dispose());
      legendEl.remove();
    },
  };
}
