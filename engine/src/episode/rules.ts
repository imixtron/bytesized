// Content rules from episodes/SCRIPT-FORMAT.md v1.0 §4. Hard fails are "error", the rest "warn".
// Pure functions: the CLI (scripts/validate.ts) and the engine both call validate().
import { BRAND_NODE_TEMPLATES, PARTS, type Episode, type NodeSpec, type Scene } from "./schema";
import { findWord, tokenize } from "./words";
import { buildTimeline, type MeasuredWords } from "../timing/timeline";
import { tokens } from "../theme/tokens";
import { ICONS } from "../parts/icons";

export type Issue = { level: "error" | "warn"; where: string; msg: string };
export type RosterVoice = { name: string; voice_id: string };
export type ValidateOptions = { fileExists?: (projectPath: string) => boolean; measured?: MeasuredWords; roster?: RosterVoice[]; sfxIds?: string[]; musicIds?: string[]; previous?: Episode };

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
  if (ep.scenes.length < 9 || ep.scenes.length > 15) err("episode", `needs 9–15 content scenes, has ${ep.scenes.length}`);
  if (byId.size !== ep.scenes.length) err("episode", "scene ids must be unique");

  // Structure: hook → idea → breakdown → gist (branding sting is automatic after the hook)
  const order = ep.scenes.map((s) => PARTS.indexOf(s.part));
  if (order.some((o, i) => i > 0 && o < order[i - 1])) err("episode", "parts out of order: hook → idea → breakdown → gist");
  const count = (p: string) => ep.scenes.filter((s) => s.part === p).length;
  if (ep.scenes[0]?.part !== "hook" || count("hook") !== 1) err("episode", "exactly one hook, and it must be the first scene");
  if (count("idea") !== 1) err("episode", "exactly one idea scene");
  const nb = count("breakdown");
  if (nb < 6 || nb > 12) err("episode", `6–12 breakdown scenes, has ${nb}`);
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

  // v1.5 diagram templates and verbs
  for (const s of ep.scenes) diagramIssues(s, byId, (m) => err(s.id, m), (m) => warn(s.id, m));

  // Variety (SCRIPT-FORMAT v1.3+): hard fails for scripts written to format 1.3 or later, warnings for older ones
  for (const v of varietyIssues(ep, opts.previous)) (v.hard && Number(ep.format ?? 0) >= 1.3 ? err : warn)(v.where, v.msg);

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
  if (total < 80 || total > 90) (opts.measured ? err : warn)("episode", `length ${total.toFixed(1)}s is outside 80–90s${opts.measured ? " (measured voiceover)" : " (estimate)"}`);
  for (const ts of tl.scenes) {
    const d = ts.duration / tokens.canvas.fps;
    if (d > 8) warn(ts.scene.id, `scene is ${d.toFixed(1)}s (guide: 3–8s)`);
    if (ts.beats.length < Math.floor(d / 2)) warn(ts.scene.id, `${ts.beats.length} beats in ${d.toFixed(1)}s (guide: one every 1.5–2s)`);
  }
  return issues;
}

type St = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const VERB_HOME: Record<string, string[]> = { step: ["Sequence"], branch: ["Decision"], race: ["Split", "BeforeAfter"] };
const isIcon = (i: unknown) => typeof i === "string" && i in ICONS;

