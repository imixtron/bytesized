// Registers (or updates) the `bytesized` integration on the Discord gateway and writes its secrets to bridge/.env.
//   node bridge/register.mjs            validate → register, or update the manifest if already registered
//   node bridge/register.mjs --rotate   also issue a new api_token + webhook_secret
// Reads MARIO_ADMIN_TOKEN from engine/.env (or the shell environment). Never prints a secret.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const GW = process.env.GATEWAY_URL_HOST ?? "http://localhost:8787";

const readEnv = (p) =>
  existsSync(p)
    ? Object.fromEntries(
        readFileSync(p, "utf8")
          .split(/\r?\n/)
          .map((l) => l.match(/^\s*(?:export\s+)?([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/))
          .filter(Boolean)
          .map((m) => [m[1], m[2].replace(/^(["'])(.*)\1$/, "$2")]),
      )
    : {};
const engineEnv = readEnv(join(ROOT, "engine/.env"));
const ADMIN = engineEnv.MARIO_ADMIN_TOKEN ?? process.env.MARIO_ADMIN_TOKEN;
if (!ADMIN) throw new Error(`MARIO_ADMIN_TOKEN is not set in engine/.env (keys found: ${Object.keys(engineEnv).join(", ") || "none"})`);

const manifest = JSON.parse(readFileSync(join(HERE, "manifest.json"), "utf8"));
const call = async (method, path, body) => {
  const res = await fetch(GW + path, { method, headers: { Authorization: `Bearer ${ADMIN}`, "Content-Type": "application/json" }, body: body && JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
};
const fail = (what, r) => {
  console.error(`✖ ${what}: ${r.status} ${JSON.stringify(r.json.error ?? r.json).slice(0, 1500)}`);
  process.exit(1);
};

const v = await call("POST", "/v1/integrations/validate", manifest);
if (v.status >= 300) fail("manifest invalid", v);
for (const w of v.json.warnings ?? []) console.log(`⚠ ${typeof w === "string" ? w : JSON.stringify(w)}`);
console.log("✔ manifest valid");

const envPath = join(HERE, ".env");
const env = readEnv(envPath);
let secrets = null;

const reg = await call("POST", "/v1/integrations", manifest);
if (reg.status < 300) {
  secrets = reg.json;
  console.log("✔ registered bytesized");
} else if (reg.json.error?.code === "already_exists") {
  const put = await call("PUT", `/v1/integrations/${manifest.id}`, manifest);
  if (put.status >= 300) fail("update", put);
  console.log("✔ manifest updated (already registered)");
  if (process.argv.includes("--rotate") || !env.BYTESIZED_API_TOKEN || !env.BYTESIZED_WEBHOOK_SECRET) {
    const rot = await call("POST", `/v1/integrations/${manifest.id}/rotate`, {});
    if (rot.status >= 300) fail("rotate", rot);
    secrets = rot.json;
    console.log("✔ rotated api_token + webhook_secret");
  }
} else fail("register", reg);

const find = (obj, key) => {
  if (!obj || typeof obj !== "object") return undefined;
  if (typeof obj[key] === "string") return obj[key];
  for (const v of Object.values(obj)) {
    const hit = find(v, key);
    if (hit) return hit;
  }
};
if (secrets) {
  const token = find(secrets, "api_token");
  const secret = find(secrets, "webhook_secret");
  if (!token || !secret) fail("no api_token/webhook_secret in the response", { status: 0, json: Object.keys(secrets) });
  env.BYTESIZED_API_TOKEN = token;
  env.BYTESIZED_WEBHOOK_SECRET = secret;
}
env.DISCORD_CHANNEL_ID = manifest.channel_id;
env.DISCORD_USER_ID = manifest.defaults.responses.allowed.users[0];
env.GATEWAY_URL_HOST ??= "http://localhost:8787";
env.TZ ??= Intl.DateTimeFormat().resolvedOptions().timeZone;
env.TICK_HOURS ??= "0,6,12,18";

writeFileSync(
  envPath,
  "# Bytesized ↔ Discord gateway (written by bridge/register.mjs). Secrets: never commit, never print.\n" +
    Object.entries(env).map(([k, val]) => `${k}=${val}`).join("\n") +
    "\n",
  { mode: 0o600 },
);
console.log(`✔ bridge/.env written (${Object.keys(env).join(", ")})`);
