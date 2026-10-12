// Stat template (v1.8 proposal): the stat-slam opener. One giant number lands with a slam (scale-down,
// shake, impact ring), then its label rises under it. Made for hooks ("400 milliseconds").
// stage: { stat: { id, value: "400", unit?: "ms", label?: "to load a page" }, sub?: { id, text } }
// Verbs: appear (slam the number), reveal (the label / sub line), highlight (flash it ember), shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, localBeats, stageBox, type Ctx } from "./common";

export type StatStage = { stat?: { id: string; value: string; unit?: string; label?: string }; sub?: { id: string; text: string } };

const c = tokens.color;
const { safe } = tokens.layout;
const SLAM = 9; // frames from huge to landed

export const Stat = ({ ctx }: { ctx: Ctx }) => {
  const f = useCurrentFrame();
  const { scene } = ctx.ts;
  const stage = scene.stage as StatStage;
  const beats = localBeats(ctx.ts);
  const stat = stage.stat;
  if (!stat) return <AbsoluteFill><Headline ctx={ctx} /></AbsoluteFill>;
  const width = safe.right - safe.left;
  const at = firstAt(beats, ["appear"], stat.id) ?? 8;
  // Unbounded 800 is wide (~0.98em per character); the unit sits beside the number at 42% size
  const unitEm = stat.unit ? stat.unit.length * 0.98 * 0.42 + 0.3 : 0;
  const size = Math.min(380, Math.floor(width / (Math.max(2, stat.value.length) * 0.98 + unitEm)));
  const cy = stageBox(scene).center - (stat.label ? 70 : 0);

  const t = tween(f, at, SLAM, ease.exit);
  const scale = f < at ? 0 : 1 + (1 - t) * 2.4;
  const landed = f - (at + SLAM);
  // after the slam the screen jolts, decaying over ~14 frames
  const jolt = landed >= 0 && landed < 14 ? Math.sin(landed * 2.4) * 14 * (1 - landed / 14) : 0;
  const hi = firstAt(beats, ["highlight"], stat.id);
  const hiK = hi !== undefined && f >= hi ? tween(f, hi, 9) : 0;
  const shakeAt = firstAt(beats, ["shake"], stat.id);
  const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
  const ring = landed >= 0 ? tween(f, at + SLAM, 18, ease.std) : 0;
  const labAt = firstAt(beats, ["reveal"], stat.id) ?? at + SLAM + 6;
  const lab = pop(f, labAt);
  const sub = stage.sub;
  const subAt = sub ? firstAt(beats, ["reveal", "appear"], sub.id) ?? labAt + 24 : 0;
  const subK = sub ? pop(f, subAt) : 0;

  return (
    <AbsoluteFill style={{ transform: `translate(${jolt + sh}px, ${jolt * 0.5}px)` }}>
      <Headline ctx={ctx} />
      {landed >= 0 && ring < 1 && (
        <div style={{ position: "absolute", left: (safe.left + safe.right) / 2 - 260, top: cy - 160, width: 520, height: 320, borderRadius: "50%", border: `10px solid ${c.orange}`, transform: `scale(${1 + ring * 1.6})`, opacity: 1 - ring }} />
      )}
      <div style={{ position: "absolute", left: safe.left, width, top: cy - size * 0.55, height: size * 1.1, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${scale})`, opacity: f < at ? 0 : Math.min(1, t * 3), font: `800 ${size}px/1 ${fonts.display}`, letterSpacing: "-.03em", color: hiK > 0 ? c.ember : c.cream, whiteSpace: "nowrap" }}>
        {stat.value}
        {stat.unit && <span style={{ fontSize: size * 0.42, marginLeft: size * 0.3, color: hiK > 0 ? c.ember : c.cream2 }}>{stat.unit}</span>}
      </div>
      {stat.label && (
        <div style={{ position: "absolute", left: safe.left, width, top: cy + size * 0.55 + 10, textAlign: "center", font: `800 58px/1.1 ${fonts.display}`, color: c.cream2, opacity: Math.min(1, lab * 1.5), transform: `translateY(${(1 - Math.min(1, lab)) * 40}px)` }}>{stat.label}</div>
      )}
      {sub && (
        <div style={{ position: "absolute", left: safe.left + 40, width: width - 80, top: cy + size * 0.55 + 140, textAlign: "center", font: `700 40px/1.2 ${fonts.text}`, color: c.cream3, opacity: Math.min(1, subK * 1.5), transform: `translateY(${(1 - Math.min(1, subK)) * 30}px)` }}>{sub.text}</div>
      )}
    </AbsoluteFill>
  );
};
