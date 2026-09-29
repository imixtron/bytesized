// Generates the voiceover for an episode with ElevenLabs, one clip per scene, with word timestamps.
//   npm run voice -- 001            → generate missing or changed scenes only (cached by text + voice + settings)
//   npm run voice -- 001 --force    → regenerate every scene
//   npm run voice -- 001 --upgrade  → regenerate scenes made on the free plan (after subscribing)
// Output: episodes/<nnn-slug>/audio/<scene>.mp3 plus voice.json (the manifest the engine reads).
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEpisode } from "../src/episode/parse";
import { tokenize } from "../src/episode/words";
import { MODEL, apiKey, speakWithTimestamps, type Alignment, type VoiceSettings } from "../src/voice/elevenlabs";
import type { VoiceManifest } from "../src/voice/manifest";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const SETTINGS: VoiceSettings = { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true };

const [prefix, flag] = process.argv.slice(2);
if (!prefix) throw new Error("usage: npm run voice -- <episode number> [--force]");
const folder = readdirSync(join(ROOT, "episodes")).find((d) => d.startsWith(prefix) && existsSync(join(ROOT, "episodes", d, "episode.yaml")));
if (!folder) throw new Error(`no episode folder starts with "${prefix}"`);

const ep = parseEpisode(readFileSync(join(ROOT, "episodes", folder, "episode.yaml"), "utf8"));
if (!ep.voice.name || ep.voice.voice_id === "TBD") throw new Error(`no voice assigned: run npm run voice:assign -- ${prefix}`);

const audioDir = join(ROOT, "episodes", folder, "audio");
mkdirSync(audioDir, { recursive: true });
const manifestPath = join(audioDir, "voice.json");
const old: VoiceManifest | null = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : null;

/** Character alignment → one {start,end} per whitespace-separated word, matching tokenize(). */
function wordsFrom(al: Alignment) {
  const words: { text: string; start: number; end: number }[] = [];
  let cur: { text: string; start: number; end: number } | null = null;
  al.characters.forEach((ch, i) => {
    if (/\s/.test(ch)) {
      if (cur) words.push(cur);
      cur = null;
      return;
    }
    if (!cur) cur = { text: "", start: al.character_start_times_seconds[i], end: 0 };
    cur.text += ch;
    cur.end = al.character_end_times_seconds[i];
  });
  if (cur) words.push(cur);
  return words;
}

const key = apiKey(ENGINE);
const settings = { ...SETTINGS, speed: ep.voice.speed ?? 1 };
const plan: "free" | "paid" = JSON.parse(readFileSync(join(ENGINE, "plan.json"), "utf8")).elevenlabs_plan;
const manifest: VoiceManifest = { voice: ep.voice.name, voice_id: ep.voice.voice_id, model: MODEL, plan, generated: new Date().toISOString(), scenes: {} };
let chars = 0;

for (const [i, scene] of ep.scenes.entries()) {
  const hash = createHash("sha1").update(JSON.stringify([scene.vo, ep.voice.voice_id, MODEL, settings])).digest("hex").slice(0, 10);
  const file = `${scene.id}.mp3`;
  const cached = old?.scenes[scene.id];
  const upgrade = flag === "--upgrade" && plan === "paid" && (cached?.plan ?? old?.plan) !== "paid";
  if (flag !== "--force" && !upgrade && cached?.hash === hash && existsSync(join(audioDir, file))) {
    manifest.scenes[scene.id] = { ...cached, plan: cached.plan ?? old?.plan ?? "free" };
    console.log(`  = ${scene.id} (cached)`);
    continue;
  }
  // neighbouring lines help ElevenLabs keep intonation continuous across clips
  const { audio, alignment } = await speakWithTimestamps(key, ep.voice.voice_id, scene.vo, settings, {
    previous_text: ep.scenes[i - 1]?.vo,
    next_text: ep.scenes[i + 1]?.vo,
  });
  writeFileSync(join(audioDir, file), audio);
  const words = wordsFrom(alignment);
  const expected = tokenize(scene.vo).length;
  if (words.length !== expected) throw new Error(`${scene.id}: got ${words.length} timed words, expected ${expected}`);
  const duration = alignment.character_end_times_seconds.at(-1) ?? 0;
  manifest.scenes[scene.id] = { file, hash, text: scene.vo, duration, words, plan };
  chars += scene.vo.length;
  console.log(`  ✔ ${scene.id}: ${duration.toFixed(2)}s, ${words.length} words`);
}

manifest.plan = Object.values(manifest.scenes).every((s) => s.plan === "paid") ? "paid" : "free";
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
const total = Object.values(manifest.scenes).reduce((n, s) => n + s.duration, 0);
console.log(`${folder} · voice ${manifest.voice} · ${total.toFixed(1)}s of speech · ${chars} characters billed this run`);
