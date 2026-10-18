// Content rules from episodes/SCRIPT-FORMAT.md v1.0 §4. Hard fails are "error", the rest "warn".
// Pure functions: the CLI (scripts/validate.ts) and the engine both call validate().
import { BRAND_NODE_TEMPLATES, PARTS, type Episode, type NodeSpec, type Scene } from "./schema";
import { findWord, tokenize } from "./words";
import { narrationIssues } from "./narration";
import { buildTimeline, type MeasuredWords } from "../timing/timeline";
import { tokens } from "../theme/tokens";
import { ICONS } from "../parts/icons";

export type Issue = { level: "error" | "warn"; where: string; msg: string };
export type RosterVoice = { name: string; voice_id: string };
export type ValidateOptions = { fileExists?: (projectPath: string) => boolean; measured?: MeasuredWords; roster?: RosterVoice[]; sfxIds?: string[]; musicIds?: string[]; previous?: Episode; /** the episodes before this one, nearest last (the motion fingerprint rules look at 3) */ previousEpisodes?: Episode[] };

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

  // Narration read as one piece (SCRIPT-FORMAT §1): warnings only
  for (const n of narrationIssues(ep.scenes)) warn(n.where, n.msg);

  // Length (hard check only once the voiceover is measured; estimate → warning)
  const tl = buildTimeline(ep, opts.measured);
  const total = tl.totalFrames / tokens.canvas.fps;
  if (total < 80 || total > 90) (opts.measured ? err : warn)("episode", `length ${total.toFixed(1)}s is outside 80–90s${opts.measured ? " (measured voiceover)" : " (estimate)"}`);
  for (const ts of tl.scenes) {
    const d = ts.duration / tokens.canvas.fps;
    const maxSec = ts.scene.part === "breakdown" ? 10 : 8; // v1.7: a breakdown line that is one connected thought may run to 10s
    if (d > maxSec) warn(ts.scene.id, `scene is ${d.toFixed(1)}s (guide: 3–${maxSec}s)`);
    if (ts.beats.length < Math.floor(d / 2)) warn(ts.scene.id, `${ts.beats.length} beats in ${d.toFixed(1)}s (guide: one every 1.5–2s)`);
  }
  // Motion variety (SCRIPT-FORMAT v1.6): hard fails for `format` 1.6 and later, warnings for older scripts
  const motion = (hard: boolean, where: string, msg: string) => (hard && Number(ep.format ?? 0) >= 1.6 ? err : warn)(where, msg);
  if (Number(ep.format ?? 0) >= 1.6 && !ep.look) err("look", "format 1.6 needs a look: run npm run look:assign -- <nnn> (two motion recipes from episodes/looks.json)");
  ep.scenes.forEach((s, i) => {
    const slides = ["whip", "flip", "stack", "dive", "iris"].includes(s.transition);
    if (slides && (i === 0 || ep.scenes[i - 1].part === "hook")) warn(s.id, `transition "${s.transition}" won't play here: nothing slides in after the hook (the branding sting sits between), so it's treated as a cut`);
  });
  const arrivals = new Set(ep.scenes.map((s, i) => (i === 0 || ep.scenes[i - 1].part === "hook" ? "cut" : s.transition)));
  if (arrivals.size < 3) motion(true, "episode", `only ${arrivals.size} kind(s) of scene transition (${[...arrivals].join(", ")}); needs 3+ (cut, push, whip, flip, stack, dive, iris)`);
  for (let i = 2; i < ep.scenes.length; i++) {
    const [a, b, c] = [ep.scenes[i - 2], ep.scenes[i - 1], ep.scenes[i]];
    if (a.enter === b.enter && b.enter === c.enter && (a.enter !== "pop" || Number(ep.format ?? 0) >= 1.6)) motion(true, c.id, `entrance style "${c.enter}" in 3 scenes in a row (max 2)`);
  }
  if (!ep.look && ep.scenes.every((s) => s.camera === "still") && ep.scenes.every((s) => s.enter === "pop")) warn("episode", "every scene uses the default entrance (pop) and a still camera: add a look (npm run look:assign) or set enter: / camera: per scene");

  // Fingerprints: template · entrance · transition · camera per scene. The same 3-scene run as any of the last 3 episodes is a hard fail,
  // and so is an Analogy "Idea" scene in a third episode running.
  const fp = (e: Episode) => e.scenes.map((s) => `${s.template}|${s.enter}|${s.transition}|${s.camera}`);
  const prevs = (opts.previousEpisodes ?? (opts.previous ? [opts.previous] : [])).slice(-3);
  const runs = (xs: string[]) => new Set(xs.slice(0, Math.max(0, xs.length - 2)).map((_, i) => xs.slice(i, i + 3).join(" ▸ ")));
  const mine = fp(ep);
  for (const pe of prevs) {
    const theirs = runs(fp(pe));
    const same = [...runs(mine)].filter((r) => theirs.has(r));
    if (same.length) motion(true, "variety", `the same 3-scene run (template, entrance, transition, camera) as episode ${pe.id}: ${same[0].replace(/\|/g, "/")}`);
  }
  const idea = (e: Episode) => e.scenes.find((s) => s.part === "idea")?.template;
  if (idea(ep) === "Analogy" && prevs.length >= 2 && prevs.slice(-2).every((p) => idea(p) === "Analogy")) motion(true, "idea", "an Analogy Idea scene in 3 episodes running; try Diorama, Transform, Zoom, Chat or Slider for the idea");

  return issues;
}

