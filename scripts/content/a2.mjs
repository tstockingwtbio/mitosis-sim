// Writes beat A2 (Copy a cell) into partA.json and its English text into en.json.
// Run once: node scripts/content/a2.mjs
import fs from 'node:fs';

const cp = 'src/content/partA.json';
const ep = 'src/i18n/en.json';
const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
const en = JSON.parse(fs.readFileSync(ep, 'utf8'));
const STD = 'SC.HS.6.1.d';

const rod = (id, pair, parent, length, alleles) => ({ id, pair, parent, state: 'unreplicated', length, alleles });
const fig = [rod('1M', 1, 'M', 'long', ['A', 'D']), rod('1P', 1, 'P', 'long', ['a', 'D']), rod('2M', 2, 'M', 'short', ['B']), rod('2P', 2, 'P', 'short', ['b'])];
const fig2 = [rod('2P', 2, 'P', 'short', ['b']), rod('1M', 1, 'M', 'long', ['A', 'D']), rod('2M', 2, 'M', 'short', ['B']), rod('1P', 1, 'P', 'long', ['a', 'D'])];
const other = [
  rod('1M', 1, 'M', 'long', ['E']), rod('3P', 3, 'P', 'short', ['g']), rod('2M', 2, 'M', 'medium', ['F']),
  rod('1P', 1, 'P', 'long', ['e']), rod('2P', 2, 'P', 'medium', ['F']), rod('3M', 3, 'M', 'short', ['G']),
];

const divideFb = (correct) => [
  { when: 'correct', text: correct },
  { when: { divide: 'missing' }, misconception: 'divide-without-copy', text: 'A2.fb.missing' },
  { when: { divide: 'extra' }, misconception: 'both-halves-one-cell', text: 'A2.fb.extra' },
  { when: { divide: 'mixed' }, misconception: 'split-by-parent', text: 'A2.fb.mixed' },
];

const beat = c.beats.find((b) => b.id === 'A2');
Object.assign(beat, {
  built: true,
  sequencing: 'attempt-first',
  steps: [
    { id: 'A2-s01', type: 'retrieve', tasks: ['A2-R1', 'A2-R2', 'A2-R3', 'A2-R4'] },
    { id: 'A2-s02', type: 'explain', scene: 'parent', title: 'A2.intro.title', body: ['A2.intro.body1', 'A2.intro.body2'], lines: ['VO-A09'], cell: { chromosomes: fig } },
    { id: 'A2-s03', type: 'task', task: 'A2-T1' },
    { id: 'A2-s04', type: 'explain', scene: 'mitosis', title: 'A2.mitosis.title', body: ['A2.mitosis.body1', 'A2.mitosis.body2', 'A2.mitosis.body3'], lines: ['VO-A11'], sfx: ['SFX-11', 'SFX-12'], cell: { chromosomes: fig } },
    { id: 'A2-s05', type: 'task', task: 'A2-G1' },
    { id: 'A2-s06', type: 'task', task: 'A2-I1' },
    { id: 'A2-s07', type: 'task', task: 'A2-I2' },
    { id: 'A2-s08', type: 'intro', title: 'A2.check.title', body: ['A2.check.body'] },
    { id: 'A2-s09', type: 'task', task: 'A2-C1' },
    { id: 'A2-s10', type: 'task', task: 'A2-C2' },
    { id: 'A2-s11', type: 'task', task: 'A2-C3' },
    { id: 'A2-s12', type: 'summary', title: 'A2.end.title', body: ['A2.end.body1', 'A2.end.body2'] },
  ],
});

