// Audio library (design language v1.4 §8): assets/music/library.json and assets/sfx/library.json.
// Specs (prompt, length) and files (what exists, where it came from, whether it's licensed) are kept
// apart, so a spec can exist before its file is generated. Shared by the engine and the CLI scripts.
import { tokens } from "../theme/tokens";

export type FileEntry = {
  file: string;
  source: "elevenlabs" | "generated" | "licensed";
  plan: "free" | "paid" | "n/a";
  licensed: boolean;
  created: string;
  by?: string;
  prompt?: string;
  credits?: number;
};
export type SfxLibrary = { sounds: Record<string, { prompt: string; seconds: number }>; files: Record<string, FileEntry> };
export type MusicLibrary = { tracks: Record<string, { prompt?: string; seconds?: number; instrumental?: boolean; note?: string }>; files: Record<string, FileEntry> };
export type AudioLibrary = { sfx: SfxLibrary; music: MusicLibrary };

export const SFX_DIR = "assets/sfx";
export const MUSIC_DIR = "assets/music";

/** Public path of a sound, or null if it hasn't been generated yet (it's then silently skipped). */
export const sfxPath = (lib: AudioLibrary, id: string) => (lib.sfx.files[id] ? `${SFX_DIR}/${lib.sfx.files[id].file}` : null);

/** The episode's music: its own pick (music.track, set by `npm run music:assign`), else the theme, else the first fallback that exists. */
export function musicFor(lib: AudioLibrary, requested?: string): { id: string; path: string } | null {
  const order = [requested, tokens.audio.music.theme, ...tokens.audio.music.fallbacks].filter(Boolean) as string[];
  for (const id of order) {
    const f = lib.music.files[id];
    if (f) return { id, path: `${MUSIC_DIR}/${f.file}` };
  }
  return null;
}

/** Which sound a beat makes, by the sound map in tokens (a beat's own `sfx` overrides it; "none" mutes). */
export function sfxForBeat(b: { do: string; args?: Record<string, unknown>; sfx?: string }): string | null {
  if (b.sfx) return b.sfx === "none" ? null : b.sfx;
  const map = tokens.audio.map as Record<string, string>;
  if (b.do === "state") return map[`state:${String(b.args?.to ?? "")}`] ?? null;
  return map[b.do] ?? null;
}