type St = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const VERB_HOME: Record<string, string[]> = { step: ["Sequence", "Timeline", "StateMachine", "Transform", "Ring", "Cells", "Stream", "Diorama", "Chat", "Map"], zoom: ["Zoom"], branch: ["Decision"], race: ["Split", "BeforeAfter"] };
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

  if (s.template === "Timeline") {
    const events = (st.events ?? []) as St[];
    const lanes = (st.lanes ?? []) as St[];
    const max = st.variant === "lanes" ? 7 : 6;
    if (events.length < 2 || events.length > max) err(`Timeline needs 2–${max} events, has ${events.length}`);
    for (const e of events) {
      if (!e.at) err(`event "${e.id}" needs at: (its time label)`);
      if (e.icon && !isIcon(e.icon)) err(`icon "${e.icon}" isn't in the icon set`);
    }
    if (st.variant === "lanes") {
      if (lanes.length < 2 || lanes.length > 3) err(`Timeline lanes needs 2–3 lanes, has ${lanes.length}`);
      for (const e of events) if (!lanes.some((l) => l.id === e.lane)) err(`event "${e.id}" needs lane: <lane id>`);
      const ids = new Set(events.map((e) => e.id));
      for (const l of (st.links ?? []) as St[]) if (!ids.has(l.from) || !ids.has(l.to)) err(`link "${l.id}" needs from/to event ids`);
    } else if (events.some((e) => String(e.label ?? "").length > 22)) warn("event labels over 22 characters may wrap");
  }

  if (s.template === "MetricChart") {
    const ch = (st.chart ?? {}) as St;
    const data = (ch.data ?? []) as St[];
    const type = ch.type ?? "bar";
    if (!["bar", "line", "gauge"].includes(type)) err(`chart.type must be bar, line or gauge`);
    if (type === "gauge" ? data.length !== 1 : data.length < 2 || data.length > 5) err(type === "gauge" ? "a gauge takes exactly 1 data item" : `a ${type} chart needs 2–5 data items, has ${data.length}`);
    if (data.some((d) => typeof d.value !== "number")) err("every data item needs a numeric value");
    if (type === "gauge" && ch.max === undefined) warn("gauge: set chart.max (the dial's full scale)");
  }

  if (s.template === "Snippet") {
    const lines = (st.lines ?? []) as St[];
    if (lines.length < 2 || lines.length > 8) err(`Snippet needs 2–8 lines, has ${lines.length}`);
    for (const l of lines) if (String(l.text ?? "").length > 90) warn(`line "${l.id}" is long; it will wrap`);
  }

  if (s.template === "Stat") {
    if (s.part !== "hook") warn("Stat is made for hooks");
    const stat = st.stat as St | undefined;
    if (!stat?.id || !stat?.value) err("Stat needs stat: { id, value }");
    else if (String(stat.value).length > 7) err(`stat value "${stat.value}" is over 7 characters (it has to slam in big; put the unit in unit:)`);
  }

  if (s.template === "Zoom") {
    const from = st.from as St | undefined;
    const inner = ((st.inside ?? {}).nodes ?? []) as St[];
    if (!from?.id) err("Zoom needs from: (the node to dive into)");
    if (inner.length < 2 || inner.length > 4) err(`Zoom needs 2–4 nodes inside, has ${inner.length}`);
    if (!s.beats.some((b) => b.do === "zoom")) warn("Zoom: add a `zoom` beat on the from node (the dive starts at 50 frames otherwise)");
    const ids = new Set(inner.map((n) => n.id));
    for (const l of ((st.inside ?? {}).links ?? []) as St[]) if (!ids.has(l.from) || !ids.has(l.to)) err("inside links need from/to inside node ids");
  }

  if (s.template === "StateMachine") {
    const states = (st.states ?? []) as St[];
    const trs = (st.transitions ?? []) as St[];
    if (states.length < 2 || states.length > 5) err(`StateMachine needs 2–5 states, has ${states.length}`);
    const ids = new Set(states.map((x) => x.id));
    for (const t of trs) {
      if (!ids.has(t.from) || !ids.has(t.to)) err(`transition "${t.id}" needs from/to state ids`);
      else if (t.from === t.to) err(`transition "${t.id}" loops back to its own state (not supported)`);
      if (t.label && String(t.label).length > 14) warn(`transition label "${t.label}" is long (≤14 characters)`);
    }
    if (st.start && !ids.has(st.start)) err(`start "${st.start}" isn't a state`);
    for (const x of states) if (String(x.label ?? "").length > 10) warn(`state label "${x.label}" may not fit the circle (≤10 characters)`);
  }

  if (s.template === "Tree") {
    const root = st.root as St | undefined;
    if (!root?.id) err("Tree needs root: { id, label, children }");
    else {
      let count = 0;
      let depth = 0;
      const walk = (n: St, d: number) => { count++; depth = Math.max(depth, d); for (const ch of (n.children ?? []) as St[]) walk(ch, d + 1); };
      walk(root, 1);
      if (count > 10) err(`Tree has ${count} nodes (max 10)`);
      if (depth > 3) err(`Tree is ${depth} levels deep (max 3)`);
      if (count < 3) err("Tree needs at least 3 nodes");
    }
  }

  if (s.template === "Transform") {
    const items = (st.items ?? []) as St[];
    const via = (st.via ?? []) as St[];
    if (items.length < 2 || items.length > 4) err(`Transform needs 2–4 items, has ${items.length}`);
    if (via.length !== items.length - 1) err(`Transform needs one via per gap: ${items.length - 1}, has ${via.length}`);
    for (const v of via) if (v.icon && !isIcon(v.icon)) err(`icon "${v.icon}" isn't in the icon set`);
    for (const it of items) if (String(it.text ?? "").length > 30) warn(`item "${it.id}" text is long (≤30 characters)`);
  }

  if (s.template === "Ring") {
    const servers = (st.servers ?? []) as St[];
    const keys = (st.keys ?? []) as St[];
    if (servers.length < 2 || servers.length > 5) err(`Ring needs 2–5 servers, has ${servers.length}`);
    if (keys.length < 1 || keys.length > 8) err(`Ring needs 1–8 keys, has ${keys.length}`);
    for (const x of [...servers, ...keys]) if (typeof x.at !== "number" || x.at < 0 || x.at >= 360) err(`"${x.id}" needs at: 0–359 (degrees clockwise from the top)`);
    for (const x of servers) if (String(x.label ?? "").length > 12) warn(`server label "${x.label}" is long (≤12 characters)`);
  }

  if (s.template === "Cells") {
    const cells = (st.cells ?? []) as St[];
    const items = (st.items ?? []) as St[];
    if (cells.length < 2 || cells.length > 6) err(`Cells needs 2–6 cells, has ${cells.length}`);
    if (items.length < 1 || items.length > 14) err(`Cells needs 1–14 items, has ${items.length}`);
    const ids = new Set(cells.map((x) => x.id));
    for (const it of items) if (!ids.has(it.into)) err(`item "${it.id}" needs into: <cell id>`);
    for (const cell of cells) if (items.filter((it) => it.into === cell.id).length > 9) warn(`cell "${cell.id}" gets more than 9 items (they won't fit)`);
  }

  if (s.template === "Stream") {
    const lanes = (st.lanes ?? []) as St[];
    const msgs = (st.messages ?? []) as St[];
    if (lanes.length < 1 || lanes.length > 4) err(`Stream needs 1–4 lanes, has ${lanes.length}`);
    if (msgs.length < 2 || msgs.length > 12) err(`Stream needs 2–12 messages, has ${msgs.length}`);
    const ids = new Set(lanes.map((x) => x.id));
    for (const m of msgs) if (!ids.has(m.lane)) err(`message "${m.id}" needs lane: <lane id>`);
    for (const l of lanes) { if (l.producer && !isIcon(l.producer)) err(`icon "${l.producer}" isn't in the icon set`); if (l.consumer && !isIcon(l.consumer)) err(`icon "${l.consumer}" isn't in the icon set`); }
  }

  if (s.template === "Cluster") {
    const nodes = (st.nodes ?? []) as St[];
    if (nodes.length < 3 || nodes.length > 5) err(`Cluster needs 3–5 nodes, has ${nodes.length}`);
    if (st.leader && !nodes.some((x) => x.id === st.leader)) err(`leader "${st.leader}" isn't a node`);
    if (!s.beats.some((b) => b.do === "send")) warn("Cluster: add `send` beats (the leader fans a write out to the followers)");
  }

  if (s.template === "Fleet") {
    const pods = (st.pods ?? []) as St[];
    if (pods.length < 2 || pods.length > 12) err(`Fleet needs 2–12 pods, has ${pods.length}`);
    if (!s.beats.some((b) => b.do === "count")) warn("Fleet: add a `count` beat with args.to (the traffic level) so the cpu bars move");
  }

  if (s.template === "Map") {
    const pins = (st.pins ?? []) as St[];
    const routes = (st.routes ?? []) as St[];
    if (pins.length < 2 || pins.length > 6) err(`Map needs 2–6 pins, has ${pins.length}`);
    if (routes.length > 5) err(`Map takes at most 5 routes, has ${routes.length}`);
    const ids = new Set(pins.map((p) => p.id));
    for (const p of pins) if (!Array.isArray(p.at) || p.at.length !== 2 || Math.abs(p.at[0]) > 180 || Math.abs(p.at[1]) > 75) err(`pin "${p.id}" needs at: [lon, lat] (lon −180…180, lat −45…75)`);
    for (const r of routes) if (!ids.has(r.from) || !ids.has(r.to)) err(`route "${r.id}" needs from/to pin ids`);
  }

  if (s.template === "Estimate") {
    const lines = (st.lines ?? []) as St[];
    if (lines.length < 2 || lines.length > 6) err(`Estimate needs 2–6 lines, has ${lines.length}`);
    for (const l of lines) if (String(l.text ?? "").length > 30) warn(`line "${l.id}" is long for the napkin (≤30 characters)`);
    if (!lines.some((l) => l.result)) warn("Estimate: mark the answer line with result: true (it gets circled)");
  }

  if (s.template === "Chat") {
    const actors = (st.actors ?? []) as St[];
    const msgs = (st.messages ?? []) as St[];
    if (actors.length !== 2) err(`Chat needs exactly 2 actors, has ${actors.length}`);
    if (msgs.length < 2 || msgs.length > 7) err(`Chat needs 2–7 messages, has ${msgs.length}`);
    const ids = new Set(actors.map((a) => a.id));
    for (const m of msgs) { if (!ids.has(m.from)) err(`message "${m.id}" needs from: <actor id>`); if (String(m.text ?? "").length > 40) warn(`message "${m.id}" is long (≤40 characters)`); }
  }

  if (s.template === "Diorama") {
    const zones = (st.zones ?? []) as St[];
    const actors = (st.actors ?? []) as St[];
    if (zones.length < 2 || zones.length > 5) err(`Diorama needs 2–5 zones, has ${zones.length}`);
    if (actors.length < 1 || actors.length > 4) err(`Diorama needs 1–4 actors, has ${actors.length}`);
    const ids = new Set(zones.map((z) => z.id));
    for (const z of zones) { if (!["x", "y", "w", "h"].every((k) => typeof z[k] === "number")) err(`zone "${z.id}" needs x, y, w, h (fractions 0–1)`); else if (z.x < 0 || z.y < 0 || z.x + z.w > 1.001 || z.y + z.h > 1.001) err(`zone "${z.id}" leaves the stage (x + w and y + h must be ≤ 1)`); if (z.icon && !isIcon(z.icon)) err(`icon "${z.icon}" isn't in the icon set`); }
    for (const a of actors) { if (!ids.has(a.at)) err(`actor "${a.id}" needs at: <zone id>`); if (!isIcon(a.icon)) err(`actor "${a.id}" needs an icon from the icon set`); }
    for (const b of s.beats) if (b.do === "step" && !ids.has(String(b.args?.to))) err(`step needs args.to: <zone id>`);
  }

  if (s.template === "Matrix") {
    const cols = (st.cols ?? []) as St[];
    const rows = (st.rows ?? []) as St[];
    if (cols.length < 2 || cols.length > 4) err(`Matrix needs 2–4 columns, has ${cols.length}`);
    if (rows.length < 2 || rows.length > 5) err(`Matrix needs 2–5 rows, has ${rows.length}`);
    for (const r of rows) {
      if (((r.cells ?? []) as unknown[]).length !== cols.length) err(`row "${r.id}" needs ${cols.length} cells (one per column)`);
      for (const cell of (r.cells ?? []) as string[]) if (!["yes", "no", "partial"].includes(cell) && String(cell).length > 10) warn(`cell "${cell}" is long (≤10 characters, or use yes / no / partial)`);
    }
    for (const col of cols) if (col.icon && !isIcon(col.icon)) err(`icon "${col.icon}" isn't in the icon set`);
  }

  if (s.template === "Slider") {
    for (const k of ["before", "after"]) {
      const h = st[k] as St | undefined;
      if (!h?.id) { err(`Slider needs ${k}: { id, title, nodes }`); continue; }
      const n = (h.nodes ?? []).length;
      if (n < 1 || n > 4) err(`${k} needs 1–4 nodes, has ${n}`);
      if (String(h.result ?? "").length > 8) warn(`${k} result "${h.result}" is long (≤8 characters, it is big)`);
    }
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
export const DIAGRAMS = new Set(["FlowDiagram", "Sequence", "Split", "BeforeAfter", "Decision", "Tiers", "MetricChart", "Zoom", "Timeline", "Snippet", "StateMachine", "Tree", "Transform", "Ring", "Cells", "Stream", "Cluster", "Fleet", "Map", "Estimate", "Chat", "Diorama", "Matrix", "Slider"]);
/** Fixed bookends, never counted for variety. */
const BOOKENDS = new Set(["Hook", "GistCard", "BigPicture", "Stat"]);
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
