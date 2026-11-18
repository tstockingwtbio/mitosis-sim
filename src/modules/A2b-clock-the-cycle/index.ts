// A2b — Clock the cycle (SC.HS.6.1.d). Explicit first: the narrator sorts
// three cells aloud, students sort six with feedback, then the rest alone.
// Phase names live on reference cards that stay on screen; students are
// assessed on the reasoning (why most cells are in interphase, how counts
// become times), not on recalling names.
import * as THREE from 'three';
import type { PartContent, SortTask, Task, TimingTask } from '../../content/schema';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { progress, recordResult, saveProgress } from '../../engine/progress';
import { FIELD_SIZE, HOURS_TOLERANCE, PERCENT_TOLERANCE, PHASES, makeField, tally, timing, type CyclePhase, type FieldKind } from '../../engine/model/cycle';
import { STAIN, stainedCell, stainedCellSvg } from '../../engine/stage/stainedCell';
import { PALETTE, basic, circleShape, paper, roundRectShape, strokeGeometry } from '../../engine/stage/paper';
import { label } from '../../engine/stage/stage';
import { storyScene } from '../../engine/stage/story';
import { playSfx } from '../../engine/sfx';
import { paragraph, type Spoken } from '../../engine/ui/text';
import { MAX_ATTEMPTS, Supports, feedback, setFeedback, speakIfOn, supportsOn } from '../../engine/tasks/common';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

// ---------- Shared field state (the same slide across several steps) ----------

function fieldKey(kind: FieldKind): string {
  return `field:${kind}`;
}

function loadLabels(kind: FieldKind): (CyclePhase | null)[] {
  try {
    const raw = progress().responses[fieldKey(kind)];
    const arr = raw ? (JSON.parse(raw) as (CyclePhase | null)[]) : [];
    return Array.from({ length: FIELD_SIZE }, (_, i) => arr[i] ?? null);
  } catch {
    return Array(FIELD_SIZE).fill(null);
  }
}

function saveLabels(kind: FieldKind, labels: (CyclePhase | null)[]): void {
  saveProgress({ responses: { ...progress().responses, [fieldKey(kind)]: JSON.stringify(labels) } });
}

/** A short word per phase for the tag on a sorted cell (not colour alone). */
const short = (p: CyclePhase) => t(`A2b.phase.${p}.short`);

/** Reference cards: the five phases with a drawing and what to look for. */
function referenceCards(onPick?: (p: CyclePhase) => void, picked?: CyclePhase | null): HTMLElement {
  const wrap = h('div', { class: 'phase-cards', role: onPick ? 'radiogroup' : undefined, 'aria-label': t('A2b.cards.label') });
  for (const p of PHASES) {
    const card = h(
      onPick ? 'button' : 'div',
      {
        class: `phase-card${picked === p ? ' picked' : ''}`,
        type: onPick ? 'button' : undefined,
        role: onPick ? 'radio' : undefined,
        'aria-checked': onPick ? String(picked === p) : undefined,
        onclick: onPick ? () => onPick(p) : undefined,
      },
      h('span', { class: 'phase-art', html: stainedCellSvg(p) }),
      h('span', { class: 'phase-name' }, h('strong', {}, t(`A2b.phase.${p}`)), h('span', { class: 'phase-tag' }, short(p))),
      h('span', { class: 'phase-look' }, t(`A2b.phase.${p}.look`)),
    );
    wrap.appendChild(card);
  }
  return wrap;
}

/** The slide: 36 stained cells in a 6 × 6 field. */
class Field {
  readonly root = new THREE.Group();
  readonly cells: { phase: CyclePhase; group: THREE.Group; pos: THREE.Vector2 }[] = [];
  private tags: THREE.Object3D[] = [];
  private rings: THREE.Object3D[] = [];
  hits: HTMLButtonElement[] = [];

  constructor(private ctx: StepContext, kind: FieldKind) {
    const field = makeField(kind, progress().seed);
    const slide = paper(roundRectShape(8.4, 8.4, 0.2), { color: STAIN.slide, outline: 0.06, grain: false });
    slide.position.z = -0.3;
    this.root.add(slide);
    const step = 1.35;
    field.forEach((c, i) => {
      const col = i % 6;
      const row = Math.floor(i / 6);
      const pos = new THREE.Vector2(-3.375 + col * step, 3.375 - row * step);
      const g = stainedCell(c.phase, c.angle, c.wobble, 1.2);
      g.position.set(pos.x, pos.y, 0);
      this.root.add(g);
      this.cells.push({ phase: c.phase, group: g, pos });
    });
    ctx.stage.scene.add(this.root);
  }

