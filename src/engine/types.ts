import type { Beat, PartContent, Step, Task } from '../content/schema';
import type { Stage } from './stage/stage';
import type { CountStrip } from './ui/countStrip';
import type { Captions } from './ui/captions';
import type { Spoken } from './ui/text';

export type PhaseLabel = 'retrieve' | 'explain' | 'worked' | 'guided' | 'independent' | 'checkpoint';

export interface StepContext {
  content: PartContent;
  beat: Beat;
  step: Step;
  /** Task for task steps (after any Go further swap). */
  task?: Task;
  stage: Stage;
  counts: CountStrip;
  captions: Captions;
  /** Panel body: explanation text and task controls. */
  body: HTMLElement;
  /** Bottom-left of the stage: animation and zoom controls. */
  overlay: HTMLElement;
  /** State that survives a re-render of the same step (e.g. a settings change). */
  memo: Record<string, unknown>;
  /** Paragraphs the panel's read-aloud button reads, in order. */
  setReadables(items: Spoken[]): void;
  getReadables(): Spoken[];
  /** Read the readables now if read-aloud is on. */
  autoRead(): void;
  /** Enable or disable the Next button. */
  setDone(done: boolean): void;
  /** Move to the next step. */
  next(): void;
}

export interface StepView {
  dispose(): void;
}

export type SceneFactory = (ctx: StepContext) => StepView;

export interface BeatModule {
  scenes: Record<string, SceneFactory>;
}
