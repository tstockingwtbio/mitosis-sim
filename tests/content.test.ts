import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import partA from '../src/content/partA.json';
import partB from '../src/content/partB.json';
import { mergeParts } from '../src/content/merge';
import { combinations } from '../src/engine/tasks/gamete';
import { matchingBands } from '../src/engine/tasks/bands';
import en from '../src/i18n/en.json';
import type { PartContent, Task } from '../src/content/schema';
import { countCell, isHomologousPair } from '../src/engine/model/chromosome';

const A = partA as unknown as PartContent;
const Bp = partB as unknown as PartContent;
const part = mergeParts(A, Bp);
const STANDARD: Record<string, string> = { A: 'SC.HS.6.1.d', B: 'SC.HS.9.4.b' };
const dict = en as Record<string, unknown>;
const bible = readFileSync(resolve(__dirname, '../docs/story-bible.md'), 'utf8');

function keysOfTask(task: Task): string[] {
  const keys = [task.prompt];
  if (task.kind === 'recall') keys.push(task.answer);
  if ('worked' in task && task.worked) keys.push(...task.worked);
  if ('hints' in task && task.hints) keys.push(...task.hints);
  if ('frames' in task && task.frames) keys.push(task.frames);
  if ('wordBank' in task && task.wordBank) keys.push(task.wordBank);
  if ('feedback' in task && Array.isArray(task.feedback)) keys.push(...task.feedback.map((f) => f.text));
  if (task.kind === 'classify') keys.push(...task.bins, ...task.items.map((i) => i.text), task.prompt.replace(/.prompt$/, '.fb.correct'));
  if (task.kind === 'lab') keys.push(...task.tanks.map((tk) => tk.card));
  if (task.kind === 'choice') for (const o of task.options) keys.push(o.text, o.feedback);
  return keys;
}

describe('partA.json + partB.json', () => {
  it('every task is tagged with its beat and standard', () => {
    for (const task of Object.values(part.tasks)) {
      const beat = part.beats.find((b) => b.id === task.beat);
      expect(beat, task.id).toBeDefined();
      expect(task.standard, task.id).toBe(STANDARD[beat!.part ?? 'A']);
    }
  });

  it('every text key exists in en.json', () => {
    const missing: string[] = [];
    const need = (k: string) => {
      if (!(k in dict)) missing.push(k);
    };
    for (const b of part.beats) {
      need(b.title);
      for (const s of b.steps) {
        if ('title' in s) need(s.title);
        if ('body' in s) s.body.forEach(need);
        if (s.type === 'explain') s.lines.forEach((vo) => need(`vo.${vo}`));
      }
    }
    for (const task of Object.values(part.tasks)) keysOfTask(task).forEach(need);
    Object.values(part.misconceptions).forEach(need);
    expect(missing).toEqual([]);
  });

  it('every voice-over, image and sound ID comes from the story bible', () => {
    for (const b of part.beats)
      for (const s of b.steps) {
        if (s.type === 'task') for (const vo of part.tasks[s.task].lines ?? []) expect(bible.includes(`| ${vo} |`), vo).toBe(true);
        if (s.type !== 'explain') continue;
        const panelIds = (s.panels ?? []).flatMap((p) => [p.asset, ...(p.sfx ? [p.sfx] : [])]);
        for (const id of [...s.lines, ...(s.sfx ?? []), ...(s.assets ?? []), ...panelIds, ...(s.ambience ? [s.ambience] : [])])
          expect(bible.includes(`| ${id} |`), id).toBe(true);
      }
  });

  it('English voice-over text matches the bible word for word', () => {
    for (const [key, value] of Object.entries(dict)) {
      if (!key.startsWith('vo.')) continue;
      const v = value as { building: string; beginning: string };
      const unescape = (s: string) => s.replace(/\\\[/g, '[').replace(/\\\]/g, ']');
      const row = bible.split('\n').find((l) => l.startsWith(`| ${key.slice(3)} |`));
      expect(row, key).toBeDefined();
      const cells = unescape(row!).split('|').map((c) => c.trim());
      expect(v.building, key).toBe(cells[3]);
      expect(v.beginning, key).toBe(cells[4]);
    }
  });

  it('every task step points at a real task, and every core task is used', () => {
    const used = new Set<string>();
    for (const b of part.beats)
      for (const s of b.steps) {
        if (s.type === 'task') used.add(s.task);
        if (s.type === 'retrieve') s.tasks.forEach((t) => used.add(t));
      }
    for (const id of used) expect(part.tasks[id], id).toBeDefined();
    for (const task of Object.values(part.tasks)) {
      if (task.isGoFurther) continue;
      expect(used.has(task.id), `${task.id} unused`).toBe(true);
    }
  });

  it('Go further prompts replace a core item and exist', () => {
    for (const task of Object.values(part.tasks)) {
      if (!task.goFurther) continue;
      const gf = part.tasks[task.goFurther];
      expect(gf, task.goFurther).toBeDefined();
      expect(gf.isGoFurther).toBe(true);
    }
  });

  it('built beats open with >= 3 retrieve items and end with an independent checkpoint', () => {
    // Story openers (kind: observe) are phenomenon-first: no Retrieve block or checkpoint.
    for (const b of part.beats.filter((x) => x.built && x.kind === 'review')) {
      const first = b.steps.find((s) => s.type === 'retrieve');
      expect(first && first.type === 'retrieve' && first.tasks.length, b.id).toBeGreaterThanOrEqual(3);
    }
    for (const b of part.beats.filter((x) => x.built && !x.kind)) {
      const first = b.steps[0];
      expect(first.type).toBe('retrieve');
      if (first.type === 'retrieve') expect(first.tasks.length).toBeGreaterThanOrEqual(3);
      const taskSteps = b.steps.filter((s) => s.type === 'task');
      const last = taskSteps[taskSteps.length - 1];
      expect(last.type === 'task' && part.tasks[last.task].phase).toBe('checkpoint');
      // Worked example comes before any independent practice.
      const phases = taskSteps.map((s) => (s.type === 'task' ? part.tasks[s.task].phase : ''));
      const ind = phases.indexOf('independent');
      if (ind >= 0) {
        expect(phases.indexOf('worked'), b.id).toBeLessThan(ind);
        expect(phases.indexOf('guided'), b.id).toBeLessThan(ind);
      }
    }
  });

  it('count answers match the model', () => {
    for (const task of Object.values(part.tasks)) {
      if (task.kind !== 'count') continue;
      expect(countCell(task.cell), task.id).toEqual(task.answer);
    }
  });

  it('pair answers are true homologous pairs covering every chromosome', () => {
    for (const task of Object.values(part.tasks)) {
      if (task.kind !== 'pair') continue;
      const byId = new Map(task.cell.chromosomes.map((c) => [c.id, c]));
      const seen = new Set<string>();
      for (const [a, b] of task.answer) {
        expect(isHomologousPair(byId.get(a)!, byId.get(b)!), `${task.id} ${a}-${b}`).toBe(true);
        seen.add(a).add(b);
      }
      expect(seen.size).toBe(task.cell.chromosomes.length);
    }
  });

  it('divide tasks start from an uncopied cell of complete pairs', () => {
    for (const task of Object.values(part.tasks)) {
      if (task.kind !== 'divide') continue;
      for (const c of task.cell.chromosomes) expect(c.state, task.id).toBe('unreplicated');
      const pairs = new Map<number, string[]>();
      for (const c of task.cell.chromosomes) pairs.set(c.pair, [...(pairs.get(c.pair) ?? []), c.parent]);
      for (const [, ps] of pairs) expect(ps.sort(), task.id).toEqual(['M', 'P']);
      expect(task.feedback.some((r) => r.when === 'correct'), task.id).toBe(true);
    }
  });

  it('choice items have exactly one correct answer that is never removable', () => {
    for (const task of Object.values(part.tasks)) {
      if (task.kind !== 'choice') continue;
      const correct = task.options.filter((o) => o.correct);
      expect(correct.length, task.id).toBe(1);
      expect(correct[0].removable, task.id).toBeFalsy();
      for (const o of task.options) if (!o.correct) expect(o.misconception, `${task.id}:${o.id}`).toBeDefined();
    }
  });

  it('every wrong-answer feedback names a known misconception', () => {
    for (const task of Object.values(part.tasks)) {
      const rules = 'feedback' in task && Array.isArray(task.feedback) ? task.feedback : [];
      if (task.kind === 'classify') for (const i of task.items) if (i.misconception) expect(part.misconceptions[i.misconception], i.misconception).toBeDefined();
      for (const r of rules) if (r.misconception) expect(part.misconceptions[r.misconception], r.misconception).toBeDefined();
      if (task.kind === 'choice')
        for (const o of task.options) if (o.misconception) expect(part.misconceptions[o.misconception]).toBeDefined();
    }
  });
});

