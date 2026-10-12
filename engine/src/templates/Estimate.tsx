// Estimate template (v1.11 proposal): back-of-the-envelope maths, written by hand on a napkin. Each line
// is written on left → right in the script font; the result line is circled in ember.
// stage: { lines: [{ id, text, result?: true }] }  (2–6 lines)
// Verbs: reveal / appear (write the next line), highlight (circle that line), count is not needed.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, localBeats, type Ctx } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type EstLine = { id: string; text: string; result?: boolean };
export type EstimateStage = { lines?: EstLine[] };

const c = tokens.color;
const WRITE = 22;

export const Estimate = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><EstimateBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const EstimateBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as EstimateStage;
  const lines = (stage.lines ?? []).slice(0, 6);
  const beats = localBeats(ctx.ts);
  const n = lines.length;
  const pad = 40;
  const rowH = Math.min(200, (box.h - 2 * pad) / Math.max(1, n));
  const size = Math.min(92, rowH * 0.6);
  const k = pop(f, 0);
  const at = lines.map((l, i) => firstAt(beats, ["reveal", "appear"], l.id) ?? 14 + i * 36);
  const circleAt = lines.map((l, i) => firstAt(beats, ["highlight"], l.id) ?? (l.result ? at[i] + WRITE + 8 : undefined));

  return (
    <div style={{ position: "absolute", inset: 0, transform: `rotate(-1.2deg) scale(${0.94 + 0.06 * k})`, opacity: Math.min(1, k * 1.5) }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 36, border: `5px dashed ${c.line}`, background: "rgba(244,240,230,.035)" }} />
      <div style={{ position: "absolute", right: 44, top: 22, font: `700 26px ${fonts.mono}`, color: c.cream3 }}>napkin maths</div>
      {lines.map((l, i) => {
        const top = pad + i * rowH;
        const w = tween(f, at[i], WRITE, ease.std);
        const cK = circleAt[i] !== undefined ? tween(f, circleAt[i] as number, 18, ease.std) : 0;
        const textW = Math.min(box.w - 120, l.text.length * size * 0.42 + 40);
        const col = l.result ? c.ember : c.cream;
        return (
          <div key={l.id} style={{ position: "absolute", left: 60, top, height: rowH, width: box.w - 120, display: "flex", alignItems: "center" }}>
            <div style={{ position: "relative", font: `400 ${size}px/1.05 ${fonts.script}`, color: col, whiteSpace: "nowrap", clipPath: `inset(-20px ${(1 - w) * 100}% -20px -10px)` }}>
              {l.text}
            </div>
            {cK > 0 && (
              <svg width={textW + 70} height={rowH} style={{ position: "absolute", left: -30, top: 0, overflow: "visible" }}>
                <ellipse cx={(textW + 70) / 2} cy={rowH / 2} rx={(textW + 40) / 2} ry={rowH * 0.42} fill="none" stroke={c.orange} strokeWidth={7} strokeLinecap="round"
                  strokeDasharray={`${(2 * Math.PI * ((textW + 40) / 2 + rowH * 0.42) / 2) * 1.02 * cK} 9999`} transform={`rotate(-3 ${(textW + 70) / 2} ${rowH / 2})`} />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
};
