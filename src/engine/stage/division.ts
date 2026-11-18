// Keyframed cell division for Part B: meiosis on its own (B2) and mitosis
// next to meiosis (B3). Each frame lists cells and chromosomes; between two
// frames, chromosomes that stay slide to their new spot (and copy, if they
// become an X), new ones slide out of the one they came from, and cells
// cross-fade. Driven by the Timeline (play, pause, step, replay).
import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { ChromSpec } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { ChromosomeView } from './chromosomeView';
import { PALETTE, easeInOut, ellipseShape, paper, setOpacity } from './paper';
import { label, type Stage } from './stage';
import { Timeline } from './timeline';

export interface KChrom {
  key: string;
  spec: ChromSpec;
  x: number;
  y: number;
  angle?: number;
  /** Key of the chromosome this one splits out of (it starts there). */
  from?: string;
}

export interface KCell {
  key: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  /** i18n key for a label above the cell. */
  label?: string;
  /** Plain text under the cell (e.g. the gene letters it holds). */
  sub?: string;
}

export interface KFrame {
  cells: KCell[];
  chroms: KChrom[];
  /** i18n key: what happens in this stage (no phase names). */
  caption?: string;
  /** Counts for one cell of this frame (the count strip). */
  counts?: { chromosomes: number; dnaMolecules: number; same: boolean | null };
}

function fade(obj: THREE.Object3D, a: number): void {
  setOpacity(obj, a);
  obj.traverse((o) => {
    if (o instanceof CSS2DObject) o.element.style.opacity = String(a);
  });
  obj.visible = a > 0.001;
}

export class Division {
  readonly root = new THREE.Group();
  private views = new Map<string, ChromosomeView>();
  private cells = new Map<string, THREE.Group>();

