// Gist image: the episode's final gist card as a still, for uploading by hand to any platform.
//   npm run gist -- 010   → episodes/<nnn-slug>/out/gist.png (1080×1920, generated: not committed)
//   npm run gist -- all   → every episode that has a final render
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEpisode } from "../src/episode/parse";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const arg = process.argv[2];
if (!arg) throw new Error("usage: npm run gist -- <episode number | all>");
const all = readdirSync(join(ROOT, "episodes")).filter((d) => /^\d{3}-/.test(d) && existsSync(join(ROOT, "episodes", d, "episode.yaml"))).sort();
const folders =
  arg === "all"
    ? all.filter((d) => existsSync(join(ROOT, "episodes", d, "out", `${parseEpisode(readFileSync(join(ROOT, "episodes", d, "episode.yaml"), "utf8")).slug}.mp4`)))
    : all.filter((d) => d.startsWith(arg)).slice(0, 1);
if (!folders.length) throw new Error(`no episode folder matches "${arg}"`);
execFileSync("npm", ["run", "sync", "--silent"], { cwd: ENGINE, stdio: "inherit" });
for (const folder of folders) {
  const out = join(ROOT, "episodes", folder, "out", "gist.png");
  mkdirSync(dirname(out), { recursive: true });
  execFileSync("npx", ["remotion", "still", `gist-${folder.split("-")[0]}`, out, "--frame=0"], { cwd: ENGINE, stdio: "inherit" });
  console.log(`✔ gist → episodes/${folder}/out/gist.png`);
}
