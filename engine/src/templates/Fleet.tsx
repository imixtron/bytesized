// Fleet template (v1.11 proposal): autoscaling. A traffic meter on top, a grid of server pods below.
// Every pod shows its own CPU bar (traffic ÷ capacity of the pods running), so a spike turns the bars
// amber then red, and `reveal`-ing more pods brings them back down.
// stage: { pods: [{ id, label? }] (2–12), load?: { id, label?, max?: 100, perPod?: 10, from?: 0 } }
// Verbs: reveal / appear (a pod spins up), count (`args.to`: set the traffic level), state
// (`to: down` removes a pod), highlight (focus a pod), shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { HATCH, hatch } from "../parts/Diagram";
import { Icon } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type Pod = { id: string; label?: string };
export type FleetStage = { pods?: Pod[]; load?: { id: string; label?: string; max?: number; perPod?: number; from?: number } };

const c = tokens.color;
const S = tokens.node.shadow;

export const Fleet = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><FleetBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const FleetBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as FleetStage;
  const pods = (stage.pods ?? []).slice(0, 12);
  const load = stage.load ?? { id: "load" };
  const maxLoad = load.max ?? 100;
  const perPod = load.perPod ?? 10;
  const beats = localBeats(ctx.ts);
  const at = pods.map((p, i) => firstAt(beats, ["reveal", "appear"], p.id) ?? 6 + i * 4);
  const downAt = pods.map((p) => beats.find((b) => b.do === "state" && b.args?.to === "down" && b.targets.includes(p.id))?.at);
  const events: FocusEvent[] = beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => pods.some((p) => p.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }).sort((a, b) => a.at - b.at);

  // traffic over time: each `count` beat moves it to args.to over 24 frames
  const sets = beats.filter((b) => b.do === "count" && b.targets.includes(load.id));
  let level = load.from ?? 0;
  {
    let prev = level;
    for (const b of sets) {
      const to = Number(b.args?.to ?? prev);
      if (f >= b.at) level = prev + (to - prev) * tween(f, b.at, 24, ease.std);
      prev = to;
    }
  }
  const active = pods.filter((_, i) => f >= at[i] && !(downAt[i] !== undefined && f >= (downAt[i] as number)));
  const cpu = active.length ? level / (perPod * active.length) : 0;

  const cols = pods.length <= 4 ? 2 : 3;
  const meterH = 150;
  const gap = 24;
  const rows = Math.ceil(pods.length / cols);
  const w = (box.w - S.offset - gap * (cols - 1)) / cols;
  const h = Math.min(300, (box.h - meterH - 40 - S.offset - gap * (rows - 1)) / rows);
  const gridTop = meterH + 40;
  const mk = pop(f, 0);
  const hot = cpu > 1 ? 2 : cpu > 0.85 ? 1 : 0;
  const barColor = hot === 2 ? c.down : hot === 1 ? c.warn : c.cream;

  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, width: box.w - S.offset, height: meterH, opacity: Math.min(1, mk * 1.5) }}>
        <div style={{ font: `700 ${tokens.type.label.size}px ${fonts.mono}`, color: c.cream2 }}>{load.label ?? "traffic"}</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 54, height: 56, borderRadius: 28, border: `5px solid ${c.line}`, overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${clamp01(level / maxLoad) * 100}%`, background: c.ember, borderRadius: 24 }} />
        </div>
        <div style={{ position: "absolute", right: 4, top: -8, font: `800 54px ${fonts.display}`, color: c.ember }}>{Math.round(level)}</div>
        <div style={{ position: "absolute", left: 0, top: 118, font: `700 28px ${fonts.mono}`, color: hot === 2 ? c.down : hot === 1 ? c.warn : c.cream3 }}>{active.length} pod{active.length === 1 ? "" : "s"} · cpu {Math.round(Math.min(cpu, 9.99) * 100)}%</div>
      </div>
      {pods.map((p, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (w + gap);
        const y = gridTop + row * (h + gap);
        const k = pop(f, at[i]);
        const dn = downAt[i] !== undefined && f >= (downAt[i] as number);
        const lv = focusLevels(events, p.id, f);
        if (k <= 0) return <div key={p.id} style={{ position: "absolute", left: x, top: y, width: w, height: h, borderRadius: 28, border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />;
        const stroke = dn ? c.down : mixColor(mixColor(c.cream, hot === 2 ? c.down : hot === 1 ? c.warn : c.cream, hot ? 1 : 0), c.orange, lv.on);
        const shakeAt = firstAt(beats, ["shake"], p.id);
        const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
        return (
          <div key={p.id} style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `translateX(${sh}px) scale(${0.4 + 0.6 * k})`, opacity: Math.min(1, k * 1.6) * (dn ? 0.45 : 1) * (1 - 0.5 * lv.dim) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 28, background: hatch(lv.on > 0.5 ? HATCH.orange : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 28, background: c.surface, border: `${tokens.node.stroke}px solid ${stroke}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <Icon name="server" size={Math.min(84, h * 0.36)} color={dn ? c.down : c.cream} />
              <div style={{ font: `700 26px ${fonts.mono}`, color: c.cream2 }}>{p.label ?? p.id}</div>
              <div style={{ width: w - 70, height: 18, borderRadius: 9, background: c.line, overflow: "hidden" }}>
                <div style={{ width: `${clamp01(dn ? 0 : cpu) * 100}%`, height: "100%", background: barColor }} />
              </div>
            </div>
            {dn && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", font: `800 90px ${fonts.display}`, color: c.down }}>✕</div>}
          </div>
        );
      })}
    </>
  );
};
