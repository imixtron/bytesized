// Timeline template (v1.8 proposal): time runs top → bottom down the whole stage.
//  - `line` (default): one vertical axis, 2–6 events (time chip · dot · card), and an ember playhead
//    that sweeps down to each event as it is revealed.
//  - `lanes`: 2–3 columns (who), events placed down the time axis in their lane, and `links` (arrows
//    between events) for messages: logical clocks, request waterfalls, who-waited-for-whom.
// Verbs: reveal / appear (an event), step (draw a link), highlight (focus an event, others push back).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { Arrow, HATCH, Svg, hatch } from "../parts/Diagram";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type TimelineEvent = { id: string; at: string; label: string; sub?: string; icon?: IconName; lane?: string };
export type TimelineLane = { id: string; label: string };
export type TimelineLink = { id: string; from: string; to: string; label?: string };
export type TimelineStage = { variant?: "line" | "lanes"; events?: TimelineEvent[]; lanes?: TimelineLane[]; links?: TimelineLink[] };

const c = tokens.color;
const S = tokens.node.shadow;
const AXIS_X = 150;

export const Timeline = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><TimelineBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const TimelineBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const stage = ctx.ts.scene.stage as TimelineStage;
  return stage.variant === "lanes" ? <Lanes ctx={ctx} box={box} /> : <Line ctx={ctx} box={box} />;
};

const eventFocus = (beats: ReturnType<typeof localBeats>, events: TimelineEvent[], at: number[]): FocusEvent[] => {
  const reveals = events.map((e, i) => ({ at: at[i], id: e.id, explicit: false }));
  const his = beats.filter((b) => b.do === "highlight").flatMap((b) => {
    const id = b.targets.find((x) => events.some((e) => e.id === x));
    return id ? [{ at: b.at, id, explicit: true }] : [];
  });
  return [...reveals, ...his].sort((x, y) => x.at - y.at).map((e, i, all) => ({ ...e, explicit: e.explicit || all.slice(0, i).some((p) => p.explicit) }));
};

