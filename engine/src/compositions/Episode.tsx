// A full episode: scenes on charcoal with the persistent chrome and captions, plus the branding
// sting straight after the hook. Each scene is drawn by its template (src/templates/).
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BrandSting } from "../chrome/BrandSting";
import { Captions } from "../chrome/Captions";
import { Chrome } from "../chrome/Chrome";
import { SoundLayer } from "../chrome/SoundLayer";
import type { LoadedEpisode } from "../episode/load";
import type { TimedScene } from "../timing/timeline";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { ease, pop, tween } from "../motion/motion";
import { OVERLAP, OVERLAP_TRANSITIONS, SceneStyleContext, ambient, transitionLook, type Transition } from "../motion/style";
import { TEMPLATE_COMPONENTS } from "../templates";

export type EpisodeProps = { folder: string; loaded: LoadedEpisode | null };

const c = tokens.color;
const { safe, zones } = tokens.layout;
const safeW = safe.right - safe.left;

export const Episode = ({ loaded }: EpisodeProps) => {
  const frame = useCurrentFrame();
  if (!loaded) return <AbsoluteFill style={{ background: c.charcoal }} />;
  const { timeline, episode } = loaded;
  const { sting } = timeline;
  // The hook stays visible under the bite wipe, and the chrome fades out as the orange arrives.
  const wipeFrames = tokens.brandSting.timeline[0].frames[1];
  const stingF = frame - sting.start;
  const inSting = stingF >= 0 && stingF < sting.duration;
  const chromeAlpha = inSting ? Math.max(0, 1 - stingF / wipeFrames) : 1;

  return (
    <AbsoluteFill style={{ background: c.charcoal, color: c.cream }}>
      {timeline.scenes.map((ts, i) => {
        const inKind = arrival(timeline.scenes, i);
        const outKind = arrival(timeline.scenes, i + 1);
        const keep = (OVERLAP_TRANSITIONS as readonly string[]).includes(outKind) ? OVERLAP : 0; // stays under the next scene while it arrives
        return (
          <Sequence key={ts.scene.id} from={ts.start} durationInFrames={ts.duration + (ts.scene.part === "hook" ? wipeFrames : 0) + keep} layout="none">
            <SceneBody ts={ts} loaded={loaded} inKind={inKind} outKind={keep ? outKind : undefined} />
          </Sequence>
        );
      })}
      <ResetStyle />
      {chromeAlpha > 0 && (
        <AbsoluteFill style={{ opacity: chromeAlpha }}>
          <Chrome progress={frame / timeline.totalFrames} series={episode.series} />
        </AbsoluteFill>
      )}
      {timeline.scenes.map((ts) => (
        <Sequence key={`cap-${ts.scene.id}`} from={ts.start} durationInFrames={ts.duration} layout="none">
          {/* captions use absolute word frames, so render them outside the Sequence's time shift */}
          <AbsoluteCaptions ts={ts} offset={ts.start} />
        </Sequence>
      ))}
      {loaded.audio &&
        timeline.scenes.map((ts) =>
          loaded.audio![ts.scene.id] ? (
            <Sequence key={`vo-${ts.scene.id}`} from={ts.start} durationInFrames={ts.duration} layout="none">
              <Audio src={staticFile(loaded.audio![ts.scene.id])} volume={tokens.audio.voice.volume} />
            </Sequence>
          ) : null,
        )}
      <SoundLayer episode={episode} timeline={timeline} voiced={Boolean(loaded.audio)} library={loaded.library} />
      <Sequence from={sting.start} durationInFrames={sting.duration}>
        <BrandSting />
      </Sequence>
    </AbsoluteFill>
  );
};

/** Renders after the scenes: puts the entrance style back to pop for the chrome, captions and sting. */
const ResetStyle = () => {
  ambient.enter = "pop";
  return null;
};

const AbsoluteCaptions = ({ ts, offset }: { ts: TimedScene; offset: number }) => {
  // shift absolute word frames into this Sequence's local time
  const local: TimedScene = { ...ts, start: 0, words: ts.words.map((w) => ({ ...w, start: w.start - offset, end: w.end - offset })) };
  return <Captions scene={local} />;
};

