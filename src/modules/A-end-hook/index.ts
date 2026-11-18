// A-end — Hook. VO-A15 plants the rule Part B breaks. The life-cycle diagram
// shows the mitosis half (growth and repair) filled in; the meiosis half
// stays greyed out until Unit 4.
import * as THREE from 'three';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { PALETTE, basic, paper, roundRectShape, strokeGeometry } from '../../engine/stage/paper';
import { label } from '../../engine/stage/stage';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

interface Node {
  key: string;
  x: number;
  y: number;
  part: 'A' | 'B';
}

/** The life cycle. variant 'complete' (B7): the meiosis half is filled in too. */
export function lifeCycleScene(ctx: StepContext): StepView {
  const complete = (ctx.step as { variant?: string }).variant === 'complete';
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const nodes: Node[] = [
    { key: 'adult', x: 0, y: 2.9, part: 'A' },
    { key: 'gametes', x: 4.2, y: 0.4, part: 'B' },
    { key: 'zygote', x: 2.4, y: -2.9, part: 'B' },
    { key: 'hatchling', x: -2.4, y: -2.9, part: 'A' },
    { key: 'growth', x: -4.2, y: 0.4, part: 'A' },
  ];
  // Arrows between stages: Part A (mitosis) solid ink; Part B (meiosis, fertilisation) grey dashes.
  const arrows: [number, number, 'A' | 'B', string][] = [
    [0, 1, 'B', 'A-end.cycle.meiosis'],
    [1, 2, 'B', 'A-end.cycle.fertilisation'],
    [2, 3, 'A', 'A-end.cycle.mitosis'],
    [3, 4, 'A', 'A-end.cycle.mitosis'],
    [4, 0, 'A', 'A-end.cycle.mitosis'],
  ];
  for (const [a, b, p0, key] of arrows) {
    const part = complete ? 'A' : p0;
    const p = new THREE.Vector2(nodes[a].x, nodes[a].y);
    const q = new THREE.Vector2(nodes[b].x, nodes[b].y);
    const dir = q.clone().sub(p).normalize();
    const from = p.clone().add(dir.clone().multiplyScalar(1.3));
    const to = q.clone().sub(dir.clone().multiplyScalar(1.3));
    const pts: THREE.Vector2[] = [];
    const n = part === 'B' ? 9 : 1;
    for (let i = 0; i < n; i++) {
      const s = i / n;
      const e = part === 'B' ? (i + 0.55) / n : 1;
      pts.push(from.clone().lerp(to, s), from.clone().lerp(to, e));
    }
    for (let i = 0; i < pts.length; i += 2) {
      const m = new THREE.Mesh(strokeGeometry([pts[i], pts[i + 1]], 0.09, false), basic(part === 'A' ? PALETTE.ink : '#a89c8a'));
      m.position.z = -0.1;
      root.add(m);
    }
    // Arrow head.
    const side = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(0.22);
    const back = to.clone().sub(dir.clone().multiplyScalar(0.38));
    const head = new THREE.Shape([to, back.clone().add(side), back.clone().sub(side)]);
    root.add(new THREE.Mesh(new THREE.ShapeGeometry(head), basic(part === 'A' ? PALETTE.ink : '#a89c8a')));
    const mid = from.clone().lerp(to, 0.5);
    root.add(
      label(h('div', { class: `cycle-arrow-label${part === 'B' ? ' later' : ''}`, 'aria-hidden': 'true' }, t(key)), { x: mid.x, y: mid.y + 0.3, z: 0.2 }),
    );
  }
  for (const n0 of nodes) {
    const n = complete ? { ...n0, part: 'A' as const } : n0;
    const card = paper(roundRectShape(2.3, 1.3, 0.25), { color: n.part === 'A' ? PALETTE.cream : '#e7e1d6', outline: n.part === 'A' ? 0.07 : 0.04 });
    card.position.set(n.x, n.y, 0);
    root.add(card);
    root.add(
      label(h('div', { class: `cycle-node${n.part === 'B' ? ' later' : ''}`, 'aria-hidden': 'true' }, t(`A-end.cycle.${n.key}`)), { x: n.x, y: n.y, z: 0.2 }),
    );
  }
  if (!complete) root.add(label(h('div', { class: 'cycle-note', 'aria-hidden': 'true' }, t('A-end.cycle.partB')), { x: 4.2, y: 1.6, z: 0.2 }));
  ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null });
  ctx.stage.invalidate();
  return { dispose: () => undefined };
}

const module: BeatModule = { scenes: { lifecycle: lifeCycleScene } };
export default module;
export const scenes = module.scenes;
