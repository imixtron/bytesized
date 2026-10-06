// Round-robin voice assignment (episodes/voices.json).
//   npm run voice:assign -- 001   → writes the next roster voice into that episode's voice: block,
//                                   records it in history and advances `next`.
// Idempotent: an episode already in history keeps its voice. Part 2 of a series reuses part 1's voice
// and does not advance the rotation.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDocument } from "yaml";

type Voice = { name: string; voice_id: string; style?: string };
type Roster = { $note?: string; roster: Voice[]; retired?: Voice[]; next: number; history: { episode: string; voice: string; date: string }[] };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const ROSTER_PATH = join(ROOT, "episodes/voices.json");

const prefix = process.argv[2];
if (!prefix) throw new Error("usage: npm run voice:assign -- <episode number or folder>");
const folder = readdirSync(join(ROOT, "episodes")).find((d) => d.startsWith(prefix));
if (!folder) throw new Error(`no episode folder starts with "${prefix}"`);

const roster: Roster = JSON.parse(readFileSync(ROSTER_PATH, "utf8"));
const yamlPath = join(ROOT, "episodes", folder, "episode.yaml");
const doc = parseDocument(readFileSync(yamlPath, "utf8"));

const byName = (name: string) => [...roster.roster, ...(roster.retired ?? [])].find((v) => v.name === name);
const existing = roster.history.find((h) => h.episode === folder);
let voice: Voice | undefined;
let advance = false;

if (existing) {
  voice = byName(existing.voice);
  console.log(`${folder} already has ${existing.voice} (kept)`);
} else {
  const series = doc.get("series") as { get(k: string): unknown } | undefined;
  const part = series?.get("part");
  const key = series?.get("key");
  if (part === 2 && key) {
    // continuity: reuse the voice of part 1 of the same series
    const part1 = roster.history.find((h) => {
      const f = readdirSync(join(ROOT, "episodes")).find((d) => d === h.episode);
      if (!f) return false;
      const d = parseDocument(readFileSync(join(ROOT, "episodes", f, "episode.yaml"), "utf8"));
      const s = d.get("series") as { get(k: string): unknown } | undefined;
      return s?.get("key") === key && s?.get("part") === 1;
    });
    if (part1) voice = byName(part1.voice);
  }
  if (!voice) {
    voice = roster.roster[roster.next % roster.roster.length];
    advance = true;
  }
}
if (!voice) throw new Error("voice not found in roster");

doc.setIn(["voice", "name"], voice.name);
doc.setIn(["voice", "voice_id"], voice.voice_id);
if (!doc.hasIn(["voice", "speed"])) doc.setIn(["voice", "speed"], 1);
writeFileSync(yamlPath, doc.toString());

if (!existing) {
  roster.history.push({ episode: folder, voice: voice.name, date: new Date().toISOString().slice(0, 10) });
  if (advance) roster.next = (roster.next + 1) % roster.roster.length;
  writeFileSync(ROSTER_PATH, JSON.stringify(roster, null, 2) + "\n");
  console.log(`${folder} → ${voice.name}${advance ? "" : " (same as part 1)"} · next up: ${roster.roster[roster.next].name}`);
}
