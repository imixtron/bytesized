// Storyboard for review (Phase 5.1 / /video step): one still per beat, plus the sting,
// laid out per scene with the voiceover line and the beat that fires.
//   npm run storyboard -- 001
// Output: episodes/<nnn-slug>/storyboard/storyboard.html (self-contained) + frames/*.jpg
//         + sections/<nn>-<scene>.jpg (one image per section, readable on a phone; sent to Discord)
//         + contact-<nn>.jpg (12 small stills per image, for Claude's self-check; scripts/contact.ts)
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEpisode } from "../src/episode/parse";
import { buildTimeline, type TimedBeat } from "../src/timing/timeline";
import { measuredFrom, type VoiceManifest } from "../src/voice/manifest";
import { tokens } from "../src/theme/tokens";
import type { StoryboardSheetProps } from "../src/compositions/StoryboardSheet";
import { contactSheets } from "./contact";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const FPS = tokens.canvas.fps;
const SETTLE = 8; // frames after a beat, so its motion is visible in the still

const prefix = process.argv[2];
if (!prefix) throw new Error("usage: npm run storyboard -- <episode number>");
const folder = readdirSync(join(ROOT, "episodes")).find((d) => d.startsWith(prefix) && existsSync(join(ROOT, "episodes", d, "episode.yaml")));
if (!folder) throw new Error(`no episode folder starts with "${prefix}"`);
const epDir = join(ROOT, "episodes", folder);
const ep = parseEpisode(readFileSync(join(epDir, "episode.yaml"), "utf8"));

let measured;
const vpath = join(epDir, "audio/voice.json");
if (existsSync(vpath)) {
  const m = measuredFrom(ep, JSON.parse(readFileSync(vpath, "utf8")) as VoiceManifest);
  if ("stale" in m) throw new Error(`voiceover out of date (${m.stale.join(", ")}): run npm run voice -- ${prefix}`);
  measured = m.measured;
}
const tl = buildTimeline(ep, measured);

type Shot = { frame: number; scene: string; label: string; beat?: TimedBeat };
const shots: Shot[] = [];
for (const ts of tl.scenes) {
  const end = ts.start + ts.duration - 1;
  if (!ts.beats.length) shots.push({ frame: Math.min(end, ts.start + 20), scene: ts.scene.id, label: "scene" });
  const seen = new Set<number>();
  for (const b of ts.beats) {
    const frame = Math.min(end, b.frame + SETTLE);
    if (seen.has(frame)) continue; // two beats on one word → one still
    seen.add(frame);
    const same = ts.beats.filter((x) => x.frame === b.frame);
    shots.push({ frame, scene: ts.scene.id, label: same.map((x) => `${x.do} ${x.targets.join(", ")}`).join(" + "), beat: b });
  }
  if (ts.scene.part === "hook") shots.push({ frame: tl.sting.start + 24, scene: "sting", label: "branding sting (hold)" });
}

console.log(`bundling… (${shots.length} stills)`);
const serveUrl = await bundle({ entryPoint: join(ENGINE, "src/index.ts"), publicDir: join(ENGINE, "public") });
const id = `ep-${folder.split("-")[0]}`;
const composition = await selectComposition({ serveUrl, id, inputProps: { folder, loaded: null } });

const outDir = join(epDir, "storyboard");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(join(outDir, "frames"), { recursive: true });
for (const [i, s] of shots.entries()) {
  const file = join(outDir, "frames", `${String(i).padStart(2, "0")}-f${s.frame}.jpg`);
  await renderStill({ composition, serveUrl, output: file, frame: s.frame, imageFormat: "jpeg", jpegQuality: 82, scale: 0.4 });
  process.stdout.write(`\r  ${i + 1}/${shots.length}`);
}
console.log();

// ---------------------------------------------------------------- self-contained HTML
const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
const img = (i: number, s: Shot) =>
  "data:image/jpeg;base64," + readFileSync(join(outDir, "frames", `${String(i).padStart(2, "0")}-f${s.frame}.jpg`)).toString("base64");
const secs = (f: number) => (f / FPS).toFixed(1) + "s";

