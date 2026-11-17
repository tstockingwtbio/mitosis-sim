import * as THREE from 'three';
import { DEV_MODE, h } from '../dom';
import { fileExists, imageUrl } from '../assets';
import { label } from './stage';

/**
 * Wrap a placeholder group for an image asset slot. In dev mode the asset
 * ID is shown on the stage. If the real file exists in public/img it
 * replaces the placeholder (as a textured plane of the given size).
 */
export function assetSlot(
  id: string,
  placeholder: THREE.Group,
  size: { w: number; h: number },
  onChange: () => void,
): THREE.Group {
  const group = new THREE.Group();
  group.name = id;
  group.add(placeholder);
  if (DEV_MODE) {
    const tag = label(h('div', { class: 'asset-id', 'aria-hidden': 'true' }, id), { x: -size.w / 2 + 0.6, y: size.h / 2 - 0.2, z: 0.2 });
    group.add(tag);
  }
  const url = imageUrl(id);
  if (url) {
    void fileExists(url, 'image').then((ok) => {
      if (!ok) return;
      new THREE.TextureLoader().load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        const img = tex.image as { width: number; height: number };
        const aspect = img.width / img.height;
        const w = Math.min(size.w, size.h * aspect);
        const plane = new THREE.Mesh(
          new THREE.PlaneGeometry(w, w / aspect),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }),
        );
        placeholder.visible = false;
        group.add(plane);
        onChange();
      });
    });
  }
  return group;
}