/** How scene `i` arrives. Nothing slides in after the hook: the branding sting sits between them. */
function arrival(scenes: TimedScene[], i: number): Transition {
  const ts = scenes[i];
  if (!ts || i === 0 || scenes[i - 1].scene.part === "hook") return "cut";
  return ts.scene.transition;
}

/** Renders a scene with its template (placeholder if the template isn't built yet), its motion style
 *  (entrance, camera) and its hand-over to and from the neighbouring scenes. */
const SceneBody = ({ ts, loaded, inKind, outKind }: { ts: TimedScene; loaded: LoadedEpisode; inKind: Transition; outKind?: Transition }) => {
  const f = useCurrentFrame();
  const T = TEMPLATE_COMPONENTS[ts.scene.template];
  const push = inKind === "push" ? 1 + 0.04 * tween(f, 0, tokens.motion.pop.frames, ease.std) : 1;
  const drift = ts.scene.camera === "drift" ? Math.min(1, f / Math.max(1, ts.duration)) : 0;
  const { scale, panPx } = tokens.motion.camera.drift;
  const overlapIn = (OVERLAP_TRANSITIONS as readonly string[]).includes(inKind);
  // a flip is two halves (away, then in) and an iris should be seen opening, so those run linearly; the others ease
  const lin = (from: number) => Math.max(0, Math.min(1, (f - from) / OVERLAP));
  const tin = overlapIn ? (inKind === "flip" || inKind === "iris" ? lin(0) : tween(f, 0, OVERLAP, ease.std)) : 1;
  const tout = outKind ? (outKind === "flip" ? lin(ts.duration) : tween(f, ts.duration, OVERLAP, ease.exit)) : 0;
  const hand = transitionLook(inKind, tin, outKind, tout);
  ambient.enter = ts.scene.enter;
  const camera = `scale(${push * (1 + scale * drift)}) translateX(${-panPx * drift}px)`;
  return (
    <AbsoluteFill style={{ ...hand, background: overlapIn ? c.charcoal : undefined }}>
      <AbsoluteFill style={{ transform: camera, transformOrigin: "497px 900px" }}>
        <SceneStyleContext.Provider value={{ enter: ts.scene.enter, camera: ts.scene.camera }}>
          {T ? <T ctx={{ ts, episode: loaded.episode, timeline: loaded.timeline }} /> : <ScenePlaceholder ts={ts} />}
        </SceneStyleContext.Provider>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Fallback scene body for templates not built yet: the headline plus a live list of beats. */
const ScenePlaceholder = ({ ts }: { ts: TimedScene }) => {
  const f = useCurrentFrame(); // local to the scene
  const { scene } = ts;
  const h = scene.headline;
  const hIn = pop(f, 0);
  return (
    <AbsoluteFill>
      {h && (
        <div style={{ position: "absolute", left: safe.left, top: zones.headline.y[0], width: safeW, font: `800 ${tokens.type.headline.size}px/${tokens.type.headline.lineHeight} ${fonts.display}`, letterSpacing: "-.01em", transform: `translateY(${(1 - hIn) * 30}px)`, opacity: Math.min(1, hIn * 1.4) }}>
          {accentSplit(h.text, h.accent)}
        </div>
      )}
      <div style={{ position: "absolute", left: safe.left, top: zones.stage.y[0] + (h ? 40 : -120), width: safeW, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ font: `700 28px ${fonts.mono}`, color: c.cream3, marginBottom: 10 }}>{scene.template} · #{scene.id} · placeholder</div>
        {ts.beats.map((b, i) => {
          const at = b.frame - ts.start;
          const live = f >= at && f < at + 12;
          return (
            <div key={i} style={{ font: `700 30px ${fonts.mono}`, padding: "10px 18px", borderRadius: 14, border: `4px solid ${live ? c.orange : c.line}`, background: live ? "rgba(200,74,39,.25)" : "transparent", color: f >= at ? c.cream : c.cream3 }}>
              “{b.on}” → {b.do} {b.targets.join(", ")}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

function accentSplit(text: string, accent: string) {
  const i = text.toLowerCase().indexOf(accent.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <span style={{ color: c.ember }}>{text.slice(i, i + accent.length)}</span>
      {text.slice(i + accent.length)}
    </>
  );
}
