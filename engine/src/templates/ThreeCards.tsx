// ThreeCards template: three cards revealed one by one. The newest card is active (orange);
// earlier ones settle back to cream. Verbs: reveal, highlight.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../motion/motion";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, centredTop, firstAt, localBeats, type Ctx } from "./common";

type Card = { id: string; icon: IconName; title: string; sub: string };

const c = tokens.color;
const H = 170;
const GAP = 30;
const hatch = (col: string) => `repeating-linear-gradient(${tokens.node.shadow.angle}deg, ${col} 0 4px, transparent 4px 12px)`;

export const ThreeCards = ({ ctx }: { ctx: Ctx }) => {
  const f = useCurrentFrame();
  const { scene } = ctx.ts;
  const cards = ((scene.stage as { cards?: Card[] }).cards ?? []).slice(0, 3);
  const beats = localBeats(ctx.ts);
  const { safe } = tokens.layout;
  const top = centredTop(scene, cards.length * H + Math.max(0, cards.length - 1) * GAP);
  const shown = cards.map((card, i) => firstAt(beats, ["reveal", "appear"], card.id) ?? i * 6);
  const newest = shown.reduce((best, at, i) => (f >= at && (best < 0 || at >= shown[best]) ? i : best), -1);
  const hiAt = beats.filter((b) => b.do === "highlight" && f >= b.at).at(-1);
  const focus = hiAt ? cards.findIndex((card) => hiAt.targets.includes(card.id)) : newest;

  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      {cards.map((card, i) => {
        const k = pop(f, shown[i]);
        if (k <= 0) return null;
        const active = i === focus;
        const border = active ? c.orange : c.cream;
        return (
          <div key={card.id} style={{ position: "absolute", left: safe.left, top: top + i * (H + GAP), width: safe.right - safe.left - 16, height: H, transform: `translateY(${(1 - k) * 40}px) scale(${0.9 + 0.1 * k})`, opacity: Math.min(1, k * 1.5) }}>
            <div style={{ position: "absolute", inset: 0, transform: "translate(16px,16px)", borderRadius: 34, background: hatch(active ? "rgba(200,74,39,.75)" : "rgba(244,240,230,.42)") }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 34, border: `6px solid ${border}`, background: c.surface, display: "flex", alignItems: "center", gap: 36, padding: "0 40px" }}>
              <Icon name={card.icon} size={96} color={active ? c.ember : c.cream} />
              <div>
                <div style={{ font: `800 ${tokens.type.cardTitle.size}px/1 ${fonts.display}`, color: c.cream }}>{card.title}</div>
                <div style={{ font: `700 ${tokens.type.cardSub.size}px ${fonts.text}`, color: c.cream2, marginTop: 10 }}>{card.sub}</div>
              </div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
