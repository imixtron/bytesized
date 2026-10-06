// BigPicture template (design language v1.6): the optional pull-back just before the gist.
// 2–4 earlier scenes' diagrams, frozen on their last frame, tiled two across; the camera starts
// inside panel 1 and pulls back to show how the pieces fit. Usually no headline (big-visual moment).
// Verbs: highlight (a panel id stays bright, the rest dim).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Headline, highlightEvents, localBeats, stageBox, type Ctx } from "./common";
import { PanelGrid, type PanelItem } from "./PanelGrid";
import { tokens } from "../theme/tokens";

export type BigPictureStage = { panels?: PanelItem[] };

export const BigPicture = ({ ctx }: { ctx: Ctx }) => {
  const f = useCurrentFrame();
  const { scene } = ctx.ts;
  const items = ((scene.stage as BigPictureStage).panels ?? []).slice(0, tokens.bigPicture.maxPanels);
  const { top, bottom } = stageBox(scene);
  const { safe } = tokens.layout;
  const focus = highlightEvents(localBeats(ctx.ts), items.map((p) => p.id));
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <PanelGrid ctx={ctx} items={items} area={{ x: safe.left, y: top + 10, w: safe.right - safe.left, h: bottom - top - 20 }} f={f} pull focus={focus} />
    </AbsoluteFill>
  );
};
