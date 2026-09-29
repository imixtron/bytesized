// Loads an episode inside Remotion (browser side) from the synced public/ copy, with the
// ElevenLabs voiceover and real word timings when episodes/<ep>/audio/voice.json is up to date.
import { staticFile } from "remotion";
import { parseEpisode } from "./parse";
import { validate, type Issue } from "./rules";
import { buildTimeline, type Timeline } from "../timing/timeline";
import { measuredFrom, type VoiceManifest } from "../voice/manifest";
import type { Episode } from "./schema";
import type { AudioLibrary } from "../audio/library";

export type LoadedEpisode = { episode: Episode; timeline: Timeline; issues: Issue[]; audio: Record<string, string> | null; library: AudioLibrary };

export async function loadEpisode(folder: string): Promise<LoadedEpisode> {
  const res = await fetch(staticFile(`episodes/${folder}/episode.yaml`));
  if (!res.ok) throw new Error(`episodes/${folder}/episode.yaml not found. Run "npm run sync".`);
  const episode = parseEpisode(await res.text());

  let measured;
  let audio: Record<string, string> | null = null;
  const vres = await fetch(staticFile(`episodes/${folder}/audio/voice.json`));
  if (vres.ok) {
    const manifest = (await vres.json()) as VoiceManifest;
    const m = measuredFrom(episode, manifest);
    if ("stale" in m) throw new Error(`voiceover is out of date for: ${m.stale.join(", ")}. Run "npm run voice -- ${folder.split("-")[0]}".`);
    measured = m.measured;
    audio = Object.fromEntries(Object.entries(manifest.scenes).map(([id, s]) => [id, `episodes/${folder}/audio/${s.file}`]));
  }

  const [sfx, music] = await Promise.all(["assets/sfx/library.json", "assets/music/library.json"].map((p) => fetch(staticFile(p)).then((r) => r.json())));
  const library: AudioLibrary = { sfx, music };

  const issues = validate(episode, { measured, sfxIds: Object.keys(sfx.sounds), musicIds: Object.keys(music.tracks) });
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length) throw new Error(`${folder} fails validation:\n${errors.map((e) => `  • [${e.where}] ${e.msg}`).join("\n")}`);
  return { episode, timeline: buildTimeline(episode, measured), issues, audio, library };
}
