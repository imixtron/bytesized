// Episode cover / thumbnail (design language v1.6): the title on charcoal, plus up to 4
// diagram panels from the episode: the BigPicture's panels if it has one, else one per diagram.
// Corner mark only (our logos stay in the sting). `npm run cover -- <nnn>` → out/cover.png
import { AbsoluteFill } from "remotion";
import { CornerMark, PartTag } from "../chrome/Chrome";
import type { LoadedEpisode } from "../episode/load";
import { DIAGRAMS } from "../episode/rules";
import { AccentText } from "../templates/common";
import { PanelGrid, autoPanels, type PanelItem } from "../templates/PanelGrid";
import type { BigPictureStage } from "../templates/BigPicture";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";

const c = tokens.color;
const C = tokens.cover;

export type CoverProps = { folder: string; loaded: LoadedEpisode | null };

export const Cover = ({ loaded }: CoverProps) => {
  if (!loaded) return <AbsoluteFill style={{ background: c.charcoal }} />;
  const { episode, timeline } = loaded;
  const big = timeline.scenes.find((t) => t.scene.template === "BigPicture");
  const items: PanelItem[] = big ? ((big.scene.stage as BigPictureStage).panels ?? []) : autoPanels(timeline, DIAGRAMS, C.maxPanels);
  const { safe } = tokens.layout;
  const words = episode.title.replace(/\?$/, "").split(/\s+/);
  const accent = words.at(-1) ?? "";
  const ts = big ?? timeline.scenes[0];
  return (
    <AbsoluteFill style={{ background: c.charcoal, color: c.cream }}>
      <CornerMark />
      {episode.series && <PartTag part={episode.series.part} of={episode.series.of} />}
      <div style={{ position: "absolute", left: safe.left, top: C.titleY, width: safe.right - safe.left, font: `800 ${C.titleSize}px/1.02 ${fonts.display}`, letterSpacing: "-.01em", textWrap: "balance" }}>
        <AccentText text={episode.title} accent={accent} />
      </div>
      <PanelGrid ctx={{ ts, episode, timeline }} items={items.slice(0, C.maxPanels)} area={{ x: safe.left, y: C.gridTop, w: safe.right - safe.left, h: C.gridBottom - C.gridTop }} f={1e6} />
    </AbsoluteFill>
  );
};
