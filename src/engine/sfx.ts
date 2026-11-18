import { fileExists, sfxUrls } from './assets';
import { getSettings, onSettings } from './settings';

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

// Background ambience (a looping recording) at about 20% of the narrator's
// volume. One loop at a time; the "Background sounds" setting mutes it.
let loop: HTMLAudioElement | null = null;
let loopId: string | null = null;

export function playLoop(id: string): () => void {
  stopLoop();
  loopId = id;
  if (getSettings().ambience) startLoop(id);
  return () => {
    if (loopId === id) stopLoop();
  };
}

function startLoop(id: string): void {
  void resolve(id).then((urls) => {
    if (!urls.length || loopId !== id || !getSettings().ambience) return;
    const a = new Audio(urls[0]);
    a.loop = true;
    a.volume = 0.2;
    loop = a;
    a.play().catch(() => undefined);
  });
}

export function stopLoop(): void {
  loopId = null;
  loop?.pause();
  loop = null;
}

onSettings((s, changed) => {
  if (!changed.includes('ambience') || !loopId) return;
  if (s.ambience) startLoop(loopId);
  else {
    loop?.pause();
    loop = null;
  }
});
