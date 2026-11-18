// Writes Part B (beats B0 to B-check) into src/content/partB.json and its
// English text into src/i18n/en.json. Voice-over text is read from the story
// bible word for word. Task wording is a draft (status: draft) for the
// teacher to review. Run: node scripts/content/partB.mjs
import fs from 'node:fs';

const cp = 'src/content/partB.json';
const ep = 'src/i18n/en.json';
const en = JSON.parse(fs.readFileSync(ep, 'utf8'));
const bible = fs.readFileSync('docs/story-bible.md', 'utf8');
const STD = 'SC.HS.9.4.b';
const B = (building, beginning) => ({ building, beginning });
const text = {};
const add = (obj) => Object.assign(text, obj);

// ---------- Voice-over (from the bible) ----------
for (const line of bible.split('\n')) {
  const m = line.match(/^\| (VO-B\d\d) \|/);
  if (!m) continue;
  const cells = line.replace(/\\\[/g, '[').replace(/\\\]/g, ']').split('|').map((c) => c.trim());
  text[`vo.${m[1]}`] = { building: cells[3], beginning: cells[4] };
}

// ---------- Helpers ----------
const base = (beat, id, phase, kind) => ({ id, beat, standard: STD, phase, status: 'draft', kind });
const recall = (beat, id, source, q, a) => {
  add({ [`${id}.prompt`]: q, [`${id}.answer`]: a });
  return { ...base(beat, id, 'retrieve', 'recall'), source, prompt: `${id}.prompt`, answer: `${id}.answer` };
};
/** opts: [key, building text, beginning text, feedback building, feedback beginning, misconception | true] */
const choice = (beat, id, phase, prompt, opts, extra = {}) => {
  add({ [`${id}.prompt`]: prompt });
  const options = opts.map(([key, ob, fbB, fbG, mis, removable]) => {
    add({ [`${id}.opt.${key}`]: ob, [`${id}.fb.${key}`]: B(fbB, fbG) });
    return {
      id: key,
      text: `${id}.opt.${key}`,
      feedback: `${id}.fb.${key}`,
      ...(mis === true ? { correct: true } : { misconception: mis }),
      ...(removable ? { removable: true } : {}),
    };
  });
  return { ...base(beat, id, phase, 'choice'), prompt: `${id}.prompt`, options, ...extra };
};
const predict = (beat, id, phase, prompt, extra = {}) => {
  add({ [`${id}.prompt`]: prompt });
  return { ...base(beat, id, phase, 'predict'), prompt: `${id}.prompt`, ...extra };
};
const keys = (prefix, list) => list.map((v, i) => {
  const k = `${prefix}${i + 1}`;
  add({ [k]: v });
  return k;
});
const rod = (id, pair, parent, length, alleles) => ({ id, pair, parent, state: 'unreplicated', length, alleles });

const gameteFeedback = (id, correct) => {
  add({ [`${id}.fb.correct`]: correct });
  return [
    { when: 'correct', text: `${id}.fb.correct` },
    { when: { gamete: 'full-set' }, misconception: 'gamete-full-set', text: 'gamete.fb.full-set' },
    { when: { gamete: 'both-of-pair' }, misconception: 'gamete-both-of-pair', text: 'gamete.fb.both-of-pair' },
    { when: { gamete: 'missing-pair' }, misconception: 'gamete-missing-pair', text: 'gamete.fb.missing-pair' },
  ];
};

// ---------- DNA profiles: two bands per marker, six markers ----------
// Fig's body (tail, skin, blood) and her egg-making line are sisters: two
// embryos with the same parents. Every hatchling gets one band per marker from
// Barty and one from Fig's egg line.
const figBody = [[1, 3], [2, 4], [1, 2], [3, 5], [1, 4], [2, 5]];
const profiles = {
  barty: [[4, 5], [3, 4], [3, 5], [1, 5], [2, 5], [4, 5]],
  h2: [[2, 4], [1, 3], [2, 5], [1, 4], [2, 3], [1, 4]],
  figTail: figBody,
  figSkin: figBody,
  figBlood: figBody,
  figEggs: [[2, 3], [1, 5], [1, 2], [2, 4], [3, 4], [1, 3]],
};

const tasks = {};
const T = (task) => (tasks[task.id] = task);

// ======================= B0 — Cold open =======================
add({
  'beat.B0.title': 'The hatchling test',
  'B0.title.title': 'Part B',
  'B0.title.body': B('Breeding season at Mossbank. Six hatchlings, one routine DNA test, and a result nobody expected.', 'Fig has babies. A DNA test has a surprise.'),
  'B0.story1.title': 'Breeding season',
  'B0.story1.body': B('Barty and Fig are the only adults in the breeding tank.', 'Barty and Fig are the parents.'),
  'B0.story2.title': 'The test',
  'B0.story2.body': B('A DNA profile shows bands. A parent and a young newt share one band in every marker, because the young newt got half its DNA from each parent.', 'A baby shares bands with each parent.'),
  'gel.lane.barty': 'Barty',
  'gel.lane.h2': 'Hatchling 2',
  'gel.lane.figTail': 'Fig: tail clip',
  'gel.lane.figSkin': 'Fig: skin',
  'gel.lane.figBlood': 'Fig: blood',
  'gel.lane.figEggs': 'Fig: egg cells',
});
T({
  ...base('B0', 'B0-T1', 'guided', 'bands'),
  prompt: 'B0.T1.prompt',
  mode: 'match',
  lanes: ['barty', 'h2', 'figTail'],
  target: 'h2',
  compare: 'barty',
  worked: keys('B0.T1.step', [
    B('Find Hatchling 2\'s lane and Barty\'s lane. Each lane has two bands in every marker.', 'Find Hatchling 2 and Barty.'),
    B('Look at marker 1. Hatchling 2\'s lower band sits at the same height as one of Barty\'s bands: that band matches.', 'Marker 1: the lower band matches Barty.'),
    B('Do the same for every marker. A father matches once in each marker.', 'Check every marker.'),
  ]),
  hints: keys('B0.T1.hint', [
    B('Go one marker at a time. Is either of Hatchling 2\'s bands at the same height as a Barty band?', 'One marker at a time.'),
    B('There is exactly one match in every marker: six in all.', 'There are six matches.'),
  ]),
  feedback: [
    { when: 'correct', text: 'B0.T1.fb.correct' },
    { when: { bands: 'missed' }, text: 'gel.fb.missed' },
    { when: { bands: 'extra' }, misconception: 'band-near-match', text: 'gel.fb.extra' },
  ],
});
add({
  'B0.T1.prompt': B('Mark every band in Hatchling 2\'s lane that matches a band in Barty\'s lane.', 'Mark the bands that match Barty.'),
  'B0.T1.fb.correct': B('One band from Barty in every marker. Half of Hatchling 2\'s DNA came from him: Barty is the father.', 'Barty is the father.'),
});
T({
  ...base('B0', 'B0-T2', 'independent', 'bands'),
  prompt: 'B0.T2.prompt',
  mode: 'match',
  lanes: ['barty', 'h2', 'figTail'],
  target: 'h2',
  compare: 'figTail',
  hints: keys('B0.T2.hint', [B('Compare Hatchling 2 with Fig\'s tail clip, one marker at a time.', 'Compare with Fig.')]),
  feedback: [
    { when: 'correct', text: 'B0.T2.fb.correct' },
    { when: { bands: 'missed' }, text: 'gel.fb.missed' },
    { when: { bands: 'extra' }, misconception: 'band-near-match', text: 'gel.fb.extra' },
  ],
});
add({
  'B0.T2.prompt': B('Now mark every band in Hatchling 2\'s lane that matches Fig\'s tail clip.', 'Mark the bands that match Fig.'),
  'B0.T2.fb.correct': B('Only one band matches, in marker 3. A mother should match once in every marker, so this test says Fig is not the mother.', 'Only one band matches Fig.'),
});
T(
  choice('B0', 'B0-T3', 'independent', B('Five of Hatchling 2\'s bands match neither Barty nor Fig\'s tail clip. Where must those bands have come from?', 'Five bands match nobody. Where are they from?'), [
    ['mother', 'From the hatchling\'s mother, whoever she is', 'Every hatchling gets half its DNA from its mother. Those bands are the mother\'s half.', 'From the mother.', true],
    ['itself', 'The hatchling made new DNA for itself', 'Young animals don\'t make new DNA; they get it all from their parents.', 'DNA comes from the parents.', 'dna-from-nowhere'],
    ['barty', 'From Barty, but they changed on the way', 'Barty\'s half already matched, one band per marker. These are the other half.', 'Barty\'s bands already match.', 'all-from-father'],
    ['broken', 'Nowhere: the test must be broken', 'Barty\'s matches came from the same test, and they worked perfectly.', 'The test worked for Barty.', 'test-error', true],
  ]),
);
T(
  predict('B0', 'B0-P1', 'predict', B('Tomás thinks someone swapped the eggs. What do you think could explain the test? Write your best idea.', 'Why does the test say Fig is not the mother?'), {
    frames: 'B0.P1.frame',
    wordBank: 'B0.P1.bank',
  }),
);
add({
  'B0.P1.frame': B('I think the test says Fig is not the mother because ___.', 'I think ___.'),
  'B0.P1.bank': 'eggs, swapped, test, mistake, DNA, mother, tail',
});

