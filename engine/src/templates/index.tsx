// Template registry: template name (episode.yaml) → component.
import type { ComponentType } from "react";
import type { Template } from "../episode/schema";
import { Analogy } from "./Analogy";
import type { Ctx } from "./common";
import { FlowDiagram } from "./FlowDiagram";
import { GistCard } from "./GistCard";
import { Hook } from "./Hook";
import { ThreeCards } from "./ThreeCards";

export const TEMPLATE_COMPONENTS: Partial<Record<Template, ComponentType<{ ctx: Ctx }>>> = {
  Hook, Analogy, FlowDiagram, ThreeCards, GistCard,
};
