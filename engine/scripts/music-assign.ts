// Random music assignment (episodes/music.json, design language v1.4 §8).
//   npm run music:assign -- 002             → picks a roster track at random (never the previous
//                                             episode's track), writes it to that episode's
//                                             music.track and records it in history.
//   npm run music:assign -- 002 --force     → re-pick even if the episode already has a track
//   npm run music:assign -- 002 --dry-run   → show the pick, write nothing
// Idempotent: an episode that already has music.track keeps it. Part 2 of a series reuses part 1's
// track. The pick lives in episode.yaml so renders are reproducible: nothing is picked at render time.
// BYTESIZED_ROOT=<dir> points it at a copy of the repo (for testing).
import { randomInt } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isMap, isScalar, parseDocument, type Document } from "yaml";

type Rotation = { $note?: string; roster: { track: string; style?: string }[]; history: { episode: string; track: string; date: string }[] };

const ROOT = process.env.BYTESIZED_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), "../..");
const ROTATION_PATH = join(ROOT, "episodes/music.json");
const LIBRARY_PATH = join(ROOT, "assets/music/library.json");

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");
const prefix = args.find((a) => !a.startsWith("--"));
if (!prefix) throw new Error("usage: npm run music:assign -- <episode number or folder> [--force] [--dry-run]");
const episodes = readdirSync(join(ROOT, "episodes"));
const folder = episodes.find((d) => d.startsWith(prefix));
if (!folder) throw new Error(`no episode folder starts with "${prefix}"`);

const rotation: Rotation = JSON.parse(readFileSync(ROTATION_PATH, "utf8"));
const library = JSON.parse(readFileSync(LIBRARY_PATH, "utf8")) as { files: Record<string, unknown> };
const yamlPath = join(ROOT, "episodes", folder, "episode.yaml");
const doc = parseDocument(readFileSync(yamlPath, "utf8"));
const today = new Date().toISOString().slice(0, 10);

const current = doc.getIn(["music", "track"]);
if (typeof current === "string" && current && !force) {
  console.log(`${folder} already has ${current} (kept)`);
  process.exit(0);
}
const node = doc.getIn(["music", "track"], true);
if (force && isScalar(node) && /pinned/i.test(node.comment ?? "")) throw new Error(`${folder}'s music.track is pinned ("${node.comment?.trim()}"); edit it by hand if that's really intended`);

const seriesOf = (d: Document) => {
  const s = d.get("series") as { get(k: string): unknown } | undefined;
  return { key: s?.get("key"), part: s?.get("part") };
};

let track: string | undefined;
let why = "";
const { key, part } = seriesOf(doc);
if (part === 2 && key) {
  // continuity: reuse the track of part 1 of the same series
  const part1 = rotation.history.find((h) => {
    if (!episodes.includes(h.episode)) return false;
    const s = seriesOf(parseDocument(readFileSync(join(ROOT, "episodes", h.episode, "episode.yaml"), "utf8")));
    return s.key === key && s.part === 1;
  });
  if (part1) {
    track = part1.track;
    why = " (same as part 1)";
  }
}
if (!track) {
  // the previous episode = the highest-numbered episode before this one that has a track
  const previous = rotation.history.filter((h) => h.episode < folder).sort((a, b) => a.episode.localeCompare(b.episode)).at(-1)?.track;
  const pool = rotation.roster.map((r) => r.track).filter((t) => t !== previous);
  const missing = pool.filter((t) => !library.files[t]);
  if (missing.length) console.log(`! not generated yet (skipped): ${missing.join(", ")} · npm run audio -- ${missing.join(" ")}`);
  const ready = pool.filter((t) => library.files[t]);
  if (!ready.length) throw new Error("no generated roster track to pick from (episodes/music.json → assets/music/library.json)");
  track = ready[randomInt(ready.length)];
  why = ` (random from ${ready.length}${previous ? `, not ${previous}` : ""})`;
}

if (dryRun) {
  console.log(`[dry run] ${folder} → ${track}${why} · nothing written`);
  process.exit(0);
}

// write music.track, putting a new music: block right after voice: so the file reads in the usual order
if (!doc.has("music") && isMap(doc.contents)) {
  const items = doc.contents.items as unknown[] as ReturnType<typeof doc.createPair>[];
  const at = items.findIndex((p) => isScalar(p.key) && p.key.value === "voice");
  const pair = doc.createPair("music", { track });
  if (isScalar(pair.key)) pair.key.spaceBefore = true;
  if (at >= 0) items.splice(at + 1, 0, pair);
  else items.push(pair);
} else {
  doc.setIn(["music", "track"], track);
}
writeFileSync(yamlPath, doc.toString());

const entry = { episode: folder, track, date: today };
const i = rotation.history.findIndex((h) => h.episode === folder);
if (i >= 0) rotation.history[i] = entry; // --force: replace in place
else rotation.history.push(entry);
writeFileSync(ROTATION_PATH, JSON.stringify(rotation, null, 2) + "\n");
console.log(`${folder} → ${track}${why}`);
