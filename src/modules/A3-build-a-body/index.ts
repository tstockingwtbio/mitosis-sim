// A3 — Build a body (SC.HS.6.1.d). Attempt first: students switch genes on and
// off in one cell to make bone, muscle or skin, then VO-A13 explains. Every
// cell keeps the same chromosomes (the count strip never changes); only which
// genes are switched on differs. No gene-control mechanisms (standard limit).
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { ChromSpec, GeneName, PartContent, SwitchTask, Task } from '../../content/schema';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { progress, recordResult } from '../../engine/progress';
import { ChromosomeView } from '../../engine/stage/chromosomeView';
import { PALETTE, basic, circleShape, ellipseShape, paper, roundRectShape, strokeGeometry } from '../../engine/stage/paper';
import { label } from '../../engine/stage/stage';
import { playSfx } from '../../engine/sfx';
import { paragraph } from '../../engine/ui/text';
import { MAX_ATTEMPTS, Supports, feedback, setFeedback, supportsOn } from '../../engine/tasks/common';
import a0 from '../A0-cold-open/index';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

const GENES: GeneName[] = ['bone', 'muscle', 'skin'];
type CellKind = GeneName | 'undecided' | 'mixed';

/** Fig's chromosomes, with the three tissue genes as tabs (same in every cell). */
function figChromosomes(): ChromSpec[] {
  const words = (g: GeneName) => t(`A3.gene.${g}.tab`);
  return [
    { id: '1M', pair: 1, parent: 'M', state: 'unreplicated', length: 'long', alleles: [words('bone'), words('skin')] },
    { id: '1P', pair: 1, parent: 'P', state: 'unreplicated', length: 'long', alleles: [words('bone'), words('skin')] },
    { id: '2M', pair: 2, parent: 'M', state: 'unreplicated', length: 'short', alleles: [words('muscle')] },
    { id: '2P', pair: 2, parent: 'P', state: 'unreplicated', length: 'short', alleles: [words('muscle')] },
  ];
}

/** Which gene each tab on a chromosome belongs to, by its text. */
function geneOfTab(text: string): GeneName | null {
  return GENES.find((g) => t(`A3.gene.${g}.tab`) === text) ?? null;
}

function cellKind(on: Set<GeneName>): CellKind {
  if (on.size === 0) return 'undecided';
  if (on.size > 1) return 'mixed';
  return [...on][0];
}

/** One cell drawn as the kind of cell its switched-on genes make. */
function drawCell(kind: CellKind, size = 1): THREE.Group {
  const g = new THREE.Group();
  const add = (o: THREE.Object3D, z = 0) => {
    o.position.z += z;
    g.add(o);
  };
  if (kind === 'undecided' || kind === 'mixed') {
    add(paper(circleShape(1.4), { color: PALETTE.cream, outline: 0.08 }));
    add(paper(circleShape(0.45, 0, 0.05), { color: PALETTE.blue, outline: 0.05, shadow: false }), 0.02);
    if (kind === 'mixed') {
      // Pieces of two cell types at once: it cannot settle on one.
      const bits = [
        paper(roundRectShape(0.9, 0.35, 0.15, -0.6, 0.75), { color: PALETTE.orange, outline: 0.04, shadow: false }),
        paper(roundRectShape(0.6, 0.6, 0.1, 0.65, -0.55), { color: '#efe2c4', outline: 0.04, shadow: false }),
        paper(ellipseShape(0.25, 0.18, 0.7, 0.6), { color: '#3d4f63', outline: 0.03, shadow: false }),
      ];
      bits.forEach((b) => add(b, 0.03));
      add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, '?'), { x: 0, y: -0.9, z: 0.1 }));
    }
  } else if (kind === 'bone') {
    // Hard matrix in rings, a small cell in the middle with thin channels.
    add(paper(roundRectShape(3, 2.6, 0.5), { color: '#efe2c4', outline: 0.08 }));
    for (const r of [1.1, 0.8]) {
      const ring = new THREE.Mesh(strokeGeometry(ellipseShape(r * 1.2, r).getPoints(40), 0.05), basic('#b9a77e'));
      ring.position.z = 0.01;
      g.add(ring);
    }
    add(paper(ellipseShape(0.4, 0.22), { color: '#7a6a4d', outline: 0.04, shadow: false }), 0.02);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const m = new THREE.Mesh(strokeGeometry([new THREE.Vector2(Math.cos(a) * 0.4, Math.sin(a) * 0.22), new THREE.Vector2(Math.cos(a) * 0.75, Math.sin(a) * 0.5)], 0.035, false), basic('#7a6a4d'));
      m.position.z = 0.025;
      g.add(m);
    }
  } else if (kind === 'muscle') {
    // A long fibre with stripes and several nuclei.
    add(paper(roundRectShape(3.6, 1.1, 0.5), { color: PALETTE.orange, outline: 0.08 }));
    for (let i = 0; i < 13; i++) {
      const x = -1.5 + i * 0.25;
      const m = new THREE.Mesh(strokeGeometry([new THREE.Vector2(x, -0.42), new THREE.Vector2(x, 0.42)], 0.05, false), basic('#b35517'));
      m.position.z = 0.01;
      g.add(m);
    }
    for (const x of [-0.9, 0.2, 1.1]) add(paper(ellipseShape(0.22, 0.12, x, 0.1), { color: PALETTE.blue, outline: 0.03, shadow: false }), 0.02);
  } else {
    // Skin: flat cells like tiles, with Fig's orange and slate-blue colour.
    for (let i = -1; i <= 1; i++) {
      const hex = new THREE.Shape();
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
        const x = i * 1.05 + Math.cos(a) * 0.62;
        const y = Math.sin(a) * 0.42;
        if (k === 0) hex.moveTo(x, y);
        else hex.lineTo(x, y);
      }
      hex.closePath();
      add(paper(hex, { color: PALETTE.orange, outline: 0.06 }));
      add(paper(ellipseShape(0.16, 0.1, i * 1.05 + 0.15, 0.08), { color: '#3d4f63', outline: 0.03, shadow: false }), 0.02);
    }
  }
  g.scale.setScalar(size);
  return g;
}

