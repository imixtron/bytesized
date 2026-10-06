// Split template (v1.5; also draws `BeforeAfter`): the same idea twice, stacked top and
// bottom (a 9:16 frame is too narrow for left/right). Each half is a titled row of nodes wired
// left → right. Variants: `compare` (default) and `race` (both halves send at once and the faster
// one finishes first, showing its result). Verbs: appear, send, race, highlight, state, shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { pop } from "../motion/motion";
import { Chip, Label, Svg } from "../parts/Diagram";
import { Packet, Wires, back, chain, travelFrames } from "../parts/Flow";
import type { IconName } from "../parts/icons";
import { Node } from "../parts/Node";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, focusLevels, highlightEvents, localBeats, logoPath, stateAt, stateEvents, type Ctx, type LocalBeat } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type Half = { id: string; title: string; nodes?: NodeSpec[]; note?: string; result?: string; slow?: number };
export type SplitStage = { variant?: "compare" | "race"; before?: Half; after?: Half };

const c = tokens.color;
const D = tokens.diagram;
const RACE_MIN = 20; // frames for the fastest half, so a race is readable
const SEND_MIN = 14; // short hops still read as a trip

export const Split = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><SplitBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const SplitBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as SplitStage;
  const halves = [stage.before, stage.after].filter(Boolean) as Half[];
  const beats = localBeats(ctx.ts);
  const H = (box.h - D.split.gap) / 2;
  const lastHi = [...beats].reverse().find((b) => b.do === "highlight" && f >= b.at && halves.some((h) => b.targets.includes(h.id)));
  const focus = lastHi?.targets.find((t) => halves.some((h) => h.id === t));
  const halfEvents = highlightEvents(beats, halves.map((h) => h.id)); // the other half fades back (v1.6.1)
  const dividerK = pop(f, 4);
  // in a race, the half with the smaller `slow` wins
  const winner = stage.variant === "race" ? [...halves].sort((a, b) => (a.slow ?? 1) - (b.slow ?? 1))[0]?.id : undefined;

  return (
    <>
      <Svg>
        <line x1={0} x2={box.w * dividerK} y1={H + D.split.gap / 2} y2={H + D.split.gap / 2} stroke={c.line} strokeWidth={4} strokeDasharray={D.lane.dash.join(" ")} strokeLinecap="round" />
      </Svg>
      {halves.map((half, hi) => (
        <div key={half.id} style={{ position: "absolute", left: 0, top: hi * (H + D.split.gap), width: box.w, height: H, opacity: 1 - 0.58 * focusLevels(halfEvents, half.id, f).dim }}>
          <HalfBody half={half} hi={hi} w={box.w} h={H} f={f} beats={beats} variant={stage.variant ?? "compare"} on={focus === half.id} winner={winner === half.id} />
        </div>
      ))}
    </>
  );
};

const HalfBody = ({ half, hi, w, h, f, beats, variant, on, winner }: { half: Half; hi: number; w: number; h: number; f: number; beats: LocalBeat[]; variant: string; on: boolean; winner: boolean }) => {
  const nodes = half.nodes ?? [];
  const N = nodes.length > 3 ? D.split.node - 20 : D.split.node;
  const y = h * 0.52;
  const xs = nodes.map((_, i) => (w * (i + 0.5)) / nodes.length);
  const halfAt = firstAt(beats, ["appear", "reveal"], half.id) ?? hi * 10;
  const nodeAt = (n: NodeSpec, i: number) => firstAt(beats, ["appear"], n.id) ?? halfAt + 4 + i * tokens.motion.stagger.frames;
  const segs = nodes.slice(1).map((_, i) => `M ${xs[i] + N / 2 + 6} ${y} L ${xs[i + 1] - N / 2 - 6} ${y}`);

  // packets: send (to a node, or the whole row) and race (whole row, timed by `slow`)
  const shots: { d: string; start: number; frames: number; kind: "request" | "response" }[] = [];
  let finish: number | undefined;
  for (const b of beats) {
    const mine = b.targets.includes(half.id) || (b.do === "race" && b.targets.length === 0);
    if (!mine || (b.do !== "send" && b.do !== "race")) continue;
    const toIdx = b.args?.to ? Math.max(1, nodes.findIndex((n) => n.id === b.args!.to)) : nodes.length - 1;
    const d = chain(...segs.slice(0, toIdx));
    if (!d) continue;
    const frames = b.do === "race" ? Math.round(Math.max(RACE_MIN, travelFrames(d)) * (half.slow ?? 1)) : Math.max(SEND_MIN, travelFrames(d));
    if (b.args?.kind === "response") shots.push({ d: back(d), start: b.at, frames, kind: "response" });
    else if (b.args?.kind === "roundtrip") {
      shots.push({ d, start: b.at, frames, kind: "request" });
      shots.push({ d: back(d), start: b.at + frames + 4, frames, kind: "response" });
      finish = Math.max(finish ?? 0, b.at + 2 * frames + 4);
    } else shots.push({ d, start: b.at, frames, kind: "request" });
    if (b.do === "race") finish = b.at + frames;
  }
  const firstShot = Math.min(...shots.map((s) => s.start), Infinity);
  const resultAt = half.result ? (variant === "race" ? finish : firstAt(beats, ["highlight", "reveal"], half.id) ?? finish) : undefined;

  return (
    <>
      <Chip x={0} y={36} text={half.title.toUpperCase()} on={on} k={pop(f, halfAt)} />
      {half.result && resultAt !== undefined && f >= resultAt && (
        <div style={{ position: "absolute", right: 0, top: 36, transform: `translateY(-50%) scale(${pop(f, resultAt)})`, transformOrigin: "right center", font: `800 44px ${fonts.display}`, color: on || winner ? c.ember : c.cream2 }}>
          {half.result}
        </div>
      )}
      <Wires paths={segs.map((d, i) => ({ d, live: f >= firstShot, alpha: clamp01(pop(f, nodeAt(nodes[i], i))) * clamp01(pop(f, nodeAt(nodes[i + 1], i + 1))) }))} />
      {shots.map((s, i) => <Packet key={i} d={s.d} kind={s.kind} progress={(f - s.start) / s.frames} />)}
      {nodes.map((n, i) => {
        const st = stateAt(stateEvents(beats, n.id, n.family), "idle", f);
        const shakeAt = firstAt(beats, ["shake"], n.id);
        return (
          <Node key={n.id} type={n.type} family={n.family} icon={n.icon as IconName | undefined} x={xs[i]} y={y} w={N} h={N} label={n.label}
            logo={n.type === "brand" && n.logo ? logoPath(n.logo) : undefined} enter={pop(f, nodeAt(n, i))} state={st.state} from={st.from} t={st.t} badgeIn={pop(f, st.since)}
            shake={shakeAt !== undefined ? clamp01((f - shakeAt) / tokens.motion.shake.frames) : 0} />
        );
      })}
      {half.note && <Label x={w / 2} y={h - 22} text={half.note} color={on ? c.cream : c.cream2} k={pop(f, (firstAt(beats, ["reveal"], half.id) ?? halfAt) + 8)} />}
    </>
  );
};