  constructor(
    private stage: Stage,
    readonly frames: KFrame[],
    opts: { x?: number; y?: number; scale?: number; chromScale?: number; tabs?: boolean } = {},
  ) {
    this.root.position.set(opts.x ?? 0, opts.y ?? 0, 0);
    this.root.scale.setScalar(opts.scale ?? 1);
    stage.scene.add(this.root);
    const chromScale = opts.chromScale ?? 0.55;
    for (const f of frames) {
      for (const c of f.cells) {
        if (this.cells.has(c.key)) continue;
        const g = paper(ellipseShape(c.rx, c.ry), { color: PALETTE.cream, outline: 0.08 / (opts.scale ?? 1) });
        g.position.set(c.x, c.y, -0.5);
        if (c.label) g.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t(c.label)), { x: 0, y: c.ry + 0.35, z: 0.7 }));
        if (c.sub) g.add(label(h('div', { class: 'cell-tag', 'aria-hidden': 'true' }, c.sub), { x: 0, y: -c.ry - 0.35, z: 0.7 }));
        this.root.add(g);
        this.cells.set(c.key, g);
      }
      for (const c of f.chroms) {
        if (this.views.has(c.key)) continue;
        const v = new ChromosomeView({ ...c.spec, x: c.x, y: c.y, angle: c.angle ?? 0 }, { tabs: opts.tabs });
        v.group.scale.setScalar(chromScale);
        this.root.add(v.group);
        this.views.set(c.key, v);
      }
    }
    this.show(0);
  }

  /** Jump to a frame. */
  show(i: number): void {
    const f = this.frames[i];
    for (const [key, g] of this.cells) fade(g, f.cells.some((c) => c.key === key) ? 1 : 0);
    for (const [key, v] of this.views) {
      const c = f.chroms.find((x) => x.key === key);
      fade(v.group, c ? 1 : 0);
      if (c) {
        v.group.position.set(c.x, c.y, 0);
        v.group.rotation.z = THREE.MathUtils.degToRad(c.angle ?? 0);
        v.setReplication(c.spec.state === 'replicated' ? 1 : 0);
      }
    }
    this.stage.invalidate();
  }

  /** Between frame i and frame i + 1, at progress p (0..1). */
  transition(i: number, p: number): void {
    const a = this.frames[i];
    const b = this.frames[i + 1];
    if (!b) return;
    const e = easeInOut(p);
    for (const [key, g] of this.cells) {
      const inA = a.cells.find((c) => c.key === key);
      const inB = b.cells.find((c) => c.key === key);
      if (inA && inB) {
        fade(g, 1);
        g.position.set(inA.x + (inB.x - inA.x) * e, inA.y + (inB.y - inA.y) * e, -0.5);
      } else fade(g, inA ? 1 - e : inB ? e : 0);
    }
    for (const [key, v] of this.views) {
      const ca = a.chroms.find((c) => c.key === key);
      const cb = b.chroms.find((c) => c.key === key);
      if (ca && cb) {
        fade(v.group, 1);
        v.group.position.set(ca.x + (cb.x - ca.x) * e, ca.y + (cb.y - ca.y) * e, 0);
        const aa = ca.angle ?? 0;
        v.group.rotation.z = THREE.MathUtils.degToRad(aa + ((cb.angle ?? 0) - aa) * e);
        const ra = ca.spec.state === 'replicated' ? 1 : 0;
        const rb = cb.spec.state === 'replicated' ? 1 : 0;
        v.setReplication(ra + (rb - ra) * p);
      } else if (ca) {
        fade(v.group, 1 - Math.min(1, p * 2.5));
      } else if (cb) {
        const src = cb.from ? a.chroms.find((c) => c.key === cb.from) : undefined;
        const sx = src?.x ?? cb.x;
        const sy = src?.y ?? cb.y;
        const sa = src?.angle ?? cb.angle ?? 0;
        fade(v.group, Math.min(1, p * 2.5));
        v.group.position.set(sx + (cb.x - sx) * e, sy + (cb.y - sy) * e, 0.05);
        v.group.rotation.z = THREE.MathUtils.degToRad(sa + ((cb.angle ?? 0) - sa) * e);
        v.setReplication(cb.spec.state === 'replicated' ? 1 : 0);
      } else fade(v.group, 0);
    }
    this.stage.invalidate();
  }

  dispose(): void {
    this.views.forEach((v) => v.dispose());
    this.root.removeFromParent();
  }
}

/** Fig's egg-making cell for Part B: two pairs, alleles on tabs. */
export function figGermCell(): ChromSpec[] {
  return [
    { id: '1M', pair: 1, parent: 'M', state: 'unreplicated', length: 'long', alleles: ['A', 'E'] },
    { id: '1P', pair: 1, parent: 'P', state: 'unreplicated', length: 'long', alleles: ['a', 'e'] },
    { id: '2M', pair: 2, parent: 'M', state: 'unreplicated', length: 'short', alleles: ['B'] },
    { id: '2P', pair: 2, parent: 'P', state: 'unreplicated', length: 'short', alleles: ['b'] },
  ];
}

const SWAP_AT = 0.66;

/** The partner's top allele (crossing over swaps the tip, which holds allele 0). */
function crossed(spec: ChromSpec, partner: ChromSpec): ChromSpec {
  const alleles = [...spec.alleles];
  if (alleles.length > 1) alleles[0] = partner.alleles[0];
  return { ...spec, alleles, swap: SWAP_AT, state: 'unreplicated' };
}

const rep = (s: ChromSpec): ChromSpec => ({ ...s, state: 'replicated' });
const unrep = (s: ChromSpec): ChromSpec => ({ ...s, state: 'unreplicated', swap: undefined });

function startFrame(specs: ChromSpec[], caption: string): KFrame {
  const xs = [-1.8, -0.6, 0.6, 1.8];
  return {
    cells: [{ key: 'parent', x: 0, y: 0, rx: 3.4, ry: 2.5 }],
    chroms: specs.map((s, i) => ({ key: s.id, spec: s, x: xs[i], y: i % 2 ? -0.35 : 0.35 })),
    caption,
    counts: { chromosomes: 4, dnaMolecules: 4, same: null },
  };
}

