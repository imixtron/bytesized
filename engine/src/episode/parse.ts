import { parse } from "yaml";
import { applyLook } from "./look";
import { EpisodeSchema, type Episode } from "./schema";

/** Parses episode.yaml text into a typed Episode, with readable errors on bad structure.
 *  If the episode has a `look:`, scenes that don't set transition / enter / camera get them from its recipes. */
export function parseEpisode(yamlText: string): Episode {
  const raw = parse(yamlText);
  const result = EpisodeSchema.safeParse(raw);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`episode.yaml is invalid:\n${lines.join("\n")}`);
  }
  return applyLook(result.data, raw);
}
