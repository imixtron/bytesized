// Commits everything needed to rebuild an episode, and nothing that can be regenerated (AGENTS §6).
//   npm run commit:episode -- 002                     commit (the bridge runner calls this after the final render)
//   npm run commit:episode -- 002 --push              …and push to main (pull --rebase first, never force)
//   npm run commit:episode -- 002 --message "<subject>" --allow-incomplete    mid-pipeline snapshot
// Staged: the episode folder (episode.yaml, audio/, storyboard/, out/upload.md, cost.jsonl; out/*.mp4 stays ignored)
// plus the shared inputs it was built with (assets/ music + sfx + logos, brand/, engine/ source, episodes/*.md|json,
// bridge/ code, skills, docs). Other episodes' folders are left alone and listed. Refuses renders, .env and big files.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEpisode } from "../src/episode/parse";
import { buildTimeline } from "../src/timing/timeline";
import { measuredFrom, type VoiceManifest } from "../src/voice/manifest";
import { tokens } from "../src/theme/tokens";
import { costLine, folderOf } from "./cost";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const SHARED = [
  "episodes/INDEX.md", "episodes/SCRIPT-FORMAT.md", "episodes/voices.json", "episodes/music.json", "episodes/pronunciations.md",
  "assets", "brand", "engine", "bridge", ".claude/skills", ".claude/settings.json",
  "AGENTS.md", "CLAUDE.md", "STATUS.md", "TASKS.md", "SETUP.md", ".gitignore",
];
const FORBIDDEN = /\.(mp4|mov|webm)$|(^|\/)\.env(\.|$)|^engine\/(public|out)\/|node_modules\//;
const MAX_BYTES = 50 * 1024 * 1024;
const COAUTHOR = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";

const git = (...args: string[]) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
const args = process.argv.slice(2);
const flag = (n: string) => args.includes(`--${n}`);
const opt = (n: string) => (args.indexOf(`--${n}`) >= 0 ? args[args.indexOf(`--${n}`) + 1] : undefined);
const nnn = args[0];
if (!nnn || nnn.startsWith("--")) throw new Error('usage: npm run commit:episode -- <nnn> [--push] [--message "<subject>"] [--allow-incomplete]');
const folder = folderOf(nnn);
if (!folder) throw new Error(`no episode folder starts with "${nnn}"`);
const dir = join(ROOT, "episodes", folder);

// ---------------------------------------------------------------- is the recipe complete?
const missing = ["episode.yaml", "audio/voice.json", "storyboard/storyboard.html", "out/upload.md"].filter((f) => !existsSync(join(dir, f)));
if (missing.length && !flag("allow-incomplete")) {
  console.error(`✖ ${folder} is missing ${missing.join(", ")}. Finish the episode, or pass --allow-incomplete for a snapshot.`);
  process.exit(1);
}
const branch = git("rev-parse", "--abbrev-ref", "HEAD");
if (branch !== "main") {
  console.error(`✖ on branch ${branch}, not main`);
  process.exit(1);
}

// ---------------------------------------------------------------- stage
git("add", "-A", "--", `episodes/${folder}`, ...SHARED.filter((p) => existsSync(join(ROOT, p))));
const staged = git("diff", "--cached", "--name-only").split("\n").filter(Boolean);
const bad = staged.filter((f) => FORBIDDEN.test(f) || (existsSync(join(ROOT, f)) && statSync(join(ROOT, f)).size > MAX_BYTES));
if (bad.length) {
  git("restore", "--staged", "--", ...staged);
  console.error(`✖ refusing to commit (render, secret or >50 MB): ${bad.join(", ")}. Nothing was committed.`);
  process.exit(1);
}
if (!staged.length) {
  console.log(`= nothing to commit for ${folder}`);
  process.exit(0);
}
const leftOut = [...new Set(git("status", "--porcelain").split("\n").map((l) => l.slice(3).match(/^episodes\/\d{3}-[^/]+/)?.[0]).filter((f): f is string => Boolean(f) && f !== `episodes/${folder}`))];

// ---------------------------------------------------------------- message
const ep = parseEpisode(readFileSync(join(dir, "episode.yaml"), "utf8"));
let length = "";
if (existsSync(join(dir, "audio/voice.json"))) {
  const m = measuredFrom(ep, JSON.parse(readFileSync(join(dir, "audio/voice.json"), "utf8")) as VoiceManifest);
  if (!("stale" in m)) length = `${(buildTimeline(ep, m.measured).totalFrames / tokens.canvas.fps).toFixed(1)}s`;
}
const subject = opt("message") ?? `Episode ${folder.split("-")[0]}: ${ep.title} (rendered)`;
const body = [[length, ep.voice.name, ep.music.track].filter(Boolean).join(", "), `Build cost: ${costLine(folder)}.`, `${staged.length} files.`].join("\n");
git("commit", "-m", subject, "-m", body, "-m", COAUTHOR);
const sha = git("rev-parse", "--short", "HEAD");
console.log(`✔ committed ${sha} · ${subject} · ${staged.length} files`);
if (leftOut.length) console.log(`  left out (other episodes): ${leftOut.join(", ")}`);

if (flag("push")) {
  git("pull", "--rebase", "--autostash", "origin", "main");
  git("push", "origin", "main");
  console.log(`✔ pushed ${git("rev-parse", "--short", "HEAD")} to origin/main`);
}