// ======================= B1 — Retrieval =======================
add({
  'beat.B1.title': 'What we know',
  'B1.title': 'Before anyone is accused',
  'B1.body': B('The evidence board is empty. Start with what you already know from Part A.', 'What do you know already?'),
  'B1.end.title': 'Pinned to the board',
  'B1.end.body1': B('Every body cell has the same DNA, because mitosis copies it exactly. A hatchling gets half its DNA from each parent.', 'Body cells have the same DNA. Babies get half from each parent.'),
  'B1.end.body2': B('So if Fig is the mother, Hatchling 2 should match her in every marker. It doesn\'t. Something in that reasoning has to give.', 'But Fig does not match. Why?'),
});
T(recall('B1', 'B1-R1', 'prior-unit', B('What does mitosis make?', 'What does mitosis make?'), 'Two new cells with the same chromosomes (the same DNA) as the parent cell.'));
T(recall('B1', 'B1-R2', 'prior-unit', B('Fig\'s cells have 2 pairs of chromosomes. Where did the two chromosomes of a pair come from?', 'Where does each chromosome of a pair come from?'), 'One from her mother, one from her father.'));
T(recall('B1', 'B1-R3', 'prior-unit', B('An X-shaped chromosome: how many DNA molecules does it hold?', 'One X: how many DNA molecules?'), 'Two: the original and its copy, joined at the centromere.'));
T(recall('B1', 'B1-R4', 'prior-unit', B('A tail cell and a skin cell from Fig: same DNA or different? Why?', 'Tail cell and skin cell: same DNA?'), 'The same DNA, because mitosis copied it. Different genes are switched on.'));

// ======================= B2 — Make gametes =======================
const fig = [rod('1M', 1, 'M', 'long', ['A', 'E']), rod('1P', 1, 'P', 'long', ['a', 'e']), rod('2M', 2, 'M', 'short', ['B']), rod('2P', 2, 'P', 'short', ['b'])];
const barty = [rod('1M', 1, 'M', 'long', ['A', 'e']), rod('2P', 2, 'P', 'short', ['B']), rod('1P', 1, 'P', 'long', ['a', 'E']), rod('2M', 2, 'M', 'short', ['b'])];
const moth = [
  rod('1M', 1, 'M', 'long', ['R']),
  rod('2P', 2, 'P', 'medium', ['s']),
  rod('3M', 3, 'M', 'short', ['T']),
  rod('1P', 1, 'P', 'long', ['r']),
  rod('3P', 3, 'P', 'short', ['t']),
  rod('2M', 2, 'M', 'medium', ['S']),
];
add({
  'beat.B2.title': 'Make gametes',
  'B2.meiosis.title': 'Halve and shuffle',
  'B2.meiosis.body1': B('Watch one of Fig\'s egg-making cells. It copies its chromosomes, then divides twice, so each new cell gets one chromosome from every pair.', 'The cell divides two times.'),
  'B2.meiosis.body2': B('Keep an eye on the counts: 4 chromosomes in the starting cell, 2 in each new cell.', '4 chromosomes become 2.'),
  'B2.shuffle.title': 'Why every egg is different',
  'B2.shuffle.body1': B('Which chromosome from each pair goes into an egg is down to chance. Here, the mother\'s pair 1 went with the father\'s pair 2.', 'Chance decides which chromosomes go in.'),
  'B2.shuffle.body2': B('Before they separate, partners swap matching sections. Look at pair 1: each swapped tip has the other parent\'s paper and gene letter.', 'Partners swap pieces.'),
  'B2.fert.title': 'Back to a full set',
  'B2.fert.body1': B('An egg (2 chromosomes) and a sperm (2) join into one cell with 4: a full set again. In the hatchling, every chromosome from the egg counts as a mother\'s chromosome.', 'Egg plus sperm: 4 chromosomes.'),
  'B2.fert.body2': B('Three siblings, three different eggs and sperm: same parents, different shuffle.', 'Each baby is different.'),
  'B2.end.title': 'Make gametes: done',
  'B2.end.body1': B('Meiosis halves the chromosomes and shuffles them, so every egg and sperm is one of a kind.', 'Meiosis halves and mixes.'),
  'B2.end.body2': B('That shuffle is the first source of new variation: new combinations of the parents\' genes.', 'New mixes make babies different.'),
});
T(recall('B2', 'B2-R1', 'last-module', B('How much of Hatchling 2\'s DNA came from Barty?', 'How much DNA came from Barty?'), 'Half: one band in every marker.'));
T(recall('B2', 'B2-R2', 'last-week', B('What does mitosis do to the number of chromosomes?', 'Mitosis: same number or half?'), 'Keeps it the same: each new cell gets a full set.'));
T(recall('B2', 'B2-R3', 'prior-unit', B('What is a homologous pair?', 'What is a pair?'), 'Two chromosomes with the same genes, one from each parent.'));
T({
  ...base('B2', 'B2-G1', 'guided', 'gamete'),
  gamete: 'egg',
  prompt: 'B2.G1.prompt',
  cell: { chromosomes: fig },
  worked: keys('B2.G1.step', [
    B('Pair 1 has two versions: the one from Fig\'s mother (A, E) and the one from her father (a, e). An egg gets one of them. Pick either.', 'Pair 1: pick one.'),
    B('Do the same for pair 2: one of B or b.', 'Pair 2: pick one.'),
    B('Check: one chromosome from each pair, 2 in all. That is half of Fig\'s 4.', 'One from each pair: 2 in all.'),
  ]),
  hints: keys('B2.G1.hint', [
    B('An egg gets one chromosome from every pair: not both, and not none.', 'One from each pair.'),
    B('Fig has 2 pairs, so an egg has 2 chromosomes.', 'An egg has 2.'),
  ]),
  feedback: gameteFeedback('B2.G1', B('One from each pair: 2 chromosomes. When this egg meets a sperm with 2 more, the hatchling has 4.', 'Yes. 2 chromosomes.')),
});
add({ 'B2.G1.prompt': B('Make one egg from Fig\'s egg-making cell.', 'Make one egg.') });
T({
  ...base('B2', 'B2-I1', 'independent', 'gamete'),
  gamete: 'sperm',
  prompt: 'B2.I1.prompt',
  cell: { chromosomes: barty },
  hints: keys('B2.I1.hint', [B('Same rule as for eggs: one chromosome from every pair.', 'One from each pair.')]),
  feedback: gameteFeedback('B2.I1', B('A sperm with one chromosome from each pair: half of Barty\'s set.', 'Yes. Half of the set.')),
});
add({ 'B2.I1.prompt': B('Make one sperm from Barty\'s sperm-making cell.', 'Make one sperm.') });
T({
  ...base('B2', 'B2-I2', 'independent', 'gamete'),
  gamete: 'egg',
  collect: 4,
  prompt: 'B2.I2.prompt',
  cell: { chromosomes: fig },
  hints: keys('B2.I2.hint', [
    B('Change one choice at a time: keep pair 1 the same and switch pair 2.', 'Change one pair at a time.'),
    B('Pair 1 has 2 choices, and so does pair 2.', '2 choices and 2 choices.'),
  ]),
  feedback: gameteFeedback('B2.I2', B('4 different eggs: 2 choices for pair 1 times 2 choices for pair 2. Every extra pair doubles the number.', '4 different eggs.')),
});
add({ 'B2.I2.prompt': B('Leaving crossing over aside, how many different eggs can Fig\'s cell make? Make every different one.', 'Make all the different eggs.') });
T(
  choice('B2', 'B2-I3', 'independent', B('After crossing over in pair 1, how many different versions of chromosome 1 can end up in Fig\'s eggs? (Before: A with E, and a with e.)', 'After swapping, how many kinds of chromosome 1?'), [
    ['two', '2', 'Crossing over adds two new versions: A with e, and a with E.', 'Swapping makes new ones.', 'crossing-over-new-genes'],
    ['four', '4', 'A with E, a with e, and the two swapped versions: A with e, and a with E.', 'Yes. 4 kinds.', true],
    ['one', '1', 'Meiosis doesn\'t copy one version into every egg; each egg gets one of several.', 'There is more than one kind.', 'meiosis-is-copy'],
    ['new', 'Too many to count: it makes brand-new genes', 'Crossing over swaps sections between partners. It mixes genes that are already there.', 'No new genes. It mixes them.', 'crossing-over-new-genes', true],
  ], { goFurther: 'B2-I3gf' }),
);
T({
  ...choice('B2', 'B2-I3gf', 'independent', B('Real newts have about 12 pairs of chromosomes. Leaving crossing over aside, how many different eggs could one newt make? (2 × 2 × 2 ..., 12 times)', 'With 12 pairs, how many kinds of eggs?'), [
    ['24', '24', 'Each pair doubles the number; it doesn\'t add 2. 2 multiplied by itself 12 times is 4,096.', 'Multiply, don\'t add.', 'combos-add'],
    ['4096', '4,096', '2 choices for each of 12 pairs: 4,096 different eggs, before crossing over adds even more.', 'Yes. 4,096.', true],
    ['12', '12', 'Each pair doesn\'t make its own kind of egg; every egg has one chromosome from every pair.', 'Every egg has all 12 pairs.', 'one-egg-per-pair'],
  ]),
  isGoFurther: true,
});
T({
  ...base('B2', 'B2-C1', 'checkpoint', 'gamete'),
  gamete: 'egg',
  prompt: 'B2.C1.prompt',
  cell: { chromosomes: moth },
  feedback: gameteFeedback('B2.C1', B('One from each of the 3 pairs: 3 chromosomes, half of the moth\'s 6.', 'Yes. 3 chromosomes.')),
});
add({ 'B2.C1.prompt': B('A moth\'s egg-making cell has 3 pairs of chromosomes. Make one egg.', 'Make one moth egg.') });
T(
  choice('B2', 'B2-C2', 'checkpoint', B('Two kittens have the same mother and father but look different. Which is the best explanation?', 'Two kittens look different. Why?'), [
    ['blend', 'Each kitten blends its parents in a different amount, like mixing paint', 'Kittens don\'t get a blend; each gets a full set of chromosomes, one from each pair, from each parent.', 'They get chromosomes, not a blend.', 'blending'],
    ['shuffle', 'Each kitten came from a different egg and sperm, shuffled differently in meiosis', 'Meiosis shuffles chromosomes and swaps sections, so every egg and sperm is different.', 'Yes. Different eggs and sperm.', true],
    ['same', 'They got the same chromosomes; food made them look different', 'Siblings don\'t get the same chromosomes; each egg and sperm carries a different mix.', 'They got different chromosomes.', 'siblings-identical'],
    ['copy', 'Meiosis copies the parents exactly, so one kitten must have different parents', 'Meiosis halves and shuffles; it doesn\'t copy. Different-looking siblings are normal.', 'Meiosis mixes. It does not copy.', 'meiosis-is-copy'],
  ]),
);

