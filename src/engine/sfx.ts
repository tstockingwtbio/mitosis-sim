import { fileExists, sfxUrls } from './assets';
import { getSettings } from './settings';

// Sound effects play only when a recorded file exists in public/audio/sfx.
// Until then this is silent (no generated audio). Sounds that repeat often
// alternate between take 1 and take 2 when both exist.

const available = new Map<string, Promise<string[]>>();

function resolve(id: string): Promise<string[]> {
  let p = available.get(id);
  if (!p) {
    const urls = sfxUrls(id);
    p = Promise.all(urls.map((u) => fileExists(u, 'audio'))).then((ok) => urls.filter((_, i) => ok[i]));
    available.set(id, p);
  }
  return p;
}

export function playSfx(id: string): void {
  if (!getSettings().sfx) return;
  void resolve(id).then((urls) => {
    if (!urls.length) return;
    const url = urls[Math.floor(Math.random() * urls.length)];
    const a = new Audio(url);
    a.volume = 0.6;
    a.play().catch(() => undefined);
  });
}
