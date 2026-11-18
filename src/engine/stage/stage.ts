import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { DEV_MODE, h } from '../dom';

export type CameraMode = 'ortho' | 'perspective';

/** Visible height of task screens in world units; width follows the aspect. */
export const VIEW_HEIGHT = 9;
/** The design is laid out for at least this many units across (about 1366 × 768). */
const DESIGN_ASPECT = 1.45;
const MIN_VIEW_WIDTH = VIEW_HEIGHT * DESIGN_ASPECT;
const BASE_FOV = 50;
/** Pixels per world unit on the stage at 1366 × 768. */
const DESIGN_PX_PER_UNIT = 62;

type Tick = (dt: number, now: number) => boolean | void;

/**
 * One Three.js renderer for the whole app. Task screens use a fixed,
 * straight-on orthographic camera; the A1 zoom ladder and story scenes use
 * the perspective camera. Renders on demand: only while something animates.
 */
export class Stage {
  readonly el: HTMLElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly labels: CSS2DRenderer;
  scene = new THREE.Scene();
  readonly ortho: THREE.OrthographicCamera;
  readonly persp: THREE.PerspectiveCamera;
  mode: CameraMode = 'ortho';
  /** Set when the frame rate falls under 30: scenes drop parallax and extras. */
  lowPower = false;
  private ticks = new Set<Tick>();
  private dirty = true;
  private raf = 0;
  private last = 0;
  private fpsEl: HTMLElement | null = null;
  private frameTimes: number[] = [];
  private slowWindows = 0;
  private lowPowerListeners = new Set<() => void>();
  private resizeListeners = new Set<() => void>();
  private aspect = 16 / 9;
  private viewHeight = VIEW_HEIGHT;

  constructor() {
    this.el = h('div', { class: 'stage' });
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    // Transparent clear: the stage card (with its paper grain) shows through.
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute('aria-hidden', 'true');
    this.el.appendChild(this.renderer.domElement);

    this.labels = new CSS2DRenderer();
    this.labels.domElement.className = 'labels';
    this.el.appendChild(this.labels.domElement);

    this.ortho = new THREE.OrthographicCamera(-8, 8, VIEW_HEIGHT / 2, -VIEW_HEIGHT / 2, 0.1, 200);
    this.ortho.position.set(0, 0, 50);
    this.persp = new THREE.PerspectiveCamera(50, 16 / 9, 0.05, 400);
    this.persp.position.set(0, 0, 10);


    if (DEV_MODE) {
      this.fpsEl = h('div', { class: 'dev-fps', 'aria-hidden': 'true' }, '— fps');
      this.el.appendChild(this.fpsEl);
    }

    new ResizeObserver(() => this.resize()).observe(this.el);
    window.addEventListener('mm:grain', () => this.invalidate());
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  get camera(): THREE.Camera {
    return this.mode === 'ortho' ? this.ortho : this.persp;
  }

  /** Width of the orthographic view in world units at the current aspect. */
  get viewWidth(): number {
    return this.fitHeight() * this.aspect;
  }

  /** Visible height in world units: the design height, taller when the stage is narrow so the full design width still fits. */
  fitHeight(): number {
    return Math.max(this.viewHeight, MIN_VIEW_WIDTH / this.aspect);
  }

  /** CSS px per world unit, relative to the 1366 × 768 design (used to scale stage text). */
  textScale(): number {
    const r = this.el.getBoundingClientRect();
    const pxPerUnit = Math.max(1, r.height) / this.fitHeight();
    return Math.min(1.3, Math.max(0.5, pxPerUnit / DESIGN_PX_PER_UNIT));
  }

  setViewHeight(hgt: number): void {
    this.viewHeight = hgt;
    this.resize();
  }

  /** Remove everything from the scene, including label elements. */
  reset(): void {
    this.ticks.clear();
    this.resizeListeners.clear();
    const old = this.scene;
    old.traverse((o) => {
      if (o instanceof CSS2DObject) o.element.remove();
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose();
    });
    this.scene = new THREE.Scene();
    this.mode = 'ortho';
    this.viewHeight = VIEW_HEIGHT;
    this.ortho.position.set(0, 0, 50);
    this.ortho.zoom = 1;
    this.persp.position.set(0, 0, 10);
    this.persp.lookAt(0, 0, 0);
    this.resize();
  }

  setMode(mode: CameraMode): void {
    this.mode = mode;
    this.invalidate();
  }

  /** Request one more frame. */
  invalidate(): void {
    this.dirty = true;
  }

  /** Run fn every frame until it returns false. */
  addTick(fn: Tick): () => void {
    this.ticks.add(fn);
    this.dirty = true;
    return () => this.ticks.delete(fn);
  }

  onResize(fn: () => void): () => void {
    this.resizeListeners.add(fn);
    return () => this.resizeListeners.delete(fn);
  }

  onLowPower(fn: () => void): () => void {
    this.lowPowerListeners.add(fn);
    return () => this.lowPowerListeners.delete(fn);
  }

  /** Screen position (CSS px inside the stage) of a world point. */
  project(p: THREE.Vector3): { x: number; y: number } {
    const v = p.clone().project(this.camera);
    const r = this.el.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height };
  }

