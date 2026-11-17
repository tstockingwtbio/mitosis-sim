import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { getSettings } from '../../engine/settings';
import { fileExists, imageUrl } from '../../engine/assets';
import { PALETTE, basic, circleShape, ellipseShape, easeInOut, paper, roundRectShape, setOpacity, strokeGeometry } from '../../engine/stage/paper';
import { assetSlot } from '../../engine/stage/placeholder';
import { useGrain } from '../../engine/stage/grain';
import { label } from '../../engine/stage/stage';
import { playSfx } from '../../engine/sfx';
import { paragraph } from '../../engine/ui/text';
import type { StepContext, StepView } from '../../engine/types';

const RUNGS = ['fig', 'tissue', 'cell', 'nucleus', 'chromosome', 'gene', 'dna'] as const;
type Rung = (typeof RUNGS)[number];
/** Which narrated line (index into the step's lines) belongs to each rung. */
const LINE_FOR_RUNG = [0, 0, 0, 1, 1, 2, 2];
const DEPTH = 12;
const VIEW_DIST = 8.5;
const FLY_SECONDS = 1.6;

interface Built {
  group: THREE.Group;
  /** Where the next rung sits, in this rung's local coordinates. */
  focus: THREE.Vector2;
  /** Size of the "you are going here" ring around the focus. */
  targetRadius: number;
  /** Runs every time the rung is arrived at (e.g. the DNA unwinding). */
  arrive?: (instant: boolean) => void;
}

/** Real art for a rung (from the teacher's images) when the file exists. */
interface ArtSpec {
  id: string;
  /** Width / height of the shown part of the image. */
  aspect: number;
  height: number;
  crop?: [number, number, number, number];
  /** Where to dive in, as fractions of the shown image from the top left. */
  focus: [number, number];
  targetRadius: number;
}

const ART: Partial<Record<Rung, ArtSpec>> = {
  // Side view cropped from the turnaround sheet; dive into the new tail.
  fig: { id: 'IMG-C01', aspect: (2172 * 0.31) / 724, height: 6.4, crop: [0.19, 0, 0.5, 1], focus: [0.84, 0.72], targetRadius: 0.75 },
  // One of the small cells in the cream layer under the skin.
  tissue: { id: 'IMG-B08', aspect: 1536 / 1024, height: 6.2, focus: [0.605, 0.107], targetRadius: 0.28 },
  // The nucleus.
  cell: { id: 'IMG-B09', aspect: 1536 / 1024, height: 6.7, focus: [0.496, 0.503], targetRadius: 1.55 },
  // Optional art for the code-built levels (IMG-B10 to B13). Each level stays
  // code-built until its file exists. Dive points assume the layout in the
  // bible prompt; re-check them when the images arrive.
  nucleus: { id: 'IMG-B10', aspect: 1536 / 1024, height: 7, focus: [0.5, 0.5], targetRadius: 0.8 },
  chromosome: { id: 'IMG-B11', aspect: 1536 / 1024, height: 7, focus: [0.5, 0.3], targetRadius: 0.5 },
  gene: { id: 'IMG-B12', aspect: 1536 / 1024, height: 6.5, focus: [0.5, 0.5], targetRadius: 1.0 },
  dna: { id: 'IMG-B13', aspect: 1536 / 1024, height: 6.5, focus: [0.5, 0.5], targetRadius: 0 },
};

function artRung(spec: ArtSpec, onChange: () => void): Built {
  const w = spec.height * spec.aspect;
  const group = assetSlot(spec.id, new THREE.Group(), { size: { w, h: spec.height }, crop: spec.crop }, onChange);
  return {
    group,
    focus: new THREE.Vector2((spec.focus[0] - 0.5) * w, (0.5 - spec.focus[1]) * spec.height),
    targetRadius: spec.targetRadius,
  };
}

// ---------- Placeholders (used until the art files exist) ----------

