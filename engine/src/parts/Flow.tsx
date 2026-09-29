// Wires and packets (design language §5): top → bottom curves, idle/live wires,
// ember request dots and cream response dots with a glow.
import { getLength, getPointAtLength, reversePath } from "@remotion/paths";
import { interpolate } from "remotion";
import { tokens } from "../theme/tokens";

const c = tokens.color;

export type Pt = { x: number; y: number };

/** Vertical S-curve from a node's bottom edge to another node's top edge. */
export function flowPath(from: Pt, to: Pt): string {
  if (Math.abs(from.x - to.x) < 1) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const my = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} C ${from.x} ${my} ${to.x} ${my} ${to.x} ${to.y}`;
}

/** Joins hop segments into one path for a multi-hop packet. The straight link between hops runs
 *  through the node in between, so draw packets *under* nodes and it stays hidden. */
export const chain = (...segments: string[]) => segments.map((s, i) => (i === 0 ? s : s.replace(/^M/, "L"))).join(" ");

/** A response travels back along the same wire. */
export const back = (d: string) => reversePath(d);

export const Wires = ({ paths }: { paths: { d: string; live?: boolean; alpha?: number }[] }) => (
  <svg width={tokens.canvas.width} height={tokens.canvas.height} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
    {paths.map((p, i) => (
      <path key={i} d={p.d} fill="none" stroke={p.live ? c.cream3 : c.line} strokeWidth={tokens.wire.stroke} strokeLinecap="round" opacity={p.alpha ?? 1} />
    ))}
  </svg>
);

/** One packet at `progress` (0→1) along path `d`. Fades in and out at the ends. */
export const Packet = ({ d, progress, kind = "request" }: { d: string; progress: number; kind?: "request" | "response" }) => {
  if (progress <= 0 || progress >= 1) return null;
  const len = getLength(d);
  const p = getPointAtLength(d, len * progress);
  if (!p) return null;
  const col = kind === "request" ? c.ember : c.cream;
  const glow = kind === "request" ? "rgba(232,105,63," : "rgba(244,240,230,";
  const size = tokens.packet.size;
  const alpha = interpolate(progress, [0, 0.08, 0.9, 1], [0, 1, 1, 0]);
  return (
    <div
      style={{
        position: "absolute", left: p.x - size / 2, top: p.y - size / 2, width: size, height: size, borderRadius: "50%", background: col, opacity: alpha,
        boxShadow: `0 0 0 8px ${glow}${kind === "request" ? ".22" : ".15"}), 0 0 ${tokens.packet.glow}px ${glow}.8)`,
      }}
    />
  );
};

/** Frames a packet needs to cross path `d` at the token speed. */
export const travelFrames = (d: string) => Math.max(8, Math.round((getLength(d) / tokens.packet.speedPxPerSec) * tokens.canvas.fps));