  /** Clickable cells; describes what can be seen, never the answer. */
  makeHits(range: [number, number], onClick: (i: number) => void): void {
    const upp = this.ctx.stage.unitsPerPixel();
    this.cells.forEach((c, i) => {
      if (i < range[0] || i >= range[1]) return;
      const btn = h('button', { class: 'hit', type: 'button', style: { width: `${1.25 / upp}px`, height: `${1.25 / upp}px` }, onclick: () => onClick(i) });
      this.hits[i] = btn;
      this.root.add(label(btn, { x: c.pos.x, y: c.pos.y, z: 0.2 }));
    });
    // Click targets follow the stage size.
    this.ctx.stage.onResize(() => {
      const u = this.ctx.stage.unitsPerPixel();
      this.hits.forEach((b) => {
        if (!b) return;
        b.style.width = `${1.25 / u}px`;
        b.style.height = `${1.25 / u}px`;
      });
    });
  }

  ring(i: number, color: string = PALETTE.blue): void {
    const c = this.cells[i];
    const ring = new THREE.Mesh(strokeGeometry(circleShape(0.66).getPoints(40), 0.07), basic(color));
    ring.position.set(c.pos.x, c.pos.y, 0.05);
    this.root.add(ring);
    this.rings.push(ring);
  }

  clearRings(): void {
    this.rings.forEach((r) => r.removeFromParent());
    this.rings = [];
  }

  /** Tags on sorted cells: the phase word, and ✗ on cells that do not match the key. */
  setTags(labels: (CyclePhase | null)[], wrong: Set<number> = new Set()): void {
    this.tags.forEach((tg) => tg.removeFromParent());
    this.tags = [];
    labels.forEach((p, i) => {
      if (!p) return;
      const c = this.cells[i];
      const el = h('div', { class: `cell-tag${wrong.has(i) ? ' wrong' : ''}`, 'aria-hidden': 'true' }, `${wrong.has(i) ? '✗ ' : ''}${short(p)}`);
      const o = label(el, { x: c.pos.x, y: c.pos.y - 0.5, z: 0.3 });
      this.root.add(o);
      this.tags.push(o);
    });
    this.ctx.stage.invalidate();
  }

  describe(i: number, labelled: CyclePhase | null): string {
    const base = t('A2b.cell.aria', { n: i + 1, look: t(`A2b.phase.${this.cells[i].phase}.seen`) });
    return labelled ? `${base}. ${t('A2b.cell.sortedAs', { phase: t(`A2b.phase.${labelled}`) })}` : base;
  }
}

// ---------- Sort task ----------

interface SortMemo {
  brush?: CyclePhase | null;
  worked?: number;
  checked?: boolean;
  wrong?: number[];
  attempts?: number;
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; vars?: Record<string, string | number>; mis?: string };
}

