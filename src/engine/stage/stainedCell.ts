import * as THREE from 'three';
import type { CyclePhase } from '../model/cycle';
import { basic, circleShape, ellipseShape, strokeGeometry } from './paper';

// A cell as it looks on a stained microscope slide: a pale cell with a
// purple-stained nucleus or chromosomes. Each phase is drawn from the same
// recipe in Three.js (the field) and in SVG (the reference cards).

export const STAIN = {
  cell: '#f6e7ef',
  edge: '#c79bb8',
  nucleus: '#8e4f9e',
  nucleusLight: '#c59bd0',
  chrom: '#4b1f5e',
  fibre: '#b98fc6',
  slide: '#fbf3f7',
};

/** Bits of chromosome (short thick strokes) in local cell units (radius 1). */
function bars(phase: CyclePhase, wobble: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  if (phase === 'metaphase') {
    for (let i = 0; i < 5; i++) {
      const y = -0.42 + i * 0.21;
      out.push([-0.12, y + 0.03, 0.12, y - 0.03]);
    }
  } else if (phase === 'anaphase') {
    for (let side of [-1, 1]) {
      for (let i = 0; i < 4; i++) {
        const y = -0.33 + i * 0.22;
        const x = side * (0.42 + wobble * 0.08);
        // V shapes: arms trail back toward the middle.
        out.push([x, y, x - side * 0.16, y - 0.07]);
        out.push([x, y, x - side * 0.16, y + 0.07]);
      }
    }
  } else if (phase === 'prophase') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + wobble;
      const r = 0.18 + (i % 2) * 0.12;
      out.push([Math.cos(a) * r, Math.sin(a) * r, Math.cos(a + 0.9) * (r + 0.1), Math.sin(a + 0.9) * (r + 0.1)]);
    }
  }
  return out;
}

export function stainedCell(phase: CyclePhase, angle: number, wobble: number, size = 1): THREE.Group {
  const g = new THREE.Group();
  const s = size / 2;
  const stretch = phase === 'anaphase' ? 1.25 : phase === 'telophase' ? 1.4 : 1;
  // The cell.
  if (phase === 'telophase') {
    // Pinching in two: two overlapping lobes.
    for (const side of [-1, 1]) {
      const lobe = new THREE.Mesh(new THREE.ShapeGeometry(ellipseShape(s * 0.62, s * 0.78, side * s * 0.5, 0), 24), basic(STAIN.cell));
      g.add(lobe);
      const edge = new THREE.Mesh(strokeGeometry(ellipseShape(s * 0.62, s * 0.78, side * s * 0.5, 0).getPoints(32), 0.03), basic(STAIN.edge));
      edge.position.z = 0.002;
      g.add(edge);
    }
  } else {
    const shape = ellipseShape(s * 0.9 * stretch, s * (0.86 + wobble * 0.08));
    g.add(new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), basic(STAIN.cell)));
    const edge = new THREE.Mesh(strokeGeometry(shape.getPoints(36), 0.03), basic(STAIN.edge));
    edge.position.z = 0.002;
    g.add(edge);
  }
  const z = 0.01;
  if (phase === 'interphase' || phase === 'prophase') {
    const nuc = new THREE.Mesh(new THREE.ShapeGeometry(circleShape(s * (phase === 'prophase' ? 0.5 : 0.42)), 24), basic(phase === 'prophase' ? STAIN.nucleusLight : STAIN.nucleus));
    nuc.position.z = z;
    g.add(nuc);
    if (phase === 'interphase') {
      // Nucleolus: one or two dark dots.
      const dot = new THREE.Mesh(new THREE.ShapeGeometry(circleShape(s * 0.1, s * 0.1, s * 0.05), 12), basic(STAIN.chrom));
      dot.position.z = z + 0.001;
      g.add(dot);
    }
  }
  if (phase === 'metaphase') {
    // Faint spindle fibres to the poles.
    for (let i = 0; i < 5; i++) {
      const y = s * (-0.42 + i * 0.21);
      for (const side of [-1, 1]) {
        const m = new THREE.Mesh(strokeGeometry([new THREE.Vector2(side * s * 0.75, 0), new THREE.Vector2(0, y)], 0.015, false), basic(STAIN.fibre));
        m.position.z = z;
        g.add(m);
      }
    }
  }
  if (phase === 'telophase') {
    for (const side of [-1, 1]) {
      const nuc = new THREE.Mesh(new THREE.ShapeGeometry(circleShape(s * 0.24, side * s * 0.55, 0), 20), basic(STAIN.nucleus));
      nuc.position.z = z;
      g.add(nuc);
    }
  }
  for (const [x1, y1, x2, y2] of bars(phase, wobble)) {
    const m = new THREE.Mesh(strokeGeometry([new THREE.Vector2(x1 * s, y1 * s), new THREE.Vector2(x2 * s, y2 * s)], s * 0.09, false), basic(STAIN.chrom));
    m.position.z = z + 0.002;
    g.add(m);
  }
  g.rotation.z = angle;
  return g;
}

/** The same drawing as an SVG string (for reference cards). viewBox -1..1. */
export function stainedCellSvg(phase: CyclePhase): string {
  const parts: string[] = [];
  const stretch = phase === 'anaphase' ? 1.25 : 1;
  if (phase === 'telophase') {
    for (const cx of [-0.5, 0.5]) parts.push(`<ellipse cx="${cx}" cy="0" rx="0.62" ry="0.78" fill="${STAIN.cell}" stroke="${STAIN.edge}" stroke-width="0.04"/>`);
  } else {
    parts.push(`<ellipse cx="0" cy="0" rx="${0.9 * stretch}" ry="0.88" fill="${STAIN.cell}" stroke="${STAIN.edge}" stroke-width="0.04"/>`);
  }
  if (phase === 'interphase') {
    parts.push(`<circle cx="0" cy="0" r="0.42" fill="${STAIN.nucleus}"/>`, `<circle cx="0.1" cy="-0.05" r="0.1" fill="${STAIN.chrom}"/>`);
  }
  if (phase === 'prophase') parts.push(`<circle cx="0" cy="0" r="0.5" fill="${STAIN.nucleusLight}"/>`);
  if (phase === 'metaphase') {
    for (let i = 0; i < 5; i++) {
      const y = -0.42 + i * 0.21;
      for (const side of [-1, 1]) parts.push(`<line x1="${side * 0.75}" y1="0" x2="0" y2="${-y}" stroke="${STAIN.fibre}" stroke-width="0.02"/>`);
    }
  }
  if (phase === 'telophase') for (const cx of [-0.55, 0.55]) parts.push(`<circle cx="${cx}" cy="0" r="0.24" fill="${STAIN.nucleus}"/>`);
  for (const [x1, y1, x2, y2] of bars(phase, 0.3)) {
    parts.push(`<line x1="${x1}" y1="${-y1}" x2="${x2}" y2="${-y2}" stroke="${STAIN.chrom}" stroke-width="0.09" stroke-linecap="round"/>`);
  }
  return `<svg viewBox="-1.25 -1 2.5 2" width="100%" height="100%" aria-hidden="true" focusable="false">${parts.join('')}</svg>`;
}