/** Shape rules for Sequence, Split, Decision and Tiers (design language v1.5). */
export function diagramIssues(s: Scene, byId: Map<string, Scene>, err: (m: string) => void, warn: (m: string) => void) {
  const st = s.stage as St;
  for (const b of s.beats) {
    const home = VERB_HOME[b.do];
    if (home && !home.includes(s.template)) err(`"${b.do}" only works in ${home.join(" / ")}`);
    if (b.do === "branch" && !["yes", "no"].includes(String(b.args?.to))) err(`branch needs args.to: yes or no`);
  }
  for (const n of (st.nodes ?? []) as NodeSpec[]) if (n.icon && !isIcon(n.icon)) err(`icon "${n.icon}" isn't in the icon set`);

  if (s.template === "Sequence") {
    const root = (st.reuse ? byId.get(st.reuse)?.stage : st) as St | undefined;
    const actors = (root?.actors ?? []) as NodeSpec[];
    if (actors.length < 2 || actors.length > 3) err(`Sequence needs 2–3 actors, has ${actors.length}`);
    const ids = new Set(actors.map((a) => a.id));
    const groupId = st.reuse ?? s.id;
    const group = [...byId.values()].filter((x) => x.id === groupId || (x.stage as St).reuse === groupId);
    const total = group.reduce((n, x) => n + (((x.stage as St).steps ?? []) as unknown[]).length, 0);
    if (total > tokens.diagram.step.maxSteps) err(`a sequence has at most ${tokens.diagram.step.maxSteps} steps across its scenes, has ${total}`);
    for (const step of (st.steps ?? []) as St[]) {
      if (step.note) { if (!ids.has(step.at)) err(`step "${step.id}": note needs at: <actor id>`); }
      else if (!ids.has(step.from) || !ids.has(step.to)) err(`step "${step.id}" needs from/to actor ids`);
      if (step.label && step.label.length > (actors.length > 2 ? 12 : 18)) warn(`step label "${step.label}" is long for the gap between lanes`);
    }
    for (const a of actors) if (a.icon && !isIcon(a.icon)) err(`icon "${a.icon}" isn't in the icon set`);
  }

  if (s.template === "Split" || s.template === "BeforeAfter") {
    for (const k of ["before", "after"]) {
      const h = st[k] as St | undefined;
      if (!h) { err(`Split needs ${k}:`); continue; }
      const n = (h.nodes ?? []).length;
      if (n < 1 || n > 4) err(`${k} needs 1–4 nodes, has ${n}`);
      for (const node of (h.nodes ?? []) as NodeSpec[]) if (node.icon && !isIcon(node.icon)) err(`icon "${node.icon}" isn't in the icon set`);
    }
    if (st.variant === "race" && (st.before?.slow ?? 1) === (st.after?.slow ?? 1)) warn("race: give one half a bigger slow: so the other wins");
  }

  if (s.template === "Decision") {
    if (!st.start) err("Decision needs start: (a node)");
    const checks = (st.checks ?? []) as St[];
    if (checks.length < 1 || checks.length > 3) err(`Decision needs 1–3 checks, has ${checks.length}`);
    const seen = new Set<string>();
    for (const ch of checks) {
      if (typeof ch.no === "string" && !seen.has(ch.no)) err(`check "${ch.id}": no: "${ch.no}" must name an outcome defined by an earlier check`);
      if (ch.no && typeof ch.no === "object") { seen.add(ch.no.id); if (ch.no.icon && !isIcon(ch.no.icon)) err(`icon "${ch.no.icon}" isn't in the icon set`); }
      if (String(ch.q ?? "").length > 18) warn(`check question "${ch.q}" may not fit the diamond (≤18 characters)`);
    }
  }

  if (s.template === "BigPicture") {
    const panels = (st.panels ?? []) as St[];
    const max = tokens.bigPicture.maxPanels;
    if (panels.length < 2 || panels.length > max) err(`BigPicture needs 2–${max} panels, has ${panels.length}`);
    const order = [...byId.keys()];
    for (const p of panels) {
      const src = byId.get(p.scene);
      if (!p.id) err("each BigPicture panel needs an id (beats target it)");
      if (!src) { err(`panel "${p.id}": scene "${p.scene}" doesn't exist`); continue; }
      if (order.indexOf(src.id) > order.indexOf(s.id)) err(`panel "${p.id}": "${src.id}" comes after the BigPicture`);
      if (src.part !== "breakdown" || !DIAGRAMS.has(src.template)) err(`panel "${p.id}": "${src.id}" must be a breakdown diagram (${[...DIAGRAMS].join(", ")})`);
      if (p.label && String(p.label).length > 16) warn(`panel label "${p.label}" is long (≤16 characters)`);
    }
    const next = byId.get(order[order.indexOf(s.id) + 1] ?? "");
    if (s.part !== "breakdown" || next?.part !== "gist") err("BigPicture is the last breakdown scene, straight before the gist");
    if ([...byId.values()].filter((x) => x.template === "BigPicture").length > 1) err("at most one BigPicture per episode");
  }

  if (s.template === "Tiers") {
    const tiers = (st.tiers ?? []) as St[];
    if (tiers.length < 2 || tiers.length > 5) err(`Tiers needs 2–5 tiers, has ${tiers.length}`);
    for (const t of tiers) if (t.icon && !isIcon(t.icon)) err(`icon "${t.icon}" isn't in the icon set`);
    const axes = (st.axes ?? []) as unknown[];
    if (axes.length > 2) err("Tiers takes at most 2 axes");
    if (axes.length && (st.variant ?? "stack") !== "stack") warn("axes only show in the stack variant");
    if (st.variant === "spectrum" && !st.ends) warn("spectrum: add ends: [left, right]");
  }
}

