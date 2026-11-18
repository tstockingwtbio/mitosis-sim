// B7 — Epilogue (optional, teacher-led). Fig is technically her own aunt;
// the life cycle now has both halves filled in. Biology only (see the
// teacher notes: the human case is kept to the biology).
import { storyScene } from '../../engine/stage/story';
import { lifeCycleScene } from '../A-end-hook/index';
import type { BeatModule } from '../../engine/types';

const module: BeatModule = { scenes: { story: storyScene, lifecycle: lifeCycleScene } };
export default module;
export const scenes = module.scenes;