function buildFig(): Built {
  const g = new THREE.Group();
  const tail = new THREE.Shape();
  tail.moveTo(0.9, 0.35);
  tail.quadraticCurveTo(2.6, 0.6, 4.1, 0.05);
  tail.quadraticCurveTo(2.6, -0.35, 0.9, -0.35);
  tail.closePath();
  g.add(paper(tail, { color: PALETTE.orange }));
  for (const x of [1.6, 2.4, 3.2]) {
    const band = paper(ellipseShape(0.16, 0.28, x, 0.1 - (x - 1.6) * 0.06), { color: PALETTE.blue, outline: 0.04, shadow: false });
    band.position.z = 0.01;
    g.add(band);
  }
  for (const [x, y] of [[-1.2, -0.55], [-0.2, -0.6], [0.5, -0.55], [-1.6, -0.5]] as [number, number][]) {
    const leg = paper(ellipseShape(0.18, 0.38, x, y - 0.2), { color: PALETTE.orange });
    leg.position.z = -0.02;
    g.add(leg);
  }
  const body = paper(ellipseShape(1.7, 0.62, -0.4, 0), { color: PALETTE.orange });
  body.position.z = 0.02;
  g.add(body);
  const head = paper(ellipseShape(0.75, 0.55, -2.35, 0.12), { color: PALETTE.orange });
  head.position.z = 0.04;
  g.add(head);
  const eye = paper(circleShape(0.17, -2.6, 0.32), { color: PALETTE.cream, outline: 0.05, shadow: false });
  eye.position.z = 0.06;
  g.add(eye);
  g.scale.setScalar(1.25);
  g.position.x = -0.6;
  const wrap = assetSlot('IMG-C01', g, { size: { w: 7, h: 4 } }, () => undefined);
  return { group: wrap, focus: new THREE.Vector2(3.4, 0.1), targetRadius: 0.75 };
}

function buildTissue(): Built {
  const g = new THREE.Group();
  g.add(paper(circleShape(3.1), { color: PALETTE.orange, outline: 0.1 }));
  const muscle = paper(circleShape(2.6), { color: PALETTE.teal, outline: 0.07, shadow: false });
  muscle.position.z = 0.01;
  g.add(muscle);
  const bone = paper(circleShape(0.75), { color: PALETTE.cream, outline: 0.08 });
  bone.position.z = 0.03;
  g.add(bone);
  const target = paper(circleShape(0.3, 1.2, 1.9), { color: PALETTE.cream, outline: 0.05, shadow: false });
  target.position.z = 0.04;
  g.add(target);
  return { group: assetSlot('IMG-B08', g, { size: { w: 6.6, h: 6.6 } }, () => undefined), focus: new THREE.Vector2(1.2, 1.9), targetRadius: 0.4 };
}

function buildCell(): Built {
  const g = new THREE.Group();
  g.add(paper(ellipseShape(3.3, 2.9), { color: PALETTE.cream, outline: 0.1 }));
  const env = paper(circleShape(1.35), { color: PALETTE.blue, outline: 0.08 });
  env.position.z = 0.03;
  g.add(env);
  const inner = paper(circleShape(1.17), { color: '#dfe6ef', outline: 0.04, shadow: false });
  inner.position.z = 0.04;
  g.add(inner);
  return { group: assetSlot('IMG-B09', g, { size: { w: 7, h: 6.2 } }, () => undefined), focus: new THREE.Vector2(0, 0), targetRadius: 1.45 };
}

// ---------- Code-built levels ----------

/**
 * Nucleus of a cell that is not dividing: the chromosomes are long, loose
 * threads (chromatin), not rods. They only coil into rods before division.
 */
