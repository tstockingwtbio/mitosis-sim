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
  | { divide: DivideError };

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

export type Task = RecallTask | CountTask | PairTask | ChoiceTask | PredictTask | DivideTask;

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
  kind?: 'observe';
  steps: Step[];
}

export interface PartContent {
  version: number;
  part: string;
  misconceptions: Record<string, string>;
  beats: Beat[];
  tasks: Record<string, Task>;
}
