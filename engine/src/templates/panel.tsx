// Panels (design language v1.5): every diagram template draws its body in local
// coordinates inside a box. In a scene the box is the stage; a later BigPicture beat can tile
// several bodies by giving each a smaller box and a scale.
import type { CSSProperties, ReactNode } from "react";
import type { Scene } from "../episode/schema";
import { tokens } from "../theme/tokens";
import { stageBox } from "./common";

export type Box = { x: number; y: number; w: number; h: number };

/** The stage as a panel box: full safe width, under the headline (or including its zone). */
export function stagePanel(scene: Scene, hasHeadline = Boolean(scene.headline)): Box {
  const { safe } = tokens.layout;
  const pad = tokens.diagram.panel.pad;
  const { top, bottom } = stageBox(scene, hasHeadline);
  return { x: safe.left, y: top + pad, w: safe.right - safe.left, h: bottom - top - 2 * pad };
}

/** Positions children (drawn in local 0..w, 0..h coordinates) at a box, optionally scaled. */
export const Panel = ({ box, scale = 1, children, style }: { box: Box; scale?: number; children: ReactNode; style?: CSSProperties }) => (
  <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w / scale, height: box.h / scale, transform: `scale(${scale})`, transformOrigin: "0 0", ...style }}>
    {children}
  </div>
);
