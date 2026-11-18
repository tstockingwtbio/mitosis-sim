// B4 — Variation lab (SC.HS.9.4.b). Three test tanks, three sources of new
// variation: the shuffle (meiosis), a copying error in an egg-making cell
// (Hatchling 5's white tail tip), and UV light on skin cells. Each run draws
// where the change happens and whether it can reach the hatchlings, and files
// an evidence card in the locker for the claim in B6.
import * as THREE from 'three';
import type { LabTask, PartContent, Task } from '../../content/schema';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { getSettings } from '../../engine/settings';
import { progress, recordResult } from '../../engine/progress';
import { PALETTE, basic, paper, roundRectShape, strokeGeometry } from '../../engine/stage/paper';
import { label } from '../../engine/stage/stage';
import { playSfx } from '../../engine/sfx';
import { paragraph } from '../../engine/ui/text';
import { Supports, feedback, setFeedback } from '../../engine/tasks/common';
import { fileEvidence } from '../../engine/tasks/bands';
import { storyScene } from '../../engine/stage/story';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

type Where = 'body' | 'germ' | 'eggs';

interface Box {
  key: string;
  x: number;
  y: number;
  w: number;
}

const BOXES: Box[] = [
  { key: 'parent', x: -4.9, y: 0.1, w: 2.5 },
  { key: 'body', x: -1.2, y: 1.7, w: 3.3 },
  { key: 'germ', x: -1.2, y: -1.3, w: 3.3 },
  { key: 'eggs', x: 2.15, y: -1.3, w: 2.1 },
  { key: 'young', x: 5.0, y: -1.3, w: 2.3 },
];
const PATH: Record<Where, string[]> = { body: ['body'], germ: ['germ', 'eggs', 'young'], eggs: ['eggs', 'young'] };
const BOX_H = 1.25;

/** Body cells and egg-making cells, and where a change happens (if anywhere). */
function drawLineage(root: THREE.Group, change: Where | null, rule: boolean): void {
  root.traverse((o) => (o as { element?: HTMLElement }).element?.remove());
  root.clear();
  const carries = new Set(change ? PATH[change] : []);
  const at = (k: string) => BOXES.find((b) => b.key === k)!;
  const arrow = (a: Box, b: Box, dashed = false) => {
    const from = new THREE.Vector2(a.x + (b.x > a.x + 0.1 ? a.w / 2 : 0), a.y + (b.y > a.y + 0.1 ? BOX_H / 2 : b.y < a.y - 0.1 ? -BOX_H / 2 : 0));
    const to = new THREE.Vector2(b.x - (b.x > a.x + 0.1 ? b.w / 2 : 0) - 0.08, b.y);
    if (Math.abs(b.y - a.y) > 0.1 && b.x > a.x) to.set(b.x - b.w / 2 - 0.08, b.y);
    const dir = to.clone().sub(from).normalize();
    const segs = dashed ? 7 : 1;
    for (let i = 0; i < segs; i++) {
      const s = from.clone().lerp(to, i / segs);
      const e = from.clone().lerp(to, dashed ? (i + 0.55) / segs : 1);
      const m = new THREE.Mesh(strokeGeometry([s, e], 0.07, false), basic(dashed ? '#a89c8a' : PALETTE.ink));
      m.position.z = -0.1;
      root.add(m);
    }
    const side = new THREE.Vector2(-dir.y, dir.x).multiplyScalar(0.18);
    const back = to.clone().sub(dir.clone().multiplyScalar(0.3));
    root.add(new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape([to, back.clone().add(side), back.clone().sub(side)])), basic(dashed ? '#a89c8a' : PALETTE.ink)));
  };
  arrow(at('parent'), at('body'));
  arrow(at('parent'), at('germ'));
  arrow(at('germ'), at('eggs'));
  arrow(at('eggs'), at('young'));
  for (const b of BOXES) {
    const hot = carries.has(b.key);
    const card = paper(roundRectShape(b.w, BOX_H, 0.22), { color: b.key === 'body' || b.key === 'parent' ? PALETTE.cream : '#f7efdc', outline: hot ? 0.12 : 0.06, ink: hot ? PALETTE.orange : PALETTE.ink });
    card.position.set(b.x, b.y, 0);
    root.add(card);
    root.add(label(h('div', { class: 'cycle-node', 'aria-hidden': 'true' }, t(`B4.box.${b.key}`)), { x: b.x, y: b.y, z: 0.2 }));
    if (hot) root.add(label(h('div', { class: 'cell-tag hot', 'aria-hidden': 'true' }, t(b.key === change ? 'B4.tag.here' : 'B4.tag.carries')), { x: b.x, y: b.y - BOX_H / 2 - 0.3, z: 0.25 }));
  }
  // Body cells never make eggs: no path from them to the hatchlings.
  root.add(label(h('div', { class: 'cycle-arrow-label later', 'aria-hidden': 'true' }, t('B4.noPath')), { x: 2.9, y: 1.7, z: 0.2 }));
  if (rule) {
    root.add(label(h('div', { class: 'cycle-note', 'aria-hidden': 'true' }, t('B4.rule.body')), { x: -1.2, y: 3.0, z: 0.2 }));
    root.add(label(h('div', { class: 'cycle-note', 'aria-hidden': 'true' }, t('B4.rule.germ')), { x: 1.6, y: -2.95, z: 0.2 }));
  } else if (change) {
    const passed = change !== 'body';
    root.add(label(h('div', { class: `result-banner ${passed ? 'yes' : 'no'}`, 'aria-hidden': 'true' }, t(passed ? 'B4.result.yes' : 'B4.result.no')), { x: 0, y: -3.45, z: 0.2 }));
  }
}

