// Tiers template (v1.5): levels along a trade-off. Variants:
//  - `stack` (default): 2–5 tier cards top → bottom, plus up to 2 tapered "axis" wedges on the right
//    (how fast, what it costs…), thick where the axis is high.
//  - `pyramid`: tiers widen downwards (memory hierarchy, test pyramid). No axes.
//  - `spectrum`: one horizontal dial between two `ends`, tiers as stops and a marker that slides to
//    the highlighted one (consistency levels, sync ↔ async).
// Verbs: reveal / appear (tiers, axes), highlight (focus a tier; moves the spectrum marker).
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { HATCH, Label, Svg, hatch } from "../parts/Diagram";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { GhostSlot, Headline, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent, type LocalBeat } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type Tier = { id: string; title: string; sub?: string; icon?: IconName };
export type Axis = { id: string; label: string; dir?: "down" | "up" };
export type TiersStage = { variant?: "stack" | "pyramid" | "spectrum"; tiers?: Tier[]; axes?: Axis[]; ends?: [string, string] };

const c = tokens.color;
const T = tokens.diagram.tier;
const S = tokens.node.shadow;

export const Tiers = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><TiersBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

/** Focus changes: each reveal marks the newest tier; a highlight focuses one and pushes the rest back. */
function focusEvents(beats: LocalBeat[], tiers: Tier[], at: number[]): FocusEvent[] {
  const reveals = tiers.map((t, i) => ({ at: at[i], id: t.id, explicit: false }));
  const his = beats.filter((b) => b.do === "highlight").flatMap((b) => {
    const id = b.targets.find((x) => tiers.some((t) => t.id === x));
    return id ? [{ at: b.at, id, explicit: true }] : [];
  });
  // after a highlight, a later reveal keeps everything else pushed back
  return [...reveals, ...his].sort((x, y) => x.at - y.at).map((e, i, all) => ({ ...e, explicit: e.explicit || all.slice(0, i).some((p) => p.explicit) }));
}

export const TiersBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as TiersStage;
  const tiers = (stage.tiers ?? []).slice(0, 5);
  const beats = localBeats(ctx.ts);
  const at = tiers.map((t, i) => firstAt(beats, ["reveal", "appear"], t.id) ?? i * 6);
  const events = focusEvents(beats, tiers, at);
  const variant = stage.variant ?? "stack";
  if (variant === "spectrum") return <Spectrum stage={stage} tiers={tiers} at={at} events={events} beats={beats} f={f} box={box} />;

  const axes = variant === "stack" ? (stage.axes ?? []).slice(0, 2) : [];
  const axisSpace = axes.length * (T.axisWidth + 30);
  const labelH = axes.length ? 56 : 0;
  const h = Math.min(T.h * (tiers.length <= 3 ? 1.25 : 1), (box.h - labelH - T.gap * (tiers.length - 1)) / tiers.length);
  const total = h * tiers.length + T.gap * (tiers.length - 1);
  const top = labelH + (box.h - labelH - total) / 2;
  const cardW = box.w - axisSpace - 16;

  return (
    <>
      {tiers.map((t, i) => {
        const w = variant === "pyramid" ? cardW * (T.pyramidTop + ((1 - T.pyramidTop) * i) / Math.max(1, tiers.length - 1)) : cardW;
        const x = variant === "pyramid" ? (box.w - 16 - w) / 2 : 0;
        const y = top + i * (h + T.gap);
        const k = pop(f, at[i]);
        // the slot is there from the scene start; the card pops in over it
        if (k <= 0) return <GhostSlot key={t.id} x={x} y={y} w={w} h={h} k={pop(f, i * tokens.motion.stagger.frames)} />;
        const lv = focusLevels(events, t.id, f);
        return <TierCard key={t.id} t={t} x={x} y={y} w={w} h={h} on={lv.on} dim={lv.dim} k={k} centred={variant === "pyramid"} />;
      })}
      {axes.map((a, j) => {
        const aAt = firstAt(beats, ["reveal", "appear"], a.id) ?? at[at.length - 1] + 8 + j * 6;
        const g = tween(f, aAt, 18, ease.std);
        if (g <= 0) return null;
        const x0 = cardW + 30 + j * (T.axisWidth + 30);
        const hiA = beats.some((b) => b.do === "highlight" && b.targets.includes(a.id) && f >= b.at);
        return <AxisWedge key={a.id} a={a} x={x0} y={top} w={T.axisWidth} h={total} grow={g} on={hiA} labelY={top - 34} />;
      })}
    </>
  );
};

