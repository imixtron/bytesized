// FlowDiagram template: nodes laid out automatically in top → bottom layers, wires from `links`,
// and packets driven by beats. Verbs: appear, highlight, state, shake, send, reroute, dim/undim.
// A scene with `stage.reuse: <scene id>` shows the same diagram, picking up where it ended.
import type { ReactElement } from "react";
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { pop } from "../motion/motion";
import { Packet, Wires, back, flowPath, travelFrames } from "../parts/Flow";
import { Node, type NodeState } from "../parts/Node";
import { tokens } from "../theme/tokens";
import {
  Headline, clamp01, finalStates, findScene, firstAt, localBeats, logoPath, stateAt, stateEvents, type Ctx, type LocalBeat,
} from "./common";

type FlowStage = { layers?: string[][]; nodes?: NodeSpec[]; links?: [string, string][]; reuse?: string };
type Box = { x: number; y: number; w: number; h: number; labelSide: "below" | "right" };

const SIZE: Partial<Record<NodeSpec["type"], [number, number]>> = {
  phone: [120, 110], user: [120, 120], lb: [150, 150], server: [170, 130], db: [130, 110], cache: [140, 130], queue: [170, 110], brand: [200, 200],
};
const sizeOf = (n: NodeSpec) => SIZE[n.type] ?? [150, 130];
const PACKET_GAP = 4; // frames between packets of one send
const AMBIENT_EVERY = 14; // frames between background packets once traffic has started

const LABEL_H = 60; // space a "below" label needs
const MIN_GAP = 24;

/** Lays out layers top → bottom inside the stage. Nodes shrink (never below 70%) if the layers
 *  don't fit; spare room is spread evenly between layers. */
export function layoutFlow(stage: FlowStage, hasHeadline: boolean): Map<string, Box> {
  const { safe, zones } = tokens.layout;
  const layers = stage.layers ?? [];
  const byId = new Map((stage.nodes ?? []).map((n) => [n.id, n]));
  const top = (hasHeadline ? zones.stage.y[0] : zones.headline.y[0]) + 20;
  const bottom = zones.stage.y[1] - 20;
  const width = safe.right - safe.left;
  const rows = layers.map((ids) => {
    const sizes = ids.map((id) => (byId.get(id) ? sizeOf(byId.get(id)!) : ([150, 130] as [number, number])));
    return { ids, sizes, h: Math.max(...sizes.map((s) => s[1])), label: ids.length > 1 ? LABEL_H : 0 };
  });
  const need = rows.reduce((n, r) => n + r.h + r.label, 0) + MIN_GAP * Math.max(0, rows.length - 1);
  const k = Math.max(0.7, Math.min(1, (bottom - top) / need));
  const used = rows.reduce((n, r) => n + r.h * k + r.label, 0);
  const maxGap = tokens.layout.stageContent.maxGap;
  const gap = rows.length > 1 ? Math.min(maxGap, Math.max(MIN_GAP, (bottom - top - used) / (rows.length - 1))) : 0;
  const out = new Map<string, Box>();
  // centre the whole diagram when it doesn't need the full height
  let y = top + Math.max(0, (bottom - top - used - gap * Math.max(0, rows.length - 1)) / 2);
  for (const r of rows) {
    const cy = y + (r.h * k) / 2;
    r.ids.forEach((id, i) => {
      const [w, h] = r.sizes[i];
      const x = r.ids.length === 1 ? safe.left + width / 2 : safe.left + ((i + 0.5) * width) / r.ids.length;
      out.set(id, { x, y: cy, w: w * k, h: h * k, labelSide: r.ids.length === 1 ? "right" : "below" });
    });
    y += r.h * k + r.label + gap;
  }
  return out;
}

type Link = { from: string; to: string; d: string };
type Shot = { d: string; start: number; kind: "request" | "response" };

