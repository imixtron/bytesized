// Decision template (v1.5): a start node, 1–3 question diamonds down a spine, a "yes"
// outcome at the bottom and "no" outcomes branching right (shared when checks reuse one; `retry`
// draws a dashed loop back to the start). `branch` moves a packet through a check and lights the
// path it takes. Verbs: appear, branch (args.to: yes|no), highlight, state, shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { pop } from "../motion/motion";
import { Arrow, Diamond, Label, Svg } from "../parts/Diagram";
import { Packet, chain, travelFrames } from "../parts/Flow";
import type { IconName } from "../parts/icons";
import { Node, type NodeState } from "../parts/Node";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, localBeats, stateAt, stateEvents, type Ctx } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type Outcome = { id: string; label: string; type?: NodeSpec["type"]; icon?: string; tone?: "ok" | "down"; retry?: boolean };
export type Check = { id: string; q: string; no?: Outcome | string };
export type DecisionStage = { start?: NodeSpec; checks?: Check[]; yes?: Outcome };

const c = tokens.color;
const D = tokens.diagram;
const GAP_MIN = 56;

export function layoutDecision(stage: DecisionStage, box: Pick<Box, "w" | "h">) {
  const checks = stage.checks ?? [];
  const outcomes = new Map<string, { o: Outcome; checks: number[] }>();
  checks.forEach((ch, i) => {
    if (!ch.no) return;
    const id = typeof ch.no === "string" ? ch.no : ch.no.id;
    const prev = outcomes.get(id);
    if (prev) prev.checks.push(i);
    else if (typeof ch.no !== "string") outcomes.set(id, { o: ch.no, checks: [i] });
  });
  const hasNo = outcomes.size > 0;
  const startN = 120;
  const O = D.outcome.node;
  const sizes = [startN, ...checks.map(() => D.diamond.h), O];
  const loopRoom = [...outcomes.values()].some((o) => o.o.retry) ? 70 : 0; // the retry loop runs over the start
  const need = sizes.reduce((a, b) => a + b, 0) + GAP_MIN * (sizes.length - 1) + 40 + loopRoom;
  const k = Math.max(0.72, Math.min(1, box.h / need));
  const used = sizes.reduce((a, b) => a + b * k, 0);
  const gap = Math.min(110, (box.h - 40 - loopRoom - used) / (sizes.length - 1));
  const ys: number[] = [];
  let y = loopRoom + Math.max(0, (box.h - 40 - loopRoom - used - gap * (sizes.length - 1)) / 2);
  for (const s of sizes) { ys.push(y + (s * k) / 2); y += s * k + gap; }
  const dw = D.diamond.w * k;
  const sx = hasNo ? dw / 2 + 10 : box.w / 2;
  const ox = box.w - (O * k) / 2 - 40;
  const out = new Map([...outcomes.entries()].map(([id, v]) => [id, { ...v, x: ox, y: v.checks.reduce((a, i) => a + ys[i + 1], 0) / v.checks.length }]));
  return { k, ys, sx, dw, dh: D.diamond.h * k, startN: startN * k, O: O * k, out, sizes: sizes.map((s) => s * k), loopY: ys[0] - (startN * k) / 2 - 44 };
}

