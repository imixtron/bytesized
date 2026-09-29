// Branding sting (design language v1.1 §7): ~1.5s after the hook, orange, both logos.
// Rendered inside a <Sequence>, so frame 0 is the sting's first frame.
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { fonts } from "../theme/fonts";
import { HEIGHT, WIDTH, tokens } from "../theme/tokens";

const c = tokens.color;
const s = tokens.brandSting;
type Step = { frames: number[]; do: string; stagger?: number; scale?: number };
const [wipe, logos, , exit] = s.timeline as Step[];
// Radius at which the lead circle (centre WIDTH, 0.25r) just reaches the bottom-left corner,
// so the wipe completes exactly on its last frame: W² + (H − r/4)² = r².
const R_FULL = (() => {
  const a = 1 - 1 / 16, b = HEIGHT / 2, c = -(WIDTH ** 2 + HEIGHT ** 2);
  return ((-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)) * 1.02;
})();

/** Three overlapping circles from the top-right corner, like the logo's bite, growing to cover the frame. */
const BiteMask = ({ t }: { t: number }) => {
  const r = t * R_FULL;
  return (
    <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <clipPath id="sting-bite">
          <circle cx={WIDTH} cy={r * 0.25} r={r} />
          <circle cx={WIDTH - r * 0.3} cy={0} r={r * 0.9} />
          <circle cx={WIDTH - r * 0.08} cy={-r * 0.05} r={r * 0.97} />
        </clipPath>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill={c.orange} clipPath="url(#sting-bite)" />
    </svg>
  );
};

export const BrandSting = () => {
  const f = useCurrentFrame();
  // ease in-out so the first frames read as a "bite" out of the corner before it swallows the frame
  const wipeT = tween(f, wipe.frames[0], wipe.frames[1] - wipe.frames[0], Easing.inOut(Easing.cubic));
  const stagger = logos.stagger ?? 3;
  const logoIn = pop(f, logos.frames[0]);
  const restIn = pop(f, logos.frames[0] + stagger);
  const exitT = tween(f, exit.frames[0], exit.frames[1] - exit.frames[0], ease.exit);
  const exitScale = interpolate(exitT, [0, 1], [1, exit.scale ?? 0.96]);
  const exitAlpha = 1 - exitT;

  return (
    <AbsoluteFill>
      {wipeT < 1 ? <BiteMask t={wipeT} /> : <AbsoluteFill style={{ background: c.orange }} />}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 34, opacity: exitAlpha, transform: `scale(${exitScale})` }}>
        <Img src={staticFile(s.bytesizedLogo)} style={{ width: 700, transform: `scale(${0.6 + 0.4 * logoIn})`, opacity: Math.min(1, logoIn * 1.5) }} />
        <div style={{ font: `700 30px ${fonts.text}`, letterSpacing: ".22em", textTransform: "uppercase", color: c.cream, opacity: restIn * 0.9, transform: `translateY(${(1 - restIn) * 24}px)` }}>
          {s.byline}
        </div>
        <Img src={staticFile(s.parentLogo)} style={{ width: 760, opacity: Math.min(1, restIn), transform: `translateY(${(1 - restIn) * 30}px)` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
