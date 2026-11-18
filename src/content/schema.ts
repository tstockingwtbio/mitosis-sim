// Types for src/content/partA.json. Every user-facing string is an i18n key
// (see src/i18n/en.json); this file holds structure, answers and IDs only.

export type Parent = 'M' | 'P';
export type ChromState = 'unreplicated' | 'replicated';
export type LengthClass = 'long' | 'medium' | 'short';

export interface ChromSpec {
  id: string;
  pair: number;
  parent: Parent;
  state: ChromState;
  length: LengthClass;
  /** Allele letters on paper tabs, top to bottom. */
  alleles: string[];
  /** Crossing over: above this fraction (from the bottom) the paper is the other parent's. */
  swap?: number;
  /** Layout hints in stage units (task screens are 16 x 9 units). */
  x?: number;
  y?: number;
  angle?: number;
}

export interface CellSpec {
  chromosomes: ChromSpec[];
}

export type Phase = 'retrieve' | 'predict' | 'attempt' | 'worked' | 'guided' | 'independent' | 'checkpoint';
export type Status = 'draft' | 'approved';

interface TaskBase {
  id: string;
  beat: string;
  standard: string;
  phase: Phase;
  status: Status;
  prompt: string;
  /** Task that replaces this one when "Go further" is on. */
  goFurther?: string;
  /** True for a Go further variant (only shown in place of its core task). */
  isGoFurther?: boolean;
  /** Narrated lines (voice-over IDs) shown as captions with this task. */
  lines?: string[];
}

export interface RecallTask extends TaskBase {
  kind: 'recall';
  answer: string;
  source: 'last-module' | 'last-week' | 'prior-unit';
}

export type FeedbackWhen =
  | 'correct'
  | 'other'
  | { chromosomes?: number; dnaMolecules?: number }
  | { pair: 'same-parent' | 'different-genes' }
  | { divide: DivideError }
  | { switch: 'none' | 'wrong' | 'extra' }
  | { gamete: GameteError }
  | { bands: 'missed' | 'extra' };

/** What went wrong when a cell was divided. */
export type DivideError = 'missing' | 'extra' | 'mixed';

export interface FeedbackRule {
  when: FeedbackWhen;
  misconception?: string;
  text: string;
}

export type WorkedAction = 'centromeres' | 'chromosomeCount' | 'chromatids' | 'dnaCount' | 'none';

export interface Supports {
  worked?: string[];
  /** What the model shows as each worked step is revealed. */
  workedActions?: WorkedAction[];
  hints?: string[];
  frames?: string;
  wordBank?: string;
}

export interface CountTask extends TaskBase, Supports {
  kind: 'count';
  cell: CellSpec;
  answer: { chromosomes: number; dnaMolecules: number };
  feedback: FeedbackRule[];
}

export interface PairTask extends TaskBase, Supports {
  kind: 'pair';
  cell: CellSpec;
  answer: [string, string][];
  feedback: FeedbackRule[];
}

export interface ChoiceOption {
  id: string;
  text: string;
  correct?: boolean;
  /** Dropped first when "Fewer answer choices" is on. */
  removable?: boolean;
  misconception?: string;
  feedback: string;
}

export interface ChoiceTask extends TaskBase, Supports {
  kind: 'choice';
  options: ChoiceOption[];
}

/** Open prediction before instruction (OBSERVE): saved, not graded. */
export interface PredictTask extends TaskBase, Supports {
  kind: 'predict';
  /** Show the student's answer to an earlier prediction (task ID) to revise. */
  showEarlier?: string;
}

export type GeneName = 'bone' | 'muscle' | 'skin';

/** Switch genes on and off to make one kind of cell (A3). */
export interface SwitchTask extends TaskBase, Supports {
  kind: 'switch';
  target: GeneName;
  feedback: FeedbackRule[];
}

/**
 * Divide a cell: move every chromosome (or each half of every X) into two new
 * cells. The goal: both new cells hold the same information as the parent.
 */
export interface DivideTask extends TaskBase, Supports {
  kind: 'divide';
  /** The parent cell, before copying (all chromosomes unreplicated). */
  cell: CellSpec;
  feedback: FeedbackRule[];
}

