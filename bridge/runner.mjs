// Host runner: turns each bridge/inbox item into one headless Claude Code run, strictly one at a time.
// launchd starts it whenever bridge/inbox changes (bridge/launchd/com.bytesized.runner.plist); it drains the inbox and exits.
//   node bridge/runner.mjs            drain the inbox now
// Sessions: each episode keeps one Claude session (bridge/state/discord.json → episodes.<nnn>.session, recorded by
// `npm run discord` from BYTESIZED_SESSION_ID). A click on that episode resumes it, so the skills, rules and episode
// are already in context. Past SESSION_COMPACT_TOKENS the session is compacted first, so old screenshots and render
// logs aren't carried into every turn. Ticks with an episode waiting on a review are answered here, without Claude.
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const DIR = Object.fromEntries(["inbox", "processing", "done", "failed", "logs", "state"].map((d) => [d, join(HERE, d)]));
for (const d of Object.values(DIR)) mkdirSync(d, { recursive: true });
const CLAUDE = process.env.CLAUDE_BIN ?? "claude";
const TIMEOUT_MS = 4 * 60 * 60 * 1000; // a draft or final render plus the rest of the stage fits well inside this
const COMPACT_AT = Number(process.env.SESSION_COMPACT_TOKENS ?? 60000); // a fresh run starts at ~33k
// Mechanical stages (approve storyboard → draft render; approve draft → final render, upload.md, commit) run on a
// lighter model and effort. Scripting, storyboards, revisions and blockers keep the default. LIGHT_MODEL="" turns it off.
const LIGHT_MODEL = process.env.LIGHT_MODEL ?? "sonnet";
const LIGHT_EFFORT = process.env.LIGHT_EFFORT ?? "medium";
const isLight = (item) => Boolean(LIGHT_MODEL) && item.data?.action === "approve" && /:(storyboard|draft):r\d+$/.test(item.data?.correlation_id ?? "");
const TRANSCRIPTS = join(process.env.HOME ?? "", ".claude/projects", ROOT.replace(/[^A-Za-z0-9]/g, "-"));
const DISCORD_STATE = join(DIR.state, "discord.json");
const GATE_NAME = { script: "Script Review", parts: "Parts Review", storyboard: "Storyboard Review", draft: "Draft Review", blocked: "a blocker" };

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

function prompt(item, path, resumed) {
  const parts = [item.kind === "tick" ? "/queue tick" : `/queue event ${path}`, UNATTENDED];
  if (item.kind !== "tick") parts.push("The event file is JSON from Imad's click in Discord: handle it with queue skill §5 (Discord event).");
  if (resumed)
    parts.push(
      "This run resumes the episode's earlier session, so the rules and the episode are already in context: don't re-read files you already have unless they may have changed. " +
        "Time has passed since, so still check the current Notion row and Discord state before acting.",
    );
  if (item.attempts)
    parts.push(
      `This item was tried ${item.attempts} time(s) before and the run stopped partway (crash or usage limit). Imad pressed Retry. ` +
        "Pick up where it stopped and don't redo finished steps. If Notion has already moved past the clicked gate because of that earlier attempt, continue from there instead of calling the click outdated.",
    );
  return parts.join("\n\n");
}

const npmOut = (...args) => {
  const r = spawnSync("npm", ["--prefix", join(ROOT, "engine"), "run", "--silent", ...args], { cwd: ROOT, encoding: "utf8" });
  return { ok: r.status === 0, text: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim() };
};
const discord = (...args) =>
  spawnSync("npm", ["--prefix", join(ROOT, "engine"), "run", "--silent", "discord", "--", ...args], { cwd: ROOT, stdio: "inherit" }).status === 0;

// ---------------------------------------------------------------- sessions
const readDiscord = () => {
  try {
    return JSON.parse(readFileSync(DISCORD_STATE, "utf8"));
  } catch {
    return { episodes: {} };
  }
};
const episodeOf = (item) => item.data?.metadata?.episode ?? item.data?.correlation_id?.match(/^(\d{3}):/)?.[1] ?? null;

