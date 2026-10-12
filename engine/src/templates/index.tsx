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
import { MetricChart } from "./MetricChart";
import { Snippet } from "./Snippet";
import { Stat } from "./Stat";
import { Timeline } from "./Timeline";
import { Chat } from "./Chat";
import { Diorama } from "./Diorama";
import { Estimate } from "./Estimate";
import { Fleet } from "./Fleet";
import { WorldMap } from "./Map";
import { Matrix } from "./Matrix";
import { Slider } from "./Slider";
import { Cells } from "./Cells";
import { Cluster } from "./Cluster";
import { Ring } from "./Ring";
import { Stream } from "./Stream";
import { StateMachine } from "./StateMachine";
import { Transform } from "./Transform";
import { Tree } from "./Tree";
import { Zoom } from "./Zoom";

export const TEMPLATE_COMPONENTS: Partial<Record<Template, ComponentType<{ ctx: Ctx }>>> = {
  Hook, Analogy, FlowDiagram, ThreeCards, GistCard,
  // v1.5 wave 1
  Sequence, Split, BeforeAfter: Split, Decision, Tiers,
  // v1.6
  BigPicture,
  // v1.8 proposal (Batch 1)
  Timeline, MetricChart, Snippet, Stat,
  // v1.9 proposal (Batch 2)
  Zoom, StateMachine, Tree, Transform,
  // v1.10 proposal (Batch 3)
  Ring, Cells, Stream, Cluster,
  // v1.11 proposal (Batch 4)
  Fleet, Map: WorldMap, Estimate, Chat, Diorama, Matrix, Slider,
};
