// Fills scripts/recording-tags.json with ElevenLabs v3 recording text for every
// Building panel line that has none yet. Hand-written entries are never changed.
//   npm run audio:tag
//
// Tag rules (story bible, section 3): one emotion tag at the start of the words
// it colours; [pause] right before a punchline or key term; at most 3 or 4
// tags per line. The mood follows the job of the line (question, hint, worked
// step, praise, mix-up feedback...). Symbols a voice would misread are spelled
// out. Review the output by ear: these are a starting point.
import fs from 'node:fs';

const partA = JSON.parse(fs.readFileSync('src/content/partA.json', 'utf8'));
const partB = JSON.parse(fs.readFileSync('src/content/partB.json', 'utf8'));
const content = { beats: [...partA.beats, ...partB.beats], tasks: { ...partA.tasks, ...partB.tasks }, misconceptions: { ...partA.misconceptions, ...partB.misconceptions } };
const en = JSON.parse(fs.readFileSync('src/i18n/en.json', 'utf8'));
const tagsPath = 'scripts/recording-tags.json';
const tags = JSON.parse(fs.readFileSync(tagsPath, 'utf8'));

const building = (k) => (typeof en[k] === 'string' ? en[k] : en[k]?.building);

/** Role of each key, from where it is used. First use wins. */
const roles = new Map();
const role = (k, r) => {
  if (k && !roles.has(k)) roles.set(k, r);
};

for (const beat of content.beats.filter((b) => b.built)) {
  for (const step of beat.steps) {
    if (step.type === 'explain') step.body.forEach((k) => role(k, 'body'));
    if (step.type === 'intro') step.body.forEach((k) => role(k, 'checkIntro'));
    if (step.type === 'summary') step.body.forEach((k) => role(k, 'summary'));
    if (step.type === 'retrieve') step.tasks.forEach((id) => role(content.tasks[id].prompt, 'question'));
    if (step.type !== 'task') continue;
    for (const id of [step.task, content.tasks[step.task].goFurther].filter(Boolean)) {
      const t = content.tasks[id];
      role(t.prompt, 'prompt');
      (t.worked ?? []).forEach((k) => role(k, 'worked'));
      (t.hints ?? []).forEach((k) => role(k, 'hint'));
      if (t.frames) role(t.frames, 'frame');
      for (const r of t.feedback ?? []) {
        role(r.text, r.when === 'correct' ? 'praise' : 'gentle');
        if (r.misconception) role(content.misconceptions[r.misconception], 'misconception');
      }
      for (const i of t.items ?? []) {
        role(i.text, 'option');
        if (i.misconception) role(content.misconceptions[i.misconception], 'misconception');
      }
      if (t.kind === 'classify') role(t.prompt.replace(/\.prompt$/, '.fb.correct'), 'praise');
      for (const tk of t.tanks ?? []) role(tk.card, 'body');
      if (t.kind === 'lab') role('B4.lab.fb.done', 'praise');
      for (const id of t.samples ?? []) role(`gel.result.${id}`, 'body');
      if (t.kind === 'gamete' && t.collect) role(`gamete.fb.duplicate.${t.gamete}`, 'gentle');
      for (const o of t.options ?? []) {
        role(o.text, 'option');
        role(o.feedback, o.correct ? 'praise' : 'gentle');
        if (o.misconception) role(content.misconceptions[o.misconception], 'misconception');
      }
    }
  }
}
// Feedback built in code from these keys.
for (const k of Object.keys(en)) {
  if (/^A2b\.fb\.(look|percent|hours)/.test(k)) role(k, 'gentle');
  if (k === 'A2b.fb.allRight') role(k, 'praise');
  if (k === 'A2b.fb.unsorted') role(k, 'gentle');
  if (/^A2\.fb\./.test(k)) role(k, 'gentle');
}

const MOOD = {
  question: '[curious]',
  prompt: null, // chosen below: [curious] for questions, [warm] for instructions
  worked: '[teacherly]',
  hint: '[helpful]',
  praise: '[pleased]',
  gentle: '[gently]',
  frame: '[encouraging]',
  body: '[warm]',
  checkIntro: '[encouraging]',
  summary: '[warm]',
  option: null,
  misconception: null,
};

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : '');
  if (n === 100) return 'one hundred';
  return String(n);
}
function numberWords(s) {
  return s
    .replace(/(\d+)\.(\d+)/g, (_, a, b) => `${words(Number(a))} point ${b.split('').map((d) => ONES[Number(d)]).join(' ')}`)
    .replace(/\b(\d{1,3})\b/g, (_, n) => words(Number(n)));
}

/** Spell out what a voice would misread. */
function respell(s) {
  return numberWords(
    s
      .replace(/___/g, 'blank')
      .replace(/\s*÷\s*/g, ' divided by ')
      .replace(/\s*×\s*/g, ' times ')
      .replace(/\s*=\s*/g, ' equals ')
      .replace(/(\d)\s*%/g, '$1 percent')
      .replace(/\{(\w+)\}/g, '{$1}')
      .replace(/\bXs\b/g, "X's")
      .replace(/\s+/g, ' '),
  ).trim();
}

/** Capital letter at the start of each sentence (after numbers became words). */
function capitalise(s) {
  // Start of text, after a sentence end, or after a tag at the start of a sentence.
  return s.replace(/(^|[.!?]\s+)((?:\[[^\]]+\]\s+)*)([a-z])/g, (_, a, tagsBefore, b) => a + tagsBefore + b.toUpperCase());
}

/** One [pause] before the key idea: before the last sentence, or after a colon. */
function addPause(s) {
  const sentences = s.match(/[^.!?]+[.!?]+["”']?\s*/g);
  if (sentences && sentences.length >= 2) {
    const last = sentences[sentences.length - 1];
    const head = s.slice(0, s.length - last.length).trimEnd();
    return `${head} [pause] ${last.trim()}`;
  }
  const colon = s.indexOf(': ');
  if (colon > 0 && colon < s.length - 12) return `${s.slice(0, colon + 1)} [pause] ${s.slice(colon + 2)}`;
  return s;
}

let added = 0;
for (const [key, r] of roles) {
  if (tags[key] || !en[key]) continue;
  let text = building(key);
  if (!text || /\{\w+\}/.test(text) && r !== 'gentle' && r !== 'praise') {
    // Lines with numbers filled in per student are read by the browser voice.
    if (/\{\w+\}/.test(text ?? '')) continue;
  }
  if (/\{\w+\}/.test(text)) continue;
  text = capitalise(respell(text));
  if (r === 'option') {
    tags[key] = /[.!?]$/.test(text) ? text : `${text}.`;
  } else if (r === 'misconception') {
    tags[key] = text;
  } else {
    const mood = r === 'prompt' ? (text.trim().endsWith('?') ? '[curious]' : '[warm]') : MOOD[r];
    tags[key] = capitalise(`${mood} ${addPause(text)}`.trim());
  }
  added++;
}

fs.writeFileSync(tagsPath, JSON.stringify(tags, null, 2) + '\n');
console.log(`Added recording text for ${added} lines.`);
