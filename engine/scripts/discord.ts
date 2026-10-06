// Posts the pipeline to Discord through the gateway bot (bridge/README.md). Claude calls this at every stage.
//   npm run discord -- check                         token + gateway OK?
//   npm run discord -- status "<text>"               channel line, no ping (queue ticks)
//   npm run discord -- alert "<text>"                channel line, pings Imad (runner errors)
//   npm run discord -- note <nnn> "<text>"           line in the episode's thread, no ping
//   npm run discord -- gate <nnn> <script|parts|storyboard|draft> [--note "<text>"] [--files a,b]
//                                                    review message + Approve / Request changes, pings Imad
//   npm run discord -- blocked <nnn> "<reason>"      Retry / Fixed / Reply, pings Imad
//   npm run discord -- failed <nnn> "<error>"        same, for errors
//   npm run discord -- rendered <nnn>                final MP4 + upload.md, then "Start next idea now?"
//   npm run discord -- runfailed <item.json> "<text>" [--episode <nnn>]
//                                                    a Claude run failed: Retry run / Leave it, pings Imad (the runner calls this)
//   npm run discord -- next                          (re)ask "Start next idea now?" in the channel
//   npm run discord -- close <nnn|next>              close the open form (decided elsewhere, or superseded)
//   npm run discord -- state [nnn]                   print what's open (the gate a click must match)
// Secrets come from bridge/.env (written by bridge/register.mjs); this script never prints them.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEpisode } from "../src/episode/parse";
import { buildTimeline } from "../src/timing/timeline";
import { measuredFrom, type VoiceManifest } from "../src/voice/manifest";
import { tokens } from "../src/theme/tokens";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const STATE_FILE = join(ROOT, "bridge/state/discord.json");
const FPS = tokens.canvas.fps;
const GATES = ["script", "parts", "storyboard", "draft"] as const;
type Gate = (typeof GATES)[number] | "blocked";
const GATE_NAME: Record<Gate, string> = { script: "Script Review", parts: "Parts Review", storyboard: "Storyboard Review", draft: "Draft Review", blocked: "Blocked" };
const COLOR = { orange: tokens.color.orange, ember: tokens.color.ember, muted: tokens.color.cream3, ok: tokens.color.ok, down: tokens.color.down };

// ---------------------------------------------------------------- config + state
const env: Record<string, string> = {};
const envPath = join(ROOT, "bridge/.env");
if (existsSync(envPath))
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
const GW = env.GATEWAY_URL_HOST ?? "http://localhost:8787";
const TOKEN = env.BYTESIZED_API_TOKEN;
const USER = env.DISCORD_USER_ID;
const TICK_HOURS = (env.TICK_HOURS ?? "0,6,12,18").split(",").map(Number);

type OpenForm = { kind: Gate | "next"; round: number; message_id: string; correlation_id: string; posted_at: string };
// session: the Claude Code session that last worked on the episode (the runner resumes it on the next click).
type EpisodeState = { title: string; root?: string; rounds: Partial<Record<Gate, number>>; open?: OpenForm | null; session?: string | null };
type State = { episodes: Record<string, EpisodeState>; next?: OpenForm | null };
const loadState = (): State => (existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : { episodes: {} });
const saveState = (s: State) => {
  mkdirSync(dirname(STATE_FILE), { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(s, null, 2) + "\n");
};

// ---------------------------------------------------------------- gateway calls
async function api(method: string, path: string, body?: unknown): Promise<any> {
  if (!TOKEN) throw new Error("bridge/.env has no BYTESIZED_API_TOKEN: run `node bridge/register.mjs` first");
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(GW + path, {
      method,
      headers: { Authorization: `Bearer ${TOKEN}`, ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }) },
      body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    }).catch((e) => ({ ok: false, status: 0, text: async () => String(e) }) as Response);
    if (res.ok) return res.status === 204 ? null : res.json();
    const text = await res.text();
    if (attempt < 3 && (res.status === 0 || res.status === 409 || res.status >= 500)) {
      await new Promise((r) => setTimeout(r, 2000 * attempt));
      continue;
    }
    throw new Error(`${method} ${path} → ${res.status} ${text.slice(0, 500)}`);
  }
}

