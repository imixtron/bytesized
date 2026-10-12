// Cells template (v1.10 proposal): sharding and buckets. 2–6 cells share the stage; items drop in from the
// top and fly to the cell they belong to, stacking up inside. A cell can run hot (`state: overloaded`).
// stage: { cells: [{ id, label }] (2–6), items: [{ id, label?, into }] (≤14) }
// Verbs: reveal / appear (a cell), step (an item flies into its cell), highlight (focus a cell, rest push
// back), state (`to: overloaded` makes a cell run hot), shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { HATCH, hatch } from "../parts/Diagram";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type Cell = { id: string; label: string };
export type CellItem = { id: string; label?: string; into: string };
export type CellsStage = { cells?: Cell[]; items?: CellItem[] };

const c = tokens.color;
const S = tokens.node.shadow;
const FLY = 18;
const CHIP_H = 52;

export const Cells = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><CellsBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export function cellsLayout(n: number, box: Pick<Box, "w" | "h">) {
  const cols = n <= 2 ? 1 : 2;
  const rows = Math.ceil(n / cols);
  const top = 130; // room for the inbox at the top
  const gap = 28;
  const w = (box.w - S.offset - gap * (cols - 1)) / cols;
  const h = (box.h - top - S.offset - gap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => ({ x: (i % cols) * (w + gap), y: top + Math.floor(i / cols) * (h + gap), w, h }));
}

export const CellsBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as CellsStage;
  const cells = (stage.cells ?? []).slice(0, 6);
  const items = (stage.items ?? []).slice(0, 14);
  const beats = localBeats(ctx.ts);
  const lay = cellsLayout(cells.length, box);
  const pos = new Map(cells.map((cell, i) => [cell.id, lay[i]]));
  const cAt = new Map(cells.map((cell, i) => [cell.id, firstAt(beats, ["reveal", "appear"], cell.id) ?? i * 8]));
  const iAt = items.map((it, i) => firstAt(beats, ["step", "reveal", "appear"], it.id) ?? 14 + cells.length * 8 + i * 14);
  const hot = new Map(cells.flatMap((cell) => { const b = beats.find((x) => x.do === "state" && x.args?.to === "overloaded" && x.targets.includes(cell.id)); return b ? [[cell.id, b.at] as const] : []; }));
  const events: FocusEvent[] = beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => cells.some((cell) => cell.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }).sort((a, b) => a.at - b.at);

  // slot of each item inside its cell: how many earlier items share the cell
  const rankIn = (i: number) => items.slice(0, i).filter((o) => o.into === items[i].into).length;
  const perRow = 3;

  return (
    <>
      <div style={{ position: "absolute", left: 0, width: box.w, top: 20, textAlign: "center", font: `700 ${tokens.type.label.size}px ${fonts.mono}`, color: c.cream3 }}>incoming</div>
      {cells.map((cell) => {
        const p = pos.get(cell.id)!;
        const k = pop(f, cAt.get(cell.id)!);
        const lv = focusLevels(events, cell.id, f);
        const hAt = hot.get(cell.id);
        const hotK = hAt !== undefined && f >= hAt ? tween(f, hAt, 14) : 0;
        const shakeAt = firstAt(beats, ["shake"], cell.id);
        const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
        const stroke = mixColor(mixColor(mixColor(c.cream, c.orange, lv.on), c.warn, hotK), c.cream3, lv.dim);
        const count = items.filter((it, i) => it.into === cell.id && f >= iAt[i] + FLY - 4).length;
        if (k <= 0) return <div key={cell.id} style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h, borderRadius: 30, border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />;
        return (
          <div key={cell.id} style={{ position: "absolute", left: p.x, top: p.y, width: p.w, height: p.h, transform: `translateX(${sh}px) scale(${0.85 + 0.15 * k})`, opacity: Math.min(1, k * 1.5) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 30, background: hatch(hotK > 0.5 ? HATCH.cream : lv.on > 0.5 ? HATCH.orange : lv.dim > 0.5 ? HATCH.dim : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: mixColor(c.surface, "#3a2f22", hotK), border: `${tokens.node.stroke}px solid ${stroke}` }} />
            <div style={{ position: "absolute", left: 24, top: 16, font: `800 36px ${fonts.display}`, color: mixColor(mixColor(c.cream, c.warn, hotK), c.cream3, lv.dim) }}>{cell.label}</div>
            <div style={{ position: "absolute", right: 24, top: 20, font: `700 ${tokens.type.label.size}px ${fonts.mono}`, color: mixColor(hotK > 0.5 ? c.warn : c.cream2, c.cream3, lv.dim) }}>{count > 0 ? count : ""}</div>
          </div>
        );
      })}
      {items.map((it, i) => {
        const p = pos.get(it.into);
        if (!p || f < iAt[i] - 6) return null;
        const r = rankIn(i);
        const chipW = (p.w - 60 - 12 * (perRow - 1)) / perRow;
        const tx = p.x + 30 + (r % perRow) * (chipW + 12) + chipW / 2;
        const ty = p.y + 100 + Math.floor(r / perRow) * (CHIP_H + 12) + CHIP_H / 2;
        const t = tween(f, iAt[i], FLY, ease.std);
        const sx = box.w / 2;
        const sy = 70;
        const x = sx + (tx - sx) * t;
        const y = sy + (ty - sy) * t - Math.sin(t * Math.PI) * 50;
        const landed = t >= 1;
        const cellLv = focusLevels(events, it.into, f);
        return (
          <div key={it.id} style={{ position: "absolute", left: x - (landed ? chipW : 120) / 2, top: y - CHIP_H / 2, width: landed ? chipW : 120, height: CHIP_H, borderRadius: 14, background: c.cream, color: c.charcoal, display: "flex", alignItems: "center", justifyContent: "center", font: `700 26px ${fonts.mono}`, opacity: Math.min(1, (f - (iAt[i] - 6)) / 6) * (1 - 0.6 * cellLv.dim) }}>
            {it.label ?? it.id}
          </div>
        );
      })}
    </>
  );
};
