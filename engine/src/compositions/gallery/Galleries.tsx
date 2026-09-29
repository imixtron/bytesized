// 4.3 review galleries: every part in the library, animated. Not used in episodes.
import type { ReactElement } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { pop } from "../../motion/motion";
import { Counter, Crowd } from "../../parts/Crowd";
import { Packet, Wires, back, chain, flowPath, travelFrames, type Pt } from "../../parts/Flow";
import { ICONS, Icon, type IconName } from "../../parts/icons";
import { Node, type NodeState } from "../../parts/Node";
import { fonts } from "../../theme/fonts";
import { tokens } from "../../theme/tokens";

const c = tokens.color;
const NFLX = "assets/logos/netflix/derived/node.png";

const Title = ({ text, sub }: { text: string; sub: string }) => (
  <>
    <div style={{ position: "absolute", left: 64, top: 150, font: `800 64px ${fonts.display}`, color: c.cream }}>{text}</div>
    <div style={{ position: "absolute", left: 64, top: 238, font: `700 28px ${fonts.mono}`, color: c.cream3 }}>{sub}</div>
  </>
);
const Caption = ({ x, y, text, color = c.cream2, size = 30, width = 400 }: { x: number; y: number; text: string; color?: string; size?: number; width?: number }) => (
  <div style={{ position: "absolute", left: x - width / 2, top: y, width, textAlign: "center", font: `700 ${size}px/1.3 ${fonts.mono}`, color }}>{text}</div>
);

// ---------------------------------------------------------------- nodes
export const GALLERY_NODES_FRAMES = 180;
const CYCLE: { s: NodeState; at: number }[] = [
  { s: "idle", at: 0 }, { s: "active", at: 40 }, { s: "overloaded", at: 70 }, { s: "down", at: 100 }, { s: "recovered", at: 140 },
];