const TierCard = ({ t, x, y, w, h, on, dim, k, centred }: { t: Tier; x: number; y: number; w: number; h: number; on: number; dim: number; k: number; centred: boolean }) => {
  // on / dim are 0→1 levels, so focus changes fade instead of snapping
  const border = mixColor(mixColor(c.cream, c.cream3, dim), c.orange, on);
  const ink = mixColor(c.cream, c.cream3, dim);
  const icon = Math.min(84, h * 0.55);
  // titles shrink to fit narrow tiers (pyramid tops), never below the 32px floor
  const room = w - 68 - (t.icon ? icon + 28 : 0);
  const title = Math.max(tokens.type.minSize, Math.min(centred ? 44 : 52, room / (t.title.length * 0.8)));
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `translateY(${(1 - k) * 30}px) scale(${0.92 + 0.08 * k})`, opacity: Math.min(1, k * 1.5) }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 30, background: hatch(HATCH.cream), opacity: (1 - on) * (1 - 0.7 * dim) }} />
      <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 30, background: hatch(HATCH.orange), opacity: on }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 30, border: `6px solid ${border}`, background: c.surface, display: "flex", alignItems: "center", justifyContent: centred ? "center" : "flex-start", gap: 28, padding: "0 34px" }}>
        {t.icon && <Icon name={t.icon} size={icon} color={mixColor(ink, c.ember, on)} />}
        <div style={{ minWidth: 0 }}>
          <div style={{ font: `800 ${title}px/1 ${fonts.display}`, color: ink, whiteSpace: "nowrap" }}>{t.title}</div>
          {t.sub && <div style={{ font: `700 34px/1.15 ${fonts.text}`, color: mixColor(c.cream2, c.cream3, dim), marginTop: 8, whiteSpace: "nowrap" }}>{t.sub}</div>}
        </div>
      </div>
    </div>
  );
};

/** A tapered bar beside the stack: wide where the axis is high. Grows downward on reveal. */
const AxisWedge = ({ a, x, y, w, h, grow, on, labelY }: { a: Axis; x: number; y: number; w: number; h: number; grow: number; on: boolean; labelY: number }) => {
  const thin = 14;
  const [wt, wb] = a.dir === "up" ? [thin, w] : [w, thin];
  const cx = x + w / 2;
  const pts = `${cx - wt / 2},${y} ${cx + wt / 2},${y} ${cx + wb / 2},${y + h} ${cx - wb / 2},${y + h}`;
  const id = `ax-${a.id}`;
  return (
    <>
      <Svg>
        <defs>
          <pattern id={`${id}-p`} width={S.line + S.gap} height={S.line + S.gap} patternUnits="userSpaceOnUse" patternTransform={`rotate(${S.angle + 90})`}>
            <rect width={S.line} height={S.line + S.gap} fill={on ? HATCH.orange : HATCH.cream} />
          </pattern>
          <clipPath id={`${id}-c`}><rect x={x - 4} y={y - 4} width={w + 8} height={(h + 8) * grow} /></clipPath>
        </defs>
        <g clipPath={`url(#${id}-c)`}>
          <polygon points={pts} fill={`url(#${id}-p)`} stroke={on ? c.orange : c.cream2} strokeWidth={4} strokeLinejoin="round" />
        </g>
      </Svg>
      <Label x={cx} y={labelY} text={a.label} color={on ? c.ember : c.cream2} size={32} k={Math.min(1, grow * 2)} />
    </>
  );
};

