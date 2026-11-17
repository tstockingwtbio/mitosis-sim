# Teacher notes

Notes for the teacher and for comparing pilot results. Students never see this file.

## Sequencing log

| Module | Learning target | Type | Sequencing | Why |
| --- | --- | --- | --- | --- |
| A1 | Chromosome structure: an X is one chromosome with two DNA molecules | New representation | Explicit first | New vocabulary (centromere, chromatid) and a new counting procedure. Order: zoom ladder, pairs, copying animation, worked example, guided practice, independent practice. |
| A1 | Genes are sections of chromosomes; chromosomes come in pairs (one from each parent) | New vocabulary and representation | Explicit first | Students need the model (lengths, gene letters, solid M and striped P) before they can reason with it. |

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

## Framework check (A1)

Framework check: passed. Retrieve block with 4 items; worked example before independent practice, with fading; all-student checks with misconception feedback; integrated text next to the model; no decorative images in the working area; checkpoint matches "develop and use a model" with no phase recall; every task tagged SC.HS.6.1.d.