function sortTask(ctx: StepContext, task: SortTask, content: PartContent): StepView {
  const memo = ctx.memo as SortMemo;
  const field = new Field(ctx, task.field);
  const labels = loadLabels(task.field);
  const [from, to] = task.range;
  memo.brush ??= null;
  const isDemo = task.phase === 'worked';

  const prompt = paragraph(task.prompt);
  const readables: Spoken[] = [prompt];
  const supports = new Supports(ctx, task, () => undefined);
  const tallyEl = h('div', { class: 'tally', role: 'status', 'aria-live': 'polite' });
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, t('ui.task.check'));
  const fbSlot = h('div', {});
  const cardsSlot = h('div', {});
  // Counts and Check sit above the cards so they stay in view.
  ctx.body.append(prompt.el, supports.top);
  if (!isDemo) ctx.body.append(h('div', { class: 'card' }, tallyEl, h('div', {}, checkBtn)), fbSlot);
  else ctx.body.append(h('div', { class: 'card' }, tallyEl));
  ctx.body.append(cardsSlot);
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);

  const renderTally = () => {
    const tl = tally(labels);
    const left = labels.slice(from, to).filter((x) => !x).length;
    tallyEl.replaceChildren(
      h('strong', {}, t('A2b.tally.title')),
      h('div', { class: 'tally-row' }, PHASES.map((p) => h('span', {}, `${t(`A2b.phase.${p}`)}: ${tl[p]}`))),
      h('p', { style: { margin: '4px 0 0' } }, left ? t('A2b.tally.left', { n: left }) : t('A2b.tally.done')),
    );
  };

  const renderCards = () => {
    cardsSlot.replaceChildren(
      h('p', { class: 'cards-hint' }, isDemo ? t('A2b.cards.demo') : t('A2b.cards.pick')),
      referenceCards(isDemo ? undefined : (p) => {
        memo.brush = memo.brush === p ? null : p;
        playSfx('SFX-01');
        renderCards();
      }, memo.brush),
    );
  };

  const refreshField = () => {
    field.setTags(labels, new Set(memo.wrong ?? []));
    field.hits.forEach((btn, i) => {
      if (!btn) return;
      btn.setAttribute('aria-label', field.describe(i, labels[i]));
      btn.disabled = !!memo.checked && task.phase === 'checkpoint';
    });
    renderTally();
    ctx.stage.invalidate();
  };

  // Rings mark the cells this step is about.
  for (let i = from; i < to && to - from <= 9; i++) field.ring(i);

  if (isDemo) {
    // Worked example: the narrator sorts the first cells aloud (VO-A18), one step at a time.
    const keys = task.worked ?? [];
    let shown = memo.worked ?? 0;
    const list = h('ol', {});
    const btn = h('button', { class: 'btn', type: 'button' }, t('ui.task.nextWorked'));
    const show = (i: number, speak: boolean) => {
      const sp = paragraph(keys[i], undefined, 'span');
      list.appendChild(h('li', {}, sp.el));
      labels[from + i] = field.cells[from + i].phase;
      if (speak) {
        playSfx('SFX-27');
        speakIfOn([sp]);
      }
    };
    for (let i = 0; i < shown; i++) show(i, false);
    btn.addEventListener('click', () => {
      show(shown, true);
      shown++;
      memo.worked = shown;
      saveLabels(task.field, labels);
      btn.hidden = shown >= keys.length;
      if (shown >= keys.length) ctx.setDone(true);
      refreshField();
    });
    btn.hidden = shown >= keys.length;
    supports.top.appendChild(h('div', { class: 'card worked' }, h('h3', {}, t('ui.task.workedTitle')), list, btn));
    ctx.setDone(shown >= keys.length);
  } else {
    field.makeHits(task.range, (i) => {
      if (memo.checked && task.phase === 'checkpoint') return;
      if (!memo.brush) {
        cardsSlot.querySelector<HTMLElement>('.phase-card')?.focus();
        return;
      }
      labels[i] = labels[i] === memo.brush ? null : memo.brush;
      memo.wrong = (memo.wrong ?? []).filter((w) => w !== i);
      saveLabels(task.field, labels);
      playSfx('SFX-27');
      refreshField();
      field.hits[i]?.focus();
    });
    checkBtn.addEventListener('click', () => {
      const idx = Array.from({ length: to - from }, (_, k) => from + k);
      const unsorted = idx.filter((i) => !labels[i]);
      if (unsorted.length) {
        memo.fb = { kind: 'info', text: 'A2b.fb.unsorted', vars: { n: unsorted.length } };
        showFb(true);
        return;
      }
      memo.attempts = (memo.attempts ?? 0) + 1;
      const wrong = idx.filter((i) => labels[i] !== field.cells[i].phase);
      memo.wrong = wrong;
      memo.checked = true;
      const share = 1 - wrong.length / idx.length;
      recordResult(task.id, share >= 0.9);
      if (!wrong.length) memo.fb = { kind: 'good', text: 'A2b.fb.allRight', vars: { n: idx.length } };
      else {
        const first = wrong[0];
        const truth = field.cells[first].phase;
        memo.fb = {
          kind: 'warn',
          text: `A2b.fb.look.${truth}`,
          vars: { n: first + 1, right: idx.length - wrong.length, total: idx.length },
          mis: labels[first] === 'interphase' || truth === 'interphase' ? 'interphase-resting' : 'phases-by-shape',
        };
        if (supportsOn(task)) supports.nextHint(false);
      }
      // Guided: fix and re-check until right (or 3 tries). Independent and checkpoint: one check is enough.
      if (!wrong.length || task.phase !== 'guided' || memo.attempts >= MAX_ATTEMPTS) ctx.setDone(true);
      showFb(true);
      refreshField();
    });
    ctx.setDone(!!memo.checked && (task.phase !== 'guided' || !(memo.wrong ?? []).length || (memo.attempts ?? 0) >= MAX_ATTEMPTS));
  }

  const showFb = (speak: boolean) => {
    if (!memo.fb) return;
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis, memo.fb.vars);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };

  renderCards();
  refreshField();
  showFb(false);
  ctx.setReadables(readables);
  ctx.autoRead();
  return { dispose: () => undefined };
}

