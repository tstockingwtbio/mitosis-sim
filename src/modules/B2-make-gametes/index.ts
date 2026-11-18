// B2 — Make gametes (SC.HS.9.4.b). Explicit first: meiosis is shown one stage
// at a time (copy, partners pair up and may swap sections, partners
// separate, copies separate), then students build eggs and sperm themselves
// and count the combinations. Phase names are not taught or assessed.
import type { ChromSpec } from '../../content/schema';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { legend } from '../../engine/stage/cellScene';
import { Division, divisionTimeline, figGermCell, meiosisFrames, type KFrame } from '../../engine/stage/division';
import { playSfx } from '../../engine/sfx';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

function cellOf(ctx: StepContext): ChromSpec[] {
  return (ctx.step as { cell?: { chromosomes: ChromSpec[] } }).cell?.chromosomes ?? figGermCell();
}

/** Run some divisions with a caption box and the count strip following frame `counts`. */
export function runDivisions(ctx: StepContext, divisions: Division[], countsFrom: Division | null): StepView {
  const legendEl = legend();
  ctx.stage.el.appendChild(legendEl);
  const caption = h('div', { class: 'zoom-scale' });
  ctx.stage.el.appendChild(caption);
  const lead = divisions[0];
  const onFrame = (i: number) => {
    const f = lead.frames[i];
    caption.textContent = f.caption ? t(f.caption) : '';
    const c = countsFrom?.frames[i].counts;
    ctx.counts.set(c ? { chromosomes: c.chromosomes, dnaMolecules: c.dnaMolecules, same: c.same } : { chromosomes: null, dnaMolecules: null, same: null });
  };
  onFrame(0);
  const run = divisionTimeline(ctx, divisions, onFrame, playSfx);
  return {
    dispose: () => {
      run.dispose();
      legendEl.remove();
      caption.remove();
    },
  };
}

/** Meiosis on one of Fig's egg-making cells. variant 'crossover' adds the swap. */
function meiosisScene(ctx: StepContext): StepView {
  const crossover = (ctx.step as { variant?: string }).variant === 'crossover';
  const d = new Division(ctx.stage, meiosisFrames(cellOf(ctx), crossover), { chromScale: 0.55 });
  return runDivisions(ctx, [d], d);
}

/**
 * Fertilisation: an egg (2 chromosomes) and a sperm (2) join into one cell
 * with a full set (4). Then three siblings from the same parents, each from
 * a different egg and sperm. In the new cell, every chromosome from the egg
 * is a mother's chromosome (solid) and every one from the sperm is a
 * father's (striped).
 */
function fertiliseScene(ctx: StepContext): StepView {
  const M = (id: string, pair: number, length: 'long' | 'short', alleles: string[]): ChromSpec => ({ id, pair, parent: 'M', state: 'unreplicated', length, alleles });
  const P = (id: string, pair: number, length: 'long' | 'short', alleles: string[]): ChromSpec => ({ ...M(id, pair, length, alleles), parent: 'P' });
  const egg = [M('e1', 1, 'long', ['a', 'E']), M('e2', 2, 'short', ['b'])];
  const sperm = [P('s1', 1, 'long', ['A', 'e']), P('s2', 2, 'short', ['B'])];
  const at = (s: ChromSpec, x: number, y: number) => ({ key: s.id, spec: s, x, y });
  const f0: KFrame = {
    cells: [
      { key: 'egg', x: -3.6, y: 2.0, rx: 1.7, ry: 1.6, label: 'fert.egg' },
      { key: 'sperm', x: 3.6, y: 2.0, rx: 1.3, ry: 1.0, label: 'fert.sperm' },
    ],
    chroms: [at(egg[0], -4.1, 2.0), at(egg[1], -3.1, 2.0), at(sperm[0], 3.25, 2.0), at(sperm[1], 3.95, 2.0)],
    caption: 'fert.start',
    counts: { chromosomes: 2, dnaMolecules: 2, same: null },
  };
  const f1: KFrame = {
    cells: [{ key: 'zygote', x: 0, y: 2.0, rx: 2.9, ry: 1.6, label: 'fert.zygote' }],
    chroms: [at(egg[0], -1.6, 2.0), at(sperm[0], -0.55, 2.0), at(egg[1], 0.55, 2.0), at(sperm[1], 1.6, 2.0)],
    caption: 'fert.join',
    counts: { chromosomes: 4, dnaMolecules: 4, same: null },
  };
  const f2: KFrame = { ...f1, caption: 'fert.siblings' };
  const main = new Division(ctx.stage, [f0, f1, f2], { chromScale: 0.5 });

  // Three siblings: different eggs and sperm, same parents.
  const sibs: { egg: [string[], string[]]; sperm: [string[], string[]] }[] = [
    { egg: [['A', 'E'], ['B']], sperm: [['a', 'e'], ['B']] },
    { egg: [['a', 'E'], ['b']], sperm: [['A', 'e'], ['b']] },
    { egg: [['A', 'e'], ['b']], sperm: [['a', 'E'], ['B']] },
  ];
  const xs = [-4.4, 0, 4.4];
  const sibFrame: KFrame = {
    cells: sibs.map((s, i) => ({
      key: `sib${i}`,
      x: xs[i],
      y: -1.45,
      rx: 1.45,
      ry: 0.95,
      label: `fert.sib${i + 1}`,
      sub: `${s.egg[0].join('')} ${s.egg[1].join('')} · ${s.sperm[0].join('')} ${s.sperm[1].join('')}`,
    })),
    chroms: sibs.flatMap((s, i) => [
      { key: `s${i}a`, spec: M(`s${i}a`, 1, 'long', s.egg[0]), x: xs[i] - 0.75, y: -1.45 },
      { key: `s${i}b`, spec: P(`s${i}b`, 1, 'long', s.sperm[0]), x: xs[i] - 0.25, y: -1.45 },
      { key: `s${i}c`, spec: M(`s${i}c`, 2, 'short', s.egg[1]), x: xs[i] + 0.25, y: -1.45 },
      { key: `s${i}d`, spec: P(`s${i}d`, 2, 'short', s.sperm[1]), x: xs[i] + 0.75, y: -1.45 },
    ]),
  };
  const empty: KFrame = { cells: [], chroms: [] };
  const siblings = new Division(ctx.stage, [empty, empty, sibFrame], { chromScale: 0.3, tabs: false });
  return runDivisions(ctx, [main, siblings], main);
}

const module: BeatModule = { scenes: { meiosis: meiosisScene, fertilise: fertiliseScene } };
export default module;
export const scenes = module.scenes;
