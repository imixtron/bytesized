// Episode cover / thumbnail (design language v1.6): the title plus up to 4 of the
// episode's diagrams (its BigPicture panels if it has one).
//   npm run cover -- 003   → episodes/<nnn-slug>/out/cover.png (1080×1920, generated: not committed)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const prefix = process.argv[2];
if (!prefix) throw new Error("usage: npm run cover -- <episode number>");
const folder = readdirSync(join(ROOT, "episodes")).find((d) => d.startsWith(prefix) && existsSync(join(ROOT, "episodes", d, "episode.yaml")));
if (!folder) throw new Error(`no episode folder starts with "${prefix}"`);
const out = join(ROOT, "episodes", folder, "out", "cover.png");
mkdirSync(dirname(out), { recursive: true });
execFileSync("npm", ["run", "sync", "--silent"], { cwd: ENGINE, stdio: "inherit" });
execFileSync("npx", ["remotion", "still", `cover-${folder.split("-")[0]}`, out, "--frame=0"], { cwd: ENGINE, stdio: "inherit" });
console.log(`✔ cover → episodes/${folder}/out/cover.png`);