export const GalleryNodes = () => {
  const f = useCurrentFrame();
  const enter = (i: number) => pop(f, 4 + i * tokens.motion.stagger.frames);
  const fams = [
    { type: "server", family: "outlined", label: "outlined", note: "inside our system" },
    { type: "phone", family: "solid", label: "solid", note: "outside it" },
    { type: "lb", family: "hero", label: "hero", note: "the topic" },
    { type: "brand", family: "hero", label: "brand", note: "3rd-party logo" },
  ] as const;
  const states: NodeState[] = ["idle", "active", "overloaded", "down", "recovered", "dimmed"];

  // live node cycling through states
  const cur = [...CYCLE].reverse().find((k) => f >= k.at)!;
  const prev = CYCLE[Math.max(0, CYCLE.indexOf(cur) - 1)];
  const t = Math.min(1, (f - cur.at) / tokens.motion.standard.frames);
  const shake = cur.s === "down" ? Math.min(1, (f - cur.at) / tokens.motion.shake.frames) : 0;

  return (
    <AbsoluteFill style={{ background: c.charcoal }}>
      <Title text="Nodes" sub="4 families · 6 states · live state change" />
      {fams.map((n, i) => {
        const x = 180 + i * 240;
        return (
          <div key={n.label}>
            <Node type={n.type} family={n.family} x={x} y={470} w={170} enter={enter(i)} logo={n.type === "brand" ? NFLX : undefined} />
            <Caption x={x} y={600} text={n.label} color={n.family === "hero" ? c.ember : c.cream} />
            <Caption x={x} y={642} text={n.note} color={c.cream3} size={24} width={220} />
          </div>
        );
      })}
      {states.map((s, i) => {
        const x = 230 + (i % 3) * 310;
        const y = 850 + Math.floor(i / 3) * 320;
        return (
          <div key={s}>
            <Node type="server" x={x} y={y} w={170} state={s} enter={enter(4 + i)} badgeIn={pop(f, 20 + i * 3)} />
            <Caption x={x} y={y + 120} text={s} color={s === "idle" ? c.cream : s === "dimmed" ? c.cream3 : undefined} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 64, right: 64, top: 1420, height: 4, background: c.line }} />
      <Node type="server" x={397} y={1620} w={200} state={cur.s} from={prev.s} t={t} shake={shake} badgeIn={pop(f, cur.at)} label="app-3" labelSide="right" enter={enter(10)} />
      <Caption x={740} y={1665} text={`→ ${cur.s}`} color={c.ember} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- flow
export const GALLERY_FLOW_FRAMES = 210;
const U = [237, 497, 757].map((x) => ({ x, y: 640 }));
const LB = { x: 497, y: 830 };
const APPS = [237, 497, 757].map((x) => ({ x, y: 1040 }));
const DB = { x: 497, y: 1310 };
const bottom = (p: Pt, h: number) => ({ x: p.x, y: p.y + h / 2 });
const top = (p: Pt, h: number) => ({ x: p.x, y: p.y - h / 2 });

export const GalleryFlow = () => {
  const f = useCurrentFrame();
  const uToLb = U.map((u) => flowPath(bottom(u, 110), top(LB, 150)));
  const lbToApp = APPS.map((a) => flowPath(bottom(LB, 150), top(a, 130)));
  const appToDb = APPS.map((a) => flowPath(bottom(a, 130), top(DB, 110)));

  // app-3: overloaded at 70, down at 110 (traffic reroutes), recovered at 165
  const app3: NodeState = f >= 165 ? "recovered" : f >= 110 ? "down" : f >= 70 ? "overloaded" : "idle";
  const app3From: NodeState = f >= 165 ? "down" : f >= 110 ? "overloaded" : "idle";
  const app3At = f >= 165 ? 165 : f >= 110 ? 110 : 70;
  const app3Down = f >= 110 && f < 165;

  const packets: ReactElement[] = [];
  const period = 18;
  for (let k = 0; k < 14; k++) {
    const start = k * period;
    const u = k % 3;
    let target = k % 3;
    if (app3Down && target === 2) target = k % 2; // reroute away from the dead server
    const d = chain(uToLb[u], lbToApp[target]);
    const dur = travelFrames(d);
    packets.push(<Packet key={`r${k}`} d={d} progress={(f - start) / dur} />);
    const rd = back(d);
    packets.push(<Packet key={`s${k}`} d={rd} kind="response" progress={(f - start - dur - 4) / dur} />);
  }

  return (
    <AbsoluteFill style={{ background: c.charcoal }}>
      <Title text="Wires & packets" sub="requests in ember · responses in cream · reroute on failure" />
      <Wires
        paths={[
          ...uToLb.map((d) => ({ d, live: true })),
          ...lbToApp.map((d, i) => ({ d, live: !(i === 2 && app3Down), alpha: i === 2 && app3Down ? 0.35 : 1 })),
          ...appToDb.map((d) => ({ d })),
        ]}
      />
      {packets}
      {U.map((u, i) => <Node key={i} type="phone" family="solid" x={u.x} y={u.y} w={120} h={110} />)}
      <Node type="lb" family="hero" x={LB.x} y={LB.y} w={150} h={150} label="lb-01" labelSide="right" />
      {APPS.map((a, i) => (
        <Node key={i} type="server" x={a.x} y={a.y} w={170} h={130} label={`app-${i + 1}`} state={i === 2 ? app3 : "idle"} from={i === 2 ? app3From : undefined} t={i === 2 ? Math.min(1, (f - app3At) / 9) : 1} shake={i === 2 && app3 === "down" ? Math.min(1, (f - 110) / 9) : 0} badgeIn={pop(f, app3At)} />
      ))}
      <Node type="db" x={DB.x} y={DB.y} w={130} h={110} label="postgres" labelSide="right" />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- crowd, counter, icons
export const GALLERY_BITS_FRAMES = 150;

export const GalleryBits = () => {
  const f = useCurrentFrame();
  const target = { x: 540, y: 700 };
  const count = Math.min(1, Math.max(0, (f - 10) / 90));
  const names = Object.keys(ICONS) as IconName[];
  return (
    <AbsoluteFill style={{ background: c.charcoal }}>
      <Title text="Crowd, counter, icons" sub="flood · count · the 20-icon set" />
      <Crowd target={target} frame={f} radius={[300, 470]} count={44} />
      <Node type="brand" family="hero" x={target.x} y={target.y} w={220} logo={NFLX} label="netflix" enter={pop(f, 0)} />
      <Counter x={540} y={900} value={2418903 * (1 - Math.pow(1 - count, 3))} label="watching" />
      <div style={{ position: "absolute", left: 64, right: 64, top: 1040, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", rowGap: 36, color: c.cream }}>
        {names.map((n, i) => (
          <div key={n} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, opacity: Math.min(1, pop(f, 20 + i * 2) * 1.5) }}>
            <Icon name={n} size={84} color={n === "lb" ? c.ember : c.cream} />
            <div style={{ font: `700 24px ${fonts.mono}`, color: c.cream2 }}>{n}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
