// One-frame sanity check: tokens.json is read, all four fonts load, and brand assets resolve.
import { AbsoluteFill, Img, staticFile } from "remotion";
import { fonts } from "../theme/fonts";
import { tokens, type ColorName } from "../theme/tokens";

export const TokensCheck = () => {
  const c = tokens.color;
  return (
    <AbsoluteFill style={{ background: c.charcoal, color: c.cream, padding: 64, gap: 36, fontFamily: fonts.text }}>
      <div style={{ font: `800 88px/1.04 ${fonts.display}` }}>
        Tokens <span style={{ color: c.ember }}>v{tokens.$version}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {(Object.keys(c) as ColorName[]).map((k) => (
          <div key={k} style={{ border: `4px solid ${c.line}`, borderRadius: 24, overflow: "hidden" }}>
            <div style={{ height: 120, background: c[k] }} />
            <div style={{ padding: 14, font: `700 30px ${fonts.mono}`, color: c.cream2 }}>{k}<br />{c[k]}</div>
          </div>
        ))}
      </div>
      <div style={{ font: `800 64px/1.18 ${fonts.text}` }}>Load balancers are <span style={{ color: c.ember }}>traffic</span> cops</div>
      <div style={{ font: `700 34px ${fonts.mono}`, color: c.cream2 }}>lb-01 · app-2 · postgres · 200 OK</div>
      <div style={{ font: `400 110px ${fonts.script}`, color: c.ember }}>wait for it…</div>
      <div style={{ display: "flex", gap: 40, alignItems: "center" }}>
        <Img src={staticFile(tokens.layout.cornerMark.asset)} style={{ width: 120 }} />
        <Img src={staticFile("brand/bytesized/svg/bytesized-logo-on-charcoal.svg")} style={{ width: 520 }} />
      </div>
    </AbsoluteFill>
  );
};
