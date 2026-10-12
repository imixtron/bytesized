// Transform template (v1.9 proposal): something goes into a machine and comes out changed. Items run
// down the whole stage with a machine between each pair; on `step` the item above flows into the machine,
// which works (jiggle, scrambling characters), and the next item resolves out of the noise.
// stage: { items: [{ id, text, label? }] (2–4), via: [{ id, label, icon? }] (one fewer than items) }
// Verbs: reveal / appear (an item), step (run a machine: the next item appears), highlight (focus an item).
import { AbsoluteFill, random, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { Arrow, HATCH, Svg, hatch } from "../parts/Diagram";
import { Packet, travelFrames } from "../parts/Flow";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type TItem = { id: string; text: string; label?: string };
export type TVia = { id: string; label: string; icon?: IconName };
export type TransformStage = { items?: TItem[]; via?: TVia[] };

const c = tokens.color;
const S = tokens.node.shadow;
const RESOLVE = 26; // frames for the scramble to settle
const GLYPHS = "0123456789abcdef#%&@$";

export const Transform = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><TransformBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

const scramble = (text: string, k: number, seed: string, f: number) =>
  text.split("").map((ch, i) => (ch === " " || i < k * text.length ? ch : GLYPHS[Math.floor(random(`${seed}-${i}-${Math.floor(f / 2)}`) * GLYPHS.length)])).join("");

export const TransformBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as TransformStage;
  const items = (stage.items ?? []).slice(0, 4);
  const via = stage.via ?? [];
  const beats = localBeats(ctx.ts);
  const n = items.length;
  // items and machines stacked down the whole stage, equal gaps between every neighbour
  const mH = n >= 3 ? 140 : 200;
  const itemH = n >= 3 ? 105 : 150;
  const gap = (box.h - n * itemH - (n - 1) * mH) / Math.max(1, 2 * (n - 1));
  const yItem = (i: number) => i * (itemH + mH + 2 * gap) + itemH / 2;
  const yVia = (i: number) => i * (itemH + mH + 2 * gap) + itemH + gap + mH / 2;
  const cx = box.w / 2;
  const chipW = box.w - 40;
  const mW = mH * 0.95;

  // run time of each machine: its `step`, else when the next item is revealed, else a default cadence
  const run = items.map((it, i) => (i === 0 ? undefined : firstAt(beats, ["step"], via[i - 1]?.id ?? "") ?? firstAt(beats, ["reveal", "appear"], it.id) ?? 30 + (i - 1) * 60));
  const at = items.map((it, i) => (i === 0 ? firstAt(beats, ["reveal", "appear"], it.id) ?? 6 : (run[i] ?? 0) + 18));
  const events: FocusEvent[] = [
    ...items.map((it, i) => ({ at: at[i], id: it.id, explicit: false })),
    ...beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => items.some((it) => it.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }),
  ].sort((a, b) => a.at - b.at).map((e, i, all) => ({ ...e, explicit: e.explicit || all.slice(0, i).some((p) => p.explicit) }));

  return (
    <>
      <Svg>
        {via.slice(0, n - 1).map((v, i) => {
          const r = run[i + 1] ?? 0;
          const top = `M ${cx} ${yItem(i) + itemH / 2 + 8} L ${cx} ${yVia(i) - mH / 2}`;
          const bot = `M ${cx} ${yVia(i) + mH / 2} L ${cx} ${yItem(i + 1) - itemH / 2 - 8}`;
          return (
            <g key={v.id}>
              <Arrow d={top} progress={tween(f, at[i] + 6, 10, ease.std)} color={c.cream3} head={false} dashed />
              <Arrow d={bot} progress={tween(f, r + 4, 14, ease.std)} color={c.cream3} />
            </g>
          );
        })}
      </Svg>
      {via.slice(0, n - 1).map((v, i) => {
        const r = run[i + 1] ?? 0;
        const top = `M ${cx} ${yItem(i) + itemH / 2 + 8} L ${cx} ${yVia(i) - mH / 2}`;
        return <Packet key={`p-${v.id}`} d={top} progress={(f - r) / 12} />;
      })}
      {via.slice(0, n - 1).map((v, i) => {
        const r = run[i + 1] ?? 0;
        const k = pop(f, Math.max(0, at[i] + 2));
        const working = f >= r + 8 && f < r + 8 + RESOLVE;
        const wob = working ? Math.sin(f * 1.7) * 4 : 0;
        const spin = working ? Math.sin(f * 0.9) * 14 : 0;
        return (
          <div key={v.id} style={{ position: "absolute", left: cx - mW / 2, top: yVia(i) - mH / 2, width: mW, height: mH, transform: `translateX(${wob}px) scale(${0.5 + 0.5 * k})`, opacity: Math.min(1, k * 1.6) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 34, background: hatch(working ? HATCH.orange : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 34, background: c.surface, border: `${tokens.node.stroke}px solid ${working ? c.orange : c.cream}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ transform: `rotate(${spin}deg)` }}><Icon name={v.icon ?? "cpu"} size={mH * 0.48} color={working ? c.ember : c.cream} /></div>
            </div>
            <div style={{ position: "absolute", left: mW + 34, top: "50%", transform: "translateY(-50%)", whiteSpace: "nowrap", font: `800 44px ${fonts.display}`, color: working ? c.ember : c.cream2 }}>{v.label}</div>
          </div>
        );
      })}
      {items.map((it, i) => {
        const k = pop(f, at[i]);
        const lv = focusLevels(events, it.id, f);
        const settle = i === 0 ? 1 : tween(f, at[i], RESOLVE, ease.std);
        const text = i === 0 ? it.text : scramble(it.text, settle, it.id, f);
        const stroke = mixColor(mixColor(c.cream, c.orange, lv.on), c.cream3, lv.dim);
        if (k <= 0) return <div key={it.id} style={{ position: "absolute", left: 20, top: yItem(i) - itemH / 2, width: chipW, height: itemH, borderRadius: 30, border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />;
        return (
          <div key={it.id} style={{ position: "absolute", left: 20, top: yItem(i) - itemH / 2, width: chipW, height: itemH, transform: `scale(${0.85 + 0.15 * k})`, opacity: Math.min(1, k * 1.5) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 30, background: hatch(lv.on > 0.5 ? HATCH.orange : lv.dim > 0.5 ? HATCH.dim : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: c.surface, border: `${tokens.node.stroke}px solid ${stroke}`, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px", overflow: "hidden" }}>
              <div style={{ font: `700 ${text.length > 26 ? 34 : 44}px/1.1 ${fonts.mono}`, color: mixColor(settle < 1 ? c.ember : c.cream, c.cream3, lv.dim), whiteSpace: "nowrap" }}>{text}</div>
            </div>
            {it.label && <div style={{ position: "absolute", left: 24, top: -18, padding: "0 12px", background: c.charcoal, font: `700 28px ${fonts.mono}`, color: mixColor(c.cream2, c.cream3, lv.dim) }}>{it.label}</div>}
          </div>
        );
      })}
    </>
  );
};
