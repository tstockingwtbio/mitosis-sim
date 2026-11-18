// DNA profiles as a paper gel (B0, B5). One lane per sample; each marker is
// a band of rows across the gel, and each sample shows two bands per marker
// (one from each parent). Bands are code-drawn so students can line them up.
import * as THREE from 'three';
import type { Profile } from '../../content/schema';
import { h } from '../dom';
import { t } from '../../i18n';
import { PALETTE, basic, paper, roundRectShape } from './paper';
import { label, type Stage } from './stage';

const SLOTS = 5;
const STEP = 0.19;
const MARKER_GAP = 0.14;
const TOP = 2.85;
const LANE_W = 1.15;

export interface Lane {
  id: string;
  /** i18n key for the lane name. */
  label: string;
}

/** Height of a band on the gel: bigger pieces of DNA stay nearer the top. */
export function bandY(marker: number, size: number): number {
  return TOP - marker * (SLOTS * STEP + MARKER_GAP) - (size - 0.5) * STEP;
}

export function markerCount(p: Profile): number {
  return p.length;
}

export class Gel {
  readonly root = new THREE.Group();
  private laneGroups = new Map<string, THREE.Group>();
  private marks = new Map<string, THREE.Object3D[]>();
  private lanes: Lane[] = [];
  private markers: number;

  constructor(
    private stage: Stage,
    private profiles: Record<string, Profile>,
    lanes: Lane[],
  ) {
    stage.scene.add(this.root);
    this.markers = Object.values(profiles)[0]?.length ?? 6;
    this.setLanes(lanes);
  }

  private spacing(n: number): number {
    return Math.min(2.1, (this.stage.viewWidth - 2.4) / Math.max(1, n));
  }

  laneX(id: string): number {
    const i = this.lanes.findIndex((l) => l.id === id);
    const n = this.lanes.length;
    return (i - (n - 1) / 2) * this.spacing(n) + 0.4;
  }

  /** Show these lanes, left to right (existing lanes slide to their new spot). */
  setLanes(lanes: Lane[]): void {
    this.lanes = lanes;
    for (const [id, g] of this.laneGroups) {
      if (lanes.some((l) => l.id === id)) continue;
      g.traverse((o) => (o as { element?: HTMLElement }).element?.remove());
      g.removeFromParent();
      this.laneGroups.delete(id);
    }
    this.drawGuides();
    for (const lane of lanes) {
      let g = this.laneGroups.get(lane.id);
      if (!g) {
        g = this.buildLane(lane);
        this.laneGroups.set(lane.id, g);
        this.root.add(g);
      }
      g.position.x = this.laneX(lane.id);
    }
    this.stage.invalidate();
  }

  private guides: THREE.Group | null = null;

  /** Faint marker rows across the gel, numbered on the left. */
  private drawGuides(): void {
    if (this.guides) {
      this.guides.traverse((o) => (o as { element?: HTMLElement }).element?.remove());
      this.guides.removeFromParent();
    }
    const g = new THREE.Group();
    const n = this.lanes.length;
    const span = n * this.spacing(n) + 0.4;
    const x0 = (this.lanes.length ? this.laneX(this.lanes[0].id) : 0) - this.spacing(n) / 2;
    for (let m = 0; m < this.markers; m++) {
      const top = bandY(m, 0.5) + STEP / 2;
      const hgt = SLOTS * STEP;
      const row = new THREE.Mesh(new THREE.PlaneGeometry(span, hgt), basic(m % 2 ? '#e9dcc0' : '#efe4cc'));
      row.position.set(x0 + span / 2 - 0.2, top - hgt / 2, -0.3);
      g.add(row);
      g.add(label(h('div', { class: 'gel-marker', 'aria-hidden': 'true' }, String(m + 1)), { x: x0 - 0.35, y: top - hgt / 2, z: 0.1 }));
    }
    g.add(label(h('div', { class: 'gel-marker head', 'aria-hidden': 'true' }, t('gel.marker')), { x: x0 - 0.35, y: TOP + 0.35, z: 0.1 }));
    this.root.add(g);
    this.guides = g;
  }

  private buildLane(lane: Lane): THREE.Group {
    const g = new THREE.Group();
    const bottom = bandY(this.markers - 1, SLOTS) - 0.2;
    const hgt = TOP + 0.15 - bottom;
    const strip = paper(roundRectShape(LANE_W, hgt, 0.12), { color: PALETTE.paper, outline: 0.04, shadow: false });
    strip.position.set(0, bottom + hgt / 2, -0.2);
    g.add(strip);
    const profile = this.profiles[lane.id] ?? [];
    profile.forEach((sizes, m) => {
      for (const size of new Set(sizes)) {
        const band = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W * 0.72, 0.1), basic(PALETTE.ink));
        band.position.set(0, bandY(m, size), 0.05);
        g.add(band);
      }
    });
    g.add(label(h('div', { class: 'stage-label gel-lane', 'aria-hidden': 'true' }, t(lane.label)), { x: 0, y: TOP + 0.55, z: 0.2 }));
    return g;
  }

  /** Mark (or unmark) one band in a lane. */
  mark(laneId: string, marker: number, size: number, on: boolean): void {
    const key = `${laneId}|${marker}|${size}`;
    const old = this.marks.get(key);
    if (old) {
      old.forEach((o) => {
        (o as { element?: HTMLElement }).element?.remove();
        o.removeFromParent();
      });
      this.marks.delete(key);
    }
    const g = this.laneGroups.get(laneId);
    if (!on || !g) return this.stage.invalidate();
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W * 0.95, 0.26), basic(PALETTE.orange));
    ring.position.set(0, bandY(marker, size), 0.02);
    const tick = label(h('div', { class: 'gel-tick', 'aria-hidden': 'true' }, '✓'), { x: LANE_W / 2 + 0.22, y: bandY(marker, size), z: 0.2 });
    g.add(ring, tick);
    this.marks.set(key, [ring, tick]);
    this.stage.invalidate();
  }

  clearMarks(): void {
    for (const key of [...this.marks.keys()]) {
      const [lane, m, s] = key.split('|');
      this.mark(lane, Number(m), Number(s), false);
    }
  }

  dispose(): void {
    this.root.traverse((o) => (o as { element?: HTMLElement }).element?.remove());
    this.root.removeFromParent();
  }
}

/** The same bands as a table, for screen readers and anyone who prefers text. */
export function gelTable(profiles: Record<string, Profile>, lanes: Lane[]): HTMLElement {
  const n = profiles[lanes[0]?.id]?.length ?? 0;
  const head = h('tr', {}, h('th', { scope: 'col' }, t('gel.marker')), ...lanes.map((l) => h('th', { scope: 'col' }, t(l.label))));
  const rows = Array.from({ length: n }, (_, m) =>
    h(
      'tr',
      {},
      h('th', { scope: 'row' }, String(m + 1)),
      ...lanes.map((l) => h('td', {}, [...new Set(profiles[l.id]?.[m] ?? [])].sort((a, b) => a - b).join(', '))),
    ),
  );
  return h(
    'details',
    { class: 'card gel-table' },
    h('summary', {}, t('gel.tableToggle')),
    h('p', { class: 'note' }, t('gel.tableNote')),
    h('table', {}, h('thead', {}, head), h('tbody', {}, rows)),
  );
}
