// Chat template (v1.11 proposal): a protocol as a conversation. Two actors on top, message bubbles
// alternating down the stage; each bubble is preceded by typing dots. Requests get an ember outline,
// responses a solid cream bubble.
// stage: { actors: [node, node], messages: [{ id, from, text, kind?: request | response }] }  (2–7 messages)
// Verbs: reveal / appear / step (typing dots, then the bubble), highlight (focus a bubble), shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { pop } from "../motion/motion";
import type { IconName } from "../parts/icons";
import { Node } from "../parts/Node";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, focusLevels, localBeats, logoPath, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type ChatMsg = { id: string; from: string; text: string; kind?: "request" | "response" };
export type ChatStage = { actors?: NodeSpec[]; messages?: ChatMsg[] };

const c = tokens.color;
const TYPING = 14;

export const Chat = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><ChatBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const ChatBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as ChatStage;
  const actors = (stage.actors ?? []).slice(0, 2);
  const msgs = (stage.messages ?? []).slice(0, 7);
  const beats = localBeats(ctx.ts);
  const N = 130;
  const ax = (i: number) => (i === 0 ? N / 2 + 20 : box.w - N / 2 - 20);
  const head = N + 70;
  const rowH = (box.h - head) / Math.max(1, msgs.length);
  const at = msgs.map((m, i) => firstAt(beats, ["reveal", "appear", "step"], m.id) ?? 20 + i * 44);
  const events: FocusEvent[] = beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => msgs.some((m) => m.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }).sort((a, b) => a.at - b.at);
  const bubbleW = Math.min(640, box.w - 160);

  return (
    <>
      {actors.map((a, i) => (
        <Node key={a.id} type={a.type} family={a.family} icon={a.icon as IconName | undefined} x={ax(i)} y={N / 2 + 6} w={N} h={N} label={a.label}
          logo={a.type === "brand" && a.logo ? logoPath(a.logo) : undefined} enter={pop(f, i * 4)} />
      ))}
      {msgs.map((m, i) => {
        const side = Math.max(0, actors.findIndex((a) => a.id === m.from));
        const right = side === 1;
        const y = head + i * rowH + rowH / 2;
        const t = f - at[i];
        const lv = focusLevels(events, m.id, f);
        const req = (m.kind ?? (side === 0 ? "request" : "response")) === "request";
        if (t < -2) return null;
        const typing = t < TYPING;
        const k = pop(f, at[i] + TYPING);
        const x = right ? box.w - 20 - bubbleW : 20;
        return (
          <div key={m.id}>
            {typing && (
              <div style={{ position: "absolute", left: right ? box.w - 20 - 150 : 20, top: y - 36, width: 150, height: 72, borderRadius: 36, background: c.surface, border: `5px solid ${c.line}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 12, opacity: Math.min(1, (t + 2) / 4) }}>
                {[0, 1, 2].map((d) => <div key={d} style={{ width: 16, height: 16, borderRadius: "50%", background: c.cream3, transform: `translateY(${Math.sin((f + d * 4) * 0.5) * 7}px)` }} />)}
              </div>
            )}
            {!typing && (
              <div style={{ position: "absolute", left: x, top: y - (rowH - 26) / 2, width: bubbleW, minHeight: Math.min(rowH - 26, 120), maxHeight: rowH - 26, display: "flex", alignItems: "center", justifyContent: right ? "flex-end" : "flex-start", transform: `scale(${0.7 + 0.3 * k})`, transformOrigin: right ? "right center" : "left center", opacity: Math.min(1, k * 1.6) * (1 - 0.55 * lv.dim) }}>
                <div style={{ position: "relative", maxWidth: "100%", padding: "20px 30px", borderRadius: 38, borderBottomRightRadius: right ? 8 : 38, borderBottomLeftRadius: right ? 38 : 8, background: req ? c.surface : c.cream, border: `${tokens.node.stroke}px solid ${lv.on > 0.5 ? c.orange : req ? c.ember : c.cream}`, color: req ? c.cream : c.charcoal, font: `700 42px/1.2 ${fonts.mono}`, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {m.text}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </>
  );
};
