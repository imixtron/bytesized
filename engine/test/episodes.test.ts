// Every committed episode still parses, and the narration rules only ever warn (v1.7 changes no schema).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseEpisode } from "../src/episode/parse";
import { validate } from "../src/episode/rules";
import { narrationIssues } from "../src/episode/narration";

const EPISODES = join(import.meta.dirname, "../../episodes");
const folders = readdirSync(EPISODES).filter((d) => /^\d+-/.test(d) && existsSync(join(EPISODES, d, "episode.yaml"))).sort();

for (const folder of folders) {
  test(`${folder}: parses; narration issues are warnings only`, () => {
    const ep = parseEpisode(readFileSync(join(EPISODES, folder, "episode.yaml"), "utf8"));
    const narration = new Set(narrationIssues(ep.scenes).map((n) => n.msg));
    const errors = validate(ep).filter((i) => i.level === "error" && narration.has(i.msg));
    assert.deepEqual(errors, []);
  });
}