const WHERE: Record<string, Where> = { shuffle: 'eggs', copy: 'germ', uv: 'body' };
const SOUND: Record<string, string> = { shuffle: 'SFX-15', copy: 'SFX-11', uv: 'SFX-23' };

/** The rule (VO-B12): changes in body cells stay; changes in egg-making cells can be inherited. */
function ruleScene(ctx: StepContext): StepView {
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  drawLineage(root, null, true);
  ctx.stage.invalidate();
  return { dispose: () => root.traverse((o) => (o as { element?: HTMLElement }).element?.remove()) };
}

interface LabMemo {
  run?: string[];
  shown?: string;
  done?: boolean;
  fb?: { kind: 'good' | 'info'; text: string };
}

function labTask(ctx: StepContext, task0: Task, content: PartContent): StepView {
  const task = task0 as LabTask;
  const memo = ctx.memo as LabMemo;
  memo.run ??= [];
  ctx.counts.set({ chromosomes: null, dnaMolecules: null, same: null });
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const title = h('div', { class: 'zoom-scale' });
  ctx.stage.el.appendChild(title);

  const prompt = paragraph(task.prompt);
  const supports = new Supports(ctx, task, () => undefined);
  const buttons = h('div', { class: 'seg-options' });
  const locker = h('ul', { class: 'locker' });
  const fbSlot = h('div', {});
  ctx.body.append(
    prompt.el,
    supports.top,
    h('div', { class: 'card' }, buttons),
    h('div', { class: 'card' }, h('h3', {}, t('locker.title')), locker),
    fbSlot,
    supports.el,
  );
  ctx.setReadables([prompt]);

  const show = (id: string | null) => {
    memo.shown = id ?? undefined;
    drawLineage(root, id ? WHERE[id] : null, false);
    title.textContent = id ? t(`B4.tank.${id}`) : t('B4.tank.none');
    title.hidden = false;
    ctx.stage.invalidate();
  };

  const render = () => {
    buttons.replaceChildren(
      ...task.tanks.map((tank, i) => {
        const ran = memo.run!.includes(tank.id);
        return h(
          'button',
          {
            class: `btn${memo.shown === tank.id ? ' primary' : ''}`,
            type: 'button',
            'aria-pressed': String(memo.shown === tank.id),
            onclick: () => run(tank.id),
          },
          t(ran ? 'B4.ui.show' : 'B4.ui.run', { n: i + 1, name: t(`B4.tank.${tank.id}`) }),
        );
      }),
    );
    locker.replaceChildren(
      ...task.tanks.filter((tk) => memo.run!.includes(tk.id)).map((tk) => h('li', { class: 'evidence-card' }, paragraph(tk.card, undefined, 'span').el)),
    );
    if (!memo.run!.length) locker.appendChild(h('li', { class: 'note' }, t('locker.empty')));
  };

  const run = (id: string) => {
    const tank = task.tanks.find((tk) => tk.id === id)!;
    const first = !memo.run!.includes(id);
    show(id);
    if (first) {
      memo.run!.push(id);
      playSfx(SOUND[id]);
      fileEvidence(`lab-${id}`);
      if (tank.line) ctx.captions.setLines([tank.line], { autoAdvance: false, autoplay: getSettings().readAloud });
    }
    if (!memo.done && memo.run!.length === task.tanks.length) {
      memo.done = true;
      recordResult(task.id, true);
      memo.fb = { kind: 'good', text: 'B4.lab.fb.done' };
      setFeedback(fbSlot, feedback(content, 'good', memo.fb.text));
    }
    ctx.setDone(!!memo.done);
    render();
  };

  show(memo.shown ?? null);
  render();
  if (memo.fb) fbSlot.replaceChildren(feedback(content, memo.fb.kind, memo.fb.text).el);
  ctx.setDone(!!memo.done || !!progress().results[task.id]);
  ctx.autoRead();
  return {
    dispose: () => {
      title.remove();
      root.traverse((o) => (o as { element?: HTMLElement }).element?.remove());
    },
  };
}

const module: BeatModule = { scenes: { story: storyScene, rule: ruleScene }, tasks: { lab: labTask } };
export default module;
export const scenes = module.scenes;
export const tasks = module.tasks;
