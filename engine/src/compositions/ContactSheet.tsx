// Storyboard contact sheet: up to 12 stills on one image, for Claude's own self-check (not sent to Discord).
// Rendered by scripts/contact.ts. Small stills on purpose: an image costs tokens by its pixels, so this is
// ~60% cheaper to look at than the per-section images while overlaps and lone captions still show.
import { AbsoluteFill, Img } from "remotion";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";

export type ContactStill = { src: string; tag: string };
export type ContactSheetProps = { stills: ContactStill[] };

export const CONTACT_COLS = 6;
export const CONTACT_ROWS = 2;
const THUMB_W = 270;
const THUMB_H = 480;
const TAG = 34;
const GAP = 6;
export const CONTACT_WIDTH = CONTACT_COLS * THUMB_W + (CONTACT_COLS + 1) * GAP;
export const CONTACT_HEIGHT = CONTACT_ROWS * (THUMB_H + TAG) + (CONTACT_ROWS + 1) * GAP;

export const ContactSheet = ({ stills }: ContactSheetProps) => {
  const c = tokens.color;
  return (
    <AbsoluteFill style={{ background: c.charcoal, padding: GAP, display: "flex", flexDirection: "row", flexWrap: "wrap", alignContent: "flex-start", gap: GAP }}>
      {stills.map((s, i) => (
        <div key={i} style={{ width: THUMB_W }}>
          <div style={{ height: TAG, font: `700 22px/${TAG}px ${fonts.mono}`, color: c.cream, whiteSpace: "nowrap", overflow: "hidden" }}>{s.tag}</div>
          <Img src={s.src} style={{ width: THUMB_W, height: THUMB_H, objectFit: "cover", display: "block" }} />
        </div>
      ))}
    </AbsoluteFill>
  );
};
