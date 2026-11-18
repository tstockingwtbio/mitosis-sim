// Writes beat A2b (Clock the cycle) into partA.json and its English text into en.json.
// Run once: node scripts/content/a2b.mjs
import fs from 'node:fs';

const cp = 'src/content/partA.json';
const ep = 'src/i18n/en.json';
const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
const en = JSON.parse(fs.readFileSync(ep, 'utf8'));
const STD = 'SC.HS.6.1.d';
const B = (building, beginning) => ({ building, beginning });
const base = (id, phase, kind) => ({ id, beat: 'A2b', standard: STD, phase, status: 'draft', kind });
const ALL = ['interphase', 'prophase', 'metaphase', 'anaphase', 'telophase'];

const beat = c.beats.find((b) => b.id === 'A2b');
Object.assign(beat, {
  built: true,
  sequencing: 'explicit-first',
  steps: [
    { id: 'A2b-s01', type: 'retrieve', tasks: ['A2b-R1', 'A2b-R2', 'A2b-R3', 'A2b-R4'] },
    { id: 'A2b-s02', type: 'explain', scene: 'cycle', title: 'A2b.cycle.title', body: ['A2b.cycle.body1', 'A2b.cycle.body2'], lines: ['VO-A16'] },
    { id: 'A2b-s03', type: 'explain', scene: 'panel', title: 'A2b.slide.title', body: ['A2b.slide.body'], lines: ['VO-A17'], panels: [{ asset: 'IMG-P10' }], assets: ['IMG-P10'], sfx: ['SFX-28', 'SFX-29'] },
    { id: 'A2b-s04', type: 'task', task: 'A2b-W1' },
    { id: 'A2b-s05', type: 'task', task: 'A2b-G1' },
    { id: 'A2b-s06', type: 'task', task: 'A2b-I1' },
    { id: 'A2b-s07', type: 'task', task: 'A2b-T1' },
    { id: 'A2b-s08', type: 'task', task: 'A2b-I2' },
    { id: 'A2b-s09', type: 'task', task: 'A2b-O1' },
    { id: 'A2b-s10', type: 'task', task: 'A2b-O2' },
    { id: 'A2b-s11', type: 'explain', scene: 'panel', title: 'A2b.onion.title', body: ['A2b.onion.body'], lines: ['VO-A21'], panels: [{ asset: 'IMG-P11' }], assets: ['IMG-P11'] },
    { id: 'A2b-s12', type: 'task', task: 'A2b-N1' },
    { id: 'A2b-s13', type: 'task', task: 'A2b-N2' },
    { id: 'A2b-s14', type: 'intro', title: 'A2b.check.title', body: ['A2b.check.body'] },
    { id: 'A2b-s15', type: 'task', task: 'A2b-C1' },
    { id: 'A2b-s16', type: 'task', task: 'A2b-C2' },
    { id: 'A2b-s17', type: 'task', task: 'A2b-C3' },
    { id: 'A2b-s18', type: 'summary', title: 'A2b.end.title', body: ['A2b.end.body1', 'A2b.end.body2'] },
  ],
});

const timingFb = (correct) => [{ when: 'correct', text: correct }];

