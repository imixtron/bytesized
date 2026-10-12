// Map template (v1.11 proposal): geography. A dot-matrix world with pins, arcs between them that a packet
// rides, and a latency list underneath that fills in as each route is stepped.
// stage: { pins: [{ id, label, at: [lon, lat], kind?: origin | edge | user }] (2–6),
//          routes: [{ id, from, to, ms?: number }] (≤5) }
// Verbs: reveal / appear (a pin), step (a packet rides a route; its latency row appears), highlight (focus
// a pin or route, rest push back).
import { getPointAtLength, getLength } from "@remotion/paths";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { Arrow, Svg } from "../parts/Diagram";
import { Packet, travelFrames } from "../parts/Flow";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type Pin = { id: string; label: string; at: [number, number]; kind?: "origin" | "edge" | "user" };
export type Route = { id: string; from: string; to: string; ms?: number };
export type MapStage = { pins?: Pin[]; routes?: Route[] };

const c = tokens.color;

// A 60 × 24 dot map: column = 6° of longitude from −180°, row = 5° of latitude from 75°N. Land spans per row (inclusive columns).
const LAND: [number, number][][] = [
  [[6, 14], [20, 25], [42, 59]],
  [[3, 20], [19, 25], [31, 35], [36, 59]],
  [[3, 19], [21, 24], [25, 26], [31, 34], [35, 59]],
  [[6, 20], [29, 30], [31, 59]],
  [[6, 21], [29, 30], [31, 59]],
  [[8, 21], [28, 59]],
  [[9, 21], [28, 35], [36, 57]],
  [[9, 20], [27, 57]],
  [[10, 19], [27, 44], [44, 56]],
  [[10, 17], [27, 39], [41, 55]],
  [[10, 16], [27, 40], [42, 45], [46, 50]],
  [[11, 16], [27, 40], [42, 44], [46, 50]],
  [[14, 21], [27, 39], [41, 43], [47, 50]],
  [[17, 22], [28, 38], [42, 43], [47, 52]],
  [[17, 24], [30, 38], [46, 53]],
  [[18, 25], [31, 38], [47, 55]],
  [[19, 26], [31, 38], [48, 52]],
  [[19, 26], [31, 37], [51, 53]],
  [[19, 25], [31, 37], [38, 38], [49, 56]],
  [[19, 25], [31, 36], [49, 57]],
  [[19, 24], [31, 36], [49, 57]],
  [[19, 23], [31, 35], [49, 57]],
  [[19, 23], [32, 34], [51, 56], [59, 59]],
  [[19, 22], [53, 54], [58, 59]],
];
const COLS = 60;
const ROWS = LAND.length;

