import manifest from '../content/assets.json';

// Asset slots: real files dropped into public/ replace placeholders with no
// code change. Existence is checked with a same-origin HEAD request (no
// external requests). The Vite dev server answers unknown paths with
// index.html, so the content type is checked too.

const cache = new Map<string, Promise<boolean>>();

export function fileExists(url: string, kind: 'audio' | 'image'): Promise<boolean> {
  let p = cache.get(url);
  if (!p) {
    p = fetch(url, { method: 'HEAD', cache: 'no-cache' })
      .then((r) => r.ok && (r.headers.get('content-type') ?? '').startsWith(kind))
      .catch(() => false);
    cache.set(url, p);
  }
  return p;
}

export function imageUrl(id: string): string | null {
  const name = (manifest.img as Record<string, string>)[id];
  return name ? `img/${name}` : null;
}

export function voUrl(voId: string, lang: string, level: 'building' | 'beginning'): string {
  const num = voId.replace(/^VO-/, '');
  return `audio/vo/mm_vo_${num}_${lang}_${level}.mp3`;
}

export function sfxUrls(id: string): string[] {
  const base = (manifest.sfx as Record<string, string>)[id];
  if (!base) return [];
  return [`audio/sfx/${base}_take1.mp3`, `audio/sfx/${base}_take2.mp3`];
}
