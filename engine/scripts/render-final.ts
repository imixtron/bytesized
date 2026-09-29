// Final (publishable) render: refuses unless everything audible is licensed, i.e. the voiceover and
// every ElevenLabs sound or track were generated on a paid plan (or are original work).
//   npm run render:final -- 001     → episodes/<nnn-slug>/out/<slug>.mp4
// Drafts can still be rendered any time with `npm run render -- ep-001 out/draft.mp4`.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { musicFor, sfxForBeat, type AudioLibrary } from "../src/audio/library";
import { parseEpisode } from "../src/episode/parse";
import { tokens } from "../src/theme/tokens";
import type { VoiceManifest } from "../src/voice/manifest";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const prefix = process.argv[2];
if (!prefix) throw new Error("usage: npm run render:final -- <episode number>");
const folder = readdirSync(join(ROOT, "episodes")).find((d) => d.startsWith(prefix) && existsSync(join(ROOT, "episodes", d, "episode.yaml")));
if (!folder) throw new Error(`no episode folder starts with "${prefix}"`);
const epDir = join(ROOT, "episodes", folder);
const ep = parseEpisode(readFileSync(join(epDir, "episode.yaml"), "utf8"));
const lib: AudioLibrary = {
  sfx: JSON.parse(readFileSync(join(ROOT, "assets/sfx/library.json"), "utf8")),
  music: JSON.parse(readFileSync(join(ROOT, "assets/music/library.json"), "utf8")),
};

const problems: string[] = [];
// voice
const vpath = join(epDir, "audio/voice.json");
if (!existsSync(vpath)) problems.push(`no voiceover: run npm run voice -- ${prefix}`);
else if ((JSON.parse(readFileSync(vpath, "utf8")) as VoiceManifest).plan !== "paid") problems.push(`voiceover was made on the free plan: set engine/plan.json to "paid", then npm run voice -- ${prefix} --upgrade`);
// music
const music = musicFor(lib, ep.music.track);
if (!music) problems.push("no music file in the library");
else {
  if (!lib.music.files[music.id].licensed) problems.push(`music "${music.id}" isn't licensed: npm run audio -- --upgrade`);
  if (music.id !== tokens.audio.music.theme && !ep.music.track) problems.push(`the theme "${tokens.audio.music.theme}" isn't generated yet (using fallback "${music.id}"): npm run audio -- ${tokens.audio.music.theme}`);
}
// sound effects actually used by this episode
const used = new Set<string>([tokens.audio.map.sting]);
for (const s of ep.scenes) {
  if (s.transition === "push") used.add(tokens.audio.map.push);
  for (const b of s.beats) { const id = sfxForBeat(b); if (id) used.add(id); }
}
for (const id of used) {
  const f = lib.sfx.files[id];
  if (!f) problems.push(`sound "${id}" isn't generated: npm run audio -- ${id}`);
  else if (!f.licensed) problems.push(`sound "${id}" isn't licensed (made on the free plan): npm run audio -- --upgrade`);
}

if (problems.length) {
  console.log(`✖ ${folder} can't be rendered for publishing yet:\n${problems.map((p) => `  • ${p}`).join("\n")}`);
  process.exit(1);
}
const out = join(epDir, "out", `${ep.slug}.mp4`);
mkdirSync(dirname(out), { recursive: true });
execFileSync("npm", ["run", "sync", "--silent"], { cwd: ENGINE, stdio: "inherit" });
execFileSync("npx", ["remotion", "render", `ep-${folder.split("-")[0]}`, out, "--crf=18"], { cwd: ENGINE, stdio: "inherit" });
console.log(`✔ publishable render → episodes/${folder}/out/${ep.slug}.mp4`);