// ======================= B3 — Side by side =======================
add({
  'beat.B3.title': 'Side by side',
  'B3.side.title': 'Same cell, two jobs',
  'B3.side.body1': B('Step through both at once and read the counts under each side.', 'Watch both sides.'),
  'B3.side.body2': B('Mitosis copies, then divides once. Meiosis copies, then divides twice, shuffling and swapping along the way.', 'Mitosis divides once. Meiosis divides two times.'),
  'B3.side.mitosis': 'Mitosis',
  'B3.side.meiosis': 'Meiosis',
  'B3.side.count': '{c} chromosomes, {d} DNA molecules',
  'B3.side.countEach': '{n} cells, each: {c} chromosomes, {d} DNA molecules',
  'B3.bin.mitosis': 'Mitosis',
  'B3.bin.meiosis': 'Meiosis',
  'B3.bin.both': 'Both',
  'B3.end.title': 'Side by side: done',
  'B3.end.body1': B('Mitosis makes two cells identical to the parent: it builds and repairs the body. Meiosis makes four cells with half the chromosomes, all different: eggs or sperm.', 'Mitosis: same cells. Meiosis: different cells.'),
  'B3.end.body2': B('Both start by copying the chromosomes. What happens next is the difference.', 'Both copy first.'),
});
T(recall('B3', 'B3-R1', 'last-module', B('How many chromosomes does one of Fig\'s eggs have?', 'How many chromosomes in an egg?'), '2: one from each pair.'));
T(recall('B3', 'B3-R2', 'last-module', B('Give one reason why no two eggs are the same.', 'Why are eggs different?'), 'Chance decides which chromosome of each pair goes in, and partners swap sections.'));
T(recall('B3', 'B3-R3', 'prior-unit', B('What does a cell do to its chromosomes before it divides?', 'What happens before a cell divides?'), 'It copies them: each becomes an X.'));
T(
  predict('B3', 'B3-P1', 'predict', B('Mitosis and meiosis start with the same cell. Predict two ways the new cells will be different.', 'How will the new cells be different?'), {
    frames: 'B3.P1.frame',
    wordBank: 'B3.P1.bank',
  }),
);
add({ 'B3.P1.frame': B('Mitosis makes ___. Meiosis makes ___.', 'Mitosis ___. Meiosis ___.'), 'B3.P1.bank': 'identical, different, half, full set, two cells, four cells' });
const classify = (beat, id, phase, prompt, bins, items, extra = {}) => {
  add({ [`${id}.prompt`]: prompt });
  return {
    ...base(beat, id, phase, 'classify'),
    prompt: `${id}.prompt`,
    bins,
    items: items.map(([key, txt, bin, mis]) => {
      add({ [`${id}.item.${key}`]: txt });
      return { id: key, text: `${id}.item.${key}`, bin, ...(mis ? { misconception: mis } : {}) };
    }),
    ...extra,
  };
};
T(
  classify('B3', 'B3-G1', 'guided', B('Sort each statement: is it true of mitosis, meiosis, or both?', 'Mitosis, meiosis, or both?'), ['B3.bin.mitosis', 'B3.bin.meiosis', 'B3.bin.both'], [
    ['two', B('Makes 2 new cells', 'Makes 2 cells'), 0, 'meiosis-is-copy'],
    ['four', B('Makes 4 new cells', 'Makes 4 cells'), 1, 'mitosis-halves'],
    ['same', B('The new cells are identical to the parent cell', 'New cells are the same as the parent'), 0, 'meiosis-is-copy'],
    ['half', B('Each new cell gets one chromosome from every pair', 'Each new cell gets half'), 1, 'mitosis-halves'],
    ['copy', B('The chromosomes are copied first', 'Chromosomes are copied first'), 2, 'meiosis-no-copy'],
    ['swap', B('Partners swap sections of DNA', 'Partners swap pieces'), 1, 'swap-in-mitosis'],
    ['body', B('Builds and repairs the body, like Fig\'s tail', 'Builds the body'), 0, 'meiosis-is-copy'],
    ['eggs', B('Makes eggs and sperm', 'Makes eggs and sperm'), 1, 'mitosis-halves'],
  ], {
    hints: keys('B3.G1.hint', [
      B('Step through the animation again and read the counts under each side.', 'Watch the animation again.'),
      B('Only one of them swaps sections and halves the chromosomes. Both copy first.', 'Both copy first.'),
    ]),
  }),
);
add({ 'B3-G1.fb.correct': B('All sorted. Mitosis copies; meiosis halves and shuffles; both start by copying.', 'All correct.') });
T(
  choice('B3', 'B3-I1', 'independent', B('A cell with 6 chromosomes (3 pairs) goes through meiosis. How many chromosomes are in each new cell?', '6 chromosomes. After meiosis, how many in each cell?'), [
    ['six', '6', 'That would be mitosis. Meiosis gives each new cell one chromosome from every pair.', 'Meiosis halves.', 'meiosis-is-copy'],
    ['three', '3', 'One from each of the 3 pairs: half the chromosomes.', 'Yes. 3.', true],
    ['twelve', '12', 'Copying makes each chromosome an X, but it is still one chromosome. Then meiosis halves the number.', 'An X is still 1 chromosome.', 'copy-doubles-chromosomes'],
    ['two', '2', 'Each new cell needs one chromosome from every pair, and there are 3 pairs.', 'One from each of 3 pairs.', 'gamete-missing-pair', true],
  ]),
);
T(
  choice('B3', 'B3-C1', 'checkpoint', B('A skin cell divides to heal a scrape. A cell in an ovary divides to make eggs. Which statement is true?', 'Skin cell and egg cell. Which is true?'), [
    ['both-same', 'Both make cells identical to the parent', 'Eggs are made by meiosis, which halves and shuffles.', 'Eggs are different.', 'meiosis-is-copy'],
    ['both-half', 'Both halve the number of chromosomes', 'Healing uses mitosis, which keeps the full set.', 'Skin cells keep all of them.', 'mitosis-halves'],
    ['right', 'The new skin cells are identical to the parent; the eggs all differ from each other', 'Mitosis copies (skin); meiosis halves and shuffles (eggs).', 'Yes.', true],
    ['swapped', 'The new skin cells all differ; the eggs are identical', 'That is the wrong way round: mitosis makes identical cells, meiosis makes different ones.', 'It is the other way round.', 'mitosis-shuffles'],
  ]),
);
T(
  predict('B3', 'B3-C2', 'checkpoint', B('Look back at your prediction. In your own words: how is meiosis different from mitosis? Give two differences.', 'How is meiosis different from mitosis?'), {
    showEarlier: 'B3-P1',
  }),
);

