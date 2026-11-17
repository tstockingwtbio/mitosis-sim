import * as THREE from 'three';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { getSettings } from '../../engine/settings';
import { PALETTE, basic, circleShape, ellipseShape, easeInOut, paper, roundRectShape, setOpacity, strokeGeometry } from '../../engine/stage/paper';
import { assetSlot } from '../../engine/stage/placeholder';
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

interface Built {
  group: THREE.Group;
  /** Where the next rung sits, in this rung's local coordinates. */
  focus: THREE.Vector2;
}

function rod(length: number, color: string, striped = false): THREE.Group {
  return paper(roundRectShape(0.42, length, 0.21), { color, striped, outline: 0.07 });
}

function buildFig(onChange: () => void): Built {
  const g = new THREE.Group();
  // Placeholder newt, side view: body, head, tail, legs, back patches, eye.
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
  const belly = paper(ellipseShape(1.3, 0.22, -0.4, -0.38), { color: PALETTE.cream, outline: 0.04, shadow: false });
  belly.position.z = 0.03;
  g.add(belly);
  const head = paper(ellipseShape(0.75, 0.55, -2.35, 0.12), { color: PALETTE.orange });
  head.position.z = 0.04;
  g.add(head);
  for (const [x, y, r] of [[-0.9, 0.3, 0.22], [-0.1, 0.36, 0.18], [0.5, 0.25, 0.16]] as [number, number, number][]) {
    const patch = paper(circleShape(r, x, y), { color: PALETTE.blue, outline: 0.04, shadow: false });
    patch.position.z = 0.05;
    g.add(patch);
  }
  const eye = paper(circleShape(0.17, -2.6, 0.32), { color: PALETTE.cream, outline: 0.05, shadow: false });
  eye.position.z = 0.06;
  g.add(eye);
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.08), basic(PALETTE.ink));
  lid.position.set(-2.6, 0.38, 0.07);
  g.add(lid);
  g.scale.setScalar(1.25);
  return { group: assetSlot('IMG-C01', g, { w: 7, h: 4 }, onChange), focus: new THREE.Vector2(3.2, 0.05) };
}

function buildTissue(onChange: () => void): Built {
  const g = new THREE.Group();
  g.add(paper(circleShape(3.1), { color: PALETTE.orange, outline: 0.1 }));
  const muscle = paper(circleShape(2.6), { color: PALETTE.teal, outline: 0.07, shadow: false });
  muscle.position.z = 0.01;
  g.add(muscle);
  // Muscle bundles made of cells.
  for (let ring = 0; ring < 2; ring++) {
    const n = ring === 0 ? 8 : 14;
    const r = ring === 0 ? 1.35 : 2.1;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.2;
      const c = paper(circleShape(0.3, Math.cos(a) * r, Math.sin(a) * r), { color: '#3a9e9e', outline: 0.04, shadow: false });
      c.position.z = 0.02;
      g.add(c);
    }
  }
  const bone = paper(circleShape(0.75), { color: PALETTE.cream, outline: 0.08 });
  bone.position.z = 0.03;
  g.add(bone);
  // The cell we zoom into: highlighted with a cream fill and a nucleus.
  const fx = Math.cos(0.2 + (3 / 14) * Math.PI * 2) * 2.1;
  const fy = Math.sin(0.2 + (3 / 14) * Math.PI * 2) * 2.1;
  const target = paper(circleShape(0.3, fx, fy), { color: PALETTE.cream, outline: 0.05, shadow: false });
  target.position.z = 0.04;
  g.add(target);
  const nuc = paper(circleShape(0.12, fx, fy), { color: PALETTE.blue, outline: 0.03, shadow: false });
  nuc.position.z = 0.05;
  g.add(nuc);
  return { group: assetSlot('IMG-B08', g, { w: 6.6, h: 6.6 }, onChange), focus: new THREE.Vector2(fx, fy) };
}

function buildCell(onChange: () => void): Built {
  const g = new THREE.Group();
  g.add(paper(ellipseShape(3.3, 2.9), { color: PALETTE.cream, outline: 0.1 }));
  for (const [x, y, a] of [[-2, 1.1, 0.4], [1.9, -1.3, -0.3], [-1.6, -1.5, 1.2], [2.1, 1.2, 2]] as [number, number, number][]) {
    const m = paper(ellipseShape(0.5, 0.24), { color: PALETTE.moss, outline: 0.05 });
    m.position.set(x, y, 0.02);
    m.rotation.z = a;
    g.add(m);
  }
  const env = paper(circleShape(1.35, 0.3, 0.2), { color: PALETTE.blue, outline: 0.08 });
  env.position.z = 0.03;
  g.add(env);
  const inner = paper(circleShape(1.17, 0.3, 0.2), { color: '#dfe6ef', outline: 0.04, shadow: false });
  inner.position.z = 0.04;
  g.add(inner);
  return { group: assetSlot('IMG-B09', g, { w: 7, h: 6.2 }, onChange), focus: new THREE.Vector2(0.3, 0.2) };
}

