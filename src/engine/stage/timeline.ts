import { h } from '../dom';
import { t } from '../../i18n';
import { getSettings } from '../settings';
import type { Stage } from './stage';

export interface TimelineStage {
  /** Seconds at normal speed. */
  duration: number;
  /** Apply progress 0..1 of this stage. Must be idempotent for any t. */
  apply: (t: number) => void;
  /** Called once when the stage starts (e.g. a sound effect). */
  start?: () => void;
}

/**
 * Stepped animation: play, pause, replay, or advance one stage at a time.
 * Nothing runs on a timer the student must race; reduced motion cuts
 * straight to the end of each stage.
 */
export class Timeline {
  readonly el: HTMLElement;
  private playBtn: HTMLButtonElement;
  private replayBtn: HTMLButtonElement;
  private stepBtn: HTMLButtonElement;
  private stageOf: HTMLElement;
  /** Number of completed stages. */
  private done = 0;
  private progress = 0;
  private playing = false;
  private stopAfterStage = false;
  private untick: (() => void) | null = null;
  private listeners = new Set<(done: number) => void>();

  constructor(private stage: Stage, private stages: TimelineStage[], private reset: () => void) {
    this.playBtn = h('button', { class: 'btn', type: 'button', onclick: () => (this.playing ? this.pause() : this.play()) });
    this.replayBtn = h('button', { class: 'btn', type: 'button', onclick: () => this.replay() });
    this.stepBtn = h('button', { class: 'btn', type: 'button', onclick: () => this.step() });
    this.stageOf = h('span', { class: 'stage-of', 'aria-live': 'polite' });
    this.el = h('div', { class: 'anim-controls', role: 'group' }, this.playBtn, this.stepBtn, this.replayBtn, this.stageOf);
    this.reset();
    this.render();
  }

  onProgress(fn: (done: number) => void): void {
    this.listeners.add(fn);
  }

  get completed(): number {
    return this.done;
  }

  get finished(): boolean {
    return this.done >= this.stages.length;
  }

  render(): void {
    this.el.setAttribute('aria-label', t('ui.anim.region'));
    const playLabel = this.playing ? t('ui.anim.pause') : t('ui.anim.play');
    this.playBtn.innerHTML = `<span class="ico" aria-hidden="true">${this.playing ? '❚❚' : '▶'}</span>`;
    this.playBtn.append(document.createTextNode(playLabel));
    this.playBtn.disabled = this.finished && !this.playing;
    this.stepBtn.innerHTML = '<span class="ico flip" aria-hidden="true">⏭</span>';
    this.stepBtn.append(document.createTextNode(t('ui.anim.step')));
    this.stepBtn.disabled = this.finished || this.playing;
    this.replayBtn.innerHTML = '<span class="ico" aria-hidden="true">↺</span>';
    this.replayBtn.append(document.createTextNode(t('ui.anim.replay')));
    this.stageOf.textContent = t('ui.anim.stageOf', { n: this.done, total: this.stages.length });
  }

  play(): void {
    if (this.finished) return;
    this.playing = true;
    this.stopAfterStage = false;
    this.run();
  }

  pause(): void {
    this.playing = false;
    this.untick?.();
    this.untick = null;
    this.render();
  }

  step(): void {
    if (this.finished || this.playing) return;
    this.playing = true;
    this.stopAfterStage = true;
    this.run();
  }

  replay(): void {
    this.pause();
    this.done = 0;
    this.progress = 0;
    this.reset();
    this.stage.invalidate();
    this.emit();
    this.play();
  }

  /** Mark the first n stages as already played (state applied by the caller). */
  restore(n: number): void {
    this.done = Math.max(0, Math.min(this.stages.length, n));
    this.render();
  }

  /** Jump to the end without animating (e.g. when returning to a step). */
  finish(): void {
    this.pause();
    for (let i = this.done; i < this.stages.length; i++) this.stages[i].apply(1);
    this.done = this.stages.length;
    this.progress = 0;
    this.stage.invalidate();
    this.emit();
    this.render();
  }

  dispose(): void {
    this.pause();
  }

  private run(): void {
    this.render();
    this.untick?.();
    const reduced = getSettings().reducedMotion;
    let started = this.progress > 0;
    this.untick = this.stage.addTick((dt) => {
      if (!this.playing) return false;
      const s = this.stages[this.done];
      if (!s) {
        this.playing = false;
        this.render();
        return false;
      }
      if (!started) {
        s.start?.();
        started = true;
      }
      this.progress = reduced ? 1 : Math.min(1, this.progress + dt / Math.max(0.05, s.duration));
      s.apply(this.progress);
      if (this.progress >= 1) {
        this.done++;
        this.progress = 0;
        started = false;
        this.emit();
        if (this.stopAfterStage || this.finished) {
          this.playing = false;
          this.untick = null;
          this.render();
          return false;
        }
        this.render();
      }
      return true;
    });
  }

  private emit(): void {
    for (const l of this.listeners) l(this.done);
  }
}
