// B5 — The twist (SC.HS.9.4.b). Students choose which of Fig's tissues to
// test (shared band task, 'tissues' mode). Her tail, skin and blood match each
// other but not the hatchlings; her egg cells match them. Then the
// explanation: two embryos fused before she hatched, and each cell line kept
// copying itself by mitosis. Only the egg-making line is inherited.
import * as THREE from 'three';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { PALETTE, basic, circleShape, easeInOut, paper, roundRectShape, setOpacity, strokeGeometry } from '../../engine/stage/paper';
import { label } from '../../engine/stage/stage';
import { Timeline } from '../../engine/stage/timeline';
import { storyScene } from '../../engine/stage/story';
import { playSfx } from '../../engine/sfx';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

/** A cluster of small cells: line 1 is solid teal paper, line 2 striped deep blue. */
function cluster(line: 1 | 2 | 'mixed', r: number): THREE.Group {
  const g = new THREE.Group();
  const spots: [number, number][] = [];
  for (let ring = 0; ring < 3; ring++) {
    const n = ring === 0 ? 1 : ring * 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.4;
      spots.push([Math.cos(a) * ring * r * 0.34, Math.sin(a) * ring * r * 0.34]);
    }
  }
  spots.forEach(([x, y], i) => {
    const which = line === 'mixed' ? (x < -0.05 * r || (Math.abs(x) <= 0.05 * r && i % 2) ? 1 : 2) : line;
    const c = paper(circleShape(r * 0.17), { color: which === 1 ? PALETTE.teal : PALETTE.blue, striped: which === 2, outline: 0.03, shadow: false });
    c.position.set(x, y, 0);
    g.add(c);
  });
  return g;
}

function twoLinesScene(ctx: StepContext): StepView {
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const tags: HTMLElement[] = [];
  const tag = (key: string, x: number, y: number, cls = 'stage-label') => {
    const el = h('div', { class: cls, 'aria-hidden': 'true' }, t(key));
    tags.push(el);
    const o = label(el, { x, y, z: 0.3 });
    root.add(o);
    return o;
  };

  // Stage 1: two embryos side by side.
  const e1 = cluster(1, 1.2);
  const e2 = cluster(2, 1.2);
  root.add(e1, e2);
  const t1 = tag('B5.lines.embryo1', -3, 2.0);
  const t2 = tag('B5.lines.embryo2', 3, 2.0);
  // Stage 2: one embryo with both lines.
  const fused = cluster('mixed', 1.5);
  fused.position.set(0, 1.4, 0);
  root.add(fused);
  const tFig = tag('B5.lines.fig', 0, 3.25);
  // Stage 3: what each line builds.
  const branch = new THREE.Group();
  root.add(branch);
  const box = (x: number, y: number, w: number, key: string, line: 1 | 2) => {
    const card = paper(roundRectShape(w, 1.2, 0.22), { color: line === 1 ? PALETTE.teal : PALETTE.blue, striped: line === 2, outline: 0.07 });
    card.position.set(x, y, 0);
    branch.add(card);
    const l = label(h('div', { class: 'cycle-node on-dark', 'aria-hidden': 'true' }, t(key)), { x, y, z: 0.3 });
    tags.push(l.element);
    branch.add(l);
  };
  const line = (pts: [number, number][]) => {
    const m = new THREE.Mesh(strokeGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 0.07, false), basic(PALETTE.ink));
    m.position.z = -0.1;
    branch.add(m);
  };
  box(-3.4, -1.9, 4.0, 'B5.lines.body', 1);
  box(2.4, -1.9, 2.6, 'B5.lines.eggs', 2);
  box(5.3, -1.9, 2.0, 'B5.lines.young', 2);
  line([[-0.7, 0.2], [-3.4, -1.3]]);
  line([[0.7, 0.2], [2.4, -1.3]]);
  line([[3.7, -1.9], [4.3, -1.9]]);
  const tag1 = label(h('div', { class: 'cycle-arrow-label', 'aria-hidden': 'true' }, t('B5.lines.line1')), { x: -2.6, y: -0.35, z: 0.3 });
  const tag2 = label(h('div', { class: 'cycle-arrow-label', 'aria-hidden': 'true' }, t('B5.lines.line2')), { x: 2.2, y: -0.35, z: 0.3 });
  tags.push(tag1.element, tag2.element);
  branch.add(tag1, tag2);

  const reset = () => {
    e1.position.set(-3, 0.5, 0);
    e2.position.set(3, 0.5, 0);
    [e1, e2, t1, t2].forEach((o) => (o.visible = true));
    setOpacity(e1, 1);
    setOpacity(e2, 1);
    fused.visible = tFig.visible = branch.visible = false;
    ctx.stage.invalidate();
  };
  const memo = ctx.memo as { done?: number };
  const tl = new Timeline(
    ctx.stage,
    [
      {
        duration: 1.4,
        start: () => playSfx('SFX-17'),
        apply: (p) => {
          const e = easeInOut(p);
          e1.position.set(-3 + 2.2 * e, 0.5 + 0.9 * e, 0);
          e2.position.set(3 - 2.2 * e, 0.5 + 0.9 * e, 0);
          t1.visible = t2.visible = p < 0.3;
          fused.visible = p > 0.85;
          tFig.visible = p >= 1;
          setOpacity(e1, 1 - Math.max(0, (p - 0.85) / 0.15));
          setOpacity(e2, 1 - Math.max(0, (p - 0.85) / 0.15));
          if (p >= 1) e1.visible = e2.visible = false;
        },
      },
      {
        duration: 1.0,
        start: () => playSfx('SFX-12'),
        apply: (p) => {
          branch.visible = p > 0;
          setOpacity(branch, p);
          tags.forEach((el) => (el.style.opacity = String(p)));
          if (p >= 1) tags.forEach((el) => (el.style.opacity = ''));
        },
      },
    ],
    reset,
  );
  tl.onProgress((d) => (memo.done = d));
  if (memo.done) tl.finish();
  ctx.overlay.appendChild(tl.el);
  ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null });
  return {
    dispose: () => {
      tl.dispose();
      root.traverse((o) => (o as { element?: HTMLElement }).element?.remove());
    },
  };
}

const module: BeatModule = { scenes: { story: storyScene, twoLines: twoLinesScene } };
export default module;
export const scenes = module.scenes;
