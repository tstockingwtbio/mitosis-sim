import type { Beat, PartContent, Step, Task } from '../content/schema';
import { clear, h } from './dom';
import { t, voKey } from '../i18n';
import { applySettings, getSettings, onSettings, type Settings } from './settings';
import { progress, saveProgress } from './progress';
import { Stage } from './stage/stage';
import { loadGrain } from './stage/grain';
import { CountStrip } from './ui/countStrip';
import { Captions } from './ui/captions';
import { SettingsMenu } from './ui/settingsMenu';
import { closeGlossary } from './ui/glossary';
import { liquidTabs, type LiquidTabs } from './ui/liquidTabs';
import { paragraph, type Spoken } from './ui/text';
import { readAloud, stopReading } from './ui/reader';
import { playSfx } from './sfx';
import type { BeatModule, PhaseLabel, StepContext, StepView } from './types';
import { retrieveStep } from './tasks/retrieve';
import { countTask } from './tasks/count';
import { pairTask } from './tasks/pair';
import { choiceTask } from './tasks/choice';
import { predictTask } from './tasks/predict';
import { divideTask } from './tasks/divide';

/** Explain scenes that show a chromosome model, so the count strip appears. */
const COUNT_SCENES = ['pairs', 'replicate', 'parent', 'mitosis'];

const MODULES: Record<string, () => Promise<BeatModule>> = {
  'A0-cold-open': () => import('../modules/A0-cold-open/index'),
  'A1-chromosome-primer': () => import('../modules/A1-chromosome-primer/index'),
  'A2-copy-a-cell': () => import('../modules/A2-copy-a-cell/index'),
};

/** Settings that change what the panel shows; the step re-renders. */
const RERENDER: (keyof Settings)[] = ['lang', 'level', 'sideBySide', 'glossary', 'hints', 'worked', 'frames', 'fewerChoices', 'goFurther', 'teacherMode'];

