// Environment check for a fresh machine (e.g. the Mac mini).
//   npm run doctor            → local checks
//   npm run doctor -- --online → also calls ElevenLabs once (voices list, no credits)
// Never prints secrets.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const online = process.argv.includes("--online");
let failed = 0;
const ok = (msg: string) => console.log(`  ✔ ${msg}`);
const bad = (msg: string, fix: string) => { failed++; console.log(`  ✖ ${msg}\n      → ${fix}`); };
const warn = (msg: string) => console.log(`  ⚠ ${msg}`);

console.log("Bytesized doctor\n");

// node
const major = Number(process.versions.node.split(".")[0]);
major >= 20 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node} (need ≥ 20)`, "install Node 20 LTS (e.g. nvm install 20)");

// deps
existsSync(join(ENGINE, "node_modules/remotion")) ? ok("dependencies installed") : bad("dependencies missing", "cd engine && npm ci");

// secrets (presence only)
const envPath = join(ENGINE, ".env");
const hasKey = existsSync(envPath) && /^\s*ELEVENLABS_API_KEY\s*=\s*\S+/m.test(readFileSync(envPath, "utf8"));
hasKey ? ok("engine/.env has ELEVENLABS_API_KEY (value not shown)") : bad("ElevenLabs key missing", "cp engine/.env.example engine/.env and paste the key");

// plan
const plan = JSON.parse(readFileSync(join(ENGINE, "plan.json"), "utf8")).elevenlabs_plan;
plan === "paid" ? ok("ElevenLabs plan: paid (renders can be final)") : warn(`ElevenLabs plan: ${plan} (drafts only; see TASKS.md → After subscribing)`);

// audio library
for (const kind of ["sfx", "music"] as const) {
  const lib = JSON.parse(readFileSync(join(ROOT, `assets/${kind}/library.json`), "utf8"));
  const missing = Object.entries(lib.files as Record<string, { file: string }>).filter(([, f]) => !existsSync(join(ROOT, `assets/${kind}`, f.file)));
  missing.length ? bad(`${kind} library files missing: ${missing.map(([id]) => id).join(", ")}`, `npm run audio (or restore from git)`) : ok(`${kind} library files present`);
}

// sync + typecheck + validate
try {
  execFileSync("node", ["scripts/sync-public.mjs"], { cwd: ENGINE, stdio: "pipe" });
  ok("public/ synced");
} catch (e) {
  bad("sync failed", String((e as Error).message).split("\n")[0]);
}
try {
  execFileSync("npx", ["tsc", "--noEmit"], { cwd: ENGINE, stdio: "pipe" });
  ok("TypeScript compiles");
} catch {
  bad("TypeScript errors", "cd engine && npx tsc --noEmit");
}
const episodes = readdirSync(join(ROOT, "episodes")).filter((d) => existsSync(join(ROOT, "episodes", d, "episode.yaml")));
try {
  execFileSync("npx", ["tsx", "scripts/validate.ts"], { cwd: ENGINE, stdio: "pipe" });
  ok(`${episodes.length} episode(s) validate`);
} catch {
  bad("an episode fails validation", "npm run validate");
}

// ffmpeg via remotion
try {
  execFileSync("npx", ["remotion", "ffmpeg", "-version"], { cwd: ENGINE, stdio: "pipe" });
  ok("Remotion ffmpeg available");
} catch {
  bad("Remotion ffmpeg not available", "cd engine && npm ci");
}

// optional online check
if (online && hasKey) {
  const key = readFileSync(envPath, "utf8").match(/^\s*ELEVENLABS_API_KEY\s*=\s*"?([^"\s]+)/m)![1];
  const res = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": key } });
  res.ok ? ok("ElevenLabs reachable, key accepted") : bad(`ElevenLabs returned ${res.status}`, "check the key and its permissions (STATUS.md lists them)");
}

console.log(failed ? `\n✖ ${failed} problem(s) to fix` : "\n✔ ready");
if (!online) console.log('  (run "npm run doctor -- --online" to also test the ElevenLabs key)');
process.exit(failed ? 1 : 0);
