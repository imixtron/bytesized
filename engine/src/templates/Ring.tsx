// Ring template (v1.10 proposal): consistent hashing. Servers sit on a ring (by angle), keys land on it
// and each key slides clockwise to the next live server. When a server goes `down`, only ITS keys move on
// to the next one; everything else stays put.
// stage: { servers: [{ id, label, at }] (2–5, `at` = degrees clockwise from the top),
//          keys: [{ id, label?, at }] (≤8) }
// Verbs: reveal / appear (a server or a key lands on the ring), step (a key slides to its server),
// state (`to: down` takes a server out of the ring; its keys re-home), highlight, shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { HATCH, Svg, hatch } from "../parts/Diagram";
import { Icon } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, clamp01, firstAt, localBeats, mixColor, type Ctx } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type RingServer = { id: string; label: string; at: number };
export type RingKey = { id: string; label?: string; at: number };
export type RingStage = { servers?: RingServer[]; keys?: RingKey[] };

const c = tokens.color;
const S = tokens.node.shadow;
const SR = 62; // server radius
const KR = 22; // key radius
const MOVE = 22;

export const Ring = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><RingBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

const norm = (a: number) => ((a % 360) + 360) % 360;
/** Clockwise distance in degrees from a to b (0 ≤ d < 360). */
const cw = (a: number, b: number) => norm(b - a);