function buildNucleus(): Built {
  const g = new THREE.Group();
  g.add(paper(circleShape(3.2), { color: PALETTE.blue, outline: 0.1 }));
  const inner = paper(circleShape(2.95), { color: '#dfe6ef', outline: 0.05, shadow: false });
  inner.position.z = 0.01;
  g.add(inner);
  const threads: [string, number][] = [
    [PALETTE.teal, 0],
    ['#1f6262', 1.6],
    [PALETTE.orange, 3.1],
    ['#a4521d', 4.7],
  ];
  let focus = new THREE.Vector2();
  threads.forEach(([color, k], i) => {
    const pts: THREE.Vector2[] = [];
    for (let s = 0; s <= 220; s++) {
      const u = s / 220;
      // Loose, wandering threads that fill the nucleus (a Lissajous path with wobble).
      const env = 0.75 + 0.25 * Math.sin(u * 3.1 + k);
      const x = 2.45 * env * Math.sin(u * (4.1 + i * 0.7) + k) + 0.12 * Math.sin(u * 61 + k);
      const y = 2.45 * env * Math.sin(u * (3.3 + i * 0.9) + 2 * k + 0.6) + 0.12 * Math.cos(u * 53 + k);
      const r = Math.hypot(x, y);
      const lim = 2.7;
      pts.push(r > lim ? new THREE.Vector2((x / r) * lim, (y / r) * lim) : new THREE.Vector2(x, y));
    }
    const ink = new THREE.Mesh(strokeGeometry(pts, 0.16, false), basic(PALETTE.ink));
    ink.position.z = 0.02 + i * 0.004;
    const line = new THREE.Mesh(strokeGeometry(pts, 0.09, false), basic(color));
    line.position.z = 0.022 + i * 0.004;
    g.add(ink, line);
    // Dive in on the first thread, at the point nearest the middle of the nucleus.
    if (i === 0) focus = pts.reduce((best, q) => (q.distanceTo(new THREE.Vector2(0.4, -0.2)) < best.distanceTo(new THREE.Vector2(0.4, -0.2)) ? q : best)).clone();
  });
  return { group: g, focus, targetRadius: 0.8 };
}

/** One chromosome, coiled up tight (as it is before the cell divides). */
function buildChromosome(): Built {
  const g = new THREE.Group();
  g.add(paper(roundRectShape(1.1, 6.2, 0.55), { color: PALETTE.teal, outline: 0.1 }));
  for (let i = 0; i < 13; i++) {
    const y = -2.8 + i * 0.47;
    const pts = [new THREE.Vector2(-0.5, y), new THREE.Vector2(0, y + 0.14), new THREE.Vector2(0.5, y)];
    const coil = new THREE.Mesh(strokeGeometry(pts, 0.05, false), basic(PALETTE.ink));
    coil.position.z = 0.02;
    g.add(coil);
  }
  const band = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.36), basic(PALETTE.orange));
  band.position.set(0, 1.4, 0.03);
  g.add(band);
  g.rotation.z = 0.25;
  const focus = new THREE.Vector2(0, 1.4).rotateAround(new THREE.Vector2(0, 0), 0.25);
  return { group: g, focus, targetRadius: 0.5 };
}

function buildGene(): Built {
  const g = new THREE.Group();
  g.add(paper(roundRectShape(9, 2.6, 0.4), { color: PALETTE.teal, outline: 0.1 }));
  for (let i = 0; i < 18; i++) {
    const x = -4.2 + i * 0.5;
    if (Math.abs(x) < 1.2) continue;
    const pts = [new THREE.Vector2(x, -1.2), new THREE.Vector2(x + 0.18, 0), new THREE.Vector2(x, 1.2)];
    const coil = new THREE.Mesh(strokeGeometry(pts, 0.05, false), basic(PALETTE.ink));
    coil.position.z = 0.02;
    g.add(coil);
  }
  const band = paper(roundRectShape(2.2, 2.6, 0.05), { color: PALETTE.orange, outline: 0.08, shadow: false });
  band.position.z = 0.03;
  g.add(band);
  g.add(label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t('A1.zoom.gene')), { x: 0, y: -1.75, z: 0.1 }));
  return { group: g, focus: new THREE.Vector2(0, 0), targetRadius: 1.0 };
}

/**
 * A flat ribbon along a 3D path: constant width in the picture plane, with
 * each point keeping its own depth. Two strands that cross are then sorted by
 * the depth buffer, so the helix has no seams or breaks.
 */
