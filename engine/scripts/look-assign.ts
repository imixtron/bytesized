// Motion look assignment (episodes/looks.json, SCRIPT-FORMAT v1.6).
//   npm run look:assign -- 005            → picks TWO recipes at random (not used by the last 3 episodes where
//                                           possible), writes them to that episode's look.recipes and records them
//   npm run look:assign -- 005 --force    → re-pick even if the episode already has a look
//   npm run look:assign -- 005 --dry-run  → show the pick, write nothing
// Idempotent: an episode that already has a look keeps it. Part 2 of a series reuses part 1's pair. The pick lives
// in episode.yaml so renders are reproducible: nothing is picked at render time.
// BYTESIZED_ROOT=<dir> points it at a copy of the repo (for testing).
import { randomInt } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMap, isScalar, parseDocument, type Document } from "yaml";

type Looks = { $note?: string; recipes: Record<string, unknown>; history: { episode: string; recipes: string[]; date: string }[] };

const ROOT = process.env.BYTESIZED_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "../..");
const PATH = join(ROOT, "episodes/looks.json");
const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const prefix = args.find((a) => !a.startsWith("--"));
if (!prefix) throw new Error("usage: npm run look:assign -- <episode number or folder> [--force] [--dry-run]");
const episodes = readdirSync(join(ROOT, "episodes"));
const folder = episodes.find((d) => d.startsWith(prefix));
if (!folder) throw new Error(`no episode folder starts with "${prefix}"`);

const looks: Looks = JSON.parse(readFileSync(PATH, "utf8"));
const yamlPath = join(ROOT, "episodes", folder, "episode.yaml");
const doc = parseDocument(readFileSync(yamlPath, "utf8"));
const today = new Date().toISOString().slice(0, 10);

const current = doc.getIn(["look", "recipes"]);
if (current && !force) {
  console.log(`${folder} already has a look (${JSON.stringify(doc.getIn(["look", "recipes"], true) && (doc.get("look") as { toJSON(): unknown }).toJSON())}) (kept)`);
  process.exit(0);
}

const seriesOf = (d: Document) => {
  const s = d.get("series") as { get(k: string): unknown } | undefined;
  return { key: s?.get("key"), part: s?.get("part") };
};

const all = Object.keys(looks.recipes);
let recipes: string[] | undefined;
let why = "";
const { key, part } = seriesOf(doc);
if (part === 2 && key) {
  const part1 = looks.history.find((h) => {
    if (!episodes.includes(h.episode)) return false;
    const s = seriesOf(parseDocument(readFileSync(join(ROOT, "episodes", h.episode, "episode.yaml"), "utf8")));
    return s.key === key && s.part === 1;
  });
  if (part1) {
    recipes = part1.recipes;
    why = " (same as part 1)";
  }
}
if (!recipes) {
  // recipes used by the last 3 episodes before this one; widen the pool only if too few are left
  const before = looks.history.filter((h) => h.episode < folder).sort((a, b) => a.episode.localeCompare(b.episode));
  const used3 = new Set(before.slice(-3).flatMap((h) => h.recipes));
  const used1 = new Set(before.slice(-1).flatMap((h) => h.recipes));
  let pool = all.filter((r) => !used3.has(r));
  if (pool.length < 2) pool = all.filter((r) => !used1.has(r));
  if (pool.length < 2) pool = all;
  const first = pool[randomInt(pool.length)];
  const rest = pool.filter((r) => r !== first);
  recipes = [first, rest[randomInt(rest.length)]];
  why = ` (random from ${pool.length}, avoiding the last 3 episodes' recipes)`;
}

if (dryRun) {
  console.log(`[dry run] ${folder} → ${recipes.join(" + ")}${why} · nothing written`);
  process.exit(0);
}

// write the look: block right after music: (or voice:) so the file reads in the usual order
if (isMap(doc.contents)) {
  doc.contents.items = (doc.contents.items as unknown[] as ReturnType<typeof doc.createPair>[]).filter((p) => !(isScalar(p.key) && p.key.value === "look")) as never;
  const items = doc.contents.items as unknown[] as ReturnType<typeof doc.createPair>[];
  const after = Math.max(items.findIndex((p) => isScalar(p.key) && p.key.value === "music"), items.findIndex((p) => isScalar(p.key) && p.key.value === "voice"));
  const pair = doc.createPair("look", { recipes });
  if (isScalar(pair.key)) pair.key.spaceBefore = true;
  if (after >= 0) items.splice(after + 1, 0, pair);
  else items.push(pair);
}
writeFileSync(yamlPath, doc.toString());

const entry = { episode: folder, recipes, date: today };
const i = looks.history.findIndex((h) => h.episode === folder);
if (i >= 0) looks.history[i] = entry;
else looks.history.push(entry);
writeFileSync(PATH, JSON.stringify(looks, null, 2) + "\n");
console.log(`${folder} → ${recipes.join(" + ")}${why}`);
