// MetricChart template (v1.8 proposal): numbers that fill the whole stage.
//  - `bar`: up to 5 tall bars that grow from a baseline, value counting up above each.
//  - `line`: a line drawn point by point (growth, latency over time).
//  - `gauge`: one needle swinging to a value on a half-dial (uptime, utilisation).
// Verbs: reveal / appear / count (grow the bar, add the point, swing the needle), highlight (focus a
// bar or point; the rest push back), shake (a bar or the gauge shakes).
// stage: { chart: { type, unit?, max?, data: [{ id, label, value, tone?: ok|warn|down }] } }
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { HATCH, Svg, hatch } from "../parts/Diagram";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type ChartDatum = { id: string; label: string; value: number; tone?: "ok" | "warn" | "down" };
export type ChartStage = { chart?: { type?: "bar" | "line" | "gauge"; unit?: string; max?: number; data?: ChartDatum[] } };

const c = tokens.color;
const S = tokens.node.shadow;
const GROW = 20;
const toneColor = (t?: ChartDatum["tone"]) => (t === "ok" ? c.ok : t === "warn" ? c.warn : t === "down" ? c.down : c.cream);
const fmt = (v: number, unit = "") => `${Math.round(v * 10) / 10 === Math.round(v) ? Math.round(v).toLocaleString("en-US") : (Math.round(v * 10) / 10).toLocaleString("en-US")}${unit}`;

export const MetricChart = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><MetricChartBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const MetricChartBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const type = (ctx.ts.scene.stage as ChartStage).chart?.type ?? "bar";
  return type === "gauge" ? <Gauge ctx={ctx} box={box} /> : type === "line" ? <LineChart ctx={ctx} box={box} /> : <Bars ctx={ctx} box={box} />;
};

function setup(ctx: Ctx) {
  const chart = (ctx.ts.scene.stage as ChartStage).chart ?? {};
  const data = (chart.data ?? []).slice(0, 5);
  const max = chart.max ?? Math.max(...data.map((d) => d.value), 1);
  const beats = localBeats(ctx.ts);
  const at = data.map((d, i) => firstAt(beats, ["reveal", "appear", "count"], d.id) ?? 12 + i * 20);
  const reveals: FocusEvent[] = data.map((d, i) => ({ at: at[i], id: d.id, explicit: false }));
  const his: FocusEvent[] = beats.filter((b) => b.do === "highlight").flatMap((b) => {
    const id = b.targets.find((x) => data.some((d) => d.id === x));
    return id ? [{ at: b.at, id, explicit: true }] : [];
  });
  const focus = [...reveals, ...his].sort((x, y) => x.at - y.at).map((e, i, all) => ({ ...e, explicit: e.explicit || all.slice(0, i).some((p) => p.explicit) }));
  return { chart, data, max, beats, at, focus };
}

