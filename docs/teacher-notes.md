# Teacher notes

Notes for the teacher and for comparing pilot results. Students never see this file.

## Sequencing log

| Module | Learning target | Type | Sequencing | Why |
| --- | --- | --- | --- | --- |
| A0 | The phenomenon: a lost tail grows back | Phenomenon (OBSERVE) | Phenomenon first | Story and time-lapse, then every student writes a prediction before any instruction. A1 to A3 answer it. |
| A1 | Chromosome structure: an X is one chromosome with two DNA molecules | New representation | Explicit first | New vocabulary (centromere, chromatid) and a new counting procedure. Order: zoom ladder, pairs, copying animation, worked example, guided practice, independent practice. |
| A1 | Genes are sections of chromosomes; chromosomes come in pairs (one from each parent) | New vocabulary and representation | Explicit first | Students need the model (lengths, gene letters, solid M and striped P) before they can reason with it. |
| A2 | Mitosis makes two genetically identical cells | Conceptual, with prior knowledge from A1 (an X is one chromosome, copied) | Attempt first | Students divide a cell their own way (most skip copying and leave a cell short); then a stepped animation shows copy → line up → pull apart → two cells and why the copy comes first. Then guided, independent, checkpoint. |
| A2b | Cycle is continuous; most time in interphase; share of cells estimates share of time | New procedure (sorting by phase, counts → % → hours) | Explicit first | As the bible sets: narrator sorts 3 cells (VO-A18), students sort 6 with feedback, then the rest alone. |
| A3 | Same DNA in every cell; different genes switched on | Conceptual, with prior knowledge (genes, mitosis) | Attempt first | Students try to make a bone cell with the gene switches before VO-A13 explains; then they revisit their A0 prediction. |
| A4 | Model limits; independent evidence for 6.1.d | Checkpoint | Explicit first | Limits card, two questions on it, then the unit checkpoint (supports off, unfamiliar cases, one written explanation). |
| A-end | Plants the rule Part B breaks | Story | Phenomenon | VO-A15 and the life-cycle diagram (meiosis half greyed). |

## A0: The Heron Heist (cold open, SC.HS.6.1.d)

**Status: draft text.** Narration is VO-A01 to A03 from the bible; the title, step text and prediction prompt are drafts for your review.

1. Title card (IMG-P09) with the title added in code.
2. At the pond: IMG-P01 then IMG-P02, following the narration (VO-A01, A02). The heron sound (SFX-19) plays with P02; the pond ambience (SFX-26) loops quietly. Settings › Background sounds mutes it.
3. Six weeks later: the four stages of IMG-C03 cross-fade one at a time (play, pause, replay or step), with SFX-20, then IMG-P03 (VO-A03).
4. Predict: "Where do you think her body got the instructions to build it?" Written, or "I'm not sure yet". Saved in the browser, not graded.

**Framework note:** A0 is a story opener (OBSERVE), so it has no Retrieve block or checkpoint. The rule "every module opens with Retrieve" is met by A1, which follows straight after and recalls A0 in its warm-up. Say if you want a Retrieve block inside A0 instead.

## A1: Meet the chromosomes (chromosome primer, SC.HS.6.1.d)

**Status: draft.** All task text in `src/content/partA.json` and `src/i18n/en.json` is marked `"status": "draft"`. The story bible gives A1's narration (VO-A04 to VO-A08) but no Retrieve items, practice items, answers or feedback, so Claude drafted these for your review.

### Please check

1. **Retrieve items (A1-R1 to R4).** These assume Unit 2 covered cell structure: the smallest living unit, plant vs. animal cell parts, and the cell membrane. R4 recalls A0 (the tail grew back). Replace them if Unit 2 covered something else. The "last week" item is a guess.
2. **Glossary definitions** (`glossary.*` in en.json).
3. **Zoom ladder level text** (`A1.zoom.*.text`).
4. **The checkpoint organism.** C1 and C2 use "a different animal" with 3 pairs (2n = 6), so the case is unfamiliar. It is deliberately not named, because a real species would need a real chromosome number.

### Step order (16 steps)

