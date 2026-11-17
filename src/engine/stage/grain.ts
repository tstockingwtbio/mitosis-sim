import * as THREE from 'three';
import { fileExists, imageUrl } from '../assets';

// Paper grain taken from the teacher's cream cardstock texture (IMG-T01).
// The texture is turned into a near-white luminance map, so multiplying it
// with any palette colour keeps the colour and adds the grain. Loaded once,
// after the first screen is up; until then shapes are flat colour.

const SIZE = 512;
let canvas: HTMLCanvasElement | null = null;
let texture: THREE.CanvasTexture | null = null;
let started = false;
const waiting = new Set<THREE.MeshBasicMaterial>();
const stripeJobs = new Set<() => void>();

export function grainCanvas(): HTMLCanvasElement | null {
  return canvas;
}

export function grainTexture(): THREE.Texture | null {
  return texture;
}

/** Give a fill material the grain now, or as soon as it has loaded. */
export function useGrain(mat: THREE.MeshBasicMaterial): void {
  if (texture) {
    mat.map = texture;
    mat.needsUpdate = true;
    return;
  }
  waiting.add(mat);
  mat.addEventListener('dispose', () => waiting.delete(mat));
}

/** Run when the grain is ready (used to re-draw striped paper). */
export function onGrain(job: () => void): void {
  if (canvas) job();
  else stripeJobs.add(job);
}

export function loadGrain(): void {
  if (started) return;
  started = true;
  const url = imageUrl('IMG-T01');
  if (!url) return;
  void fileExists(url, 'image').then((ok) => {
    if (!ok) return;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => build(img);
    img.src = url;
  });
}

function build(img: HTMLImageElement): void {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  // Take a square from the middle of the texture.
  const s = Math.min(img.width, img.height);
  g.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, SIZE, SIZE);
  const data = g.getImageData(0, 0, SIZE, SIZE);
  const px = data.data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
  const mean = sum / (px.length / 4);
  for (let i = 0; i < px.length; i += 4) {
    const lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    const v = Math.max(0.8, Math.min(1, 0.95 + ((lum - mean) / 255) * 1.8));
    px[i] = px[i + 1] = px[i + 2] = Math.round(v * 255);
    px[i + 3] = 255;
  }
  g.putImageData(data, 0, 0);
  canvas = c;
  texture = new THREE.CanvasTexture(c);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  // Shape UVs are in world units: one grain tile per 4 units.
  texture.repeat.set(0.25, 0.25);
  for (const m of waiting) {
    m.map = texture;
    m.needsUpdate = true;
  }
  waiting.clear();
  for (const job of stripeJobs) job();
  stripeJobs.clear();
  applyCssGrain(c);
  window.dispatchEvent(new CustomEvent('mm:grain'));
}

/** The same grain on the page background and cards (CSS multiply blend). */
function applyCssGrain(src: HTMLCanvasElement): void {
  const tile = document.createElement('canvas');
  tile.width = tile.height = 256;
  tile.getContext('2d')!.drawImage(src, 0, 0, 256, 256);
  try {
    document.documentElement.style.setProperty('--grain', `url(${tile.toDataURL('image/png')})`);
    document.documentElement.dataset.grain = 'on';
  } catch {
    /* ignore */
  }
}