Object.assign(c.tasks, {
  'A2b-R1': { ...base('A2b-R1', 'retrieve', 'recall'), source: 'last-module', prompt: 'A2b.R1.prompt', answer: 'A2b.R1.answer' },
  'A2b-R2': { ...base('A2b-R2', 'retrieve', 'recall'), source: 'last-module', prompt: 'A2b.R2.prompt', answer: 'A2b.R2.answer' },
  'A2b-R3': { ...base('A2b-R3', 'retrieve', 'recall'), source: 'last-week', prompt: 'A2b.R3.prompt', answer: 'A2b.R3.answer' },
  'A2b-R4': { ...base('A2b-R4', 'retrieve', 'recall'), source: 'prior-unit', prompt: 'A2b.R4.prompt', answer: 'A2b.R4.answer' },
  'A2b-W1': { ...base('A2b-W1', 'worked', 'sort'), field: 'tip', range: [0, 3], prompt: 'A2b.W1.prompt', worked: ['A2b.W1.step1', 'A2b.W1.step2', 'A2b.W1.step3'], lines: ['VO-A18'] },
  'A2b-G1': { ...base('A2b-G1', 'guided', 'sort'), field: 'tip', range: [3, 9], prompt: 'A2b.G1.prompt', hints: ['A2b.hint.sort1', 'A2b.hint.sort2'] },
  'A2b-I1': { ...base('A2b-I1', 'independent', 'sort'), field: 'tip', range: [9, 36], prompt: 'A2b.I1.prompt', hints: ['A2b.hint.sort1', 'A2b.hint.sort2'] },
  'A2b-T1': {
    ...base('A2b-T1', 'guided', 'timing'),
    field: 'tip',
    rows: ALL,
    cycleHours: 24,
    prompt: 'A2b.T1.prompt',
    lines: ['VO-A19'],
    worked: ['A2b.T1.step1', 'A2b.T1.step2', 'A2b.T1.step3'],
    hints: ['A2b.hint.time1', 'A2b.hint.time2'],
    feedback: timingFb('A2b.T1.fb.correct'),
  },
  'A2b-I2': {
    ...base('A2b-I2', 'independent', 'choice'),
    prompt: 'A2b.I2.prompt',
    goFurther: 'A2b-I2-GF',
    hints: ['A2b.I2.hint'],
    options: [
      { id: 'a', text: 'A2b.I2.optFewest', misconception: 'more-cells-faster', feedback: 'A2b.I2.fbFewest' },
      { id: 'b', text: 'A2b.I2.optMost', correct: true, feedback: 'A2b.I2.fbMost' },
      { id: 'c', text: 'A2b.I2.optSame', misconception: 'phases-equal', feedback: 'A2b.I2.fbSame' },
      { id: 'd', text: 'A2b.I2.optResting', removable: true, misconception: 'interphase-resting', feedback: 'A2b.I2.fbResting' },
    ],
  },
  'A2b-I2-GF': {
    ...base('A2b-I2-GF', 'independent', 'choice'),
    isGoFurther: true,
    prompt: 'A2b.GF.prompt',
    hints: ['A2b.GF.hint'],
    options: [
      { id: 'a', text: 'A2b.GF.optPile', correct: true, feedback: 'A2b.GF.fbPile' },
      { id: 'b', text: 'A2b.GF.optNone', misconception: 'phases-separate', feedback: 'A2b.GF.fbNone' },
      { id: 'c', text: 'A2b.GF.optSame', misconception: 'phases-separate', feedback: 'A2b.GF.fbSame' },
      { id: 'd', text: 'A2b.GF.optInter', removable: true, misconception: 'more-cells-faster', feedback: 'A2b.GF.fbInter' },
    ],
  },
  'A2b-O1': { ...base('A2b-O1', 'independent', 'sort'), field: 'old', range: [0, 36], prompt: 'A2b.O1.prompt', lines: ['VO-A20'], hints: ['A2b.hint.sort1'] },
  'A2b-O2': {
    ...base('A2b-O2', 'independent', 'choice'),
    prompt: 'A2b.O2.prompt',
    hints: ['A2b.O2.hint'],
    options: [
      { id: 'a', text: 'A2b.O2.optDone', correct: true, feedback: 'A2b.O2.fbDone' },
      { id: 'b', text: 'A2b.O2.optDead', misconception: 'interphase-resting', feedback: 'A2b.O2.fbDead' },
      { id: 'c', text: 'A2b.O2.optFast', misconception: 'more-cells-faster', feedback: 'A2b.O2.fbFast' },
      { id: 'd', text: 'A2b.O2.optDiffDna', removable: true, misconception: 'daughters-differ', feedback: 'A2b.O2.fbDiffDna' },
    ],
  },
  'A2b-N1': { ...base('A2b-N1', 'independent', 'sort'), field: 'onion', range: [0, 36], prompt: 'A2b.N1.prompt', hints: ['A2b.hint.sort1'] },
  'A2b-N2': { ...base('A2b-N2', 'independent', 'timing'), field: 'onion', rows: ['interphase', 'metaphase'], cycleHours: 24, prompt: 'A2b.N2.prompt', hints: ['A2b.hint.time1', 'A2b.hint.time2'], feedback: timingFb('A2b.N2.fb.correct') },
  'A2b-C1': {
    ...base('A2b-C1', 'checkpoint', 'choice'),
    prompt: 'A2b.C1.prompt',
    options: [
      { id: 'a', text: 'A2b.C1.optFast', misconception: 'more-cells-faster', feedback: 'A2b.C1.fbFast' },
      { id: 'b', text: 'A2b.C1.optRest', misconception: 'interphase-resting', feedback: 'A2b.C1.fbRest' },
      { id: 'c', text: 'A2b.C1.optLong', correct: true, feedback: 'A2b.C1.fbLong' },
      { id: 'd', text: 'A2b.C1.optBroken', misconception: 'phases-equal', feedback: 'A2b.C1.fbBroken' },
    ],
  },
  'A2b-C2': {
    ...base('A2b-C2', 'checkpoint', 'choice'),
    prompt: 'A2b.C2.prompt',
    options: [
      { id: 'a', text: 'A2b.C2.opt6', misconception: 'percent-is-count', feedback: 'A2b.C2.fb6' },
      { id: 'b', text: 'A2b.C2.opt3', correct: true, feedback: 'A2b.C2.fb3' },
      { id: 'c', text: 'A2b.C2.opt12', misconception: 'hours-is-percent', feedback: 'A2b.C2.fb12' },
      { id: 'd', text: 'A2b.C2.opt8', misconception: 'hours-not-scaled', feedback: 'A2b.C2.fb8' },
    ],
  },
  'A2b-C3': {
    ...base('A2b-C3', 'checkpoint', 'choice'),
    prompt: 'A2b.C3.prompt',
    options: [
      { id: 'a', text: 'A2b.C3.optA', correct: true, feedback: 'A2b.C3.fbA' },
      { id: 'b', text: 'A2b.C3.optB', misconception: 'more-cells-faster', feedback: 'A2b.C3.fbB' },
      { id: 'c', text: 'A2b.C3.optSame', misconception: 'phases-equal', feedback: 'A2b.C3.fbSame' },
      { id: 'd', text: 'A2b.C3.optCannot', misconception: 'phases-separate', feedback: 'A2b.C3.fbCannot' },
    ],
  },
});