function copiedFrame(specs: ChromSpec[], caption: string): KFrame {
  const f = startFrame(specs.map(rep), caption);
  f.counts = { chromosomes: 4, dnaMolecules: 8, same: null };
  return f;
}

/**
 * Meiosis in frames: copy, partners pair up (and swap tips when
 * `crossover`), partners separate into two cells, then the halves of every X
 * separate into four cells. Each new cell gets one chromosome from each pair.
 */
export function meiosisFrames(specs: ChromSpec[], crossover: boolean): KFrame[] {
  const [m1, p1, m2, p2] = specs;
  const frames: KFrame[] = [startFrame(specs, 'div.start'), copiedFrame(specs, 'div.copy')];
  const paired: KFrame = {
    cells: [{ key: 'parent', x: 0, y: 0, rx: 3.4, ry: 2.5 }],
    chroms: [
      { key: '1M', spec: rep(m1), x: -1.55, y: 0 },
      { key: '1P', spec: rep(p1), x: -0.75, y: 0 },
      { key: '2M', spec: rep(m2), x: 0.75, y: 0 },
      { key: '2P', spec: rep(p2), x: 1.55, y: 0 },
    ],
    caption: 'div.pairUp',
    counts: { chromosomes: 4, dnaMolecules: 8, same: null },
  };
  frames.push(paired);
  // Keys after crossing over (pair 1 swaps tips; pair 2 is too short to show it).
  const k1M = crossover ? '1M~' : '1M';
  const k1P = crossover ? '1P~' : '1P';
  const s1M: ChromSpec = crossover ? { ...rep(m1), swap: SWAP_AT } : rep(m1);
  const s1P: ChromSpec = crossover ? { ...rep(p1), swap: SWAP_AT } : rep(p1);
  if (crossover) {
    frames.push({
      ...paired,
      chroms: [
        { key: k1M, spec: s1M, x: -1.55, y: 0, from: '1M' },
        { key: k1P, spec: s1P, x: -0.75, y: 0, from: '1P' },
        paired.chroms[2],
        paired.chroms[3],
      ],
      caption: 'div.swap',
    });
  }
  // Partners separate: mother's pair 1 goes with father's pair 2 (a shuffle).
  frames.push({
    cells: [
      { key: 'L', x: -3.1, y: 0, rx: 2.3, ry: 2.3 },
      { key: 'R', x: 3.1, y: 0, rx: 2.3, ry: 2.3 },
    ],
    chroms: [
      { key: k1M, spec: s1M, x: -3.6, y: 0 },
      { key: '2P', spec: rep(p2), x: -2.6, y: 0 },
      { key: k1P, spec: s1P, x: 2.6, y: 0 },
      { key: '2M', spec: rep(m2), x: 3.6, y: 0 },
    ],
    caption: 'div.partnersApart',
    counts: { chromosomes: 2, dnaMolecules: 4, same: false },
  });
  // The halves of every X separate: four cells, each with one of each pair.
  const xs = [-4.95, -1.65, 1.65, 4.95];
  const rod = (key: string, spec: ChromSpec, from: string, cell: number, slot: number): KChrom => ({
    key,
    spec,
    from,
    x: xs[cell] + (slot ? 0.45 : -0.45),
    y: 0,
  });
  frames.push({
    cells: xs.map((x, i) => ({ key: `g${i}`, x, y: 0, rx: 1.5, ry: 1.9 })),
    chroms: [
      rod('1M.a', unrep(m1), k1M, 0, 0),
      rod('2P.a', unrep(p2), '2P', 0, 1),
      rod('1M.b', crossover ? crossed(m1, p1) : unrep(m1), k1M, 1, 0),
      rod('2P.b', unrep(p2), '2P', 1, 1),
      rod('1P.a', unrep(p1), k1P, 2, 0),
      rod('2M.a', unrep(m2), '2M', 2, 1),
      rod('1P.b', crossover ? crossed(p1, m1) : unrep(p1), k1P, 3, 0),
      rod('2M.b', unrep(m2), '2M', 3, 1),
    ],
    caption: 'div.copiesApart',
    counts: { chromosomes: 2, dnaMolecules: 2, same: false },
  });
  return frames;
}

