// Contact sheets for Claude's own storyboard self-check: the storyboard stills, 12 to an image and drawn small,
// so the check costs ~60% fewer image tokens than looking at every section image (images are most of a run's context).
//   npm run contact -- 002
// Reads:  episodes/<nnn-slug>/storyboard/frames/*.jpg (written by npm run storyboard, which also calls this)
// Output: episodes/<nnn-slug>/storyboard/contact-<nn>.jpg, each still tagged "<n> <scene> <time>"
// The Discord section images and storyboard.html are unchanged: this is only for the self-check.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEpisode } from "../src/episode/parse";
import { buildTimeline } from "../src/timing/timeline";
import { measuredFrom, type VoiceManifest } from "../src/voice/manifest";
import { tokens } from "../src/theme/tokens";
import { CONTACT_COLS, CONTACT_ROWS, type ContactSheetProps } from "../src/compositions/ContactSheet";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(ENGINE, "..");
const FPS = tokens.canvas.fps;

export async function contactSheets(epDir: string, serveUrl: string) {
  const sbDir = join(epDir, "storyboard");
  const framesDir = join(sbDir, "frames");
  if (!existsSync(framesDir)) throw new Error(`no ${framesDir}: run npm run storyboard first`);
  const frames = readdirSync(framesDir).filter((f) => /^\d+-f\d+\.jpg$/.test(f)).sort();

  const ep = parseEpisode(readFileSync(join(epDir, "episode.yaml"), "utf8"));
  let measured;
  const vpath = join(epDir, "audio/voice.json");
  if (existsSync(vpath)) {
    const m = measuredFrom(ep, JSON.parse(readFileSync(vpath, "utf8")) as VoiceManifest);
    if (!("stale" in m)) measured = m.measured;
  }
  const tl = buildTimeline(ep, measured);
  const where = (frame: number) => {
    if (frame >= tl.sting.start && frame < tl.sting.start + tl.sting.duration) return "sting";
    return tl.scenes.find((ts) => frame >= ts.start && frame < ts.start + ts.duration)?.scene.id ?? "?";
  };

  for (const f of readdirSync(sbDir).filter((f) => /^contact-\d+\.jpg$/.test(f))) rmSync(join(sbDir, f));
  const per = CONTACT_COLS * CONTACT_ROWS;
  const stills = frames.map((f, i) => {
    const frame = Number(f.match(/-f(\d+)\.jpg$/)![1]);
    return { src: "data:image/jpeg;base64," + readFileSync(join(framesDir, f)).toString("base64"), tag: `${i + 1} ${where(frame)} ${(frame / FPS).toFixed(1)}s` };
  });
  const sheets = Math.ceil(stills.length / per);
  for (let s = 0; s < sheets; s++) {
    const props: ContactSheetProps = { stills: stills.slice(s * per, (s + 1) * per) };
    const composition = await selectComposition({ serveUrl, id: "contact-sheet", inputProps: props });
    const output = join(sbDir, `contact-${String(s + 1).padStart(2, "0")}.jpg`);
    await renderStill({ composition, serveUrl, output, inputProps: props, imageFormat: "jpeg", jpegQuality: 80 });
  }
  return sheets;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const prefix = process.argv[2];
  if (!prefix) throw new Error("usage: npm run contact -- <episode number>");
  const folder = readdirSync(join(ROOT, "episodes")).find((d) => d.startsWith(prefix) && existsSync(join(ROOT, "episodes", d, "episode.yaml")));
  if (!folder) throw new Error(`no episode folder starts with "${prefix}"`);
  const serveUrl = await bundle({ entryPoint: join(ENGINE, "src/index.ts"), publicDir: join(ENGINE, "public") });
  const n = await contactSheets(join(ROOT, "episodes", folder), serveUrl);
  console.log(`✔ episodes/${folder}/storyboard/contact-*.jpg (${n} sheets, ${CONTACT_COLS * CONTACT_ROWS} stills each, tagged "<n> <scene> <time>")`);
}
