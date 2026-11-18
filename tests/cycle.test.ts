import { describe, expect, it } from 'vitest';
import { FIELD_SIZE, PHASES, makeField, tally, timing } from '../src/engine/model/cycle';

describe('cell-cycle fields', () => {
  it('always has 36 cells, and the same seed gives the same field', () => {
    for (const kind of ['tip', 'old', 'onion'] as const) {
      for (let seed = 1; seed < 40; seed++) {
        const f = makeField(kind, seed);
        expect(f.length).toBe(FIELD_SIZE);
        expect(makeField(kind, seed)).toEqual(f);
      }
    }
  });

  it('new tail tip: every phase appears, most cells are in interphase, first three are I, M, A', () => {
    for (let seed = 1; seed < 200; seed++) {
      const f = makeField('tip', seed);
      const t = tally(f.map((c) => c.phase));
      for (const p of PHASES) expect(t[p], `seed ${seed} ${p}`).toBeGreaterThan(0);
      expect(t.interphase).toBeGreaterThan(FIELD_SIZE / 2);
      expect(f.slice(0, 3).map((c) => c.phase)).toEqual(['interphase', 'metaphase', 'anaphase']);
    }
  });

  it('old tail is almost all interphase; fields differ between students', () => {
    for (let seed = 1; seed < 100; seed++) expect(tally(makeField('old', seed).map((c) => c.phase)).interphase).toBeGreaterThanOrEqual(32);
    const a = makeField('tip', 1).map((c) => c.phase).join();
    const b = makeField('tip', 2).map((c) => c.phase).join();
    expect(a).not.toBe(b);
  });

  it('turns counts into a share of a 24-hour cycle', () => {
    expect(timing(3, 36).hours).toBeCloseTo(2);
    expect(timing(27, 36).percent).toBeCloseTo(75);
  });
});
