// Saves a Notion row's Visual Reference images locally so /script can look at them.
// The queue gets short-lived signed URLs from the Notion connector (fetch the row → its
// notion-file-block:// references → get-file-download-urls) and passes them straight here.
//   npm run refs -- <Notion row ID> <url> [<url>…]   → bridge/files/notion-<ID>/01-<name>, 02-…
//   npm run refs -- <Notion row ID> --list            → what's already saved
// bridge/files/ is gitignored: references can be third-party images, so they never reach the repo.
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const MAX_BYTES = 20 * 1024 * 1024;
const OK_TYPES = /^(image\/(png|jpe?g|webp|gif)|application\/pdf)/;

const [id, ...rest] = process.argv.slice(2);
if (!id || !/^\d+$/.test(id)) throw new Error("usage: npm run refs -- <Notion row ID> <url> [<url>…] | --list");
const dir = join(ROOT, "bridge", "files", `notion-${id}`);
const rel = (f: string) => `bridge/files/notion-${id}/${f}`;

if (rest[0] === "--list" || rest.length === 0) {
  const files = existsSync(dir) ? readdirSync(dir).sort() : [];
  console.log(files.length ? files.map((f) => `${rel(f)} (${Math.round(statSync(join(dir, f)).size / 1024)} KB)`).join("\n") : `no references saved for Notion #${id}`);
  process.exit(0);
}

/** A readable file name from the signed URL's path (Notion keeps the original name there). */
function nameFrom(url: string, type: string, i: number) {
  const last = decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "");
  const clean = last.replace(/[^\w.\-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  const ext = type.includes("pdf") ? ".pdf" : `.${type.split("/")[1]?.replace("jpeg", "jpg") ?? "png"}`;
  const base = clean || `reference${ext}`;
  return `${String(i + 1).padStart(2, "0")}-${/\.\w{2,4}$/.test(base) ? base : base + ext}`;
}

mkdirSync(dir, { recursive: true });
let failed = 0;
for (const [i, url] of rest.entries()) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "bytesized-refs/1.0" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}${[400, 403].includes(res.status) ? " (a signed URL may have expired: get fresh ones and re-run)" : ""}`);
    const type = res.headers.get("content-type") ?? "";
    if (!OK_TYPES.test(type)) throw new Error(`not an image or PDF (${type || "no content-type"})`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_BYTES) throw new Error(`too big (${Math.round(buf.length / 1048576)} MB, max 20)`);
    const name = nameFrom(url, type, i);
    writeFileSync(join(dir, name), buf);
    console.log(`✔ ${rel(name)} (${Math.round(buf.length / 1024)} KB)`);
  } catch (e) {
    failed++;
    console.log(`✖ reference ${i + 1}: ${(e as Error).message}`);
  }
}
process.exit(failed ? 1 : 0);