export const FlowDiagram = ({ ctx }: { ctx: Ctx }) => {
  const f = useCurrentFrame();
  const { scene } = ctx.ts;
  const own = scene.stage as FlowStage;
  const reused = own.reuse ? findScene(ctx, own.reuse) : undefined;
  const stage: FlowStage = reused ? { ...(reused.scene.stage as FlowStage), ...own, reuse: undefined } : own;
  const nodes = stage.nodes ?? [];
  // every scene sharing this diagram uses one layout, so nodes never jump between scenes
  const groupId = own.reuse ?? scene.id;
  const group = ctx.timeline.scenes.filter((t) => t.scene.id === groupId || (t.scene.stage as FlowStage).reuse === groupId);
  const layout = layoutFlow(stage, group.some((t) => Boolean(t.scene.headline)));
  const beats = localBeats(ctx.ts);
  const initial: Record<string, NodeState> = reused ? finalStates(reused, nodes) : {};

  const links: Link[] = (stage.links ?? []).flatMap(([a, b]) => {
    const A = layout.get(a);
    const B = layout.get(b);
    return A && B ? [{ from: a, to: b, d: flowPath({ x: A.x, y: A.y + A.h / 2 }, { x: B.x, y: B.y - B.h / 2 }) }] : [];
  });
  const incoming = (id: string) => links.filter((l) => l.to === id);
  const outgoing = (id: string) => links.filter((l) => l.from === id);

  // nodes that traffic avoids from a given frame (down, or rerouted away)
  const blocked: { id: string; at: number }[] = [
    ...beats.filter((b) => b.do === "reroute").flatMap((b) => b.targets.map((id) => ({ id, at: b.at }))),
    ...beats.filter((b) => b.do === "state" && b.args?.to === "down").flatMap((b) => b.targets.map((id) => ({ id, at: b.at }))),
    ...Object.entries(initial).filter(([, s]) => s === "down").map(([id]) => ({ id, at: -1e9 })),
  ];
  const recovered = (id: string, at: number) =>
    beats.some((b) => b.do === "state" && b.targets.includes(id) && b.args?.to === "recovered" && b.at <= at);
  const isBlocked = (id: string, at: number) => blocked.some((x) => x.id === id && x.at <= at) && !recovered(id, at);

  // packets from beats
  const shots: Shot[] = [];
  const linksFor = (b: LocalBeat) =>
    b.targets.flatMap((id) => (incoming(id).length && b.args?.kind !== "response" ? incoming(id) : outgoing(id).length ? outgoing(id) : incoming(id)));
  for (const b of beats) {
    if (b.do === "send") {
      const kind = (b.args?.kind as "request" | "response") ?? "request";
      const ls = linksFor(b).filter((l) => !isBlocked(l.to, b.at));
      const count = Number(b.args?.count ?? ls.length);
      for (let k = 0; k < count && ls.length; k++) {
        const l = ls[k % ls.length];
        shots.push({ d: kind === "response" ? back(l.d) : l.d, start: b.at + k * PACKET_GAP, kind });
      }
    }
    if (b.do === "reroute") {
      const to = (b.args?.to as string[]) ?? [];
      to.flatMap((id) => incoming(id)).forEach((l, k) => shots.push({ d: l.d, start: b.at + k * PACKET_GAP, kind: "request" }));
    }
  }

  // ambient traffic keeps the diagram alive once requests have started
  const firstSend = reused ? 0 : beats.find((b) => b.do === "send")?.at;
  const ambient: Shot[] = [];
  if (firstSend !== undefined) {
    const sources = nodes.filter((n) => incoming(n.id).length === 0).map((n) => n.id);
    for (let t = firstSend + 20, k = 0; t < ctx.ts.duration; t += AMBIENT_EVERY, k++) {
      const src = sources[Math.floor(random(`${scene.id}-src-${k}`) * sources.length)];
      const first = outgoing(src)[0];
      if (!first) continue;
      const next = outgoing(first.to).filter((l) => !isBlocked(l.to, t));
      const hop = next[Math.floor(random(`${scene.id}-hop-${k}`) * next.length)];
      ambient.push({ d: first.d, start: t, kind: "request" });
      if (hop) ambient.push({ d: hop.d, start: t + travelFrames(first.d), kind: "request" });
    }
  }

  const packets: ReactElement[] = [...shots, ...ambient].map((s, i) => (
    <Packet key={i} d={s.d} kind={s.kind} progress={(f - s.start) / travelFrames(s.d)} />
  ));

  const liveFrom = (l: Link) => Math.min(...[...shots, ...ambient].filter((s) => s.d === l.d || s.d === back(l.d)).map((s) => s.start), Infinity);

  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Wires
        paths={links.map((l) => {
          const dead = isBlocked(l.to, f);
          return { d: l.d, live: !dead && (reused ? true : f >= liveFrom(l)), alpha: dead ? 0.35 : clamp01(appearOf(l.from) + 0.2) * clamp01(appearOf(l.to) + 0.2) };
        })}
      />
      {packets}
      {nodes.map((n, i) => {
        const box = layout.get(n.id);
        if (!box) return null;
        const s = stateAt(stateEvents(beats, n.id, n.family), initial[n.id] ?? "idle", f);
        const shakeAt = firstAt(beats, ["shake"], n.id);
        const hi = firstAt(beats, ["highlight"], n.id);
        const pulse = hi !== undefined && f >= hi && n.family !== "outlined" ? Math.sin(clamp01((f - hi) / 12) * Math.PI) * 0.12 : 0;
        return (
          <Node
            key={n.id} type={n.type} family={n.family} x={box.x} y={box.y} w={box.w} h={box.h} label={n.label} labelSide={box.labelSide}
            logo={n.type === "brand" && n.logo ? logoPath(n.logo) : undefined}
            enter={appearOf(n.id, i) + pulse} state={s.state} from={s.from} t={s.t} badgeIn={pop(f, s.since)}
            shake={shakeAt !== undefined ? clamp01((f - shakeAt) / tokens.motion.shake.frames) : 0}
          />
        );
      })}
    </AbsoluteFill>
  );

  // entrance: explicit appear beat, else a quick staggered build at the scene start (none when reused)
  function appearOf(id: string, i = 0) {
    if (reused) return 1;
    const at = firstAt(beats, ["appear"], id);
    return pop(f, at ?? i * tokens.motion.stagger.frames);
  }
};
