// Turns an episode into frame-accurate timing: scenes, words, beats and the branding sting.
// Until ElevenLabs timestamps exist (4.5), word times are estimated from a speaking pace;
// pass `measured` word timings per scene to replace the estimate without changing anything else.
import { tokens } from "../theme/tokens";
import type { Beat, Episode, Scene } from "../episode/schema";
import { findWord, tokenize } from "../episode/words";

const FPS = tokens.canvas.fps;

/** Speaking-pace estimate: ~2.5 words/sec, with pauses at punctuation. */
export const ESTIMATE = { wordSec: 0.4, shortPauseSec: 0.15, longPauseSec: 0.3, sceneLeadSec: 0.15, sceneTailSec: 0.35 };

export type TimedWord = { text: string; start: number; end: number }; // absolute frames
export type TimedBeat = Beat & { frame: number; targets: string[] };
export type TimedScene = {
  scene: Scene;
  index: number;
  start: number; // absolute frame
  duration: number; // frames
  words: TimedWord[];
  beats: TimedBeat[];
};
export type Sting = { start: number; duration: number };
export type Timeline = { scenes: TimedScene[]; sting: Sting; totalFrames: number; source: "estimate" | "measured" };

/** Word timings in seconds, relative to the start of that scene's audio. */
export type MeasuredWords = Record<string, { start: number; end: number }[]>;

const sec = (s: number) => Math.round(s * FPS);

function estimateWords(vo: string) {
  let t = ESTIMATE.sceneLeadSec;
  return tokenize(vo).map((tok) => {
    const start = t;
    const end = start + ESTIMATE.wordSec;
    t = end + (tok.pauseAfter === "long" ? ESTIMATE.longPauseSec : tok.pauseAfter === "short" ? ESTIMATE.shortPauseSec : 0);
    return { start, end };
  });
}

export function buildTimeline(ep: Episode, measured?: MeasuredWords): Timeline {
  const stingFrames = tokens.brandSting.frames;
  const scenes: TimedScene[] = [];
  let cursor = 0;
  let sting: Sting = { start: 0, duration: stingFrames };

  ep.scenes.forEach((scene, index) => {
    const toks = tokenize(scene.vo);
    const secs = measured?.[scene.id] ?? estimateWords(scene.vo);
    const words = toks.map((tok, i) => ({ text: tok.text, start: cursor + sec(secs[i].start), end: cursor + sec(secs[i].end) }));
    const lastEnd = secs.length ? secs[secs.length - 1].end : 0;
    const duration = sec(lastEnd + ESTIMATE.sceneTailSec);

    const beats: TimedBeat[] = scene.beats.map((b) => {
      const w = findWord(toks, b.on);
      const at = w >= 0 ? words[w].start : cursor;
      return { ...b, frame: at + sec(b.offset ?? 0), targets: b.target === undefined ? [] : [b.target].flat() };
    });

    scenes.push({ scene, index, start: cursor, duration, words, beats });
    cursor += duration;

    // Branding sting sits straight after the hook (design language v1.1 §7).
    if (scene.part === "hook") {
      sting = { start: cursor, duration: stingFrames };
      cursor += stingFrames;
    }
  });

  return { scenes, sting, totalFrames: cursor, source: measured ? "measured" : "estimate" };
}
