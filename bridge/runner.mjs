// Host runner: turns each bridge/inbox item into one headless Claude Code run, strictly one at a time.
// launchd starts it whenever bridge/inbox changes (bridge/launchd/com.bytesized.runner.plist); it drains the inbox and exits.
//   node bridge/runner.mjs            drain the inbox now
import { spawn, spawnSync } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIR = Object.fromEntries(["inbox", "processing", "done", "failed", "logs", "state"].map((d) => [d, join(HERE, d)]));
for (const d of Object.values(DIR)) mkdirSync(d, { recursive: true });
const CLAUDE = process.env.CLAUDE_BIN ?? "claude";
const TIMEOUT_MS = 4 * 60 * 60 * 1000; // a draft or final render plus the rest of the stage fits well inside this

const log = (msg) => console.log(`${new Date().toISOString()} ${msg}`);

// ---------------------------------------------------------------- one runner at a time
const LOCK = join(DIR.state, "runner.lock");
try {
  mkdirSync(LOCK);
} catch {
  const pid = Number(readFileSync(join(LOCK, "pid"), "utf8").trim() || 0);
  let alive = false;
  try {
    process.kill(pid, 0);
    alive = true;
  } catch {}
  if (alive) {
    log(`runner already active (pid ${pid}); it will pick this up`);
    process.exit(0);
  }
  log(`clearing stale lock from pid ${pid}`);
}
writeFileSync(join(LOCK, "pid"), String(process.pid));
const unlock = () => rmSync(LOCK, { recursive: true, force: true });
process.on("exit", unlock);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(1));

// ---------------------------------------------------------------- prompts
const UNATTENDED =
  "This is an unattended run started by the Bytesized Discord bridge: nobody is watching this session. " +
  "Never wait for input. Every review gate, blocker or question goes to Discord with `npm --prefix engine run discord -- …` (queue skill §4), then this run ends.";

function prompt(item, path) {
  if (item.kind === "tick") return `/queue tick\n\n${UNATTENDED}`;
  return `/queue event ${path}\n\n${UNATTENDED}\nThe event file is JSON from Imad's click in Discord: handle it with queue skill §5 (Discord event).`;
}

const alert = (text) =>
  spawnSync("npm", ["--prefix", join(ROOT, "engine"), "run", "--silent", "discord", "--", "alert", text], { cwd: ROOT, stdio: "inherit" });

// ---------------------------------------------------------------- drain
function nextItems() {
  const items = readdirSync(DIR.inbox).filter((f) => f.endsWith(".json") && !f.startsWith(".")).sort();
  // Several ticks waiting (e.g. after a long render) collapse into one.
  const ticks = items.filter((f) => f.includes("-tick-"));
  for (const t of ticks.slice(0, -1)) renameSync(join(DIR.inbox, t), join(DIR.done, t));
  return items.filter((f) => !ticks.slice(0, -1).includes(f));
}

async function run(name) {
  const rel = `bridge/processing/${name}`;
  renameSync(join(DIR.inbox, name), join(DIR.processing, name));
  const item = JSON.parse(readFileSync(join(DIR.processing, name), "utf8"));
  const logFile = join(DIR.logs, name.replace(/\.json$/, ".log"));
  const out = createWriteStream(logFile);
  log(`▶ ${name} (${item.kind}${item.data?.action ? ` ${item.data.action} on ${item.data.correlation_id}` : ""}) → bridge/logs/${name.replace(/\.json$/, ".log")}`);

  const code = await new Promise((resolve) => {
    const child = spawn(CLAUDE, ["-p", prompt(item, rel), "--permission-mode", "acceptEdits"], { cwd: ROOT, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.pipe(out, { end: false });
    child.stderr.pipe(out, { end: false });
    const timer = setTimeout(() => {
      out.write(`\n[runner] timed out after ${TIMEOUT_MS / 60000} min\n`);
      child.kill("SIGTERM");
    }, TIMEOUT_MS);
    child.on("error", (e) => {
      out.write(`\n[runner] could not start ${CLAUDE}: ${e.message}\n`);
      clearTimeout(timer);
      resolve(127);
    });
    child.on("close", (c) => {
      clearTimeout(timer);
      resolve(c ?? 1);
    });
  });
  out.end(`\n[runner] exit ${code}\n`);

  const dest = code === 0 ? DIR.done : DIR.failed;
  renameSync(join(DIR.processing, name), join(dest, name));
  log(`${code === 0 ? "✔" : "✖"} ${name} exit ${code}`);
  if (code !== 0) alert(`🛑 Claude run failed (exit ${code}) for \`${name}\`. Log: \`bridge/logs/${name.replace(/\.json$/, ".log")}\`. The item is in \`bridge/failed/\`: move it back to \`bridge/inbox/\` to retry.`);
}

// Anything left in processing/ means the Mac restarted mid-run: put it back at the front of the queue.
for (const f of readdirSync(DIR.processing).filter((f) => f.endsWith(".json"))) renameSync(join(DIR.processing, f), join(DIR.inbox, f));

for (let items = nextItems(); items.length; items = nextItems()) await run(items[0]);
log("inbox empty");