/** A row of Fig's four chromosomes with gene tabs that light up when switched on. */
class GeneRow {
  readonly root = new THREE.Group();
  private views: ChromosomeView[] = [];
  constructor(x: number, y: number, scale: number) {
    figChromosomes().forEach((spec, i) => {
      const v = new ChromosomeView({ ...spec, x: x - 2.7 * scale + i * 1.8 * scale, y, angle: 0 });
      v.group.scale.setScalar(scale);
      this.root.add(v.group);
      this.views.push(v);
    });
  }
  light(on: Set<GeneName>): void {
    for (const v of this.views) {
      v.group.traverse((o) => {
        if (!(o instanceof CSS2DObject)) return;
        const gene = geneOfTab(o.element.textContent ?? '');
        if (!gene) return;
        o.element.classList.toggle('gene-on', on.has(gene));
      });
    }
  }
  dispose(): void {
    this.views.forEach((v) => v.dispose());
  }
}

const fixedCounts = (ctx: StepContext) => ctx.counts.set({ chromosomes: 4, dnaMolecules: 4, same: true });

// ---------- Switch task ----------

interface SwitchMemo {
  on?: GeneName[];
  attempts?: number;
  done?: boolean;
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; mis?: string };
}

function switchTask(ctx: StepContext, task: SwitchTask, content: PartContent): StepView {
  const memo = ctx.memo as SwitchMemo;
  memo.on ??= [];
  if (task.phase === 'checkpoint' && !memo.done && progress().results[task.id]) {
    memo.done = true;
    memo.fb = { kind: 'info', text: 'ui.task.firstTry' };
  }
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const row = new GeneRow(0, -2.6, 0.75);
  root.add(row.root);
  root.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t('A3.ui.chromosomes')), { x: 0, y: -0.95, z: 0.2 }));
  let cellGroup: THREE.Group | null = null;
  const kindLabel = h('div', { class: 'stage-label', 'aria-hidden': 'true' });
  root.add(label(kindLabel, { x: 0, y: 3.6, z: 0.2 }));
  fixedCounts(ctx);

  const prompt = paragraph(task.prompt);
  const supports = new Supports(ctx, task, () => undefined);
  const status = h('p', { role: 'status', 'aria-live': 'polite', style: { fontWeight: '700' } });
  const switches = h('div', { class: 'gene-switches' });
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, t('ui.task.check'));
  const fbSlot = h('div', {});
  ctx.body.append(prompt.el, supports.top, h('div', { class: 'card' }, switches, status, h('div', {}, checkBtn)), fbSlot);
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);

  const render = () => {
    const on = new Set(memo.on);
    cellGroup?.removeFromParent();
    const kind = cellKind(on);
    cellGroup = drawCell(kind, 1);
    cellGroup.position.set(0, 1.55, 0);
    root.add(cellGroup);
    kindLabel.textContent = t(`A3.kind.${kind}`);
    status.textContent = t('A3.ui.nowA', { kind: t(`A3.kind.${kind}`) });
    row.light(on);
    switches.replaceChildren(
      ...GENES.map((g) =>
        h(
          'button',
          {
            class: `gene-switch${on.has(g) ? ' on' : ''}`,
            type: 'button',
            role: 'switch',
            'aria-checked': String(on.has(g)),
            disabled: !!memo.done && task.phase === 'checkpoint',
            onclick: () => {
              const set = new Set(memo.on);
              if (set.has(g)) set.delete(g);
              else set.add(g);
              memo.on = [...set];
              playSfx(set.has(g) ? 'SFX-13' : 'SFX-14');
              render();
              switches.querySelectorAll<HTMLElement>('.gene-switch')[GENES.indexOf(g)]?.focus();
            },
          },
          h('span', { class: 'lamp', 'aria-hidden': 'true' }),
          h('span', {}, t(`A3.gene.${g}`)),
          h('span', { class: 'state' }, on.has(g) ? t('settings.on') : t('settings.off')),
        ),
      ),
    );
    ctx.stage.invalidate();
  };

  const showFb = (speak: boolean) => {
    if (!memo.fb) return;
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };

  checkBtn.addEventListener('click', () => {
    memo.attempts = (memo.attempts ?? 0) + 1;
    const on = new Set(memo.on);
    const ok = on.size === 1 && on.has(task.target);
    recordResult(task.id, ok);
    const err = ok ? null : on.size === 0 ? 'none' : on.has(task.target) ? 'extra' : 'wrong';
    const rule = ok ? task.feedback.find((r) => r.when === 'correct') : task.feedback.find((r) => typeof r.when === 'object' && 'switch' in r.when && r.when.switch === err);
    memo.fb = ok ? { kind: 'good', text: rule?.text ?? 'ui.task.correct' } : { kind: 'warn', text: rule?.text ?? 'A3.fb.wrong', mis: rule?.misconception };
    if (!ok && task.phase !== 'checkpoint' && task.phase !== 'attempt') supports.nextHint(false);
    if (ok || task.phase === 'attempt' || task.phase === 'checkpoint' || memo.attempts >= MAX_ATTEMPTS) {
      memo.done = ok || task.phase === 'checkpoint';
      ctx.setDone(true);
      if (task.phase === 'checkpoint') checkBtn.disabled = true;
    }
    showFb(true);
    render();
  });

  render();
  showFb(false);
  if (memo.done && task.phase === 'checkpoint') checkBtn.disabled = true;
  ctx.setDone(!!memo.done || (task.phase === 'attempt' && !!memo.attempts) || (memo.attempts ?? 0) >= MAX_ATTEMPTS);
  ctx.setReadables([prompt]);
  ctx.autoRead();
  return { dispose: () => row.dispose() };
}