const groups = [...tl.scenes.flatMap((ts) => (ts.scene.part === "hook" ? [ts.scene.id, "sting"] : [ts.scene.id]))];
const sections = groups
  .map((sid) => {
    const ts = tl.scenes.find((t) => t.scene.id === sid);
    const items = shots.map((s, i) => ({ s, i })).filter(({ s }) => s.scene === sid);
    const head = ts
      ? `<h2><span>${esc(ts.scene.part)}</span> ${esc(ts.scene.id)} <small>${esc(ts.scene.template)} · ${secs(ts.start)}–${secs(ts.start + ts.duration)}</small></h2>
         ${ts.scene.headline ? `<p class="hl">Headline: <b>${esc(ts.scene.headline.text)}</b></p>` : `<p class="hl">No headline</p>`}
         <p class="vo">“${esc(ts.scene.vo)}”</p>`
      : `<h2><span>branding</span> sting <small>${secs(tl.sting.start)}–${secs(tl.sting.start + tl.sting.duration)}</small></h2><p class="vo">Bite wipe → logos → cut. No voiceover, just the chomp.</p>`;
    const cards = items
      .map(({ s, i }) => `<figure><img src="${img(i, s)}" alt=""><figcaption><b>${secs(s.frame)}</b>${s.beat ? ` · on “${esc(s.beat.on)}”` : ""}<br>${esc(s.label)}</figcaption></figure>`)
      .join("");
    return `<section>${head}<div class="grid">${cards}</div></section>`;
  })
  .join("");

const total = tl.totalFrames / FPS;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Storyboard ${esc(folder)}</title>
<style>
:root{--bg:#FBF8F1;--ink:#1A1A1A;--muted:#6B665C;--rule:#E2DCCD;--orange:#C84A27}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#1A1918;--ink:#F4F0E6;--muted:#B9B3A6;--rule:#3A3835}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,sans-serif}
main{max-width:1200px;margin:0 auto;padding:32px 16px 80px}h1{margin:0 0 4px;font-size:28px}.meta{color:var(--muted);margin:0 0 28px}
section{border-top:1px solid var(--rule);padding:22px 0}h2{margin:0 0 6px;font-size:19px}h2 span{display:inline-block;background:var(--orange);color:#F4F0E6;border-radius:6px;padding:1px 8px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;vertical-align:2px;margin-right:6px}
h2 small{color:var(--muted);font-weight:400;font-size:13px;margin-left:6px}.hl{margin:0;color:var(--muted);font-size:13px}.vo{margin:6px 0 14px;font-style:italic;max-width:760px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px}figure{margin:0}figure img{width:100%;border-radius:10px;display:block;aspect-ratio:9/16;object-fit:cover;background:#222}
figcaption{font-size:12px;color:var(--muted);margin-top:6px;line-height:1.35}figcaption b{color:var(--ink)}
</style></head><body><main>
<h1>${esc(ep.title)}: storyboard</h1>
<p class="meta">Episode ${ep.id} · voice ${esc(ep.voice.name ?? "?")} · ${ep.scenes.length} scenes · ${total.toFixed(1)}s (${tl.source} timing) · one still per beat, ${SETTLE} frames after it fires</p>
${sections}
</main></body></html>`;
writeFileSync(join(outDir, "storyboard.html"), html);
console.log(`✔ episodes/${folder}/storyboard/storyboard.html (${shots.length} stills)`);

// ---------------------------------------------------------------- one phone-readable image per section (Discord review)
mkdirSync(join(outDir, "sections"), { recursive: true });
for (const [n, sid] of groups.entries()) {
  const ts = tl.scenes.find((t) => t.scene.id === sid);
  const props: StoryboardSheetProps = {
    index: n + 1,
    part: ts ? ts.scene.part : "branding",
    sceneId: sid,
    template: ts?.scene.template,
    range: ts ? `${secs(ts.start)}–${secs(ts.start + ts.duration)}` : `${secs(tl.sting.start)}–${secs(tl.sting.start + tl.sting.duration)}`,
    headline: ts?.scene.headline?.text,
    vo: ts ? ts.scene.vo : "Bite wipe → logos → cut. No voiceover, just the chomp.",
    shots: shots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => s.scene === sid)
      .sort((a, b) => a.s.frame - b.s.frame)
      .map(({ s, i }) => ({ src: img(i, s), time: secs(s.frame), on: s.beat?.on, label: s.label })),
  };
  const sheet = await selectComposition({ serveUrl, id: "storyboard-sheet", inputProps: props });
  const file = join(outDir, "sections", `${String(n + 1).padStart(2, "0")}-${sid}.jpg`);
  await renderStill({ composition: sheet, serveUrl, output: file, inputProps: props, imageFormat: "jpeg", jpegQuality: 85 });
}
console.log(`✔ episodes/${folder}/storyboard/sections/ (${groups.length} section images)`);
const sheets = await contactSheets(epDir, serveUrl);
console.log(`✔ episodes/${folder}/storyboard/contact-*.jpg (${sheets} contact sheets for the self-check)`);
