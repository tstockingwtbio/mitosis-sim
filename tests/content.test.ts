import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import content from '../src/content/partA.json';
import en from '../src/i18n/en.json';
import type { PartContent, Task } from '../src/content/schema';
import { countCell, isHomologousPair } from '../src/engine/model/chromosome';

const part = content as unknown as PartContent;
const dict = en as Record<string, unknown>;
const bible = readFileSync(resolve(__dirname, '../docs/story-bible.md'), 'utf8');

function keysOfTask(task: Task): string[] {
  const keys = [task.prompt];
  if (task.kind === 'recall') keys.push(task.answer);
  if ('worked' in task && task.worked) keys.push(...task.worked);
  if ('hints' in task && task.hints) keys.push(...task.hints);
  if ('frames' in task && task.frames) keys.push(task.frames);
  if ('wordBank' in task && task.wordBank) keys.push(task.wordBank);
  if (task.kind === 'count' || task.kind === 'pair' || task.kind === 'divide') keys.push(...task.feedback.map((f) => f.text));
  if (task.kind === 'choice') for (const o of task.options) keys.push(o.text, o.feedback);
  return keys;
}

describe('partA.json', () => {
  it('every task is tagged with its beat and standard', () => {
    for (const task of Object.values(part.tasks)) {
      expect(task.standard, task.id).toBe('SC.HS.6.1.d');
      expect(part.beats.some((b) => b.id === task.beat), task.id).toBe(true);
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
    for (const b of part.beats.filter((x) => x.built && x.kind !== 'observe')) {
      const first = b.steps[0];
      expect(first.type).toBe('retrieve');
      if (first.type === 'retrieve') expect(first.tasks.length).toBeGreaterThanOrEqual(3);
      const taskSteps = b.steps.filter((s) => s.type === 'task');
      const last = taskSteps[taskSteps.length - 1];
      expect(last.type === 'task' && part.tasks[last.task].phase).toBe('checkpoint');
      // Worked example comes before any independent practice.
      const phases = taskSteps.map((s) => (s.type === 'task' ? part.tasks[s.task].phase : ''));
      expect(phases.indexOf('worked')).toBeLessThan(phases.indexOf('independent'));
      expect(phases.indexOf('guided')).toBeLessThan(phases.indexOf('independent'));
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
      const rules = task.kind === 'count' || task.kind === 'pair' || task.kind === 'divide' ? task.feedback : [];
      for (const r of rules) if (r.misconception) expect(part.misconceptions[r.misconception], r.misconception).toBeDefined();
      if (task.kind === 'choice')
        for (const o of task.options) if (o.misconception) expect(part.misconceptions[o.misconception]).toBeDefined();
    }
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
