// A1 — Chromosome primer (SC.HS.6.1.d). Sequencing: explicit first.
// Tasks are generic (engine/tasks); this module supplies the explain scenes.
import type { BeatModule } from '../../engine/types';
import { zoomLadder } from './zoomLadder';
import { pairsScene, replicateScene } from './scenes';

const module: BeatModule = {
  scenes: {
    'zoom-ladder': zoomLadder,
    pairs: pairsScene,
    replicate: replicateScene,
  },
};

export default module;
export const scenes = module.scenes;
