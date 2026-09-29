// GistCard template: "THE GIST" label and a cream card with the logo's bite cut from its corner.
// The accent word turns orange on its highlight beat. Part 1 of a series shows the teaser.
// Verbs: appear (target "card"), highlight (target "card").
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../motion/motion";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { AccentText, centredTop, firstAt, localBeats, type Ctx } from "./common";

const c = tokens.color;
const W = 866;
const H = 500;
const BR = 110;

const BiteCard = () => (
  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0 }}>
    <defs>
      <mask id="gist-bite">
        <rect width={W} height={H} fill="#fff" />
        <circle cx={W - 2} cy={2 + BR * 0.9} r={BR} fill="#000" />
        <circle cx={W - 2 - BR * 0.95} cy={2} r={BR * 0.85} fill="#000" />
        <circle cx={W - 2 - BR * 0.2} cy={2 - BR * 0.1} r={BR * 0.95} fill="#000" />
      </mask>
      <pattern id="gist-hatch" width={12} height={12} patternUnits="userSpaceOnUse" patternTransform={`rotate(${tokens.node.shadow.angle})`}>
        <rect width={12} height={4} fill="rgba(244,240,230,.42)" />
      </pattern>
    </defs>
    <rect x={16} y={16} width={W - 16} height={H - 16} rx={44} fill="url(#gist-hatch)" mask="url(#gist-bite)" />
    <rect width={W - 16} height={H - 16} rx={44} fill={c.cream} mask="url(#gist-bite)" />
  </svg>
);

export const GistCard = ({ ctx }: { ctx: Ctx }) => {
  const f = useCurrentFrame();
  const { scene } = ctx.ts;
  const stage = scene.stage as { text: string; accent?: string; teaser?: string };
  const beats = localBeats(ctx.ts);
  const { safe } = tokens.layout;
  const appear = firstAt(beats, ["appear"], "card") ?? 0;
  const hi = firstAt(beats, ["highlight"], "card");
  const k = pop(f, appear);
  const lit = hi === undefined || f >= hi;
  const bump = hi !== undefined && f >= hi ? 1 + Math.sin(Math.min(1, (f - hi) / 10) * Math.PI) * 0.03 : 1;
  const teaser = stage.teaser ?? (ctx.episode.series?.part === 1 ? ctx.episode.series.teaser : undefined);
  const LABEL = 80;
  const top = centredTop(scene, LABEL + H + (teaser ? 90 : 0)) + LABEL; // card top; label sits above it

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: safe.left, top: top - LABEL, font: `700 40px ${fonts.mono}`, letterSpacing: ".2em", color: c.ember, opacity: Math.min(1, pop(f, Math.max(0, appear - 3)) * 1.5) }}>THE GIST</div>
      <div style={{ position: "absolute", left: safe.left, top, width: W, height: H, transform: `scale(${(0.85 + 0.15 * k) * bump})`, transformOrigin: "30% 50%", opacity: Math.min(1, k * 1.5) }}>
        <BiteCard />
        <p style={{ position: "relative", margin: 0, padding: "70px 110px 0 64px", font: `800 80px/1.12 ${fonts.display}`, letterSpacing: "-.01em", color: c.charcoal }}>
          <AccentText text={stage.text} accent={stage.accent ?? ""} color={c.orange} on={lit} />
        </p>
      </div>
      {teaser && (
        <div style={{ position: "absolute", left: safe.left, top: top + H + 50, width: W, font: `700 36px ${fonts.mono}`, color: c.cream2, opacity: Math.min(1, pop(f, appear + 12)) }}>
          <span style={{ color: c.ember }}>NEXT →</span> {teaser}
        </div>
      )}
    </AbsoluteFill>
  );
};