const base = (id, phase, kind) => ({ id, beat: 'A2', standard: STD, phase, status: 'draft', kind });
Object.assign(c.tasks, {
  'A2-R1': { ...base('A2-R1', 'retrieve', 'recall'), source: 'last-module', prompt: 'A2.R1.prompt', answer: 'A2.R1.answer' },
  'A2-R2': { ...base('A2-R2', 'retrieve', 'recall'), source: 'last-module', prompt: 'A2.R2.prompt', answer: 'A2.R2.answer' },
  'A2-R3': { ...base('A2-R3', 'retrieve', 'recall'), source: 'last-module', prompt: 'A2.R3.prompt', answer: 'A2.R3.answer' },
  'A2-R4': { ...base('A2-R4', 'retrieve', 'recall'), source: 'prior-unit', prompt: 'A2.R4.prompt', answer: 'A2.R4.answer' },
  'A2-T1': { ...base('A2-T1', 'attempt', 'divide'), prompt: 'A2.T1.prompt', cell: { chromosomes: fig }, feedback: divideFb('A2.T1.fb.correct') },
  'A2-G1': {
    ...base('A2-G1', 'guided', 'divide'),
    prompt: 'A2.G1.prompt',
    worked: ['A2.G1.step1', 'A2.G1.step2', 'A2.G1.step3'],
    hints: ['A2.hint1', 'A2.hint2'],
    frames: 'frame.divide',
    wordBank: 'bank.divide',
    cell: { chromosomes: fig2 },
    feedback: divideFb('A2.G1.fb.correct'),
  },
  'A2-I1': {
    ...base('A2-I1', 'independent', 'divide'),
    prompt: 'A2.I1.prompt',
    goFurther: 'A2-I1-GF',
    hints: ['A2.hint1', 'A2.hint2'],
    frames: 'frame.divide',
    wordBank: 'bank.divide',
    cell: { chromosomes: other },
    feedback: divideFb('A2.I1.fb.correct'),
  },
  'A2-I1-GF': {
    ...base('A2-I1-GF', 'independent', 'choice'),
    isGoFurther: true,
    prompt: 'A2.GF.prompt',
    hints: ['A2.GF.hint'],
    options: [
      { id: 'a', text: 'A2.GF.opt23', misconception: 'mitosis-halves', feedback: 'A2.GF.fb23' },
      { id: 'b', text: 'A2.GF.opt92', misconception: 'copy-doubles-chromosomes', feedback: 'A2.GF.fb92' },
      { id: 'c', text: 'A2.GF.opt46', correct: true, feedback: 'A2.GF.fb46' },
      { id: 'd', text: 'A2.GF.opt46diff', removable: true, misconception: 'daughters-differ', feedback: 'A2.GF.fb46diff' },
    ],
  },
  'A2-I2': {
    ...base('A2-I2', 'independent', 'choice'),
    prompt: 'A2.I2.prompt',
    hints: ['A2.I2.hint'],
    options: [
      { id: 'a', text: 'A2.I2.optNoCopy', misconception: 'divide-without-copy', feedback: 'A2.I2.fbNoCopy' },
      { id: 'b', text: 'A2.I2.optBoth', correct: true, feedback: 'A2.I2.fbBoth' },
      { id: 'c', text: 'A2.I2.optExtraCopy', removable: true, misconception: 'copy-doubles-chromosomes', feedback: 'A2.I2.fbExtraCopy' },
      { id: 'd', text: 'A2.I2.optNormal', misconception: 'daughters-differ', feedback: 'A2.I2.fbNormal' },
    ],
  },
  'A2-C1': { ...base('A2-C1', 'checkpoint', 'divide'), prompt: 'A2.C1.prompt', cell: { chromosomes: other.slice().reverse() }, feedback: divideFb('A2.C1.fb.correct') },
  'A2-C2': {
    ...base('A2-C2', 'checkpoint', 'choice'),
    prompt: 'A2.C2.prompt',
    options: [
      { id: 'a', text: 'A2.C2.optHalf', misconception: 'mitosis-halves', feedback: 'A2.C2.fbHalf' },
      { id: 'b', text: 'A2.C2.optDiffer', misconception: 'daughters-differ', feedback: 'A2.C2.fbDiffer' },
      { id: 'c', text: 'A2.C2.optDouble', misconception: 'copy-doubles-chromosomes', feedback: 'A2.C2.fbDouble' },
      { id: 'd', text: 'A2.C2.optSame', correct: true, feedback: 'A2.C2.fbSame' },
    ],
  },
  'A2-C3': {
    ...base('A2-C3', 'checkpoint', 'choice'),
    prompt: 'A2.C3.prompt',
    options: [
      { id: 'a', text: 'A2.C3.opt6and6', correct: true, feedback: 'A2.C3.fb6and6' },
      { id: 'b', text: 'A2.C3.opt3and6', misconception: 'mitosis-halves', feedback: 'A2.C3.fb3and6' },
      { id: 'c', text: 'A2.C3.opt6and12', misconception: 'daughters-keep-x', feedback: 'A2.C3.fb6and12' },
      { id: 'd', text: 'A2.C3.opt12and12', misconception: 'x-is-two-chromosomes', feedback: 'A2.C3.fb12and12' },
    ],
  },
});

