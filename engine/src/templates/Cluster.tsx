// Cluster template (v1.10 proposal): a group of nodes that must agree. A leader sits among 3–5 nodes;
// each `send` fans a write out from the leader, followers answer with a ✓ as it reaches them, and the
// centre counts acks against the majority needed ("3 / 5"). A node that goes `down` can't answer; if the
// leader goes down, the next `highlight` on a node makes it the new leader.
// stage: { nodes: [{ id, type, label }] (3–5; `type` picks the icon, e.g. server or db), leader: node id }
// Verbs: appear / reveal (a node), send (the leader fans a write out), state (`to: down` / `recovered`),
// highlight (that node becomes the leader), shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { pop, tween } from "../motion/motion";
import { Svg } from "../parts/Diagram";
import { Packet, travelFrames } from "../parts/Flow";
import { Node } from "../parts/Node";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, localBeats, mixColor, stateAt, stateEvents, type Ctx } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type ClusterNode = { id: string; type: NodeSpec["type"]; label: string };
export type ClusterStage = { nodes?: ClusterNode[]; leader?: string };

const c = tokens.color;
const N = 150;

export const Cluster = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><ClusterBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export function clusterLayout(n: number, box: Pick<Box, "w" | "h">) {
  const rx = Math.min(box.w / 2 - N / 2 - 30, 330);
  const ry = Math.min(box.h / 2 - N / 2 - 60, 420);
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: box.w / 2 + Math.cos(a) * rx, y: box.h / 2 + Math.sin(a) * ry };
  });
}

export const ClusterBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as ClusterStage;
  const nodes = (stage.nodes ?? []).slice(0, 5);
  const beats = localBeats(ctx.ts);
  const pos = new Map(nodes.map((n, i) => [n.id, clusterLayout(nodes.length, box)[i]]));
  const nAt = new Map(nodes.map((n, i) => [n.id, firstAt(beats, ["reveal", "appear"], n.id) ?? i * 8]));
  const need = Math.floor(nodes.length / 2) + 1;

  const downAt = (id: string, t: number) => {
    let down = false;
    for (const b of beats) if (b.at <= t && b.targets.includes(id) && b.do === "state") down = b.args?.to === "down";
    return down;
  };
  // leader changes: the initial one, then each highlight on a node
  const leaderAt = (t: number) => {
    let l = stage.leader ?? nodes[0]?.id;
    for (const b of beats) if (b.do === "highlight" && b.at <= t) { const id = b.targets.find((x) => nodes.some((nn) => nn.id === x)); if (id) l = id; }
    return l;
  };
  const leader = leaderAt(f);
  const leaderSince = (() => { let at = 0; for (const b of beats) if (b.do === "highlight" && b.at <= f && b.targets.some((x) => x === leader)) at = b.at; return at; })();

  // write rounds: each `send` fans out from the leader at that moment
  const rounds = beats.filter((b) => b.do === "send").map((b) => ({ at: b.at, from: leaderAt(b.at) }));
  const lastRound = [...rounds].reverse().find((r) => f >= r.at);
  const pathTo = (from: string, to: string) => {
    const a = pos.get(from)!;
    const b = pos.get(to)!;
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  };
  const acked = lastRound
    ? nodes.filter((n) => n.id !== lastRound.from && !downAt(n.id, lastRound.at) && f >= lastRound.at + travelFrames(pathTo(lastRound.from, n.id))).length + (downAt(lastRound.from, lastRound.at) ? 0 : 1)
    : 0;
  const committed = acked >= need;
  const cK = lastRound ? tween(f, lastRound.at, 10) : 0;

  return (
    <>
      <Svg>
        {nodes.map((n) => {
          if (n.id === leader) return null;
          const k = Math.min(clamp01((f - Math.max(nAt.get(n.id)!, nAt.get(leader ?? "") ?? 0) - 6) / 14), 1);
          const a = pos.get(leader ?? "");
          const b = pos.get(n.id)!;
          if (!a || k <= 0) return null;
          return <line key={n.id} x1={a.x} y1={a.y} x2={a.x + (b.x - a.x) * k} y2={a.y + (b.y - a.y) * k} stroke={c.line} strokeWidth={5} strokeDasharray="10 16" strokeLinecap="round" />;
        })}
      </Svg>
      {lastRound && nodes.filter((n) => n.id !== lastRound.from).map((n) => {
        if (downAt(n.id, lastRound.at)) return null;
        const d = pathTo(lastRound.from, n.id);
        return <Packet key={`pk-${n.id}-${lastRound.at}`} d={d} progress={(f - lastRound.at) / travelFrames(d)} />;
      })}
      <div style={{ position: "absolute", left: box.w / 2 - 150, width: 300, top: box.h / 2 - 70, height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", borderRadius: 40, border: `${tokens.node.stroke}px solid ${committed ? c.ok : lastRound ? c.warn : c.line}`, background: c.surface, opacity: Math.min(1, pop(f, 10) * 1.5), transform: `scale(${0.9 + 0.1 * cK})` }}>
        <div style={{ font: `800 68px/1 ${fonts.display}`, color: committed ? c.ok : lastRound ? c.warn : c.cream3 }}>{lastRound ? `${acked}/${nodes.length}` : `–/${nodes.length}`}</div>
        <div style={{ marginTop: 6, font: `700 ${tokens.type.label.size - 6}px ${fonts.mono}`, color: c.cream2 }}>{committed ? "committed" : `need ${need}`}</div>
      </div>
      {nodes.map((n) => {
        const p = pos.get(n.id)!;
        const st = stateAt(stateEvents(beats, n.id, "outlined"), "idle", f);
        const isLeader = n.id === leader;
        const ackedNow = lastRound && n.id !== lastRound.from && !downAt(n.id, lastRound.at) && f >= lastRound.at + travelFrames(pathTo(lastRound.from, n.id));
        const shakeAt = firstAt(beats, ["shake"], n.id);
        return (
          <div key={n.id}>
            <Node type={n.type ?? "server"} family={isLeader ? "hero" : "outlined"} x={p.x} y={p.y} w={N} h={N} label={n.label}
              enter={pop(f, nAt.get(n.id)!)} state={isLeader && st.state !== "down" ? "idle" : st.state} from={st.from} t={st.t} badgeIn={pop(f, st.since)}
              shake={shakeAt !== undefined ? clamp01((f - shakeAt) / tokens.motion.shake.frames) : 0} />
            {isLeader && !downAt(n.id, f) && (
              <div style={{ position: "absolute", left: p.x - 70, width: 140, top: p.y - N / 2 - 52, textAlign: "center", font: `800 28px ${fonts.mono}`, color: c.ember, transform: `scale(${pop(f, leaderSince)})`, opacity: Math.min(1, pop(f, leaderSince) * 1.5) }}>leader</div>
            )}
            {ackedNow && (
              <div style={{ position: "absolute", left: p.x + N / 2 - 30, top: p.y - N / 2 - 14, width: 56, height: 56, borderRadius: "50%", background: c.ok, border: `6px solid ${c.charcoal}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${pop(f, lastRound!.at + travelFrames(pathTo(lastRound!.from, n.id)))})` }}>
                <svg width="60%" height="60%" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={c.charcoal} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
