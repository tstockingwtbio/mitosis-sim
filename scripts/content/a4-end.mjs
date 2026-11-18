// Writes beats A4 (Model limits + checkpoint) and A-end (Hook) into partA.json
// and their English text into en.json. Run once: node scripts/content/a4-end.mjs
import fs from 'node:fs';

const cp = 'src/content/partA.json';
const ep = 'src/i18n/en.json';
const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
const en = JSON.parse(fs.readFileSync(ep, 'utf8'));
const STD = 'SC.HS.6.1.d';
const B = (building, beginning) => ({ building, beginning });
const base = (beat, id, phase, kind) => ({ id, beat, standard: STD, phase, status: 'draft', kind });
const rod = (id, pair, parent, length, alleles) => ({ id, pair, parent, state: 'unreplicated', length, alleles });

const a4 = c.beats.find((b) => b.id === 'A4');
Object.assign(a4, {
  built: true,
  sequencing: 'explicit-first',
  steps: [
    { id: 'A4-s01', type: 'retrieve', tasks: ['A4-R1', 'A4-R2', 'A4-R3', 'A4-R4'] },
    { id: 'A4-s02', type: 'explain', scene: 'limits', title: 'A4.limits.title', body: ['A4.limits.body1', 'A4.limits.body2'], lines: ['VO-A14'] },
    { id: 'A4-s03', type: 'task', task: 'A4-L1' },
    { id: 'A4-s04', type: 'task', task: 'A4-L2' },
    { id: 'A4-s05', type: 'intro', title: 'A4.check.title', body: ['A4.check.body1', 'A4.check.body2'] },
    { id: 'A4-s06', type: 'task', task: 'A4-C1' },
    { id: 'A4-s07', type: 'task', task: 'A4-C2' },
    { id: 'A4-s08', type: 'task', task: 'A4-C3' },
    { id: 'A4-s09', type: 'task', task: 'A4-C4' },
    { id: 'A4-s10', type: 'task', task: 'A4-C5' },
    { id: 'A4-s11', type: 'summary', title: 'A4.end.title', body: ['A4.end.body1', 'A4.end.body2'] },
  ],
});

const choice = (beat, id, phase, prefix, opts) => ({
  ...base(beat, id, phase, 'choice'),
  prompt: `${prefix}.prompt`,
  options: opts.map(([oid, key, mis, correct]) => ({ id: oid, text: `${prefix}.opt${key}`, feedback: `${prefix}.fb${key}`, ...(correct ? { correct: true } : { misconception: mis }) })),
});