function buildNucleus(): Built {
  const g = new THREE.Group();
  g.add(paper(circleShape(3.2), { color: PALETTE.blue, outline: 0.1 }));
  const inner = paper(circleShape(2.95), { color: '#dfe6ef', outline: 0.05, shadow: false });
  inner.position.z = 0.01;
  g.add(inner);
  const rods: [number, number, number, number, string, boolean][] = [
    [-1.2, 0.3, 2.4, 0.3, PALETTE.teal, false],
    [-0.1, -0.5, 2.4, -0.5, PALETTE.teal, true],
    [1.2, 0.6, 1.4, 0.9, PALETTE.orange, false],
    [0.9, -1.4, 1.4, 1.6, PALETTE.orange, true],
  ];
  for (const [x, y, len, a, color, striped] of rods) {
    const r = rod(len, color, striped);
    r.position.set(x, y, 0.03);
    r.rotation.z = a;
    g.add(r);
  }
  return { group: g, focus: new THREE.Vector2(-1.2, 0.3) };
}

function buildChromosome(): Built {
  const g = new THREE.Group();
  const r = paper(roundRectShape(1.1, 6.2, 0.55), { color: PALETTE.teal, outline: 0.1 });
  g.add(r);
  // Coils: the DNA is wound up tight.
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
  return { group: g, focus };
}

function buildGene(): Built {
  const g = new THREE.Group();
  const strip = paper(roundRectShape(9, 2.6, 0.4), { color: PALETTE.teal, outline: 0.1 });
  g.add(strip);
  const band = paper(roundRectShape(2.2, 2.6, 0.05), { color: PALETTE.orange, outline: 0.08, shadow: false });
  band.position.z = 0.02;
  g.add(band);
  const tag = label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t('A1.zoom.gene')), { x: 0, y: 1.8, z: 0.1 });
  g.add(tag);
  return { group: g, focus: new THREE.Vector2(0, 0) };
}

function buildDna(): Built {
  const g = new THREE.Group();
  const n = 120;
  const a: THREE.Vector2[] = [];
  const b: THREE.Vector2[] = [];
  for (let i = 0; i <= n; i++) {
    const x = -4.2 + (8.4 * i) / n;
    a.push(new THREE.Vector2(x, Math.sin(x * 1.5) * 1.1));
    b.push(new THREE.Vector2(x, Math.sin(x * 1.5 + Math.PI) * 1.1));
  }
  for (let i = 0; i <= n; i += 5) {
    const rung = new THREE.Mesh(strokeGeometry([a[i], b[i]], 0.1, false), basic(PALETTE.cream));
    rung.position.z = 0.0;
    g.add(rung);
    const rungInk = new THREE.Mesh(strokeGeometry([a[i], b[i]], 0.16, false), basic(PALETTE.ink));
    rungInk.position.z = -0.01;
    g.add(rungInk);
  }
  const strandA = new THREE.Mesh(strokeGeometry(a, 0.3, false), basic(PALETTE.teal));
  const strandB = new THREE.Mesh(strokeGeometry(b, 0.3, false), basic(PALETTE.orange));
  const inkA = new THREE.Mesh(strokeGeometry(a, 0.42, false), basic(PALETTE.ink));
  const inkB = new THREE.Mesh(strokeGeometry(b, 0.42, false), basic(PALETTE.ink));
  strandA.position.z = 0.03;
  strandB.position.z = 0.05;
  inkA.position.z = 0.02;
  inkB.position.z = 0.04;
  g.add(inkA, strandA, inkB, strandB);
  return { group: g, focus: new THREE.Vector2(0, 0) };
}