export class App {
  private stage = new Stage();
  private counts = new CountStrip();
  private captions = new Captions();
  private settingsMenu = new SettingsMenu();
  private overlay = h('div', { class: 'stage-overlay' });
  private chaptersNav = h('nav', { class: 'chapters' });
  private titleEl = h('p', { class: 'title' });
  private settingsBtn = h('button', { class: 'btn', type: 'button' });
  private badges = h('div', { class: 'row-badges', style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } });
  private dots = h('div', { class: 'progress', role: 'img' });
  private stepTitle = h('h2', { id: 'step-title', tabindex: '-1' });
  private readBtn = h('button', { class: 'btn', type: 'button' });
  private body = h('div', { class: 'panel-body' });
  private backBtn = h('button', { class: 'btn', type: 'button' });
  private nextBtn = h('button', { class: 'btn primary', type: 'button' });
  private panel: HTMLElement;
  private workspace!: HTMLElement;
  private chapterTabs: LiquidTabs | null = null;

  private beat!: Beat;
  private stepIndex = 0;
  private view: StepView | null = null;
  private module: BeatModule | null = null;
  private memos = new Map<string, Record<string, unknown>>();
  private readables: Spoken[] = [];
  private reading = false;
  private done = false;

  constructor(root: HTMLElement, private content: PartContent) {
    applySettings();
    this.stage.el.appendChild(this.overlay);
    this.panel = h(
      'section',
      { class: 'panel', 'aria-labelledby': 'step-title' },
      h('div', { class: 'panel-head' }, h('div', { class: 'row' }, this.badges, this.dots), h('div', { class: 'row' }, this.stepTitle, this.readBtn)),
      this.body,
      h('div', { class: 'panel-nav' }, this.backBtn, this.nextBtn),
    );
    root.append(
      h(
        'div',
        { class: 'app' },
        h('header', { class: 'topbar' }, this.titleEl, this.chaptersNav, h('div', { class: 'spacer' }), this.settingsBtn),
        (this.workspace = h('main', { class: 'workspace no-stage no-counts' }, h('div', { class: 'stage-col' }, this.stage.el, this.counts.el, this.captions.el), this.panel)),
      ),
      this.settingsMenu.dialog,
    );

    this.settingsBtn.addEventListener('click', () => {
      playSfx('SFX-02');
      this.settingsMenu.open(this.settingsBtn);
    });
    this.readBtn.addEventListener('click', () => this.toggleRead());
    this.backBtn.addEventListener('click', () => this.go(this.stepIndex - 1));
    this.nextBtn.addEventListener('click', () => this.go(this.stepIndex + 1));

    onSettings((_s, changed) => {
      if (changed.includes('lang') || changed.includes('level')) {
        this.relabel();
        this.settingsMenu.refresh();
      }
      if (changed.includes('captions')) this.captions.refreshVisibility();
      if (changed.some((k) => RERENDER.includes(k))) this.renderStep(false);
    });
    window.addEventListener('mm:reset', () => {
      this.memos.clear();
      void this.openBeat(this.content.beats.find((b) => b.built)!.id, 0);
    });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeGlossary();
    });
    this.relabel();
  }

  async start(): Promise<void> {
    const p = progress();
    const beat = this.content.beats.find((b) => b.id === p.beat && b.built) ?? this.content.beats.find((b) => b.built)!;
    await this.openBeat(beat.id, p.step[beat.id] ?? 0);
    // Paper grain is a nice-to-have: load it once the first screen is up.
    window.setTimeout(loadGrain, 300);
  }

  private relabel(): void {
    document.title = t('app.title');
    this.titleEl.textContent = t('app.title');
    this.settingsBtn.replaceChildren(h('span', { class: 'ico', 'aria-hidden': 'true' }, '⚙'), t('ui.settings'));
    this.backBtn.replaceChildren(h('span', { class: 'ico flip', 'aria-hidden': 'true' }, '←'), t('ui.back'));
    this.nextBtn.replaceChildren(t('ui.next'), h('span', { class: 'ico flip', 'aria-hidden': 'true' }, '→'));
    this.setReadBtn();
    this.counts.relabel();
    this.captions.relabel();
    this.renderChapters();
  }

  private renderChapters(): void {
    this.chaptersNav.querySelector('ol')?.remove();
    this.chapterTabs ??= liquidTabs('chapters', this.chaptersNav);
    this.chaptersNav.setAttribute('aria-label', t('ui.chapters'));
    const ol = h('ol');
    this.content.beats.forEach((b, i) => {
      const current = this.beat?.id === b.id;
      const name = t(b.title);
      const btn = h(
        'button',
        {
          class: 'chapter',
          type: 'button',
          'aria-current': current ? 'step' : undefined,
          'aria-disabled': b.built ? undefined : 'true',
          'aria-label': b.built ? `${i + 1}. ${name}` : `${i + 1}. ${name} (${t('ui.comingSoon')})`,
          title: b.built ? name : `${name} (${t('ui.comingSoon')})`,
          onclick: () => {
            if (b.built && !current) void this.openBeat(b.id, progress().step[b.id] ?? 0);
          },
        },
        h('span', { class: 'num' }, String(i + 1)),
        h('span', { class: 'name' }, name),
      );
      ol.appendChild(h('li', {}, btn));
    });
    this.chaptersNav.appendChild(ol);
    this.chapterTabs.moveTo(ol.querySelector<HTMLElement>('[aria-current="step"]'));
  }

  async openBeat(id: string, step: number): Promise<void> {
    const beat = this.content.beats.find((b) => b.id === id);
    if (!beat || !beat.built) return;
    this.beat = beat;
    saveProgress({ beat: id });
    this.renderChapters();
    this.module = null;
    clear(this.body);
    this.body.appendChild(h('p', {}, t('ui.loading')));
    const loader = MODULES[beat.module];
    this.module = loader ? await loader() : { scenes: {} };
    this.stepIndex = Math.max(0, Math.min(beat.steps.length - 1, step));
    this.renderStep(true);
  }

  private go(i: number): void {
    // Teacher mode can move on without answering.
    if (i > this.stepIndex && !this.done && !getSettings().teacherMode) return;
    if (i >= this.beat.steps.length) {
      // Past the last step: open the next built chapter.
      const next = this.nextBeat();
      if (next) void this.openBeat(next.id, 0);
      return;
    }
    if (i < 0) return;
    playSfx('SFX-01');
    this.stepIndex = i;
    saveProgress({ step: { ...progress().step, [this.beat.id]: i } });
    this.renderStep(true);
  }

  private resolveTask(step: Step): Task | undefined {
    if (step.type !== 'task') return undefined;
    const base = this.content.tasks[step.task];
    if (base?.goFurther && getSettings().goFurther) return this.content.tasks[base.goFurther] ?? base;
    return base;
  }

  /** Which parts of the workspace a step needs. */
  private layoutFor(step: Step, task?: Task): { stage: boolean; counts: boolean } {
    if (step.type === 'explain') return { stage: true, counts: COUNT_SCENES.includes(step.scene) };
    if (step.type === 'task' && task && (task.kind === 'count' || task.kind === 'pair' || task.kind === 'divide')) return { stage: true, counts: true };
    return { stage: false, counts: false };
  }

  private phaseOf(step: Step, task?: Task): PhaseLabel {
    if (step.type === 'retrieve') return 'retrieve';
    if (step.type === 'task' && task) return task.phase as PhaseLabel;
    if (step.type === 'intro' || step.type === 'summary') return 'checkpoint';
    return 'explain';
  }

  /** Build the current step. focus: move focus to the step title (navigation). */
  private renderStep(focus: boolean): void {
    this.stopRead();
    closeGlossary();
    this.view?.dispose();
    this.view = null;
    this.stage.reset();
    clear(this.overlay);
    clear(this.body);
    this.captions.clearLines();
    this.counts.set({ chromosomes: null, dnaMolecules: null, same: null });
    this.readables = [];
    this.done = false;

    const beat = this.beat;
    const step = beat.steps[this.stepIndex];
    const task = this.resolveTask(step);
    const phase = this.phaseOf(step, task);
    // Show the model area and count strip only on steps that use them.
    const layout = this.layoutFor(step, task);
    this.workspace.classList.toggle('no-stage', !layout.stage);
    this.workspace.classList.toggle('no-counts', !layout.counts);
    // Short reading steps: the panel shrinks to its text instead of filling the column.
    this.workspace.classList.toggle('fit-panel', layout.stage && (step.type === 'explain' || step.type === 'intro' || step.type === 'summary'));
    const memoKey = `${step.id}:${task?.id ?? ''}`;
    let memo = this.memos.get(memoKey);
    if (!memo) this.memos.set(memoKey, (memo = {}));

    // Header: phase badge, Go further badge, dev tags, step dots.
    clear(this.badges);
    this.badges.appendChild(h('span', { class: 'badge' }, t(`ui.phase.${phase}`)));
    if (task?.isGoFurther) this.badges.appendChild(h('span', { class: 'badge' }, `★ ${t('ui.phase.goFurther')}`));
    // Task IDs, standards and draft labels: Teacher mode only.
    if (getSettings().teacherMode) {
      const id = task?.id ?? step.id;
      this.badges.appendChild(h('span', { class: 'badge draft', title: t('settings.teacher') }, `${id} · ${task?.standard ?? beat.standard}${task?.status === 'draft' ? ' · draft' : ''}`));
    }
    clear(this.dots);
    this.dots.setAttribute('aria-label', t('ui.stepOf', { n: this.stepIndex + 1, total: beat.steps.length }));
    beat.steps.forEach((_, i) => {
      this.dots.appendChild(h('span', { class: `dot${i < this.stepIndex ? ' done' : ''}${i === this.stepIndex ? ' current' : ''}` }));
    });

    let titleKey: string;
    if (step.type === 'retrieve') titleKey = 'ui.retrieve.title';
    else if (step.type === 'explain' || step.type === 'intro' || step.type === 'summary') titleKey = step.title;
    else titleKey = `ui.phase.${phase}`;
    this.stepTitle.textContent = t(titleKey);

    const ctx: StepContext = {
      content: this.content,
      beat,
      step,
      task,
      stage: this.stage,
      counts: this.counts,
      captions: this.captions,
      body: this.body,
      overlay: this.overlay,
      memo,
      setReadables: (items) => (this.readables = items),
      getReadables: () => [...this.readables],
      autoRead: () => {
        if (getSettings().readAloud && focus) void this.read();
      },
      setDone: (d) => this.setDone(d),
      next: () => this.go(this.stepIndex + 1),
    };

    this.setDone(false);
    if (step.type === 'retrieve') {
      this.view = retrieveStep(ctx, step.tasks, this.content);
    } else if (step.type === 'task' && task) {
      if (task.kind === 'count') this.view = countTask(ctx, task, this.content);
      else if (task.kind === 'pair') this.view = pairTask(ctx, task, this.content);
      else if (task.kind === 'choice') this.view = choiceTask(ctx, task, this.content);
      else if (task.kind === 'predict') this.view = predictTask(ctx, task);
      else if (task.kind === 'divide') this.view = divideTask(ctx, task, this.content);
    } else if (step.type === 'explain') {
      const items = step.body.map((k) => paragraph(k));
      items.forEach((it) => this.body.appendChild(it.el));
      // Narration must stay available when captions are off.
      if (!getSettings().captions) {
        for (const vo of step.lines) {
          const p = paragraph(voKey(vo));
          p.el.style.fontStyle = 'italic';
          this.body.appendChild(p.el);
          items.push(p);
        }
      }
      ctx.setReadables(items);
      const factory = this.module?.scenes[step.scene];
      this.view = factory ? factory(ctx) : null;
      if (!this.captions.lineKeys().length) this.captions.setLines(step.lines, { autoplay: focus && getSettings().readAloud });
      this.setDone(true);
    } else if (step.type === 'intro' || step.type === 'summary') {
      const items = step.body.map((k) => paragraph(k));
      items.forEach((it) => this.body.appendChild(it.el));
      if (step.type === 'summary') {
        const ids = beat.steps.flatMap((s) => (s.type === 'task' ? [this.resolveTask(s)!] : [])).filter((tk) => tk.phase === 'checkpoint');
        const n = ids.filter((tk) => progress().results[tk.id]?.firstTryCorrect).length;
        const score = paragraph('ui.summary.score', { n, total: ids.length });
        score.el.style.fontWeight = '700';
        this.body.appendChild(h('div', { class: 'card' }, score.el));
        items.push(score);
      }
      ctx.setReadables(items);
      this.setDone(true);
      ctx.autoRead();
    }

    this.backBtn.disabled = this.stepIndex === 0;
    this.stage.invalidate();
    if (focus) this.stepTitle.focus({ preventScroll: true });
  }

  /** The next chapter after this one that is built, if any. */
  private nextBeat(): Beat | undefined {
    const i = this.content.beats.findIndex((b) => b.id === this.beat.id);
    return this.content.beats.slice(i + 1).find((b) => b.built);
  }

  private setDone(d: boolean): void {
    this.done = d;
    const last = this.stepIndex >= this.beat.steps.length - 1;
    const next = last ? this.nextBeat() : undefined;
    this.nextBtn.disabled = (!d && !getSettings().teacherMode) || (last && !next);
    this.nextBtn.replaceChildren(t(last && next ? 'ui.nextChapter' : 'ui.next'), h('span', { class: 'ico flip', 'aria-hidden': 'true' }, '→'));
  }

  private setReadBtn(): void {
    const label = this.reading ? t('ui.cap.stop') : t('ui.readPanel');
    this.readBtn.setAttribute('aria-label', label);
    this.readBtn.title = label;
    this.readBtn.replaceChildren(h('span', { class: 'ico', 'aria-hidden': 'true' }, this.reading ? '■' : '🔊'));
    this.readBtn.classList.add('icon');
  }

  private async read(): Promise<void> {
    if (!this.readables.length) return;
    this.captions.stop();
    this.reading = true;
    this.setReadBtn();
    await readAloud(this.readables);
    this.reading = false;
    this.setReadBtn();
  }

  private stopRead(): void {
    if (this.reading) stopReading();
    this.captions.stop();
    this.reading = false;
    this.setReadBtn();
  }

  private toggleRead(): void {
    if (this.reading) this.stopRead();
    else void this.read();
  }
}
