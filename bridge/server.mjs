// Bytesized bridge (runs in Docker next to the Discord gateway). No dependencies.
// It is only the mailbox and the clock: it checks the gateway's signed webhooks, saves each click to bridge/inbox/,
// and adds a "tick" every 6 hours. The host runner (bridge/runner.mjs) turns each inbox item into a Claude run.
import { createHmac, timingSafeEqual } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import http from "node:http";
import { join } from "node:path";

const SECRET = process.env.BYTESIZED_WEBHOOK_SECRET;
const TOKEN = process.env.BYTESIZED_API_TOKEN;
const GW = process.env.GATEWAY_URL ?? "http://gateway:8787";
const USER = process.env.DISCORD_USER_ID;
const TICK_HOURS = (process.env.TICK_HOURS ?? "0,6,12,18").split(",").map(Number);
const PORT = Number(process.env.PORT ?? 9100);
const DATA = process.env.DATA_DIR ?? "/data";
const INBOX = join(DATA, "inbox");
const FILES = join(DATA, "files");
const STATE = join(DATA, "state");
const STATE_FILE = join(STATE, "bridge.json");
if (!SECRET || !TOKEN) throw new Error("BYTESIZED_WEBHOOK_SECRET and BYTESIZED_API_TOKEN must be set (bridge/.env)");
for (const d of [INBOX, FILES, STATE]) mkdirSync(d, { recursive: true });

// ---------------------------------------------------------------- state (dedupe, cursor, last tick)
const state = existsSync(STATE_FILE) ? JSON.parse(readFileSync(STATE_FILE, "utf8")) : {};
state.events ??= [];
state.responses ??= [];
state.cursor ??= new Date().toISOString(); // first start: don't replay history
const save = () => {
  state.events = state.events.slice(-2000);
  state.responses = state.responses.slice(-2000);
  writeFileSync(STATE_FILE + ".tmp", JSON.stringify(state, null, 2));
  renameSync(STATE_FILE + ".tmp", STATE_FILE);
};
const log = (msg) => {
  const line = `${new Date().toISOString()} ${msg}`;
  console.log(line);
  appendFileSync(join(STATE, "bridge.log"), line + "\n");
};

// ---------------------------------------------------------------- gateway calls
const api = async (method, path, body) => {
  const res = await fetch(GW + path, { method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${(await res.text()).slice(0, 300)}`);
  return res.json();
};
const reply = (messageId, content) =>
  api("POST", "/v1/messages", { thread_of: messageId, content }).catch((e) => log(`reply failed: ${e.message}`));

// ---------------------------------------------------------------- inbox
const writeInbox = (kind, data, files = []) => {
  const name = `${Date.now()}-${kind}-${Math.random().toString(36).slice(2, 8)}.json`;
  const tmp = join(INBOX, `.${name}.tmp`);
  writeFileSync(tmp, JSON.stringify({ kind, received_at: new Date().toISOString(), data, files }, null, 2));
  renameSync(tmp, join(INBOX, name)); // dotfile first, so the runner never sees half a file
  log(`inbox ← ${name}`);
};

/** Saves form uploads (reference images) to bridge/files/<response_id>/ so Claude can look at them. */
async function downloadFiles(data) {
  const out = [];
  for (const value of Object.values(data.values ?? {})) {
    if (!Array.isArray(value)) continue;
    for (const f of value) {
      if (!f?.file_id) continue;
      const res = await fetch(`${GW}/v1/files/${f.file_id}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
      if (!res.ok) throw new Error(`file ${f.file_id} → ${res.status}`);
      const dir = join(FILES, data.response_id);
      mkdirSync(dir, { recursive: true });
      const name = `${f.file_id}-${String(f.name ?? "file").replace(/[^\w.-]/g, "_")}`;
      writeFileSync(join(dir, name), Buffer.from(await res.arrayBuffer()));
      out.push(`bridge/files/${data.response_id}/${name}`);
    }
  }
  return out;
}

