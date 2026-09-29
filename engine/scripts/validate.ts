// Validates episode.yaml files against SCRIPT-FORMAT.md v1.0.
// Usage: npm run validate            → all episodes
//        npm run validate -- 001     → episodes whose folder starts with 001
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEpisode } from "../src/episode/parse";
import { validate } from "../src/episode/rules";
import { buildTimeline } from "../src/timing/timeline";
import { tokens } from "../src/theme/tokens";
import { measuredFrom, type VoiceManifest } from "../src/voice/manifest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const filter = process.argv[2] ?? "";
const folders = readdirSync(join(ROOT, "episodes")).filter(
  (d) => d.startsWith(filter) && existsSync(join(ROOT, "episodes", d, "episode.yaml")),
);

let failed = 0;
for (const folder of folders) {
  console.log(`\n▶ ${folder}`);
  try {
    const ep = parseEpisode(readFileSync(join(ROOT, "episodes", folder, "episode.yaml"), "utf8"));
    if (ep.slug !== folder.replace(/^\d+-/, "")) console.log(`  ⚠ slug "${ep.slug}" doesn't match folder "${folder}"`);
    const roster = JSON.parse(readFileSync(join(ROOT, "episodes/voices.json"), "utf8")).roster;
    const manifestPath = join(ROOT, "episodes", folder, "audio/voice.json");
    let measured;
    if (existsSync(manifestPath)) {
      const m = measuredFrom(ep, JSON.parse(readFileSync(manifestPath, "utf8")) as VoiceManifest);
      if ("stale" in m) console.log(`  ⚠ voiceover out of date for: ${m.stale.join(", ")}. Run npm run voice -- ${folder.split("-")[0]}`);
      else measured = m.measured;
    }
    const sfxLib = JSON.parse(readFileSync(join(ROOT, "assets/sfx/library.json"), "utf8"));
    const musicLib = JSON.parse(readFileSync(join(ROOT, "assets/music/library.json"), "utf8"));
    const issues = validate(ep, {
      fileExists: (p) => existsSync(join(ROOT, p)), roster, measured,
      sfxIds: Object.keys(sfxLib.sounds), musicIds: [...Object.keys(musicLib.tracks)],
    });
    const tl = buildTimeline(ep, measured);
    const vo = ep.scenes.reduce((n, s) => n + s.vo.split(/\s+/).length, 0);
    console.log(`  voice: ${ep.voice.name ?? "(unassigned)"}`);
    console.log(`  ${ep.scenes.length} scenes · ${vo} words · ~${(tl.totalFrames / tokens.canvas.fps).toFixed(1)}s (${tl.source}, incl. ${tokens.brandSting.durationSec}s sting)`);
    for (const i of issues) console.log(`  ${i.level === "error" ? "✖" : "⚠"} [${i.where}] ${i.msg}`);
    const errors = issues.filter((i) => i.level === "error").length;
    if (errors) failed++;
    console.log(errors ? `  ✖ FAIL (${errors} error${errors > 1 ? "s" : ""})` : "  ✔ PASS");
  } catch (e) {
    failed++;
    console.log(`  ✖ ${(e as Error).message}`);
  }
}
if (!folders.length) console.log(`no episodes match "${filter}"`);
process.exit(failed ? 1 : 0);
