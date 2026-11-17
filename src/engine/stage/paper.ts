import * as THREE from 'three';
import { grainCanvas, onGrain, useGrain } from './grain';

// Flat cut-paper pieces: a fill, a hand-inked outline drawn as real geometry
// (not a screen-space pass) and a small offset drop shadow.

export const PALETTE = {
  cream: '#F3E6CC',
  teal: '#2F8C8C',
  orange: '#E8772E',
  blue: '#24456E',
  moss: '#6E9A3A',
  ink: '#2B1D14',
  paper: '#FBF5E8',
} as const;

export interface PaperOptions {
  color: THREE.ColorRepresentation;
  outline?: number;
  shadow?: boolean;
  striped?: boolean;
  opacity?: number;
  /** Explicit outline colour (defaults to ink). */
  ink?: THREE.ColorRepresentation;
  /** Paper grain on the fill (default on). */
  grain?: boolean;
}

const stripeCache = new Map<string, THREE.Texture>();

/** Diagonal stripes in a darker shade of the base colour (paternal paper). */
export function stripeTexture(color: THREE.ColorRepresentation): THREE.Texture {
  const key = new THREE.Color(color).getHexString();
  const hit = stripeCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const base = new THREE.Color(color);
  const dark = base.clone().multiplyScalar(0.62);
  const draw = () => {
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = `#${base.getHexString()}`;
    g.fillRect(0, 0, 128, 128);
    g.strokeStyle = `#${dark.getHexString()}`;
    g.lineWidth = 24;
    for (let i = -128; i <= 256; i += 64) {
      g.beginPath();
      g.moveTo(i, 128);
      g.lineTo(i + 128, 0);
      g.stroke();
    }
    const grain = grainCanvas();
    if (grain) {
      g.globalCompositeOperation = 'multiply';
      g.drawImage(grain, 0, 0, 128, 128);
    }
  };
  draw();
  const tex = new THREE.CanvasTexture(c);
  onGrain(() => {
    draw();
    tex.needsUpdate = true;
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(1.1, 1.1);
  stripeCache.set(key, tex);
  return tex;
}

/** Triangle strip of constant width along a polyline (the ink outline). */
export function strokeGeometry(points: THREE.Vector2[], width: number, closed = true): THREE.BufferGeometry {
  const pts = points.slice();
  if (closed && pts.length > 2 && pts[0].distanceTo(pts[pts.length - 1]) < 1e-6) pts.pop();
  const n = pts.length;
  const pos: number[] = [];
  const idx: number[] = [];
  const half = width / 2;
  for (let i = 0; i < n; i++) {
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const cur = pts[i];
    const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    const d1 = cur.clone().sub(prev).normalize();
    const d2 = next.clone().sub(cur).normalize();
    if (d1.lengthSq() === 0) d1.copy(d2);
    if (d2.lengthSq() === 0) d2.copy(d1);
    const n1 = new THREE.Vector2(-d1.y, d1.x);
    const n2 = new THREE.Vector2(-d2.y, d2.x);
    const miter = n1.clone().add(n2);
    if (miter.lengthSq() < 1e-8) miter.copy(n1);
    miter.normalize();
    const dot = Math.max(0.35, miter.dot(n1));
    const len = half / dot;
    pos.push(cur.x + miter.x * len, cur.y + miter.y * len, 0, cur.x - miter.x * len, cur.y - miter.y * len, 0);
  }
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    const b = ((i + 1) % n) * 2;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function basic(color: THREE.ColorRepresentation, opacity = 1): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: opacity >= 1,
  });
}

/** A paper cut-out from a THREE.Shape. Returns a group with named parts. */
export function paper(shape: THREE.Shape, opts: PaperOptions): THREE.Group {
  const group = new THREE.Group();
  const outline = opts.outline ?? 0.07;
  const opacity = opts.opacity ?? 1;
  const fillGeo = new THREE.ShapeGeometry(shape, 24);
  let fillMat: THREE.MeshBasicMaterial;
  if (opts.striped) {
    fillMat = new THREE.MeshBasicMaterial({ map: stripeTexture(opts.color), side: THREE.DoubleSide, transparent: opacity < 1, opacity });
  } else {
    fillMat = basic(opts.color, opacity);
    if (opts.grain !== false) useGrain(fillMat);
  }
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.name = 'fill';
  fill.position.z = 0.002;

  const pts = shape.getPoints(24);
  if (outline > 0) {
    const line = new THREE.Mesh(strokeGeometry(pts, outline), basic(opts.ink ?? PALETTE.ink, opacity));
    line.name = 'outline';
    line.position.z = 0.004;
    group.add(line);
  }
  if (opts.shadow !== false) {
    const shadow = new THREE.Mesh(fillGeo.clone(), basic('#000000', 0.16 * opacity));
    shadow.name = 'shadow';
    shadow.position.set(0.06, -0.08, -0.002);
    group.add(shadow);
  }
  group.add(fill);
  return group;
}

export function circleShape(r: number, cx = 0, cy = 0): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(cx, cy, r, 0, Math.PI * 2, false);
  return s;
}

export function ellipseShape(rx: number, ry: number, cx = 0, cy = 0): THREE.Shape {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0);
  return s;
}

/** Rounded rectangle centred on (cx, cy). */
export function roundRectShape(w: number, hgt: number, r: number, cx = 0, cy = 0): THREE.Shape {
  const s = new THREE.Shape();
  const x = cx - w / 2;
  const y = cy - hgt / 2;
  const rr = Math.min(r, w / 2, hgt / 2);
  s.moveTo(x + rr, y);
  s.lineTo(x + w - rr, y);
  s.absarc(x + w - rr, y + rr, rr, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + hgt - rr);
  s.absarc(x + w - rr, y + hgt - rr, rr, 0, Math.PI / 2, false);
  s.lineTo(x + rr, y + hgt);
  s.absarc(x + rr, y + hgt - rr, rr, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + rr);
  s.absarc(x + rr, y + rr, rr, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Set opacity on every material in a group. */
export function setOpacity(obj: THREE.Object3D, opacity: number): void {
  obj.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
    if (!m || Array.isArray(m)) return;
    const base = (m.userData.baseOpacity ??= m.opacity);
    m.transparent = true;
    m.opacity = base * opacity;
    m.depthWrite = opacity >= 1 && base >= 1;
  });
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
