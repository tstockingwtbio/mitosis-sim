// A2 — Copy a cell (SC.HS.6.1.d). Attempt first: students try to divide a
// cell their own way, then a stepped animation shows mitosis and why the copy
// comes first. Phase names are not taught or assessed here.
import * as THREE from 'three';
import type { CellSpec, ChromSpec } from '../../content/schema';
import { h } from '../../engine/dom';
import { t } from '../../i18n';
import { countCell } from '../../engine/model/chromosome';
import { CellScene, legend } from '../../engine/stage/cellScene';
import { ChromosomeView } from '../../engine/stage/chromosomeView';
import { PALETTE, basic, easeInOut, ellipseShape, paper, setOpacity, strokeGeometry } from '../../engine/stage/paper';
import { label } from '../../engine/stage/stage';
import { Timeline } from '../../engine/stage/timeline';
import { playSfx } from '../../engine/sfx';
import type { BeatModule, StepContext, StepView } from '../../engine/types';

function cellOf(ctx: StepContext): CellSpec {
  return (ctx.step as { cell: CellSpec }).cell;
}

/** The parent cell students are about to divide. */
function parentScene(ctx: StepContext): StepView {
  const scene = new CellScene(ctx.stage, cellOf(ctx), { layout: 'cell' });
  const c = scene.counts();
  ctx.counts.set({ chromosomes: c.chromosomes, dnaMolecules: c.dnaMolecules, same: null });
  return { dispose: () => scene.dispose() };
}

/**
 * Mitosis, one stage at a time: copy, line up across the middle, pull the
 * halves of every X to opposite ends, then pinch into two cells. The count
 * strip shows the parent until the split, then new cell 1 (same info: yes).
 */
