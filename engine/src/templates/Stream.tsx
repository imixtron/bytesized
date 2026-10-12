// Stream template (v1.10 proposal): queues and partitions. 1–4 lanes run top → bottom from a producer to
// a consumer. Messages join at the top, slide down and queue up at the bottom; each `step` on a lane lets
// its consumer take the next message. A slow consumer = a growing queue.
// stage: { lanes: [{ id, label, producer?: icon, consumer?: icon }] (1–4), messages: [{ id, lane, label? }] (≤12) }
// Verbs: reveal / appear / send (a message joins its lane), step (a lane's consumer takes one),
// highlight (focus a lane), state (`to: overloaded` on a lane tints it warn), shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { HATCH, Svg, hatch } from "../parts/Diagram";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type StreamLane = { id: string; label: string; producer?: IconName; consumer?: IconName };
export type StreamMsg = { id: string; lane: string; label?: string };
export type StreamStage = { lanes?: StreamLane[]; messages?: StreamMsg[] };

const c = tokens.color;
const S = tokens.node.shadow;
const NODE = 120;
const MSG_H = 62;
const ENTER = 20;
const TAKE = 14;

export const Stream = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><StreamBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const StreamBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as StreamStage;
  const lanes = (stage.lanes ?? []).slice(0, 4);
  const msgs = (stage.messages ?? []).slice(0, 12);
  const beats = localBeats(ctx.ts);
  const n = lanes.length;
  const laneW = Math.min(300, (box.w - 30) / n - 20);
  const lx = (i: number) => (box.w / n) * (i + 0.5);
  const topY = 8;
  const botY = box.h - NODE - 8;
  const tubeTop = topY + NODE + 28;
  const tubeBot = botY - 20;
  const hotLane = new Map(lanes.flatMap((l) => { const b = beats.find((x) => x.do === "state" && x.args?.to === "overloaded" && x.targets.includes(l.id)); return b ? [[l.id, b.at] as const] : []; }));
  const events: FocusEvent[] = beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => lanes.some((l) => l.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }).sort((a, b) => a.at - b.at);

  // per message: when it joins, and when its lane's consumer takes it (the nth `step` on the lane)
  const arrive = msgs.map((m, i) => firstAt(beats, ["reveal", "appear", "send"], m.id) ?? 12 + i * 14);
  const takes = new Map(lanes.map((l) => [l.id, beats.filter((b) => b.do === "step" && b.targets.includes(l.id)).map((b) => b.at)]));
  const consumeAt = msgs.map((m) => {
    const order = msgs.filter((o) => o.lane === m.lane).sort((a, b) => arrive[msgs.indexOf(a)] - arrive[msgs.indexOf(b)]).indexOf(m);
    return takes.get(m.lane)?.[order];
  });

  return (
    <>
      <Svg>
        {lanes.map((l, i) => {
          const lv = focusLevels(events, l.id, f);
          const hot = hotLane.get(l.id);
          const hk = hot !== undefined && f >= hot ? tween(f, hot, 14) : 0;
          const col = mixColor(mixColor(c.line, c.orange, lv.on), c.warn, hk);
          return <rect key={l.id} x={lx(i) - laneW / 2} y={tubeTop} width={laneW} height={tubeBot - tubeTop} rx={30} fill="rgba(255,255,255,.015)" stroke={col} strokeWidth={5} strokeDasharray="12 16" opacity={1 - 0.4 * lv.dim} />;
        })}
      </Svg>
      {lanes.map((l, i) => {
        const k = pop(f, i * 6);
        const lv = focusLevels(events, l.id, f);
        const hot = hotLane.get(l.id);
        const hk = hot !== undefined && f >= hot ? tween(f, hot, 14) : 0;
        const stroke = mixColor(mixColor(c.cream, c.orange, lv.on), c.cream3, lv.dim);
        const takeBeat = (takes.get(l.id) ?? []).filter((t) => f >= t && f < t + TAKE)[0];
        const eat = takeBeat !== undefined ? Math.sin(((f - takeBeat) / TAKE) * Math.PI) : 0;
        const box_ = (y: number, icon: IconName, label?: string, work = 0) => (
          <div style={{ position: "absolute", left: lx(i) - NODE / 2, top: y, width: NODE, height: NODE, transform: `scale(${(0.5 + 0.5 * k) * (1 + work * 0.1)})`, opacity: Math.min(1, k * 1.6) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 28, background: hatch(lv.dim > 0.5 ? HATCH.dim : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: c.surface, border: `${tokens.node.stroke}px solid ${work > 0.3 ? c.orange : stroke}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={icon} size={NODE * 0.5} color={mixColor(work > 0.3 ? c.ember : c.cream, c.cream3, lv.dim)} />
            </div>
            {label && <div style={{ position: "absolute", left: -40, width: NODE + 80, top: NODE + 12, textAlign: "center", font: `700 ${tokens.type.label.size}px ${fonts.mono}`, color: mixColor(c.cream2, c.cream3, lv.dim) }}>{label}</div>}
          </div>
        );
        return (
          <div key={l.id}>
            {box_(topY, l.producer ?? "user")}
            {box_(botY, l.consumer ?? "server", undefined, eat)}
            <div style={{ position: "absolute", left: lx(i) - laneW / 2, width: laneW, top: tubeTop + 8, textAlign: "center", font: `700 ${tokens.type.label.size}px ${fonts.mono}`, color: mixColor(mixColor(c.cream2, c.warn, hk), c.cream3, lv.dim), opacity: Math.min(1, k * 1.5) }}>{l.label}</div>
          </div>
        );
      })}
      {msgs.map((m, i) => {
        const li = lanes.findIndex((l) => l.id === m.lane);
        if (li < 0 || f < arrive[i]) return null;
        // smoothed rank among its lane's waiting messages (0 = next to be taken)
        let rank = 0;
        msgs.forEach((o, j) => {
          if (j === i || o.lane !== m.lane || arrive[j] >= arrive[i]) return;
          const ca = consumeAt[j];
          rank += ca === undefined ? 1 : 1 - tween(f, ca, TAKE, ease.std);
        });
        const slotY = tubeBot - 16 - MSG_H / 2 - rank * (MSG_H + 14);
        const enter = tween(f, arrive[i], ENTER, ease.std);
        const ca = consumeAt[i];
        const out = ca !== undefined ? tween(f, ca, TAKE, ease.std) : 0;
        const y = tubeTop + 20 + (slotY - (tubeTop + 20)) * enter + out * (botY + NODE / 2 - slotY);
        const lv = focusLevels(events, m.lane, f);
        const w = laneW - 40;
        return (
          <div key={m.id} style={{ position: "absolute", left: lx(li) - w / 2, top: y - MSG_H / 2, width: w, height: MSG_H, borderRadius: 18, background: c.cream, color: c.charcoal, display: "flex", alignItems: "center", justifyContent: "center", font: `700 28px ${fonts.mono}`, opacity: Math.min(1, enter * 2) * (1 - out) * (1 - 0.55 * lv.dim), transform: `scale(${1 - 0.5 * out})` }}>
            {m.label ?? m.id}
          </div>
        );
      })}
    </>
  );
};