export const Decision = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><DecisionBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const DecisionBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as DecisionStage;
  const checks = stage.checks ?? [];
  const start = stage.start;
  const yes = stage.yes;
  const L = layoutDecision(stage, box);
  const beats = localBeats(ctx.ts);
  const n = checks.length;

  // spine items: start, checks…, yes. Segment i runs from item i's bottom to item i+1's top.
  const spine = L.sizes.slice(0, -1).map((s, i) => `M ${L.sx} ${L.ys[i] + s / 2 + 4} L ${L.sx} ${L.ys[i + 1] - L.sizes[i + 1] / 2 - 4}`);
  const noSeg = (i: number) => {
    const id = typeof checks[i].no === "string" ? (checks[i].no as string) : (checks[i].no as Outcome | undefined)?.id;
    const o = id ? L.out.get(id) : undefined;
    if (!o) return null;
    const x1 = L.sx + L.dw / 2 + 4;
    const y1 = L.ys[i + 1];
    const x2 = o.x - L.O / 2 - 14;
    const mx = (x1 + x2) / 2;
    return { id: id!, d: Math.abs(o.y - y1) < 2 ? `M ${x1} ${y1} L ${x2} ${o.y}` : `M ${x1} ${y1} C ${mx} ${y1} ${mx} ${o.y} ${x2} ${o.y}` };
  };

  // build order: explicit appear beats, else top → bottom at the scene start
  const order = [start?.id, ...checks.map((ch) => ch.id), ...[...L.out.keys()], yes?.id].filter(Boolean) as string[];
  const appearAt = (id: string) => firstAt(beats, ["appear", "reveal"], id) ?? order.indexOf(id) * 5;
  const vis = (id: string) => pop(f, appearAt(id));
  const spineIds = [start?.id ?? "", ...checks.map((ch) => ch.id), yes?.id ?? ""];

  // packet runs from `branch` beats
  type Run = { d: string; start: number; frames: number; lit: string[]; arrive: number; at: string };
  const runs: Run[] = [];
  let pos = 0;
  for (const b of beats.filter((b) => b.do === "branch")) {
    const i = checks.findIndex((ch) => b.targets.includes(ch.id));
    if (i < 0) continue;
    const toNo = b.args?.to === "no";
    if (pos > i + 1) pos = 0; // a new packet starts from the top
    const entry = spine.slice(pos, i + 1);
    const ns = noSeg(i);
    const exit = toNo ? ns?.d : spine[i + 1];
    if (!exit) continue;
    const d = chain(...entry, exit);
    const frames = travelFrames(d);
    runs.push({ d, start: b.at, frames, lit: [...entry, exit], arrive: b.at + frames, at: toNo ? ns!.id : i + 1 < n ? checks[i + 1].id : yes?.id ?? "" });
    pos = toNo ? 0 : i + 2;
  }
  const litFrom = (d: string) => Math.min(...runs.filter((r) => r.lit.includes(d)).map((r) => r.start), Infinity);
  const lastArrival = runs.filter((r) => f >= r.arrive).at(-1);
  const hi = [...beats].reverse().find((b) => b.do === "highlight" && f >= b.at)?.targets[0];
  const focus = hi ?? (runs.some((r) => f >= r.start && f < r.arrive) ? undefined : lastArrival?.at);

  const arrowColor = (d: string) => (f >= litFrom(d) ? c.orange : c.cream3);
  const outcomeState = (o: Outcome): NodeState => {
    const reached = runs.find((r) => r.at === o.id && f >= r.arrive);
    if (reached) return o.tone === "ok" ? "recovered" : o.tone === "down" ? "down" : "active";
    return "idle";
  };

  return (
    <>
      <Svg>
        {spine.map((d, i) => (
          <Arrow key={`s${i}`} d={d} color={arrowColor(d)} progress={vis(spineIds[i]) > 0 ? clamp01((f - appearAt(spineIds[i + 1])) / 8) : 0} />
        ))}
        {checks.map((ch, i) => {
          const ns = noSeg(i);
          return ns ? <Arrow key={`n${i}`} d={ns.d} color={arrowColor(ns.d)} progress={clamp01((f - Math.max(appearAt(ch.id), appearAt(ns.id))) / 8)} /> : null;
        })}
        {[...L.out.values()].filter((o) => o.o.retry && start).map((o) => {
          const d = `M ${o.x} ${o.y - L.O / 2 - 14} L ${o.x} ${L.loopY} L ${L.sx} ${L.loopY} L ${L.sx} ${L.ys[0] - L.startN / 2 - 12}`;
          return <Arrow key={`r-${o.o.id}`} d={d} dashed color={c.cream3} progress={clamp01((f - appearAt(o.o.id) - 6) / 8)} />;
        })}
      </Svg>
      {runs.map((r, i) => <Packet key={i} d={r.d} progress={(f - r.start) / r.frames} />)}
      {checks.map((ch, i) => {
        const ns = noSeg(i);
        const k = vis(ch.id);
        const lit = (d?: string) => d !== undefined && f >= litFrom(d);
        return (
          <div key={ch.id}>
            <Diamond x={L.sx} y={L.ys[i + 1]} w={L.dw} h={L.dh} text={ch.q} k={k} state={focus === ch.id ? "active" : "idle"} />
            {i + 1 < n || yes ? <Label x={L.sx - 22} y={(L.ys[i + 1] + L.dh / 2 + L.ys[i + 2] - L.sizes[i + 2] / 2) / 2} text="yes" align="right" color={lit(spine[i + 1]) ? c.ember : c.cream2} k={k} /> : null}
            {ns && <Label x={L.sx + L.dw / 2 + 40} y={L.ys[i + 1] - 34} text="no" align="left" color={lit(ns.d) ? c.ember : c.cream2} k={k} />}
          </div>
        );
      })}
      {start && (() => {
        const st = stateAt(stateEvents(beats, start.id, start.family), "idle", f);
        return <Node type={start.type} family={start.family} icon={start.icon as IconName | undefined} x={L.sx} y={L.ys[0]} w={L.startN} h={L.startN} label={start.label} labelSide="right" enter={vis(start.id)} state={st.state} from={st.from} t={st.t} />;
      })()}
      {[...L.out.values()].map((o) => <OutcomeNode key={o.o.id} o={o.o} x={o.x} y={o.y} size={L.O} k={vis(o.o.id)} state={outcomeState(o.o)} f={f} since={runs.find((r) => r.at === o.o.id)?.arrive ?? 0} side="below" />)}
      {yes && <OutcomeNode o={yes} x={L.sx} y={L.ys[n + 1]} size={L.O} k={vis(yes.id)} state={outcomeState(yes)} f={f} since={runs.find((r) => r.at === yes.id)?.arrive ?? 0} side="right" />}
      {[...L.out.values()].filter((o) => o.o.retry && start).map((o) => (
        <Label key={`rl-${o.o.id}`} x={(L.sx + o.x) / 2} y={L.loopY} text="fix + resend" color={c.cream3} k={clamp01((f - appearAt(o.o.id) - 6) / 8)} />
      ))}
    </>
  );
};

const OutcomeNode = ({ o, x, y, size, k, state, f, since, side }: { o: Outcome; x: number; y: number; size: number; k: number; state: NodeState; f: number; since: number; side: "below" | "right" }) => {
  const icon = (o.icon ?? (o.tone === "ok" ? "check" : o.tone === "down" ? "cross" : undefined)) as IconName | undefined;
  return <Node type={o.type ?? "service"} icon={icon} x={x} y={y} w={size} h={size} label={o.label} labelSide={side} enter={k} state={state} from="idle" t={clamp01((f - since) / tokens.motion.standard.frames)} badgeIn={pop(f, since)} />;
};