function mitosisScene(ctx: StepContext): StepView {
  const specs: ChromSpec[] = cellOf(ctx).chromosomes.map((c) => ({ ...c, state: 'unreplicated', angle: 0 }));
  const root = new THREE.Group();
  ctx.stage.scene.add(root);
  const legendEl = legend();
  ctx.stage.el.appendChild(legendEl);

  const parentCell = paper(ellipseShape(5.2, 3.3), { color: PALETTE.cream, outline: 0.1 });
  parentCell.position.z = -0.5;
  root.add(parentCell);
  const daughters = [-3.1, 3.1].map((x) => {
    const g = paper(ellipseShape(2.85, 3.0), { color: PALETTE.cream, outline: 0.1 });
    g.position.set(x, 0, -0.45);
    g.visible = false;
    root.add(g);
    return g;
  });

  const n = specs.length;
  const start = specs.map((_, i) => ({ x: -3.6 + (7.2 * i) / Math.max(1, n - 1), y: (i % 2 ? -0.6 : 0.7) }));
  // Lined up across the middle (one X above another, along a vertical line).
  const lined = specs.map((_, i) => ({ x: 0, y: 2.4 - (4.8 * i) / Math.max(1, n - 1) }));
  const sideY = (i: number) => 2.1 - (4.2 * i) / Math.max(1, n - 1);

  const xs = specs.map((s, i) => {
    const v = new ChromosomeView({ ...s, x: start[i].x, y: start[i].y });
    v.group.scale.setScalar(0.7);
    root.add(v.group);
    return v;
  });
  // The two halves that each X becomes when it is pulled apart.
  const halves = specs.map((s) =>
    [0, 1].map(() => {
      const v = new ChromosomeView({ ...s, state: 'unreplicated' });
      v.group.scale.setScalar(0.7);
      v.group.rotation.z = Math.PI / 2;
      v.group.visible = false;
      root.add(v.group);
      return v;
    }),
  );
  // Spindle fibres from each pole to the chromosomes (thin ink lines).
  const poles = [new THREE.Vector2(-4.6, 0), new THREE.Vector2(4.6, 0)];
  const fibres = new THREE.Group();
  root.add(fibres);
  const drawFibres = (targets: THREE.Vector2[][]) => {
    fibres.children.forEach((c) => (c as THREE.Mesh).geometry.dispose());
    fibres.clear();
    targets.forEach((pair) =>
      pair.forEach((p, side) => {
        const m = new THREE.Mesh(strokeGeometry([poles[side], p], 0.035, false), basic(PALETTE.blue, 0.8));
        m.position.z = -0.1;
        fibres.add(m);
      }),
    );
  };

  const setCounts = (stage: number) => {
    if (stage < 3) {
      const c = countCell({ chromosomes: specs.map((s, i) => ({ ...s, state: xs[i].replicated ? 'replicated' : 'unreplicated' })) });
      ctx.counts.set({ chromosomes: c.chromosomes, dnaMolecules: c.dnaMolecules, same: null });
    } else {
      ctx.counts.set({ chromosomes: n, dnaMolecules: n, same: true });
    }
  };

  const caption = h('div', { class: 'zoom-scale' });
  ctx.stage.el.appendChild(caption);
  const stageNames = ['A2.mitosis.s0', 'A2.mitosis.s1', 'A2.mitosis.s2', 'A2.mitosis.s3', 'A2.mitosis.s4'];
  const setCaption = (i: number) => (caption.textContent = t(stageNames[i]));
  const labels: THREE.Object3D[] = [];

  const reset = () => {
    parentCell.visible = true;
    setOpacity(parentCell, 1);
    daughters.forEach((d) => (d.visible = false));
    xs.forEach((v, i) => {
      v.group.visible = true;
      v.setReplication(0);
      v.group.position.set(start[i].x, start[i].y, 0);
      v.group.rotation.z = 0;
    });
    halves.flat().forEach((v) => {
      v.group.visible = false;
      v.group.rotation.z = Math.PI / 2;
    });
    fibres.clear();
    labels.forEach((l) => l.removeFromParent());
    setCaption(0);
    setCounts(0);
    ctx.stage.invalidate();
  };

  const timeline = new Timeline(
    ctx.stage,
    [
      {
        // 1. Copy every chromosome.
        duration: 1.2,
        start: () => {
          playSfx('SFX-11');
          setCaption(1);
        },
        apply: (p) => {
          xs.forEach((v) => v.setReplication(p));
          if (p >= 1) setCounts(1);
        },
      },
      {
        // 2. Line up across the middle, each X lying sideways so its halves face the two poles.
        duration: 1.4,
        start: () => setCaption(2),
        apply: (p) => {
          const e = easeInOut(p);
          xs.forEach((v, i) => {
            v.group.position.set(start[i].x + (lined[i].x - start[i].x) * e, start[i].y + (lined[i].y - start[i].y) * e, 0);
            v.group.rotation.z = (Math.PI / 2) * e;
          });
          drawFibres(p > 0.6 ? xs.map((v) => [new THREE.Vector2(v.group.position.x - 0.15, v.group.position.y), new THREE.Vector2(v.group.position.x + 0.15, v.group.position.y)]) : []);
        },
      },
      {
        // 3. Pull the two halves of every X to opposite ends.
        duration: 1.6,
        start: () => {
          setCaption(3);
          xs.forEach((v, i) => {
            v.group.visible = false;
            halves[i].forEach((hv) => {
              hv.group.visible = true;
              hv.group.position.set(0, lined[i].y, 0);
            });
          });
        },
        apply: (p) => {
          const e = easeInOut(p);
          const targets: THREE.Vector2[][] = [];
          halves.forEach((pair, i) => {
            const y = lined[i].y + (sideY(i) - lined[i].y) * e;
            pair[0].group.position.set(-3.4 * e, y, 0);
            pair[1].group.position.set(3.4 * e, y, 0);
            targets.push([new THREE.Vector2(-3.4 * e - 0.5, y), new THREE.Vector2(3.4 * e + 0.5, y)]);
          });
          drawFibres(p < 0.95 ? targets : []);
        },
      },
      {
        // 4. The cell pinches in two.
        duration: 1.2,
        start: () => {
          playSfx('SFX-12');
          setCaption(4);
          daughters.forEach((d) => {
            d.visible = true;
            setOpacity(d, 0);
          });
        },
        apply: (p) => {
          setOpacity(parentCell, 1 - p);
          daughters.forEach((d) => setOpacity(d, p));
          // The single chromosomes stand upright again in their new cells.
          // The single chromosomes stand upright again, side by side in their new cells.
          const e = easeInOut(p);
          halves.forEach((pair, i) =>
            pair.forEach((v, side) => {
              const cx = side ? 3.1 : -3.1;
              const rowX = cx - 1.6 + (3.2 * i) / Math.max(1, n - 1);
              const fromX = side ? 3.4 : -3.4;
              v.group.position.set(fromX + (rowX - fromX) * e, sideY(i) * (1 - e), 0);
              v.group.rotation.z = (Math.PI / 2) * (1 - e);
            }),
          );
          if (p >= 1) {
            parentCell.visible = false;
            setCounts(3);
            (['A2.cell.one', 'A2.cell.two'] as const).forEach((k, i) => {
              const l = label(h('div', { class: 'stage-label', 'aria-hidden': 'true' }, t(k)), { x: i ? 3.1 : -3.1, y: 2.3, z: 0.2 });
              root.add(l);
              labels.push(l);
            });
          }
        },
      },
    ],
    reset,
  );
  ctx.overlay.appendChild(timeline.el);
  return {
    dispose: () => {
      timeline.dispose();
      legendEl.remove();
      caption.remove();
      xs.concat(halves.flat()).forEach((v) => v.dispose());
    },
  };
}

const module: BeatModule = {
  scenes: {
    parent: parentScene,
    mitosis: mitosisScene,
  },
};

export default module;
export const scenes = module.scenes;
