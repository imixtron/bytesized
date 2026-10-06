// Build cost per episode: Claude tokens and $ per run, and ElevenLabs credits, from episodes/<nnn-slug>/cost.jsonl.
//   npm run cost              every episode, one line each, plus the total
//   npm run cost -- 002       one episode, broken down by stage
//   npm run cost -- 002 --json
//   npm run cost -- 002 --line   one line (posted to Discord after the commit)
// Writers: bridge/runner.mjs appends one "claude" line per Claude run (incl. compactions); scripts/voice.ts one
// "elevenlabs" line per voicing that billed characters. The ledger is committed with the episode.
// $ is the API-equivalent price Claude Code reports (total_cost_usd). On a subscription it shows the relative size of
// each run, not a bill. Interactive sessions (outside the bridge) aren't recorded.
import { appendFileSync, existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const EPISODES = join(ROOT, "episodes");

export type Tokens = { input: number; cache_write: number; cache_read: number; output: number };
export type ClaudeCost = { at: string; kind: "claude"; stage: string; item?: string; session?: string; resumed?: boolean; models?: string[]; turns?: number; seconds?: number; tokens: Tokens; usd?: number; exit?: number; backfill?: boolean };
export type VoiceCost = { at: string; kind: "elevenlabs"; stage: string; characters: number; credits: number; voice?: string; model?: string };
export type CostLine = ClaudeCost | VoiceCost;

export const folderOf = (nnn: string) => readdirSync(EPISODES).find((d) => d.startsWith(nnn) && existsSync(join(EPISODES, d, "episode.yaml")));
export const ledgerPath = (folder: string) => join(EPISODES, folder, "cost.jsonl");

export function appendCost(folder: string, line: CostLine) {
  appendFileSync(ledgerPath(folder), JSON.stringify(line) + "\n");
}

export function readCost(folder: string): CostLine[] {
  const p = ledgerPath(folder);
  if (!existsSync(p)) return [];
  return readFileSync(p, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as CostLine);
}

type Row = { runs: number; turns: number; tokens: Tokens; usd: number; usdKnown: boolean; credits: number };
const empty = (): Row => ({ runs: 0, turns: 0, tokens: { input: 0, cache_write: 0, cache_read: 0, output: 0 }, usd: 0, usdKnown: true, credits: 0 });
function add(r: Row, l: CostLine) {
  if (l.kind === "elevenlabs") {
    r.credits += l.credits;
    return;
  }
  r.runs++;
  r.turns += l.turns ?? 0;
  for (const k of Object.keys(r.tokens) as (keyof Tokens)[]) r.tokens[k] += l.tokens[k] ?? 0;
  if (l.usd === undefined) r.usdKnown = false;
  else r.usd += l.usd;
}

export function summarize(lines: CostLine[]) {
  const total = empty();
  const stages = new Map<string, Row>();
  for (const l of lines) {
    add(total, l);
    if (!stages.has(l.stage)) stages.set(l.stage, empty());
    add(stages.get(l.stage)!, l);
  }
  return { total, stages };
}

const tok = (t: Tokens) => t.input + t.cache_write + t.cache_read + t.output;
const m = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : String(n));
const usd = (r: Row) => (!r.runs ? "—" : !r.usdKnown && !r.usd ? "n/a" : `${r.usdKnown ? "" : "≥"}$${r.usd.toFixed(2)}`);

/** One line for Discord / upload notes: "1,108 credits · 9 Claude runs · 31.2M tokens · $14.20 API-equivalent". */
export function costLine(folder: string) {
  const { total } = summarize(readCost(folder));
  if (!total.runs && !total.credits) return "no cost recorded";
  return [
    `${total.credits.toLocaleString("en")} ElevenLabs credits`,
    `${total.runs} Claude runs`,
    `${m(tok(total.tokens))} tokens (${m(total.tokens.cache_read)} cached)`,
    `${usd(total)} API-equivalent`,
  ].join(" · ");
}

function table(rows: [string, Row][]) {
  const head = ["", "runs", "turns", "in", "cache write", "cache read", "out", "total tokens", "$ API-eq", "credits"];
  const body = rows.map(([name, r]) => [name, String(r.runs), String(r.turns), m(r.tokens.input), m(r.tokens.cache_write), m(r.tokens.cache_read), m(r.tokens.output), m(tok(r.tokens)), usd(r), r.credits ? r.credits.toLocaleString("en") : "—"]);
  const all = [head, ...body];
  const w = head.map((_, i) => Math.max(...all.map((r) => r[i].length)));
  return all.map((r, ri) => r.map((c, i) => (i === 0 ? c.padEnd(w[i]) : c.padStart(w[i]))).join("  ") + (ri === 0 ? "\n" + w.map((n) => "─".repeat(n)).join("  ") : "")).join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [nnn, flag] = process.argv.slice(2);
  if (nnn) {
    const folder = folderOf(nnn);
    if (!folder) throw new Error(`no episode folder starts with "${nnn}"`);
    const lines = readCost(folder);
    const { total, stages } = summarize(lines);
    if (flag === "--line") console.log(costLine(folder));
    else if (flag === "--json") console.log(JSON.stringify({ folder, total, stages: Object.fromEntries(stages) }, null, 2));
    else {
      console.log(`${folder} · build cost\n`);
      console.log(table([...stages.entries(), ["TOTAL", total]]));
      if (lines.some((l) => l.kind === "claude" && l.backfill)) console.log("\nRuns marked backfill were rebuilt from transcripts: tokens only, no $.");
      console.log("\n$ = API-equivalent price reported by Claude Code (relative size on a subscription, not a bill). Interactive sessions aren't included.");
    }
  } else {
    const rows: [string, Row][] = [];
    const grand = empty();
    for (const folder of readdirSync(EPISODES).filter((d) => existsSync(join(EPISODES, d, "episode.yaml"))).sort()) {
      const lines = readCost(folder);
      if (!lines.length) continue;
      const { total } = summarize(lines);
      rows.push([folder, total]);
      lines.forEach((l) => add(grand, l));
    }
    if (!rows.length) console.log("no cost recorded yet");
    else console.log(table([...rows, ["ALL EPISODES", grand]]));
  }
}
