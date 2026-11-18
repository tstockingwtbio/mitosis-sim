import { clear, h } from '../dom';
import { LANGUAGES, getDict, t } from '../../i18n';
import { getSettings, resetSettings, updateSettings, type Settings } from '../settings';
import { resetProgress } from '../progress';
import { storageAvailable } from '../storage';
import { speechSupported } from '../speech';

type Bool = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

let uid = 0;
const id = (p: string) => `${p}-${++uid}`;

function toggle(key: Bool, label: string, desc?: string): HTMLElement {
  const s = getSettings();
  const inputId = id('sw');
  const state = h('span', {}, s[key] ? t('settings.on') : t('settings.off'));
  const input = h('input', {
    type: 'checkbox',
    id: inputId,
    role: 'switch',
    checked: s[key],
    onchange: (e: Event) => {
      const v = (e.target as HTMLInputElement).checked;
      state.textContent = v ? t('settings.on') : t('settings.off');
      updateSettings({ [key]: v } as Partial<Settings>);
    },
  }) as HTMLInputElement;
  const descId = desc ? id('desc') : undefined;
  if (descId) input.setAttribute('aria-describedby', descId);
  return h(
    'div',
    { class: 'setting' },
    h('label', { class: 'switch', for: inputId }, h('span', {}, label), input, h('span', { class: 'track', 'aria-hidden': 'true' }, h('span', { class: 'knob' }), state)),
    desc ? h('span', { class: 'desc', id: descId }, desc) : null,
  );
}

function radios<K extends keyof Settings>(key: K, legend: string, options: [Settings[K], string, string?][], stack = false): HTMLElement {
  const s = getSettings();
  const name = id(`r-${String(key)}`);
  return h(
    'fieldset',
    { class: 'seg' },
    h('legend', {}, legend),
    h(
      'div',
      { class: `seg-options${stack ? ' stack' : ''}` },
      options.map(([value, label, lang]) =>
        h(
          'label',
          { class: 'seg-option', lang },
          h('input', {
            type: 'radio',
            name,
            value: String(value),
            checked: s[key] === value,
            onchange: () => updateSettings({ [key]: value } as Partial<Settings>),
          }),
          h('span', { dir: 'auto' }, label),
        ),
      ),
    ),
  );
}

function section(title: string, ...children: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'settings-section' }, h('h3', {}, title), ...children);
}

export class SettingsMenu {
  readonly dialog: HTMLDialogElement;
  private body: HTMLElement;
  private heading: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private page: 'main' | 'language' = 'main';
  private opener: HTMLElement | null = null;

  constructor() {
    this.heading = h('h2', { id: 'settings-title' });
    this.closeBtn = h('button', { class: 'btn', type: 'button', onclick: () => this.close() });
    this.body = h('div', { class: 'settings-body' });
    this.dialog = h(
      'dialog',
      { class: 'settings', 'aria-labelledby': 'settings-title' },
      h('div', { class: 'settings-inner' }, h('div', { class: 'settings-head' }, this.heading, this.closeBtn), this.body),
    ) as HTMLDialogElement;
    this.dialog.addEventListener('close', () => this.opener?.focus());
    this.dialog.addEventListener('click', (e) => {
      if (e.target === this.dialog) this.close();
    });
  }

  open(opener?: HTMLElement): void {
    this.opener = opener ?? null;
    this.page = 'main';
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
    this.closeBtn.focus();
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }

  isOpen(): boolean {
    return this.dialog.open;
  }

  /** Re-render in place (after a language change) and keep focus nearby. */
  refresh(): void {
    if (!this.dialog.open) return;
    const active = document.activeElement as HTMLElement | null;
    const marker = active?.closest('[data-focus-key]')?.getAttribute('data-focus-key');
    const scroll = this.body.scrollTop;
    this.render();
    this.body.scrollTop = scroll;
    let again: HTMLElement | null = null;
    if (marker) {
      for (const sel of ["input:checked", "input", "button"]) {
        again = this.body.querySelector<HTMLElement>(`[data-focus-key="${marker}"] ${sel}`);
        if (again) break;
      }
    }
    (again ?? this.closeBtn).focus();
  }