// ======================= B4 — Variation lab =======================
add({
  'beat.B4.title': 'Variation lab',
  'B4.intro.title': 'Three tanks',
  'B4.intro.body': B('Each tank shows one way new variation can appear. Watch where the change happens: in a body cell, or in a cell that makes eggs.', 'Three tanks, three kinds of change.'),
  'B4.tank.shuffle': 'Tank 1: the shuffle',
  'B4.tank.copy': 'Tank 2: a copying error',
  'B4.tank.uv': 'Tank 3: the old UV lamp',
  'B4.tank.none': 'Run a tank to see the result',
  'B4.ui.run': 'Run {name}',
  'B4.ui.show': 'Show {name}',
  'B4.box.parent': 'Parent newt',
  'B4.box.body': 'Body cells (skin, tail, blood)',
  'B4.box.germ': 'Egg-making cells',
  'B4.box.eggs': 'Eggs',
  'B4.box.young': 'Hatchlings',
  'B4.tag.here': '★ Change happens here',
  'B4.tag.carries': '✓ Carries the change',
  'B4.noPath': 'Body cells don\'t make eggs',
  'B4.result.yes': 'Passed on to the hatchlings: yes',
  'B4.result.no': 'Passed on to the hatchlings: no',
  'B4.rule.title': 'The rule',
  'B4.rule.body1': B('A change in a body cell, like skin, stays in that newt. It never reaches the eggs.', 'Skin changes stay in the newt.'),
  'B4.rule.body2': B('A change in an egg-making or sperm-making cell can end up in the young. So can the new mixes that meiosis makes.', 'Changes in egg cells can go to the babies.'),
  'B4.rule.body': 'Changes here stay in this newt',
  'B4.rule.germ': 'Changes here can reach the hatchlings',
  'B4.card.shuffle': B('Tank 1: meiosis shuffles chromosomes, so every egg is different. New mixes are passed on.', 'Tank 1: new mixes. Passed on.'),
  'B4.card.copy': B('Tank 2: a copying error in an egg-making cell gave Hatchling 5 a white tail tip. Passed on.', 'Tank 2: copy error in an egg cell. Passed on.'),
  'B4.card.uv': B('Tank 3: UV light changed a patch of skin. Her young had normal skin. Not passed on.', 'Tank 3: UV changed skin. Not passed on.'),
  'B4.lab.fb.done': B('All three tanks are in the evidence locker. Two kinds of change reached the young; one didn\'t.', 'All three tanks are done.'),
  'B4.bin.yes': 'Can be passed on',
  'B4.bin.no': 'Not passed on',
  'B4.end.title': 'Variation lab: done',
  'B4.end.body1': B('New variation that can be inherited comes from three places: new mixes made by meiosis, copying errors in egg- or sperm-making cells, and changes caused by the environment in those cells.', 'Three kinds of change can go to babies.'),
  'B4.end.body2': B('A change only reaches the young if it is in the cells that make eggs or sperm.', 'The change must be in egg or sperm cells.'),
  'locker.title': 'Evidence locker',
  'locker.empty': 'No evidence filed yet.',
  'locker.card.lab-shuffle': 'Tank 1: new mixes from meiosis are passed on.',
  'locker.card.lab-copy': 'Tank 2: a copy error in an egg-making cell is passed on (Hatchling 5\'s white tail tip).',
  'locker.card.lab-uv': 'Tank 3: UV damage to skin is not passed on.',
  'locker.card.test-figTail': 'Fig\'s tail clip: does not match the hatchlings.',
  'locker.card.test-figSkin': 'Fig\'s skin: same bands as her tail; does not match the hatchlings.',
  'locker.card.test-figBlood': 'Fig\'s blood: same bands as her tail; does not match the hatchlings.',
  'locker.card.test-figEggs': 'Fig\'s egg cells: match the hatchlings in every marker.',
});
T(recall('B4', 'B4-R1', 'last-module', B('What does meiosis make?', 'What does meiosis make?'), 'Eggs or sperm: cells with half the chromosomes, each one different.'));
T(recall('B4', 'B4-R2', 'last-week', B('In the DNA test, which adult matched Hatchling 2?', 'Who matched Hatchling 2?'), 'Barty matched. Fig\'s tail clip did not.'));
T(recall('B4', 'B4-R3', 'prior-unit', B('Why do a bone cell and a skin cell from the same newt have the same DNA?', 'Why do bone and skin cells have the same DNA?'), 'Both were made by mitosis, which copies DNA exactly.'));
T({
  ...base('B4', 'B4-L1', 'guided', 'lab'),
  prompt: 'B4.L1.prompt',
  tanks: [
    { id: 'shuffle', card: 'B4.card.shuffle' },
    { id: 'copy', line: 'VO-B10', card: 'B4.card.copy' },
    { id: 'uv', line: 'VO-B11', card: 'B4.card.uv' },
  ],
  hints: keys('B4.L1.hint', [B('After each run, find the star: that is where the change happened. Then follow the arrows to the hatchlings.', 'Find the star. Follow the arrows.')]),
});
add({ 'B4.L1.prompt': B('Run all three tanks. For each one, find where the change happens and whether it reaches the hatchlings.', 'Run the three tanks.') });
T(
  classify('B4', 'B4-G1', 'guided', B('Sort each change: can it be passed on to the young, or not?', 'Can the babies get this change?'), ['B4.bin.yes', 'B4.bin.no'], [
    ['mix', B('A new mix of chromosomes in an egg (the shuffle)', 'A new mix in an egg'), 0, 'siblings-identical'],
    ['sperm', B('A copying error in a sperm-making cell', 'A copy error in a sperm cell'), 0, 'environment-never-inherited'],
    ['uv', B('A patch of skin changed by UV light', 'Skin changed by UV light'), 1, 'all-changes-inherited'],
    ['tail', B('A copying error in a tail cell while the tail regrows', 'A copy error in a tail cell'), 1, 'all-changes-inherited'],
    ['legs', B('Strong legs from a newt that swims a lot', 'Strong legs from swimming'), 1, 'acquired-traits'],
    ['uvgerm', B('UV damage to an egg-making cell', 'UV damage to an egg cell'), 0, 'environment-never-inherited'],
  ], {
    hints: keys('B4.G1.hint', [
      B('Ask: is the change in a cell that makes eggs or sperm?', 'Is it in an egg or sperm cell?'),
      B('What caused the change doesn\'t matter. Where it happened does.', 'Where did it happen?'),
    ]),
  }),
);
add({ 'B4-G1.fb.correct': B('All sorted. Only changes in egg- or sperm-making cells, and new mixes from meiosis, reach the young.', 'All correct.') });
T(
  choice('B4', 'B4-I1', 'independent', B('A fisher gets a sun-damaged patch of skin after years outdoors. Will their children inherit the change?', 'Sun changed a fisher\'s skin. Will the children get it?'), [
    ['all', 'Yes: every change in the body is passed on', 'Only changes in cells that make eggs or sperm can be passed on.', 'Skin changes are not passed on.', 'all-changes-inherited'],
    ['long', 'Yes, if the change lasts long enough', 'How long it lasts doesn\'t matter; skin cells never make eggs or sperm.', 'Skin does not make eggs or sperm.', 'acquired-traits'],
    ['skin', 'No: skin cells don\'t make eggs or sperm', 'The change is in skin cells, so it stays with the fisher.', 'Yes. It stays in the skin.', true],
    ['never', 'No: changes caused by the sun can never be inherited', 'Right answer, wrong reason. Sun damage to egg- or sperm-making cells could be inherited; here it hit skin.', 'Right, but the reason is wrong.', 'environment-never-inherited'],
  ]),
);
T(
  choice('B4', 'B4-C1', 'checkpoint', B('A mouse is born with curly fur, though both parents have straight fur and no relative has ever had curly fur. Which explanation is most likely?', 'A mouse has curly fur. Its parents do not. Why?'), [
    ['learned', 'The mother\'s fur turned curly during her life and she passed it on', 'Changes during a parent\'s life aren\'t passed on unless they happen in egg- or sperm-making cells.', 'Changes in life are not passed on.', 'acquired-traits'],
    ['blend', 'Straight fur from two parents blended into curly fur', 'Traits don\'t blend like paint, and straight plus straight has no curly to blend.', 'Traits do not blend.', 'blending'],
    ['copy', 'A copying error in an egg-making or sperm-making cell of one parent', 'A new change in a cell that makes eggs or sperm can show up in the young.', 'Yes. A copy error.', true],
    ['skin', 'Sun damage to the father\'s skin cells', 'Skin cells don\'t make sperm, so their changes stay in the father.', 'Skin changes stay.', 'all-changes-inherited'],
  ]),
);