  /** World units per CSS pixel for the orthographic camera. */
  unitsPerPixel(): number {
    const r = this.el.getBoundingClientRect();
    return this.fitHeight() / Math.max(1, r.height);
  }

  private resize(): void {
    const r = this.el.getBoundingClientRect();
    // A hidden stage measures 0 × 0: keep the last real size until it shows again.
    if (r.width < 2 || r.height < 2) return;
    const w = Math.floor(r.width);
    const hgt = Math.floor(r.height);
    this.renderer.setSize(w, hgt, false);
    this.labels.setSize(w, hgt);
    this.aspect = w / hgt;
    const halfH = this.fitHeight() / 2;
    this.ortho.left = -halfH * this.aspect;
    this.ortho.right = halfH * this.aspect;
    this.ortho.top = halfH;
    this.ortho.bottom = -halfH;
    this.ortho.updateProjectionMatrix();
    this.persp.aspect = this.aspect;
    // Keep the perspective view at least as wide as the design: a narrow stage widens the field of view.
    const halfV = Math.tan(THREE.MathUtils.degToRad(BASE_FOV / 2));
    const needHalfV = (halfV * DESIGN_ASPECT) / this.aspect;
    this.persp.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.max(halfV, needHalfV)));
    this.persp.updateProjectionMatrix();
    // Stage text (CSS labels) follows the stage size.
    this.el.style.setProperty('--stage-scale', this.textScale().toFixed(3));
    this.dirty = true;
    for (const fn of this.resizeListeners) fn();
  }

  private loop(now: number): void {
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.last ? Math.min(0.1, (now - this.last) / 1000) : 0;
    this.last = now;
    if (this.ticks.size) {
      for (const tick of [...this.ticks]) if (tick(dt, now) === false) this.ticks.delete(tick);
      this.dirty = true;
      this.measure(dt);
    }
    if (!this.dirty) return;
    this.dirty = false;
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
    this.sweepLabels();
  }

  /**
   * The label layer keeps an HTML element for every label it has drawn, even
   * after its object leaves the scene. Remove the ones no longer in the scene
   * so old text never lingers on screen.
   */
  sweepLabels(): void {
    const live = new Set<Element>();
    this.scene.traverse((o) => {
      if (o instanceof CSS2DObject) live.add(o.element);
    });
    for (const el of [...this.labels.domElement.children]) if (!live.has(el)) el.remove();
  }

  /** Frame-rate guard: two slow 1-second windows in a row switch to low power. */
  private measure(dt: number): void {
    if (dt <= 0) return;
    this.frameTimes.push(dt);
    const total = this.frameTimes.reduce((a, b) => a + b, 0);
    if (total < 1) return;
    const fps = this.frameTimes.length / total;
    this.frameTimes = [];
    if (this.fpsEl) this.fpsEl.textContent = `${fps.toFixed(0)} fps${this.lowPower ? ' (low power)' : ''}`;
    if (document.hidden) return;
    this.slowWindows = fps < 30 ? this.slowWindows + 1 : 0;
    if (this.slowWindows >= 2 && !this.lowPower) {
      this.lowPower = true;
      for (const fn of this.lowPowerListeners) fn();
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    this.renderer.dispose();
  }
}

export function label(el: HTMLElement, pos: THREE.Vector3Like = { x: 0, y: 0, z: 0 }): CSS2DObject {
  const o = new CSS2DObject(el);
  o.position.set(pos.x, pos.y, pos.z);
  return o;
}
