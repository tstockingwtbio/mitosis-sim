// Writes beat A3 (Build a body) into partA.json and its English text into en.json.
// Run once: node scripts/content/a3.mjs
import fs from 'node:fs';

const cp = 'src/content/partA.json';
const ep = 'src/i18n/en.json';
const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
const en = JSON.parse(fs.readFileSync(ep, 'utf8'));
const STD = 'SC.HS.6.1.d';
const B = (building, beginning) => ({ building, beginning });
const base = (id, phase, kind) => ({ id, beat: 'A3', standard: STD, phase, status: 'draft', kind });

const switchFb = (correct) => [
  { when: 'correct', text: correct },
  { when: { switch: 'none' }, misconception: 'undecided-is-done', text: 'A3.fb.none' },
  { when: { switch: 'wrong' }, misconception: 'genes-added', text: 'A3.fb.wrong' },
  { when: { switch: 'extra' }, misconception: 'all-genes-on', text: 'A3.fb.extra' },
];

const beat = c.beats.find((b) => b.id === 'A3');
Object.assign(beat, {
  built: true,
  sequencing: 'attempt-first',
  steps: [
    { id: 'A3-s01', type: 'retrieve', tasks: ['A3-R1', 'A3-R2', 'A3-R3', 'A3-R4'] },
    { id: 'A3-s02', type: 'explain', scene: 'stump', title: 'A3.stump.title', body: ['A3.stump.body1', 'A3.stump.body2'], lines: ['VO-A12'] },
    { id: 'A3-s03', type: 'task', task: 'A3-T1' },
    { id: 'A3-s04', type: 'explain', scene: 'three-cells', title: 'A3.trick.title', body: ['A3.trick.body1', 'A3.trick.body2'], lines: ['VO-A13'], sfx: ['SFX-13', 'SFX-14'] },
    { id: 'A3-s05', type: 'task', task: 'A3-G1' },
    { id: 'A3-s06', type: 'task', task: 'A3-I1' },
    { id: 'A3-s07', type: 'task', task: 'A3-I2' },
    { id: 'A3-s08', type: 'explain', scene: 'regrow', title: 'A3.regrow.title', body: ['A3.regrow.body'], lines: [], panels: [{ asset: 'IMG-C03' }], assets: ['IMG-C03'], sfx: ['SFX-20'] },
    { id: 'A3-s09', type: 'task', task: 'A3-P1' },
    { id: 'A3-s10', type: 'intro', title: 'A3.check.title', body: ['A3.check.body'] },
    { id: 'A3-s11', type: 'task', task: 'A3-C1' },
    { id: 'A3-s12', type: 'task', task: 'A3-C2' },
    { id: 'A3-s13', type: 'task', task: 'A3-C3' },
    { id: 'A3-s14', type: 'summary', title: 'A3.end.title', body: ['A3.end.body1', 'A3.end.body2'] },
  ],
});