// ======================= B5 — The twist =======================
add({
  'beat.B5.title': 'The twist',
  'B5.night.title': 'Two facts that can\'t both be true',
  'B5.night.body': B('Fig laid the eggs: the camera saw it. The test says she isn\'t the mother. Time to test more of Fig.', 'Let\'s test more of Fig.'),
  'B5.reveal.title': 'Two newts in one',
  'B5.reveal.body': B('Fig\'s body and Fig\'s egg cells have different DNA.', 'Fig has two kinds of DNA.'),
  'B5.lines.title': 'How it happened',
  'B5.lines.body1': B('Long before Fig hatched, two embryos fused into one. Each line of cells kept copying itself exactly, by mitosis.', 'Two embryos joined.'),
  'B5.lines.body2': B('Line 1 built her tail, skin and blood. Line 2 built the cells that make her eggs, so only line 2 reaches the hatchlings.', 'One line made the body. One made the eggs.'),
  'B5.lines.embryo1': 'Embryo 1',
  'B5.lines.embryo2': 'Embryo 2',
  'B5.lines.fig': 'Fig: one embryo, two cell lines',
  'B5.lines.line1': 'Line 1 (mitosis)',
  'B5.lines.line2': 'Line 2 (mitosis)',
  'B5.lines.body': 'Tail, skin, blood',
  'B5.lines.eggs': 'Egg cells',
  'B5.lines.young': 'Hatchlings',
  'gel.result.figTail': B('Tail clip: does not match Hatchling 2 (Ada ran it twice: same bands both times).', 'Tail: no match.'),
  'gel.result.figSkin': B('Skin: the same bands as the tail clip. Does not match Hatchling 2.', 'Skin: no match.'),
  'gel.result.figBlood': B('Blood: the same bands as the tail clip. Does not match Hatchling 2.', 'Blood: no match.'),
  'gel.result.figEggs': B('Egg cells: a match for Hatchling 2 in every marker (run twice: same result).', 'Egg cells: match!'),
  'B5.end.title': 'The twist: done',
  'B5.end.body1': B('Fig is a chimera: one body, two cell lines with different DNA. Mitosis copied each line faithfully.', 'Fig is a chimera.'),
  'B5.end.body2': B('Only the line that makes her eggs is inherited. The tail clip just sampled the wrong Fig.', 'Only the egg cells go to the babies.'),
});
T(recall('B5', 'B5-R1', 'last-module', B('Which changes can be passed on to the young?', 'Which changes go to the babies?'), 'Changes in egg- or sperm-making cells (and new mixes from meiosis), not changes in body cells.'));
T(recall('B5', 'B5-R2', 'last-week', B('In meiosis, what does each egg get?', 'What does each egg get?'), 'One chromosome from every pair.'));
T(recall('B5', 'B5-R3', 'prior-unit', B('How exactly does mitosis copy DNA?', 'Does mitosis copy DNA exactly?'), 'Exactly: both new cells get the same DNA as the parent.'));
T({
  ...base('B5', 'B5-T1', 'guided', 'bands'),
  prompt: 'B5.T1.prompt',
  mode: 'tissues',
  lanes: ['barty', 'h2'],
  samples: ['figTail', 'figSkin', 'figBlood', 'figEggs'],
  lines: ['VO-B14'],
  hints: keys('B5.T1.hint', [B('Test the egg cells and at least one other part of Fig, then compare each new lane with Hatchling 2.', 'Test the egg cells and one more.')]),
  feedback: [{ when: 'correct', text: 'B5.T1.fb.correct' }],
});
add({
  'B5.T1.prompt': B('Choose which parts of Fig to test. Test her egg cells and at least one other tissue.', 'Test parts of Fig.'),
  'B5.T1.fb.correct': B('Fig\'s body samples match each other but not Hatchling 2. Her egg cells match Hatchling 2 in every marker.', 'The egg cells match.'),
});
T(
  choice('B5', 'B5-I1', 'independent', B('Which of Fig\'s samples could have come from the hatchlings\' mother?', 'Which sample matches the mother?'), [
    ['tail', 'The tail clip', 'The tail clip shares only one band with Hatchling 2.', 'The tail does not match.', 'dna-same-everywhere'],
    ['blood', 'The blood', 'Blood has the same bands as the tail: no match.', 'Blood does not match.', 'dna-same-everywhere'],
    ['eggs', 'The egg cells', 'The egg cells match Hatchling 2 in every marker.', 'Yes. The egg cells.', true],
    ['none', 'None: the eggs must have been swapped', 'Fig\'s own egg cells match. No swap is needed to explain it.', 'Fig\'s eggs match.', 'eggs-swapped', true],
  ]),
);
T(
  choice('B5', 'B5-I2', 'independent', B('Why did the tail-clip test say Fig was not the mother?', 'Why did the tail test say "not the mother"?'), [
    ['machine', 'The DNA machine made a mistake', 'Ada ran the tail twice and got the same bands; skin and blood agree too.', 'The test was right.', 'test-error'],
    ['mutation', 'One mutation changed the hatchlings\' DNA', 'One copying error changes one place; Hatchling 2 differs in 5 of 6 markers.', 'Too many differences.', 'one-mutation'],
    ['lines', 'Her tail was built by a different cell line than her eggs', 'The tail comes from line 1; her eggs come from line 2.', 'Yes. Two cell lines.', true],
    ['swap', 'Someone swapped the eggs', 'Fig\'s own egg cells match the hatchlings, and the camera saw her lay them.', 'Her eggs match.', 'eggs-swapped'],
  ]),
);
T(
  choice('B5', 'B5-C1', 'checkpoint', B('A chimera cat\'s fur is made by one cell line and its eggs by another. To find out what its kittens could inherit, which sample should you test?', 'A chimera cat. Which sample shows what kittens get?'), [
    ['fur', 'Its fur', 'Fur comes from the other line, which the kittens don\'t inherit.', 'Not the fur.', 'dna-same-everywhere'],
    ['blood', 'Its blood', 'Blood could come from either line; only the egg-making line is inherited.', 'Not the blood.', 'dna-same-everywhere'],
    ['eggs', 'Cells from its egg-making tissue', 'Only the egg-making line passes DNA to the kittens.', 'Yes. Egg cells.', true],
    ['any', 'Any sample: all its cells have the same DNA', 'In a chimera, the two cell lines have different DNA.', 'A chimera has two kinds of DNA.', 'dna-same-everywhere'],
  ]),
);

