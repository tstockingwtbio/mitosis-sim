// Story panels shared by the story beats: full-stage pictures from the
// asset slots that cross-fade with the narration.
import * as THREE from 'three';
import { getSettings } from '../settings';
import { PALETTE, easeInOut, paper, roundRectShape, setOpacity } from './paper';
import { assetSlot } from './placeholder';
import { VIEW_HEIGHT } from './stage';
import { playLoop, playSfx } from '../sfx';
import type { StepContext, StepView } from '../types';

type Panels = { asset: string; line?: number; sfx?: string }[];

interface ExplainStep {
  lines: string[];
  panels?: Panels;
  ambience?: string;
  sfx?: string[];
}

export function stepOf(ctx: StepContext): ExplainStep {
  return ctx.step as unknown as ExplainStep;
}

/** A full-stage picture: the art if it exists, else a plain paper card (asset ID shown in dev mode). */
export function panel(ctx: StepContext, id: string, crop?: [number, number, number, number], scale = 0.96): THREE.Group {
  const w = ctx.stage.viewWidth * scale;
  const hh = VIEW_HEIGHT * scale;
  const card = paper(roundRectShape(w * 0.9, hh * 0.9, 0.3), { color: PALETTE.cream, outline: 0.06 });
  const g = assetSlot(id, card, { size: { w, h: hh }, crop }, () => ctx.stage.invalidate());
  ctx.stage.scene.add(g);
  return g;
}

/** Cross-fade from one picture to another (a cut with Reduce motion). */
export function crossFade(ctx: StepContext, from: THREE.Group | null, to: THREE.Group): void {
  to.visible = true;
  if (!from || from === to || getSettings().reducedMotion) {
    if (from && from !== to) from.visible = false;
    setOpacity(to, 1);
    ctx.stage.invalidate();
    return;
  }
  to.position.z = from.position.z + 0.01;
  let p = 0;
  ctx.stage.addTick((dt) => {
    p = Math.min(1, p + dt / 0.45);
    setOpacity(to, easeInOut(p));
    if (p >= 1) {
      from.visible = false;
      return false;
    }
    return true;
  });
}

/** Story panels that follow the narration: each caption line shows its picture. */
export function storyScene(ctx: StepContext): StepView {
  const s = stepOf(ctx);
  const panels = (s.panels ?? []).map((p) => ({ ...p, group: panel(ctx, p.asset) }));
  panels.forEach((p, i) => (p.group.visible = i === 0));
  let shown = panels[0]?.group ?? null;
  const show = (line: number, sound: boolean) => {
    const match = [...panels].reverse().find((p) => (p.line ?? 0) <= line) ?? panels[0];
    if (!match || match.group === shown) return;
    crossFade(ctx, shown, match.group);
    shown = match.group;
    if (sound && match.sfx) playSfx(match.sfx);
  };
  const stopAmbience = s.ambience ? playLoop(s.ambience) : () => undefined;
  ctx.captions.setLines(s.lines, { autoAdvance: true, autoplay: getSettings().readAloud });
  const off = ctx.captions.onChange((i) => show(i, true));
  show(ctx.captions.current(), false);
  return {
    dispose: () => {
      off();
      stopAmbience();
    },
  };
}