Object.assign(c.tasks, {
  'A3-R1': { ...base('A3-R1', 'retrieve', 'recall'), source: 'last-module', prompt: 'A3.R1.prompt', answer: 'A3.R1.answer' },
  'A3-R2': { ...base('A3-R2', 'retrieve', 'recall'), source: 'last-week', prompt: 'A3.R2.prompt', answer: 'A3.R2.answer' },
  'A3-R3': { ...base('A3-R3', 'retrieve', 'recall'), source: 'last-week', prompt: 'A3.R3.prompt', answer: 'A3.R3.answer' },
  'A3-R4': { ...base('A3-R4', 'retrieve', 'recall'), source: 'prior-unit', prompt: 'A3.R4.prompt', answer: 'A3.R4.answer' },
  'A3-T1': { ...base('A3-T1', 'attempt', 'switch'), target: 'bone', prompt: 'A3.T1.prompt', feedback: switchFb('A3.T1.fb.correct') },
  'A3-G1': {
    ...base('A3-G1', 'guided', 'switch'),
    target: 'muscle',
    prompt: 'A3.G1.prompt',
    worked: ['A3.G1.step1', 'A3.G1.step2'],
    hints: ['A3.hint1', 'A3.hint2'],
    feedback: switchFb('A3.G1.fb.correct'),
  },
  'A3-I1': { ...base('A3-I1', 'independent', 'switch'), target: 'skin', prompt: 'A3.I1.prompt', hints: ['A3.hint1', 'A3.hint2'], feedback: switchFb('A3.I1.fb.correct') },
  'A3-I2': {
    ...base('A3-I2', 'independent', 'choice'),
    prompt: 'A3.I2.prompt',
    goFurther: 'A3-I2-GF',
    hints: ['A3.I2.hint'],
    options: [
      { id: 'a', text: 'A3.I2.optDiffDna', misconception: 'different-dna-per-tissue', feedback: 'A3.I2.fbDiffDna' },
      { id: 'b', text: 'A3.I2.optSame', correct: true, feedback: 'A3.I2.fbSame' },
      { id: 'c', text: 'A3.I2.optLost', misconception: 'genes-lost', feedback: 'A3.I2.fbLost' },
      { id: 'd', text: 'A3.I2.optHalf', removable: true, misconception: 'mitosis-halves', feedback: 'A3.I2.fbHalf' },
    ],
  },
  'A3-I2-GF': {
    ...base('A3-I2-GF', 'independent', 'choice'),
    isGoFurther: true,
    prompt: 'A3.GF.prompt',
    hints: ['A3.GF.hint'],
    options: [
      { id: 'a', text: 'A3.GF.optGone', misconception: 'genes-lost', feedback: 'A3.GF.fbGone' },
      { id: 'b', text: 'A3.GF.optThere', correct: true, feedback: 'A3.GF.fbThere' },
      { id: 'c', text: 'A3.GF.optOther', misconception: 'different-dna-per-tissue', feedback: 'A3.GF.fbOther' },
      { id: 'd', text: 'A3.GF.optMutant', removable: true, misconception: 'genes-added', feedback: 'A3.GF.fbMutant' },
    ],
  },
  'A3-P1': { ...base('A3-P1', 'independent', 'predict'), prompt: 'A3.P1.prompt', showEarlier: 'A0-P1', frames: 'frame.revise', wordBank: 'bank.revise' },
  'A3-C1': {
    ...base('A3-C1', 'checkpoint', 'choice'),
    prompt: 'A3.C1.prompt',
    options: [
      { id: 'a', text: 'A3.C1.optLiverMore', misconception: 'genes-added', feedback: 'A3.C1.fbLiverMore' },
      { id: 'b', text: 'A3.C1.optDifferent', misconception: 'different-dna-per-tissue', feedback: 'A3.C1.fbDifferent' },
      { id: 'c', text: 'A3.C1.optSame', correct: true, feedback: 'A3.C1.fbSame' },
      { id: 'd', text: 'A3.C1.optNoGenes', misconception: 'genes-lost', feedback: 'A3.C1.fbNoGenes' },
    ],
  },
  'A3-C2': { ...base('A3-C2', 'checkpoint', 'switch'), target: 'skin', prompt: 'A3.C2.prompt', feedback: switchFb('A3.C2.fb.correct') },
  'A3-C3': {
    ...base('A3-C3', 'checkpoint', 'choice'),
    prompt: 'A3.C3.prompt',
    options: [
      { id: 'a', text: 'A3.C3.optSwitched', correct: true, feedback: 'A3.C3.fbSwitched' },
      { id: 'b', text: 'A3.C3.optMutation', misconception: 'genes-added', feedback: 'A3.C3.fbMutation' },
      { id: 'c', text: 'A3.C3.optFewer', misconception: 'genes-lost', feedback: 'A3.C3.fbFewer' },
      { id: 'd', text: 'A3.C3.optParent', misconception: 'different-dna-per-tissue', feedback: 'A3.C3.fbParent' },
    ],
  },
});

Object.assign(c.misconceptions, {
  'undecided-is-done': 'mis.undecidedIsDone',
  'genes-added': 'mis.genesAdded',
  'all-genes-on': 'mis.allGenesOn',
  'different-dna-per-tissue': 'mis.differentDnaPerTissue',
  'genes-lost': 'mis.genesLost',
});