export type FieldKind = 'tip' | 'old' | 'onion';

/** Sort cells on a stained slide into phases (A2b). Cells [from, to) of the field. */
export interface SortTask extends TaskBase, Supports {
  kind: 'sort';
  field: FieldKind;
  range: [number, number];
}

/** Turn phase counts into a share of the cycle and hours (A2b). */
export interface TimingTask extends TaskBase, Supports {
  kind: 'timing';
  field: FieldKind;
  rows: ('interphase' | 'prophase' | 'metaphase' | 'anaphase' | 'telophase')[];
  cycleHours: number;
  feedback: FeedbackRule[];
}

/** What went wrong when building an egg or sperm (Part B). */
export type GameteError = 'full-set' | 'both-of-pair' | 'missing-pair';

/**
 * Make an egg or sperm: pick chromosomes from a parent cell. Correct: exactly
 * one chromosome from every pair. With `collect`, students make that many
 * different correct ones (counting the combinations).
 */
export interface GameteTask extends TaskBase, Supports {
  kind: 'gamete';
  cell: CellSpec;
  /** Which word the panel uses. */
  gamete: 'egg' | 'sperm';
  collect?: number;
  feedback: FeedbackRule[];
}

/** Sort statement cards into bins (Part B). */
export interface ClassifyTask extends TaskBase, Supports {
  kind: 'classify';
  bins: string[];
  items: { id: string; text: string; bin: number; misconception?: string; feedback?: string }[];
}

/**
 * DNA profiles (band patterns). 'match': mark the bands in one lane that
 * also appear in another. 'tissues': choose samples of Fig to test.
 */
export interface BandsTask extends TaskBase, Supports {
  kind: 'bands';
  mode: 'match' | 'tissues';
  /** Lanes on the gel, left to right (profile IDs). */
  lanes: string[];
  target?: string;
  compare?: string;
  /** For 'tissues': the samples students may test (profile IDs). */
  samples?: string[];
  feedback: FeedbackRule[];
}

/** Run the three test tanks in the variation lab (B4). */
export interface LabTask extends TaskBase, Supports {
  kind: 'lab';
  tanks: { id: string; line?: string; card: string }[];
}

export type Task =
  | RecallTask
  | CountTask
  | PairTask
  | ChoiceTask
  | PredictTask
  | DivideTask
  | SortTask
  | TimingTask
  | SwitchTask
  | GameteTask
  | ClassifyTask
  | BandsTask
  | LabTask;

export interface NarrationLine {
  /** Voice-over ID from the story bible, e.g. VO-A04. */
  vo: string;
}

export type Step =
  | { id: string; type: 'retrieve'; tasks: string[] }
  | {
      id: string;
      type: 'explain';
      scene: string;
      title: string;
      body: string[];
      lines: string[];
      sfx?: string[];
      assets?: string[];
      cell?: CellSpec;
      /** Story panels (image asset IDs); `line` is the narrated line that shows it. */
      panels?: { asset: string; line?: number; sfx?: string }[];
      /** Looping background sound (an ambience SFX ID). */
      ambience?: string;
      /** Scene option, e.g. 'complete' for the full life cycle. */
      variant?: string;
    }
  | { id: string; type: 'task'; task: string }
  | { id: string; type: 'intro'; title: string; body: string[] }
  | { id: string; type: 'summary'; title: string; body: string[] };

export interface Beat {
  id: string;
  title: string;
  module: string;
  standard: string;
  built: boolean;
  sequencing?: 'explicit-first' | 'attempt-first' | 'phenomenon-first';
  /** 'observe': a story/phenomenon opener (no Retrieve block or checkpoint). */
  kind?: 'observe' | 'review';
  /** Which part of the sim (default A). */
  part?: 'A' | 'B';
  steps: Step[];
}

/** A DNA profile: two band sizes for each marker. */
export type Profile = number[][];

export interface PartContent {
  version: number;
  part: string;
  profiles?: Record<string, Profile>;
  misconceptions: Record<string, string>;
  beats: Beat[];
  tasks: Record<string, Task>;
}
