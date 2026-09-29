// A system-design node (design language §5): four families, six states (outlined only),
// hatched offset shadow, corner badges, and the brand plate for third-party logos.
import { Img, interpolate, interpolateColors, staticFile } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { ICON_FOR, Icon, type IconName } from "./icons";

const c = tokens.color;
const N = tokens.node;

export type NodeState = "idle" | "active" | "overloaded" | "down" | "recovered" | "dimmed";
export type Family = NodeSpec["family"] | "brand";

type Look = { fill: string; stroke: string; icon: string; hatch: string; badge?: "!" | "✕" | "✓"; badgeColor?: string };

const HATCH_CREAM = "rgba(244,240,230,.42)";
const HATCH_ORANGE = "rgba(200,74,39,.75)";

function look(family: Family, state: NodeState): Look {
  if (family === "solid") return { fill: c.cream, stroke: c.cream, icon: c.charcoal, hatch: HATCH_CREAM };
  if (family === "hero") return { fill: c.orange, stroke: c.orange, icon: c.cream, hatch: HATCH_ORANGE };
  if (family === "brand") return { fill: c.cream, stroke: c.cream, icon: c.charcoal, hatch: HATCH_CREAM };
  switch (state) {
    case "active": return { fill: c.surface, stroke: c.orange, icon: c.ember, hatch: HATCH_ORANGE };
    case "overloaded": return { fill: c.surface, stroke: c.warn, icon: c.warn, hatch: HATCH_CREAM, badge: "!", badgeColor: c.warn };
    case "down": return { fill: c.surface, stroke: c.down, icon: c.down, hatch: HATCH_CREAM, badge: "✕", badgeColor: c.down };
    case "recovered": return { fill: c.surface, stroke: c.ok, icon: c.ok, hatch: HATCH_CREAM, badge: "✓", badgeColor: c.ok };
    case "dimmed": return { fill: c.surface, stroke: c.cream3, icon: c.cream3, hatch: "rgba(244,240,230,.13)" };
    default: return { fill: c.surface, stroke: c.cream, icon: c.cream, hatch: HATCH_CREAM };
  }
}

const mix = (a: string, b: string, t: number) => (t <= 0 ? a : t >= 1 ? b : interpolateColors(t, [0, 1], [a, b]));

const BadgeGlyph = ({ glyph }: { glyph: "!" | "✕" | "✓" }) => (
  <svg width="60%" height="60%" viewBox="0 0 24 24">
    <g fill="none" stroke={c.charcoal} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
      {glyph === "✓" && <path d="M5 12.5l4.5 4.5L19 7.5" />}
      {glyph === "✕" && <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />}
      {glyph === "!" && <path d="M12 5v9M12 19.5h.01" />}
    </g>
  </svg>
);

export type NodeProps = {
  type: NodeSpec["type"];
  family?: Family;
  /** centre position on the 1080×1920 canvas */
  x: number;
  y: number;
  w?: number;
  h?: number;
  state?: NodeState;
  /** previous state and 0→1 blend, for smooth state changes */
  from?: NodeState;
  t?: number;
  /** 0→1 entrance (pass a spring for the overshoot) */
  enter?: number;
  /** 0→1 progress of a failure shake */
  shake?: number;
  /** 0→1 badge pop progress */
  badgeIn?: number;
  label?: string;
  labelSide?: "below" | "right";
  logo?: string; // path under public/, for brand nodes
  icon?: IconName; // override the type's default icon
};

export const Node = ({
  type, family = "outlined", x, y, w = 170, h = w, state = "idle", from, t = 1, enter = 1,
  shake = 0, badgeIn = 1, label, labelSide = "below", logo, icon,
}: NodeProps) => {
  const fam: Family = type === "brand" ? "brand" : family;
  const hero = fam === "hero" || (fam === "brand" && family === "hero");
  const a = look(fam, from ?? state);
  const b = look(fam, state);
  const L = {
    fill: mix(a.fill, b.fill, t), stroke: mix(a.stroke, b.stroke, t), icon: mix(a.icon, b.icon, t), hatch: t < 0.5 ? a.hatch : b.hatch,
  };
  const badge = b.badge ? { glyph: b.badge, color: b.badgeColor!, k: (from && look(fam, from).badge === b.badge ? 1 : badgeIn) } : null;

  const radius = Math.min(N.radius, Math.min(w, h) * 0.22);
  const shadow = N.shadow;
  const dx = shake > 0 && shake < 1 ? Math.sin(shake * Math.PI * 6) * tokens.motion.shake.amplitude * (1 - shake) : 0;
  const scale = interpolate(enter, [0, 1], [0.4, 1]);
  const ringGap = hero && fam === "brand" ? N.families.brand.heroRing : null;
  const hatchBg = `repeating-linear-gradient(${shadow.angle}deg, ${hero && fam === "brand" ? HATCH_ORANGE : L.hatch} 0 ${shadow.line}px, transparent ${shadow.line}px ${shadow.line + shadow.gap}px)`;
  const shadowOffset = shadow.offset + (ringGap ? ringGap.gap + ringGap.width : 0);

  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `translateX(${dx}px) scale(${scale})`, opacity: Math.min(1, enter * 1.6) }}>
      {/* hatched offset shadow, borrowed from the GIST logo */}
      <div style={{ position: "absolute", inset: 0, transform: `translate(${shadowOffset}px, ${shadowOffset}px)`, borderRadius: radius, background: hatchBg, opacity: state === "dimmed" && t >= 1 ? 0.3 : 1 }} />
      <div
        style={{
          position: "absolute", inset: 0, borderRadius: radius, background: L.fill, border: `${N.stroke}px solid ${hero && fam !== "brand" ? c.orange : L.stroke}`,
          boxShadow: ringGap ? `0 0 0 ${ringGap.gap}px ${c.charcoal}, 0 0 0 ${ringGap.gap + ringGap.width}px ${c.orange}` : undefined,
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        }}
      >
        {fam === "brand" && logo ? (
          <Img src={staticFile(logo)} style={{ maxWidth: w - 2 * N.families.brand.padding[1], maxHeight: h - 2 * N.families.brand.padding[0], objectFit: "contain" }} />
        ) : (
          <Icon name={icon ?? ICON_FOR[type as keyof typeof ICON_FOR]} size={Math.min(w, h) * N.iconScale} color={L.icon} />
        )}
      </div>
      {badge && (
        <div style={{ position: "absolute", top: N.badge.offset, right: N.badge.offset, width: N.badge.size, height: N.badge.size, borderRadius: "50%", background: badge.color, border: `6px solid ${c.charcoal}`, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${badge.k})` }}>
          <BadgeGlyph glyph={badge.glyph} />
        </div>
      )}
      {label && (
        <div
          style={{
            position: "absolute", whiteSpace: "nowrap", font: `700 ${tokens.type.label.size}px ${fonts.mono}`, color: state === "dimmed" ? c.cream3 : c.cream2,
            background: c.charcoal, padding: "0 10px", borderRadius: 8, // keeps wires from crossing the text
            ...(labelSide === "below" ? { top: h + 18, left: "50%", transform: "translateX(-50%)" } : { left: w + 24, top: "50%", transform: "translateY(-50%)" }),
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