/** Templates that draw a diagram (vs text: Analogy, ThreeCards). */
export const DIAGRAMS = new Set(["FlowDiagram", "Sequence", "Split", "BeforeAfter", "Decision", "Tiers", "MetricChart", "Zoom"]);
/** Fixed bookends, never counted for variety. */
const BOOKENDS = new Set(["Hook", "GistCard", "BigPicture"]);
export const VARIETY = { minBreakdownTemplates: 4, goodBreakdownTemplates: 5, maxScenesPerTemplate: 3, sharedRun: 3 };
/** Format 1.5+: topic-first visual plan. Guards both extremes (one template overused, or a sampler of everything). */
export const VARIETY_V15 = { maxDiagramsPerTemplate: 3, maxReuseChain: 5, samplerTemplates: 6, maxVisualPlanChars: 300 };

/** The breakdown's template order, with `reuse` continuations folded into the scene they continue. */
export const breakdownShape = (ep: Episode) => ep.scenes.filter((s) => s.part === "breakdown" && !s.stage.reuse && s.template !== "BigPicture").map((s) => s.template as string);

/** Variety rules: enough different diagrams, none overused, and not the previous episode's shape. */
export function varietyIssues(ep: Episode, previous?: Episode): { hard: boolean; where: string; msg: string }[] {
  if (Number(ep.format ?? 0) >= 1.5) return varietyIssuesV15(ep, previous);
  const out: { hard: boolean; where: string; msg: string }[] = [];
  const shape = breakdownShape(ep);
  const breakdown = ep.scenes.filter((s) => s.part === "breakdown" && s.template !== "BigPicture"); // a recap, not a diagram of its own
  const distinct = new Set(breakdown.map((s) => s.template));
  if (distinct.size < VARIETY.minBreakdownTemplates) out.push({ hard: true, where: "variety", msg: `breakdown uses ${distinct.size} templates (${[...distinct].join(", ")}); needs at least ${VARIETY.minBreakdownTemplates}` });
  else if (distinct.size < VARIETY.goodBreakdownTemplates) out.push({ hard: false, where: "variety", msg: `breakdown uses ${distinct.size} templates; ${VARIETY.goodBreakdownTemplates}+ reads better` });

  const counts = new Map<string, number>();
  for (const s of ep.scenes) if (!BOOKENDS.has(s.template)) counts.set(s.template, (counts.get(s.template) ?? 0) + 1);
  for (const [t, n] of counts) if (n > VARIETY.maxScenesPerTemplate) out.push({ hard: true, where: "variety", msg: `${t} is used in ${n} scenes (max ${VARIETY.maxScenesPerTemplate}, continuations included)` });

  breakdown.forEach((s, i) => {
    const prev = breakdown[i - 1];
    if (prev && prev.template === s.template && !s.stage.reuse) out.push({ hard: false, where: s.id, msg: `same template as the scene before (${s.template}) without continuing it; switch template or use stage.reuse` });
  });
  const diagrams = breakdown.filter((s) => DIAGRAMS.has(s.template)).length;
  if (diagrams * 2 < breakdown.length) out.push({ hard: false, where: "variety", msg: `only ${diagrams} of ${breakdown.length} breakdown scenes are diagrams; Bytesized is diagram-first` });

  if (previous) {
    const prevShape = breakdownShape(previous);
    if (shape.join(">") === prevShape.join(">")) out.push({ hard: true, where: "variety", msg: `breakdown has the same template order as episode ${previous.id} (${shape.join(" → ")})` });
    else {
      const runs = (xs: string[]) => new Set(xs.slice(0, xs.length - VARIETY.sharedRun + 1).map((_, i) => xs.slice(i, i + VARIETY.sharedRun).join(" → ")));
      const shared = [...runs(shape)].filter((r) => runs(prevShape).has(r));
      if (shared.length) out.push({ hard: false, where: "variety", msg: `repeats episode ${previous.id}'s run ${shared[0]}` });
    }
  }
  return out;
}

