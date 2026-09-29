// Audio library generator: turns specs in assets/{sfx,music}/library.json into files with ElevenLabs,
// once. Every later episode reuses the local files, so credits are only spent on new or upgraded sounds.
//   npm run audio                     → generate what's missing (and replace code-generated placeholders)
//   npm run audio -- chomp tick       → only these ids
//   npm run audio -- --upgrade        → regenerate free-plan files on the paid plan (after subscribing)
//   npm run audio -- --force <id>     → regenerate even if it exists
//   npm run audio -- --list           → show the library and what's licensed
// The plan comes from engine/plan.json. Only paid-plan output is marked licensed.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { FileEntry, MusicLibrary, SfxLibrary } from "../src/audio/library";
import { apiKey } from "../src/voice/elevenlabs";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const SFX = join(ROOT, "assets/sfx/library.json");
const MUSIC = join(ROOT, "assets/music/library.json");
const plan: "free" | "paid" = JSON.parse(readFileSync(join(ENGINE, "plan.json"), "utf8")).elevenlabs_plan;

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--")));
const ids = args.filter((a) => !a.startsWith("--"));
const sfx: SfxLibrary = JSON.parse(readFileSync(SFX, "utf8"));
const music: MusicLibrary = JSON.parse(readFileSync(MUSIC, "utf8"));
const today = new Date().toISOString().slice(0, 10);

if (flags.has("--list")) {
  const row = (kind: string, id: string, f?: FileEntry) =>
    console.log(`${kind.padEnd(6)} ${id.padEnd(26)} ${f ? `${f.file.padEnd(30)} ${f.source.padEnd(10)} plan:${f.plan.padEnd(5)} ${f.licensed ? "✔ licensed" : "✖ NOT licensed"}` : "— not generated"}`);
  for (const id of new Set([...Object.keys(sfx.sounds), ...Object.keys(sfx.files)])) row("sfx", id, sfx.files[id]);
  for (const id of new Set([...Object.keys(music.tracks), ...Object.keys(music.files)])) row("music", id, music.files[id]);
  console.log(`\ncurrent plan (engine/plan.json): ${plan}`);
  process.exit(0);
}

/** Whether a library item should be (re)generated now. */
function wanted(id: string, existing: FileEntry | undefined, paidOnly = false): string | null {
  if (ids.length && !ids.includes(id)) return null;
  if (paidOnly && plan !== "paid") return "skip: paid plan only (see engine/plan.json)";
  if (flags.has("--force")) return "forced";
  if (!existing) return "missing";
  if (existing.source === "generated") return "replacing code-generated placeholder";
  if (flags.has("--upgrade") && plan === "paid" && existing.plan === "free") return "upgrading free-plan file to paid";
  return null;
}

const key = apiKey(ENGINE);
let spent = 0;

async function post(path: string, body: unknown) {
  const res = await fetch(`https://api.elevenlabs.io/v1${path}`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ElevenLabs ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return Buffer.from(await res.arrayBuffer());
}

for (const [id, spec] of Object.entries(sfx.sounds)) {
  const why = wanted(id, sfx.files[id]);
  if (!why) continue;
  try {
    const mp3 = await post("/sound-generation?output_format=mp3_44100_128", {
      text: spec.prompt, duration_seconds: spec.seconds, prompt_influence: 0.6, model_id: "eleven_text_to_sound_v2",
    });
    const file = `${id}.mp3`;
    writeFileSync(join(ROOT, "assets/sfx", file), mp3);
    const credits = Math.round(spec.seconds * 40);
    spent += credits;
    sfx.files[id] = { file, source: "elevenlabs", plan, licensed: plan === "paid", created: today, prompt: spec.prompt, credits };
    console.log(`✔ sfx ${id} (${why}) · ${spec.seconds}s · ~${credits} credits`);
  } catch (e) {
    console.log(`✖ sfx ${id}: ${(e as Error).message}`);
  }
  writeFileSync(SFX, JSON.stringify(sfx, null, 2) + "\n");
}

for (const [id, spec] of Object.entries(music.tracks)) {
  if (!spec.prompt || !spec.seconds) continue;
  const why = wanted(id, music.files[id], (spec as { paidOnly?: boolean }).paidOnly);
  if (!why) continue;
  if (why.startsWith("skip")) {
    console.log(`– music ${id}: ${why}`);
    continue;
  }
  try {
    const mp3 = await post("/music?output_format=mp3_44100_128", {
      prompt: spec.prompt, music_length_ms: spec.seconds * 1000, force_instrumental: spec.instrumental ?? true, model_id: "music_v1",
    });
    const file = `${id}.mp3`;
    writeFileSync(join(ROOT, "assets/music", file), mp3);
    const credits = Math.round(spec.seconds * 15);
    spent += credits;
    music.files[id] = { file, source: "elevenlabs", plan, licensed: plan === "paid", created: today, prompt: spec.prompt, credits };
    console.log(`✔ music ${id} (${why}) · ${spec.seconds}s · ~${credits} credits`);
  } catch (e) {
    console.log(`✖ music ${id}: ${(e as Error).message}`);
  }
  writeFileSync(MUSIC, JSON.stringify(music, null, 2) + "\n");
}

console.log(`done · plan ${plan} · ~${spent} credits spent this run${plan === "free" && spent ? " · free-plan output is NOT licensed for publishing" : ""}`);
if (!existsSync(join(ENGINE, "public"))) console.log('run "npm run sync" before rendering');