describe('Part B models', () => {
  it('gamete tasks start from complete pairs, and collect counts every combination', () => {
    for (const task of Object.values(part.tasks)) {
      if (task.kind !== 'gamete') continue;
      const pairs = new Map<number, string[]>();
      for (const c of task.cell.chromosomes) pairs.set(c.pair, [...(pairs.get(c.pair) ?? []), c.parent]);
      for (const [, ps] of pairs) expect(ps.sort(), task.id).toEqual(['M', 'P']);
      if (task.collect) expect(task.collect, task.id).toBe(combinations(task.cell.chromosomes));
    }
  });

  it('band tasks use real profiles, and the story holds', () => {
    const p = part.profiles!;
    for (const task of Object.values(part.tasks)) {
      if (task.kind !== 'bands') continue;
      for (const id of [...task.lanes, ...(task.samples ?? []), task.target, task.compare].filter(Boolean)) expect(p[id!], `${task.id} ${id}`).toBeDefined();
      if (task.mode === 'match') expect(matchingBands(p[task.target!], p[task.compare!]).length, task.id).toBeGreaterThan(0);
    }
    const markers = p.h2.length;
    // Barty is the father: one shared band in every marker.
    expect(matchingBands(p.h2, p.barty).length).toBe(markers);
    // Fig's egg cells explain the other half in every marker; her body does not.
    p.h2.forEach((sizes, m) => expect(sizes.some((s) => p.figEggs[m].includes(s) && !p.barty[m].includes(s)) || sizes.every((s) => p.figEggs[m].includes(s)), `marker ${m}`).toBe(true));
    const bodyMisses = p.h2.filter((sizes, m) => !sizes.some((s) => p.figTail[m].includes(s))).length;
    expect(bodyMisses).toBeGreaterThanOrEqual(4);
    expect(p.figSkin).toEqual(p.figTail);
    expect(p.figBlood).toEqual(p.figTail);
  });
});

describe('i18n files', () => {
  it('never shows support-program labels to students', () => {
    const text = JSON.stringify(en);
    expect(text).not.toMatch(/\b(IEP|ELL?|ESL)\b/);
  });

  it('language stubs exist with the right direction', async () => {
    const rtl = ['prs', 'fa', 'ps', 'ar'];
    for (const code of ['es', 'prs', 'fa', 'ps', 'ar', 'ru', 'vi', 'sw']) {
      const mod = JSON.parse(readFileSync(resolve(__dirname, `../src/i18n/${code}.json`), 'utf8'));
      expect(mod._meta.dir).toBe(rtl.includes(code) ? 'rtl' : 'ltr');
    }
  });
});
