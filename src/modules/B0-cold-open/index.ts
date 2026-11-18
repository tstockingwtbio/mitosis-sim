// B0 — Cold open (SC.HS.9.4.b). Phenomenon first: six hatchlings, and a DNA
// test that says Fig is not their mother. Story panels between tasks only;
// the DNA profile tasks use the shared band renderer.
import { storyScene } from '../../engine/stage/story';
import a0 from '../A0-cold-open/index';
import type { BeatModule } from '../../engine/types';

const module: BeatModule = { scenes: { title: a0.scenes.title, story: storyScene } };
export default module;
export const scenes = module.scenes;