// ---------------------------------------------------------------- bars
const Bars = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const { chart, data, max, beats, at, focus } = setup(ctx);
  const n = data.length;
  const labelH = 120;
  const valueH = 90;
  const base = box.h - labelH;
  const plotH = base - valueH - 20;
  const gap = 36;
  const bw = Math.min(190, (box.w - gap * (n + 1)) / Math.max(1, n));
  const x0 = (box.w - (bw * n + gap * (n - 1))) / 2;

  return (
    <>
      <Svg><line x1={0} y1={base} x2={box.w} y2={base} stroke={c.cream3} strokeWidth={6} strokeLinecap="round" /></Svg>
      {data.map((d, i) => {
        const x = x0 + i * (bw + gap);
        const g = tween(f, at[i], GROW, ease.std);
        const lv = focusLevels(focus, d.id, f);
        const shakeAt = firstAt(beats, ["shake"], d.id);
        const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
        const h = Math.max(0, (d.value / max) * plotH * g);
        const base_ = d.tone ? toneColor(d.tone) : c.cream;
        const fill = mixColor(mixColor(base_, c.orange, d.tone ? 0 : lv.on), c.cream3, lv.dim);
        return (
          <div key={d.id}>
            {g <= 0 && <div style={{ position: "absolute", left: x, top: base - 14, width: bw, height: 14, borderRadius: 7, border: `3px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />}
            {g > 0 && (
              <div style={{ position: "absolute", left: x, top: base - h, width: bw, height: h, transform: `translateX(${sh}px)` }}>
                <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: "18px 18px 6px 6px", background: hatch(lv.dim > 0.5 ? HATCH.dim : lv.on > 0.5 && !d.tone ? HATCH.orange : HATCH.cream) }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: "18px 18px 6px 6px", background: fill, border: `${tokens.node.stroke}px solid ${fill}` }} />
              </div>
            )}
            <div style={{ position: "absolute", left: x - 30, width: bw + 60, top: base - h - valueH + 10, textAlign: "center", whiteSpace: "nowrap", font: `800 48px ${fonts.display}`, color: mixColor(mixColor(c.cream, c.ember, lv.on), c.cream3, lv.dim), opacity: Math.min(1, g * 3), transform: `translateX(${sh}px)` }}>
              {fmt(d.value * g, chart.unit)}
            </div>
            <div style={{ position: "absolute", left: x - 30, width: bw + 60, top: base + 28, textAlign: "center", font: `700 ${tokens.type.label.size}px/1.1 ${fonts.mono}`, color: mixColor(c.cream2, c.cream3, lv.dim), opacity: Math.min(1, pop(f, at[i] - 2) * 1.5) }}>{d.label}</div>
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- line
const LineChart = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const { chart, data, max, at, focus } = setup(ctx);
  const n = data.length;
  const padX = 70;
  const labelH = 110;
  const base = box.h - labelH;
  const top = 120;
  const pts = data.map((d, i) => ({ x: padX + (n === 1 ? 0 : (i * (box.w - 2 * padX)) / (n - 1)), y: base - (d.value / max) * (base - top) }));
  // how far along the line we are, in points (fractional): draws segment by segment as each point arrives
  const upto = data.reduce((acc, _, i) => (f >= at[i] ? Math.max(acc, i + clamp01(tween(f, at[i], GROW, ease.std))) : acc), -1);
  const pathPts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (upto >= i) pathPts.push(pts[i]);
    else if (upto > i - 1 && i > 0) {
      const t = upto - (i - 1);
      pathPts.push({ x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t });
    }
  }
  const d = pathPts.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" ");
  const area = pathPts.length > 1 ? `${d} L ${pathPts.at(-1)!.x} ${base} L ${pathPts[0].x} ${base} Z` : "";

  return (
    <>
      <Svg>
        {[0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={0} x2={box.w} y1={base - g * (base - top)} y2={base - g * (base - top)} stroke={c.line} strokeWidth={3} strokeDasharray="6 14" />)}
        <line x1={0} y1={base} x2={box.w} y2={base} stroke={c.cream3} strokeWidth={6} strokeLinecap="round" />
        {area && <path d={area} fill="rgba(232,105,63,.12)" />}
        {d && <path d={d} fill="none" stroke={c.cream} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />}
      </Svg>
      {data.map((p, i) => {
        const k = pop(f, at[i]);
        const lv = focusLevels(focus, p.id, f);
        const col = mixColor(mixColor(c.cream, c.ember, lv.on), c.cream3, lv.dim);
        return (
          <div key={p.id}>
            {k > 0 && <div style={{ position: "absolute", left: pts[i].x - 20, top: pts[i].y - 20, width: 40, height: 40, borderRadius: "50%", background: lv.on > 0.5 ? c.orange : c.charcoal, border: `7px solid ${col}`, transform: `scale(${k})` }} />}
            {k > 0 && (lv.on > 0.3 || i === n - 1) && <div style={{ position: "absolute", left: pts[i].x - 100, width: 200, top: pts[i].y - 92, textAlign: "center", font: `800 48px ${fonts.display}`, color: col, opacity: Math.min(1, k * 1.5) }}>{fmt(p.value, chart.unit)}</div>}
            <div style={{ position: "absolute", left: pts[i].x - 90, width: 180, top: base + 28, textAlign: "center", font: `700 ${tokens.type.label.size}px/1.1 ${fonts.mono}`, color: mixColor(c.cream2, c.cream3, lv.dim), opacity: Math.min(1, k * 1.5) }}>{p.label}</div>
          </div>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- gauge
const Gauge = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const { chart, data, max, beats, at } = setup(ctx);
  const d0 = data[0];
  if (!d0) return null;
  const g = tween(f, at[0], 40, ease.std);
  const cx = box.w / 2;
  const cy = box.h * 0.6;
  const R = Math.min(box.w / 2 - 50, 400);
  const ang = (v: number) => Math.PI * (1 - clamp01(v / max)); // π (left) → 0 (right)
  const pt = (v: number, r: number) => ({ x: cx + Math.cos(ang(v)) * r, y: cy - Math.sin(ang(v)) * r });
  const arc = (v: number) => `M ${pt(0, R).x} ${pt(0, R).y} A ${R} ${R} 0 ${v / max > 0.5 ? 1 : 0} 1 ${pt(v, R).x} ${pt(v, R).y}`;
  const val = d0.value * g;
  const tip = pt(val, R - 40);
  const shakeAt = firstAt(beats, ["shake"], d0.id);
  const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
  const col = toneColor(d0.tone ?? undefined);
  const k = pop(f, Math.max(0, at[0] - 10));

  return (
    <div style={{ position: "absolute", inset: 0, transform: `translateX(${sh}px) scale(${0.85 + 0.15 * k})`, opacity: Math.min(1, k * 1.5) }}>
      <Svg>
        <path d={arc(max)} fill="none" stroke={c.line} strokeWidth={46} strokeLinecap="round" />
        {g > 0.01 && <path d={arc(val)} fill="none" stroke={d0.tone ? col : c.orange} strokeWidth={46} strokeLinecap="round" />}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={pt(t * max, R + 44).x} y1={pt(t * max, R + 44).y} x2={pt(t * max, R + 62).x} y2={pt(t * max, R + 62).y} stroke={c.cream3} strokeWidth={6} strokeLinecap="round" />)}
        <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke={c.cream} strokeWidth={14} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={30} fill={c.surface} stroke={c.cream} strokeWidth={10} />
      </Svg>
      <div style={{ position: "absolute", left: 0, width: box.w, top: cy + 70, textAlign: "center", font: `800 170px/1 ${fonts.display}`, color: d0.tone ? col : c.ember }}>{fmt(val, chart.unit)}</div>
      <div style={{ position: "absolute", left: 0, width: box.w, top: cy + 270, textAlign: "center", font: `700 ${tokens.type.label.size + 4}px ${fonts.mono}`, color: c.cream2 }}>{d0.label}</div>
      <div style={{ position: "absolute", left: cx - R - 30, top: cy + 20, font: `700 28px ${fonts.mono}`, color: c.cream3 }}>0</div>
      <div style={{ position: "absolute", left: cx + R - 40, top: cy + 20, font: `700 28px ${fonts.mono}`, color: c.cream3 }}>{fmt(max, chart.unit)}</div>
    </div>
  );
};
