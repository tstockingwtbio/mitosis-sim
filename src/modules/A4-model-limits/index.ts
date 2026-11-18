// A4 — Model limits + checkpoint (SC.HS.6.1.d). A "where this model is wrong"
// card (VO-A14), then the unit checkpoint on unfamiliar cases, supports off.
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

/** The limits card: what the model shows, and what is really true. */
function limitsScene(ctx: StepContext): StepView {
  const rows = ['chromosomes', 'drag', 'labels', 'timing', 'genes', 'cycle'];
  const card = h(
    'div',
    { class: 'limits-card' },
    h('h3', {}, t('A4.limits.heading')),
    h(
      'table',
      {},
      h('thead', {}, h('tr', {}, h('th', {}, t('A4.limits.model')), h('th', {}, t('A4.limits.real')))),
      h(
        'tbody',
        {},
        rows.map((r) => h('tr', {}, h('td', {}, t(`A4.limits.${r}.model`)), h('td', {}, t(`A4.limits.${r}.real`)))),
      ),
    ),
  );
  ctx.stage.el.appendChild(card);
  return { dispose: () => card.remove() };
}

const module: BeatModule = { scenes: { limits: limitsScene } };
export default module;
export const scenes = module.scenes;
