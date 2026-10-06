import { Composition, Folder } from "remotion";
import { Episode } from "./compositions/Episode";
import { StingPreview, STING_PREVIEW_FRAMES } from "./compositions/StingPreview";
import { TokensCheck } from "./compositions/TokensCheck";
import { sheetHeight, StoryboardSheet, type StoryboardSheetProps } from "./compositions/StoryboardSheet";
import { CONTACT_HEIGHT, CONTACT_WIDTH, ContactSheet, type ContactSheetProps } from "./compositions/ContactSheet";
import { GALLERY_BITS_FRAMES, GALLERY_FLOW_FRAMES, GALLERY_NODES_FRAMES, GalleryBits, GalleryFlow, GalleryNodes } from "./compositions/gallery/Galleries";
import { BigPicturePreview, DEMOS, DiagramDemo, DiagramSheet, bigPicturePreviewFrames } from "./compositions/gallery/Diagrams";
import { Cover } from "./compositions/Cover";
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
    <Folder name="Covers">
      {EPISODE_SLUGS.map((folder) => (
        <Composition
          key={folder}
          id={`cover-${folder.split("-")[0]}`}
          component={Cover}
          width={WIDTH}
          height={HEIGHT}
          fps={FPS}
          durationInFrames={1}
          defaultProps={{ folder, loaded: null }}
          // long enough that every frozen panel frame exists (Freeze needs frames inside the composition)
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
      <Composition
        id="contact-sheet"
        component={ContactSheet}
        width={CONTACT_WIDTH}
        height={CONTACT_HEIGHT}
        fps={FPS}
        durationInFrames={1}
        defaultProps={{ stills: [] } as ContactSheetProps}
      />
    </Folder>
    <Folder name="Gallery">
      <Composition id="gallery-nodes" component={GalleryNodes} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={GALLERY_NODES_FRAMES} />
      <Composition id="gallery-flow" component={GalleryFlow} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={GALLERY_FLOW_FRAMES} />
      <Composition id="gallery-bits" component={GalleryBits} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={GALLERY_BITS_FRAMES} />
      <Composition
        id="preview-bigpicture-003"
        component={BigPicturePreview}
        width={WIDTH}
        height={HEIGHT}
        fps={FPS}
        durationInFrames={1}
        defaultProps={{ folder: "003-client-server-model", loaded: null }}
        calculateMetadata={async ({ props }) => {
          const loaded = await loadEpisode(props.folder);
          return { durationInFrames: bigPicturePreviewFrames(loaded), props: { ...props, loaded } };
        }}
      />
      <Folder name="Diagrams-v1-5">
        <Composition id="gallery-diagrams-sheet" component={DiagramSheet} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={Math.max(...Object.values(DEMOS).map((d) => d.frames))} />
        {Object.entries(DEMOS).map(([name, d]) => (
          <Composition key={name} id={`gallery-${name}`} component={DiagramDemo} width={WIDTH} height={HEIGHT} fps={FPS} durationInFrames={d.frames} defaultProps={{ demo: name }} />
        ))}
      </Folder>
    </Folder>
  </>
);
