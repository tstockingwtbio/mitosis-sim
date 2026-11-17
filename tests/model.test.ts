import { describe, expect, it } from 'vitest';
import type { CellSpec, ChromSpec } from '../src/content/schema';
import { countCell, pairError, replicate, sameInfo } from '../src/engine/model/chromosome';

const rod = (id: string, pair: number, parent: 'M' | 'P', alleles: string[]): ChromSpec => ({
  id, pair, parent, state: 'unreplicated', length: pair === 1 ? 'long' : 'short', alleles,
});

const parent: CellSpec = {
  chromosomes: [rod('1M', 1, 'M', ['A']), rod('1P', 1, 'P', ['a']), rod('2M', 2, 'M', ['B']), rod('2P', 2, 'P', ['b'])],
};

describe('chromosome model', () => {
  it('unreplicated 2n = 4: 4 chromosomes, 4 DNA molecules', () => {
    expect(countCell(parent)).toEqual({ chromosomes: 4, dnaMolecules: 4 });
  });

  it('an X is one chromosome with two DNA molecules', () => {
    const x = replicate(parent.chromosomes[0]);
    expect(countCell({ chromosomes: [x] })).toEqual({ chromosomes: 1, dnaMolecules: 2 });
  });

  it('replicating every chromosome doubles DNA, not chromosomes', () => {
    const copied = { chromosomes: parent.chromosomes.map(replicate) };
    expect(countCell(copied)).toEqual({ chromosomes: 4, dnaMolecules: 8 });
    expect(sameInfo(copied, parent)).toBe(true);
  });

  it('a missing or extra chromosome is not the same info as the parent', () => {
    expect(sameInfo({ chromosomes: parent.chromosomes.slice(1) }, parent)).toBe(false);
    expect(sameInfo({ chromosomes: [...parent.chromosomes, parent.chromosomes[0]] }, parent)).toBe(false);
  });

  it('classifies pairing errors', () => {
    const [m1, p1, m2, p2] = parent.chromosomes;
    expect(pairError(m1, p1)).toBeNull();
    expect(pairError(m1, m2)).toBe('same-parent');
    expect(pairError(m1, p2)).toBe('different-genes');
  });
});
