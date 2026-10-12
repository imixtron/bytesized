// Shape of episode.yaml (episodes/SCRIPT-FORMAT.md v1.0 §2–3).
// Structure is checked here; content rules (headline runs, beats, heroes…) live in rules.ts.
import { z } from "zod";

export const PARTS = ["hook", "idea", "breakdown", "gist"] as const;
export const TEMPLATES = [
  "Hook", "Analogy", "FlowDiagram", "ThreeCards", "BeforeAfter", "MetricChart", "Zoom", "GistCard",
  // v1.5 wave-1 diagram templates: BeforeAfter is drawn by Split
  "Sequence", "Split", "Decision", "Tiers",
  // v1.6: pull-back over earlier panels before the gist
  "BigPicture",
  // v1.8 proposal (variety plan Batch 1): vertical time, snippets and stat-slam hooks
  "Timeline", "Snippet", "Stat",
  // v1.9 proposal (variety plan Batch 2): StateMachine, Tree and Transform (Zoom is listed above)
  "StateMachine", "Tree", "Transform",
  // v1.10 proposal (variety plan Batch 3): Ring, Cells, Stream, Cluster
  "Ring", "Cells", "Stream", "Cluster",
  // v1.11 proposal (variety plan Batch 4): Fleet, Map, Estimate, Chat, Diorama, Matrix, Slider
  "Fleet", "Map", "Estimate", "Chat", "Diorama", "Matrix", "Slider",
] as const;
export const NODE_TYPES = [
  "phone", "user", "crowd", "server", "db", "lb", "cache", "queue", "cdn",
  "gateway", "dns", "storage", "service", "internet", "thirdparty", "brand",
] as const;
export const FAMILIES = ["outlined", "solid", "hero"] as const;
export const VERBS = [
  "appear", "highlight", "dim", "undim", "state", "send", "flood",
  "count", "reveal", "shake", "reroute", "zoom", "accent",
  "step", "branch", "race", // v1.5: Sequence, Decision, Split
] as const;
export const STATES = ["idle", "active", "overloaded", "down", "recovered", "dimmed"] as const;

/** Templates where a third-party brand node may appear (diagrams only). */
export const BRAND_NODE_TEMPLATES: readonly Template[] = ["Hook", "FlowDiagram", "Zoom", "BeforeAfter", "Split", "Sequence"];

export const NodeSchema = z.object({
  id: z.string(),
  type: z.enum(NODE_TYPES),
  family: z.enum(FAMILIES).default("outlined"),
  label: z.string().optional(),
  logo: z.string().optional(),
  /** v1.5: override the type's icon with any icon from the set (parts/icons.tsx) */
  icon: z.string().optional(),
});

export const HeadlineSchema = z.object({ text: z.string().min(1), accent: z.string().min(1) });

export const BeatSchema = z.object({
  on: z.string().min(1),
  do: z.enum(VERBS),
  target: z.union([z.string(), z.array(z.string())]).optional(),
  offset: z.number().optional(),
  args: z.record(z.string(), z.unknown()).optional(),
  /** optional sound override: a sound id from assets/sfx/library.json, or "none" to mute */
  sfx: z.string().optional(),
});

export const StageSchema = z.looseObject({
  nodes: z.array(NodeSchema).optional(),
  reuse: z.string().optional(),
});

export const SceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "scene ids are lowercase-kebab"),
  part: z.enum(PARTS),
  template: z.enum(TEMPLATES),
  vo: z.string().min(1),
  headline: HeadlineSchema.optional(),
  /** how the scene arrives; whip, flip, stack, dive and iris (v1.7+) keep the previous scene under it for a few frames */
  transition: z.enum(["cut", "push", "whip", "flip", "stack", "dive", "iris"]).default("cut"),
  /** v1.7: how nodes enter in this scene */
  enter: z.enum(["pop", "drop", "snap", "stamp", "wipe"]).default("pop"),
  /** v1.7: camera behaviour in this scene (drift = slow creep, rack = dimmed nodes blur) */
  camera: z.enum(["still", "drift", "rack"]).default("still"),
  stage: StageSchema.default({}),
  beats: z.array(BeatSchema).default([]),
});

export const EpisodeSchema = z.strictObject({
  id: z.number().int().positive(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string(),
  topic: z.string(),
  target_sec: z.number().min(80).max(90),
  /** script format the episode was written to; "1.3" or later turns the variety rules into hard fails; "1.5" or later uses the visual-plan rules */
  format: z.string().optional(),
  /** format 1.5+: the topic's spine diagram(s) and why each other template is there (max 300 characters, checked by the validator) */
  visual_plan: z.string().optional(),
  series: z
    .object({
      key: z.string(),
      part: z.union([z.literal(1), z.literal(2)]),
      of: z.literal(2),
      teaser: z.string().optional(),
      recap: z.string().optional(),
    })
    .optional(),
  brands: z.array(z.string()).default([]),
  voice: z.object({ name: z.string().optional(), voice_id: z.string(), speed: z.number().default(1) }),
  /** set by `npm run music:assign` (random sibling theme, episodes/music.json); if omitted, the main theme (tokens.audio.music.theme) */
  music: z.object({ track: z.string().optional(), volume: z.number().min(0).max(1).optional() }).default({}),
  /** set by `npm run look:assign -- <nnn>` (episodes/looks.json): two motion recipes; scenes that don't set transition / enter / camera take them from it */
  look: z.object({ recipes: z.array(z.string()).min(1).max(2) }).optional(),
  scenes: z.array(SceneSchema).min(1),
});

export type Part = (typeof PARTS)[number];
export type Template = (typeof TEMPLATES)[number];
export type NodeSpec = z.infer<typeof NodeSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