Object.assign(en, {
  'A3.gene.bone': 'Bone gene',
  'A3.gene.muscle': 'Muscle gene',
  'A3.gene.skin': 'Skin gene',
  'A3.gene.bone.tab': 'bone',
  'A3.gene.muscle.tab': 'muscle',
  'A3.gene.skin.tab': 'skin',
  'A3.kind.undecided': 'Undecided cell',
  'A3.kind.mixed': 'Mixed-up cell',
  'A3.kind.bone': 'Bone cell',
  'A3.kind.muscle': 'Muscle cell',
  'A3.kind.skin': 'Skin cell',
  'A3.ui.nowA': 'This cell is now: {kind}.',
  'A3.ui.chromosomes': 'This cell\'s chromosomes',
  'A3.ui.everyCell': 'Every cell in the lump has these chromosomes',
  'A3.ui.sameDna': 'Same chromosomes in all three cells',

  'A3.R1.prompt': B('In a slice of a growing tail tip, why are more cells dividing than in an old tail?', 'Why are more cells dividing in a growing tail?'),
  'A3.R1.answer': 'The tip is still growing; the old tail has finished growing.',
  'A3.R2.prompt': B('After mitosis, how does the DNA in the two new cells compare with the parent?', 'How is the DNA in the new cells?'),
  'A3.R2.answer': 'It is the same: each new cell gets one copy of every chromosome.',
  'A3.R3.prompt': B('What is a gene?', 'What is a gene?'),
  'A3.R3.answer': 'A section of a chromosome: one "recipe" in the cookbook.',
  'A3.R4.prompt': B('Name two kinds of tissue in Fig\'s tail.', 'Name two tissues in Fig\'s tail.'),
  'A3.R4.answer': 'Any two of: skin, muscle, bone.',

  'A3.stump.title': 'A lump of undecided cells',
  'A3.stump.body1': B('At the stump, cells divide by mitosis and make a lump of new cells. Every one of them has exactly the same chromosomes.', 'New cells grow at the stump. They all have the same chromosomes.'),
  'A3.stump.body2': B('Look at the count strip: same information as the parent. So how do some become bone and others skin?', 'How can they become different?'),

  'A3.T1.prompt': B('Here is one cell from the lump. Try to make it into a bone cell. Switch genes on and off, then check.', 'Make a bone cell. Switch genes on or off. Then check.'),
  'A3.T1.fb.correct': B('A bone cell: only the bone gene is switched on. The chromosomes did not change at all.', 'Bone cell! Only the bone gene is on.'),
  'A3.fb.none': B('No genes are switched on, so the cell is still undecided. Switch on the gene for the kind of cell you want.', 'Switch on a gene.'),
  'A3.fb.wrong': B('That gene makes a different kind of cell. Every cell has all three genes: choose which one to switch on.', 'That is a different gene.'),
  'A3.fb.extra': B('More than one gene is switched on, so the cell is mixed up. A finished cell uses only the genes for its own job.', 'Too many genes are on.'),

  'A3.trick.title': 'Same cookbook, different pages',
  'A3.trick.body1': B('Every cell in Fig has every gene. A bone cell switches on the bone gene; a muscle cell, the muscle gene; a skin cell, the skin gene.', 'Every cell has the same genes. Each kind of cell turns on different genes.'),
  'A3.trick.body2': B('Look at the chromosomes under each cell: they are identical. Only the switched-on gene (glowing) is different.', 'The chromosomes are the same. Only the glowing gene is different.'),

  'A3.G1.prompt': B('Make this cell into a muscle cell.', 'Make a muscle cell.'),
  'A3.G1.step1': B('Find the muscle gene and switch it on.', 'Switch on the muscle gene.'),
  'A3.G1.step2': B('Make sure the other genes are switched off, then check.', 'Switch the other genes off.'),
  'A3.hint1': B('Each kind of cell uses the gene for its own job.', 'Use the gene for the job.'),
  'A3.hint2': B('Only one tissue gene should be on. Switching a gene does not add or remove any DNA.', 'Only one gene on.'),
  'A3.G1.fb.correct': B('A muscle cell: same chromosomes, with the muscle gene switched on.', 'Muscle cell!'),
  'A3.I1.prompt': B('Make this cell into a skin cell, with Fig\'s orange colour.', 'Make a skin cell.'),
  'A3.I1.fb.correct': B('A skin cell. Three cell types so far, all from the same chromosomes.', 'Skin cell!'),

  'A3.I2.prompt': B('Compare the DNA in one of Fig\'s skin cells and one of her bone cells.', 'How is the DNA in a skin cell and a bone cell?'),
  'A3.I2.hint': B('Both cells came from the same lump, by mitosis.', 'Both came from the same cells.'),
  'A3.I2.optDiffDna': 'Different DNA: skin DNA and bone DNA',
  'A3.I2.optSame': 'The same DNA, with different genes switched on',
  'A3.I2.optLost': 'The skin cell lost its bone genes',
  'A3.I2.optHalf': 'Each has half of Fig\'s DNA',
  'A3.I2.fbDiffDna': B('Mitosis copies the DNA exactly, so every cell has the same DNA.', 'All cells have the same DNA.'),
  'A3.I2.fbSame': B('Same DNA in every cell; what differs is which genes are switched on.', 'Same DNA. Different genes on.'),
  'A3.I2.fbLost': B('The bone gene is still there in a skin cell, just switched off.', 'The gene is still there.'),
  'A3.I2.fbHalf': B('Mitosis gives every cell a full set.', 'Every cell has a full set.'),

  'A3.GF.prompt': B('Does a muscle cell in Fig\'s tail still have the skin gene?', 'Does a muscle cell have the skin gene?'),
  'A3.GF.hint': B('Think about what mitosis copies.', 'What does mitosis copy?'),
  'A3.GF.optGone': 'No, it was removed when the cell became muscle',
  'A3.GF.optThere': 'Yes, but it is switched off',
  'A3.GF.optOther': 'No, muscle cells have muscle DNA',
  'A3.GF.optMutant': 'Only if the cell has a mutation',
  'A3.GF.fbGone': B('Nothing is removed. The skin gene is still on the chromosome, switched off.', 'It is still there.'),
  'A3.GF.fbThere': B('Every cell keeps every gene. A muscle cell just doesn\'t use the skin gene.', 'Yes. It is switched off.'),
  'A3.GF.fbOther': B('All of Fig\'s cells have the same DNA.', 'All cells have the same DNA.'),
  'A3.GF.fbMutant': B('No mutation is needed: the gene is there in every cell.', 'Every cell has the gene.'),

  'A3.regrow.title': 'Rebuilding the tail',
  'A3.regrow.body': B('Mitosis made enough cells; switching genes on made them bone, muscle and skin. Step through the regrowth again.', 'Mitosis makes the cells. Genes make them different.'),
  'A3.P1.prompt': B('In the cold open, you predicted where Fig\'s body got the instructions to build a new tail. Read your prediction. What would you change or add now?', 'Read your idea. What do you know now?'),
  'ui.predict.earlier': 'Your earlier prediction',
  'ui.predict.noEarlier': '(No prediction saved.)',
  'frame.revise': B('Now I think the instructions came from ___, and the cells became different because ___.', 'The instructions are in the ___.'),
  'bank.revise': 'DNA, chromosomes, genes, mitosis, switched on, same',

  'A3.check.title': 'Checkpoint',
  'A3.check.body': B('Three questions about how cells become different. Show what you know on your own: hints are off.', 'Three questions. Work on your own.'),
  'A3.C1.prompt': B('A person\'s liver cell and nerve cell look and act very differently. Which is true about their genes?', 'A liver cell and a nerve cell. Which is true?'),
  'A3.C1.optLiverMore': 'The liver cell has extra genes the nerve cell does not',
  'A3.C1.optDifferent': 'They have completely different DNA',
  'A3.C1.optSame': 'They have the same genes, but use different ones',
  'A3.C1.optNoGenes': 'The nerve cell has no genes left',
  'A3.C1.fbLiverMore': B('Every cell has the same genes; none gets extra.', 'Same genes.'),
  'A3.C1.fbDifferent': B('Cells in one body have the same DNA, made by mitosis.', 'Same DNA.'),
  'A3.C1.fbSame': B('Same genes in both; each switches on the ones for its job.', 'Same genes. Different ones on.'),
  'A3.C1.fbNoGenes': B('Every cell keeps all its genes.', 'Every cell keeps its genes.'),
  'A3.C2.prompt': B('Make this cell into a skin cell.', 'Make a skin cell.'),
  'A3.C2.fb.correct': B('Skin gene on, the others off.', 'Skin cell!'),
  'A3.C3.prompt': B('Why is a muscle cell not a skin cell?', 'Why is a muscle cell not a skin cell?'),
  'A3.C3.optSwitched': 'It has the muscle gene switched on and the skin gene switched off',
  'A3.C3.optMutation': 'A mutation turned its skin gene into a muscle gene',
  'A3.C3.optFewer': 'It has fewer chromosomes than a skin cell',
  'A3.C3.optParent': 'It came from a different parent cell with different DNA',
  'A3.C3.fbSwitched': B('Same genes, different ones switched on.', 'Different genes are on.'),
  'A3.C3.fbMutation': B('No mutation is needed: both genes are in every cell.', 'Every cell has both genes.'),
  'A3.C3.fbFewer': B('Mitosis gives every cell the same chromosomes.', 'Same chromosomes.'),
  'A3.C3.fbParent': B('All the cells came from the same lump, with the same DNA.', 'Same DNA.'),

  'A3.end.title': 'Build a body: done',
  'A3.end.body1': B('Every cell has the same DNA, copied by mitosis. Cells become bone, muscle or skin by switching on different genes.', 'Same DNA in every cell. Different genes are on.'),
  'A3.end.body2': B('That is how Fig rebuilt her tail. Next: where this model is wrong.', 'Next: what this model leaves out.'),

  'mis.undecidedIsDone': 'A cell with no tissue genes switched on is finished.',
  'mis.genesAdded': 'A cell becomes a new type by gaining new genes.',
  'mis.allGenesOn': 'A cell switches on all of its genes.',
  'mis.differentDnaPerTissue': 'Each kind of tissue has its own DNA.',
  'mis.genesLost': 'Cells lose the genes they don\'t use.',
});

fs.writeFileSync(cp, JSON.stringify(c, null, 2) + '\n');
fs.writeFileSync(ep, JSON.stringify(en, null, 2) + '\n');
console.log('A3 written');