let maxUpload = 10 * 1024 * 1024;
async function upload(path: string): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([readFileSync(path)]), basename(path));
  return (await api("POST", "/v1/files", form)).file_id;
}

type Send = { content?: string; embeds?: unknown[]; files?: string[]; form?: unknown; thread_of?: string; thread?: unknown; ping?: boolean; correlation_id?: string; metadata?: unknown };
async function send(m: Send) {
  const attachments = [];
  for (const f of m.files ?? []) attachments.push({ file_id: await upload(f) });
  const content = m.ping && USER ? `<@${USER}> ${m.content ?? ""}`.trim() : m.content;
  const body = {
    ...(content ? { content } : {}),
    ...(m.embeds?.length ? { embeds: m.embeds } : {}),
    ...(attachments.length ? { attachments } : {}),
    ...(m.form ? { form: m.form } : {}),
    ...(m.thread_of ? { thread_of: m.thread_of } : {}),
    ...(m.thread ? { thread: m.thread } : {}),
    ...(m.ping && USER ? { mentions: { users: [USER] } } : {}),
    ...(m.correlation_id ? { correlation_id: m.correlation_id } : {}),
    ...(m.metadata ? { metadata: m.metadata } : {}),
    idempotency_key: `${m.correlation_id ?? "msg"}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
  };
  const msg = await api("POST", "/v1/messages?wait=true", body);
  if (msg.status === "failed" || msg.status === "dead") throw new Error(`message ${msg.id} ${msg.status}: ${msg.last_error ?? ""}`);
  return msg as { id: string; short_id: string; thread_id?: string };
}

// ---------------------------------------------------------------- episodes
function episode(nnn: string) {
  const folder = readdirSync(join(ROOT, "episodes")).find((d) => d.startsWith(nnn) && existsSync(join(ROOT, "episodes", d, "episode.yaml")));
  if (!folder) throw new Error(`no episode folder starts with "${nnn}"`);
  const dir = join(ROOT, "episodes", folder);
  const ep = parseEpisode(readFileSync(join(dir, "episode.yaml"), "utf8"));
  let measured;
  const vpath = join(dir, "audio/voice.json");
  if (existsSync(vpath)) {
    const m = measuredFrom(ep, JSON.parse(readFileSync(vpath, "utf8")) as VoiceManifest);
    if (!("stale" in m)) measured = m.measured;
  }
  const key = folder.split("-")[0];
  return { key, folder, dir, ep, tl: buildTimeline(ep, measured), label: `${key} · ${ep.title}` };
}
type Ep = ReturnType<typeof episode>;

async function root(state: State, e: Ep): Promise<string> {
  const es = (state.episodes[e.key] ??= { title: e.ep.title, rounds: {} });
  // The runner passes its session id; the episode's next Discord click resumes this session instead of starting cold.
  if (process.env.BYTESIZED_SESSION_ID && es.session !== process.env.BYTESIZED_SESSION_ID) {
    es.session = process.env.BYTESIZED_SESSION_ID;
    saveState(state);
  }
  if (es.root) return es.root;
  const msg = await send({
    content: `🎬 **${e.label}**\nEverything for this episode (reviews, progress, final render) happens in this thread.`,
    thread: { create: true, title: e.label.slice(0, 80), auto_archive: "1w" },
    correlation_id: `${e.key}:root`,
    metadata: { episode: e.key, kind: "root" },
  });
  es.root = msg.id;
  saveState(state);
  return msg.id;
}

async function closeForm(f: OpenForm | null | undefined) {
  if (!f) return;
  await api("PATCH", `/v1/messages/${f.message_id}`, { form: { state: "closed" } }).catch((e) => console.log(`  (could not close ${f.message_id}: ${(e as Error).message})`));
}

const secs = (frames: number) => `${(frames / FPS).toFixed(1)}s`;
const sizeOk = (p: string) => statSync(p).size <= maxUpload - 64 * 1024;

/** A copy that fits the upload limit (720p, higher compression), made with Remotion's bundled ffmpeg. */
function fitVideo(p: string): string {
  if (sizeOk(p)) return p;
  const preview = p.replace(/\.mp4$/, "-preview.mp4");
  for (const crf of [28, 32, 36]) {
    execFileSync("npx", ["remotion", "ffmpeg", "-y", "-loglevel", "error", "-i", p, "-vf", "scale=720:-2", "-c:v", "libx264", "-crf", String(crf), "-preset", "slow", "-c:a", "aac", "-b:a", "96k", preview], { cwd: ENGINE, stdio: "inherit" });
    if (sizeOk(preview)) return preview;
  }
  throw new Error(`${basename(p)} is over ${maxUpload} bytes even as a 720p preview`);
}

/** Script Review card: one embed for the episode, one per section, readable on a phone. */
function scriptEmbeds(e: Ep) {
  const words = e.ep.scenes.reduce((n, s) => n + s.vo.split(/\s+/).length, 0);
  const head = {
    title: e.label,
    description: e.ep.topic,
    color: COLOR.orange,
    fields: [
      { name: "Voice", value: e.ep.voice.name ?? "?", inline: true },
      { name: "Music", value: e.ep.music.track ?? "theme", inline: true },
      { name: "Length", value: `${secs(e.tl.totalFrames)} ${e.tl.source === "measured" ? "measured" : "est."} · target ${e.ep.target_sec}s`, inline: true },
      { name: "Words", value: String(words), inline: true },
      { name: "Sections", value: String(e.ep.scenes.length), inline: true },
      ...(e.ep.brands.length ? [{ name: "Brands", value: e.ep.brands.join(", "), inline: true }] : []),
    ],
  };
  const scenes = e.tl.scenes.map((ts, i) => ({
    title: `${i + 1}. ${ts.scene.part.toUpperCase()} · ${ts.scene.id}`,
    color: ts.scene.part === "hook" || ts.scene.part === "gist" ? COLOR.ember : COLOR.muted,
    description: [
      `🎙️ “${ts.scene.vo}”`,
      ts.scene.headline ? `**On screen:** ${ts.scene.headline.text}` : null,
      `_${ts.scene.template} · ${secs(ts.duration)}_`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  }));
  return [head, ...scenes];
}

/** Discord takes at most 10 embeds or files per message (and ~6000 embed characters); longer reviews go out in several messages. */
function batches<T>(items: T[], max = 10, budget = Infinity, size: (t: T) => number = () => 0): T[][] {
  const out: T[][] = [[]];
  let used = 0;
  for (const it of items) {
    const n = size(it);
    if (out.at(-1)!.length >= max || (out.at(-1)!.length && used + n > budget)) out.push([]), (used = 0);
    out.at(-1)!.push(it);
    used += n;
  }
  return out;
}

async function gate(nnn: string, g: Gate, opts: { note?: string; files?: string[]; reason?: string; failed?: boolean }) {
  const state = loadState();
  const e = episode(nnn);
  const rootId = await root(state, e);
  const es = state.episodes[e.key];
  await closeForm(es.open);
  const round = (es.rounds[g] ?? 0) + 1;
  const correlation_id = `${e.key}:${g}:r${round}`;
  const extra = opts.note ? `\n${opts.note}` : "";
  const roundTag = round > 1 ? ` (round ${round})` : "";
  let m: Send;
  // Earlier batches of a long review go first, so the Approve / Request changes buttons sit under the last one.
  let lead: Send[] = [];
  const split = (head: string, parts: Send[]) => {
    lead = parts.slice(0, -1).map((p, i) => ({ ...p, content: i === 0 ? head : undefined }));
    return { ...parts.at(-1)!, content: parts.length > 1 ? `${head.split(" · ")[0]} · ${e.label} · continued, review the messages above too` : head };
  };

  if (g === "script") {
    const parts = batches(scriptEmbeds(e), 10, 5500, (x) => JSON.stringify(x).length).map((embeds): Send => ({ embeds }));
    m = split(`📝 **${GATE_NAME[g]}${roundTag}** · ${e.label}${extra}`, parts);
    m.files = [join(e.dir, "episode.yaml")];
  } else if (g === "storyboard") {
    const sdir = join(e.dir, "storyboard/sections");
    if (!existsSync(sdir)) throw new Error(`no ${sdir}: run npm run storyboard -- ${e.key}`);
    const files = readdirSync(sdir).filter((f) => f.endsWith(".jpg")).sort().map((f) => join(sdir, f));
    m = split(`🎞️ **${GATE_NAME[g]}${roundTag}** · ${e.label} · ${files.length} sections · ${secs(e.tl.totalFrames)}${extra}`, batches(files).map((f): Send => ({ files: f })));
  } else if (g === "draft") {
    const draft = join(e.dir, "out", `${e.ep.slug}-draft.mp4`);
    if (!existsSync(draft)) throw new Error(`no draft at ${draft}`);
    const f = fitVideo(draft);
    m = {
      content: `🎬 **${GATE_NAME[g]}${roundTag}** · ${e.label} · ${secs(e.tl.totalFrames)}${f !== draft ? " · (720p preview: full file is over the upload limit)" : ""}\nApprove → final render, upload.md and commit.${extra}`,
      files: [f],
    };
  } else if (g === "parts") {
    m = { content: `🧩 **${GATE_NAME[g]}${roundTag}** · ${e.label}${extra}`, files: (opts.files ?? []).map((f) => join(ROOT, f)) };
  } else {
    m = {
      content: `${opts.failed ? "🛑 **Failed**" : "⛔ **Blocked**"} · ${e.label}\n${opts.reason ?? ""}\n-# Retry = try the same step again · Fixed = I've done the fix, continue · Reply = tell Claude something`,
      embeds: [],
    };
  }

  for (const l of lead) await send({ ...l, thread_of: rootId, metadata: { episode: e.key, gate: g, round, kind: "review-part" } });
  const msg = await send({
    ...m,
    thread_of: rootId,
    ping: true,
    form: { template: g === "blocked" ? "blocked" : "review" },
    correlation_id,
    metadata: { episode: e.key, gate: g, round },
  });
  // Big storyboards: the full HTML (desktop) goes in a follow-up so the section images keep the 10-file slot.
  if (g === "storyboard" && existsSync(join(e.dir, "storyboard/storyboard.html")))
    await send({ content: "-# Full storyboard for desktop (open in a browser)", files: [join(e.dir, "storyboard/storyboard.html")], thread_of: rootId });

  es.rounds[g] = round;
  es.open = { kind: g, round, message_id: msg.id, correlation_id, posted_at: new Date().toISOString() };
  saveState(state);
  console.log(`✔ ${GATE_NAME[g]} posted · ${correlation_id} · ${msg.id}`);
}