/**
 * Mitosis in the same frame slots as meiosis with crossing over (so both can
 * run side by side): copy, line up, (wait), copies separate, (done).
 */
export function mitosisFrames(specs: ChromSpec[]): KFrame[] {
  const start = startFrame(specs, 'div.start');
  const copied = copiedFrame(specs, 'div.copy');
  const ys = [1.6, 0.55, -0.55, -1.6];
  const lined: KFrame = {
    cells: [{ key: 'parent', x: 0, y: 0, rx: 3.4, ry: 2.5 }],
    chroms: specs.map((s, i) => ({ key: s.id, spec: rep(s), x: 0, y: ys[i], angle: 90 })),
    caption: 'div.lineUp',
    counts: { chromosomes: 4, dnaMolecules: 8, same: null },
  };
  const xsL = [-4.35, -3.55, -2.75, -1.95];
  const split: KFrame = {
    cells: [
      { key: 'L', x: -3.1, y: 0, rx: 2.3, ry: 2.3 },
      { key: 'R', x: 3.1, y: 0, rx: 2.3, ry: 2.3 },
    ],
    chroms: specs.flatMap((s, i) => [
      { key: `${s.id}.a`, spec: unrep(s), from: s.id, x: xsL[i], y: 0 },
      { key: `${s.id}.b`, spec: unrep(s), from: s.id, x: xsL[i] + 6.2, y: 0 },
    ]),
    caption: 'div.mitosisDone',
    counts: { chromosomes: 4, dnaMolecules: 4, same: true },
  };
  return [start, copied, lined, { ...lined, caption: 'div.lineUp' }, split, split];
}

const STAGE_SFX: Record<string, string> = {
  'div.copy': 'SFX-11',
  'div.swap': 'SFX-16',
  'div.partnersApart': 'SFX-15',
  'div.copiesApart': 'SFX-12',
  'div.mitosisDone': 'SFX-12',
  'fert.join': 'SFX-17',
};

/**
 * One stepped animation for one or more divisions (side by side), with the
 * play / step / replay controls. onFrame runs when a frame is reached.
 */
export function divisionTimeline(
  ctx: { stage: Stage; overlay: HTMLElement; memo: Record<string, unknown> },
  divisions: Division[],
  onFrame: (i: number) => void,
  playSound: (id: string) => void,
): { dispose: () => void } {
  const frames = divisions[0].frames.length;
  const memo = ctx.memo as { divDone?: number };
  const timeline = new Timeline(
    ctx.stage,
    Array.from({ length: frames - 1 }, (_, i) => ({
      duration: 1.3,
      start: () => {
        const sounds = new Set(divisions.map((d) => STAGE_SFX[d.frames[i + 1].caption ?? ''] ?? ''));
        for (const s of sounds) if (s) playSound(s);
      },
      apply: (p: number) => {
        divisions.forEach((d) => d.transition(i, p));
        if (p >= 1) onFrame(i + 1);
      },
    })),
    () => {
      divisions.forEach((d) => d.show(0));
      onFrame(0);
    },
  );
  timeline.onProgress((done) => (memo.divDone = done));
  const done = memo.divDone ?? 0;
  for (let i = 0; i < done; i++) divisions.forEach((d) => d.transition(i, 1));
  if (done) onFrame(done);
  timeline.restore(done);
  ctx.overlay.appendChild(timeline.el);
  return {
    dispose: () => {
      timeline.dispose();
      divisions.forEach((d) => d.dispose());
    },
  };
}