Object.assign(c.misconceptions, {
  'interphase-resting': 'mis.interphaseResting',
  'phases-by-shape': 'mis.phasesByShape',
  'more-cells-faster': 'mis.moreCellsFaster',
  'phases-equal': 'mis.phasesEqual',
  'phases-separate': 'mis.phasesSeparate',
  'percent-is-count': 'mis.percentIsCount',
  'hours-is-percent': 'mis.hoursIsPercent',
  'hours-not-scaled': 'mis.hoursNotScaled',
  'percent-not-of-total': 'mis.percentNotOfTotal',
});

const phaseText = {
  interphase: ['Interphase', 'I', 'Round nucleus; no chromosomes you can see.', 'a round, dark nucleus and no separate chromosomes'],
  prophase: ['Prophase', 'P', 'Paler nucleus with short threads inside.', 'a pale nucleus with short dark threads inside'],
  metaphase: ['Metaphase', 'M', 'Chromosomes in a line across the middle.', 'short dark chromosomes lined up across the middle'],
  anaphase: ['Anaphase', 'A', 'Two sets of chromosomes pulling apart.', 'two groups of chromosomes moving to opposite ends'],
  telophase: ['Telophase', 'T', 'Two new nuclei; the cell pinching in two.', 'a cell pinching in two, with a small nucleus at each end'],
};
for (const [p, [name, abbr, look, seen]] of Object.entries(phaseText)) {
  en[`A2b.phase.${p}`] = name;
  en[`A2b.phase.${p}.short`] = abbr;
  en[`A2b.phase.${p}.look`] = look;
  en[`A2b.phase.${p}.seen`] = seen;
}