Object.assign(c.tasks, {
  'A4-R1': { ...base('A4', 'A4-R1', 'retrieve', 'recall'), source: 'last-module', prompt: 'A4.R1.prompt', answer: 'A4.R1.answer' },
  'A4-R2': { ...base('A4', 'A4-R2', 'retrieve', 'recall'), source: 'last-week', prompt: 'A4.R2.prompt', answer: 'A4.R2.answer' },
  'A4-R3': { ...base('A4', 'A4-R3', 'retrieve', 'recall'), source: 'last-week', prompt: 'A4.R3.prompt', answer: 'A4.R3.answer' },
  'A4-R4': { ...base('A4', 'A4-R4', 'retrieve', 'recall'), source: 'last-week', prompt: 'A4.R4.prompt', answer: 'A4.R4.answer' },
  'A4-L1': {
    ...choice('A4', 'A4-L1', 'independent', 'A4.L1', [
      ['a', 'More', null, true],
      ['b', 'NoCopy', 'divide-without-copy'],
      ['c', 'Labels', 'labels-are-real'],
      ['d', 'Half', 'mitosis-halves'],
    ]),
    hints: ['A4.L1.hint'],
  },
  'A4-L2': {
    ...choice('A4', 'A4-L2', 'independent', 'A4.L2', [
      ['a', 'Same', 'phases-equal'],
      ['b', 'Random', null, true],
      ['c', 'Fast', 'more-cells-faster'],
      ['d', 'Rest', 'interphase-resting'],
    ]),
    hints: ['A4.L2.hint'],
  },
  'A4-C1': {
    ...base('A4', 'A4-C1', 'checkpoint', 'divide'),
    prompt: 'A4.C1.prompt',
    cell: { chromosomes: [rod('3P', 3, 'P', 'short', ['k']), rod('1M', 1, 'M', 'long', ['H']), rod('2P', 2, 'P', 'medium', ['J']), rod('3M', 3, 'M', 'short', ['K']), rod('1P', 1, 'P', 'long', ['h']), rod('2M', 2, 'M', 'medium', ['j'])] },
    feedback: [
      { when: 'correct', text: 'A4.C1.fb.correct' },
      { when: { divide: 'missing' }, misconception: 'divide-without-copy', text: 'A2.fb.missing' },
      { when: { divide: 'extra' }, misconception: 'both-halves-one-cell', text: 'A2.fb.extra' },
      { when: { divide: 'mixed' }, misconception: 'split-by-parent', text: 'A2.fb.mixed' },
    ],
  },
  'A4-C2': choice('A4', 'A4-C2', 'checkpoint', 'A4.C2', [
    ['a', 'Half', 'mitosis-halves'],
    ['b', 'Neighbour', null, true],
    ['c', 'New', 'genes-added'],
    ['d', 'Blood', 'different-dna-per-tissue'],
  ]),
  'A4-C3': choice('A4', 'A4-C3', 'checkpoint', 'A4.C3', [
    ['a', 'Lost', 'genes-lost'],
    ['b', 'Diff', 'different-dna-per-tissue'],
    ['c', 'Switched', null, true],
    ['d', 'Sun', 'genes-added'],
  ]),
  'A4-C4': choice('A4', 'A4-C4', 'checkpoint', 'A4.C4', [
    ['a', 'X', null, true],
    ['b', 'Y', 'more-cells-faster'],
    ['c', 'Same', 'phases-equal'],
    ['d', 'Neither', 'interphase-resting'],
  ]),
  'A4-C5': { ...base('A4', 'A4-C5', 'checkpoint', 'predict'), prompt: 'A4.C5.prompt' },
});

Object.assign(c.misconceptions, { 'labels-are-real': 'mis.labelsAreReal' });

const aend = c.beats.find((b) => b.id === 'A-end');
Object.assign(aend, {
  built: true,
  kind: 'observe',
  sequencing: 'phenomenon-first',
  steps: [
    { id: 'Aend-s01', type: 'explain', scene: 'lifecycle', title: 'A-end.title', body: ['A-end.body1', 'A-end.body2'], lines: ['VO-A15'] },
    { id: 'Aend-s02', type: 'summary', title: 'A-end.done.title', body: ['A-end.done.body1', 'A-end.done.body2'] },
  ],
});

const rows = {
  chromosomes: ['Fig has 2 pairs of chromosomes (4 in all).', 'Real newts have many more: often a dozen pairs or more.'],
  drag: ['You decide when a cell copies and divides.', 'Real cells copy and divide on their own, controlled by the body.'],
  labels: ['Chromosomes are coloured, striped and labelled M and P.', 'Real chromosomes have no colours or labels; scientists stain them to see them.'],
  timing: ['Share of cells = share of time.', 'This only works if cells divide at random, independent times.'],
  genes: ['Three genes, switched on or off.', 'Real cells use thousands of genes, turned up and down in many steps.'],
  cycle: ['Every cycle takes 24 hours.', 'A round number for the maths. Real cycle lengths vary by species and tissue.'],
};

