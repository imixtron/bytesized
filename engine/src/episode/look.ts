// Motion looks (variety plan v2): fills each scene's transition / enter / camera from the episode's two
// recipes (episodes/looks.json), unless the scene sets that field itself. Pure and deterministic, so a
// render never depends on anything but episode.yaml. Episodes without a `look:` are left exactly as written.
import looks from "../../../episodes/looks.json";
import type { Episode, Scene } from "./schema";

export type Recipe = { label: string; enter: Scene["enter"]; camera: Scene["camera"]; transitions: Scene["transition"][] };
export const RECIPES = looks.recipes as unknown as Record<string, Recipe>;
/** How many scenes one recipe holds before the other takes over (keeps any entrance style to ≤2 scenes in a row). */
export const SEGMENT = 2;

export function applyLook(ep: Episode, raw: unknown): Episode {
  const names = ep.look?.recipes;
  if (!names?.length) return ep;
  const recipes = names.map((n) => RECIPES[n]).filter(Boolean);
  if (!recipes.length) return ep;
  const rawScenes = ((raw as { scenes?: Record<string, unknown>[] })?.scenes ?? []) as Record<string, unknown>[];
  let cycle = 0;
  let prevTransition: string = "cut";
  const scenes = ep.scenes.map((s, i): Scene => {
    const r = rawScenes[i] ?? {};
    const recipe = recipes[Math.floor(i / SEGMENT) % recipes.length];
    const continued = Boolean(s.stage.reuse);
    let transition = s.transition;
    if (!("transition" in r)) {
      if (i === 0 || ep.scenes[i - 1].part === "hook" || continued) transition = "cut"; // nothing slides in after the hook; a continued diagram doesn't re-wipe
      else {
        const list = recipe.transitions;
        transition = list[cycle % list.length];
        if (transition === prevTransition) transition = list[(cycle + 1) % list.length];
        cycle++;
      }
    }
    prevTransition = transition;
    return { ...s, transition, enter: "enter" in r ? s.enter : recipe.enter, camera: "camera" in r ? s.camera : recipe.camera };
  });
  return { ...ep, scenes };
}
