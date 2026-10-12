// Zoom template (v1.9 proposal): dive into one node and see what's inside it.
// The `from` node sits alone, then on the `zoom` beat it grows until it IS the stage: its outline becomes
// a big frame and the parts inside pop in over it (2–4 nodes, optional links between them).
// stage: { from: node, inside: { nodes: [node], links?: [{ from, to }] } }
// Verbs: appear (the node / an inside part), zoom (start the dive), highlight / state / shake (inside parts).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { Arrow, Chip, HATCH, hatch } from "../parts/Diagram";
import { Svg } from "../parts/Diagram";
import type { IconName } from "../parts/icons";
import { ICON_FOR, Icon } from "../parts/icons";
import { Node } from "../parts/Node";
import { travelFrames } from "../parts/Flow";
import type { NodeSpec } from "../episode/schema";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, localBeats, logoPath, stateAt, stateEvents, type Ctx } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type ZoomStage = { from?: NodeSpec; inside?: { nodes?: NodeSpec[]; links?: { from: string; to: string }[] } };

const c = tokens.color;
const S = tokens.node.shadow;
const DIVE = 26;

export const Zoom = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><ZoomBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

/** Centres of n inside parts, in a frame of w × h: a column for 2, a 2-column grid for 3–4. */
export function insideLayout(n: number, w: number, h: number) {
  const top = 150;
  if (n <= 2) return Array.from({ length: n }, (_, i) => ({ x: w / 2, y: top + ((h - top) * (i + 0.5)) / Math.max(1, n) }));
  const rows = Math.ceil(n / 2);
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / 2);
    const inRow = r === rows - 1 && n % 2 === 1 ? 1 : 2;
    const col = i % 2;
    return { x: inRow === 1 ? w / 2 : w * (col ? 0.72 : 0.28), y: top + ((h - top) * (r + 0.5)) / rows };
  });
}

export const ZoomBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as ZoomStage;
  const from = stage.from;
  const inner = (stage.inside?.nodes ?? []).slice(0, 4);
  const links = stage.inside?.links ?? [];
  const beats = localBeats(ctx.ts);
  if (!from) return null;

  const appearAt = firstAt(beats, ["appear"], from.id) ?? 0;
  const zAt = firstAt(beats, ["zoom"], from.id) ?? 50;
  const d = tween(f, zAt, DIVE, ease.std);
  const small = 250;
  const w = small + (box.w - S.offset - small) * d;
  const h = small + (box.h - S.offset - small) * d;
  const cx = (box.w - S.offset) / 2;
  const cy = (box.h - S.offset) / 2;
  const hero = from.family === "hero";
  const stroke = hero ? c.orange : from.family === "solid" ? c.cream : c.cream;
  const k = pop(f, appearAt);
  const radius = 36 + (1 - d) * 8;
  const iconIn = 1 - clamp01(d * 2.2);
  const pos = insideLayout(inner.length, box.w - S.offset, box.h - S.offset);
  const pAt = inner.map((n, i) => firstAt(beats, ["appear", "reveal"], n.id) ?? zAt + DIVE + 6 + i * 16);
  const px = new Map(inner.map((n, i) => [n.id, pos[i]]));

  return (
    <>
      {/* the frame: starts as the node, ends as the stage */}
      <div style={{ position: "absolute", left: cx - w / 2, top: cy - h / 2, width: w, height: h, transform: `scale(${d > 0 ? 1 : 0.4 + 0.6 * k})`, opacity: Math.min(1, k * 1.6) }}>
        <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: radius, background: hatch(hero ? HATCH.orange : HATCH.cream), opacity: 1 - d * 0.6 }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: radius, background: from.family === "solid" || from.type === "brand" ? mixFill(d) : hero ? mixOrange(d) : c.surface, border: `${tokens.node.stroke}px solid ${stroke}`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          <div style={{ opacity: iconIn, transform: `scale(${1 + d * 1.2})` }}>
            <Icon name={(from.icon as IconName | undefined) ?? ICON_FOR[from.type as keyof typeof ICON_FOR]} size={small * tokens.node.iconScale} color={from.family === "outlined" ? c.cream : from.family === "hero" ? c.cream : c.charcoal} />
          </div>
        </div>
      </div>
      {from.label && d < 0.3 && (
        <div style={{ position: "absolute", left: cx - 200, width: 400, top: cy + small / 2 + 36, textAlign: "center", font: `700 ${tokens.type.label.size}px ${tokens.type.label.font === "mono" ? "'JetBrains Mono', monospace" : "inherit"}`, color: c.cream2, opacity: (1 - d * 3.5) * Math.min(1, k) }}>{from.label}</div>
      )}
      {d >= 0.85 && from.label && <Chip x={46} y={64} text={from.label} on k={pop(f, zAt + DIVE - 4)} />}

      <Svg>
        {links.map((l, i) => {
          const a = px.get(l.from);
          const b = px.get(l.to);
          if (!a || !b) return null;
          const at = Math.max(pAt[inner.findIndex((n) => n.id === l.from)], pAt[inner.findIndex((n) => n.id === l.to)]);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const len = Math.hypot(dx, dy) || 1;
          const m = 100; // clear of the node edges
          const dd = `M ${a.x + (dx / len) * m} ${a.y + (dy / len) * m} L ${b.x - (dx / len) * m} ${b.y - (dy / len) * m}`;
          return <Arrow key={i} d={dd} progress={(f - at) / 16} color={c.cream3} />;
        })}
      </Svg>
      {inner.map((n, i) => {
        const p = px.get(n.id)!;
        const st = stateAt(stateEvents(beats, n.id, n.family), "idle", f);
        const shakeAt = firstAt(beats, ["shake"], n.id);
        return (
          <Node key={n.id} type={n.type} family={n.family} icon={n.icon as IconName | undefined} x={p.x} y={p.y} w={170} h={170} label={n.label}
            logo={n.type === "brand" && n.logo ? logoPath(n.logo) : undefined} enter={d >= 0.5 ? pop(f, pAt[i]) : 0}
            state={st.state} from={st.from} t={st.t} badgeIn={pop(f, st.since)}
            shake={shakeAt !== undefined ? clamp01((f - shakeAt) / tokens.motion.shake.frames) : 0} />
        );
      })}
    </>
  );
};

const mixFill = (d: number) => (d > 0.6 ? c.surface : c.cream);
const mixOrange = (d: number) => (d > 0.6 ? c.surface : c.orange);
