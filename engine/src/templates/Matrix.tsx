// Matrix template (v1.11 proposal): options × criteria. 2–4 option columns, 2–5 criteria rows; each cell
// is a ✓, a ✕, a ~ (partly) or a short word. Rows fill in one at a time; `highlight` an option column
// (or a row) and everything else steps back.
// stage: { cols: [{ id, label, icon? }] (2–4), rows: [{ id, label, cells: [yes | no | partial | "text"] }] (2–5) }
// Verbs: reveal / appear (a row fills in), highlight (a column or a row).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../motion/motion";
import { HATCH, hatch } from "../parts/Diagram";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type MCol = { id: string; label: string; icon?: IconName };
export type MRow = { id: string; label: string; cells: string[] };
export type MatrixStage = { cols?: MCol[]; rows?: MRow[] };

const c = tokens.color;
const S = tokens.node.shadow;

export const Matrix = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><MatrixBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

const Glyph = ({ v, size, dim }: { v: string; size: number; dim: number }) => {
  const word = !["yes", "no", "partial"].includes(v);
  if (word) return <div style={{ font: `800 ${size * 0.5}px/1.05 ${fonts.text}`, color: mixColor(c.cream, c.cream3, dim), textAlign: "center", padding: "0 6px" }}>{v}</div>;
  const col = v === "yes" ? c.ok : v === "no" ? c.down : c.warn;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: mixColor(col, c.line, dim), display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="58%" height="58%" viewBox="0 0 24 24"><path d={v === "yes" ? "M5 12.5l4.5 4.5L19 7.5" : v === "no" ? "M6.5 6.5l11 11M17.5 6.5l-11 11" : "M5 12h14"} fill="none" stroke={c.charcoal} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" /></svg>
    </div>
  );
};

export const MatrixBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as MatrixStage;
  const cols = (stage.cols ?? []).slice(0, 4);
  const rows = (stage.rows ?? []).slice(0, 5);
  const beats = localBeats(ctx.ts);
  const labelW = cols.length >= 4 ? 190 : 250;
  const headH = 170;
  const gap = 14;
  const cw = (box.w - S.offset - labelW - gap * cols.length) / cols.length;
  const rh = Math.min(190, (box.h - headH - S.offset - gap * rows.length) / rows.length);
  const at = rows.map((r, i) => firstAt(beats, ["reveal", "appear"], r.id) ?? 24 + i * 34);
  const events: FocusEvent[] = beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => cols.some((q) => q.id === x) || rows.some((r) => r.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }).sort((a, b) => a.at - b.at);
  const colX = (j: number) => labelW + gap + j * (cw + gap);

  return (
    <>
      {cols.map((col, j) => {
        const k = pop(f, j * 4);
        const lv = focusLevels(events, col.id, f);
        const any = events.some((e) => cols.some((q) => q.id === e.id) && f >= e.at);
        const dimmed = any ? 1 - lv.on : 0;
        return (
          <div key={col.id}>
            {lv.on > 0.01 && <div style={{ position: "absolute", left: colX(j) - 8, top: 0, width: cw + 16, height: headH + rows.length * (rh + gap) + 8, borderRadius: 30, border: `6px solid ${c.orange}`, opacity: lv.on, background: "rgba(200,74,39,.07)" }} />}
            <div style={{ position: "absolute", left: colX(j), top: 10, width: cw, height: headH - 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 1.5) * (1 - 0.5 * dimmed) }}>
              {col.icon && <Icon name={col.icon} size={64} color={mixColor(c.cream, c.ember, lv.on)} />}
              <div style={{ font: `800 ${cols.length >= 4 ? 30 : 38}px/1.05 ${fonts.display}`, color: mixColor(c.cream, c.ember, lv.on), textAlign: "center" }}>{col.label}</div>
            </div>
          </div>
        );
      })}
      {rows.map((r, i) => {
        const y = headH + i * (rh + gap);
        const lv = focusLevels(events, r.id, f);
        const rowAny = events.some((e) => rows.some((q) => q.id === e.id) && f >= e.at);
        const colAny = events.some((e) => cols.some((q) => q.id === e.id) && f >= e.at);
        const kRow = pop(f, at[i]);
        if (kRow <= 0) return <div key={r.id} style={{ position: "absolute", left: 0, top: y, width: box.w - S.offset, height: rh, borderRadius: 26, border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />;
        return (
          <div key={r.id} style={{ position: "absolute", left: 0, top: y, width: box.w - S.offset, height: rh, opacity: Math.min(1, kRow * 1.5) * (rowAny ? 1 - 0.5 * (1 - lv.on) : 1) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset * 0.7}px, ${S.offset * 0.7}px)`, borderRadius: 26, background: hatch(lv.on > 0.5 ? HATCH.orange : HATCH.cream), opacity: 0.8 }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: c.surface, border: `${tokens.node.stroke}px solid ${mixColor(c.cream, c.orange, lv.on)}` }} />
            <div style={{ position: "absolute", left: 24, top: 0, width: labelW - 30, height: rh, display: "flex", alignItems: "center", font: `800 34px/1.1 ${fonts.text}`, color: c.cream }}>{r.label}</div>
            {cols.map((col, j) => {
              const kc = pop(f, at[i] + 4 + j * tokens.motion.stagger.frames);
              const clv = focusLevels(events, col.id, f);
              const dim = colAny ? 1 - clv.on : 0;
              return (
                <div key={col.id} style={{ position: "absolute", left: colX(j), top: 0, width: cw, height: rh, display: "flex", alignItems: "center", justifyContent: "center", transform: `scale(${kc})`, opacity: Math.min(1, kc * 1.5) }}>
                  <Glyph v={r.cells[j] ?? ""} size={Math.min(96, rh * 0.55)} dim={dim * 0.8} />
                </div>
              );
            })}
          </div>
        );
      })}
    </>
  );
};
