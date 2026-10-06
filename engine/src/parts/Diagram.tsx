// Diagram parts (design language v1.5): arrows that draw on, numbered step badges,
// dashed lifelines, side notes, decision diamonds and title chips. All read tokens.diagram.
import { getLength, getPointAtLength } from "@remotion/paths";
import type { ReactNode } from "react";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";

const c = tokens.color;
const D = tokens.diagram;
const S = tokens.node.shadow;

export const hatch = (col: string) => `repeating-linear-gradient(${S.angle}deg, ${col} 0 ${S.line}px, transparent ${S.line}px ${S.line + S.gap}px)`;
export const HATCH = { cream: "rgba(244,240,230,.42)", orange: "rgba(200,74,39,.75)", dim: "rgba(244,240,230,.13)" };

/** An svg layer the size of its parent panel (overflow visible), for wires and arrows. */
export const Svg = ({ children }: { children: ReactNode }) => (
  <svg width={1} height={1} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>{children}</svg>
);

/** An arrow along `d` that draws on with `progress` 0→1; the head appears at the end. */
export const Arrow = ({ d, progress = 1, color = c.cream, dashed = false, head = true, width = D.step.stroke, alpha = 1 }: {
  d: string; progress?: number; color?: string; dashed?: boolean; head?: boolean; width?: number; alpha?: number;
}) => {
  if (progress <= 0) return null;
  const len = getLength(d);
  const p = dashed ? 1 : Math.min(1, progress);
  const tip = getPointAtLength(d, len * p) ?? { x: 0, y: 0 };
  const back = getPointAtLength(d, Math.max(0, len * p - 2)) ?? tip;
  const ang = (Math.atan2(tip.y - back.y, tip.x - back.x) * 180) / Math.PI;
  const H = D.step.head;
  return (
    <g opacity={alpha * (dashed ? Math.min(1, progress) : 1)}>
      {/* solid arrows draw on; dashed ones (loops, "later") fade in whole */}
      <path d={d} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round"
        strokeDasharray={dashed ? `${D.lane.dash[0]} ${D.lane.dash[1]}` : `${len * p} ${len}`} />
      {head && p > 0.15 && (
        <path d={`M ${-H} ${-H * 0.62} L 0 0 L ${-H} ${H * 0.62}`} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
          transform={`translate(${tip.x} ${tip.y}) rotate(${ang})`} />
      )}
    </g>
  );
};

/** Numbered step badge: orange when it's the current step, else outlined cream. */
export const StepBadge = ({ n, x, y, on, k = 1, dim = false }: { n: number | string; x: number; y: number; on: boolean; k?: number; dim?: boolean }) => {
  const s = D.step.badge;
  return (
    <div style={{
      position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: "50%", transform: `scale(${k})`,
      background: on ? c.orange : c.charcoal, border: `5px solid ${on ? c.orange : dim ? c.cream3 : c.cream}`,
      display: "flex", alignItems: "center", justifyContent: "center", font: `800 28px ${fonts.display}`, color: on ? c.cream : dim ? c.cream3 : c.cream,
    }}>{n}</div>
  );
};

/** Mono label on a charcoal plate so wires never cross the text. */
export const Label = ({ x, y, text, color = c.cream2, align = "center", size = tokens.type.label.size, k = 1 }: {
  x: number; y: number; text: string; color?: string; align?: "center" | "left" | "right"; size?: number; k?: number;
}) => (
  <div style={{
    position: "absolute", left: x, top: y, whiteSpace: "nowrap", font: `700 ${size}px/1.1 ${fonts.mono}`, color, background: c.charcoal, padding: "2px 10px", borderRadius: 8,
    transform: `translate(${align === "center" ? "-50%" : align === "right" ? "-100%" : "0"}, -50%) scale(${k})`, opacity: Math.min(1, k * 1.5),
  }}>{text}</div>
);

/** Side note: a rounded outlined box for something that happens locally ("never sent"). */
export const Note = ({ x, y, text, k = 1, on = false, maxWidth = 360 }: { x: number; y: number; text: string; k?: number; on?: boolean; maxWidth?: number }) => (
  <div style={{
    position: "absolute", left: x, top: y, transform: `translate(-50%, -50%) scale(${0.85 + 0.15 * k})`, opacity: Math.min(1, k * 1.5), maxWidth,
    border: `${D.note.stroke}px dashed ${on ? c.orange : c.cream2}`, borderRadius: D.note.radius, background: c.surface, padding: `${D.note.pad[0]}px ${D.note.pad[1]}px`,
    font: `700 32px/1.2 ${fonts.text}`, color: on ? c.cream : c.cream2, textAlign: "center", textWrap: "balance",
  }}>{text}</div>
);

/** Decision diamond (a wide rhombus) with the question inside, nodes' hatched shadow behind it. */
export const Diamond = ({ x, y, text, state = "idle", k = 1, w = D.diamond.w, h = D.diamond.h }: {
  x: number; y: number; text: string; state?: "idle" | "active" | "dimmed"; k?: number; w?: number; h?: number;
}) => {
  const stroke = state === "active" ? c.orange : state === "dimmed" ? c.cream3 : c.cream;
  const sh = state === "active" ? HATCH.orange : state === "dimmed" ? HATCH.dim : HATCH.cream;
  const pts = `${w / 2},3 ${w - 3},${h / 2} ${w / 2},${h - 3} 3,${h / 2}`;
  const o = S.offset;
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `scale(${0.4 + 0.6 * k})`, opacity: Math.min(1, k * 1.6) }}>
      <svg width={w + o} height={h + o} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <defs>
          <pattern id={`dh-${state}`} width={S.line + S.gap} height={S.line + S.gap} patternUnits="userSpaceOnUse" patternTransform={`rotate(${S.angle + 90})`}>
            <rect width={S.line} height={S.line + S.gap} fill={sh} />
          </pattern>
        </defs>
        <polygon points={pts} transform={`translate(${o} ${o})`} fill={`url(#dh-${state})`} />
        <polygon points={pts} fill={c.surface} stroke={stroke} strokeWidth={tokens.node.stroke} strokeLinejoin="round" />
      </svg>
      <div style={{
        position: "absolute", left: (w - D.diamond.textWidth) / 2, width: D.diamond.textWidth, top: 0, height: h, display: "flex", alignItems: "center", justifyContent: "center",
        textAlign: "center", font: `800 ${D.diamond.textSize}px/1.1 ${fonts.text}`, color: state === "dimmed" ? c.cream3 : c.cream, textWrap: "balance",
      }}>{text}</div>
    </div>
  );
};

/** Title chip: a pill with a mono title (Split halves, panels). */
export const Chip = ({ x, y, text, on = false, k = 1, dim = false }: { x: number; y: number; text: string; on?: boolean; k?: number; dim?: boolean }) => (
  <div style={{
    position: "absolute", left: x, top: y, height: D.split.chip.height, padding: "0 22px", borderRadius: D.split.chip.height / 2, display: "flex", alignItems: "center",
    background: on ? c.orange : c.cream, color: on ? c.cream : c.charcoal, font: `800 ${D.split.chip.size}px ${fonts.display}`, letterSpacing: ".02em",
    opacity: dim ? 0.45 : Math.min(1, k * 1.5), transform: `translateY(-50%) scale(${0.85 + 0.15 * k})`, transformOrigin: "left center",
  }}>{text}</div>
);