// ======================= B6 — Claim and defend =======================
add({
  'beat.B6.title': 'Claim and defend',
  'B6.board.title': 'Make your case',
  'B6.board.body1': B('Here is your evidence locker: the cards you filed in the lab and the tissue tests.', 'Here is your evidence.'),
  'B6.board.body2': B('A strong argument has a claim, the evidence for it, and the reasoning that links them. Then it answers the other side.', 'Claim. Evidence. Reason.'),
  'B6.end.title': 'Claim and defend: done',
  'B6.end.body1': B('Fig is the mother. Her egg-making cells carry a second cell line, and that is the DNA the hatchlings inherited.', 'Fig is the mother.'),
  'B6.end.body2': B('Good evidence answers each counterclaim directly: the camera, the repeat runs, and the number of differences.', 'Evidence answers each idea.'),
});
T(recall('B6', 'B6-R1', 'last-module', B('What is a chimera?', 'What is a chimera?'), 'One body made of two cell lines with different DNA (for Fig: two embryos that fused).'));
T(recall('B6', 'B6-R2', 'last-module', B('Which of Fig\'s samples matched the hatchlings?', 'Which sample matched?'), 'Her egg cells.'));
T(recall('B6', 'B6-R3', 'prior-unit', B('What does mitosis do to the DNA in each new cell?', 'Mitosis and DNA?'), 'Copies it exactly.'));
T(
  predict('B6', 'B6-G1', 'guided', B('Write your claim: is Fig the hatchlings\' mother? Add two pieces of evidence from the locker.', 'Is Fig the mother? Give two pieces of evidence.'), {
    showEarlier: 'B0-P1',
    frames: 'B6.G1.frame',
    wordBank: 'B6.G1.bank',
  }),
);
add({
  'B6.G1.frame': B('I claim that ___. One piece of evidence is ___. Another is ___. This shows ___ because ___.', 'I claim ___. My evidence is ___.'),
  'B6.G1.bank': 'mother, egg cells, tail clip, cell line, chimera, matches, bands, mitosis',
});
T(
  choice('B6', 'B6-I1', 'independent', B('Tomás still says someone swapped the eggs. Which evidence answers him best?', 'Tomás says the eggs were swapped. Which evidence answers him?'), [
    ['tank', 'The hatchlings live in Fig\'s tank', 'Being in Fig\'s tank doesn\'t show where the eggs came from.', 'Where they live is not proof.', 'correlation-is-cause'],
    ['barty', 'Barty is the father', 'Barty matching says nothing about who the mother is.', 'That is about the father.', 'one-parent-proves-both'],
    ['camera', 'Camera footage shows Fig laying these eggs, and her egg cells match them', 'Direct evidence: she was seen laying them, and her egg-cell DNA matches.', 'Yes. Camera and DNA.', true],
    ['calm', 'Fig doesn\'t seem upset', 'How a newt acts isn\'t evidence about DNA.', 'That is not evidence.', 'opinion-as-evidence', true],
  ]),
);
T(
  choice('B6', 'B6-I2', 'independent', B('Noor wonders if the DNA machine made a mistake. Which evidence answers her best?', 'Noor thinks the machine was wrong. Which evidence answers her?'), [
    ['repeat', 'Ada ran the tests again and got the same bands each time', 'Repeat runs that agree make a machine error very unlikely.', 'Yes. Same result every time.', true],
    ['surprise', 'Surprising results are usually mistakes', 'A surprising result is a reason to repeat the test, not to throw it out.', 'Surprising is not wrong.', 'test-error'],
    ['barty', 'Barty\'s result was right, so Fig\'s must be too', 'One result being right doesn\'t prove another one.', 'Each result needs its own check.', 'one-parent-proves-both'],
    ['careful', 'Ada is very careful', 'Trusting a person isn\'t the same as evidence; repeat runs are.', 'Look for data.', 'opinion-as-evidence'],
  ]),
);
T(
  choice('B6', 'B6-I3', 'independent', B('Someone suggests that one mutation in Fig\'s eggs changed their DNA. Which evidence answers this best?', 'Did one mutation change Fig\'s eggs?'), [
    ['anything', 'Mutations can change anything', 'One copying error changes one place in the DNA, not a whole profile.', 'One error is small.', 'one-mutation'],
    ['regrew', 'Fig\'s tail regrew, so her DNA must have changed', 'Regrowth is mitosis, which copies DNA exactly.', 'Mitosis copies exactly.', 'all-changes-inherited'],
    ['five', 'Hatchling 2 differs from Fig\'s tail in 5 of 6 markers: far too many for one copying error', 'Five markers differ. One mutation can\'t explain that; a second cell line can.', 'Yes. Too many differences.', true],
    ['broken', 'The test is broken', 'Repeat runs gave the same bands.', 'The test was checked.', 'test-error'],
  ]),
);
T(
  choice('B6', 'B6-I4', 'independent', B('The hatchlings hatched in the same week the old UV lamp was repaired. Does that show the lamp changed their DNA?', 'The lamp was fixed the same week. Did it change their DNA?'), [
    ['yes', 'Yes: they happened at the same time, so the lamp caused it', 'Two things happening together doesn\'t show that one caused the other.', 'Same time is not cause.', 'correlation-is-cause'],
    ['no', 'No: two things happening at the same time doesn\'t show that one caused the other', 'You would need evidence of how the lamp could have changed them. The DNA tests already explain the result.', 'Yes. Same time is not proof.', true],
    ['never', 'No: UV light can never change DNA', 'UV can change DNA (Tank 3). The point is that timing alone isn\'t evidence.', 'UV can change DNA.', 'environment-never-inherited'],
    ['sat', 'Yes: if the mother sat under the lamp, the young inherit it', 'UV on her skin wouldn\'t reach the young, and timing alone shows nothing.', 'Skin changes stay.', 'acquired-traits'],
  ]),
);
T(predict('B6', 'B6-C1', 'checkpoint', B('Write your full argument for Tomás. Make a claim, give evidence, explain your reasoning, and answer at least one counterclaim.', 'Write your argument for Tomás.')));

// ======================= B7 — Epilogue =======================
add({
  'beat.B7.title': 'Her own aunt',
  'B7.title': 'Epilogue',
  'B7.body1': B('Fig\'s eggs come from the cell line of her fused twin. The hatchlings are, genetically, her twin\'s young: her nieces and nephews.', 'Fig\'s eggs came from her twin.'),
  'B7.cycle.title': 'The whole life cycle',
  'B7.cycle.body1': B('Both halves are filled in now: meiosis makes eggs and sperm, fertilisation joins them, and mitosis builds the body.', 'Now the life cycle is complete.'),
  'B7.cycle.body2': B('Chimeras happen in other animals too, including people. Usually nobody knows, unless a DNA test gives a surprising answer, just like Fig\'s.', 'People can be chimeras too.'),
  'B7.done.title': 'Part B: done',
  'B7.done.body1': B('You solved the mystery with evidence: DNA profiles, the variation lab, and how meiosis and mitosis work.', 'You solved the mystery.'),
  'B7.done.body2': B('One last step: the checkpoint.', 'Next: the checkpoint.'),
});

// ======================= B-check — Checkpoint =======================
add({
  'beat.Bcheck.title': 'Checkpoint',
  'Bcheck.intro.title': 'Part B checkpoint',
  'Bcheck.intro.body1': B('Five questions about new situations. Work on your own: hints, worked steps and sentence starters are off.', 'Five questions. Work on your own.'),
  'Bcheck.intro.body2': B('Your first answer counts. The last question asks you to make a claim; your teacher will read it.', 'Your first answer counts.'),
  'Bcheck.end.title': 'Checkpoint: done',
  'Bcheck.end.body1': B('You explained where new, inheritable variation comes from: new mixes in meiosis, copying errors, and changes caused by the environment in egg- or sperm-making cells.', 'You explained where variation comes from.'),
  'Bcheck.end.body2': B('And you know why a change has to be in those cells to be passed on.', 'Changes must be in egg or sperm cells.'),
});
T(recall('B-check', 'Bc-R1', 'prior-unit', B('Why does a regrown tail have the same DNA as the rest of the newt?', 'Why does a new tail have the same DNA?'), 'Mitosis copies the DNA exactly.'));
T(recall('B-check', 'Bc-R2', 'last-week', B('How many chromosomes does an egg get, compared with a body cell?', 'Egg cell or body cell: which has more chromosomes?'), 'Half: one from each pair.'));
T(recall('B-check', 'Bc-R3', 'last-week', B('Name three sources of new variation that can be passed on.', 'Name three kinds of change that go to babies.'), 'New mixes from meiosis, copying errors in egg- or sperm-making cells, and environment-caused changes in those cells.'));
const frog = [rod('2M', 2, 'M', 'medium', ['G']), rod('1P', 1, 'P', 'long', ['f']), rod('3P', 3, 'P', 'short', ['h']), rod('1M', 1, 'M', 'long', ['F']), rod('2P', 2, 'P', 'medium', ['g']), rod('3M', 3, 'M', 'short', ['H'])];
T({
  ...base('B-check', 'Bc-C1', 'checkpoint', 'gamete'),
  gamete: 'sperm',
  prompt: 'Bc.C1.prompt',
  cell: { chromosomes: frog },
  feedback: gameteFeedback('Bc.C1', B('One chromosome from each of the 3 pairs: half of the frog\'s 6.', 'Yes. 3 chromosomes.')),
});
add({ 'Bc.C1.prompt': B('A frog\'s sperm-making cell has 3 pairs of chromosomes. Make one sperm.', 'Make one frog sperm.') });
T(
  choice('B-check', 'Bc-C2', 'checkpoint', B('Two sisters (not twins) have the same parents, but their DNA is different. Why?', 'Two sisters have different DNA. Why?'), [
    ['shuffle', 'Each came from a different egg and sperm, each with its own shuffle', 'Meiosis makes every egg and sperm different.', 'Yes. Different eggs and sperm.', true],
    ['older', 'The older sister\'s DNA changed as she grew up', 'Growing up uses mitosis, which copies DNA exactly.', 'DNA does not change as you grow.', 'acquired-traits'],
    ['same', 'Their DNA is really the same; tests can\'t tell them apart', 'Siblings get different mixes; tests can tell them apart.', 'Their DNA is different.', 'siblings-identical'],
    ['blend', 'Each got a different blend of their parents, like paint', 'Children get whole chromosomes, one from each pair, not a blend.', 'Not a blend.', 'blending'],
  ]),
);
T(
  classify('B-check', 'Bc-C3', 'checkpoint', B('Which of these changes could a lizard pass on to its young?', 'Can a lizard\'s babies get this change?'), ['B4.bin.yes', 'B4.bin.no'], [
    ['tail', B('A tail broken off by a cat', 'A broken tail'), 1, 'acquired-traits'],
    ['egg', B('A copying error in a cell that makes eggs', 'A copy error in an egg cell'), 0, 'environment-never-inherited'],
    ['sun', B('A sunburned patch of skin', 'Sunburned skin'), 1, 'all-changes-inherited'],
    ['mix', B('A new mix of chromosomes made in meiosis', 'A new mix from meiosis'), 0, 'siblings-identical'],
  ]),
);
add({ 'Bc-C3.fb.correct': B('All sorted: only changes in egg- or sperm-making cells, and new mixes, reach the young.', 'All correct.') });
T(
  choice('B-check', 'Bc-C4', 'checkpoint', B('A chemical in a pond damages the DNA in a newt\'s sperm-making cells. Could the change appear in its young?', 'A chemical changes sperm-making cells. Can the babies get it?'), [
    ['yes', 'Yes: sperm-making cells make the sperm that become the young', 'A change in sperm-making cells can be carried into a sperm and then the young.', 'Yes.', true],
    ['never', 'No: changes caused by the environment are never inherited', 'The cause doesn\'t matter; where the change happens does.', 'Where it happens matters.', 'environment-never-inherited'],
    ['long', 'Only if the newt lives in the pond for a long time', 'Time in the pond doesn\'t decide it; whether the sperm carry the change does.', 'Time does not matter.', 'acquired-traits'],
    ['skin', 'Yes, and so will every change in its skin', 'Skin changes stay in the newt.', 'Skin changes stay.', 'all-changes-inherited'],
  ]),
);
T(predict('B-check', 'Bc-C5', 'checkpoint', B('Two brown rabbits have 8 young. One is white, and no rabbit in the family has ever been white. Make a claim about where this new variation came from, and support it with evidence and reasoning.', 'One baby rabbit is white. Where did this come from? Explain.')));


