import * as THREE from 'three';
import type { CellSpec } from '../../content/schema';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { CellScene } from '../../engine/stage/cellScene';
import { PALETTE, basic, strokeGeometry } from '../../engine/stage/paper';
import { label } from '../../engine/stage/stage';
import { Timeline } from '../../engine/stage/timeline';
import { playSfx } from '../../engine/sfx';
import type { StepContext, StepView } from '../../engine/types';

function cellOf(ctx: StepContext): CellSpec {
  return (ctx.step as { cell: CellSpec }).cell;
}

/** Chromosomes come in pairs: a toggle draws a bracket and label under each pair. */
export function pairsScene(ctx: StepContext): StepView {
  const scene = new CellScene(ctx.stage, cellOf(ctx), { layout: 'cell' });
  const c = scene.counts();
  ctx.counts.set({ chromosomes: c.chromosomes, dnaMolecules: c.dnaMolecules, same: null });
  const memo = ctx.memo as { show?: boolean };
  const marks = new THREE.Group();
  scene.root.add(marks);

  const pairs = new Map<number, number[]>();
  for (const v of scene.views) pairs.set(v.spec.pair, [...(pairs.get(v.spec.pair) ?? []), v.group.position.x]);
  let n = 1;
  for (const [, xs] of [...pairs.entries()].sort((a, b) => a[0] - b[0])) {
    const x0 = Math.min(...xs) - 0.35;
    const x1 = Math.max(...xs) + 0.35;
    const y = -1.75;
    const pts = [new THREE.Vector2(x0, y + 0.25), new THREE.Vector2(x0, y), new THREE.Vector2(x1, y), new THREE.Vector2(x1, y + 0.25)];
    const bracket = new THREE.Mesh(strokeGeometry(pts, 0.09, false), basic(PALETTE.ink));
    bracket.position.z = 0.1;
    marks.add(bracket);
    marks.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t('ui.task.pairSlot', { n: n++ })), { x: (x0 + x1) / 2, y: y - 0.45, z: 0.1 }));
  }

  const btn = h('button', { class: 'btn', type: 'button', 'aria-pressed': 'false' });
  const render = () => {
    marks.visible = !!memo.show;
    btn.setAttribute('aria-pressed', String(!!memo.show));
    btn.textContent = memo.show ? t('A1.pairs.hide') : t('A1.pairs.show');
    ctx.stage.invalidate();
  };
  btn.addEventListener('click', () => {
    memo.show = !memo.show;
    playSfx('SFX-01');
    render();
  });
  ctx.body.appendChild(h('div', {}, btn));
  render();
  return { dispose: () => scene.dispose() };
}

/** Each chromosome copies into an X, one stage at a time; the count strip follows live. */
export function replicateScene(ctx: StepContext): StepView {
  const scene = new CellScene(ctx.stage, cellOf(ctx), { layout: 'cell' });
  const memo = ctx.memo as { done?: number };
  const update = () => {
    const c = scene.counts();
    ctx.counts.set({ chromosomes: c.chromosomes, dnaMolecules: c.dnaMolecules, same: null });
  };
  const order = [...scene.views].sort((a, b) => a.group.position.x - b.group.position.x);
  const timeline = new Timeline(
    ctx.stage,
    order.map((v) => ({
      duration: 1.1,
      start: () => playSfx('SFX-11'),
      apply: (p: number) => v.setReplication(p),
    })),
    () => scene.views.forEach((v) => v.setReplication(0)),
  );
  timeline.onProgress((done) => {
    memo.done = done;
    update();
  });
  // Restore after a re-render.
  for (let i = 0; i < (memo.done ?? 0); i++) order[i].setReplication(1);
  timeline.restore(memo.done ?? 0);
  update();
  ctx.overlay.appendChild(timeline.el);
  return {
    dispose: () => {
      timeline.dispose();
      scene.dispose();
    },
  };
}