export const WorldMap = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><WorldMapBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const WorldMapBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as MapStage;
  const pins = (stage.pins ?? []).slice(0, 6);
  const routes = (stage.routes ?? []).slice(0, 5);
  const beats = localBeats(ctx.ts);
  const dx = box.w / COLS;
  const dy = dx * (5 / 6) * 1.15;
  const mapH = dy * ROWS;
  const mapTop = 10;
  const xy = (p: Pin) => ({ x: ((p.at[0] + 180) / 360) * box.w, y: mapTop + ((75 - p.at[1]) / 5) * dy });
  const pos = new Map(pins.map((p) => [p.id, xy(p)]));
  const pAt = new Map(pins.map((p, i) => [p.id, firstAt(beats, ["reveal", "appear"], p.id) ?? 8 + i * 10]));
  const stepAt = new Map(routes.map((r, i) => [r.id, firstAt(beats, ["step"], r.id) ?? 30 + pins.length * 10 + i * 36]));
  const events: FocusEvent[] = beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => pins.some((p) => p.id === x) || routes.some((r) => r.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }).sort((a, b) => a.at - b.at);
  const arc = (r: Route) => {
    const a = pos.get(r.from)!;
    const b = pos.get(r.to)!;
    const lift = Math.min(160, Math.hypot(b.x - a.x, b.y - a.y) * 0.4);
    return `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${Math.min(a.y, b.y) - lift} ${b.x} ${b.y}`;
  };
  const maxMs = Math.max(1, ...routes.map((r) => r.ms ?? 0));
  const listTop = mapTop + mapH + 50;
  const rowH = Math.min(120, (box.h - listTop) / Math.max(1, routes.length));

  return (
    <>
      <Svg>
        {LAND.flatMap((spans, r) => spans.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => {
          const col = a + i;
          const k = tween(f, (col + r) * 0.4, 14);
          return <circle key={`${r}-${col}`} cx={(col + 0.5) * dx} cy={mapTop + (r + 0.5) * dy} r={dx * 0.26} fill={c.cream3} opacity={0.85 * k} />;
        })))}
        {routes.map((r) => {
          if (!pos.has(r.from) || !pos.has(r.to)) return null;
          const lv = focusLevels(events, r.id, f);
          const at = stepAt.get(r.id)!;
          return <Arrow key={r.id} d={arc(r)} progress={(f - at) / travelFrames(arc(r))} color={mixColor(mixColor(c.cream3, c.orange, lv.on), c.line, lv.dim)} head={false} width={6} />;
        })}
      </Svg>
      {routes.map((r) => {
        if (!pos.has(r.from) || !pos.has(r.to)) return null;
        return <Packet key={`pk-${r.id}`} d={arc(r)} progress={(f - (stepAt.get(r.id) as number)) / travelFrames(arc(r))} />;
      })}
      {pins.map((p) => {
        const q = pos.get(p.id)!;
        const k = pop(f, pAt.get(p.id)!);
        const lv = focusLevels(events, p.id, f);
        const origin = p.kind === "origin";
        const col = origin ? c.orange : p.kind === "user" ? c.cream : c.cream;
        const label = origin ? c.ember : c.cream;
        const below = q.y < mapTop + mapH * 0.3 ? 38 : -62;
        return (
          <div key={p.id}>
            {k > 0 && <div style={{ position: "absolute", left: q.x - 20, top: q.y - 20, width: 40, height: 40, borderRadius: "50%", background: origin ? c.orange : p.kind === "user" ? c.cream : c.charcoal, border: `7px solid ${mixColor(col, c.cream3, lv.dim)}`, transform: `scale(${k})`, boxShadow: lv.on > 0.5 ? "0 0 0 10px rgba(200,74,39,.3)" : undefined }} />}
            {k > 0 && <div style={{ position: "absolute", left: Math.min(box.w - 130, Math.max(130, q.x)) - 130, width: 260, top: q.y + below, textAlign: "center", font: `700 ${tokens.type.label.size - 4}px ${fonts.mono}`, color: mixColor(label, c.cream3, lv.dim), opacity: Math.min(1, k * 1.5), background: "transparent" }}>{p.label}</div>}
          </div>
        );
      })}
      {routes.map((r, i) => {
        if (!r.ms) return null;
        const at = stepAt.get(r.id)! + travelFrames(arc(r)) - 6;
        const k = pop(f, at);
        const lv = focusLevels(events, r.id, f);
        const from = pins.find((p) => p.id === r.from)?.label ?? r.from;
        const to = pins.find((p) => p.id === r.to)?.label ?? r.to;
        const y = listTop + i * rowH;
        const frac = (r.ms / maxMs) * tween(f, at, 20, ease.std);
        return (
          <div key={`row-${r.id}`} style={{ position: "absolute", left: 0, width: box.w, top: y, height: rowH - 14, opacity: Math.min(1, k * 1.5) * (1 - 0.5 * lv.dim) }}>
            <div style={{ font: `700 ${tokens.type.label.size - 4}px ${fonts.mono}`, color: c.cream2 }}>{from} → {to}</div>
            <div style={{ position: "absolute", left: 0, right: 230, top: 44, height: 32, borderRadius: 16, background: c.line, overflow: "hidden" }}>
              <div style={{ width: `${frac * 100}%`, height: "100%", background: lv.on > 0.5 ? c.orange : c.cream, borderRadius: 16 }} />
            </div>
            <div style={{ position: "absolute", right: 0, top: 26, width: 220, whiteSpace: "nowrap", textAlign: "right", font: `800 48px ${fonts.display}`, color: lv.on > 0.5 ? c.ember : c.cream }}>{Math.round(r.ms * tween(f, at, 20, ease.std))}<span style={{ fontSize: 26 }}> ms</span></div>
          </div>
        );
      })}
    </>
  );
};
