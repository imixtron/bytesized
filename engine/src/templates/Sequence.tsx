// Sequence template (v1.5): 2–3 actors across the top with dashed lifelines, and
// numbered messages stepping down over time (left ↔ right). A step can be a side note (something
// done locally) or a lost message (✕ halfway). Verbs: appear, step, highlight, state, shake.
// A scene with `stage.reuse: <scene id>` continues the same sequence: earlier steps stay drawn.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { pop } from "../motion/motion";
import { Arrow, Label, Note, StepBadge, Svg } from "../parts/Diagram";
import { Packet, travelFrames } from "../parts/Flow";
import type { IconName } from "../parts/icons";
import { Node } from "../parts/Node";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, findScene, firstAt, localBeats, logoPath, stateAt, stateEvents, type Ctx, type LocalBeat } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type SeqStep = { id: string; from?: string; to?: string; at?: string; label?: string; note?: string; kind?: "request" | "response"; lost?: boolean };
export type SequenceStage = { actors?: NodeSpec[]; steps?: SeqStep[]; reuse?: string };

const c = tokens.color;
const D = tokens.diagram;
const AUTO_EVERY = 18; // frames between steps when a scene has no `step` beats

/** Actor x positions and step rows, in panel-local coordinates. */
export function layoutSequence(stage: SequenceStage, box: Pick<Box, "w" | "h">) {
  const actors = stage.actors ?? [];
  const steps = stage.steps ?? [];
  const xs = actors.length <= 2 ? [0.2, 0.8] : [0.13, 0.5, 0.87];
  const ax = new Map(actors.map((a, i) => [a.id, box.w * xs[i]]));
  const N = D.lane.node;
  const header = N + 80; // node + its label
  const top = header + 30;
  const rowH = Math.min(140, (box.h - top) / Math.max(1, steps.length));
  const rows = new Map(steps.map((s, i) => [s.id, top + rowH * (i + 0.5)]));
  return { ax, rows, N, header, bottom: top + rowH * steps.length, rowH };
}