// ---------- Shared text ----------
add({
  'div.start': 'The starting cell: 4 chromosomes',
  'div.copy': 'Every chromosome is copied (each becomes an X)',
  'div.pairUp': 'Partners pair up',
  'div.swap': 'Partners swap matching sections',
  'div.partnersApart': 'Partners separate: 2 cells',
  'div.copiesApart': 'The halves of each X separate: 4 cells, each with one of every pair',
  'div.lineUp': 'The Xs line up in single file',
  'div.mitosisDone': 'The halves of each X separate: 2 cells, each with the full set',
  'fert.egg': 'Egg',
  'fert.sperm': 'Sperm',
  'fert.zygote': 'Fertilised egg',
  'fert.start': 'An egg and a sperm: 2 chromosomes each',
  'fert.join': 'They join: 4 chromosomes, a full set',
  'fert.siblings': 'Same parents, different shuffle',
  'fert.sib1': 'Sibling 1',
  'fert.sib2': 'Sibling 2',
  'fert.sib3': 'Sibling 3',
  'gamete.parent.egg': 'Egg-making cell',
  'gamete.parent.sperm': 'Sperm-making cell',
  'gamete.new.egg': 'New egg',
  'gamete.new.sperm': 'New sperm',
  'gamete.tray.egg': 'Different eggs made',
  'gamete.tray.sperm': 'Different sperm made',
  'gamete.ui.choose': 'Choose chromosomes:',
  'gamete.ui.chrom': 'Pair {pair}, from the {parent} ({alleles})',
  'gamete.ui.inNew.egg': 'in the new egg',
  'gamete.ui.inNew.sperm': 'in the new sperm',
  'gamete.ui.make.egg': 'Make this egg',
  'gamete.ui.make.sperm': 'Make this sperm',
  'gamete.ui.clear': 'Start again',
  'gamete.ui.status.egg': 'Chromosomes in the new egg: {n}',
  'gamete.ui.status.sperm': 'Chromosomes in the new sperm: {n}',
  'gamete.ui.made.egg': 'Eggs made so far',
  'gamete.ui.made.sperm': 'Sperm made so far',
  'gamete.ui.noneYet': 'None yet.',
  'gamete.fb.full-set': B('That is all of them: a full set. If eggs and sperm had full sets, the young would end up with twice as many chromosomes as their parents.', 'That is all of them. Take half.'),
  'gamete.fb.both-of-pair': B('This one has both chromosomes of a pair and is missing another pair. Every pair must send exactly one.', 'One from each pair.'),
  'gamete.fb.missing-pair': B('One pair has no chromosome here. Every pair must send one, or the young would be missing those genes.', 'Every pair sends one.'),
  'gamete.fb.duplicate.egg': B('You already made that egg. Try a different mix.', 'You made this one. Try another.'),
  'gamete.fb.duplicate.sperm': B('You already made that sperm. Try a different mix.', 'You made this one. Try another.'),
  'gamete.fb.another.egg': B('A new egg. {n} more to find.', 'New egg! {n} more.'),
  'gamete.fb.another.sperm': B('A new sperm. {n} more to find.', 'New sperm! {n} more.'),
  'classify.fb.some': B('{n} not right yet. They are marked with ✗; try those again.', '{n} not right yet.'),
  'gel.marker': 'Marker',
  'gel.tableToggle': 'Read the bands as a table',
  'gel.tableNote': 'Numbers show where each band sits inside its marker: 1 is the top row, 5 the bottom.',
  'gel.ui.markIn': 'Bands in {lane}:',
  'gel.ui.marker': 'Marker {n}',
  'gel.ui.upper': 'Upper band',
  'gel.ui.lower': 'Lower band',
  'gel.ui.only': 'Band',
  'gel.ui.bandAria': 'Marker {n}, {which} (row {row})',
  'gel.ui.choose': 'Samples to test:',
  'gel.ui.test': 'Test: {sample}',
  'gel.fb.missed': B('Some matching bands aren\'t marked yet. Check each marker again.', 'Some matches are missing.'),
  'gel.fb.extra': B('A marked band doesn\'t match. A band only matches if it sits at exactly the same height, in the same marker.', 'One band does not match.'),
  'glossary.meiosis': 'Cell division that makes eggs or sperm: each new cell gets half the chromosomes, one from every pair.',
  'glossary.words.meiosis': 'meiosis',
  'glossary.gamete': 'An egg or a sperm. It has half the chromosomes of a body cell.',
  'glossary.words.gamete': 'egg|eggs|sperm|gamete|gametes',
  'glossary.mutation': 'A change in DNA, for example from a copying error or UV light.',
  'glossary.words.mutation': 'mutation|mutations|copying error|copying errors',
  'glossary.chimera': 'One body made of two cell lines with different DNA.',
  'glossary.words.chimera': 'chimera|chimeras',
});

// ---------- Misconceptions ----------
const mis = {
  'gamete-full-set': 'Eggs and sperm get a full set of chromosomes, like body cells.',
  'gamete-both-of-pair': 'An egg or sperm can get both chromosomes of a pair.',
  'gamete-missing-pair': 'An egg or sperm can leave out a whole pair.',
  'meiosis-is-copy': 'Meiosis makes identical copies, like mitosis.',
  'meiosis-no-copy': 'Meiosis skips copying the chromosomes.',
  'swap-in-mitosis': 'Mitosis also swaps sections between partners.',
  'mitosis-shuffles': 'Mitosis makes cells that are all different.',
  'siblings-identical': 'Children of the same parents get the same chromosomes.',
  'crossing-over-new-genes': 'Crossing over makes brand-new genes (or makes nothing new).',
  'combos-add': 'Each new pair adds 2 combinations, instead of doubling them.',
  'one-egg-per-pair': 'Each pair of chromosomes makes its own kind of egg.',
  'blending': 'Children are a blend of their parents, like mixed paint.',
  'all-changes-inherited': 'Any change in the body gets passed on to the young.',
  'acquired-traits': 'Traits a parent gains during life get passed on.',
  'environment-never-inherited': 'Changes caused by the environment can never be passed on.',
  'dna-same-everywhere': 'Every cell in one body always has the same DNA.',
  'eggs-swapped': 'The eggs must have come from another newt.',
  'test-error': 'A surprising result means the test is wrong.',
  'one-mutation': 'One mutation can explain many differences at once.',
  'correlation-is-cause': 'Two things that happen together must cause each other.',
  'one-parent-proves-both': 'If one parent matches, the other must too.',
  'opinion-as-evidence': 'How someone acts or seems counts as evidence.',
  'dna-from-nowhere': 'Young animals make new DNA for themselves.',
  'all-from-father': 'All of a hatchling\'s DNA can come from one parent.',
  'band-near-match': 'Bands that are close in height count as a match.',
};
const misconceptions = {};
for (const [id, txt] of Object.entries(mis)) {
  const key = `mis.b.${id}`;
  misconceptions[id] = key;
  text[key] = txt;
}

