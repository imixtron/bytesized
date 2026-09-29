// Persistent chrome on every charcoal scene: progress bar, corner mark, PART tag (design language §4–5).
import { Img, staticFile } from "remotion";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";

const c = tokens.color;

export const ProgressBar = ({ progress }: { progress: number }) => {
  const b = tokens.layout.progressBar;
  return (
    <div style={{ position: "absolute", left: b.x, top: b.y, width: b.width, height: b.height, borderRadius: b.radius, background: "rgba(244,240,230,.12)" }}>
      <div style={{ width: `${Math.min(1, Math.max(0, progress)) * 100}%`, height: "100%", borderRadius: b.radius, background: c.orange }} />
    </div>
  );
};

export const CornerMark = () => {
  const m = tokens.layout.cornerMark;
  return <Img src={staticFile(m.asset)} style={{ position: "absolute", left: m.x, top: m.y, width: m.size }} />;
};

export const PartTag = ({ part, of }: { part: number; of: number }) => {
  const t = tokens.partTag;
  return (
    <div style={{ position: "absolute", left: t.x, top: t.y, height: t.height, padding: "0 18px", border: `${t.stroke}px solid ${c.cream3}`, borderRadius: 12, display: "flex", alignItems: "center", font: `700 ${t.size}px ${fonts.mono}`, letterSpacing: ".08em", color: c.cream2 }}>
      PART&nbsp;<span style={{ color: c.ember }}>{part}</span>/{of}
    </div>
  );
};

export const Chrome = ({ progress, series }: { progress: number; series?: { part: number; of: number } }) => (
  <>
    <ProgressBar progress={progress} />
    <CornerMark />
    {series && <PartTag part={series.part} of={series.of} />}
  </>
);
