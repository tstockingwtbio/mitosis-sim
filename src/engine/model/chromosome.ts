import type { CellSpec, ChromSpec } from '../../content/schema';

export interface Counts {
  /** Number of centromeres. */
  chromosomes: number;
  /** Number of chromatids. */
  dnaMolecules: number;
}

export function chromatids(c: ChromSpec): number {
  return c.state === 'replicated' ? 2 : 1;
}

export function countCell(cell: CellSpec): Counts {
  let dnaMolecules = 0;
  for (const c of cell.chromosomes) dnaMolecules += chromatids(c);
  return { chromosomes: cell.chromosomes.length, dnaMolecules };
}

/** Genetic identity of a chromosome, ignoring whether it is copied. */
function signature(c: ChromSpec): string {
  return `${c.pair}|${c.parent}|${c.alleles.join(',')}`;
}

/**
 * "Same info as parent?": true when the cell holds exactly one of each
 * chromosome the parent holds (copied or not).
 */
export function sameInfo(cell: CellSpec, parent: CellSpec): boolean {
  const a = cell.chromosomes.map(signature).sort();
  const b = parent.chromosomes.map(signature).sort();
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

export function isHomologousPair(a: ChromSpec, b: ChromSpec): boolean {
  return a.id !== b.id && a.pair === b.pair && a.parent !== b.parent;
}

export type PairError = 'same-parent' | 'different-genes' | null;

export function pairError(a: ChromSpec, b: ChromSpec): PairError {
  if (isHomologousPair(a, b)) return null;
  if (a.parent === b.parent) return 'same-parent';
  return 'different-genes';
}

export function replicate(c: ChromSpec): ChromSpec {
  return { ...c, state: 'replicated' };
}
