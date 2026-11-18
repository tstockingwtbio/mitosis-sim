import { describe, expect, it } from 'vitest';
import type { ChromSpec } from '../src/content/schema';
import { judgeCell, overallError } from '../src/engine/tasks/divide';

const rod = (id: string, pair: number, parent: 'M' | 'P'): ChromSpec => ({ id, pair, parent, state: 'unreplicated', length: 'long', alleles: [id] });
const parent = [rod('1M', 1, 'M'), rod('1P', 1, 'P'), rod('2M', 2, 'M'), rod('2P', 2, 'P')];

describe('judging a new cell after division', () => {
  it('one copy of every chromosome matches the parent', () => {
    expect(judgeCell([...parent], parent)).toBeNull();
  });
  it('a cell without copying first is missing chromosomes', () => {
    expect(judgeCell([parent[0], parent[2]], parent)).toBe('missing');
  });
  it('both halves of one X in one cell is an extra chromosome... and a missing one', () => {
    expect(judgeCell([parent[0], parent[0], parent[2], parent[3]], parent)).toBe('mixed');
    expect(judgeCell([...parent, parent[0]], parent)).toBe('extra');
  });
  it('names the mistake behind the whole division', () => {
    expect(overallError('extra', 'missing')).toBe('extra');
    expect(overallError('missing', 'missing')).toBe('missing');
    expect(overallError('mixed', 'mixed')).toBe('mixed');
    expect(overallError(null, null)).toBeNull();
  });
});
