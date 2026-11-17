# The Mother Who Didn't Match — Mitosis & Meiosis Sim

A browser sim for Regular Biology (9th grade, all ability levels, including IEP and English-learner students). Students follow Fig, a fictional ember newt, through two parts:

- **Part A (Unit 3):** chromosome primer, mitosis, cell cycle, differentiation. Standard: Nebraska SC.HS.6.1.d.
- **Part B (Unit 4):** meiosis, sources of inheritable variation, chimera twist. Standard: Nebraska SC.HS.9.4.b.

## Source of truth

- `docs/story-bible.md` holds the story, every beat, every narrated line, and every asset ID. Build from it; never invent story content, beats or asset IDs. If the code needs something the bible lacks, ask.
- `docs/bio-pedagogy-framework.md` holds the teaching rules. Every module must pass its checklist (section 5).
- Standard boundaries: no rote memorization of mitosis or meiosis phases, and no gene-control mechanisms. Phase names may appear on reference cards, but nothing assesses recalling them.

## Current phase: Part A with placeholder graphics

Build beats A0, A1, A2, A2b, A3, A4 and A-end, in that order. Part B comes later and reuses the same engine.

- Placeholders are flat shapes in the final palette with the ink outline. No textures, no generated art.
- Narration shows as captions and is read by the browser's built-in speech (Web Speech API) until the recorded files exist.
- In dev mode, every placeholder shows its asset ID (for example `IMG-P02`) so assets can be matched later.
- Do not create, download or generate images or audio. The teacher makes them from the story bible.

## Tech stack

- Vite + TypeScript + Three.js. Bundle everything: no runtime CDNs, because school web filters block them.
- Content lives in data files, not code: `src/content/partA.json` (beats, tasks, answers, feedback) and `src/i18n/<lang>.json` (all text).
- One folder per beat in `src/modules/`; shared engine in `src/engine/`.
- Hosting: GitHub Pages through GitHub Actions, with relative asset paths. The page must work inside a Google Sites embed (iframe). Wrap every `localStorage` call in try/catch and keep working if storage is blocked.

## Devices and performance

- Target: school Chromebooks at 1366 × 768. Test at that size, and at 1280 × 720.
- Aim for 60 fps; never below 30 fps. If the frame rate drops under 30, switch off the edge-outline pass and parallax automatically.
- Load each module only when it opens. Keep the first load under 5 MB.

## Rendering

- Task screens: orthographic camera, fixed and straight on, flat shading. They behave like 2D.
- Perspective camera only for the A1 zoom ladder and story scenes.
- Ink outline: color `#2B1D14`, drawn as outline geometry on paper shapes. A full-screen edge-detection pass is allowed only on story and title scenes.

## Style tokens

| Token | Value |
| --- | --- |
| Cream | `#F3E6CC` |
| Teal | `#2F8C8C` |
| Warm orange | `#E8772E` |
| Deep blue | `#24456E` |
| Moss green | `#6E9A3A` |
| Ink outline | `#2B1D14` |

- Font: Atkinson Hyperlegible for all text (bundle the font files).
- Nested rounded elements: equal padding between a button or label and the edge of the card that holds it, on every side.
- Never carry meaning by color alone. Maternal chromosomes are solid paper, paternal chromosomes are striped paper, and each has an M or P label. Allele letters sit on paper tabs.

## The science model

- Model organism: 2n = 4 (two homologous pairs). Real newts have more; the A4 limits card says so.
- Chromosome states: unreplicated (single rod) and replicated (X: two sister chromatids joined at the centromere).
- Count strip, always visible and updated live: **Chromosomes** = number of centromeres; **DNA molecules** = number of chromatids; **Same info as parent?** = yes/no.
- Mitosis output: two cells, each identical to the parent. Show error states (missing or extra chromosome) with feedback.
- A2b cell cycle: stained-slide fields of 36 cells, each drawn in an exact phase; a different random field per student; 24-hour cycle; percent of cells × 24 h = estimated hours per phase.

## Teaching rules in every module

- Opens with a Retrieve block: at least 3 short recall items.
- New procedures and representations: worked example, then guided practice with feedback, then independent practice.
- Adaptive fading: two correct answers in a row fade the next worked step; a wrong answer opens the next hint level.
- Every check gives feedback that names the likely misconception.
- "Go further" prompts replace a core item; they never add extra work.
- The checkpoint at the end is independent, with supports off.
- Tag every task with its standard code in `partA.json`.
- Log sequencing choices (explicit first vs. attempt first) in `docs/teacher-notes.md`.
- Story beats appear only between tasks, never inside the working area. Footnotes open only on tap.

## Settings menu (all supports, available to every student)

- **Reading and listening:** read aloud (on/off, speed), highlight words as they're read, text size.
- **Language ›** language list (English, Spanish, Dari, Farsi, Pashto, Arabic, Russian, Vietnamese, Swahili; Dari and Farsi separate), support level (Beginning = WIDA 1–2, Building = WIDA 3+, English only), side-by-side text, tap-a-word glossary.
- **Help while I work:** hints, worked examples (show all / fade as I improve), sentence frames (off / frames / frames with word bank), fewer answer choices.
- **Challenge:** "Go further" prompts.
- **Display and motion:** high contrast, reduced motion, larger buttons, sound effects, captions.
- **My progress:** saved in this browser; reset button.
- Labels describe what a support does. Never use the words IEP, EL, ELL or ESL anywhere a student can see.

## Accessibility (required from the first build)

- Every drag has a keyboard and click alternative (select, then place).
- Visible focus, targets at least 44 × 44 px, captions for every narrated line, ARIA live region for the count strip.
- Reduced motion replaces parallax, paper flutter and camera fly-ins with cuts and fades.
- No timers anywhere. Every animation can be paused, replayed and stepped one stage at a time.

## Languages

- Every string goes through `src/i18n/`, with a `building` and a `beginning` version where the bible gives both.
- Set `dir="rtl"` for Dari, Farsi, Pashto and Arabic, and mirror the layout. Test right-to-left with placeholder text before any real translation exists.
- For now, ship English only; keep the other language files as empty stubs.

## Asset slots

Real files drop into these paths later with no code changes. If a file is missing, use the placeholder.

- Voice-over: `public/audio/vo/mm_vo_A01_en_building.mp3`
- Sound effects: `public/audio/sfx/mm_sfx_11_chromosome-copy_take1.mp3`
- Images: `public/img/mm_img_C01_fig-turnaround.png`

## Privacy

- No student data leaves the browser. No analytics, no trackers, no accounts, no external requests.

## Workflow

- Commit after each working milestone, with a clear message.
- Run the build and check for errors before every commit.
- After each beat, take screenshots at 1366 × 768 and check them against this file before moving on.
- Ask before changing any locked decision in this file.
