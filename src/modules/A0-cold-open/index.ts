// A0 — Cold open (SC.HS.6.1.d). Phenomenon first: the heron takes half of
// Fig's tail; weeks later it is back. Story panels between tasks only.
import * as THREE from 'three';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { getSettings } from '../../engine/settings';
import { PALETTE, paper, roundRectShape, setOpacity } from '../../engine/stage/paper';
import { assetSlot } from '../../engine/stage/placeholder';
import { VIEW_HEIGHT, label } from '../../engine/stage/stage';
import { Timeline } from '../../engine/stage/timeline';
import { playSfx } from '../../engine/sfx';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

import { panel, stepOf, storyScene } from '../../engine/stage/story';

/** Title card: the art has a plain top 40% for the title, which is added here in code. */
function titleScene(ctx: StepContext): StepView {
  const s = stepOf(ctx);
  const id = s.panels?.[0]?.asset;
  const g = id ? panel(ctx, id) : new THREE.Group();
  // Anchor the title in the plain top part of the card (IMG-P09 is 4:3).
  const aspect = 1448 / 1086;
  const w = Math.min(ctx.stage.viewWidth * 0.96, VIEW_HEIGHT * 0.96 * aspect);
  const title = h('div', { class: 'story-title' }, h('h1', {}, t('app.title')), h('p', {}, t(s.variant ?? 'app.part')));
  g.add(label(title, { x: 0, y: (w / aspect) * 0.3, z: 0.2 }));
  ctx.stage.invalidate();
  return { dispose: () => title.remove() };
}

/**
 * Tail regrowth time-lapse: the four stages of IMG-C03 (stump, bud, half
 * tail, full tail) cross-fade one stage at a time, then the tail-is-back
 * panel (IMG-P03). Play, pause, replay or step; SFX-20 runs with the regrowth.
 */
function regrowScene(ctx: StepContext): StepView {
  const s = stepOf(ctx);
  const sheet = s.panels?.[0]?.asset ?? 'IMG-C03';
  const after = s.panels?.[1]?.asset;
  // The four newts on IMG-C03 are not evenly spaced. Each frame is cropped to
  // its own newt (fractions of the sheet width), then shifted so the bodies
  // line up and only the tail changes.
  const frames: { crop: [number, number]; bodyLeft: number }[] = [
    { crop: [0, 0.2225], bodyLeft: 0.005 },
    { crop: [0.2225, 0.459], bodyLeft: 0.2275 },
    { crop: [0.459, 0.7285], bodyLeft: 0.4675 },
    { crop: [0.7285, 1], bodyLeft: 0.73 },
  ];
  const sheetAspect = 2172 / 724;
  const H = Math.min(VIEW_HEIGHT * 0.8, (ctx.stage.viewWidth * 0.9) / (sheetAspect * 0.2715));
  const unit = H * sheetAspect; // world width of the whole sheet at this height
  const widest = Math.max(...frames.map((f) => f.crop[1] - f.crop[0])) * unit;
  const stages = frames.map((f) => {
    const card = paper(roundRectShape(widest * 0.9, H * 0.9, 0.3), { color: PALETTE.cream, outline: 0.06 });
    const g = assetSlot(sheet, card, { size: { w: 100, h: H }, crop: [f.crop[0], 0, f.crop[1], 1] }, () => ctx.stage.invalidate());
    const w = (f.crop[1] - f.crop[0]) * unit;
    g.position.x = -widest / 2 - (f.bodyLeft - f.crop[0]) * unit + w / 2;
    ctx.stage.scene.add(g);
    return g;
  });
  const finale = after ? panel(ctx, after) : null;
  const all = finale ? [...stages, finale] : stages;
  const memo = ctx.memo as { done?: number };
  const reset = () => {
    all.forEach((g, i) => {
      g.visible = i === 0;
      setOpacity(g, 1);
      g.position.z = i * 0.01;
    });
    ctx.stage.invalidate();
  };
  const fade = (from: THREE.Group, to: THREE.Group) => (p: number) => {
    to.visible = p > 0;
    from.visible = p < 1;
    setOpacity(to, p);
  };
  const timeline = new Timeline(
    ctx.stage,
    all.slice(1).map((to, i) => ({
      duration: i < 3 ? 1 : 0.8,
      start: i === 0 ? () => playSfx(s.sfx?.[0] ?? 'SFX-20') : undefined,
      apply: fade(all[i], to),
    })),
    reset,
  );
  timeline.onProgress((done) => (memo.done = done));
  for (let i = 0; i < (memo.done ?? 0); i++) fade(all[i], all[i + 1])(1);
  timeline.restore(memo.done ?? 0);
  ctx.overlay.appendChild(timeline.el);
  ctx.captions.setLines(s.lines, { autoAdvance: false, autoplay: getSettings().readAloud });
  return { dispose: () => timeline.dispose() };
}

const module: BeatModule = {
  scenes: {
    title: titleScene,
    story: storyScene,
    regrow: regrowScene,
  },
};

export default module;
export const scenes = module.scenes;