const LABEL = { approve: "✅ Approve", changes: "✏️ Request changes", retry: "🔁 Retry", resolved: "✅ Fixed, continue", reply: "📝 Reply", start: "▶️ Start next idea" };

/** One response from Imad → an inbox item (or, for "wait", nothing to do until the next tick). */
async function handleResponse(data) {
  if (state.responses.includes(data.response_id)) return;
  if (USER && data.user?.id !== USER) {
    log(`ignored response ${data.response_id} from ${data.user?.id}`);
  } else if (data.action === "wait") {
    await reply(data.message_id, "⏸️ OK. The next scheduled run will pick it up.");
  } else {
    const files = await downloadFiles(data);
    writeInbox("response", data, files);
    await reply(data.message_id, `📥 Got it: **${LABEL[data.action] ?? data.action}**. Claude is on it.`);
  }
  state.responses.push(data.response_id);
  if (data.submitted_at && data.submitted_at > state.cursor) state.cursor = data.submitted_at;
  save();
}

// ---------------------------------------------------------------- webhook server
function verify(raw, header) {
  const parts = Object.fromEntries((header ?? "").split(",").map((p) => p.split("=", 2)));
  const t = Number(parts.t);
  if (!Number.isInteger(t) || !/^[0-9a-f]{64}$/.test(parts.v1 ?? "")) return false;
  if (Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = createHmac("sha256", SECRET).update(`${t}.${raw}`).digest();
  return timingSafeEqual(expected, Buffer.from(parts.v1, "hex"));
}

let chain = Promise.resolve(); // process events one at a time, in delivery order

http
  .createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") return res.writeHead(200).end("ok");
    if (req.method !== "POST" || req.url !== "/events") return res.writeHead(404).end();
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!verify(raw, req.headers["x-gateway-signature"])) {
        log("rejected: bad signature");
        return res.writeHead(401).end();
      }
      const event = JSON.parse(raw);
      chain = chain.then(async () => {
        if (state.events.includes(event.id)) return res.writeHead(204).end();
        try {
          if (event.type === "response.created" || event.type === "response.updated") await handleResponse(event.data);
          else log(`${event.type} ${event.data?.message_id ?? ""} ${event.data?.reason ?? ""}`.trim());
          state.events.push(event.id);
          save();
          res.writeHead(204).end();
        } catch (e) {
          log(`event ${event.id} failed: ${e.message}`);
          res.writeHead(503).end(); // the gateway retries, in order
        }
      });
    });
  })
  .listen(PORT, () => log(`bridge listening on :${PORT} · gateway ${GW} · ticks at ${TICK_HOURS.join(",")}h ${process.env.TZ ?? "UTC"}`));

// ---------------------------------------------------------------- catch up on anything missed while down
async function reconcile() {
  try {
    let since = state.cursor;
    for (let page = 0; page < 20; page++) {
      const r = await api("GET", `/v1/responses?since=${encodeURIComponent(since)}&limit=100`);
      for (const resp of r.responses ?? []) await (chain = chain.then(() => handleResponse({ ...resp, response_id: resp.response_id ?? resp.id })));
      if (!r.next_since || r.next_since === since || !(r.responses ?? []).length) break;
      since = r.next_since;
    }
  } catch (e) {
    log(`reconcile failed: ${e.message}`);
  }
}
setTimeout(reconcile, 5000);
setInterval(reconcile, 60 * 60 * 1000);

// ---------------------------------------------------------------- the 6-hour tick (replaces the desktop scheduled task)
setInterval(() => {
  const now = new Date();
  const key = `${now.toDateString()} ${now.getHours()}`;
  if (!TICK_HOURS.includes(now.getHours()) || state.lastTick === key) return;
  state.lastTick = key;
  save();
  if (readdirSync(INBOX).some((f) => f.includes("-tick-"))) return log("tick skipped: one already waiting");
  writeInbox("tick", { at: now.toISOString() });
}, 30 * 1000);
