// One storyboard section as a single phone-readable image (posted to Discord at Storyboard Review).
// Rendered by scripts/storyboard.ts with renderStill: one sheet per scene, plus the sting.
import { AbsoluteFill, Img } from "remotion";
import { fonts } from "../theme/fonts";
import { tokens, WIDTH } from "../theme/tokens";

export type SheetShot = { src: string; time: string; on?: string; label: string };
export type StoryboardSheetProps = {
  index: number;
  part: string;
  sceneId: string;
  template?: string;
  range: string;
  headline?: string;
  vo: string;
  shots: SheetShot[];
};

const PAD = 48;
const GAP = 24;
const VO_CHARS_PER_LINE = 34;
const VO_LINE = 58;
const CAPTION = 120;

const columns = (n: number) => Math.min(3, Math.max(1, n));
const thumbWidth = (n: number) => Math.min(460, (WIDTH - 2 * PAD - (columns(n) - 1) * GAP) / columns(n));
const voLines = (vo: string) => Math.ceil((vo.length + 2) / VO_CHARS_PER_LINE);

/** Image height grows with the voiceover length and the number of stills. */
export const sheetHeight = (p: StoryboardSheetProps) => {
  const rows = Math.ceil(p.shots.length / columns(p.shots.length));
  const thumb = (thumbWidth(p.shots.length) * 16) / 9;
  const header = 230 + (p.headline ? 64 : 0) + voLines(p.vo) * VO_LINE;
  return Math.round(header + rows * (thumb + CAPTION) + (rows - 1) * GAP + PAD);
};

export const StoryboardSheet = (p: StoryboardSheetProps) => {
  const c = tokens.color;
  const w = thumbWidth(p.shots.length);
  return (
    <AbsoluteFill style={{ background: c.charcoal, color: c.cream, padding: PAD, fontFamily: fonts.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ background: c.orange, color: c.cream, borderRadius: 12, padding: "6px 18px", font: `800 30px ${fonts.display}`, textTransform: "uppercase", letterSpacing: 1 }}>
          {p.index}. {p.part}
        </span>
        <span style={{ font: `700 34px ${fonts.mono}`, color: c.cream2 }}>{p.sceneId}</span>
      </div>
      <div style={{ font: `700 30px ${fonts.mono}`, color: c.cream3, marginTop: 16 }}>
        {[p.template, p.range].filter(Boolean).join(" · ")}
      </div>
      {p.headline ? <div style={{ font: `800 44px/1.25 ${fonts.text}`, color: c.ember, marginTop: 18 }}>{p.headline}</div> : null}
      <div style={{ font: `600 italic 42px/${VO_LINE}px ${fonts.text}`, marginTop: 18, marginBottom: 36 }}>“{p.vo}”</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: GAP, justifyContent: p.shots.length < 3 ? "center" : "flex-start" }}>
        {p.shots.map((s, i) => (
          <div key={i} style={{ width: w }}>
            <Img src={s.src} style={{ width: w, height: (w * 16) / 9, objectFit: "cover", borderRadius: 18, border: `3px solid ${c.line}`, display: "block" }} />
            <div style={{ font: `700 28px/1.3 ${fonts.text}`, marginTop: 10, color: c.cream }}>
              {s.time}
              {s.on ? <span style={{ color: c.ember }}> · “{s.on}”</span> : null}
            </div>
            <div style={{ font: `600 24px/1.3 ${fonts.text}`, color: c.cream2, overflow: "hidden", maxHeight: 64 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