1. Retrieve: 4 recall items. Students write, then reveal the answer and rate themselves. Nothing is graded.
2. Learn: zoom ladder (Fig, tissue, cell, nucleus, chromosome, gene, DNA). VO-A04, A05 and A06 play at the matching levels.
3. Learn: pairs (VO-A07). A toggle shows a bracket under each pair.
4. Learn: copying (VO-A08). Students step through 4 copies and watch DNA molecules go 4 → 8 while chromosomes stay at 4.
5. Worked example W1: count a copied cell. Each step drives the model: number the centromeres, then the chromatids.
6. Guided G1: count an uncopied cell (4 / 4).
7. Guided G2: match pairs.
8. Guided G3: count a copied cell (4 / 8).
9. Independent I1: count a copied cell in a new layout. **Go further** swaps it for A1-I1-GF: 12 DNA molecules, all X shapes; how many chromosomes?
10. Independent I2: match pairs of copied chromosomes.
11. Independent I3: "Which of these is a gene?"
12. Checkpoint intro.
13. to 15. Checkpoint C1 to C3, supports off. The first answer is recorded and stays final after a reload.
16. Summary: key ideas and the checkpoint score (first-try correct).

### Misconceptions targeted

| ID | Wrong idea | Where |
| --- | --- | --- |
| x-is-two-chromosomes | An X is two chromosomes. | G3, I1, C1, I1-GF |
| x-is-one-dna | An X is one DNA molecule. | G3, I1, C1 |
| pairs-counted-as-one | A pair counts as one chromosome. | G1, G3, I1, C1, I1-GF |
| dna-doubles-always | Every chromosome holds two DNA molecules. | G1 |
| pair-same-parent | Both chromosomes in a pair come from the same parent. | G2, I2, C2, C3 |
| pair-by-look | Any two chromosomes can be partners. | G2, I2, C2 |
| pair-is-copy | The two chromosomes in a pair are exact copies (confused with sister chromatids). | C3 |
| pair-different-genes | Partners carry different genes. | C3 |
| gene-is-chromosome / gene-is-chromatid / gene-is-cell | Scale confusions about what a gene is. | I3 |
| copy-doubles-chromosomes | Copying doubles the number of chromosomes. | I1-GF |

These ideas come back in A2: mitosis error states (missing or extra chromosome) reuse the count strip and the X = 1 chromosome rule.

### Visual model notes

- **Zoom ladder.** Your art is used for Fig (side view cropped from IMG-C01), the tail slice (IMG-B08) and the cell (IMG-B09). The nucleus, chromosome, gene and DNA levels are built in code. A dashed yellow ring marks where the camera dives next, and each level states its real size (Fig about 10 cm long, tail slice about 5 mm, cell about 20 µm, nucleus about 6 µm, DNA 2 nm wide). The gene level says "not to scale" because gene lengths vary a lot.
- **Nucleus shows loose threads, not rods.** In a cell that is not dividing, chromosomes are long, loose threads. They coil into the familiar rods only before division. This avoids the misconception that chromosomes are always X- or rod-shaped.
- **Band patterns.** Partner chromosomes share a pattern of light bands, as in a stained karyotype, and non-partners differ. This is a second pairing clue besides length and gene letters; hint 1 for the pairing tasks mentions it.
- **Paper grain** comes from your cream texture (IMG-T01). T02 to T07 are not used yet: the bible says the working area should hold no decorative images, so the tape and torn-strip pieces wait for story and title screens.

### How the supports behave

- **Worked steps fade.** Two correct answers in a row hide one more worked step on the next guided task. A student can still reveal each step with "Show the next step". "Show all steps" in Settings turns fading off.
- **Hint ladder.** Each wrong answer opens the next hint level. After 3 wrong attempts, the answer is shown with the model numbered, and the student can go on.
- **Count strip during counting tasks** shows "?" until the student answers. Otherwise it would give the answer away.
- **Checkpoint:** no hints, worked steps, sentence starters or reduced answer choices. Feedback still appears after the student answers.

### Testing tips

- Add `?dev=1` to the URL to see asset IDs on placeholders, task IDs and standard tags in the panel, and an fps counter.
- Settings › My progress › Reset clears this browser's progress.
- To test right-to-left layout, choose Arabic, Dari, Farsi or Pashto. The text stays English until translations exist.


## A2: Copy a cell (draft)

1. Retrieve (4). 2. Your turn (VO-A09) with the parent cell. 3. **Try it first**: divide a cell however you like. Most students skip copying; the new cell comes up short, VO-A10 plays, and the count strip shows "Same info as parent? ✗ No". One try is enough to move on. 4. How a cell copies itself: stepped animation (copy, line up, fibres pull the halves apart, two cells), VO-A11. 5. Guided divide with worked steps and hints. 6. Independent divide (3 pairs); **Go further** swaps in "a human skin cell with 46 chromosomes". 7. Error analysis (3 and 5 chromosomes). 8.–11. Checkpoint: divide a new animal's cell, compare DNA, counts after mitosis. 12. Summary.