// ---------------------------------------------------------------- line
const Line = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as TimelineStage;
  const events = (stage.events ?? []).slice(0, 6);
  const beats = localBeats(ctx.ts);
  const at = events.map((e, i) => firstAt(beats, ["reveal", "appear"], e.id) ?? 10 + i * 24);
  const focus = eventFocus(beats, events, at);
  const n = events.length;
  const top = 70;
  const rowH = (box.h - top - 40) / Math.max(1, n);
  const yOf = (i: number) => top + rowH * (i + 0.5);
  const cardH = Math.min(190, rowH - 26);
  const cardX = AXIS_X + 70;
  const cardW = box.w - cardX - 16;

  // playhead: eases from event to event as each is revealed
  const stops = events.map((_, i) => ({ at: at[i], y: yOf(i) }));
  let headY = top - 30;
  for (let i = 0; i < stops.length; i++) {
    const prevY = i === 0 ? top - 30 : stops[i - 1].y;
    if (f >= stops[i].at - 8) headY = prevY + (stops[i].y - prevY) * tween(f, stops[i].at - 8, 14, ease.std);
  }
  const headIn = pop(f, Math.max(0, (stops[0]?.at ?? 10) - 14));

  return (
    <>
      <Svg>
        <line x1={AXIS_X} y1={top - 30} x2={AXIS_X} y2={box.h - 10} stroke={c.line} strokeWidth={6} strokeLinecap="round" strokeDasharray="4 18" />
        <line x1={AXIS_X} y1={top - 30} x2={AXIS_X} y2={Math.max(top - 30, headY)} stroke={c.cream} strokeWidth={6} strokeLinecap="round" />
      </Svg>
      {events.map((e, i) => {
        const y = yOf(i);
        const k = pop(f, at[i]);
        const lv = focusLevels(focus, e.id, f);
        const ring = mixColor(c.cream, c.orange, lv.on);
        const stroke = mixColor(ring, c.cream3, lv.dim);
        const textC = mixColor(mixColor(c.cream, c.ember, 0), c.cream3, lv.dim);
        return (
          <div key={e.id}>
            {/* the dot sits on the axis from the start (ghost) and fills when its event arrives */}
            <div style={{ position: "absolute", left: AXIS_X - 17, top: y - 17, width: 34, height: 34, borderRadius: "50%", background: k > 0 ? mixColor(c.cream, c.orange, lv.on) : c.charcoal, border: `5px solid ${k > 0 ? stroke : c.line}`, transform: `scale(${k > 0 ? 0.7 + 0.3 * k : 1})` }} />
            <div style={{ position: "absolute", left: 0, width: AXIS_X - 34, top: y, transform: `translateY(-50%) translateX(${(1 - Math.min(1, k)) * -30}px)`, opacity: Math.min(1, k * 1.5), textAlign: "right", font: `700 32px/1.1 ${fonts.mono}`, color: mixColor(mixColor(c.cream2, c.ember, lv.on), c.cream3, lv.dim) }}>{e.at}</div>
            {k > 0 && (
              <div style={{ position: "absolute", left: cardX, top: y - cardH / 2, width: cardW, height: cardH, transform: `translateX(${(1 - Math.min(1, k)) * 70}px)`, opacity: Math.min(1, k * 1.5) }}>
                <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 26, background: hatch(lv.on > 0.5 ? HATCH.orange : lv.dim > 0.5 ? HATCH.dim : HATCH.cream) }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: 26, background: c.surface, border: `${tokens.node.stroke}px solid ${stroke}`, display: "flex", alignItems: "center", gap: 24, padding: "0 28px" }}>
                  {e.icon && <Icon name={e.icon} size={84} color={mixColor(mixColor(c.cream, c.ember, lv.on), c.cream3, lv.dim)} />}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: `800 44px/1.05 ${fonts.display}`, color: textC }}>{e.label}</div>
                    {e.sub && <div style={{ marginTop: 8, font: `700 32px/1.15 ${fonts.text}`, color: mixColor(c.cream2, c.cream3, lv.dim) }}>{e.sub}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {n > 0 && <div style={{ position: "absolute", left: AXIS_X - 13, top: headY - 13, width: 26, height: 26, borderRadius: "50%", background: c.ember, boxShadow: `0 0 0 8px rgba(232,105,63,.25)`, transform: `scale(${headIn})` }} />}
    </>
  );
};

// ---------------------------------------------------------------- lanes
const Lanes = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as TimelineStage;
  const lanes = (stage.lanes ?? []).slice(0, 3);
  const events = (stage.events ?? []).slice(0, 7);
  const links = stage.links ?? [];
  const beats = localBeats(ctx.ts);
  const at = events.map((e, i) => firstAt(beats, ["reveal", "appear"], e.id) ?? 12 + i * 20);
  const focus = eventFocus(beats, events, at);
  const xs = lanes.length <= 2 ? [0.37, 0.77] : [0.27, 0.56, 0.85];
  const laneX = new Map(lanes.map((l, i) => [l.id, box.w * xs[i] + (lanes.length <= 2 ? 0 : 0)]));
  const header = 110;
  const rowH = Math.min(180, (box.h - header - 30) / Math.max(1, events.length));
  const yOf = (i: number) => header + 30 + rowH * (i + 0.5);
  const pos = new Map(events.map((e, i) => [e.id, { x: laneX.get(e.lane ?? "") ?? box.w / 2, y: yOf(i) }]));
  const pillW = lanes.length <= 2 ? 300 : 220;
  const pillH = Math.min(100, rowH - 30);

  return (
    <>
      <Svg>
        {lanes.map((l) => <line key={l.id} x1={laneX.get(l.id)} y1={header} x2={laneX.get(l.id)} y2={box.h - 10} stroke={c.line} strokeWidth={5} strokeDasharray="10 16" strokeLinecap="round" />)}
        <line x1={34} y1={header} x2={34} y2={box.h - 10} stroke={c.cream3} strokeWidth={5} strokeLinecap="round" />
        <path d={`M 22 ${box.h - 28} L 34 ${box.h - 8} L 46 ${box.h - 28}`} fill="none" stroke={c.cream3} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
        {links.map((l, i) => {
          const a = pos.get(l.from);
          const b = pos.get(l.to);
          if (!a || !b) return null;
          const lAt = firstAt(beats, ["step"], l.id) ?? Math.max(at[events.findIndex((e) => e.id === l.to)] - 6, 0);
          const dir = Math.sign(b.x - a.x) || 1;
          const d = `M ${a.x + dir * (pillW / 2 + 6)} ${a.y} L ${b.x - dir * (pillW / 2 + 12)} ${b.y}`;
          return <Arrow key={l.id ?? i} d={d} progress={(f - lAt) / 14} color={c.cream} />;
        })}
      </Svg>
      <div style={{ position: "absolute", left: 14, top: header - 62, font: `700 26px ${fonts.mono}`, color: c.cream3 }}>time</div>
      {lanes.map((l, i) => {
        const k = pop(f, i * tokens.motion.stagger.frames);
        return <div key={l.id} style={{ position: "absolute", left: laneX.get(l.id)! - 170, width: 340, top: 18, textAlign: "center", font: `800 40px ${fonts.display}`, color: c.cream, transform: `scale(${k})`, opacity: Math.min(1, k * 1.5) }}>{l.label}</div>;
      })}
      {events.map((e, i) => {
        const p = pos.get(e.id)!;
        const k = pop(f, at[i]);
        const lv = focusLevels(focus, e.id, f);
        const stroke = mixColor(mixColor(c.cream, c.orange, lv.on), c.cream3, lv.dim);
        if (k <= 0) return <div key={e.id} style={{ position: "absolute", left: p.x - pillW / 2, top: p.y - pillH / 2, width: pillW, height: pillH, borderRadius: 24, border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />;
        return (
          <div key={e.id} style={{ position: "absolute", left: p.x - pillW / 2, top: p.y - pillH / 2, width: pillW, height: pillH, transform: `scale(${0.6 + 0.4 * k})`, opacity: Math.min(1, k * 1.5) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset * 0.7}px, ${S.offset * 0.7}px)`, borderRadius: 24, background: hatch(lv.on > 0.5 ? HATCH.orange : lv.dim > 0.5 ? HATCH.dim : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 24, background: c.surface, border: `${tokens.node.stroke}px solid ${stroke}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", textAlign: "center", font: `800 34px/1.05 ${fonts.text}`, color: mixColor(c.cream, c.cream3, lv.dim) }}>{e.label}</div>
            <div style={{ position: "absolute", left: 34 - p.x + pillW / 2 - 15, top: pillH / 2 - 15, width: 30, height: 30, borderRadius: "50%", background: c.charcoal, border: `5px solid ${stroke}`, transform: "none" }} />
            <div style={{ position: "absolute", left: 34 - p.x + pillW / 2 + 28, top: pillH / 2, transform: "translateY(-50%)", font: `700 28px ${fonts.mono}`, color: mixColor(c.cream2, c.cream3, lv.dim) }}>{e.at}</div>
          </div>
        );
      })}
    </>
  );
};
