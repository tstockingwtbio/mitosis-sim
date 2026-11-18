// B3 — Side by side (SC.HS.9.4.b). Attempt first (students predict), then
// mitosis and meiosis run next to each other from the same starting cell,
// one stage at a time: copy vs. halve and shuffle.
import * as THREE from 'three';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { legend } from '../../engine/stage/cellScene';
import { Division, divisionTimeline, figGermCell, meiosisFrames, mitosisFrames } from '../../engine/stage/division';
import { PALETTE, basic } from '../../engine/stage/paper';
import { label } from '../../engine/stage/stage';
import { playSfx } from '../../engine/sfx';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

const SCALE = 0.46;
const LEFT = -3.3;
const RIGHT = 3.3;

function sideBySideScene(ctx: StepContext): StepView {
  const specs = figGermCell();
  const mit = new Division(ctx.stage, mitosisFrames(specs), { x: LEFT, y: 0.3, scale: SCALE, chromScale: 0.55, tabs: false });
  const mei = new Division(ctx.stage, meiosisFrames(specs, true), { x: RIGHT, y: 0.3, scale: SCALE, chromScale: 0.55, tabs: false });
  const extras = new THREE.Group();
  ctx.stage.scene.add(extras);
  const divider = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 7.6), basic(PALETTE.ink, 0.5));
  divider.position.set(-0.25, 0, -0.6);
  extras.add(divider);
  extras.add(label(h('div', { class: 'stage-label big', 'aria-hidden': 'true' }, t('B3.side.mitosis')), { x: LEFT, y: 3.3, z: 0.2 }));
  extras.add(label(h('div', { class: 'stage-label big', 'aria-hidden': 'true' }, t('B3.side.meiosis')), { x: RIGHT, y: 3.3, z: 0.2 }));
  const capL = h('div', { class: 'cell-tag side-caption', 'aria-hidden': 'true' });
  const capR = h('div', { class: 'cell-tag side-caption', 'aria-hidden': 'true' });
  extras.add(label(capL, { x: LEFT, y: -1.75, z: 0.2 }), label(capR, { x: RIGHT, y: -1.75, z: 0.2 }));
  const cntL = h('div', { class: 'stage-label', 'aria-hidden': 'true' });
  const cntR = h('div', { class: 'stage-label', 'aria-hidden': 'true' });
  extras.add(label(cntL, { x: LEFT, y: -2.55, z: 0.2 }), label(cntR, { x: RIGHT, y: -2.55, z: 0.2 }));
  // A text version of what each side shows, for screen readers.
  const live = h('p', { class: 'sr-only', 'aria-live': 'polite' });
  ctx.body.appendChild(live);
  const legendEl = legend();
  ctx.stage.el.appendChild(legendEl);

  const countLine = (c: { chromosomes: number; dnaMolecules: number } | undefined, n: number) =>
    c ? t(n > 1 ? 'B3.side.countEach' : 'B3.side.count', { c: c.chromosomes, d: c.dnaMolecules, n }) : '';
  const cellsIn = (d: Division, i: number) => d.frames[i].cells.length;
  const onFrame = (i: number) => {
    capL.textContent = t(mit.frames[i].caption ?? '');
    capR.textContent = t(mei.frames[i].caption ?? '');
    cntL.textContent = countLine(mit.frames[i].counts, cellsIn(mit, i));
    cntR.textContent = countLine(mei.frames[i].counts, cellsIn(mei, i));
    live.textContent = `${t('B3.side.mitosis')}: ${capL.textContent} ${cntL.textContent} ${t('B3.side.meiosis')}: ${capR.textContent} ${cntR.textContent}`;
    ctx.stage.invalidate();
  };
  onFrame(0);
  const run = divisionTimeline(ctx, [mit, mei], onFrame, playSfx);
  return {
    dispose: () => {
      run.dispose();
      legendEl.remove();
      live.remove();
      extras.traverse((o) => (o as { element?: HTMLElement }).element?.remove());
    },
  };
}

const module: BeatModule = { scenes: { sideBySide: sideBySideScene } };
export default module;
export const scenes = module.scenes;