- **How the divide task works:** select a chromosome, then new cell 1 or 2 (or click the cell). Placing an X splits it: one half goes to that cell, the other half waits to be placed. "Divide the cell" judges each new cell against the parent: missing, extra, or mixed.
- **Misconceptions:** dividing without copying; both halves of an X in one cell; one cell gets the mother's chromosomes and the other the father's; mitosis halves the number; the new cells differ; new cells keep whole Xs.
- Phase names are not used in A2 (the 6.1.d limit).

## A2b: Clock the cycle (draft)

1. Retrieve (4). 2. The cell cycle wheel (VO-A16). 3. Ada's slide (IMG-P10, VO-A17). 4. Worked: the narrator sorts cells 1–3 (VO-A18). 5. Guided: sort 6 ringed cells, check, fix. 6. Independent: sort the other 27, check once. 7. Timing table (VO-A19): share of cells and hours of 24 for each phase, from the student's own counts. 8. Which phase is longest? (**Go further**: a chemical stops cells at metaphase.) 9.–10. Old tail slide (VO-A20) and why it is nearly all interphase. 11.–13. Onion root (IMG-P11, VO-A21): sort, then interphase and metaphase timing. 14.–17. Checkpoint on reasoning. 18. Summary.

- **Every student gets a different random slide**, saved with their progress, so the class can pool counts. Fields are about 75% interphase for the new tail tip, ~96% for the old tail, ~68% for the onion root tip.
- **Reference cards** (drawing, name, what to look for) stay on screen while sorting; sorting uses the cards, not memory. The checkpoint asks about reasoning only.
- **Timing answers** are accepted within ±1.5 percentage points and ±0.5 hours, so rounded answers count.
- **Misconceptions:** interphase is "resting"; a phase with more cells is faster; phases are separate steps; the count is the percent; the percent is the hours.

## A3: Build a body (draft)

1. Retrieve (4). 2. The stump (VO-A12): identical, undecided cells; count strip shows the same information as the parent. 3. **Try it first**: make a bone cell with the gene switches. 4. Same cookbook, different pages (VO-A13): bone, muscle and skin side by side over one shared set of chromosomes. 5. Guided: muscle. 6. Independent: skin. 7. Same DNA? (**Go further**: is the skin gene still in a muscle cell?) 8. The regrowth time-lapse again. 9. Revisit the A0 prediction (the student's earlier answer is shown). 10.–13. Checkpoint, including human liver and nerve cells. 14. Summary.

- The gene switches never change the chromosomes: the count strip stays at 4 / 4 / same as parent while the cell redraws as bone, muscle, skin, undecided or mixed-up.
- **No gene-control mechanisms** are shown (the 6.1.d limit): genes are simply "on" or "off".
- **Misconceptions:** each tissue has its own DNA; cells lose genes they don't use; cells gain new genes; every gene is on; an undecided cell is finished.

## A4: Model limits and unit checkpoint (draft)

1. Retrieve across A1–A3. 2. The limits card (VO-A14): 2 pairs vs. many; you drag vs. the body controls division; coloured, labelled chromosomes; "share of cells = share of time" assumes random, independent timing; three genes on/off vs. thousands; the 24-hour round number. 3.–4. Two questions on the card. 5. Checkpoint intro. 6.–10. **Unit checkpoint**, supports off, unfamiliar cases: divide a sea star cell; DNA in new skin cells in a cut; root vs. leaf cells; which skin slide is growing faster; and a written explanation (how a body rebuilds a lost part, using mitosis, DNA and genes). The written answer is saved in the browser for you to read; it is not auto-graded and not counted in the score.

## A-end: Hook

VO-A15 over a life-cycle diagram: adult → (mitosis) growing newt, hatchling; the meiosis and fertilisation half is greyed out and marked "Coming in Part B". Then a Part A summary.

## Reading students' written answers

Predictions (A0, A3) and the A4 written explanation are saved in each student's browser only (nothing leaves the browser). To see them, sit with the student's device: with **Teacher mode** on, you can step to those questions and read what is in the box.

## Framework check (A1)

Framework check: passed. Retrieve block with 4 items; worked example before independent practice, with fading; all-student checks with misconception feedback; integrated text next to the model; no decorative images in the working area; checkpoint matches "develop and use a model" with no phase recall; every task tagged SC.HS.6.1.d.

## Framework check (A2–A4)

Framework check: passed. Each module opens with a Retrieve block (≥ 3 items across last module, last week and a prior unit); new procedures have a worked example before independent practice (A2b explicit first; A2 and A3 attempt first with a consolidating demonstration before guided practice); every check names a likely misconception; text sits beside its model; each module ends with a supports-off checkpoint matching "develop and use a model", with no phase recall assessed; every task is tagged SC.HS.6.1.d. A0 and A-end are story beats (no Retrieve or checkpoint).
