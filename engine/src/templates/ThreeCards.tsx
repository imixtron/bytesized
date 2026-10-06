// ThreeCards template: three cards revealed one by one. The newest card is active (orange);
// earlier ones settle back to cream. Verbs: reveal, highlight.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../motion/motion";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { GhostSlot, Headline, centredTop, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";

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
  // focus: the newest card, or the last highlighted one; it fades between cards (v1.6.1)
  const events: FocusEvent[] = [
    ...cards.map((card, i) => ({ at: shown[i], id: card.id, explicit: false })),
    ...beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = cards.find((cd) => b.targets.includes(cd.id))?.id; return id ? [{ at: b.at, id, explicit: false }] : []; }),
  ];

  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      {cards.map((card, i) => {
        const k = pop(f, shown[i]);
        // the card's slot is there from the scene start; the card pops in over it
        if (k <= 0) return <GhostSlot key={card.id} x={safe.left} y={top + i * (H + GAP)} w={safe.right - safe.left - 16} h={H} radius={34} k={pop(f, i * tokens.motion.stagger.frames)} />;
        const on = focusLevels(events, card.id, f).on;
        const border = mixColor(c.cream, c.orange, on);
        return (
          <div key={card.id} style={{ position: "absolute", left: safe.left, top: top + i * (H + GAP), width: safe.right - safe.left - 16, height: H, transform: `translateY(${(1 - k) * 40}px) scale(${0.9 + 0.1 * k})`, opacity: Math.min(1, k * 1.5) }}>
            <div style={{ position: "absolute", inset: 0, transform: "translate(16px,16px)", borderRadius: 34, background: hatch("rgba(244,240,230,.42)"), opacity: 1 - on }} />
            <div style={{ position: "absolute", inset: 0, transform: "translate(16px,16px)", borderRadius: 34, background: hatch("rgba(200,74,39,.75)"), opacity: on }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 34, border: `6px solid ${border}`, background: c.surface, display: "flex", alignItems: "center", gap: 36, padding: "0 40px" }}>
              <Icon name={card.icon} size={96} color={mixColor(c.cream, c.ember, on)} />
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