// ---------- Timing task ----------

interface TimingMemo {
  values?: Record<string, { pct: string; hrs: string }>;
  attempts?: number;
  done?: boolean;
  fb?: { kind: 'good' | 'warn' | 'info'; text: string; mis?: string; vars?: Record<string, string | number> };
}

function timingTask(ctx: StepContext, task: TimingTask, content: PartContent): StepView {
  const memo = ctx.memo as TimingMemo;
  memo.values ??= {};
  const field = makeField(task.field, progress().seed);
  const labels = loadLabels(task.field);
  // Use the student's own sorting; any cell they did not sort counts by the key.
  const counts = tally(labels.map((l, i) => l ?? field[i].phase));
  const total = FIELD_SIZE;

  const prompt = paragraph(task.prompt, { hours: task.cycleHours });
  const supports = new Supports(ctx, task, () => undefined);
  const table = h('table', { class: 'timing' });
  table.appendChild(
    h('thead', {}, h('tr', {}, h('th', {}, t('A2b.timing.phase')), h('th', {}, t('A2b.timing.count')), h('th', {}, t('A2b.timing.percent')), h('th', {}, t('A2b.timing.hours')))),
  );
  const body = h('tbody');
  const inputs: Record<string, { pct: HTMLInputElement; hrs: HTMLInputElement; mark: HTMLElement }> = {};
  for (const p of task.rows) {
    const v = (memo.values[p] ??= { pct: '', hrs: '' });
    const pct = h('input', { type: 'text', inputmode: 'decimal', class: 'num-in', value: v.pct, 'aria-label': `${t(`A2b.phase.${p}`)}: ${t('A2b.timing.percent')}` }) as HTMLInputElement;
    const hrs = h('input', { type: 'text', inputmode: 'decimal', class: 'num-in', value: v.hrs, 'aria-label': `${t(`A2b.phase.${p}`)}: ${t('A2b.timing.hours')}` }) as HTMLInputElement;
    pct.addEventListener('input', () => (v.pct = pct.value));
    hrs.addEventListener('input', () => (v.hrs = hrs.value));
    const mark = h('span', { class: 'row-mark', 'aria-live': 'polite' });
    inputs[p] = { pct, hrs, mark };
    body.appendChild(
      h('tr', {}, h('th', { scope: 'row' }, h('span', { class: 'mini-art', html: stainedCellSvg(p) }), t(`A2b.phase.${p}`)), h('td', {}, `${counts[p]} / ${total}`), h('td', {}, pct, ' %'), h('td', {}, hrs, ' h ', mark)),
    );
  }
  table.appendChild(body);
  const checkBtn = h('button', { class: 'btn primary', type: 'button' }, t('ui.task.check'));
  const fbSlot = h('div', {});
  ctx.body.append(prompt.el, supports.top, h('div', { class: 'card' }, table, h('div', {}, checkBtn)), fbSlot);
  if (!supportsOn(task)) ctx.body.appendChild(h('p', { class: 'note' }, t('ui.task.supportsOff')));
  ctx.body.appendChild(supports.el);

  const num = (s: string) => Number(String(s).replace(',', '.').replace('%', '').trim());
  const showFb = (speak: boolean) => {
    if (!memo.fb) return;
    const box = feedback(content, memo.fb.kind, memo.fb.text, memo.fb.mis, memo.fb.vars);
    if (speak) setFeedback(fbSlot, box);
    else fbSlot.replaceChildren(box.el);
  };
  const lock = () => {
    checkBtn.disabled = true;
    Object.values(inputs).forEach((r) => (r.pct.disabled = r.hrs.disabled = true));
  };
  const reveal = () => {
    for (const p of task.rows) {
      const k = timing(counts[p], total, task.cycleHours);
      inputs[p].pct.value = (Math.round(k.percent * 10) / 10).toString();
      inputs[p].hrs.value = (Math.round(k.hours * 10) / 10).toString();
    }
  };

  checkBtn.addEventListener('click', () => {
    memo.attempts = (memo.attempts ?? 0) + 1;
    let firstWrong: string | null = null;
    let mis: string | undefined;
    let wrongCount = 0;
    for (const p of task.rows) {
      const k = timing(counts[p], total, task.cycleHours);
      const pct = num(inputs[p].pct.value);
      const hrs = num(inputs[p].hrs.value);
      const okP = Math.abs(pct - k.percent) <= PERCENT_TOLERANCE;
      const okH = Math.abs(hrs - k.hours) <= HOURS_TOLERANCE;
      inputs[p].mark.textContent = okP && okH ? '✓' : '✗';
      if (!(okP && okH)) {
        wrongCount++;
        if (!firstWrong) {
          firstWrong = p;
          if (!okP && Math.abs(pct - counts[p]) < 0.01) mis = 'percent-is-count';
          else if (okP && Math.abs(hrs - pct) < 0.01) mis = 'hours-is-percent';
          else if (okP) mis = 'hours-not-scaled';
          else mis = 'percent-not-of-total';
        }
      }
    }
    const ok = wrongCount === 0;
    recordResult(task.id, ok);
    if (ok) {
      const rule = task.feedback.find((r) => r.when === 'correct');
      memo.fb = { kind: 'good', text: rule?.text ?? 'ui.task.correct' };
      memo.done = true;
    } else {
      const ruleKey = `A2b.fb.${mis}`;
      memo.fb = { kind: 'warn', text: ruleKey, mis, vars: { phase: t(`A2b.phase.${firstWrong}`), count: counts[firstWrong as CyclePhase], total, hours: task.cycleHours } };
      if (task.phase === 'checkpoint' || memo.attempts >= MAX_ATTEMPTS) {
        if (task.phase !== 'checkpoint') reveal();
        memo.done = true;
      } else supports.nextHint(false);
    }
    if (memo.done) {
      lock();
      ctx.setDone(true);
    }
    showFb(true);
  });

  if (memo.done) lock();
  showFb(false);
  ctx.setDone(!!memo.done);
  ctx.setReadables([prompt]);
  ctx.autoRead();
  return { dispose: () => undefined };
}

