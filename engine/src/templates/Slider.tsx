// Slider template (v1.11 proposal): a before / after comparison as a wipe. Both sides fill the whole stage
// (title chip, a column of nodes, a note, a big result). A divider with a handle sweeps across: reveal
// "after" and the wipe runs left → right; reveal "before" and it runs back.
// stage: { before: { id, title, nodes: [node] (1–4), note?, result? }, after: { …same… } }
// Verbs: reveal / appear (target the side's id: sweep the divider to it; default: `after` at frame 50),
// highlight (pulse a side's result).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { ease, pop, tween } from "../motion/motion";
import { Arrow, Chip, Svg } from "../parts/Diagram";
import type { IconName } from "../parts/icons";
import { Node } from "../parts/Node";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, localBeats, logoPath, type Ctx } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type SliderSide = { id: string; title: string; nodes?: NodeSpec[]; note?: string; result?: string };
export type SliderStage = { before?: SliderSide; after?: SliderSide };

const c = tokens.color;
const SWEEP = 34;

export const Slider = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><SliderBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

const Side = ({ side, box, tone, f }: { side: SliderSide; box: Pick<Box, "w" | "h">; tone: "before" | "after"; f: number }) => {
  const nodes = (side.nodes ?? []).slice(0, 4);
  const N = nodes.length >= 4 ? 120 : 150;
  const top = 100;
  const bottom = side.result ? 230 : 90;
  const span = box.h - top - bottom;
  const gap = nodes.length > 1 ? (span - nodes.length * N) / (nodes.length - 1) : 0;
  const cx = box.w / 2;
  const yOf = (i: number) => top + (nodes.length > 1 ? i * (N + gap) : span / 2 - N / 2) + N / 2;
  return (
    <div style={{ position: "absolute", inset: 0, background: c.charcoal }}>
      <Chip x={30} y={34} text={side.title} on={tone === "after"} />
      <Svg>
        {nodes.slice(1).map((n, i) => <Arrow key={n.id} d={`M ${cx} ${yOf(i) + N / 2 + 12} L ${cx} ${yOf(i + 1) - N / 2 - 16}`} progress={1} color={c.cream3} width={6} />)}
      </Svg>
      {nodes.map((n, i) => (
        <Node key={n.id} type={n.type} family={n.family} icon={n.icon as IconName | undefined} x={cx} y={yOf(i)} w={N} h={N} label={n.label} labelSide="right"
          logo={n.type === "brand" && n.logo ? logoPath(n.logo) : undefined} enter={1} />
      ))}
      {side.note && <div style={{ position: "absolute", left: 20, right: 20, bottom: side.result ? 150 : 20, textAlign: "center", font: `700 34px/1.2 ${fonts.text}`, color: c.cream2 }}>{side.note}</div>}
      {side.result && <div style={{ position: "absolute", left: 20, right: 20, bottom: 14, textAlign: "center", font: `800 100px/1 ${fonts.display}`, color: tone === "after" ? c.ember : c.cream }}>{side.result}</div>}
    </div>
  );
};

export const SliderBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as SliderStage;
  const before = stage.before;
  const after = stage.after;
  const beats = localBeats(ctx.ts);
  if (!before || !after) return null;
  // where the divider is over time (0 = all before, 1 = all after), driven by reveal beats on the side ids
  const moves = beats.filter((b) => ["reveal", "appear"].includes(b.do)).flatMap((b) => (b.targets.includes(after.id) ? [{ at: b.at, to: 1 }] : b.targets.includes(before.id) ? [{ at: b.at, to: 0 }] : []));
  const seq = moves.length ? moves : [{ at: 50, to: 1 }];
  let x = 0;
  let prev = 0;
  for (const m of seq) {
    if (f >= m.at) x = prev + (m.to - prev) * tween(f, m.at, SWEEP, ease.std);
    prev = m.to;
  }
  const px = x * box.w;
  const k = pop(f, 0);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: Math.min(1, k * 1.5), borderRadius: 30, overflow: "hidden", border: `${tokens.node.stroke}px solid ${c.line}` }}>
      <Side side={before} box={box} tone="before" f={f} />
      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${box.w - px}px 0 0)` }}>
        <Side side={after} box={box} tone="after" f={f} />
      </div>
      <div style={{ position: "absolute", left: px - 3, top: 0, width: 6, height: "100%", background: c.ember }} />
      <div style={{ position: "absolute", left: Math.min(box.w - 50, Math.max(16, px - 34)), top: box.h / 2 - 34, width: 68, height: 68, borderRadius: "50%", background: c.ember, border: `6px solid ${c.charcoal}`, display: "flex", alignItems: "center", justifyContent: "center", font: `800 32px ${fonts.display}`, color: c.cream }}>⇄</div>
    </div>
  );
};