/** Minutes until just before the next scheduled tick, so an unanswered "next idea?" expires as the tick takes over. */
function minutesToNextTick() {
  const now = new Date();
  for (let add = 0; add < 48; add++) {
    const t = new Date(now);
    t.setMinutes(0, 0, 0);
    t.setHours(now.getHours() + add);
    if (t > now && TICK_HOURS.includes(t.getHours())) return Math.max(1, Math.floor((t.getTime() - now.getTime()) / 60000) - 2);
  }
  return 360;
}

async function askNext(state: State, afterEpisode?: string) {
  await closeForm(state.next);
  const mins = minutesToNextTick();
  const correlation_id = `next:${Date.now()}`;
  const msg = await send({
    content: `▶️ **Start the next Idea now?**${afterEpisode ? ` (${afterEpisode} is done)` : ""}\n-# No, or no answer: the next scheduled run picks it up (in ~${Math.round(mins / 60)}h).`,
    ping: true,
    form: { template: "next-idea", responses: { mode: "single", expires_in: `${mins}m`, allowed: { users: USER ? [USER] : [] }, on_close: "disable" } },
    correlation_id,
    metadata: { kind: "next" },
  });
  state.next = { kind: "next", round: 1, message_id: msg.id, correlation_id, posted_at: new Date().toISOString() };
  saveState(state);
  console.log(`✔ asked "start next idea?" · ${msg.id} · expires in ${mins}m`);
}

