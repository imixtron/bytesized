import { Composition, Folder } from "remotion";
import { Episode } from "./compositions/Episode";
import { StingPreview, STING_PREVIEW_FRAMES } from "./compositions/StingPreview";
import { TokensCheck } from "./compositions/TokensCheck";
import { sheetHeight, StoryboardSheet, type StoryboardSheetProps } from "./compositions/StoryboardSheet";
import { GALLERY_BITS_FRAMES, GALLERY_FLOW_FRAMES, GALLERY_NODES_FRAMES, GalleryBits, GalleryFlow, GalleryNodes } from "./compositions/gallery/Galleries";
import { loadEpisode } from "./episode/load";
import { EPISODE_SLUGS } from "./generated/episodes";
import { FPS, HEIGHT, WIDTH } from "./theme/tokens";

export const Root = () => (
  <>
    <Folder name="Episodes">
      {EPISODE_SLUGS.map((folder) => (
        <Composition
          key={folder}
          id={`ep-${folder.split("-")[0]}`}
          component={Episode}
          width={WIDTH}
          height={HEIGHT}
          fps={FPS}
          durationInFrames={1}
          defaultProps={{ folder, loaded: null }}
          calculateMetadata={async ({ props }) => {
            const loaded = await loadEpisode(props.folder);
            return { durationInFrames: loaded.timeline.totalFrames, props: { ...props, loaded } };
          }}
        />
      ))}
    </Folder>
    <Folder name="Checks">
      <Composition id="tokens-check" component={TokensCheck} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={1} />
      <Composition id="sting-preview" component={StingPreview} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={STING_PREVIEW_FRAMES} />
      <Composition
        id="storyboard-sheet"
        component={StoryboardSheet}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={1}
        defaultProps={{ index: 1, part: "hook", sceneId: "hook", range: "0.0s–3.1s", vo: "…", shots: [] } as StoryboardSheetProps}
        calculateMetadata={({ props }) => ({ height: sheetHeight(props) })}
      />
    </Folder>
    <Folder name="Gallery">
      <Composition id="gallery-nodes" component={GalleryNodes} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={GALLERY_NODES_FRAMES} />
      <Composition id="gallery-flow" component={GalleryFlow} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={GALLERY_FLOW_FRAMES} />
      <Composition id="gallery-bits" component={GalleryBits} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={GALLERY_BITS_FRAMES} />
    </Folder>
  </>
);
