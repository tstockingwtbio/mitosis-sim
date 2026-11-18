import * as THREE from 'three';
import { DEV_MODE, h } from '../dom';
import { fileExists, imageUrl } from '../assets';
import { label } from './stage';

export interface SlotOptions {
  /** Fit the image inside this box (world units). */
  size: { w: number; h: number };
  /** Part of the image to show, as fractions [left, top, right, bottom]. Default: all of it. */
  crop?: [number, number, number, number];
  /**
   * Line up a point of the image (fractions of the cropped image, from the
   * top left) with a point in the slot's local coordinates. The zoom ladder
   * uses this so the camera flies into the same spot on the real art as on
   * the placeholder.
   */
  align?: { image: [number, number]; local: THREE.Vector2 };
  /** Turn the image a quarter turn clockwise (a portrait image shown landscape). */
  rotate90?: boolean;
  /** Make near-white pixels transparent (for art saved on a white background). */
  knockoutWhite?: boolean;
}

/**
 * Wrap a placeholder group for an image asset slot. In dev mode the asset
 * ID is shown on the stage. If the real file exists in public/img it
 * replaces the placeholder (as a textured plane).
 */
export function assetSlot(id: string, placeholder: THREE.Group, opts: SlotOptions, onChange: () => void): THREE.Group {
  const group = new THREE.Group();
  group.name = id;
  group.add(placeholder);
  const { size } = opts;
  if (DEV_MODE) {
    const tag = label(h('div', { class: 'asset-id', 'aria-hidden': 'true' }, id), { x: -size.w / 2 + 0.6, y: size.h / 2 - 0.2, z: 0.2 });
    group.add(tag);
  }
  const url = imageUrl(id);
  if (url) {
    void fileExists(url, 'image').then((ok) => {
      if (!ok) return;
      new THREE.TextureLoader().load(url, (loaded) => {
        let tex: THREE.Texture = loaded;
        if (opts.knockoutWhite) tex = knockOutWhite(tex);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        const [l, t, r, b] = opts.crop ?? [0, 0, 1, 1];
        tex.repeat.set(r - l, b - t);
        tex.offset.set(l, 1 - b);
        const img = tex.image as { width: number; height: number };
        const aspect = (img.width * (r - l)) / (img.height * (b - t));
        // Fit the image as it will appear on screen (after any rotation).
        const shown = opts.rotate90 ? 1 / aspect : aspect;
        const sw = Math.min(size.w, size.h * shown);
        const w = opts.rotate90 ? sw / shown : sw;
        const hh = w / aspect;
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(w, hh),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }),
        );
        if (opts.align) {
          const [fx, fy] = opts.align.image;
          plane.position.set(opts.align.local.x - (fx - 0.5) * w, opts.align.local.y + (fy - 0.5) * hh, 0);
        }
        if (opts.rotate90) plane.rotation.z = -Math.PI / 2;
        placeholder.visible = false;
        group.add(plane);
        onChange();
      });
    });
  }
  return group;
}

/** Copy the image into a canvas texture with white turned transparent (soft edge). */
function knockOutWhite(tex: THREE.Texture): THREE.Texture {
  const img = tex.image as HTMLImageElement;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, c.width, c.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const min = Math.min(px[i], px[i + 1], px[i + 2]);
    const max = Math.max(px[i], px[i + 1], px[i + 2]);
    // Near-white and nearly grey: fade out. Cream paper (#F3E6CC) stays.
    if (min > 232 && max - min < 14) px[i + 3] = Math.round(255 * Math.max(0, (250 - min) / 18));
  }
  g.putImageData(data, 0, 0);
  const out = new THREE.CanvasTexture(c);
  tex.dispose();
  return out;
}
