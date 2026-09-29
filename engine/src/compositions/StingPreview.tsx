// Review composition for 4.2: a charcoal scene tail → branding sting → charcoal scene head,
// so the transition can be judged in context.
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandSting } from "../chrome/BrandSting";
import { Chrome } from "../chrome/Chrome";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import sfxLibrary from "../../../assets/sfx/library.json";

export const PAD = 24;
export const STING_PREVIEW_FRAMES = PAD + tokens.brandSting.frames + PAD;
const c = tokens.color;

const Dummy = ({ label, headline }: { label: string; headline: string }) => (
  <AbsoluteFill>
    <div style={{ position: "absolute", left: 64, top: tokens.layout.zones.headline.y[0], width: 866, font: `800 88px/1.04 ${fonts.display}` }}>{headline}</div>
    <div style={{ position: "absolute", left: 64, top: tokens.layout.zones.caption.y[0] + 50, width: 866, textAlign: "center", font: `800 64px ${fonts.text}`, color: c.cream2 }}>{label}</div>
  </AbsoluteFill>
);

export const StingPreview = () => {
  const f = useCurrentFrame();
  const stingEnd = PAD + tokens.brandSting.frames;
  const wipe = tokens.brandSting.timeline[0].frames[1];
  return (
    <AbsoluteFill style={{ background: c.charcoal, color: c.cream }}>
      {f < PAD + wipe && <Dummy headline="Millions. At once." label="…hitting play at once?" />}
      {f >= stingEnd && <Dummy headline="Apps are cities" label="The answer is system design" />}
      {(f < PAD + wipe || f >= stingEnd) && (
        <AbsoluteFill style={{ opacity: f < PAD ? 1 : f < stingEnd ? 1 - (f - PAD) / wipe : 1 }}>
          <Chrome progress={f / STING_PREVIEW_FRAMES} />
        </AbsoluteFill>
      )}
      <Sequence from={PAD} durationInFrames={tokens.brandSting.frames}>
        <Audio src={staticFile(`assets/sfx/${sfxLibrary.files.chomp.file}`)} volume={tokens.audio.levels.chomp} />
        <BrandSting />
      </Sequence>
    </AbsoluteFill>
  );
};