export const Sequence = ({ ctx }: { ctx: Ctx }) => {
  // scenes continuing one sequence share a box, so actors never jump when a headline comes or goes
  const groupId = (ctx.ts.scene.stage as SequenceStage).reuse ?? ctx.ts.scene.id;
  const group = ctx.timeline.scenes.filter((t) => t.scene.id === groupId || (t.scene.stage as SequenceStage).reuse === groupId);
  const box = stagePanel(ctx.ts.scene, group.some((t) => Boolean(t.scene.headline)));
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><SequenceBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const SequenceBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const { scene } = ctx.ts;
  const own = scene.stage as SequenceStage;
  const root = own.reuse ? findScene(ctx, own.reuse) : undefined;
  const rootStage = (root?.scene.stage ?? own) as SequenceStage;
  // every scene continuing this sequence shares one layout (all of the group's steps)
  const groupId = own.reuse ?? scene.id;
  const group = ctx.timeline.scenes.filter((t) => t.scene.id === groupId || (t.scene.stage as SequenceStage).reuse === groupId);
  const allSteps = group.flatMap((t) => (t.scene.stage as SequenceStage).steps ?? []);
  const actors = rootStage.actors ?? [];
  const L = layoutSequence({ actors, steps: allSteps }, box);
  const beats = localBeats(ctx.ts);

  // steps from earlier scenes in the group are already drawn
  const earlier = new Set(group.filter((t) => t.index < ctx.ts.index).flatMap((t) => ((t.scene.stage as SequenceStage).steps ?? []).map((s) => s.id)));
  const ownSteps = own.steps ?? [];
  const hasStepBeats = beats.some((b) => b.do === "step");
  const actorsIn = earlier.size ? 0 : actors.length * tokens.motion.stagger.frames + 12;
  const stepAt = (s: SeqStep, i: number): number | undefined => {
    if (earlier.has(s.id)) return -1e6;
    const at = firstAt(beats, ["step", "appear", "reveal"], s.id);
    if (at !== undefined) return at;
    return hasStepBeats ? undefined : actorsIn + i * AUTO_EVERY;
  };
  const shown = allSteps.map((s) => ({ s, at: stepAt(s, ownSteps.indexOf(s)), n: allSteps.indexOf(s) + 1 })).filter((x) => x.at !== undefined && f >= x.at!) as { s: SeqStep; at: number; n: number }[];
  const lastHi = [...beats].reverse().find((b: LocalBeat) => b.do === "highlight" && f >= b.at && allSteps.some((s) => b.targets.includes(s.id)));
  const current = lastHi ? lastHi.targets[0] : shown.filter((x) => x.at > -1e6).at(-1)?.s.id;

  const actorEnter = (id: string, i: number) => (earlier.size ? 1 : pop(f, firstAt(beats, ["appear"], id) ?? i * tokens.motion.stagger.frames));
  const lifeBottom = Math.max(L.bottom, L.header + 60);

  return (
    <>
      <Svg>
        {actors.map((a, i) => {
          const x = L.ax.get(a.id)!;
          const k = actorEnter(a.id, i);
          return <line key={a.id} x1={x} y1={L.header} x2={x} y2={L.header + (lifeBottom - L.header) * clamp01(k)} stroke={c.cream3} strokeWidth={D.lane.lifeline} strokeDasharray={D.lane.dash.join(" ")} strokeLinecap="round" />;
        })}
        {shown.filter(({ s }) => !s.note).map(({ s, at }) => {
          const g = geom(s);
          if (!g) return null;
          const on = s.id === current;
          const t = (f - at) / travelFrames(g.d);
          return <Arrow key={s.id} d={g.d} progress={at < -1e5 ? 1 : t} color={on ? c.cream : c.cream3} head={!s.lost} />;
        })}
      </Svg>
      {shown.filter(({ s }) => !s.note && !s.lost).map(({ s, at }) => {
        const g = geom(s);
        return g && at > -1e5 ? <Packet key={`p-${s.id}`} d={g.d} kind={s.kind ?? "request"} progress={(f - at) / travelFrames(g.d)} /> : null;
      })}
      {actors.map((a, i) => {
        const st = stateAt(stateEvents(beats, a.id, a.family), "idle", f);
        const shakeAt = firstAt(beats, ["shake"], a.id);
        return (
          <Node key={a.id} type={a.type} family={a.family} icon={a.icon as IconName | undefined} x={L.ax.get(a.id)!} y={L.N / 2} w={L.N} h={L.N} label={a.label}
            logo={a.type === "brand" && a.logo ? logoPath(a.logo) : undefined} enter={actorEnter(a.id, i)} state={st.state} from={st.from} t={st.t} badgeIn={pop(f, st.since)}
            shake={shakeAt !== undefined ? clamp01((f - shakeAt) / tokens.motion.shake.frames) : 0} />
        );
      })}
      {shown.map(({ s, at, n }) => {
        const on = s.id === current;
        const k = at < -1e5 ? 1 : pop(f, at);
        const y = L.rows.get(s.id)!;
        if (s.note) {
          // centred on its lifeline, but kept inside the panel
          const maxW = actors.length > 2 ? 300 : 400;
          const noteW = Math.min(maxW, 50 + s.note.length * 17);
          const x = Math.min(box.w - noteW / 2, Math.max(noteW / 2 + 40, L.ax.get(s.at ?? "") ?? box.w / 2));
          return (
            <div key={s.id}>
              <Note x={x} y={y} text={s.note} k={k} on={on} maxWidth={maxW} />
              <StepBadge n={n} x={x - noteW / 2 - 36} y={y} on={on} k={k} />
            </div>
          );
        }
        const g = geom(s)!;
        const mid = (g.x1 + g.x2) / 2;
        const lostAt = at + travelFrames(g.d);
        return (
          <div key={s.id}>
            {s.label && <Label x={mid} y={y - 44} text={s.label} color={on ? c.cream : c.cream2} k={k} />}
            <StepBadge n={n} x={Math.min(g.x1, g.x2) + 34} y={y - 44} on={on} k={k} dim={!on} />
            {s.lost && f >= lostAt && <LostMark x={g.x2} y={y + 6} k={pop(f, lostAt)} />}
          </div>
        );
      })}
    </>
  );

  function geom(s: SeqStep) {
    const a = L.ax.get(s.from ?? "");
    const b = L.ax.get(s.to ?? "");
    const y = L.rows.get(s.id);
    if (a === undefined || b === undefined || y === undefined) return null;
    const dir = Math.sign(b - a) || 1;
    const x1 = a + dir * 14;
    const x2 = s.lost ? a + (b - a) * 0.55 : b - dir * 18;
    return { d: `M ${x1} ${y + 6} L ${x2} ${y + 6}`, x1, x2 };
  }
};

/** ✕ where a lost message stops. */
const LostMark = ({ x, y, k }: { x: number; y: number; k: number }) => {
  const s = tokens.node.badge.size;
  return (
    <div style={{ position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: "50%", background: c.down, border: `6px solid ${c.charcoal}`, transform: `scale(${k})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <svg width="60%" height="60%" viewBox="0 0 24 24"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" stroke={c.charcoal} strokeWidth={4} strokeLinecap="round" /></svg>
    </div>
  );
};