export function zoomLadder(ctx: StepContext): StepView {
  const { stage } = ctx;
  stage.setMode('perspective');
  const invalidate = () => stage.invalidate();
  const builders: Record<Rung, () => Built> = {
    fig: () => buildFig(invalidate),
    tissue: () => buildTissue(invalidate),
    cell: () => buildCell(invalidate),
    nucleus: buildNucleus,
    chromosome: buildChromosome,
    gene: buildGene,
    dna: buildDna,
  };
  const rungs: Built[] = [];
  const centers: THREE.Vector2[] = [];
  let c = new THREE.Vector2(0, 0);
  RUNGS.forEach((r, i) => {
    const b = builders[r]();
    b.group.position.set(c.x, c.y, -i * DEPTH);
    stage.scene.add(b.group);
    rungs.push(b);
    centers.push(c.clone());
    c = c.clone().add(b.focus);
  });

  const memo = ctx.memo as { rung?: number };
  let current = memo.rung ?? 0;

  const place = (i: number) => {
    rungs.forEach((r, j) => {
      r.group.visible = j === i;
      setOpacity(r.group, 1);
    });
    stage.persp.position.set(centers[i].x, centers[i].y, -i * DEPTH + VIEW_DIST);
    stage.persp.lookAt(centers[i].x, centers[i].y, -i * DEPTH);
    stage.invalidate();
  };

  // Panel: ladder of levels, zoom buttons, and the text for the current level.
  const ladder = h('ol', { class: 'seg-options stack', 'aria-label': t('A1.zoom.levels'), style: { listStyle: 'none', padding: '0', margin: '0' } });
  const levelText = h('div', { 'aria-live': 'polite' });
  const outBtn = h('button', { class: 'btn', type: 'button' }, h('span', { 'aria-hidden': 'true' }, '−'), t('A1.zoom.out'));
  const inBtn = h('button', { class: 'btn primary', type: 'button' }, h('span', { 'aria-hidden': 'true' }, '+'), t('A1.zoom.in'));
  ctx.body.append(h('div', { class: 'card' }, h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, outBtn, inBtn), levelText), ladder);
  const ladderBtns = RUNGS.map((r, i) => {
    const b = h('button', { class: 'chapter', type: 'button', onclick: () => go(i) }, h('span', { class: 'num' }, String(i + 1)), h('span', {}, t(`A1.zoom.${r}`)));
    ladder.appendChild(h('li', {}, b));
    return b;
  });
  const readables = ctx.getReadables();

  let animating = false;
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
    ctx.setReadables([...readables, txt]);
    const line = LINE_FOR_RUNG[current];
    if (ctx.captions.current() !== line) ctx.captions.go(line, speakLine);
    ctx.counts.set(current >= 2 && current <= 3 ? { chromosomes: 4, dnaMolecules: 4, same: null } : { chromosomes: null, dnaMolecules: null, same: null });
  };

  const go = (target: number) => {
    if (animating || target === current || target < 0 || target >= RUNGS.length) return;
    const reduced = getSettings().reducedMotion || Math.abs(target - current) > 1 || target < current;
    if (reduced) {
      // Cut (with a short CSS fade on the canvas) instead of a fly-in.
      current = target;
      place(current);
      if (!getSettings().reducedMotion) {
        stage.renderer.domElement.animate?.([{ opacity: 0.2 }, { opacity: 1 }], { duration: 220 });
      }
      refreshUi(true);
      return;
    }
    // Fly forward through the current level into the next one.
    animating = true;
    playSfx('SFX-18');
    const from = current;
    const to = target;
    refreshUi(false);
    const startZ = -from * DEPTH + VIEW_DIST;
    const endZ = -to * DEPTH + VIEW_DIST;
    const planeZ = -from * DEPTH;
    rungs[to].group.visible = false;
    let p = 0;
    stage.addTick((dt) => {
      p = Math.min(1, p + dt / 1.4);
      const e = easeInOut(p);
      const xy = centers[from].clone().lerp(centers[to], Math.min(1, easeInOut(Math.min(1, p * 1.7))));
      const z = startZ + (endZ - startZ) * e;
      stage.persp.position.set(xy.x, xy.y, z);
      stage.persp.lookAt(xy.x, xy.y, z - VIEW_DIST);
      if (z < planeZ + 0.3) {
        rungs[from].group.visible = false;
        rungs[to].group.visible = true;
        setOpacity(rungs[to].group, Math.min(1, (planeZ + 0.3 - z) / 3));
      }
      if (p >= 1) {
        animating = false;
        current = to;
        place(current);
        refreshUi(true);
        return false;
      }
      return true;
    });
  };

  outBtn.addEventListener('click', () => go(current - 1));
  inBtn.addEventListener('click', () => go(current + 1));
  ctx.captions.setLines((ctx.step as { lines: string[] }).lines, { autoAdvance: false, autoplay: getSettings().readAloud });
  place(current);
  refreshUi(false);
  return { dispose: () => undefined };
}
