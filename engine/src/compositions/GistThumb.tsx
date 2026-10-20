// Gist image: the episode's final GistCard scene, settled (accent lit), on charcoal with the corner
// mark. No captions or progress bar. Platform-agnostic, same size as the video.
// `npm run gist -- <nnn>` (and `render:final`) → out/gist.png
import { AbsoluteFill, Freeze } from "remotion";
import { CornerMark, PartTag } from "../chrome/Chrome";
import type { LoadedEpisode } from "../episode/load";
import { SceneStyleContext, ambient } from "../motion/style";
import { GistCard } from "../templates/GistCard";
import { tokens } from "../theme/tokens";

const c = tokens.color;

export type GistThumbProps = { folder: string; loaded: LoadedEpisode | null };

export const GistThumb = ({ loaded }: GistThumbProps) => {
  const ts = loaded?.timeline.scenes.find((t) => t.scene.template === "GistCard");
  if (!loaded || !ts) return <AbsoluteFill style={{ background: c.charcoal }} />;
  const { episode, timeline } = loaded;
  ambient.enter = ts.scene.enter;
  return (
    <AbsoluteFill style={{ background: c.charcoal, color: c.cream }}>
      <Freeze frame={ts.duration - 1}>
        <SceneStyleContext.Provider value={{ enter: ts.scene.enter, camera: ts.scene.camera }}>
          <GistCard ctx={{ ts, episode, timeline }} />
        </SceneStyleContext.Provider>
      </Freeze>
      <CornerMark />
      {episode.series && <PartTag part={episode.series.part} of={episode.series.of} />}
    </AbsoluteFill>
  );
};