// ---------- Scenes ----------

/** The stump: a lump of identical, undecided cells, each with the full set of chromosomes. */
function stumpScene(ctx: StepContext): StepView {
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const spots: [number, number][] = [[0, 0.9], [-1.4, 0.4], [1.4, 0.4], [-0.7, -0.6], [0.7, -0.6], [-2.1, -0.7], [2.1, -0.7]];
  spots.forEach(([x, y], i) => {
    const c = drawCell('undecided', 0.5);
    c.position.set(x * 1.3, y * 1.3 + 1.2, i * 0.01);
    root.add(c);
  });
  const row = new GeneRow(0, -2.6, 0.7);
  root.add(row.root);
  root.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t('A3.ui.everyCell')), { x: 0, y: -0.95, z: 0.2 }));
  fixedCounts(ctx);
  ctx.stage.invalidate();
  return { dispose: () => row.dispose() };
}

/** Bone, muscle and skin cells side by side: the same chromosomes, different genes switched on. */
function threeCellsScene(ctx: StepContext): StepView {
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const w = ctx.stage.viewWidth;
  const xs = [-w / 3, 0, w / 3].map((x) => x * 0.95);
  GENES.forEach((g, i) => {
    const c = drawCell(g, 0.75);
    c.position.set(xs[i], 2.3, 0);
    root.add(c);
    root.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t(`A3.kind.${g}`)), { x: xs[i], y: 3.75, z: 0.2 }));
    // Which genes this cell has switched on (all three genes are in every cell).
    const lamps = h(
      'div',
      { class: 'gene-lamps', 'aria-hidden': 'true' },
      GENES.map((gg) => h('span', { class: gg === g ? 'on' : '' }, h('i', {}), `${t(`A3.gene.${gg}.tab`)} ${gg === g ? t('settings.on') : t('settings.off')}`)),
    );
    root.add(label(lamps, { x: xs[i], y: 0.75, z: 0.2 }));
  });
  const row = new GeneRow(0, -2.5, 0.75);
  root.add(row.root);
  root.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t('A3.ui.sameDna')), { x: 0, y: -0.85, z: 0.2 }));
  fixedCounts(ctx);
  ctx.stage.invalidate();
  return { dispose: () => row.dispose() };
}

const module: BeatModule = {
  scenes: {
    stump: stumpScene,
    'three-cells': threeCellsScene,
    regrow: a0.scenes.regrow,
  },
  tasks: {
    switch: (ctx, task: Task, content) => switchTask(ctx, task as SwitchTask, content),
  },
};

export default module;
export const scenes = module.scenes;
export const tasks = module.tasks;
