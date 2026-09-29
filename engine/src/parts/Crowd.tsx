// Crowd (for "flood"): seeded dots rushing in toward a target, and a ticking counter.
import { interpolate, random } from "remotion";
import { ease } from "../motion/motion";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import type { Pt } from "./Flow";

const c = tokens.color;

export type CrowdProps = {
  target: Pt;
  count?: number;
  /** local frame relative to the flood start (negative = not started) */
  frame: number;
  /** ring the dots start from */
  radius?: [number, number];
  /** frames for a dot to reach the target */
  travel?: number;
  /** spread of dot start times, in frames */
  spread?: number;
  /** keep flooding in waves (true) or run once */
  loop?: boolean;
  seed?: string;
};

export const Crowd = ({ target, count = 40, frame, radius = [380, 540], travel = 24, spread = 40, loop = true, seed = "crowd" }: CrowdProps) => {
  if (frame < 0) return null;
  const { safe } = tokens.layout;
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const a = random(`${seed}-a-${i}`) * Math.PI * 2;
        const r = radius[0] + random(`${seed}-r-${i}`) * (radius[1] - radius[0]);
        const sx = Math.min(safe.right - 20, Math.max(safe.left + 20, target.x + Math.cos(a) * r));
        const sy = target.y + Math.sin(a) * r * 0.62;
        const delay = random(`${seed}-d-${i}`) * spread;
        const cycle = travel + spread;
        const local = loop ? (frame - delay + cycle * 10) % cycle : frame - delay;
        const t = interpolate(local, [0, travel], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease.std });
        if (local < 0 || (!loop && t >= 1)) return null;
        const alpha = interpolate(t, [0, 0.15, 0.8, 1], [0, 0.9, 0.9, 0]);
        const s = 30 * interpolate(t, [0, 1], [1, 0.35]);
        return (
          <div key={i} style={{ position: "absolute", left: sx + (target.x - sx) * t - s / 2, top: sy + (target.y - sy) * t - s / 2, width: s, height: s, borderRadius: "50%", background: c.cream, opacity: alpha }} />
        );
      })}
    </>
  );
};

export const Counter = ({ x, y, value, label, width = 866 }: { x: number; y: number; value: number; label?: string; width?: number }) => (
  <div style={{ position: "absolute", left: x - width / 2, top: y, width, textAlign: "center", font: `700 44px ${fonts.mono}`, color: c.cream2 }}>
    <span style={{ color: c.ember }}>{Math.round(value).toLocaleString("en-US")}</span>
    {label ? ` ${label}` : ""}
  </div>
);
