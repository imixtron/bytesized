// Voiceover tokenising, shared by timing and validation so "on" words resolve identically everywhere.

export type Token = { text: string; norm: string; pauseAfter: "none" | "short" | "long" };

const norm = (w: string) => w.toLowerCase().replace(/’/g, "'").replace(/[^\p{L}\p{N}']/gu, "");

export function tokenize(vo: string): Token[] {
  return vo
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({
      text,
      norm: norm(text),
      pauseAfter: /[.?!:]$/.test(text) ? "long" : /[,;]$/.test(text) ? "short" : "none",
    }));
}

/** Resolves a beat's `on` ("cops", "word#2") to a token index in this vo, or -1. */
export function findWord(tokens: Token[], on: string): number {
  const [word, nth] = on.split("#");
  const target = norm(word);
  const want = nth ? Number(nth) : 1;
  let seen = 0;
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].norm === target && ++seen === want) return i;
  }
  return -1;
}