/** Context size of the session's last real turn, in tokens (null when the transcript is gone). */
function contextTokens(id) {
  const f = join(TRANSCRIPTS, `${id}.jsonl`);
  if (!existsSync(f)) return null;
  const lines = readFileSync(f, "utf8").trimEnd().split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const j = JSON.parse(lines[i]);
      // Compacted after its last turn: the next turn starts at ~30k (system, tools, CLAUDE.md) + the summary.
      if (j.subtype === "compact_boundary") return 30000 + (j.compactMetadata?.postTokens ?? 0);
      const u = j.message?.usage;
      const t = u ? (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) : 0;
      if (t) return t;
    } catch {}
  }
  return 0;
}

/** Runs claude -p and resolves with { code, stdout }. stderr goes straight to the log. */
function claude(args, out, env = {}) {
  return new Promise((resolve) => {
    let stdout = "";
    const child = spawn(CLAUDE, args, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.pipe(out, { end: false });
    const timer = setTimeout(() => {
      out.write(`\n[runner] timed out after ${TIMEOUT_MS / 60000} min\n`);
      child.kill("SIGTERM");
    }, TIMEOUT_MS);
    child.on("error", (e) => {
      out.write(`\n[runner] could not start ${CLAUDE}: ${e.message}\n`);
      clearTimeout(timer);
      resolve({ code: 127, stdout });
    });
    child.on("close", (c) => {
      clearTimeout(timer);
      resolve({ code: c ?? 1, stdout });
    });
  });
}

/** Writes the run's result text and a one-line usage summary (from --output-format json) to the log. */
function report(out, stdout) {
  let j;
  try {
    j = JSON.parse(stdout);
  } catch {
    out.write(stdout);
    return null;
  }
  const u = j.usage ?? {};
  out.write(`${j.result ?? ""}\n`);
  out.write(
    `\n[runner] session ${j.session_id} · ${j.num_turns ?? "?"} turns · ${Math.round((j.duration_ms ?? 0) / 1000)}s · ` +
      `in ${u.input_tokens ?? 0} · cache write ${u.cache_creation_input_tokens ?? 0} · cache read ${u.cache_read_input_tokens ?? 0} · out ${u.output_tokens ?? 0}` +
      (j.total_cost_usd ? ` · ~$${j.total_cost_usd.toFixed(2)} API-equivalent` : "") +
      "\n",
  );
  return j;
}

/** Picks the session for an item: the episode's own (compacted when big), or a new one. */
async function pickSession(item, out) {
  const ep = episodeOf(item);
  const id = ep && readDiscord().episodes?.[ep]?.session;
  if (!id) return { id: randomUUID(), resume: false };
  const tokens = contextTokens(id);
  if (tokens === null) {
    out.write(`[runner] ${ep}: session ${id} has no transcript, starting a new one\n`);
    return { id: randomUUID(), resume: false };
  }
  // Normally already compacted at the end of the last run; this is the fallback (e.g. that run hit a usage limit).
  if (tokens > COMPACT_AT && !(await compact(id, ep, out))) return { id: randomUUID(), resume: false };
  out.write(`[runner] ${ep}: resuming session ${id} (~${Math.round((contextTokens(id) ?? 0) / 1000)}k tokens)\n`);
  return { id, resume: true };
}

/** /compact the session. Cheapest straight after a run, while its prompt cache is still warm. */
async function compact(id, ep, out) {
  const before = contextTokens(id);
  out.write(`[runner] ${ep}: session ${id} is at ${Math.round(before / 1000)}k tokens, compacting\n`);
  const focus =
    `/compact Keep what the next Bytesized run on episode ${ep} needs: the current stage and open gate, the Notion row's url, every decision and piece of Imad's feedback so far, ` +
    "files created or changed, credits spent, and anything left unfinished. Drop image contents, render and command output, and full file dumps.";
  const c = await claude(["-p", focus, "--resume", id, "--output-format", "json"], out);
  let cj = null;
  try {
    cj = JSON.parse(c.stdout);
  } catch {}
  recordCost(ep, "compact", cj, { session: id, resumed: true, exit: c.code });
  if (c.code !== 0) {
    out.write(`[runner] compaction failed (exit ${c.code})\n${c.stdout}\n`);
    return false;
  }
  out.write(`[runner] compacted ${id}: ${Math.round(before / 1000)}k → ~${Math.round(contextTokens(id) / 1000)}k tokens\n`);
  return true;
}

// ---------------------------------------------------------------- build cost (npm run cost)
/** What a run did, from the click that started it. */
function stageOf(item) {
  const d = item.data ?? {};
  if (item.kind === "tick" || d.correlation_id?.startsWith("next:")) return "pick-up + script";
  const gate = d.correlation_id?.match(/^\d{3}:(\w+):/)?.[1];
  if (gate === "blocked") return "blocker";
  if (d.action === "changes") return `revise ${gate}`;
  return { script: "voice + storyboard", parts: "voice + storyboard", storyboard: "draft render", draft: "final render + commit" }[gate] ?? d.action ?? "other";
}

/** Appends one line to episodes/<nnn-slug>/cost.jsonl (committed) and to bridge/state/costs.jsonl (every run). */
function recordCost(ep, stage, j, extra = {}) {
  const u = j?.usage ?? {};
  const line = {
    at: new Date().toISOString(),
    kind: "claude",
    stage,
    ...extra,
    models: Object.keys(j?.modelUsage ?? {}),
    turns: j?.num_turns ?? 0,
    seconds: Math.round((j?.duration_ms ?? 0) / 1000),
    tokens: { input: u.input_tokens ?? 0, cache_write: u.cache_creation_input_tokens ?? 0, cache_read: u.cache_read_input_tokens ?? 0, output: u.output_tokens ?? 0 },
    ...(typeof j?.total_cost_usd === "number" ? { usd: Math.round(j.total_cost_usd * 10000) / 10000 } : {}),
  };
  appendFileSync(join(DIR.state, "costs.jsonl"), JSON.stringify({ episode: ep, ...line }) + "\n");
  const folder = ep && readdirSync(join(ROOT, "episodes")).find((d) => d.startsWith(ep) && existsSync(join(ROOT, "episodes", d, "episode.yaml")));
  if (folder) appendFileSync(join(ROOT, "episodes", folder, "cost.jsonl"), JSON.stringify(line) + "\n");
}

/** A tick while an episode waits on Imad needs no Claude run: post the status line here. */
function busyTick() {
  const [nnn, es] = Object.entries(readDiscord().episodes ?? {}).find(([, e]) => e.open && e.open.kind !== "next") ?? [];
  if (!nnn) return false;
  const failed = readdirSync(DIR.failed).filter((f) => f.endsWith(".json")).length;
  return discord(
    "status",
    `Queue busy: ${nnn} ${es.title} is waiting on ${GATE_NAME[es.open.kind] ?? es.open.kind}${es.open.round > 1 ? ` (round ${es.open.round})` : ""}` +
      (failed ? ` · ${failed} failed run(s) waiting for Retry` : ""),
  );
}

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
  const logName = name.replace(/\.json$/, ".log");
  const out = createWriteStream(join(DIR.logs, logName), { flags: "a" });
  log(`▶ ${name} (${item.kind}${item.data?.action ? ` ${item.data.action} on ${item.data.correlation_id}` : ""}) → bridge/logs/${logName}`);

  if (item.kind === "tick" && busyTick()) {
    out.end("[runner] tick: an episode is waiting on Imad, posted the status line without a Claude run\n");
    renameSync(join(DIR.processing, name), join(DIR.done, name));
    return log(`✔ ${name} answered without Claude (queue busy)`);
  }

  let s = await pickSession(item, out);
  const light = isLight(item) ? ["--model", LIGHT_MODEL, "--effort", LIGHT_EFFORT] : [];
  if (light.length) out.write(`[runner] mechanical stage: ${LIGHT_MODEL}, effort ${LIGHT_EFFORT}\n`);
  const args = (s) => ["-p", prompt(item, rel, s.resume), ...(s.resume ? ["--resume", s.id] : ["--session-id", s.id]), ...light, "--permission-mode", "acceptEdits", "--output-format", "json"];
  let r = await claude(args(s), out, { BYTESIZED_SESSION_ID: s.id });
  if (r.code !== 0 && s.resume && /no conversation found|session.*not found/i.test(r.stdout)) {
    out.write(`\n[runner] could not resume ${s.id}, starting a new session\n`);
    s = { id: randomUUID(), resume: false };
    r = await claude(args(s), out, { BYTESIZED_SESSION_ID: s.id });
  }
  const j = report(out, r.stdout);
  const code = r.code === 0 && j?.is_error ? 1 : r.code;
  out.write(`\n[runner] exit ${code}\n`);
  const runEp = Object.entries(readDiscord().episodes ?? {}).find(([, e]) => e.session === s.id)?.[0] ?? episodeOf(item);
  recordCost(runEp, stageOf(item), j, { item: name, session: s.id, resumed: s.resume, exit: code });

  if (code === 0) {
    // The run ended at a gate: compact now, while the cache is warm, so the next click resumes a small session.
    const ep = Object.entries(readDiscord().episodes ?? {}).find(([, e]) => e.session === s.id)?.[0];
    if (ep && (contextTokens(s.id) ?? 0) > COMPACT_AT) await compact(s.id, ep, out);
    // Episode finished: commit its recipe now, after this run's cost line is in the ledger (AGENTS §6).
    if (stageOf(item) === "final render + commit" && runEp) {
      const c = npmOut("commit:episode", "--", runEp, "--push");
      out.write(`\n[runner] commit:episode ${runEp}\n${c.text}\n`);
      const cost = npmOut("cost", "--", runEp, "--line").text;
      if (c.ok) discord("note", runEp, `📦 ${c.text.split("\n").filter((l) => l.startsWith("✔")).join(" · ")}\nBuild cost: ${cost}`);
      else discord("alert", `⚠️ ${runEp} rendered, but the commit failed: ${c.text.slice(-600)}\nRun \`npm --prefix engine run commit:episode -- ${runEp} --push\` after fixing it.`);
    }
    out.end();
    renameSync(join(DIR.processing, name), join(DIR.done, name));
    return log(`✔ ${name} exit 0`);
  }
  out.end();
  // Failed: keep the item (with its attempt count) in failed/, and post Retry run / Leave it.
  item.attempts = (item.attempts ?? 0) + 1;
  writeFileSync(join(DIR.failed, name), JSON.stringify(item, null, 2));
  rmSync(join(DIR.processing, name));
  log(`✖ ${name} exit ${code}`);
  const ep = episodeOf(item);
  const limit = `${r.stdout}\n${readFileSync(join(DIR.logs, logName), "utf8")}`.match(/(?:you've )?hit your [^\n"]*limit[^\n"]*/i)?.[0];
  const what = item.kind === "tick" ? "the queue tick" : `${item.data?.action ?? "event"} on \`${item.data?.correlation_id ?? name}\``;
  const text = limit
    ? `⏳ **Usage limit hit** while running ${what}: ${limit.trim()}.\nPress **Retry run** once it has reset. The run picks up where it stopped.`
    : `🛑 **Claude run failed** (exit ${code}) while running ${what}.\nLog: \`bridge/logs/${logName}\`. **Retry run** runs it again and picks up where it stopped.`;
  if (!discord("runfailed", name, text, ...(ep ? ["--episode", ep] : [])))
    discord("alert", `${text}\n(The Retry button could not be posted: move \`bridge/failed/${name}\` back to \`bridge/inbox/\` to retry.)`);
}

// Anything left in processing/ means the Mac restarted mid-run: put it back at the front of the queue.
for (const f of readdirSync(DIR.processing).filter((f) => f.endsWith(".json"))) renameSync(join(DIR.processing, f), join(DIR.inbox, f));

for (let items = nextItems(); items.length; items = nextItems()) await run(items[0]);
log("inbox empty");
