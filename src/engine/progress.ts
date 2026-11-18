import { readJSON, remove, writeJSON } from './storage';

export interface TaskResult {
  firstTryCorrect: boolean;
  correct: boolean;
  attempts: number;
}

export interface Progress {
  beat: string;
  step: Record<string, number>;
  results: Record<string, TaskResult>;
  responses: Record<string, string>;
  /** Correct answers in a row (for fading worked steps). */
  streak: number;
  /** How many worked steps are currently faded. */
  fade: number;
}

const KEY = 'mm.progress.v1';

function blank(): Progress {
  return { beat: 'A0', step: {}, results: {}, responses: {}, streak: 0, fade: 0 };
}

let state: Progress = { ...blank(), ...readJSON<Partial<Progress>>(KEY, {}) };

export function progress(): Progress {
  return state;
}

export function saveProgress(patch: Partial<Progress> = {}): void {
  state = { ...state, ...patch };
  writeJSON(KEY, state);
}

export function recordResult(taskId: string, correct: boolean): TaskResult {
  const prev = state.results[taskId];
  const r: TaskResult = prev
    ? { ...prev, correct: prev.correct || correct, attempts: prev.attempts + 1 }
    : { firstTryCorrect: correct, correct, attempts: 1 };
  state.results[taskId] = r;
  // Adaptive fading: two correct in a row fades one more worked step.
  if (correct) {
    state.streak += 1;
    if (state.streak >= 2) {
      state.fade += 1;
      state.streak = 0;
    }
  } else {
    state.streak = 0;
  }
  writeJSON(KEY, state);
  return r;
}

export function resetProgress(): void {
  state = blank();
  remove(KEY);
}
