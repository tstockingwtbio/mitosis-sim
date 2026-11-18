// Cell-cycle fields for A2b: 36 cells, each caught in one exact phase.
// Every student gets a different random field (seeded, so it stays the same
// for that student), so the class can pool counts.

export const PHASES = ['interphase', 'prophase', 'metaphase', 'anaphase', 'telophase'] as const;
export type CyclePhase = (typeof PHASES)[number];
export type FieldKind = 'tip' | 'old' | 'onion';

export const FIELD_SIZE = 36;

/** Share of cells in each phase (interphase … telophase). Rough, classroom-realistic values. */
const MIX: Record<FieldKind, number[]> = {
  // New tail tip: growing fast, plenty of dividing cells.
  tip: [0.75, 0.1, 0.06, 0.04, 0.05],
  // Old tail: finished tissue, almost every cell in interphase.
  old: [0.96, 0.02, 0.01, 0, 0.01],
  // Onion root tip: grows fast too.
  onion: [0.68, 0.13, 0.07, 0.05, 0.07],
};

/** Small, fast, seeded random numbers (mulberry32). */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface FieldCell {
  phase: CyclePhase;
  /** Drawing variety: rotation and small shape changes. */
  angle: number;
  wobble: number;
}

/**
 * A field of 36 cells for one student. For the new tail tip, the first three
 * cells are an interphase, a metaphase and an anaphase cell (the narrator
 * sorts those three in VO-A18), and every phase appears at least once.
 */
export function makeField(kind: FieldKind, seed: number): FieldCell[] {
  const r = rng(seed * 31 + (kind === 'tip' ? 1 : kind === 'old' ? 2 : 3));
  const counts = PHASES.map(() => 0);
  const mix = MIX[kind];
  // Start from the expected counts, then let a few cells drift so fields differ.
  mix.forEach((m, i) => (counts[i] = Math.round(m * FIELD_SIZE)));
  for (let k = 0; k < 4; k++) {
    const from = Math.floor(r() * PHASES.length);
    const to = Math.floor(r() * PHASES.length);
    if (counts[from] > (kind === 'tip' && from > 0 ? 1 : 0) && (kind !== 'old' || to === 0 || r() < 0.3)) {
      counts[from]--;
      counts[to]++;
    }
  }
  if (kind === 'tip') for (let i = 1; i < PHASES.length; i++) if (counts[i] === 0) (counts[i]++, counts[0]--);
  const fix = FIELD_SIZE - counts.reduce((a, b) => a + b, 0);
  counts[0] += fix;

  const phases: CyclePhase[] = [];
  counts.forEach((n, i) => {
    for (let j = 0; j < n; j++) phases.push(PHASES[i]);
  });
  // Shuffle.
  for (let i = phases.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [phases[i], phases[j]] = [phases[j], phases[i]];
  }
  if (kind === 'tip') {
    // Put an interphase, a metaphase and an anaphase cell first (VO-A18 order).
    (['interphase', 'metaphase', 'anaphase'] as CyclePhase[]).forEach((p, slot) => {
      const at = phases.findIndex((x, i) => i >= slot && x === p);
      [phases[slot], phases[at]] = [phases[at], phases[slot]];
    });
  }
  return phases.map((phase) => ({ phase, angle: r() * Math.PI * 2, wobble: r() }));
}

export function tally(phases: (CyclePhase | null | undefined)[]): Record<CyclePhase, number> {
  const out = { interphase: 0, prophase: 0, metaphase: 0, anaphase: 0, telophase: 0 };
  for (const p of phases) if (p) out[p]++;
  return out;
}

/** Share of the cycle (percent) and hours, from a count. */
export function timing(count: number, total: number, cycleHours = 24): { percent: number; hours: number } {
  const share = total ? count / total : 0;
  return { percent: share * 100, hours: share * cycleHours };
}

/** A student's answer is accepted within these margins (they may round). */
export const PERCENT_TOLERANCE = 1.5;
export const HOURS_TOLERANCE = 0.5;
