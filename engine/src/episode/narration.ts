// Whole-script narration checks (SCRIPT-FORMAT §1 "Narration"). Pure and warning-only: they catch the
// mechanical symptoms of a script that reads as separate facts. They can't judge quality, so the
// read-aloud pass in /script step 3b still does that; these keep the obvious cases from slipping through.

export type NarrationScene = { id: string; part: string; vo: string };
export type NarrationIssue = { where: string; msg: string };

/** Formulaic gist lines are required by the format, so they don't count towards rhythm or openers. */
const FORMULA = /^that'?s the gist:?\s*|\s*follow for more\.?$|\s*part 2 is next,? follow so you don'?t miss it\.?$/gi;

/** Sentence-opening words that tie a thought to the one before it. */
const LINKS = new Set([
  "that", "that's", "this", "it", "it's", "they", "those", "these", "which", "so", "because", "since", "then", "once", "when", "while",
  "after", "before", "instead", "rather", "and", "but", "though", "still", "otherwise", "until", "if", "each", "every", "everyone",
  "same", "next", "later", "from", "even", "all", "both", "either", "whenever", "unless", "meanwhile", "plus",
]);

/** Openers that read as filler or as a template when repeated. */
const MECHANICAL = /^(now|so|but|and|okay|alright|here'?s the thing|here'?s the deal|let'?s (dive|break|talk|look))\b/i;
const CLICHES = [
  /here'?s the (thing|deal|catch|kicker)/i, /let'?s dive/i, /game[- ]?changer/i, /imagine (this|a world)/i, /buckle up/i,
  /you won'?t believe/i, /but wait/i, /in today'?s (video|episode)/i, /is defined as|refers to|can be defined/i, /at the end of the day/i,
];

export function sentences(text: string): string[] {
  return text.replace(FORMULA, "").split(/(?<=[.?!])\s+/).map((s) => s.trim()).filter((s) => /\p{L}/u.test(s));
}
const wc = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const firstWord = (s: string) => s.toLowerCase().replace(/’/g, "'").match(/[\p{L}']+/u)?.[0] ?? "";

export const NARRATION = {
  maxShortShare: 0.25,      // sentences of ≤4 words, as a share of all sentences
  shortWords: 4,
  maxShortRun: 2,           // consecutive short sentences (across scene seams too)
  minLongSentences: 3,      // sentences of ≥14 words, so there is room for a thought to develop
  longWords: 14,
  maxRepeatedOpener: 2,     // the same first word opening this many sentences or fewer
  maxMechanicalOpeners: 2,  // Now / So / But / And ... at the start of a sentence
  minLinkedShare: 0.5,      // breakdown scenes that open by leaning on what came before
  maxQuestions: 1,
};

export function narrationIssues(scenes: NarrationScene[]): NarrationIssue[] {
  const out: NarrationIssue[] = [];
  const all = scenes.flatMap((s) => sentences(s.vo).map((text) => ({ scene: s.id, text, words: wc(text) })));
  if (all.length < 4) return out;
  const n = all.length;

  const short = all.filter((s) => s.words <= NARRATION.shortWords);
  if (short.length / n > NARRATION.maxShortShare) out.push({ where: "narration", msg: `${short.length} of ${n} sentences are ${NARRATION.shortWords} words or fewer ("${short[0].text}"): reads as staccato. Let a thought run on, and keep short ones for the moments that earn them` });

  let run = 0;
  for (const s of all) {
    run = s.words <= NARRATION.shortWords + 2 ? run + 1 : 0;
    if (run > NARRATION.maxShortRun) { out.push({ where: s.scene, msg: `${run} very short sentences in a row; fold them into one sentence` }); break; }
  }

  const long = all.filter((s) => s.words >= NARRATION.longWords).length;
  if (long < NARRATION.minLongSentences) out.push({ where: "narration", msg: `only ${long} sentences of ${NARRATION.longWords}+ words: no room for an explanation to develop (aim for ${NARRATION.minLongSentences}+)` });

  const openers = new Map<string, number>();
  for (const s of all) { const w = firstWord(s.text); openers.set(w, (openers.get(w) ?? 0) + 1); }
  for (const [w, c] of openers) {
    const limit = NARRATION.maxRepeatedOpener + (["the", "a"].includes(w) ? 2 : 0);
    if (c > limit) out.push({ where: "narration", msg: `${c} sentences start with "${w}": vary how thoughts begin` });
  }

  const mech = all.filter((s) => MECHANICAL.test(s.text));
  if (mech.length > NARRATION.maxMechanicalOpeners) out.push({ where: "narration", msg: `${mech.length} sentences open with a filler transition (${[...new Set(mech.map((s) => firstWord(s.text)))].join(", ")}): link ideas through the wording instead` });

  for (const s of all) { const bad = CLICHES.find((r) => r.test(s.text)); if (bad) out.push({ where: s.scene, msg: `"${s.text.match(bad)![0]}" is filler or textbook phrasing; say the thing directly` }); }

  const questions = all.filter((s) => s.text.endsWith("?")).length;
  if (questions > NARRATION.maxQuestions) out.push({ where: "narration", msg: `${questions} rhetorical questions; keep to ${NARRATION.maxQuestions} (the hook can use one)` });

  // Seams: a breakdown scene that opens cold, as a fresh self-contained statement, restarts the explanation.
  const mid = scenes.filter((s) => s.part === "breakdown" && sentences(s.vo).length);
  if (mid.length >= 3) {
    const linked = mid.filter((s) => LINKS.has(firstWord(sentences(s.vo)[0])) || /^[^.?!]{0,60}\b(that|this|it|they|those|these)\b/i.test(sentences(s.vo)[0].slice(0, 70))).length;
    if (linked / mid.length < NARRATION.minLinkedShare) out.push({ where: "narration", msg: `only ${linked} of ${mid.length} breakdown scenes lean on what came before: each reads as a fresh start. Open scenes by following from the previous one (a consequence, a contrast, a pronoun that points back)` });
  }
  return out;
}
