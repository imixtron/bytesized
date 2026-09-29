// Content rules from episodes/SCRIPT-FORMAT.md v1.0 §4. Hard fails are "error", the rest "warn".
// Pure functions: the CLI (scripts/validate.ts) and the engine both call validate().
import { BRAND_NODE_TEMPLATES, PARTS, type Episode, type NodeSpec, type Scene } from "./schema";
import { findWord, tokenize } from "./words";
import { buildTimeline, type MeasuredWords } from "../timing/timeline";
import { tokens } from "../theme/tokens";

export type Issue = { level: "error" | "warn"; where: string; msg: string };
export type RosterVoice = { name: string; voice_id: string };
export type ValidateOptions = { fileExists?: (projectPath: string) => boolean; measured?: MeasuredWords; roster?: RosterVoice[]; sfxIds?: string[]; musicIds?: string[] };

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Every id a beat may target in this scene (nodes, rows, cards, crowd, counter, template specials). */
function sceneIds(scene: Scene, byId: Map<string, Scene>): Set<string> {
  const ids = new Set<string>();
  const walk = (v: unknown) => {
    if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (typeof o.id === "string") ids.add(o.id);
      Object.values(o).forEach(walk);
    }
  };
  walk(scene.stage);
  if (scene.stage.reuse) sceneIds(byId.get(scene.stage.reuse) ?? scene, new Map()).forEach((i) => ids.add(i));
  if (scene.template === "GistCard") ids.add("card");
  if ("morph" in scene.stage) ids.add("morph");
  return ids;
}

function nodesOf(scene: Scene, byId: Map<string, Scene>): NodeSpec[] {
  const own = scene.stage.nodes ?? [];
  const reused = scene.stage.reuse ? byId.get(scene.stage.reuse)?.stage.nodes ?? [] : [];
  return [...reused, ...own];
}