Object.assign(c.misconceptions, {
  'divide-without-copy': 'mis.divideWithoutCopy',
  'both-halves-one-cell': 'mis.bothHalvesOneCell',
  'split-by-parent': 'mis.splitByParent',
  'mitosis-halves': 'mis.mitosisHalves',
  'daughters-differ': 'mis.daughtersDiffer',
  'daughters-keep-x': 'mis.daughtersKeepX',
});

const B = (building, beginning) => ({ building, beginning });
Object.assign(en, {
  'A2.cell.parent': 'Parent cell',
  'A2.cell.one': 'New cell 1',
  'A2.cell.two': 'New cell 2',
  'A2.ui.copy': 'Copy the chromosomes',
  'A2.ui.toOne': 'Put in new cell 1',
  'A2.ui.toTwo': 'Put in new cell 2',
  'A2.ui.reset': 'Start again',
  'A2.ui.divide': 'Divide the cell',
  'A2.ui.left': '{n} left in the parent cell. Select one.',
  'A2.ui.pickCell': 'Now choose new cell 1 or new cell 2.',
  'A2.ui.ready': 'The parent cell is empty. Divide the cell.',
  'A2.ui.divided': 'Divided. Compare each new cell with the parent.',
  'A2.ui.show': 'Show {name}',

  'A2.R1.prompt': B('How many DNA molecules are in one X-shaped chromosome?', 'One X has how many DNA molecules?'),
  'A2.R1.answer': 'Two: one in each half of the X.',
  'A2.R2.prompt': B('Where do the two chromosomes in a pair come from?', 'Where does each chromosome in a pair come from?'),
  'A2.R2.answer': 'One from the mother and one from the father.',
  'A2.R3.prompt': B('What is a gene?', 'What is a gene?'),
  'A2.R3.answer': 'A section of a chromosome.',
  'A2.R4.prompt': B('Name one reason a living thing needs to make new cells.', 'Why does a body make new cells?'),
  'A2.R4.answer': 'To grow, to repair damage (like Fig\'s tail), or to replace old cells.',

  'A2.intro.title': 'Your turn: copy a cell',
  'A2.intro.body1': B('Fig\'s tail grows back because cells divide: one cell becomes two. Each new cell needs exactly what the parent cell had.', 'One cell becomes two. Each new cell needs all the chromosomes.'),
  'A2.intro.body2': B('Next, try it your way. You can copy the chromosomes first, or not. Mistakes are fine: you will see what happens.', 'Try it your way. Mistakes are OK.'),

  'A2.T1.prompt': B('Give each new cell everything the parent cell had. Select a chromosome, then a new cell. When the parent cell is empty, divide it.', 'Move the chromosomes into the new cells. Then divide.'),
  'A2.T1.fb.correct': B('Both new cells match the parent. How did you get there? Next, watch how real cells do it.', 'Both new cells match the parent.'),

  'A2.fb.missing': B('A new cell is missing a chromosome. Without copying first, there is only one of each chromosome to share, so one cell has to go without.', 'A new cell is missing a chromosome. Copy first.'),
  'A2.fb.extra': B('A new cell has an extra chromosome, and the other is missing it. Both halves of one X went to the same cell: send one half to each.', 'One cell got both halves of an X. Send one half to each cell.'),
  'A2.fb.mixed': B('The new cells don\'t match the parent: some chromosomes are doubled and some are missing. Each new cell needs one copy of every chromosome.', 'Each new cell needs one of every chromosome.'),

  'A2.mitosis.title': 'How a cell copies itself',
  'A2.mitosis.body1': B('Step through and watch the count strip. First, every chromosome is copied: each one becomes an X, with two identical halves.', 'First, the cell copies every chromosome.'),
  'A2.mitosis.body2': B('Then the Xs line up, and fibres pull the two halves of every X to opposite ends. One half of each X goes to each new cell.', 'Then each X is pulled apart. One half goes to each new cell.'),
  'A2.mitosis.body3': B('That is why the copy comes first: without it, there would be only one of each chromosome to share. This whole process is called mitosis.', 'This is called mitosis. The two new cells are the same as the parent.'),
  'A2.mitosis.s0': 'The parent cell',
  'A2.mitosis.s1': 'Copy every chromosome',
  'A2.mitosis.s2': 'Line up in the middle',
  'A2.mitosis.s3': 'Pull the halves apart',
  'A2.mitosis.s4': 'Two new cells',

  'A2.G1.prompt': B('Now divide this cell the way real cells do. Copy first, then send one half of each X to each new cell.', 'Copy first. Then send one half of each X to each cell.'),
  'A2.G1.step1': B('Press "Copy the chromosomes". Every chromosome becomes an X.', 'Copy the chromosomes.'),
  'A2.G1.step2': B('Select an X and put it in new cell 1: one half goes there, and the other half stays to be placed.', 'Put one half of the X in new cell 1.'),
  'A2.G1.step3': B('Put that other half in new cell 2. Do the same for every X, then divide.', 'Put the other half in new cell 2.'),
  'A2.hint1': B('Copy before you divide: each new cell needs its own copy of every chromosome.', 'Copy first.'),
  'A2.hint2': B('Each X gives one half to each new cell. Never send both halves to the same cell.', 'One half to each cell.'),
  'A2.G1.fb.correct': B('Each new cell has one copy of every chromosome: the same information as the parent.', 'Both cells are the same as the parent.'),
  'frame.divide': B('Each new cell has the same chromosomes as the parent because ___.', 'Each new cell has ___ chromosomes.'),
  'bank.divide': 'copy, X, half, each, same, mitosis',

  'A2.I1.prompt': B('This cell is from a different animal, with three pairs. Divide it so both new cells match the parent.', 'Divide this cell. Both new cells must match the parent.'),
  'A2.I1.fb.correct': B('Six chromosomes in each new cell, one copy of each, just like the parent.', 'Both cells match the parent.'),

  'A2.GF.prompt': B('A human skin cell has 46 chromosomes. It divides by mitosis. What do the two new cells have?', 'A skin cell has 46 chromosomes. It divides. What do the new cells have?'),
  'A2.GF.hint': B('Mitosis gives each new cell the same information as the parent.', 'The new cells are the same as the parent.'),
  'A2.GF.opt23': '23 chromosomes each',
  'A2.GF.opt92': '92 chromosomes each',
  'A2.GF.opt46': '46 chromosomes each, the same as the parent',
  'A2.GF.opt46diff': '46 chromosomes each, but different genes',
  'A2.GF.fb23': B('Halving happens when eggs and sperm are made, not in mitosis. Mitosis keeps the full set.', 'Mitosis keeps all 46.'),
  'A2.GF.fb92': B('The copy is shared between the two cells, so the number does not double.', 'The copies are shared. Each cell gets 46.'),
  'A2.GF.fb46': B('Mitosis copies all 46, then shares them: each new cell gets the full set.', 'Each new cell has 46, the same as the parent.'),
  'A2.GF.fb46diff': B('Each half of an X is an exact copy, so both cells carry the same genes.', 'The genes are the same.'),

  'A2.I2.prompt': B('A cell divides. One new cell gets 3 chromosomes; the other gets 5. The parent had 4. What went wrong?', 'One new cell has 3. One has 5. What went wrong?'),
  'A2.I2.hint': B('3 + 5 = 8: the cell did copy. Where did the halves of the Xs go?', 'Look at where the halves went.'),
  'A2.I2.optNoCopy': 'The cell forgot to copy its chromosomes.',
  'A2.I2.optBoth': 'Both halves of one X went into the same cell.',
  'A2.I2.optExtraCopy': 'The cell copied one chromosome twice.',
  'A2.I2.optNormal': 'Nothing; new cells are often different.',
  'A2.I2.fbNoCopy': B('Without copying there would be only 4 chromosomes to share, not 8.', 'There were 8. It did copy.'),
  'A2.I2.fbBoth': B('One X sent both halves to one cell: that cell got an extra, and the other is missing one.', 'Both halves went to one cell.'),
  'A2.I2.fbExtraCopy': B('Then there would be 9 halves, not 8. The count is right; the sharing went wrong.', 'The count is 8. The sharing went wrong.'),
  'A2.I2.fbNormal': B('Mitosis makes two cells that match the parent. A cell missing a chromosome has a problem.', 'New cells should match the parent.'),

  'A2.check.title': 'Checkpoint',
  'A2.check.body': B('Three questions about cells dividing. Show what you know on your own: hints and worked steps are off.', 'Three questions. Work on your own.'),
  'A2.C1.prompt': B('Divide this cell from a different animal so both new cells match the parent.', 'Divide this cell. Both new cells must match the parent.'),
  'A2.C1.fb.correct': B('Both new cells match the parent.', 'Both cells match.'),
  'A2.C2.prompt': B('After mitosis, how does the DNA in each new cell compare with the parent cell\'s DNA?', 'How is the DNA in the new cells?'),
  'A2.C2.optHalf': 'Each new cell has half of the parent\'s DNA.',
  'A2.C2.optDiffer': 'The two new cells have different genes.',
  'A2.C2.optDouble': 'Each new cell has twice as many chromosomes.',
  'A2.C2.optSame': 'Each new cell has the same DNA as the parent.',
  'A2.C2.fbHalf': B('Mitosis copies first, so each cell gets a full set.', 'Each cell gets a full set.'),
  'A2.C2.fbDiffer': B('The two halves of each X are exact copies, so both cells get the same genes.', 'Both cells get the same genes.'),
  'A2.C2.fbDouble': B('The copies are shared out, one half to each cell, so the number stays the same.', 'The number stays the same.'),
  'A2.C2.fbSame': B('Same DNA, same chromosomes: two identical copies of the parent cell.', 'Same DNA as the parent.'),
  'A2.C3.prompt': B('Before dividing, a cell has 6 chromosomes, and each one is an X. After mitosis, what does each new cell have?', 'A cell has 6 X-shaped chromosomes. It divides. What does each new cell have?'),
  'A2.C3.opt6and6': '6 chromosomes, 6 DNA molecules',
  'A2.C3.opt3and6': '3 chromosomes, 6 DNA molecules',
  'A2.C3.opt6and12': '6 chromosomes, 12 DNA molecules',
  'A2.C3.opt12and12': '12 chromosomes, 12 DNA molecules',
  'A2.C3.fb6and6': B('Each new cell gets one half of each X: 6 single chromosomes, 6 DNA molecules.', '6 and 6.'),
  'A2.C3.fb3and6': B('Mitosis does not halve the chromosomes: every new cell gets one of each of the 6.', 'Each cell gets all 6.'),
  'A2.C3.fb6and12': B('The Xs are pulled apart, so the new cells get single halves, not whole Xs.', 'The Xs are pulled apart.'),
  'A2.C3.fb12and12': B('An X is one chromosome, copied. Its halves are shared between the two cells.', 'An X is one chromosome.'),

  'A2.end.title': 'Copy a cell: done',
  'A2.end.body1': B('Mitosis copies every chromosome, then pulls the copies apart so each new cell gets one of each.', 'Mitosis copies, then shares. Each new cell gets one of every chromosome.'),
  'A2.end.body2': B('The two new cells have the same DNA as each other and as the parent. Next: how long does each part of this take?', 'The new cells have the same DNA as the parent.'),

  'mis.divideWithoutCopy': 'A cell can divide without copying first.',
  'mis.bothHalvesOneCell': 'Both halves of an X can go to the same new cell.',
  'mis.splitByParent': 'One new cell gets the mother\'s chromosomes and the other gets the father\'s.',
  'mis.mitosisHalves': 'Mitosis halves the number of chromosomes.',
  'mis.daughtersDiffer': 'The two new cells get different genes.',
  'mis.daughtersKeepX': 'The new cells keep whole X-shaped chromosomes.',
  'ui.phase.attempt': 'Try it first',
});

fs.writeFileSync(cp, JSON.stringify(c, null, 2) + '\n');
fs.writeFileSync(ep, JSON.stringify(en, null, 2) + '\n');
console.log('A2 written');
