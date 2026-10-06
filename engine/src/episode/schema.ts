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
  transition: z.enum(["cut", "push"]).default("cut"),
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
  scenes: z.array(SceneSchema).min(1),
});

export type Part = (typeof PARTS)[number];
export type Template = (typeof TEMPLATES)[number];
export type NodeSpec = z.infer<typeof NodeSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