function ribbon(points: THREE.Vector3[], width: number, colors?: THREE.Color[]): THREE.BufferGeometry {
  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const half = width / 2;
  for (let i = 0; i < points.length; i++) {
    const prev = points[Math.max(0, i - 1)];
    const next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = (-dy / l) * half;
    const ny = (dx / l) * half;
    const p = points[i];
    pos.push(p.x + nx, p.y + ny, p.z, p.x - nx, p.y - ny, p.z);
    uv.push(p.x + nx, p.y + ny, p.x - nx, p.y - ny);
    const c = colors?.[i];
    if (c) col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    if (i > 0) {
      const a = (i - 1) * 2;
      const b = i * 2;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

/**
 * DNA: two continuous strands twisting round each other, shaded darker where
 * they turn away, with base pairs as rungs made of two halves that fit
 * together. On arrival the helix stretches out from a tight coil.
 */
function buildDna(): Built {
  const g = new THREE.Group();
  const helix = new THREE.Group();
  g.add(helix);
  const n = 360;
  const x0 = -4.4;
  const len = 8.8;
  const amp = 1.05;
  const freq = 1.5;
  const depth = 0.6;
  const at = (x: number, phase: number) =>
    // Minus sign: the helix turns right-handed, like real DNA.
    new THREE.Vector3(x, Math.sin(x * freq + phase) * amp, -Math.cos(x * freq + phase) * depth);
  const fillMat = () => {
    const m = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    useGrain(m);
    return m;
  };
  const inkMat = basic(PALETTE.ink);

  const strands = [
    { front: new THREE.Color(PALETTE.teal), back: new THREE.Color('#174b4b'), phase: 0 },
    { front: new THREE.Color(PALETTE.orange), back: new THREE.Color('#7c4219'), phase: Math.PI },
  ];
  for (const s of strands) {
    const pts: THREE.Vector3[] = [];
    const cols: THREE.Color[] = [];
    for (let i = 0; i <= n; i++) {
      const p = at(x0 + (len * i) / n, s.phase);
      pts.push(p);
      cols.push(s.back.clone().lerp(s.front, (p.z / depth + 1) / 2));
    }
    const ink = new THREE.Mesh(ribbon(pts.map((p) => p.clone().setZ(p.z - 0.02)), 0.46), inkMat);
    const fill = new THREE.Mesh(ribbon(pts, 0.3, cols), fillMat());
    helix.add(ink, fill);
  }

  // Base pairs: two halves meeting in the middle.
  const pairColors: [string, string][] = [
    [PALETTE.moss, PALETTE.cream],
    [PALETTE.blue, '#f2c14e'],
  ];
  const step = (Math.PI / freq) / 5;
  let k = 0;
  for (let x = x0 + step / 2; x < x0 + len; x += step, k++) {
    const a = at(x, 0);
    const b = at(x, Math.PI);
    const mid = a.clone().lerp(b, 0.5);
    const [c1, c2] = pairColors[k % 2];
    const swap = Math.floor(k / 3) % 2 === 1;
    for (const [from, to, c] of [[a, mid, swap ? c2 : c1], [mid, b, swap ? c1 : c2]] as [THREE.Vector3, THREE.Vector3, string][]) {
      const seg = [from, to];
      const shade = new THREE.Color(c).lerp(new THREE.Color(PALETTE.ink), Math.max(0, -(from.z + to.z) / 2 / depth) * 0.35);
      const ink = new THREE.Mesh(ribbon(seg.map((p) => p.clone().setZ(p.z - 0.02)), 0.17), inkMat);
      const fill = new THREE.Mesh(ribbon(seg, 0.1, [shade, shade]), fillMat());
      helix.add(ink, fill);
    }
  }

  let untick: (() => void) | null = null;
  return {
    group: g,
    focus: new THREE.Vector2(0, 0),
    targetRadius: 0,
    arrive: (instant) => {
      untick?.();
      if (instant) {
        helix.scale.set(1, 1, 1);
        return;
      }
      helix.scale.set(0.22, 0.7, 1);
      let p = 0;
      const stage = g.userData.stage as { addTick: (f: (dt: number) => boolean) => () => void } | undefined;
      untick =
        stage?.addTick((dt) => {
          p = Math.min(1, p + dt / 1.3);
          const e = easeInOut(p);
          helix.scale.set(0.22 + 0.78 * e, 0.7 + 0.3 * e, 1);
          return p < 1;
        }) ?? null;
    },
  };
}

/** Dashed ring that shows where the camera will dive in next. */
function targetRing(radius: number, text: string): THREE.Group {
  const g = new THREE.Group();
  const dashes = 18;
  for (let i = 0; i < dashes; i++) {
    const a0 = (i / dashes) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / dashes / 1.8;
    const pts: THREE.Vector2[] = [];
    for (let k = 0; k <= 6; k++) {
      const a = a0 + ((a1 - a0) * k) / 6;
      pts.push(new THREE.Vector2(Math.cos(a) * radius, Math.sin(a) * radius));
    }
    const w = Math.max(0.035, radius * 0.06);
    const ink = new THREE.Mesh(strokeGeometry(pts, w * 1.9, false), basic(PALETTE.ink));
    const fill = new THREE.Mesh(strokeGeometry(pts, w, false), basic('#ffd866'));
    ink.position.z = 0.3;
    fill.position.z = 0.31;
    g.add(ink, fill);
  }
  g.add(label(h('div', { class: 'stage-label target-label', 'aria-hidden': 'true' }, text), { x: 0, y: radius + 0.35, z: 0.35 }));
  return g;
}

function setLabels(group: THREE.Object3D, visible: boolean): void {
  group.traverse((o) => {
    if (o instanceof CSS2DObject) o.visible = visible;
  });
}

function setRungVisible(group: THREE.Object3D, visible: boolean): void {
  group.visible = visible;
  // CSS labels are separate DOM elements: hide them with their level.
  group.traverse((o) => {
    if (o instanceof CSS2DObject) o.visible = visible;
  });
}

export function zoomLadder(ctx: StepContext): StepView {
  const { stage } = ctx;
  stage.setMode('perspective');
  let disposed = false;
  const cleanups: (() => void)[] = [];

  const scaleNote = h('div', { class: 'zoom-scale' });
  stage.el.appendChild(scaleNote);
  cleanups.push(() => scaleNote.remove());

  // Panel: zoom buttons, level text, ladder of levels.
  const ladder = h('ol', { class: 'seg-options', 'aria-label': t('A1.zoom.levels'), style: { listStyle: 'none', padding: '0', margin: '0' } });
  const levelText = h('div', { 'aria-live': 'polite' });
  const outBtn = h('button', { class: 'btn', type: 'button' }, h('span', { 'aria-hidden': 'true' }, '−'), t('A1.zoom.out'));
  const inBtn = h('button', { class: 'btn primary', type: 'button' }, h('span', { 'aria-hidden': 'true' }, '+'), t('A1.zoom.in'));
  ctx.body.append(h('div', { class: 'card' }, h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, outBtn, inBtn), levelText), ladder);
  const readables = ctx.getReadables();
  ctx.captions.setLines((ctx.step as { lines: string[] }).lines, { autoAdvance: false, autoplay: getSettings().readAloud });

  // Find out which real art exists first, so every level is laid out around it.
  const artIds = Object.values(ART).map((a) => a!.id);
  void Promise.all(artIds.map((id) => fileExists(imageUrl(id) ?? '', 'image'))).then((found) => {
    if (disposed) return;
    const has = new Map(artIds.map((id, i) => [id, found[i]]));
    build(has);
  });

  function build(has: Map<string, boolean>): void {
    const invalidate = () => stage.invalidate();
    const fallback: Record<Rung, () => Built> = {
      fig: buildFig,
      tissue: buildTissue,
      cell: buildCell,
      nucleus: buildNucleus,
      chromosome: buildChromosome,
      gene: buildGene,
      dna: buildDna,
    };
    const rungs: Built[] = [];
    const centers: THREE.Vector2[] = [];
    const rings: (THREE.Group | null)[] = [];
    let c = new THREE.Vector2(0, 0);
    RUNGS.forEach((r, i) => {
      const art = ART[r];
      const b = art && has.get(art.id) ? artRung(art, invalidate) : fallback[r]();
      b.group.position.set(c.x, c.y, -i * DEPTH);
      b.group.userData.stage = stage;
      stage.scene.add(b.group);
      const ring = i < RUNGS.length - 1 && b.targetRadius > 0 ? targetRing(b.targetRadius, t(`A1.zoom.target.${RUNGS[i + 1]}`)) : null;
      if (ring) {
        ring.position.set(b.focus.x, b.focus.y, 0);
        b.group.add(ring);
      }
      rings.push(ring);
      rungs.push(b);
      centers.push(c.clone());
      c = c.clone().add(b.focus);
    });

    const memo = ctx.memo as { rung?: number };
    let current = memo.rung ?? 0;
    let animating = false;

    const show = (i: number, instant: boolean) => {
      rungs.forEach((r, j) => {
        setRungVisible(r.group, j === i);
        setOpacity(r.group, 1);
      });
      rings.forEach((ring) => ring && setRungVisible(ring, false));
      if (rings[i]) setRungVisible(rings[i]!, true);
      stage.persp.position.set(centers[i].x, centers[i].y, -i * DEPTH + VIEW_DIST);
      stage.persp.lookAt(centers[i].x, centers[i].y, -i * DEPTH);
      rungs[i].arrive?.(instant || getSettings().reducedMotion);
      stage.invalidate();
    };

    const ladderBtns = RUNGS.map((r, i) => {
      const b = h('button', { class: 'chapter', type: 'button', onclick: () => go(i) }, h('span', { class: 'num' }, String(i + 1)), h('span', {}, t(`A1.zoom.${r}`)));
      ladder.appendChild(h('li', {}, b));
      return b;
    });

    const refreshUi = (speakLine: boolean) => {
      memo.rung = current;
      outBtn.disabled = current === 0 || animating;
      inBtn.disabled = current === RUNGS.length - 1 || animating;
      ladderBtns.forEach((b, i) => {
        b.setAttribute('aria-current', i === current ? 'step' : 'false');
        b.disabled = animating;
      });
      const txt = paragraph(`A1.zoom.${RUNGS[current]}.text`);
      levelText.replaceChildren(h('h3', { style: { margin: '0 0 4px' } }, t(`A1.zoom.${RUNGS[current]}`)), txt.el);
      scaleNote.textContent = t(`A1.zoom.scale.${RUNGS[current]}`);
      ctx.setReadables([...readables, txt]);
      const line = LINE_FOR_RUNG[current];
      if (ctx.captions.current() !== line) ctx.captions.go(line, speakLine);
      ctx.counts.set(current >= 2 && current <= 3 ? { chromosomes: 4, dnaMolecules: 4, same: null } : { chromosomes: null, dnaMolecules: null, same: null });
    };

    const go = (target: number) => {
      if (animating || target === current || target < 0 || target >= RUNGS.length) return;
      const cut = getSettings().reducedMotion || Math.abs(target - current) > 1 || target < current;
      if (cut) {
        // Reduced motion, zooming out or jumping: a cut with a short fade.
        current = target;
        show(current, false);
        if (!getSettings().reducedMotion) stage.renderer.domElement.animate?.([{ opacity: 0.15 }, { opacity: 1 }], { duration: 240 });
        refreshUi(true);
        return;
      }
      // Fly through the marked spot: the current level fades as the next one grows.
      animating = true;
      playSfx('SFX-18');
      const from = current;
      const to = target;
      refreshUi(false);
      if (rings[from]) setRungVisible(rings[from]!, false);
      setRungVisible(rungs[to].group, true);
      // Labels are HTML and ignore opacity: keep the next level's labels hidden until it is mostly in.
      setLabels(rungs[to].group, false);
      setOpacity(rungs[to].group, 0);
      const startZ = -from * DEPTH + VIEW_DIST;
      const endZ = -to * DEPTH + VIEW_DIST;
      const smooth = (a: number, b: number, x: number) => {
        const k = Math.max(0, Math.min(1, (x - a) / (b - a)));
        return k * k * (3 - 2 * k);
      };
      let p = 0;
      const untick = stage.addTick((dt) => {
        p = Math.min(1, p + dt / FLY_SECONDS);
        const e = easeInOut(p);
        const xy = centers[from].clone().lerp(centers[to], easeInOut(Math.min(1, p * 1.6)));
        const z = startZ + (endZ - startZ) * e;
        stage.persp.position.set(xy.x, xy.y, z);
        stage.persp.lookAt(xy.x, xy.y, z - VIEW_DIST);
        setOpacity(rungs[from].group, 1 - smooth(0.45, 0.72, p));
        setOpacity(rungs[to].group, smooth(0.4, 0.8, p));
        if (p > 0.45) setLabels(rungs[from].group, false);
        if (z < -from * DEPTH + 0.2) setRungVisible(rungs[from].group, false);
        if (p >= 1) {
          animating = false;
          current = to;
          show(current, false);
          refreshUi(true);
          return false;
        }
        return true;
      });
      cleanups.push(untick);
    };

    outBtn.addEventListener('click', () => go(current - 1));
    inBtn.addEventListener('click', () => go(current + 1));
    show(current, true);
    refreshUi(false);
  }

  return {
    dispose: () => {
      disposed = true;
      cleanups.forEach((f) => f());
    },
  };
}
