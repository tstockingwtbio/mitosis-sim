import * as THREE from 'three';
import type { CellSpec } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { countCell, type Counts } from '../model/chromosome';
import { ChromosomeView, pairColor } from './chromosomeView';
import { PALETTE, ellipseShape, paper, roundRectShape } from './paper';
import type { Stage } from './stage';

export interface CellSceneOptions {
  /** 'cell': chromosomes inside a cell outline. 'tray': sorting tray for pairing. */
  layout: 'cell' | 'tray';
  /** Number of pair slots on the tray. */
  slots?: number;
}

/** Legend that explains solid vs striped paper (meaning never by colour alone). */
export function legend(pair = 1): HTMLElement {
  const color = pairColor(pair);
  return h(
    'div',
    { class: 'legend', 'aria-hidden': 'true' },
    h('div', {}, h('span', { class: 'swatch', style: { background: color } }), t('model.legend.M')),
    h('div', {}, h('span', { class: 'swatch striped' }), t('model.legend.P')),
  );
}

export class CellScene {
  readonly views: ChromosomeView[] = [];
  readonly root = new THREE.Group();
  readonly slotCenters: THREE.Vector2[] = [];
  private legendEl: HTMLElement;

  constructor(private stage: Stage, cell: CellSpec, opts: CellSceneOptions) {
    stage.scene.add(this.root);
    if (opts.layout === 'cell') {
      const membrane = paper(ellipseShape(4.8, 3.4, 0, 0.2), { color: PALETTE.cream, outline: 0.1 });
      membrane.position.z = -0.5;
      this.root.add(membrane);
    } else {
      const n = opts.slots ?? 2;
      const spacing = Math.min(3.2, (stage.viewWidth - 1.5) / n);
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * spacing;
        const slot = paper(roundRectShape(spacing - 0.4, 3.4, 0.3), { color: '#efe2c4', outline: 0.05, shadow: false });
        slot.position.set(x, -2.2, -0.5);
        this.root.add(slot);
        this.slotCenters.push(new THREE.Vector2(x, -2.2));
      }
    }
    for (const spec of cell.chromosomes) {
      const v = new ChromosomeView({ ...spec });
      this.views.push(v);
      this.root.add(v.group);
    }
    this.legendEl = legend();
    stage.el.appendChild(this.legendEl);
    stage.invalidate();
  }

  counts(): Counts {
    return countCell({
      chromosomes: this.views.map((v) => ({ ...v.spec, state: v.replicated ? 'replicated' : 'unreplicated' })),
    });
  }

  find(id: string): ChromosomeView | undefined {
    return this.views.find((v) => v.spec.id === id);
  }

  clearTags(): void {
    this.views.forEach((v) => v.clearTags());
    this.stage.invalidate();
  }

  /** Number every centromere 1..n, in reading order. */
  tagCentromeres(): void {
    this.clearTags();
    this.ordered().forEach((v, i) => v.tagCentromere(i + 1));
    this.stage.invalidate();
  }

  /** Number every chromatid 1..n. */
  tagChromatids(): void {
    this.clearTags();
    let n = 1;
    for (const v of this.ordered()) n = v.tagChromatids(n);
    this.stage.invalidate();
  }

  /** Left to right (mirrored in right-to-left layouts so numbers read naturally). */
  private ordered(): ChromosomeView[] {
    const rtl = document.documentElement.dir === 'rtl';
    return [...this.views].sort((a, b) => (rtl ? b.group.position.x - a.group.position.x : a.group.position.x - b.group.position.x));
  }

  /** Slide a chromosome to a new spot (paper sliding on a desk). */
  slide(view: ChromosomeView, x: number, y: number, angle: number, instant: boolean): Promise<void> {
    const g = view.group;
    const from = { x: g.position.x, y: g.position.y, a: g.rotation.z };
    const to = { x, y, a: THREE.MathUtils.degToRad(angle) };
    if (instant) {
      g.position.set(x, y, 0);
      g.rotation.z = to.a;
      this.stage.invalidate();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let p = 0;
      g.position.z = 0.3;
      this.stage.addTick((dt) => {
        p = Math.min(1, p + dt / 0.35);
        const e = 1 - Math.pow(1 - p, 3);
        g.position.x = from.x + (to.x - from.x) * e;
        g.position.y = from.y + (to.y - from.y) * e;
        g.rotation.z = from.a + (to.a - from.a) * e;
        if (p >= 1) {
          g.position.z = 0;
          resolve();
          return false;
        }
        return true;
      });
    });
  }

  dispose(): void {
    this.views.forEach((v) => v.dispose());
    this.legendEl.remove();
  }
}