Object.assign(en, {
  'A2b.cards.label': 'Reference cards',
  'A2b.cards.pick': 'Choose a phase card, then click every cell that matches it.',
  'A2b.cards.demo': 'Reference cards: these stay on screen the whole time.',
  'A2b.cell.aria': 'Cell {n}: {look}',
  'A2b.cell.sortedAs': 'Sorted as {phase}',
  'A2b.tally.title': 'Your counts so far',
  'A2b.tally.left': '{n} cells in this step still to sort.',
  'A2b.tally.done': 'Every cell in this step is sorted.',
  'A2b.timing.phase': 'Phase',
  'A2b.timing.count': 'Cells',
  'A2b.timing.percent': 'Share of cells',
  'A2b.timing.hours': 'Hours',
  'A2b.cycle.centre': 'One cycle: 24 hours',

  'A2b.R1.prompt': B('What happens to every chromosome before a cell divides?', 'What happens to chromosomes before a cell divides?'),
  'A2b.R1.answer': 'It is copied: each one becomes an X.',
  'A2b.R2.prompt': B('After mitosis, how do the two new cells compare with the parent cell?', 'How are the new cells and the parent the same?'),
  'A2b.R2.answer': 'They have the same chromosomes and the same DNA.',
  'A2b.R3.prompt': B('What is a gene?', 'What is a gene?'),
  'A2b.R3.answer': 'A section of a chromosome.',
  'A2b.R4.prompt': B('What does the nucleus of a cell hold?', 'What is in the nucleus?'),
  'A2b.R4.answer': 'The chromosomes (the cell\'s DNA).',

  'A2b.cycle.title': 'The cell cycle',
  'A2b.cycle.body1': B('A dividing cell goes round and round a cycle. The slices show how much of the cycle each part takes: interphase is most of it.', 'A cell grows, copies, and divides, again and again.'),
  'A2b.cycle.body2': B('The cycle is continuous: one part flows into the next. The five names are lines that scientists drew to talk about it; the cell does not stop between them.', 'The parts flow into each other. The names help us talk about them.'),
  'A2b.slide.title': 'A slice of the new tail',
  'A2b.slide.body': B('Each cell on the slide was caught at one moment of its cycle. If you count how many cells are in each part, you can work out how long each part takes.', 'Each cell is at one stage. Count the cells in each stage.'),

  'A2b.W1.prompt': B('Watch the first three cells being sorted. The cards show what to look for.', 'Watch. Sort the first three cells.'),
  'A2b.W1.step1': B('Cell 1: a round, dark nucleus and no chromosomes you can see. That is interphase.', 'Cell 1: round nucleus. Interphase.'),
  'A2b.W1.step2': B('Cell 2: chromosomes lined up across the middle. That is metaphase.', 'Cell 2: chromosomes in a line. Metaphase.'),
  'A2b.W1.step3': B('Cell 3: two sets of chromosomes pulling apart. That is anaphase.', 'Cell 3: two sets pulling apart. Anaphase.'),

  'A2b.G1.prompt': B('Now you sort the six cells in rings. Choose a card, click the cells that match, then check.', 'Sort the six cells in rings. Then check.'),
  'A2b.I1.prompt': B('Sort the rest of the slide on your own. Then check: your counts go into the next step.', 'Sort all the other cells. Then check.'),
  'A2b.hint.sort1': B('Look for a nucleus first. A round, dark nucleus with no threads: interphase. A paler nucleus with threads: prophase.', 'Round nucleus: interphase. Threads: prophase.'),
  'A2b.hint.sort2': B('No nucleus? Look at the chromosomes: one line in the middle is metaphase; two sets moving apart is anaphase; two new nuclei is telophase.', 'One line: metaphase. Two sets: anaphase. Two nuclei: telophase.'),
  'A2b.fb.unsorted': B('{n} cells in this step are not sorted yet. Sort them all, then check.', '{n} cells are not sorted yet.'),
  'A2b.fb.allRight': B('All {n} cells match the answer key.', 'All {n} match.'),

  'A2b.T1.prompt': B('Use your counts. For each phase, work out its share of the cells (%), then its hours out of a {hours}-hour cycle.', 'For each phase: what share of the cells? How many hours?'),
  'A2b.T1.step1': B('Example: if 3 of 36 cells are in metaphase, the share is 3 ÷ 36 = about 8%.', '3 out of 36 is about 8%.'),
  'A2b.T1.step2': B('The share of cells is the share of time. 8% of 24 hours is 0.08 × 24 = about 2 hours.', '8% of 24 hours is about 2 hours.'),
  'A2b.T1.step3': B('Do the same for every phase. Your counts may differ from a classmate\'s: each slide is different.', 'Do the same for each phase.'),
  'A2b.hint.time1': B('Share of cells = cells in the phase ÷ all cells, × 100.', 'Cells in the phase ÷ all cells.'),
  'A2b.hint.time2': B('Hours = share × 24. Check: all the hours together should add up to about 24.', 'Share × 24 = hours.'),
  'A2b.T1.fb.correct': B('Your table is right. Interphase takes most of the day; the parts of mitosis take an hour or two each.', 'Right. Interphase takes the most time.'),
  'A2b.fb.percent-is-count': B('For {phase}, you wrote the number of cells, not their share. Divide {count} by {total}, then × 100.', 'Divide by {total}, then × 100.'),
  'A2b.fb.hours-is-percent': B('For {phase}, the hours are the same number as the percent. Hours are the share of {hours} hours, not of 100.', 'Hours are a share of {hours}.'),
  'A2b.fb.hours-not-scaled': B('For {phase}, the share is right but the hours are not. Multiply the share (as a decimal) by {hours}.', 'Share × {hours} = hours.'),
  'A2b.fb.percent-not-of-total': B('For {phase}, check the share: {count} cells out of {total}, × 100.', '{count} out of {total}, × 100.'),

  'A2b.I2.prompt': B('In your slide, which phase takes the longest? How do you know?', 'Which phase takes the longest?'),
  'A2b.I2.hint': B('More cells caught in a phase means cells spend more time in it.', 'More cells means more time.'),
  'A2b.I2.optFewest': 'The phase with the fewest cells, because those cells finished fast',
  'A2b.I2.optMost': 'The phase with the most cells, because cells spend longest there',
  'A2b.I2.optSame': 'They all take the same time; the slide is random',
  'A2b.I2.optResting': 'Interphase, because the cell is resting',
  'A2b.I2.fbFewest': B('Few cells in a phase means cells pass through it quickly, so it is short.', 'Few cells means a short phase.'),
  'A2b.I2.fbMost': B('A phase with more cells lasts longer: a cell is more likely to be caught in it.', 'More cells means a longer phase.'),
  'A2b.I2.fbSame': B('If every phase took the same time, the counts would be about equal. They are not.', 'The counts are not equal.'),
  'A2b.I2.fbResting': B('Interphase is longest, but not because the cell rests: it grows and copies its DNA then.', 'In interphase, the cell copies its DNA.'),

  'A2b.GF.prompt': B('A chemical stops cells from moving past metaphase. After a few hours, what happens to the counts on a slide?', 'A chemical stops cells at metaphase. What happens to the counts?'),
  'A2b.GF.hint': B('Cells keep arriving at metaphase, but none leave.', 'Cells arrive but do not leave.'),
  'A2b.GF.optPile': 'Metaphase cells pile up, and anaphase and telophase cells disappear',
  'A2b.GF.optNone': 'Nothing changes; each phase is separate',
  'A2b.GF.optSame': 'All five counts stay the same',
  'A2b.GF.optInter': 'Interphase disappears, because metaphase is now faster',
  'A2b.GF.fbPile': B('Cells flow into metaphase and get stuck, so they pile up there. Controlling when cells move on is how bodies control growth.', 'Cells pile up at metaphase.'),
  'A2b.GF.fbNone': B('The phases are connected: blocking one backs up the cells behind it.', 'The phases are connected.'),
  'A2b.GF.fbSame': B('Cells still flow in, but none flow out, so the metaphase count grows.', 'More cells get stuck.'),
  'A2b.GF.fbInter': B('Cells still leave interphase as usual; they just cannot get past metaphase.', 'They get stuck at metaphase.'),

  'A2b.O1.prompt': B('This slide comes from Fig\'s old tail. Sort every cell, then check.', 'Sort every cell. Then check.'),
  'A2b.O2.prompt': B('Almost every cell in the old tail is in interphase. Why?', 'Why are most old-tail cells in interphase?'),
  'A2b.O2.hint': B('Compare with the new tail tip: which one is still growing?', 'Which tail is still growing?'),
  'A2b.O2.optDone': 'The old tail has finished growing, so few cells are dividing',
  'A2b.O2.optDead': 'Cells in interphase are resting and not doing anything',
  'A2b.O2.optFast': 'Interphase is very fast in old tissue',
  'A2b.O2.optDiffDna': 'Old-tail cells have different DNA from new-tail cells',
  'A2b.O2.fbDone': B('Finished tissue does its job instead of growing, so most cells stay in interphase. The growing tip has more dividing cells.', 'The old tail is done growing.'),
  'A2b.O2.fbDead': B('Interphase cells are busy: they do their jobs, and they grow and copy their DNA when they are getting ready to divide.', 'Interphase cells are busy.'),
  'A2b.O2.fbFast': B('If interphase were fast, few cells would be caught in it. Almost all are.', 'Lots of cells means a long time.'),
  'A2b.O2.fbDiffDna': B('Every cell in Fig has the same DNA, made by mitosis.', 'All the cells have the same DNA.'),

  'A2b.onion.title': 'Same count, different organism',
  'A2b.onion.body': B('Onion root tips grow fast, like Fig\'s new tail. Count a slice of root tip the same way.', 'Count cells from an onion root.'),
  'A2b.N1.prompt': B('Sort every cell in the onion root tip, then check.', 'Sort every cell. Then check.'),
  'A2b.N2.prompt': B('Using your onion counts and a {hours}-hour cycle, work out the share and the hours for interphase and metaphase.', 'Work out the share and the hours.'),
  'A2b.N2.fb.correct': B('Right. The same method works for any growing tissue.', 'Right.'),

  'A2b.check.title': 'Checkpoint',
  'A2b.check.body': B('Three questions about the cell cycle. Show what you know on your own: hints are off.', 'Three questions. Work on your own.'),
  'A2b.C1.prompt': B('In a slice of a growing leaf, 30 of 36 cells are in interphase. What does this tell you?', '30 of 36 cells are in interphase. What does this mean?'),
  'A2b.C1.optFast': 'Interphase is the fastest phase',
  'A2b.C1.optRest': 'Most of these cells are resting and doing nothing',
  'A2b.C1.optLong': 'Cells spend most of their cycle in interphase',
  'A2b.C1.optBroken': 'The leaf cells cannot divide',
  'A2b.C1.fbFast': B('More cells in a phase means a longer phase, not a faster one.', 'More cells means longer.'),
  'A2b.C1.fbRest': B('Interphase cells grow, work and copy their DNA.', 'Interphase cells are busy.'),
  'A2b.C1.fbLong': B('Most cells are caught in interphase because it takes most of the cycle.', 'Interphase takes most of the time.'),
  'A2b.C1.fbBroken': B('6 cells are dividing, so the leaf cells can divide.', '6 cells are dividing.'),
  'A2b.C2.prompt': B('In a slice of root tip, 6 of 48 cells are in metaphase. The cycle takes 24 hours. About how long is metaphase?', '6 of 48 cells are in metaphase. The cycle is 24 hours. How long is metaphase?'),
  'A2b.C2.opt6': '6 hours',
  'A2b.C2.opt3': '3 hours',
  'A2b.C2.opt12': '12.5 hours',
  'A2b.C2.opt8': '8 hours',
  'A2b.C2.fb6': B('6 is the number of cells. 6 ÷ 48 is the share: one eighth.', '6 is the number of cells.'),
  'A2b.C2.fb3': B('6 ÷ 48 = one eighth, and one eighth of 24 hours is 3 hours.', 'One eighth of 24 is 3.'),
  'A2b.C2.fb12': B('12.5 is the percent. Hours are 12.5% of 24, not of 100.', '12.5 is the percent.'),
  'A2b.C2.fb8': B('Check the share: 6 ÷ 48 is one eighth, so one eighth of 24 hours.', 'One eighth of 24.'),
  'A2b.C3.prompt': B('On one slide, phase A has 9 cells and phase B has 2 cells. Which phase lasts longer?', 'Phase A has 9 cells. Phase B has 2. Which is longer?'),
  'A2b.C3.optA': 'Phase A',
  'A2b.C3.optB': 'Phase B',
  'A2b.C3.optSame': 'They last the same time',
  'A2b.C3.optCannot': 'You cannot tell from a slide',
  'A2b.C3.fbA': B('More cells caught in a phase means cells spend longer in it.', 'More cells, longer phase.'),
  'A2b.C3.fbB': B('Fewer cells means cells pass through quickly: phase B is shorter.', 'Fewer cells, shorter phase.'),
  'A2b.C3.fbSame': B('Equal times would give about equal counts.', 'The counts are not equal.'),
  'A2b.C3.fbCannot': B('A slide is a snapshot of many cells at once, so the counts estimate the times.', 'The counts show the times.'),

  'A2b.end.title': 'Clock the cycle: done',
  'A2b.end.body1': B('The cell cycle is continuous. Cells spend most of it in interphase, growing, working and copying their DNA; mitosis is the short part.', 'Cells spend most of their time in interphase.'),
  'A2b.end.body2': B('Growing tissue has more dividing cells than finished tissue, and the share of cells in a phase estimates the share of time. Next: same DNA, different cells.', 'Growing tissue has more dividing cells.'),

  'mis.interphaseResting': 'Interphase is a resting phase.',
  'mis.phasesByShape': 'You can tell the phase from the cell\'s size or outline.',
  'mis.moreCellsFaster': 'A phase with more cells is a faster phase.',
  'mis.phasesEqual': 'Every phase takes the same amount of time.',
  'mis.phasesSeparate': 'The phases are separate steps that don\'t affect each other.',
  'mis.percentIsCount': 'The number of cells is the same as the share of cells.',
  'mis.hoursIsPercent': 'The percent is the number of hours.',
  'mis.hoursNotScaled': 'The hours don\'t depend on the length of the cycle.',
  'mis.percentNotOfTotal': 'The share can be found without dividing by the total.',
});

for (const p of ALL) {
  en[`A2b.fb.look.${p}`] = B(
    `{right} of {total} match the answer key. Look again at cell {n}: ${phaseText[p][2].toLowerCase().replace(/\.$/, '')} means ${phaseText[p][0].toLowerCase()}.`,
    `Look again at cell {n}. It is ${phaseText[p][0].toLowerCase()}.`,
  );
}

fs.writeFileSync(cp, JSON.stringify(c, null, 2) + '\n');
fs.writeFileSync(ep, JSON.stringify(en, null, 2) + '\n');
console.log('A2b written');
