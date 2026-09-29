// episodes/<nnn-slug>/audio/voice.json: written by scripts/voice.ts, read by the engine.
import type { Episode } from "../episode/schema";
import type { MeasuredWords } from "../timing/timeline";

export type VoiceManifest = {
  voice: string;
  voice_id: string;
  model: string;
  /** "paid" only if every scene was generated on a paid plan (needed for publishing) */
  plan?: "free" | "paid";
  generated: string;
  scenes: Record<string, { file: string; hash: string; text: string; duration: number; words: { text: string; start: number; end: number }[]; plan?: "free" | "paid" }>;
};

/** Measured word timings if the manifest matches the script exactly, otherwise the list of stale scenes. */
export function measuredFrom(ep: Episode, m: VoiceManifest): { measured: MeasuredWords } | { stale: string[] } {
  const stale = ep.scenes
    .filter((s) => m.voice_id !== ep.voice.voice_id || m.scenes[s.id]?.text !== s.vo)
    .map((s) => s.id);
  if (stale.length) return { stale };
  return { measured: Object.fromEntries(ep.scenes.map((s) => [s.id, m.scenes[s.id].words])) };
}
