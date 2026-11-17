// localStorage can be blocked (iframe embeds, privacy settings, managed
// Chromebooks). Every call is wrapped so the sim keeps working without it.

const memory = new Map<string, string>();

export function readJSON<T>(key: string, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    raw = memory.get(key) ?? null;
  }
  if (raw == null) raw = memory.get(key) ?? null;
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  const raw = JSON.stringify(value);
  memory.set(key, raw);
  try {
    window.localStorage.setItem(key, raw);
  } catch {
    /* storage blocked: memory copy keeps this session working */
  }
}

export function remove(key: string): void {
  memory.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function storageAvailable(): boolean {
  try {
    const k = '__mm_probe__';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}
