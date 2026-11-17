import * as THREE from 'three';
import type { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { ChromSpec, LengthClass } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { PALETTE, basic, circleShape, paper, setOpacity } from './paper';
import { label } from './stage';

export const LENGTHS: Record<LengthClass, number> = { long: 2.6, medium: 2.0, short: 1.4 };
export const WIDTH = 0.4;
const SPLAY = THREE.MathUtils.degToRad(15);
const PAIR_COLORS = [PALETTE.teal, PALETTE.orange, PALETTE.moss, PALETTE.blue];

export function pairColor(pair: number): string {
  return PAIR_COLORS[(pair - 1) % PAIR_COLORS.length];
}

/**
 * Light band pattern (fraction from the bottom, band height). Partners share a
 * pattern and non-partners differ, as in a real stained karyotype, which gives
 * a second clue for pairing besides length and gene letters.
 */
const BANDS: Record<number, [number, number][]> = {
  1: [[0.09, 0.05], [0.18, 0.04], [0.45, 0.07], [0.9, 0.05]],
  2: [[0.13, 0.07], [0.5, 0.04], [0.86, 0.05]],
  3: [[0.12, 0.05], [0.42, 0.08], [0.92, 0.04]],
  4: [[0.2, 0.05], [0.5, 0.05]],
};

/** One chromatid: a rounded rod pinched in at the centromere. */
function chromatidShape(length: number, width: number, centromereY: number): THREE.Shape {
  const hw = width / 2;
  const top = length / 2;
  const bot = -length / 2;
  const pinch = hw * 0.3;
  const reach = Math.min(0.26, length * 0.11);
  const s = new THREE.Shape();
  s.moveTo(0, bot);
  s.absarc(0, bot + hw, hw, -Math.PI / 2, 0, false);
  s.lineTo(hw, centromereY - reach);
  s.quadraticCurveTo(hw, centromereY - reach * 0.25, pinch, centromereY);
  s.quadraticCurveTo(hw, centromereY + reach * 0.25, hw, centromereY + reach);
  s.lineTo(hw, top - hw);
  s.absarc(0, top - hw, hw, 0, Math.PI, false);
  s.lineTo(-hw, centromereY + reach);
  s.quadraticCurveTo(-hw, centromereY + reach * 0.25, -pinch, centromereY);
  s.quadraticCurveTo(-hw, centromereY - reach * 0.25, -hw, centromereY - reach);
  s.lineTo(-hw, bot + hw);
  s.absarc(0, bot + hw, hw, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Allele positions along the chromosome, as a fraction from the bottom. */
function allelePositions(n: number): number[] {
  if (n === 1) return [0.3];
  if (n === 2) return [0.78, 0.28];
  return Array.from({ length: n }, (_, i) => 0.85 - (0.7 * i) / (n - 1));
}

/**
 * One chromosome as cut paper. Maternal: solid. Paternal: striped. Each has
 * an M or P tab; allele letters sit on paper tabs. Replication grows a
 * second chromatid joined at the centromere (the X).
 */
export class ChromosomeView {
  readonly group = new THREE.Group();
  readonly length: number;
  readonly centromereY: number;
  private chromatidA = new THREE.Group();
  private chromatidB = new THREE.Group();
  private centromere: THREE.Mesh;
  private tags: CSS2DObject[] = [];
  private markers: THREE.Object3D[] = [];
  private replication = 0;
  hit: HTMLButtonElement | null = null;
  private hitObj: CSS2DObject | null = null;

  constructor(public spec: ChromSpec) {
    this.length = LENGTHS[spec.length];
    this.centromereY = this.length * 0.12;
    const color = pairColor(spec.pair);
    const striped = spec.parent === 'P';
    for (const c of [this.chromatidA, this.chromatidB]) {
      const piece = paper(chromatidShape(this.length, WIDTH, this.centromereY), { color, striped, outline: 0.07 });
      c.add(piece);
      // Band pattern shared by partners: light paper inlays.
      for (const [f, hgt] of BANDS[((spec.pair - 1) % 4) + 1]) {
        const y = -this.length / 2 + f * this.length;
        const inlay = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH * 0.8, hgt), basic(PALETTE.cream, 0.55));
        inlay.position.set(0, y, 0.005);
        c.add(inlay);
      }
      // Gene bands: ink stripes across the chromatid.
      allelePositions(spec.alleles.length).forEach((f) => {
        const y = -this.length / 2 + f * this.length;
        const band = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH * 0.92, 0.07), basic(PALETTE.ink));
        band.position.set(0, y, 0.006);
        c.add(band);
      });
      // Rotate about the centromere.
      c.position.set(0, 0, 0);
      this.group.add(c);
    }
    // Pivot: chromatids rotate about (0, centromereY).
    this.chromatidA.children.forEach((ch) => (ch.position.y -= this.centromereY));
    this.chromatidB.children.forEach((ch) => (ch.position.y -= this.centromereY));
    this.chromatidA.position.y = this.centromereY;
    this.chromatidB.position.y = this.centromereY;
    this.chromatidB.position.z = -0.01;

    this.centromere = new THREE.Mesh(new THREE.ShapeGeometry(circleShape(0.11), 16), basic(PALETTE.ink));
    this.centromere.position.set(0, this.centromereY, 0.02);
    this.group.add(this.centromere);

    // Parent tab at the top end, allele tabs beside the bands.
    const parentTab = label(
      h('div', { class: 'chrom-tab parent', 'aria-hidden': 'true' }, t(`model.parent.${spec.parent}`)),
      { x: 0, y: this.length / 2 + 0.28 - this.centromereY, z: 0.03 },
    );
    this.chromatidA.add(parentTab);
    allelePositions(spec.alleles.length).forEach((f, i) => {
      const y = -this.length / 2 + f * this.length - this.centromereY;
      const tab = label(h('div', { class: 'chrom-tab', 'aria-hidden': 'true' }, spec.alleles[i]), { x: -WIDTH / 2 - 0.32, y, z: 0.03 });
      this.chromatidA.add(tab);
    });

    this.group.position.set(spec.x ?? 0, spec.y ?? 0, 0);
    this.group.rotation.z = THREE.MathUtils.degToRad(spec.angle ?? 0);
    this.setReplication(spec.state === 'replicated' ? 1 : 0);
  }

  /** 0 = single rod, 1 = full X. */
  setReplication(r: number): void {
    this.replication = r;
    this.chromatidA.rotation.z = SPLAY * r;
    this.chromatidB.rotation.z = -SPLAY * r;
    this.chromatidB.visible = r > 0;
    setOpacity(this.chromatidB, Math.min(1, r * 1.6));
  }

  get replicated(): boolean {
    return this.replication >= 1;
  }

  centromereWorld(): THREE.Vector3 {
    return this.centromere.getWorldPosition(new THREE.Vector3());
  }

  /** Centres of the visible chromatids (for numbering DNA molecules). */
  chromatidMarkers(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    // Near the lower tip of each chromatid, pushed outward so tags on an X don't overlap.
    const list = this.replicated ? [this.chromatidA, this.chromatidB] : [this.chromatidA];
    for (const c of list) {
      const m = new THREE.Object3D();
      const side = !this.replicated ? 0.45 : c === this.chromatidA ? 0.42 : -0.42;
      m.position.set(side, -this.length / 2 - this.centromereY + 0.25, 0.05);
      c.add(m);
      out.push(m);
    }
    return out;
  }

  /** Put a numbered tag at the centromere. */
  tagCentromere(n: number): void {
    const tag = label(h('div', { class: 'count-tag', 'aria-hidden': 'true' }, String(n)), { x: 0.34, y: this.centromereY + 0.3, z: 0.05 });
    this.group.add(tag);
    this.tags.push(tag);
  }

  /** Number each chromatid, starting at `from`. Returns the next number. */
  tagChromatids(from: number): number {
    let n = from;
    for (const m of this.chromatidMarkers()) {
      const tag = label(h('div', { class: 'count-tag', 'aria-hidden': 'true', style: { background: PALETTE.blue } }, String(n++)));
      m.add(tag);
      this.tags.push(tag);
      this.markers.push(m);
    }
    return n;
  }

  clearTags(): void {
    for (const tag of this.tags) {
      tag.element.remove();
      tag.removeFromParent();
    }
    this.tags = [];
    for (const m of this.markers) m.removeFromParent();
    this.markers = [];
  }

  /** Accessible description, equal to what a sighted student can see. */
  describe(): string {
    const s = this.spec;
    return t('model.aria.chrom', {
      length: t(`model.aria.${s.length}`),
      parent: t(s.parent === 'M' ? 'model.aria.mother' : 'model.aria.father'),
      state: t(this.replicated ? 'model.aria.replicated' : 'model.aria.unreplicated'),
      alleles: s.alleles.join(', '),
    });
  }

  /** A real button over the chromosome, for click and keyboard selection. */
  makeHit(onClick: () => void, unitsPerPx: number): HTMLButtonElement {
    const btn = h('button', { class: 'hit', type: 'button', 'aria-pressed': 'false', onclick: onClick });
    this.hit = btn;
    this.hitObj = label(btn, { x: 0, y: 0, z: 0.1 });
    this.group.add(this.hitObj);
    this.sizeHit(unitsPerPx);
    this.updateHitLabel();
    return btn;
  }

  sizeHit(unitsPerPx: number): void {
    if (!this.hit) return;
    const a = this.group.rotation.z;
    const spread = this.replicated ? this.length * Math.sin(SPLAY) + WIDTH : WIDTH;
    const w = Math.abs(this.length * Math.sin(a)) + Math.abs(spread * Math.cos(a)) + 0.5;
    const hh = Math.abs(this.length * Math.cos(a)) + Math.abs(spread * Math.sin(a)) + 0.5;
    this.hit.style.width = `${Math.max(44, w / unitsPerPx)}px`;
    this.hit.style.height = `${Math.max(44, hh / unitsPerPx)}px`;
  }

  updateHitLabel(extra?: string): void {
    if (!this.hit) return;
    this.hit.setAttribute('aria-label', extra ? `${this.describe()}, ${extra}` : this.describe());
  }

  dispose(): void {
    this.clearTags();
    this.hitObj?.element.remove();
  }
}
