// Music + sound effects (design language v1.3 §8). The voice itself is placed per scene in Episode.tsx.
// Music: the channel theme from the audio library, looping if needed, ducked while the voice speaks.
// SFX: chosen by the sound map from beats and transitions (a beat's `sfx:` overrides; "none" mutes).
// Sounds that haven't been generated yet are skipped silently.
import { Audio, Sequence, interpolate, staticFile } from "remotion";
import { musicFor, sfxForBeat, sfxPath, type AudioLibrary } from "../audio/library";
import type { Episode } from "../episode/schema";
import { tokens } from "../theme/tokens";
import type { Timeline } from "../timing/timeline";

const A = tokens.audio;
const FPS = tokens.canvas.fps;
const level = (id: string) => (A.levels as Record<string, number>)[id] ?? A.levels.default;

type Cue = { frame: number; id: string };

/** Every sound cue in the episode, in frame order, with repeats of one sound thinned to minGapFrames. */
export function sfxCues(timeline: Timeline): Cue[] {
  const cues: Cue[] = [{ frame: timeline.sting.start, id: A.map.sting }];
  for (const ts of timeline.scenes) {
    if (ts.scene.transition === "push") cues.push({ frame: ts.start, id: A.map.push });
    for (const b of ts.beats) {
      const id = sfxForBeat(b);
      if (id) cues.push({ frame: b.frame, id });
    }
  }
  cues.sort((a, b) => a.frame - b.frame);
  const last: Record<string, number> = {};
  return cues.filter((c) => {
    if (last[c.id] !== undefined && c.frame - last[c.id] < A.minGapFrames) return false;
    last[c.id] = c.frame;
    return true;
  });
}

export const SoundLayer = ({ episode, timeline, voiced, library }: { episode: Episode; timeline: Timeline; voiced: boolean; library: AudioLibrary }) => {
  const total = timeline.totalFrames;
  const spans = timeline.scenes.filter((s) => s.words.length).map((s) => [s.words[0].start, s.words.at(-1)!.end] as const);
  const base = episode.music.volume ?? A.music.volume;
  const music = musicFor(library, episode.music.track);

  const musicVolume = (f: number) => {
    const dist = Math.min(...spans.map(([a, b]) => (f < a ? a - f : f > b ? f - b : 0)));
    const duck = voiced ? interpolate(dist, [0, A.music.duckRampFrames], [A.music.duckTo, 1], { extrapolateRight: "clamp" }) : 1;
    const fade = interpolate(f, [0, A.music.fadeInSec * FPS, total - A.music.fadeOutSec * FPS, total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return base * duck * fade;
  };

  return (
    <>
      {music && <Audio src={staticFile(music.path)} loop volume={musicVolume} />}
      {sfxCues(timeline).map((c, i) => {
        const path = sfxPath(library, c.id);
        if (!path) return null;
        // whooshes lead their cue slightly so the peak lands on the beat
        const lead = c.id === A.map.flood || c.id === A.map.push ? 4 : 0;
        return (
          <Sequence key={i} from={Math.max(0, c.frame - lead)} durationInFrames={2 * FPS} layout="none">
            <Audio src={staticFile(path)} volume={level(c.id)} />
          </Sequence>
        );
      })}
    </>
  );
};
