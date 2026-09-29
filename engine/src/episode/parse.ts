import { parse } from "yaml";
import { EpisodeSchema, type Episode } from "./schema";

/** Parses episode.yaml text into a typed Episode, with readable errors on bad structure. */
export function parseEpisode(yamlText: string): Episode {
  const result = EpisodeSchema.safeParse(parse(yamlText));
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`episode.yaml is invalid:\n${lines.join("\n")}`);
  }
  return result.data;
}