Object.assign(en, {
  'A4.limits.heading': 'Where this model is wrong',
  'A4.limits.model': 'In our model',
  'A4.limits.real': 'In a real newt',
  'A4.limits.title': 'A confession',
  'A4.limits.body1': B('Every model leaves things out. The card shows what ours simplifies, and what is really true.', 'Our model is simple. Real cells are more complex.'),
  'A4.limits.body2': B('Leaving things out is what makes a model useful: it shows the main idea clearly. The trick is knowing what was left out.', 'Models leave things out on purpose.'),

  'A4.R1.prompt': B('An X-shaped chromosome: how many chromosomes, and how many DNA molecules?', 'One X: how many chromosomes? How many DNA molecules?'),
  'A4.R1.answer': 'One chromosome, two DNA molecules.',
  'A4.R2.prompt': B('What does mitosis make?', 'What does mitosis make?'),
  'A4.R2.answer': 'Two new cells with the same DNA as the parent.',
  'A4.R3.prompt': B('Why do most cells on a slide look like they are in interphase?', 'Why are most cells in interphase?'),
  'A4.R3.answer': 'Cells spend most of their cycle in interphase, growing and copying their DNA.',
  'A4.R4.prompt': B('How can a bone cell and a skin cell have the same DNA but be different?', 'How can cells with the same DNA be different?'),
  'A4.R4.answer': 'They switch on different genes.',

  'A4.L1.prompt': B('Which is a real way our model newt is different from a real newt?', 'How is our model different from a real newt?'),
  'A4.L1.hint': B('Look at the first row of the card.', 'Look at the card.'),
  'A4.L1.optMore': 'Real newts have many more chromosomes',
  'A4.L1.optNoCopy': 'Real cells divide without copying',
  'A4.L1.optLabels': 'Real chromosomes are labelled M and P',
  'A4.L1.optHalf': 'Real mitosis halves the chromosomes',
  'A4.L1.fbMore': B('Our newt has 4 to keep the counting simple; real newts have many more.', 'Real newts have more.'),
  'A4.L1.fbNoCopy': B('Real cells copy their chromosomes before mitosis too; the model got that part right.', 'Real cells copy first too.'),
  'A4.L1.fbLabels': B('The labels are a model trick. Real chromosomes are not coloured or labelled.', 'Labels are only in the model.'),
  'A4.L1.fbHalf': B('Real mitosis keeps the full set, just like the model.', 'Mitosis keeps the full set.'),
  'A4.L2.prompt': B('"Share of cells = share of time" only works if which is true?', 'When does "share of cells = share of time" work?'),
  'A4.L2.hint': B('Look at the timing row of the card.', 'Look at the card.'),
  'A4.L2.optSame': 'Every phase takes the same time',
  'A4.L2.optRandom': 'Cells divide at random, independent times',
  'A4.L2.optFast': 'Phases with more cells are faster',
  'A4.L2.optRest': 'Cells rest during interphase',
  'A4.L2.fbSame': B('If phases took the same time, the counts would be equal; the method is for when they differ.', 'Phases take different times.'),
  'A4.L2.fbRandom': B('If cells were in step with each other, a slide would catch them all in one phase.', 'Cells must divide at different times.'),
  'A4.L2.fbFast': B('More cells means a longer phase, not a faster one.', 'More cells means longer.'),
  'A4.L2.fbRest': B('Interphase cells are busy, and that is not what makes the method work.', 'Interphase cells are busy.'),

  'A4.check.title': 'Unit checkpoint',
  'A4.check.body1': B('Five questions about new situations. Show what you know on your own: hints, worked steps and sentence starters are off.', 'Five questions. Work on your own.'),
  'A4.check.body2': B('Your first answer counts. The last question asks you to explain in your own words; your teacher will read it.', 'Your first answer counts.'),
  'A4.C1.prompt': B('This cell comes from a sea star\'s arm, which is regrowing. Divide it so both new cells match the parent.', 'Divide this cell. Both new cells must match the parent.'),
  'A4.C1.fb.correct': B('Both new cells match the parent.', 'Both cells match.'),
  'A4.C2.prompt': B('You cut your finger. New skin cells fill the cut. How does their DNA compare with the skin cells next to the cut?', 'New skin cells fill a cut. How is their DNA?'),
  'A4.C2.optHalf': 'They have half as much DNA',
  'A4.C2.optNeighbour': 'The same DNA as the cells next to them',
  'A4.C2.optNew': 'New genes for healing were added',
  'A4.C2.optBlood': 'They copy DNA from the blood',
  'A4.C2.fbHalf': B('Mitosis gives each new cell a full set.', 'Each cell gets a full set.'),
  'A4.C2.fbNeighbour': B('The new cells were made by mitosis, so they have the same DNA.', 'Same DNA. Mitosis made them.'),
  'A4.C2.fbNew': B('No genes are added; healing uses the genes every cell already has.', 'No new genes.'),
  'A4.C2.fbBlood': B('Each new cell gets its DNA by mitosis from the cell that divided.', 'DNA comes from mitosis.'),
  'A4.C3.prompt': B('A plant\'s root cells and leaf cells look very different. Which is the best explanation?', 'Root cells and leaf cells look different. Why?'),
  'A4.C3.optLost': 'Root cells lost their leaf genes',
  'A4.C3.optDiff': 'Roots and leaves have different DNA',
  'A4.C3.optSwitched': 'They have the same genes, but different genes are switched on',
  'A4.C3.optSun': 'Sunlight adds new genes to the leaves',
  'A4.C3.fbLost': B('Root cells keep every gene; the leaf genes are switched off.', 'The genes are still there.'),
  'A4.C3.fbDiff': B('A plant\'s cells all have the same DNA, made by mitosis.', 'Same DNA.'),
  'A4.C3.fbSwitched': B('Same genes everywhere; root and leaf cells switch on different ones.', 'Different genes are on.'),
  'A4.C3.fbSun': B('Light does not add genes; leaf cells use genes they already have.', 'No new genes.'),
  'A4.C4.prompt': B('Two skin slides: slide X, from a healing wound, has 14 of 36 cells dividing; slide Y, from healthy skin, has 2 of 36. Which came from the part that is growing faster?', 'Slide X has 14 dividing cells. Slide Y has 2. Which is growing faster?'),
  'A4.C4.optX': 'Slide X',
  'A4.C4.optY': 'Slide Y',
  'A4.C4.optSame': 'Both are growing at the same rate',
  'A4.C4.optNeither': 'Neither; skin cells only rest',
  'A4.C4.fbX': B('More dividing cells means more mitosis, so faster growth: healing tissue.', 'More dividing cells: faster growth.'),
  'A4.C4.fbY': B('Fewer dividing cells means slower growth.', 'Fewer dividing cells: slower.'),
  'A4.C4.fbSame': B('The counts are very different, so the growth is too.', 'The counts are different.'),
  'A4.C4.fbNeither': B('Skin cells divide all the time to replace old ones, faster in a wound.', 'Skin cells divide.'),
  'A4.C5.prompt': B('In your own words: how can a body rebuild a lost part, like Fig\'s tail? Use the words mitosis, DNA and genes.', 'How does a body grow back a part? Use: mitosis, DNA, genes.'),

  'A4.end.title': 'Unit checkpoint: done',
  'A4.end.body1': B('You used a model of chromosomes, mitosis and gene switches to explain how a body grows and repairs itself.', 'You used a model to explain growth and repair.'),
  'A4.end.body2': B('Models leave things out; knowing what they leave out is part of using them well.', 'Models leave things out.'),

  'A-end.title': 'Breeding season',
  'A-end.body1': B('Mitosis builds and repairs Fig, and every cell it makes has the same DNA. The life cycle shows where that happens.', 'Mitosis makes all of Fig\'s body cells. They have the same DNA.'),
  'A-end.body2': B('The grey half (making eggs and sperm, and fertilisation) is Part B. Something about it is going to surprise everyone.', 'The grey part comes next, in Part B.'),
  'A-end.cycle.adult': 'Adult newt',
  'A-end.cycle.gametes': 'Eggs and sperm',
  'A-end.cycle.zygote': 'Fertilised egg',
  'A-end.cycle.hatchling': 'Hatchling',
  'A-end.cycle.growth': 'Growing newt',
  'A-end.cycle.mitosis': 'Mitosis',
  'A-end.cycle.meiosis': 'Meiosis',
  'A-end.cycle.fertilisation': 'Fertilisation',
  'A-end.cycle.partB': 'Coming in Part B',
  'A-end.done.title': 'Part A: done',
  'A-end.done.body1': B('Every cell in Fig\'s body has the same DNA: mitosis copies it faithfully, and genes switched on or off make bone, muscle and skin.', 'Every cell in Fig has the same DNA.'),
  'A-end.done.body2': B('Hold that thought. In Part B, a DNA test says Fig is not the mother of her own hatchlings.', 'In Part B: a surprise about Fig\'s babies.'),

  'mis.labelsAreReal': 'Real chromosomes come labelled and coloured.',
});
for (const [k, [m, r]] of Object.entries(rows)) {
  en[`A4.limits.${k}.model`] = m;
  en[`A4.limits.${k}.real`] = r;
}

fs.writeFileSync(cp, JSON.stringify(c, null, 2) + '\n');
fs.writeFileSync(ep, JSON.stringify(en, null, 2) + '\n');
console.log('A4 and A-end written');
