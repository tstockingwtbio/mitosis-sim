// B1 — Retrieval (SC.HS.9.4.b). Spaced retrieval of Part A before the
// mystery is worked on: the evidence board, then free recall.
import { storyScene } from '../../engine/stage/story';
import type { BeatModule } from '../../engine/types';

const module: BeatModule = { scenes: { story: storyScene } };
export default module;
export const scenes = module.scenes;