export const RingBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as RingStage;
  const servers = (stage.servers ?? []).slice(0, 5);
  const keys = (stage.keys ?? []).slice(0, 8);
  const beats = localBeats(ctx.ts);
  const cx = box.w / 2;
  const cy = box.h / 2;
  const R = Math.min(box.w / 2 - SR - 50, box.h / 2 - SR - 70, 400);
  const pt = (deg: number, r: number) => ({ x: cx + Math.sin((deg * Math.PI) / 180) * r, y: cy - Math.cos((deg * Math.PI) / 180) * r });

  const sAt = new Map(servers.map((s, i) => [s.id, firstAt(beats, ["reveal", "appear"], s.id) ?? 8 + i * 12]));
  const downAt = new Map(servers.flatMap((s) => {
    const b = beats.find((x) => x.do === "state" && x.args?.to === "down" && x.targets.includes(s.id));
    return b ? [[s.id, b.at] as const] : [];
  }));
  const kAt = new Map(keys.map((k, i) => [k.id, firstAt(beats, ["reveal", "appear"], k.id) ?? 20 + servers.length * 12 + i * 12]));
  const stepAt = new Map(keys.map((k) => [k.id, firstAt(beats, ["step"], k.id) ?? (kAt.get(k.id) ?? 0) + 18]));

  const aliveAt = (t: number) => servers.filter((s) => (sAt.get(s.id) ?? 0) <= t && !(downAt.has(s.id) && (downAt.get(s.id) as number) <= t));
  const ownerAt = (k: RingKey, t: number) => {
    const alive = aliveAt(t);
    if (!alive.length) return undefined;
    return [...alive].sort((a, b) => cw(k.at, a.at) - cw(k.at, b.at))[0];
  };

  // each key: [{ t, owner }] re-home events, then its angle over time and the rank on its server
  const timeline = (k: RingKey) => {
    const evs: { t: number; owner: RingServer }[] = [];
    const t0 = stepAt.get(k.id)!;
    let cur = ownerAt(k, t0);
    if (cur) evs.push({ t: t0, owner: cur });
    for (const t of [...downAt.values()].sort((a, b) => a - b)) {
      if (t < t0) { cur = ownerAt(k, t0); continue; }
      const next = ownerAt(k, t);
      if (next && next.id !== cur?.id) { evs.push({ t, owner: next }); cur = next; }
    }
    return evs;
  };
  const place = (k: RingKey) => {
    const evs = timeline(k);
    const landed = f >= (kAt.get(k.id) ?? 0);
    if (!landed) return null;
    let ang = k.at;
    let r = R;
    let own: RingServer | undefined;
    let fromAng = k.at;
    let fromR = R;
    for (const e of evs) {
      if (f < e.t) break;
      const p = tween(f, e.t, MOVE, ease.std);
      const dist = cw(fromAng, e.owner.at);
      ang = fromAng + dist * p;
      const rank = rankOf(k, e.owner, e.t);
      r = fromR + (R - 62 - 40 * rank - fromR) * p;
      if (p >= 1) { fromAng = e.owner.at; fromR = R - 62 - 40 * rank; }
      own = e.owner;
    }
    return { ang, r, own, moving: evs.some((e) => f >= e.t && f < e.t + MOVE) };
  };
  // how many earlier keys already sit on this owner at time t (so they stack inward, not on top of each other)
  function rankOf(k: RingKey, owner: RingServer, t: number) {
    let n = 0;
    for (const o of keys) {
      if (o.id === k.id) break;
      const oe = timeline(o).filter((e) => e.t <= t).at(-1);
      if (oe?.owner.id === owner.id) n++;
    }
    return n;
  }

  const ringIn = tween(f, 0, 24, ease.std);
  const circ = 2 * Math.PI * R;

  return (
    <>
      <Svg>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={c.line} strokeWidth={14} />
        <circle cx={cx} cy={cy} r={R} fill="none" stroke={c.cream3} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${circ * ringIn} ${circ}`} transform={`rotate(-90 ${cx} ${cy})`} />
      </Svg>
      <div style={{ position: "absolute", left: cx - 90, width: 180, top: cy - 40, textAlign: "center", font: `700 30px/1.2 ${fonts.mono}`, color: c.cream3, opacity: ringIn }}>hash ring</div>
      {servers.map((s) => {
        const p = pt(s.at, R);
        const k = pop(f, sAt.get(s.id)!);
        const dn = downAt.get(s.id);
        const dead = dn !== undefined && f >= dn;
        const dK = dead ? tween(f, dn as number, 12) : 0;
        const hi = beats.some((b) => b.do === "highlight" && b.targets.includes(s.id) && f >= b.at);
        const shakeAt = firstAt(beats, ["shake"], s.id);
        const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
        const stroke = mixColor(hi ? c.orange : c.cream, c.down, dK);
        const lab = { x: Math.min(box.w - 120, Math.max(120, p.x)), y: p.y + SR + 30 };
        return (
          <div key={s.id}>
            {k <= 0 ? <div style={{ position: "absolute", left: p.x - SR, top: p.y - SR, width: 2 * SR, height: 2 * SR, borderRadius: "50%", border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} /> : (
              <div style={{ position: "absolute", left: p.x - SR, top: p.y - SR, width: 2 * SR, height: 2 * SR, transform: `translateX(${sh}px) scale(${0.4 + 0.6 * k})`, opacity: Math.min(1, k * 1.6) * (1 - 0.35 * dK) }}>
                <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset * 0.8}px, ${S.offset * 0.8}px)`, borderRadius: "50%", background: hatch(hi && !dead ? HATCH.orange : HATCH.cream) }} />
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c.surface, border: `${tokens.node.stroke}px solid ${stroke}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="server" size={SR * 1.0} color={mixColor(hi ? c.ember : c.cream, c.down, dK)} />
                </div>
                {dead && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", font: `800 90px ${fonts.display}`, color: c.down, opacity: dK }}>✕</div>}
              </div>
            )}
            <div style={{ position: "absolute", left: lab.x - 120, width: 240, top: lab.y - 12, textAlign: "center", font: `700 ${tokens.type.label.size}px/1.1 ${fonts.mono}`, color: dead ? c.cream3 : c.cream2, opacity: Math.min(1, k * 1.5) }}>{s.label}</div>
          </div>
        );
      })}
      {keys.map((k) => {
        const pl = place(k);
        if (!pl) return null;
        const p = pt(pl.ang, pl.r);
        const born = pop(f, kAt.get(k.id)!);
        const moving = pl.moving;
        return (
          <div key={k.id} style={{ position: "absolute", left: p.x - KR, top: p.y - KR, width: 2 * KR, height: 2 * KR, borderRadius: "50%", background: moving || !pl.own ? c.ember : c.cream, boxShadow: moving ? "0 0 0 8px rgba(232,105,63,.25)" : undefined, transform: `scale(${born})` }}>
            {k.label && <div style={{ position: "absolute", left: 2 * KR + 8, top: "50%", transform: "translateY(-50%)", whiteSpace: "nowrap", font: `700 26px ${fonts.mono}`, color: c.cream2, background: c.charcoal, padding: "0 6px", borderRadius: 6 }}>{k.label}</div>}
          </div>
        );
      })}
    </>
  );
};
