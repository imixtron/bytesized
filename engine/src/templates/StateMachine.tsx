// StateMachine template (v1.9 proposal): states as circles, transitions as curved arrows with labels,
// and an ember token that rides a transition on each `step`, lighting the state it arrives in.
// stage: { states: [{ id, label, icon?, tone?: ok | warn | down }] (2–5), transitions: [{ id, from, to, label? }],
//          start?: state id }
// Verbs: reveal / appear (a state; its transitions draw once both ends are there), step (the token rides
// that transition), highlight (focus a state), shake.
import { getLength, getPointAtLength } from "@remotion/paths";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { Arrow, HATCH, Svg, hatch } from "../parts/Diagram";
import { Packet, travelFrames } from "../parts/Flow";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, localBeats, mixColor, type Ctx } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type SMState = { id: string; label: string; icon?: IconName; tone?: "ok" | "warn" | "down" };
export type SMTransition = { id: string; from: string; to: string; label?: string };
export type SMStage = { states?: SMState[]; transitions?: SMTransition[]; start?: string };

const c = tokens.color;
const S = tokens.node.shadow;
const R = 100; // state radius

export const StateMachine = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><StateMachineBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

/** States spread on an ellipse that fills the stage; the first state sits on top. */
export function smLayout(n: number, box: Pick<Box, "w" | "h">) {
  const rx = Math.min(box.w / 2 - R - 30, 300);
  const ry = Math.min(box.h / 2 - R - 50, 440);
  const cx = box.w / 2;
  const cy = box.h / 2;
  if (n === 2) return [{ x: cx, y: cy - ry * 0.7 }, { x: cx, y: cy + ry * 0.7 }];
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry };
  });
}

/** A curve between two states, bulging to one side so a pair going both ways doesn't overlap. */
function curve(a: { x: number; y: number }, b: { x: number; y: number }, bend: number, cx: number, cy: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const s = { x: a.x + ux * (R + 10), y: a.y + uy * (R + 10) };
  const e = { x: b.x - ux * (R + 22), y: b.y - uy * (R + 22) };
  const mx = (s.x + e.x) / 2 + -uy * bend;
  const my = (s.y + e.y) / 2 + ux * bend;
  return `M ${s.x} ${s.y} Q ${mx} ${my} ${e.x} ${e.y}`;
}

export const StateMachineBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as SMStage;
  const states = (stage.states ?? []).slice(0, 5);
  const trs = stage.transitions ?? [];
  const beats = localBeats(ctx.ts);
  const pos = new Map(states.map((s, i) => [s.id, smLayout(states.length, box)[i]]));
  const sAt = new Map(states.map((s, i) => [s.id, firstAt(beats, ["reveal", "appear"], s.id) ?? i * 8]));
  const start = stage.start ?? states[0]?.id;

  // token steps in order: which transition, when
  const steps = beats.filter((b) => b.do === "step").flatMap((b) => { const t = trs.find((x) => b.targets.includes(x.id)); return t ? [{ at: b.at, t }] : []; });
  const trAt = (t: SMTransition) => steps.find((s) => s.t.id === t.id)?.at;
  const cur = (() => {
    let id = start;
    for (const s of steps) { if (f >= s.at + travelFrames(path(s.t)) - 4) id = s.t.to; }
    return id;
  })();
  const hi = [...beats].reverse().find((b) => b.do === "highlight" && f >= b.at && states.some((s) => b.targets.includes(s.id)));
  const focus = hi ? hi.targets.find((x) => states.some((s) => s.id === x)) : cur;
  const curSince = (() => { let at = 0; for (const s of steps) if (s.t.to === cur && f >= s.at) at = s.at + travelFrames(path(s.t)) - 4; return at; })();

  function path(t: SMTransition) {
    const a = pos.get(t.from)!;
    const b = pos.get(t.to)!;
    const both = trs.some((o) => o.from === t.to && o.to === t.from);
    return curve(a, b, both ? 120 : 30, box.w / 2, box.h / 2);
  }

  return (
    <>
      <Svg>
        {trs.map((t) => {
          if (!pos.has(t.from) || !pos.has(t.to)) return null;
          const ready = Math.max(sAt.get(t.from)!, sAt.get(t.to)!) + 8;
          const at = trAt(t);
          const lit = at !== undefined && f >= at;
          return <Arrow key={t.id} d={path(t)} progress={tween(f, ready, 16, ease.std)} color={lit ? c.cream : c.cream3} dashed={false} />;
        })}
      </Svg>
      {trs.map((t) => {
        if (!t.label || !pos.has(t.from) || !pos.has(t.to)) return null;
        const d = path(t);
        const mid = getPointAtLength(d, getLength(d) / 2) ?? { x: 0, y: 0 };
        const ready = Math.max(sAt.get(t.from)!, sAt.get(t.to)!) + 14;
        const k = pop(f, ready);
        const at = trAt(t);
        return (
          <div key={`l-${t.id}`} style={{ position: "absolute", left: mid.x, top: mid.y, transform: `translate(-50%, -50%) scale(${k})`, opacity: Math.min(1, k * 1.5), font: `700 ${tokens.type.label.size}px/1.1 ${fonts.mono}`, whiteSpace: "nowrap", padding: "2px 12px", borderRadius: 10, background: c.charcoal, color: at !== undefined && f >= at ? c.cream : c.cream2 }}>{t.label}</div>
        );
      })}
      {steps.map((s) => <Packet key={s.t.id} d={path(s.t)} progress={(f - s.at) / travelFrames(path(s.t))} />)}
      {states.map((s) => {
        const p = pos.get(s.id)!;
        const k = pop(f, sAt.get(s.id)!);
        const on = focus === s.id;
        const toneC = s.tone === "ok" ? c.ok : s.tone === "warn" ? c.warn : s.tone === "down" ? c.down : c.orange;
        const g = on ? tween(f, hi ? hi.at : curSince, tokens.motion.standard.frames) : 0;
        const stroke = mixColor(c.cream, toneC, on ? g : 0);
        const shakeAt = firstAt(beats, ["shake"], s.id);
        const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
        if (k <= 0) return <div key={s.id} style={{ position: "absolute", left: p.x - R, top: p.y - R, width: 2 * R, height: 2 * R, borderRadius: "50%", border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />;
        return (
          <div key={s.id} style={{ position: "absolute", left: p.x - R, top: p.y - R, width: 2 * R, height: 2 * R, transform: `translateX(${sh}px) scale(${0.4 + 0.6 * k})`, opacity: Math.min(1, k * 1.6) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: "50%", background: hatch(on && g > 0.5 ? (s.tone ? HATCH.cream : HATCH.orange) : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c.surface, border: `${tokens.node.stroke}px solid ${stroke}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {s.icon && <Icon name={s.icon} size={64} color={mixColor(c.cream, toneC, on ? g : 0)} />}
              <div style={{ font: `800 ${s.icon ? 30 : 36}px/1 ${fonts.display}`, color: mixColor(c.cream, on && !s.tone ? c.ember : toneC, on ? g : 0) }}>{s.label}</div>
            </div>
          </div>
        );
      })}
    </>
  );
};
