// Panel grid (design language v1.6): earlier scenes' diagrams, frozen on their last frame
// and tiled two across. Used by the BigPicture beat (with a pull-back from panel 1) and by the
// episode cover. Each panel is the real template output, cropped to its stage.
import { Freeze } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { Label, StepBadge } from "../parts/Diagram";
import { tokens } from "../theme/tokens";
import type { TimedScene, Timeline } from "../timing/timeline";
import { TEMPLATE_COMPONENTS } from ".";
import { clamp01, focusLevels, type Ctx, type FocusEvent } from "./common";
import type { Box } from "./panel";

const c = tokens.color;
const B = tokens.bigPicture;
const { safe, zones } = tokens.layout;

export type PanelItem = { id: string; scene: string; label?: string };

/** Where a scene's diagram sits on the canvas: its stage, below the headline zone when the
 *  scene (or the diagram it continues) has a headline. */
function cropOf(ts: TimedScene, timeline: Timeline): Box {
  const root = (ts.scene.stage.reuse as string | undefined) ?? ts.scene.id;
  const group = timeline.scenes.filter((t) => t.scene.id === root || t.scene.stage.reuse === root);
  const top = ts.scene.headline || group.some((t) => t.scene.headline) ? zones.stage.y[0] - 10 : zones.headline.y[0];
  return { x: safe.left - 24, y: top, w: safe.right - safe.left + 48, h: zones.stage.y[1] + 20 - top };
}

/** Cells for n panels: two across (one if alone); an odd last panel is centred. */
export function gridCells(n: number, area: Box): Box[] {
  const cols = n <= 1 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const w = (area.w - B.gap * (cols - 1)) / cols;
  const h = (area.h - B.rowGap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const lastAlone = n % cols === 1 && i === n - 1 && cols > 1;
    const col = i % cols;
    return { x: area.x + (lastAlone ? (area.w - w) / 2 : col * (w + B.gap)), y: area.y + r * (h + B.rowGap), w, h };
  });
}

/** One earlier scene, frozen on its last frame and fitted into a cell. */
const FrozenPanel = ({ ctx, ts, cell, alpha }: { ctx: Ctx; ts: TimedScene; cell: Box; alpha: number }) => {
  const T = TEMPLATE_COMPONENTS[ts.scene.template];
  if (!T) return null;
  const crop = cropOf(ts, ctx.timeline);
  const s = Math.min(cell.w / crop.w, cell.h / crop.h);
  return (
    <div style={{ position: "absolute", left: cell.x, top: cell.y, width: cell.w, height: cell.h, borderRadius: B.radius, border: `${B.border}px solid ${c.line}`, background: c.charcoal, overflow: "hidden", opacity: alpha }}>
      {/* clip to the crop itself, so nothing above the stage (the headline) shows in the letterbox */}
      <div style={{ position: "absolute", left: (cell.w - crop.w * s) / 2, top: (cell.h - crop.h * s) / 2, width: crop.w * s, height: crop.h * s, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -crop.x * s, top: -crop.y * s, width: tokens.canvas.width, height: tokens.canvas.height, transform: `scale(${s})`, transformOrigin: "0 0" }}>
          <Freeze frame={Math.max(0, ts.duration - 1)}>
            <T ctx={{ ...ctx, ts }} />
          </Freeze>
        </div>
      </div>
    </div>
  );
};

/** The grid. `pull`: the camera starts inside panel 1 and pulls back to show them all.
 *  `focus`: highlight events; the focused panel stays bright and the rest fade back. */
export const PanelGrid = ({ ctx, items, area, f, pull = false, focus }: { ctx: Ctx; items: PanelItem[]; area: Box; f: number; pull?: boolean; focus?: FocusEvent[] }) => {
  const found = items.map((it) => ({ it, ts: ctx.timeline.scenes.find((t) => t.scene.id === it.scene) })).filter((x): x is { it: PanelItem; ts: TimedScene } => Boolean(x.ts));
  const cells = gridCells(found.length, area);
  const p = pull ? tween(f, B.pullDelay, B.pullFrames, ease.std) : 1;
  const first = cells[0];
  // camera: from "panel 1 fills the area" (p = 0) to the whole grid (p = 1)
  const Z = first ? Math.min(area.w / first.w, area.h / first.h) : 1;
  const k = 1 + (Z - 1) * (1 - p);
  const fx = first ? area.x + area.w / 2 - (first.x + first.w / 2) * k : 0;
  const fy = first ? area.y + area.h / 2 - (first.y + first.h / 2) * k : 0;
  const tx = fx * (1 - p);
  const ty = fy * (1 - p);
  return (
    <div style={{ position: "absolute", inset: 0, transform: `translate(${tx}px, ${ty}px) scale(${1 + (k - 1) * 1})`, transformOrigin: "0 0" }}>
      {found.map(({ it, ts }, i) => {
        const cell = cells[i];
        const enter = i === 0 || !pull ? 1 : clamp01((f - B.pullDelay - B.pullFrames * 0.35 - i * B.stagger) / 8);
        const lv = focusLevels(focus ?? [], it.id, f);
        const dim = 1 - (1 - B.dim) * lv.dim;
        const on = lv.on > 0.5;
        return (
          <div key={it.id}>
            <FrozenPanel ctx={ctx} ts={ts} cell={cell} alpha={enter * dim} />
            {enter > 0 && (
              <>
                <StepBadge n={i + 1} x={cell.x + 48} y={cell.y} on={on} k={pull ? pop(f, B.pullDelay + B.pullFrames * 0.6 + i * B.stagger) : 1} dim={lv.dim > 0.5} />
                {it.label && <Label x={cell.x + cell.w / 2} y={cell.y + cell.h} text={it.label} color={on ? c.cream : c.cream2} size={tokens.type.minSize} k={enter} />}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};

/** Panels for a cover when the episode has no BigPicture: the last scene of each diagram,
 *  one per template (latest wins), in story order, up to `max`. */
export function autoPanels(timeline: Timeline, diagrams: Set<string>, max: number): PanelItem[] {
  const breakdown = timeline.scenes.filter((t) => t.scene.part === "breakdown" && diagrams.has(t.scene.template));
  const lastOfGroup = new Map<string, TimedScene>();
  const headlineOf = new Map<string, string>(); // a diagram's label: its latest headline across the scenes it spans
  for (const t of breakdown) {
    const root = (t.scene.stage.reuse as string | undefined) ?? t.scene.id;
    lastOfGroup.set(root, t);
    if (t.scene.headline) headlineOf.set(root, t.scene.headline.text.toLowerCase());
  }
  const byTemplate = new Map<string, TimedScene>();
  for (const t of lastOfGroup.values()) byTemplate.set(t.scene.template, t);
  return [...byTemplate.values()].sort((a, b) => a.index - b.index).slice(0, max)
    .map((t) => ({ id: `auto-${t.scene.id}`, scene: t.scene.id, label: headlineOf.get((t.scene.stage.reuse as string | undefined) ?? t.scene.id) }));
}
