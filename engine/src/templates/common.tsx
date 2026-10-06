// Shared template plumbing: scene context, beat lookups in local frames, node state timelines,
// and the headline (which carries over without re-animating when two scenes share it).
import { useCurrentFrame } from "remotion";
import type { Episode, NodeSpec, Scene } from "../episode/schema";
import { interpolateColors } from "remotion";
import { pop, tween } from "../motion/motion";
import type { NodeState } from "../parts/Node";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import type { TimedBeat, TimedScene, Timeline } from "../timing/timeline";

const c = tokens.color;

export type Ctx = { ts: TimedScene; episode: Episode; timeline: Timeline };
export type LocalBeat = TimedBeat & { at: number };

export const localBeats = (ts: TimedScene): LocalBeat[] =>
  ts.beats.map((b) => ({ ...b, at: b.frame - ts.start })).sort((a, b) => a.at - b.at);

/** Local frame of the first beat with one of `verbs` targeting `id`, or undefined. */
export const firstAt = (beats: LocalBeat[], verbs: TimedBeat["do"][], id: string) =>
  beats.find((b) => verbs.includes(b.do) && b.targets.includes(id))?.at;

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** State timeline for one node: explicit `state` beats, plus `highlight` → active on outlined nodes. */
export type StateEvent = { at: number; to: NodeState };
export function stateEvents(beats: LocalBeat[], id: string, family: NodeSpec["family"]): StateEvent[] {
  return beats.flatMap((b): StateEvent[] => {
    if (!b.targets.includes(id)) return [];
    if (b.do === "state") return [{ at: b.at, to: (b.args?.to as NodeState) ?? "idle" }];
    if (b.do === "highlight" && family === "outlined") return [{ at: b.at, to: "active" }];
    if (b.do === "dim") return [{ at: b.at, to: "dimmed" }];
    if (b.do === "undim") return [{ at: b.at, to: "idle" }];
    return [];
  });
}

export function stateAt(events: StateEvent[], initial: NodeState, f: number) {
  let state = initial;
  let from = initial;
  let since = -1e9;
  for (const e of events) {
    if (f < e.at) break;
    from = state;
    state = e.to;
    since = e.at;
  }
  return { state, from, since, t: clamp01((f - since) / tokens.motion.standard.frames) };
}

/** Final state of each node at the end of a scene (for scenes that `reuse` it). */
export function finalStates(scene: TimedScene, nodes: NodeSpec[]): Record<string, NodeState> {
  const beats = localBeats(scene);
  return Object.fromEntries(nodes.map((n) => [n.id, stateAt(stateEvents(beats, n.id, n.family), "idle", Infinity).state]));
}

export const findScene = (ctx: Ctx, id: string) => ctx.timeline.scenes.find((s) => s.scene.id === id);
export const prevScene = (ctx: Ctx): Scene | undefined => ctx.timeline.scenes[ctx.ts.index - 1]?.scene;

/** Logo image for a brand node, by convention. */
export const logoPath = (brand: string) => `assets/logos/${brand}/derived/node.png`;

export function AccentText({ text, accent, color = c.ember, on = true }: { text: string; accent: string; color?: string; on?: boolean }) {
  const i = text.toLowerCase().indexOf(accent.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color: on ? color : "inherit", transition: "none" }}>{text.slice(i, i + accent.length)}</span>
      {text.slice(i + accent.length)}
    </>
  );
}

/** Scene headline (design language §3–4). Doesn't re-animate if the previous scene shows the same text. */
export function Headline({ ctx }: { ctx: Ctx }) {
  const f = useCurrentFrame();
  const h = ctx.ts.scene.headline;
  if (!h) return null;
  const carried = prevScene(ctx)?.headline?.text === h.text;
  const k = carried ? 1 : pop(f, 0);
  const { safe, zones } = tokens.layout;
  return (
    <div
      style={{
        position: "absolute", left: safe.left, top: zones.headline.y[0], width: safe.right - safe.left,
        font: `800 ${tokens.type.headline.size}px/${tokens.type.headline.lineHeight} ${fonts.display}`, letterSpacing: "-.01em", color: c.cream, textWrap: "balance",
        transform: `translateY(${(1 - k) * 30}px)`, opacity: Math.min(1, k * 1.4),
      }}
    >
      <AccentText text={h.text} accent={h.accent} />
    </div>
  );
}

/** The usable stage: under the headline if there is one, else the headline zone joins it.
 *  Content is centred inside it (design language v1.2 §4). */
export function stageBox(scene: Scene, hasHeadline = Boolean(scene.headline)) {
  const { zones } = tokens.layout;
  const top = hasHeadline ? zones.stage.y[0] : zones.headline.y[0];
  const bottom = zones.stage.y[1];
  return { top, bottom, center: (top + bottom) / 2 };
}
/** Top y that vertically centres a block of height `h` in the stage. */
export const centredTop = (scene: Scene, h: number) => stageBox(scene).center - h / 2;

// ---------------------------------------------------------------- focus fades (design language v1.6.1)
/** A change of focus: `id` becomes the focus. `explicit` (a highlight) also pushes everything else back;
 *  a plain reveal only marks the newest item. */
export type FocusEvent = { at: number; id?: string; explicit: boolean };

/** How focused (`on`) and how pushed back (`dim`) an item is at frame f, 0→1, easing over the standard
 *  motion between focus changes instead of jumping in one frame. */
export function focusLevels(events: FocusEvent[], id: string, f: number) {
  const target = (e?: FocusEvent) => ({ on: e?.id === id ? 1 : 0, dim: e?.explicit && e.id !== undefined && e.id !== id ? 1 : 0 });
  const past = events.filter((e) => f >= e.at).sort((x, y) => x.at - y.at);
  const cur = past.at(-1);
  const a = target(past.at(-2));
  const b = target(cur);
  const t = cur ? tween(f, cur.at, tokens.motion.standard.frames) : 1;
  return { on: a.on + (b.on - a.on) * t, dim: a.dim + (b.dim - a.dim) * t };
}

/** Colour blend for focus fades. */
export const mixColor = (a: string, b: string, t: number) => (t <= 0 ? a : t >= 1 ? b : interpolateColors(t, [0, 1], [a, b]));

/** Focus events from highlight beats (explicit) on the given ids. */
export const highlightEvents = (beats: LocalBeat[], ids: string[]): FocusEvent[] =>
  beats.filter((b) => b.do === "highlight").flatMap((b) => {
    const id = b.targets.find((t) => ids.includes(t));
    return id ? [{ at: b.at, id, explicit: true }] : [];
  });

/** A faint dashed slot where something will appear, drawn from the scene start so the stage is never
 *  empty before the first named word (design language v1.6.1). */
export const GhostSlot = ({ x, y, w, h, radius = 30, k = 1 }: { x: number; y: number; w: number; h: number; radius?: number; k?: number }) => (
  <div style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: radius, border: `4px dashed ${c.line}`, opacity: Math.min(1, k * 1.4) * tokens.motion.ghost.opacity }} />
);