export function validate(ep: Episode, opts: ValidateOptions = {}): Issue[] {
  const issues: Issue[] = [];
  const err = (where: string, msg: string) => issues.push({ level: "error", where, msg });
  const warn = (where: string, msg: string) => issues.push({ level: "warn", where, msg });
  const byId = new Map(ep.scenes.map((s) => [s.id, s]));

  // Scene count and ids
  if (ep.scenes.length < 4 || ep.scenes.length > 10) err("episode", `needs 4–10 content scenes, has ${ep.scenes.length}`);
  if (byId.size !== ep.scenes.length) err("episode", "scene ids must be unique");

  // Structure: hook → idea → breakdown → gist (branding sting is automatic after the hook)
  const order = ep.scenes.map((s) => PARTS.indexOf(s.part));
  if (order.some((o, i) => i > 0 && o < order[i - 1])) err("episode", "parts out of order: hook → idea → breakdown → gist");
  const count = (p: string) => ep.scenes.filter((s) => s.part === p).length;
  if (ep.scenes[0]?.part !== "hook" || count("hook") !== 1) err("episode", "exactly one hook, and it must be the first scene");
  if (count("idea") !== 1) err("episode", "exactly one idea scene");
  const nb = count("breakdown");
  if (nb < 2 || nb > 6) err("episode", `2–6 breakdown scenes, has ${nb}`);
  if (ep.scenes.at(-1)?.part !== "gist" || count("gist") !== 1) err("episode", "exactly one gist, and it must be the last scene");
  const gist = ep.scenes.find((s) => s.part === "gist");
  if (gist && gist.template !== "GistCard") err(gist.id, "the gist scene uses the GistCard template");
  if (gist && !/^that'?s the gist/i.test(gist.vo.replace(/’/g, "'"))) warn(gist.id, 'gist vo should start with "That\'s the gist"');

  // Headlines
  let run = 0;
  for (const s of ep.scenes) {
    if (s.headline) {
      if (words(s.headline.text) > 5) err(s.id, `headline has ${words(s.headline.text)} words (max 5)`);
      if (!s.headline.text.toLowerCase().includes(s.headline.accent.toLowerCase())) err(s.id, `headline accent "${s.headline.accent}" isn't in the text`);
      if (s.template === "GistCard") err(s.id, "no headline on the GistCard scene");
      if (++run > 3) err(s.id, "more than 3 headline scenes in a row");
    } else run = 0;
  }
  if (ep.scenes.every((s) => s.headline)) err("episode", "at least one scene must have no headline");

  // Voiceover
  for (const s of ep.scenes) if (/\p{Extended_Pictographic}/u.test(s.vo)) err(s.id, "no emojis in vo (the voiceover would read them)");

  // Beats: words exist, targets exist, one script accent max
  let accents = 0;
  for (const s of ep.scenes) {
    if (s.stage.reuse && !byId.has(s.stage.reuse)) err(s.id, `stage.reuse "${s.stage.reuse}" is not a scene`);
    const toks = tokenize(s.vo);
    const ids = sceneIds(s, byId);
    for (const b of s.beats) {
      if (findWord(toks, b.on) < 0) err(s.id, `beat on "${b.on}" isn't a word in this scene's vo`);
      for (const t of [b.target ?? []].flat()) if (!ids.has(t)) err(s.id, `beat target "${t}" doesn't exist in this scene`);
      if (b.do === "accent") accents++;
      if (b.sfx && b.sfx !== "none" && opts.sfxIds && !opts.sfxIds.includes(b.sfx)) err(s.id, `beat sfx "${b.sfx}" isn't in assets/sfx/library.json`);
    }
  }
  if (accents > 1) err("episode", `script accent used ${accents}× (max once per episode)`);

  // Nodes: one hero, brand nodes
  for (const s of ep.scenes) {
    const nodes = nodesOf(s, byId);
    const heroes = nodes.filter((n) => n.family === "hero").length;
    if (heroes > 1) err(s.id, `${heroes} hero nodes on screen (max 1)`);
    for (const n of nodes.filter((n) => n.type === "brand")) {
      if (!n.logo) err(s.id, `brand node "${n.id}" needs logo:`);
      else {
        if (!ep.brands.includes(n.logo)) err(s.id, `logo "${n.logo}" must be listed in brands:`);
        if (opts.fileExists && !opts.fileExists(`assets/logos/${n.logo}/SOURCE.md`)) err(s.id, `missing assets/logos/${n.logo}/SOURCE.md`);
        if (opts.fileExists && !opts.fileExists(`assets/logos/${n.logo}/derived/node.png`)) err(s.id, `missing assets/logos/${n.logo}/derived/node.png (the node image)`);
      }
      if (!BRAND_NODE_TEMPLATES.includes(s.template)) err(s.id, `brand logos only inside diagrams (${BRAND_NODE_TEMPLATES.join(", ")})`);
    }
  }

  // Voice (round robin from episodes/voices.json)
  if (!ep.voice.name || ep.voice.voice_id === "TBD") warn("voice", "no voice assigned yet: run npm run voice:assign -- <episode>");
  else if (opts.roster && !opts.roster.some((v) => v.name === ep.voice.name && v.voice_id === ep.voice.voice_id))
    err("voice", `voice "${ep.voice.name}" (${ep.voice.voice_id}) isn't in the roster`);

  if (ep.music.track && opts.musicIds && !opts.musicIds.includes(ep.music.track)) err("music", `track "${ep.music.track}" isn't in assets/music/library.json`);

  // Two-part series
  if (ep.series) {
    if (ep.series.part === 1 && !ep.series.teaser) err("series", "part 1 needs a teaser");
    if (ep.series.part === 2 && !ep.series.recap) err("series", "part 2 needs a recap");
  }

  // Length (hard check only once the voiceover is measured; estimate → warning)
  const tl = buildTimeline(ep, opts.measured);
  const total = tl.totalFrames / tokens.canvas.fps;
  if (total < 30 || total > 60) (opts.measured ? err : warn)("episode", `length ${total.toFixed(1)}s is outside 30–60s${opts.measured ? " (measured voiceover)" : " (estimate)"}`);
  for (const ts of tl.scenes) {
    const d = ts.duration / tokens.canvas.fps;
    if (d > 8) warn(ts.scene.id, `scene is ${d.toFixed(1)}s (guide: 3–8s)`);
    if (ts.beats.length < Math.floor(d / 2)) warn(ts.scene.id, `${ts.beats.length} beats in ${d.toFixed(1)}s (guide: one every 1.5–2s)`);
  }
  return issues;
}
