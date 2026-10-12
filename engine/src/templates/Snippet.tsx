// Snippet template (v1.8 proposal): a terminal or code window that types itself out. Shows the thing
// itself: a request, a response, a config, a log line.
// stage: { title?: string, lines: [{ id, text, kind?: cmd | out | json | comment }] }  (2–8 lines)
// Verbs: reveal / appear (types that line on, a cursor follows), highlight (the line gets an ember bar,
// the others push back), shake (the window shakes).
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../motion/motion";
import { HATCH, hatch } from "../parts/Diagram";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type SnippetLine = { id: string; text: string; kind?: "cmd" | "out" | "json" | "comment" };
export type SnippetStage = { title?: string; lines?: SnippetLine[] };

const c = tokens.color;
const S = tokens.node.shadow;
const CHAR_FRAMES = 1.1;

export const Snippet = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><SnippetBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

/** json-ish colouring: strings cream, numbers and words like true/null ember, punctuation dim. */
const Json = ({ text, fade }: { text: string; fade: number }) => {
  const parts = text.split(/("(?:[^"\\]|\\.)*"\s*:?|-?\d[\d.,]*|\btrue\b|\bfalse\b|\bnull\b)/g);
  return (
    <>
      {parts.map((p, i) => {
        const key = /^".*"\s*:$/.test(p);
        const str = /^"/.test(p) && !key;
        const lit = /^(-?\d|true|false|null)/.test(p);
        const col = key ? c.cream2 : str ? c.cream : lit ? c.ember : c.cream3;
        return <span key={i} style={{ color: mixColor(col, c.cream3, fade) }}>{p}</span>;
      })}
    </>
  );
};

export const SnippetBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as SnippetStage;
  const lines = (stage.lines ?? []).slice(0, 8);
  const beats = localBeats(ctx.ts);
  const at = lines.map((l, i) => firstAt(beats, ["reveal", "appear"], l.id) ?? 14 + i * 26);
  const shakeAt = beats.find((b) => b.do === "shake")?.at;
  const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
  const events: FocusEvent[] = [
    ...lines.map((l, i) => ({ at: at[i], id: l.id, explicit: false })),
    ...beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => lines.some((l) => l.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }),
  ].sort((a, b) => a.at - b.at).map((e, i, all) => ({ ...e, explicit: e.explicit || all.slice(0, i).some((p) => p.explicit) }));

  const k = pop(f, 0);
  const winH = Math.min(box.h - 40, 260 + lines.length * 200);
  const top = (box.h - winH) / 2;
  const bar = 84;
  const lineH = (winH - bar - 40) / Math.max(1, lines.length);
  const fontSize = 40;

  // the cursor sits on the line currently being typed, else on the last revealed line
  const typing = lines.map((l, i) => ({ i, done: f >= at[i] + l.text.length * CHAR_FRAMES })).filter((x) => f >= at[x.i]);
  const cur = typing.length ? typing.find((x) => !x.done)?.i ?? typing.at(-1)!.i : -1;

  return (
    <div style={{ position: "absolute", left: 0, top, width: box.w - S.offset, height: winH, transform: `translateX(${sh}px) scale(${0.9 + 0.1 * k})`, opacity: Math.min(1, k * 1.5) }}>
      <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset}px, ${S.offset}px)`, borderRadius: 30, background: hatch(HATCH.cream) }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: c.surface, border: `${tokens.node.stroke}px solid ${c.cream}`, overflow: "hidden" }}>
        <div style={{ height: bar, borderBottom: `4px solid ${c.line}`, display: "flex", alignItems: "center", gap: 14, padding: "0 28px" }}>
          {[c.down, c.warn, c.ok].map((col, i) => <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", background: col, opacity: 0.8 }} />)}
          {stage.title && <div style={{ marginLeft: 16, font: `700 28px ${fonts.mono}`, color: c.cream3 }}>{stage.title}</div>}
        </div>
        {lines.map((l, i) => {
          const chars = Math.max(0, Math.min(l.text.length, Math.floor((f - at[i]) / CHAR_FRAMES)));
          if (f < at[i]) return null;
          const lv = focusLevels(events, l.id, f);
          const fade = lv.dim;
          const shown = l.text.slice(0, chars);
          const base = l.kind === "out" ? c.cream2 : l.kind === "comment" ? c.cream3 : c.cream;
          return (
            <div key={l.id} style={{ position: "absolute", left: 0, right: 0, top: bar + 20 + i * lineH, height: lineH, display: "flex", alignItems: "center" }}>
              <div style={{ position: "absolute", left: 0, top: 6, bottom: 6, width: 8, borderRadius: 4, background: c.orange, opacity: lv.on }} />
              <div style={{ position: "absolute", left: 0, right: 0, top: 4, bottom: 4, background: `rgba(200,74,39,${0.14 * lv.on})` }} />
              <div style={{ position: "relative", padding: "0 32px", font: `700 ${fontSize}px/1.25 ${fonts.mono}`, whiteSpace: "pre-wrap", wordBreak: "break-word", color: mixColor(base, c.cream3, fade) }}>
                {l.kind === "cmd" && <span style={{ color: mixColor(c.ember, c.cream3, fade) }}>$ </span>}
                {l.kind === "json" ? <Json text={shown} fade={fade} /> : shown}
                {cur === i && Math.floor(f / 8) % 2 === 0 && <span style={{ display: "inline-block", width: 18, height: fontSize, marginLeft: 4, verticalAlign: "text-bottom", background: c.ember }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