/** Variety rules for format 1.5+ (SCRIPT-FORMAT §4): the visual plan decides the templates; the rules only stop the extremes. */
function varietyIssuesV15(ep: Episode, previous?: Episode): { hard: boolean; where: string; msg: string }[] {
  const out: { hard: boolean; where: string; msg: string }[] = [];
  const V = VARIETY_V15;
  const plan = (ep.visual_plan ?? "").trim();
  if (!plan) out.push({ hard: true, where: "visual_plan", msg: "format 1.5 needs a visual_plan: the spine diagram(s) and why each other template is there" });
  else if (plan.length > V.maxVisualPlanChars) out.push({ hard: true, where: "visual_plan", msg: `visual_plan is ${plan.length} characters (max ${V.maxVisualPlanChars})` });

  const byId = new Map(ep.scenes.map((s) => [s.id, s]));
  const rootOf = (s: Scene): Scene => {
    const seen = new Set<string>([s.id]);
    let cur = s;
    while (cur.stage.reuse && byId.has(cur.stage.reuse) && !seen.has(cur.stage.reuse)) { cur = byId.get(cur.stage.reuse)!; seen.add(cur.id); }
    return cur;
  };
  // A reuse chain is one diagram: count chain roots per template, and chain lengths
  const chains = new Map<string, number>();
  for (const s of ep.scenes) { const r = rootOf(s); chains.set(r.id, (chains.get(r.id) ?? 0) + 1); }
  for (const [id, n] of chains) if (n > V.maxReuseChain) out.push({ hard: true, where: id, msg: `diagram ${id} is continued over ${n} scenes with reuse (max ${V.maxReuseChain})` });

  const breakdown = ep.scenes.filter((s) => s.part === "breakdown" && s.template !== "BigPicture"); // a recap, not a diagram of its own
  const diagramsPer = new Map<string, number>();
  for (const s of breakdown) if (!BOOKENDS.has(s.template) && rootOf(s).id === s.id) diagramsPer.set(s.template, (diagramsPer.get(s.template) ?? 0) + 1);
  for (const [t, n] of diagramsPer) if (n > V.maxDiagramsPerTemplate) out.push({ hard: true, where: "variety", msg: `${t} is used for ${n} separate diagrams (max ${V.maxDiagramsPerTemplate}; a reuse chain counts as one)` });

  const distinct = new Set(breakdown.map((s) => s.template));
  if (distinct.size >= V.samplerTemplates) out.push({ hard: false, where: "variety", msg: `breakdown uses ${distinct.size} different templates; reads like a sampler. Does the topic need all of them?` });

  breakdown.forEach((s, i) => {
    const prev = breakdown[i - 1];
    if (prev && prev.template === s.template && !s.stage.reuse) out.push({ hard: false, where: s.id, msg: `same template as the scene before (${s.template}) without continuing it; switch template or use stage.reuse` });
  });
  const diagrams = breakdown.filter((s) => DIAGRAMS.has(s.template)).length;
  if (diagrams * 2 < breakdown.length) out.push({ hard: false, where: "variety", msg: `only ${diagrams} of ${breakdown.length} breakdown scenes are diagrams; Bytesized is diagram-first` });

  if (previous) {
    const shape = breakdownShape(ep);
    const prevShape = breakdownShape(previous);
    if (shape.join(">") === prevShape.join(">")) out.push({ hard: false, where: "variety", msg: `breakdown has the same template order as episode ${previous.id} (${shape.join(" → ")})` });
    else {
      const runs = (xs: string[]) => new Set(xs.slice(0, xs.length - VARIETY.sharedRun + 1).map((_, i) => xs.slice(i, i + VARIETY.sharedRun).join(" → ")));
      const shared = [...runs(shape)].filter((r) => runs(prevShape).has(r));
      if (shared.length) out.push({ hard: false, where: "variety", msg: `repeats episode ${previous.id}'s run ${shared[0]}` });
    }
  }
  return out;
}