// ---------------------------------------------------------------- CLI
const [cmd, ...args] = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

try {
  const meta = await fetch(GW + "/v1/meta").then((r) => r.json()).catch(() => null);
  if (meta?.limits?.max_upload_bytes) maxUpload = meta.limits.max_upload_bytes;
  const state = loadState();

  switch (cmd) {
    case "check": {
      const me = await api("GET", "/v1/me");
      console.log(`✔ gateway ${GW} · integration ${me.id ?? me.integration?.id ?? "?"} · contract ${meta?.contract_version ?? "?"}`);
      break;
    }
    case "status":
    case "alert":
      await send({ content: args[0], ping: cmd === "alert", correlation_id: `${cmd}:${Date.now()}` });
      console.log(`✔ ${cmd} posted`);
      break;
    case "note": {
      const e = episode(args[0]);
      await send({ content: args[1], thread_of: await root(state, e), correlation_id: `${e.key}:note` });
      console.log("✔ note posted");
      break;
    }
    case "gate": {
      const g = args[1] as Gate;
      if (!GATES.includes(g as never)) throw new Error(`gate must be one of ${GATES.join(", ")}`);
      await gate(args[0], g, { note: flag("note"), files: flag("files")?.split(",") });
      break;
    }
    case "blocked":
    case "failed":
      await gate(args[0], "blocked", { reason: args[1], failed: cmd === "failed" });
      break;
    case "rendered": {
      const e = episode(args[0]);
      const rootId = await root(state, e);
      await closeForm(state.episodes[e.key].open);
      const final = join(e.dir, "out", `${e.ep.slug}.mp4`);
      if (!existsSync(final)) throw new Error(`no final render at ${final}`);
      const f = fitVideo(final);
      const up = join(e.dir, "out/upload.md");
      await send({
        content: `✅ **Rendered** · ${e.label} · ${secs(e.tl.totalFrames)}${f !== final ? " · (720p preview: full file is in episodes/" + e.folder + "/out/)" : ""}\nReady to publish. Set Notion → **Published** after posting.`,
        files: [f],
        thread_of: rootId,
        ping: true,
        correlation_id: `${e.key}:rendered`,
      });
      if (existsSync(up)) await send({ content: readFileSync(up, "utf8").slice(0, 3900), thread_of: rootId, correlation_id: `${e.key}:upload` });
      state.episodes[e.key].open = null;
      state.episodes[e.key].session = null; // done: nothing will resume it
      saveState(state);
      await askNext(state, e.label);
      break;
    }
    case "runfailed": {
      const nnn = flag("episode");
      const es = nnn ? state.episodes[nnn] : undefined;
      await send({
        content: args[1],
        ...(es?.root ? { thread_of: es.root } : {}),
        ping: true,
        form: { template: "run-failed" },
        correlation_id: `run:${args[0]}`,
        metadata: { kind: "run-failed", item: args[0], ...(nnn ? { episode: nnn } : {}) },
      });
      console.log(`✔ run failure posted · run:${args[0]}`);
      break;
    }
    case "next":
      await askNext(state);
      break;
    case "close": {
      if (args[0] === "next") {
        await closeForm(state.next);
        state.next = null;
      } else {
        const es = state.episodes[episode(args[0]).key];
        await closeForm(es?.open);
        if (es) es.open = null;
      }
      saveState(state);
      console.log("✔ closed");
      break;
    }
    case "state":
      console.log(JSON.stringify(args[0] ? state.episodes[episode(args[0]).key] ?? null : state, null, 2));
      break;
    default:
      console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").slice(0, 16).join("\n"));
      process.exit(cmd ? 1 : 0);
  }
} catch (err) {
  console.error(`✖ ${(err as Error).message}`);
  process.exit(1);
}
