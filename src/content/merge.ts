import type { PartContent } from './schema';

/** One content set for the app: Part A's chapters, then Part B's. */
export function mergeParts(a: PartContent, b: PartContent): PartContent {
  return {
    version: Math.max(a.version, b.version),
    part: `${a.part}+${b.part}`,
    profiles: { ...a.profiles, ...b.profiles },
    misconceptions: { ...a.misconceptions, ...b.misconceptions },
    beats: [...a.beats.map((x) => ({ ...x, part: x.part ?? ('A' as const) })), ...b.beats.map((x) => ({ ...x, part: 'B' as const }))],
    tasks: { ...a.tasks, ...b.tasks },
  };
}
