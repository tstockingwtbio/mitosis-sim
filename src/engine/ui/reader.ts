import { speak, stopSpeaking } from '../speech';
import { getSettings } from '../settings';
import type { Spoken } from './text';

let session = 0;

function clearHighlight(items: Spoken[]): void {
  for (const it of items) for (const s of it.spans) s.el.classList.remove('reading');
}

/** Read paragraphs one after another, highlighting each word as it is read. */
export async function readAloud(items: Spoken[], audioUrls: (string | undefined)[] = []): Promise<boolean> {
  const my = ++session;
  const s = getSettings();
  for (let i = 0; i < items.length; i++) {
    if (my !== session) return false;
    const it = items[i];
    let current: HTMLElement | null = null;
    await speak(it.text, {
      lang: it.lang,
      rate: s.speechRate,
      audioUrl: audioUrls[i] ?? it.audio,
      onWord: s.highlightWords
        ? (start) => {
            const span = it.spans.find((w) => start >= w.start && start < w.end) ?? it.spans.find((w) => w.start >= start);
            if (!span || span.el === current) return;
            (current as HTMLElement | null)?.classList.remove("reading");
            current = span.el;
            current.classList.add('reading');
          }
        : undefined,
    });
    (current as HTMLElement | null)?.classList.remove("reading");
  }
  clearHighlight(items);
  return my === session;
}

export function stopReading(): void {
  session++;
  stopSpeaking();
  document.querySelectorAll('.w.reading').forEach((el) => el.classList.remove('reading'));
}
