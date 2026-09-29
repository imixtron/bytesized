// Analogy template: "X = Y" rows (up to 3), revealed one by one, plus an optional morph
// (one node whose icon flips, e.g. an app becoming a city). Verbs: reveal, appear, highlight, dim.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../motion/motion";
import { Node } from "../parts/Node";
import type { IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, centredTop, firstAt, localBeats, prevScene, stageBox, type Ctx } from "./common";

type Row = { id: string; icon: IconName; key: string; value: string };
type AnalogyStage = { rows?: Row[]; morph?: { from: IconName; to: IconName } };

const c = tokens.color;
const ROW_H = 170;
const ROW_GAP = 30;

export const Analogy = ({ ctx }: { ctx: Ctx }) => {
  const f = useCurrentFrame();
  const { scene } = ctx.ts;
  const stage = scene.stage as AnalogyStage;
  const beats = localBeats(ctx.ts);
  const { safe } = tokens.layout;
  const rows = stage.rows ?? [];
  const top = centredTop(scene, rows.length * ROW_H + Math.max(0, rows.length - 1) * ROW_GAP);

  // the most recent highlight wins focus; everything else dims (design language §1.4)
  const lastHi = [...beats].reverse().find((b) => b.do === "highlight" && f >= b.at);
  const focus = lastHi?.targets[0];

  const morph = stage.morph && (() => {
    const cx = (safe.left + safe.right) / 2;
    const cy = stageBox(scene).center;
    const appear = firstAt(beats, ["appear"], "morph") ?? 0;
    const flip = firstAt(beats, ["highlight"], "morph");
    const flipped = flip !== undefined && f >= flip;
    // morph = quick squash on the old icon, then pop back as the new one
    const k = flip === undefined ? pop(f, appear) : f < flip ? pop(f, appear) : 0.75 + 0.25 * pop(f, flip);
    return (
      <Node type="server" icon={flipped ? stage.morph.to : stage.morph.from} x={cx} y={cy} w={280}
        family={flipped ? "hero" : "outlined"} enter={k} />
    );
  })();

  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      {morph}
      {rows.map((r, i) => {
        const revealAt = firstAt(beats, ["reveal", "appear"], r.id);
        // rows already shown in the previous scene stay put
        const carried = (prevScene(ctx)?.stage as AnalogyStage | undefined)?.rows?.some((p) => p.id === r.id);
        const k = revealAt === undefined ? (carried ? 1 : pop(f, i * 3)) : pop(f, revealAt);
        if (k <= 0) return null;
        const y = top + i * (ROW_H + ROW_GAP);
        const active = focus === r.id;
        const dimmed = focus !== undefined && !active;
        return (
          <div key={r.id} style={{ position: "absolute", left: safe.left, top: y, width: safe.right - safe.left, height: ROW_H, display: "flex", alignItems: "center", gap: 44, opacity: Math.min(1, k * 1.5), transform: `translateX(${(1 - k) * -40}px)` }}>
            <div style={{ position: "relative", width: ROW_H, height: ROW_H, flex: "none" }}>
              <Node type="server" icon={r.icon} x={ROW_H / 2} y={ROW_H / 2} w={ROW_H} state={active ? "active" : dimmed ? "dimmed" : "idle"} />
            </div>
            <div>
              <div style={{ font: `800 ${r.key.length > 12 ? 54 : 62}px/1 ${fonts.display}`, color: dimmed ? c.cream3 : c.cream }}>{r.key}</div>
              <div style={{ font: `700 46px ${fonts.text}`, marginTop: 12, color: dimmed ? c.cream3 : c.cream2 }}>
                = <span style={{ color: active ? c.ember : "inherit" }}>{r.value}</span>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
