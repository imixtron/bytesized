// Regression: the 008 CDN script as first written (cdn-before) and with its narration rewritten as one speech
// (cdn-after). The rewrite must keep the structure, the story and the length, and lose the narration warnings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEpisode } from "../src/episode/parse";
import { validate } from "../src/episode/rules";
import { narrationIssues } from "../src/episode/narration";
import { buildTimeline } from "../src/timing/timeline";
import { tokens } from "../src/theme/tokens";
import type { Episode } from "../src/episode/schema";

const load = (f: string) => parseEpisode(readFileSync(join(import.meta.dirname, "fixtures", f), "utf8"));
const before = load("cdn-before.yaml");
const after = load("cdn-after.yaml");
const voWords = (ep: Episode) => ep.scenes.reduce((n, s) => n + s.vo.trim().split(/\s+/).length, 0);

/** Everything downstream reads, minus the narration itself (vo and the beat words that follow it). */
const shape = (ep: Episode) => JSON.parse(JSON.stringify(ep, (k, v) => (k === "vo" || k === "on" ? undefined : v)));

test("structure is unchanged: same scenes, templates, stages and beat targets", () => {
  assert.deepEqual(shape(after), shape(before));
});

test("both versions validate with no errors (beat words resolve in their scene)", () => {
  for (const ep of [before, after]) assert.deepEqual(validate(ep).filter((i) => i.level === "error"), []);
});

test("the original reads as separate facts; the rewrite reads as one speech", () => {
  const b = narrationIssues(before.scenes).map((i) => i.msg).join("\n");
  assert.match(b, /very short sentences in a row/);
  assert.match(b, /breakdown scenes lean on what came before/);
  assert.deepEqual(narrationIssues(after.scenes), []);
});

test("the rewrite keeps the story in order", () => {
  // One entry per idea, in the order the episode must tell them.
  const progression: [string, RegExp[]][] = [
    ["hook", [/Instagram/]],
    ["idea", [/corner shops/]],
    ["distance", [/Sydney/, /Virginia/]],
    ["miss", [/first visitor/, /origin/]],
    ["hit", [/edge/]],
    ["stale", [/stale/, /timer/, /purged?/]],
    ["edgecode", [/code at the edge/]],
    ["players", [/Cloudflare/, /Akamai/, /Fastly/]],
    ["gist", [/^That's the gist:/]],
  ];
  assert.deepEqual(after.scenes.map((s) => s.id), progression.map(([id]) => id));
  for (const [id, terms] of progression) {
    const vo = after.scenes.find((s) => s.id === id)!.vo;
    for (const t of terms) assert.match(vo, t, `${id} lost ${t}`);
  }
});

test("the rewrite stays within the length budget", () => {
  const sec = buildTimeline(after).totalFrames / tokens.canvas.fps;
  assert.ok(sec >= 80 && sec <= 90, `estimated ${sec.toFixed(1)}s`);
  const budget = 2.2 * (after.target_sec - 1.5); // SCRIPT-FORMAT v1.7 word guidance
  const w = voWords(after);
  assert.ok(Math.abs(w - budget) / budget <= 0.1, `${w} words vs ~${Math.round(budget)}`);
});