  private render(): void {
    this.closeBtn.textContent = t('ui.close');
    clear(this.body);
    if (this.page === 'language') return this.renderLanguage();
    this.heading.textContent = t('settings.title');
    this.body.className = 'settings-body';
    const s = getSettings();

    const langName = LANGUAGES.find((l) => l.code === s.lang)?.label ?? 'English';
    const langBtn = h(
      'button',
      { class: 'btn', type: 'button', onclick: () => this.showLanguage() },
      h('span', { dir: 'auto' }, `${t('settings.language')}: ${langName}`),
      h('span', { class: 'ico flip', 'aria-hidden': 'true' }, '›'),
    );

    const reading = section(
      t('settings.sec.reading'),
      speechSupported() ? toggle('readAloud', t('settings.readAloud'), t('settings.readAloud.desc')) : null,
      speechSupported()
        ? radios('speechRate', t('settings.speed'), [
            [0.75, t('settings.speed.slow')],
            [1, t('settings.speed.normal')],
            [1.25, t('settings.speed.fast')],
          ])
        : null,
      toggle('highlightWords', t('settings.highlight')),
      radios('textSize', t('settings.textSize'), [
        ['100', t('settings.textSize.100')],
        ['125', t('settings.textSize.125')],
        ['150', t('settings.textSize.150')],
      ]),
    );

    const language = section(t('settings.sec.language'), h('div', { 'data-focus-key': 'lang-open' }, langBtn));

    const help = section(
      t('settings.sec.help'),
      toggle('hints', t('settings.hints'), t('settings.hints.desc')),
      radios('worked', t('settings.worked'), [
        ['all', t('settings.worked.all')],
        ['fade', t('settings.worked.fade')],
      ], true),
      radios('frames', t('settings.frames'), [
        ['off', t('settings.frames.off')],
        ['frames', t('settings.frames.frames')],
        ['bank', t('settings.frames.bank')],
      ], true),
      toggle('fewerChoices', t('settings.fewer')),
    );

    const challenge = section(t('settings.sec.challenge'), toggle('goFurther', t('settings.goFurther'), t('settings.goFurther.desc')));

    const display = section(
      t('settings.sec.display'),
      toggle('highContrast', t('settings.contrast')),
      toggle('reducedMotion', t('settings.motion'), t('settings.motion.desc')),
      toggle('largeButtons', t('settings.bigButtons')),
      toggle('sfx', t('settings.sfx')),
      toggle('ambience', t('settings.ambience')),
      toggle('captions', t('settings.captions')),
    );

    const status = h('p', { role: 'status' });
    const confirmRow = h('div', { class: 'seg-options', hidden: true });
    const resetBtn = h('button', {
      class: 'btn',
      type: 'button',
      onclick: () => {
        confirmRow.hidden = false;
        resetBtn.hidden = true;
        (confirmRow.querySelector('button') as HTMLButtonElement).focus();
      },
    }, t('settings.reset'));
    confirmRow.append(
      h('p', { style: { margin: '0', flexBasis: '100%' } }, t('settings.reset.confirm')),
      h('button', {
        class: 'btn primary',
        type: 'button',
        onclick: () => {
          resetProgress();
          resetSettings();
          window.dispatchEvent(new CustomEvent('mm:reset'));
          this.render();
          const st = this.body.querySelector('[role="status"]');
          if (st) st.textContent = t('settings.reset.done');
          this.closeBtn.focus();
        },
      }, t('settings.reset')),
      h('button', {
        class: 'btn',
        type: 'button',
        onclick: () => {
          confirmRow.hidden = true;
          resetBtn.hidden = false;
          resetBtn.focus();
        },
      }, t('ui.back')),
    );
    const progressSec = section(
      t('settings.sec.progress'),
      h('p', { style: { margin: '0' } }, t('settings.progress.desc')),
      storageAvailable() ? null : h('p', { class: 'note' }, t('settings.progress.blocked')),
      resetBtn,
      confirmRow,
      status,
    );

    const teacher = section(t('settings.sec.teacher'), toggle('teacherMode', t('settings.teacher'), t('settings.teacher.desc')));
    this.body.append(reading, language, help, challenge, display, progressSec, teacher);
  }

  private showLanguage(): void {
    this.page = 'language';
    this.render();
    this.body.querySelector<HTMLElement>('button')?.focus();
  }

  private renderLanguage(): void {
    this.heading.textContent = t('settings.sec.language');
    this.body.className = 'settings-body single';
    const s = getSettings();
    const back = h(
      'button',
      {
        class: 'btn',
        type: 'button',
        onclick: () => {
          this.page = 'main';
          this.render();
          this.body.querySelector<HTMLElement>('[data-focus-key="lang-open"] button')?.focus();
        },
      },
      h('span', { class: 'ico flip', 'aria-hidden': 'true' }, '‹'),
      t('settings.back'),
    );
    const translated = Object.keys(getDict(s.lang)).filter((k) => k !== '_meta').length > 0;
    const langList = h('div', { 'data-focus-key': 'lang-list' },
      radios('lang', t('settings.language.choose'), LANGUAGES.map((l) => [l.code, l.label, l.code] as [string, string, string]), true),
    );
    const level = h('div', { 'data-focus-key': 'lang-level' },
      radios('level', t('settings.level'), [
        ['beginning', t('settings.level.beginning')],
        ['building', t('settings.level.building')],
        ['english', t('settings.level.english')],
      ], true),
    );
    this.body.append(
      h('div', {}, back),
      section(
        t('settings.sec.language'),
        langList,
        s.lang !== 'en' && !translated ? h('p', { class: 'note', role: 'note' }, t('settings.language.missing')) : null,
        level,
        h('div', { 'data-focus-key': 'lang-side' }, toggle('sideBySide', t('settings.sideBySide'))),
        h('div', { 'data-focus-key': 'lang-gloss' }, toggle('glossary', t('settings.glossary'))),
      ),
    );
  }
}
