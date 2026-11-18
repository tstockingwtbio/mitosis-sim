// B6 — Claim and defend (SC.HS.9.4.b). Claim, evidence, reasoning, and a
// rebuttal for each counterclaim. The evidence board (IMG-B06) shows the
// cards this student filed in B4 and B5; the board's blank cards get their
// text in code.
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { label } from '../../engine/stage/stage';
import { panel, storyScene } from '../../engine/stage/story';
import { lockerCards } from '../../engine/tasks/bands';
import { getSettings } from '../../engine/settings';
import { playLoop } from '../../engine/sfx';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

/** Every evidence card a student can file, in board order. */
export const CARDS = ['lab-shuffle', 'lab-copy', 'lab-uv', 'test-figTail', 'test-figSkin', 'test-figBlood', 'test-figEggs'];

function boardScene(ctx: StepContext): StepView {
  const s = ctx.step as { panels?: { asset: string }[]; lines: string[]; ambience?: string };
  const board = panel(ctx, s.panels?.[0]?.asset ?? 'IMG-B06');
  const have = new Set(lockerCards());
  const filed = CARDS.filter((c) => have.has(c));
  // Pinned cards: up to 4 per row across the board.
  const cols = 4;
  filed.forEach((c, i) => {
    const x = (-1.5 + (i % cols)) * 2.9;
    const y = 1.9 - Math.floor(i / cols) * 2.6;
    board.add(label(h('div', { class: 'pinned-card', 'aria-hidden': 'true' }, t(`locker.card.${c}`)), { x, y, z: 0.3 }));
  });
  if (!filed.length) board.add(label(h('div', { class: 'pinned-card', 'aria-hidden': 'true' }, t('locker.empty')), { x: 0, y: 0, z: 0.3 }));
  // The same cards in the panel, for reading and read-aloud.
  ctx.body.appendChild(
    h('div', { class: 'card' }, h('h3', {}, t('locker.title')), h('ul', { class: 'locker' }, ...(filed.length ? filed.map((c) => h('li', { class: 'evidence-card' }, t(`locker.card.${c}`))) : [h('li', { class: 'note' }, t('locker.empty'))]))),
  );
  const stopAmbience = s.ambience ? playLoop(s.ambience) : () => undefined;
  ctx.captions.setLines(s.lines, { autoAdvance: false, autoplay: getSettings().readAloud });
  ctx.stage.invalidate();
  return { dispose: () => stopAmbience() };
}

const module: BeatModule = { scenes: { story: storyScene, board: boardScene } };
export default module;
export const scenes = module.scenes;