const Spectrum = ({ stage, tiers, at, events, beats, f, box }: {
  stage: TiersStage; tiers: Tier[]; at: number[]; events: FocusEvent[]; beats: LocalBeat[]; f: number; box: Pick<Box, "w" | "h">;
}) => {
  const focusId = events.filter((e) => f >= e.at).at(-1)?.id;
  const y = box.h / 2;
  const pad = 70;
  const xs = tiers.map((_, i) => pad + ((box.w - 2 * pad) * i) / Math.max(1, tiers.length - 1));
  const bar = tween(f, 0, 14, ease.std);
  // the marker slides between stops on each highlight
  const his = beats.filter((b) => b.do === "highlight" && tiers.some((t) => b.targets.includes(t.id)));
  const idx = (id?: string) => Math.max(0, tiers.findIndex((t) => t.id === id));
  const cur = his.filter((b) => f >= b.at).at(-1);
  const prev = cur ? his[his.indexOf(cur) - 1] : undefined;
  const fromX = prev ? xs[idx(prev.targets[0])] : xs[0];
  const mx = cur ? interpolate(tween(f, cur.at, tokens.motion.pop.frames + 6, ease.std), [0, 1], [fromX, xs[idx(cur.targets[0])]]) : xs[idx(focusId)];
  const markerIn = pop(f, his[0]?.at ?? at[0] ?? 0);
  return (
    <>
      <div style={{ position: "absolute", left: pad - 40, top: y - 16, width: (box.w - 2 * pad + 80) * bar, height: 32, borderRadius: 16, border: `4px solid ${c.cream2}`, background: hatch(HATCH.cream) }} />
      {stage.ends && (
        <>
          <Label x={pad - 40} y={y - 330} text={`← ${stage.ends[0]}`} align="left" color={c.cream2} k={bar} />
          <Label x={box.w - pad + 40} y={y - 330} text={`${stage.ends[1]} →`} align="right" color={c.cream2} k={bar} />
        </>
      )}
      {tiers.map((t, i) => {
        const k = pop(f, at[i]);
        // the stops are on the dial from the start (faint), so it never looks empty
        if (k <= 0) return <div key={t.id} style={{ position: "absolute", left: xs[i] - 14, top: y - 14, width: 28, height: 28, borderRadius: "50%", background: c.line, border: `6px solid ${c.charcoal}`, opacity: bar }} />;
        const on = focusLevels(events, t.id, f).on;
        const above = i % 2 === 0;
        return (
          <div key={t.id}>
            <div style={{ position: "absolute", left: xs[i] - 18, top: y - 18, width: 36, height: 36, borderRadius: "50%", background: mixColor(c.cream, c.orange, on), border: `6px solid ${c.charcoal}`, transform: `scale(${k})` }} />
            <div style={{
              position: "absolute", left: xs[i], top: above ? y - 60 : y + 60, transform: `translate(${i === 0 ? "-20%" : i === tiers.length - 1 ? "-80%" : "-50%"}, ${above ? "-100%" : "0"}) scale(${0.9 + 0.1 * k})`,
              opacity: Math.min(1, k * 1.5), textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            }}>
              {above && t.icon && <Icon name={t.icon} size={84} color={mixColor(c.cream, c.ember, on)} />}
              <div style={{ font: `800 50px/1 ${fonts.display}`, color: mixColor(c.cream2, c.cream, on), whiteSpace: "nowrap" }}>{t.title}</div>
              {t.sub && <div style={{ font: `700 36px ${fonts.text}`, color: c.cream2, whiteSpace: "nowrap" }}>{t.sub}</div>}
              {!above && t.icon && <Icon name={t.icon} size={84} color={mixColor(c.cream, c.ember, on)} />}
            </div>
          </div>
        );
      })}
      {markerIn > 0 && (
        <div style={{ position: "absolute", left: mx - 40, top: y - 40, width: 80, height: 80, borderRadius: "50%", border: `8px solid ${c.orange}`, boxShadow: `0 0 30px rgba(232,105,63,.6)`, transform: `scale(${markerIn})` }} />
      )}
    </>
  );
};
