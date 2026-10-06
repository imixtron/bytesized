// Template registry: template name (episode.yaml) → component.
import type { ComponentType } from "react";
import type { Template } from "../episode/schema";
import { Analogy } from "./Analogy";
import { BigPicture } from "./BigPicture";
import type { Ctx } from "./common";
import { FlowDiagram } from "./FlowDiagram";
import { Decision } from "./Decision";
import { GistCard } from "./GistCard";
import { Hook } from "./Hook";
import { Sequence } from "./Sequence";
import { Split } from "./Split";
import { ThreeCards } from "./ThreeCards";
import { Tiers } from "./Tiers";

export const TEMPLATE_COMPONENTS: Partial<Record<Template, ComponentType<{ ctx: Ctx }>>> = {
  Hook, Analogy, FlowDiagram, ThreeCards, GistCard,
  // v1.5 wave 1
  Sequence, Split, BeforeAfter: Split, Decision, Tiers,
  // v1.6
  BigPicture,
};