// ---------- Scenes ----------

/** The cell cycle as a loop: interphase takes most of it; mitosis is the short part. */
function cycleScene(ctx: StepContext): StepView {
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const shares = [0.75, 0.1, 0.06, 0.04, 0.05];
  const colors = [STAIN.nucleusLight, PALETTE.teal, PALETTE.orange, PALETTE.moss, PALETTE.blue];
  let a0 = Math.PI / 2;
  const R = 2.7;
  // Interphase is drawn beside its big slice; the four short mitosis slices
  // get a column of drawings on the left, joined to their slices by thin lines.
  const column = [2.7, 0.9, -0.9, -2.7];
  PHASES.forEach((p, i) => {
    const a1 = a0 - shares[i] * Math.PI * 2;
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.absarc(0, 0, R, a0, a1, true);
    s.lineTo(0, 0);
    root.add(paper(s, { color: colors[i], outline: 0.06, shadow: false, striped: i % 2 === 1 }));
    const mid = (a0 + a1) / 2;
    const at = i === 0 ? new THREE.Vector2(R + 1.4, -1.2) : new THREE.Vector2(-(R + 2.1), column[i - 1]);
    const edge = new THREE.Vector2(Math.cos(mid) * R, Math.sin(mid) * R);
    if (i > 0) {
      const lead = new THREE.Mesh(strokeGeometry([edge, new THREE.Vector2(at.x + 0.6, at.y)], 0.03, false), basic(PALETTE.ink));
      lead.position.z = 0.08;
      root.add(lead);
    }
    const cell = stainedCell(p, 0, 0.3, 0.95);
    cell.position.set(at.x, at.y, 0.1);
    root.add(cell);
    root.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t(`A2b.phase.${p}`)), { x: at.x, y: at.y - 0.72, z: 0.2 }));
    a0 = a1;
  });
  const hole = paper(circleShape(1.1), { color: PALETTE.cream, outline: 0.06, shadow: false });
  hole.position.z = 0.05;
  root.add(hole);
  root.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t('A2b.cycle.centre')), { x: 0, y: 0, z: 0.2 }));
  root.position.x = 0.5;
  ctx.stage.invalidate();
  return { dispose: () => undefined };
}

const module: BeatModule = {
  scenes: {
    panel: storyScene,
    cycle: cycleScene,
  },
  tasks: {
    sort: (ctx, task: Task, content) => sortTask(ctx, task as SortTask, content),
    timing: (ctx, task: Task, content) => timingTask(ctx, task as TimingTask, content),
  },
};

export default module;
export const scenes = module.scenes;
export const tasks = module.tasks;
