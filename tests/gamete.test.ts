import { describe, expect, it } from 'vitest';
import type { ChromSpec } from '../src/content/schema';
import { combinations, judgeGamete } from '../src/engine/tasks/gamete';

const rod = (id: string, pair: number, parent: 'M' | 'P'): ChromSpec => ({ id, pair, parent, state: 'unreplicated', length: 'long', alleles: [] });
const cell = [rod('1M', 1, 'M'), rod('1P', 1, 'P'), rod('2M', 2, 'M'), rod('2P', 2, 'P')];
const pick = (...ids: string[]) => cell.filter((c) => ids.includes(c.id));

describe('making eggs and sperm', () => {
  it('one chromosome from every pair is right, in any mix', () => {
    expect(judgeGamete(pick('1M', '2P'), cell)).toBeNull();
    expect(judgeGamete(pick('1P', '2M'), cell)).toBeNull();
  });
  it('names the mistake', () => {
    expect(judgeGamete(cell, cell)).toBe('full-set');
    expect(judgeGamete(pick('1M', '1P'), cell)).toBe('both-of-pair');
    expect(judgeGamete(pick('1M'), cell)).toBe('missing-pair');
    expect(judgeGamete(pick('1M', '1P', '2M'), cell)).toBe('both-of-pair');
  });
  it('counts the combinations: 2 per pair, multiplied', () => {
    expect(combinations(cell)).toBe(4);
    expect(combinations([...cell, rod('3M', 3, 'M'), rod('3P', 3, 'P')])).toBe(8);
  });
});