// ---------- Beats ----------
const explain = (id, scene, title, body, lines, extra = {}) => ({ id, type: 'explain', scene, title, body, lines, ...extra });
const task = (id, t) => ({ id, type: 'task', task: t });
const beats = [
  {
    id: 'B0',
    title: 'beat.B0.title',
    module: 'B0-cold-open',
    standard: STD,
    built: true,
    kind: 'observe',
    sequencing: 'phenomenon-first',
    steps: [
      explain('B0-s01', 'title', 'B0.title.title', ['B0.title.body'], [], { panels: [{ asset: 'IMG-P09' }], assets: ['IMG-P09'], variant: 'app.partB' }),
      explain('B0-s02', 'story', 'B0.story1.title', ['B0.story1.body'], ['VO-B01'], { panels: [{ asset: 'IMG-P04' }], assets: ['IMG-P04'], ambience: 'SFX-25', sfx: ['SFX-25'] }),
      explain('B0-s03', 'story', 'B0.story2.title', ['B0.story2.body'], ['VO-B02', 'VO-B03'], {
        panels: [{ asset: 'IMG-P05', line: 0, sfx: 'SFX-21' }, { asset: 'IMG-P06', line: 1, sfx: 'SFX-22' }],
        assets: ['IMG-P05', 'IMG-P06'],
        ambience: 'SFX-25',
        sfx: ['SFX-21', 'SFX-22', 'SFX-25'],
      }),
      task('B0-s04', 'B0-T1'),
      task('B0-s05', 'B0-T2'),
      task('B0-s06', 'B0-T3'),
      task('B0-s07', 'B0-P1'),
    ],
  },
  {
    id: 'B1',
    title: 'beat.B1.title',
    module: 'B1-retrieval',
    standard: STD,
    built: true,
    kind: 'review',
    steps: [
      explain('B1-s01', 'story', 'B1.title', ['B1.body'], ['VO-B04'], { panels: [{ asset: 'IMG-B06' }], assets: ['IMG-B06'], ambience: 'SFX-25', sfx: ['SFX-25'] }),
      { id: 'B1-s02', type: 'retrieve', tasks: ['B1-R1', 'B1-R2', 'B1-R3', 'B1-R4'] },
      { id: 'B1-s03', type: 'intro', title: 'B1.end.title', body: ['B1.end.body1', 'B1.end.body2'] },
    ],
  },
  {
    id: 'B2',
    title: 'beat.B2.title',
    module: 'B2-make-gametes',
    standard: STD,
    built: true,
    sequencing: 'explicit-first',
    steps: [
      { id: 'B2-s01', type: 'retrieve', tasks: ['B2-R1', 'B2-R2', 'B2-R3'] },
      explain('B2-s02', 'meiosis', 'B2.meiosis.title', ['B2.meiosis.body1', 'B2.meiosis.body2'], ['VO-B05'], { cell: { chromosomes: fig }, sfx: ['SFX-11', 'SFX-15', 'SFX-12'] }),
      task('B2-s03', 'B2-G1'),
      task('B2-s04', 'B2-I1'),
      explain('B2-s05', 'meiosis', 'B2.shuffle.title', ['B2.shuffle.body1', 'B2.shuffle.body2'], ['VO-B06'], { cell: { chromosomes: fig }, variant: 'crossover', sfx: ['SFX-16', 'SFX-15'] }),
      task('B2-s06', 'B2-I2'),
      task('B2-s07', 'B2-I3'),
      explain('B2-s08', 'fertilise', 'B2.fert.title', ['B2.fert.body1', 'B2.fert.body2'], ['VO-B07'], { sfx: ['SFX-17'] }),
      task('B2-s09', 'B2-C1'),
      task('B2-s10', 'B2-C2'),
      { id: 'B2-s11', type: 'summary', title: 'B2.end.title', body: ['B2.end.body1', 'B2.end.body2'] },
    ],
  },
  {
    id: 'B3',
    title: 'beat.B3.title',
    module: 'B3-side-by-side',
    standard: STD,
    built: true,
    sequencing: 'attempt-first',
    steps: [
      { id: 'B3-s01', type: 'retrieve', tasks: ['B3-R1', 'B3-R2', 'B3-R3'] },
      task('B3-s02', 'B3-P1'),
      explain('B3-s03', 'sideBySide', 'B3.side.title', ['B3.side.body1', 'B3.side.body2'], ['VO-B08'], { sfx: ['SFX-11', 'SFX-16', 'SFX-15', 'SFX-12'] }),
      task('B3-s04', 'B3-G1'),
      task('B3-s05', 'B3-I1'),
      task('B3-s06', 'B3-C1'),
      task('B3-s07', 'B3-C2'),
      { id: 'B3-s08', type: 'summary', title: 'B3.end.title', body: ['B3.end.body1', 'B3.end.body2'] },
    ],
  },
  {
    id: 'B4',
    title: 'beat.B4.title',
    module: 'B4-variation-lab',
    standard: STD,
    built: true,
    sequencing: 'attempt-first',
    steps: [
      { id: 'B4-s01', type: 'retrieve', tasks: ['B4-R1', 'B4-R2', 'B4-R3'] },
      explain('B4-s02', 'story', 'B4.intro.title', ['B4.intro.body'], ['VO-B09'], { panels: [{ asset: 'IMG-B05' }], assets: ['IMG-B05'], ambience: 'SFX-25', sfx: ['SFX-25'] }),
      task('B4-s03', 'B4-L1'),
      explain('B4-s04', 'rule', 'B4.rule.title', ['B4.rule.body1', 'B4.rule.body2'], ['VO-B12']),
      task('B4-s05', 'B4-G1'),
      task('B4-s06', 'B4-I1'),
      task('B4-s07', 'B4-C1'),
      { id: 'B4-s08', type: 'summary', title: 'B4.end.title', body: ['B4.end.body1', 'B4.end.body2'] },
    ],
  },
  {
    id: 'B5',
    title: 'beat.B5.title',
    module: 'B5-the-twist',
    standard: STD,
    built: true,
    sequencing: 'attempt-first',
    steps: [
      { id: 'B5-s01', type: 'retrieve', tasks: ['B5-R1', 'B5-R2', 'B5-R3'] },
      explain('B5-s02', 'story', 'B5.night.title', ['B5.night.body'], ['VO-B13'], { panels: [{ asset: 'IMG-B07' }], assets: ['IMG-B07'], ambience: 'SFX-25', sfx: ['SFX-25'] }),
      task('B5-s03', 'B5-T1'),
      task('B5-s04', 'B5-I1'),
      explain('B5-s05', 'story', 'B5.reveal.title', ['B5.reveal.body'], ['VO-B15'], { panels: [{ asset: 'IMG-P07', sfx: 'SFX-24' }], assets: ['IMG-P07'], sfx: ['SFX-24'] }),
      explain('B5-s06', 'twoLines', 'B5.lines.title', ['B5.lines.body1', 'B5.lines.body2'], ['VO-B16'], { sfx: ['SFX-17', 'SFX-12'] }),
      task('B5-s07', 'B5-I2'),
      task('B5-s08', 'B5-C1'),
      { id: 'B5-s09', type: 'summary', title: 'B5.end.title', body: ['B5.end.body1', 'B5.end.body2'] },
    ],
  },
  {
    id: 'B6',
    title: 'beat.B6.title',
    module: 'B6-claim-and-defend',
    standard: STD,
    built: true,
    sequencing: 'explicit-first',
    steps: [
      { id: 'B6-s01', type: 'retrieve', tasks: ['B6-R1', 'B6-R2', 'B6-R3'] },
      explain('B6-s02', 'board', 'B6.board.title', ['B6.board.body1', 'B6.board.body2'], ['VO-B17'], { panels: [{ asset: 'IMG-B06' }], assets: ['IMG-B06'], ambience: 'SFX-25', sfx: ['SFX-25'] }),
      task('B6-s03', 'B6-G1'),
      task('B6-s04', 'B6-I1'),
      task('B6-s05', 'B6-I2'),
      task('B6-s06', 'B6-I3'),
      task('B6-s07', 'B6-I4'),
      task('B6-s08', 'B6-C1'),
      { id: 'B6-s09', type: 'summary', title: 'B6.end.title', body: ['B6.end.body1', 'B6.end.body2'] },
    ],
  },
  {
    id: 'B7',
    title: 'beat.B7.title',
    module: 'B7-epilogue',
    standard: STD,
    built: true,
    kind: 'observe',
    sequencing: 'phenomenon-first',
    steps: [
      explain('B7-s01', 'story', 'B7.title', ['B7.body1'], ['VO-B18'], { panels: [{ asset: 'IMG-P08' }], assets: ['IMG-P08'], ambience: 'SFX-25', sfx: ['SFX-25'] }),
      explain('B7-s02', 'lifecycle', 'B7.cycle.title', ['B7.cycle.body1', 'B7.cycle.body2'], [], { variant: 'complete' }),
      { id: 'B7-s03', type: 'intro', title: 'B7.done.title', body: ['B7.done.body1', 'B7.done.body2'] },
    ],
  },
  {
    id: 'B-check',
    title: 'beat.Bcheck.title',
    module: 'B-check',
    standard: STD,
    built: true,
    sequencing: 'explicit-first',
    steps: [
      { id: 'Bc-s01', type: 'retrieve', tasks: ['Bc-R1', 'Bc-R2', 'Bc-R3'] },
      { id: 'Bc-s02', type: 'intro', title: 'Bcheck.intro.title', body: ['Bcheck.intro.body1', 'Bcheck.intro.body2'] },
      task('Bc-s03', 'Bc-C1'),
      task('Bc-s04', 'Bc-C2'),
      task('Bc-s05', 'Bc-C3'),
      task('Bc-s06', 'Bc-C4'),
      task('Bc-s07', 'Bc-C5'),
      { id: 'Bc-s08', type: 'summary', title: 'Bcheck.end.title', body: ['Bcheck.end.body1', 'Bcheck.end.body2'] },
    ],
  },
];

const content = { version: 1, part: 'B', profiles, misconceptions, beats, tasks };
fs.writeFileSync(cp, JSON.stringify(content, null, 2) + '\n');
Object.assign(en, text);
fs.writeFileSync(ep, JSON.stringify(en, null, 2) + '\n');
console.log(`Part B written: ${beats.length} chapters, ${Object.keys(tasks).length} tasks, ${Object.keys(text).length} text entries`);
