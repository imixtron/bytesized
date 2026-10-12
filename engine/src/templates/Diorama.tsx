// Diorama template (v1.11 proposal): a top-down mini-world for analogies. Rooms (zones) on a floor, and
// small characters that walk between them. A restaurant is a client / server system you can watch.
// stage: { zones: [{ id, label, x, y, w, h, icon? }] (2–5; x, y, w, h are fractions 0–1 of the stage),
//          actors: [{ id, icon, label?, at: zone id }] (1–4) }
// Verbs: reveal / appear (a zone or an actor), step (`args.to: zone id`: the actor walks there),
// highlight (focus a zone or actor), shake.
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ease, pop, tween } from "../motion/motion";
import { HATCH, hatch } from "../parts/Diagram";
import { Icon, type IconName } from "../parts/icons";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, focusLevels, localBeats, mixColor, type Ctx, type FocusEvent } from "./common";
import { Panel, stagePanel, type Box } from "./panel";

export type Zone = { id: string; label: string; x: number; y: number; w: number; h: number; icon?: IconName };
export type DioActor = { id: string; icon: IconName; label?: string; at: string };
export type DioramaStage = { zones?: Zone[]; actors?: DioActor[] };

const c = tokens.color;
const S = tokens.node.shadow;
const R = 52;
const WALK = 26;

export const Diorama = ({ ctx }: { ctx: Ctx }) => {
  const box = stagePanel(ctx.ts.scene);
  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      <Panel box={box}><DioramaBody ctx={ctx} box={box} /></Panel>
    </AbsoluteFill>
  );
};

export const DioramaBody = ({ ctx, box }: { ctx: Ctx; box: Pick<Box, "w" | "h"> }) => {
  const f = useCurrentFrame();
  const stage = ctx.ts.scene.stage as DioramaStage;
  const zones = (stage.zones ?? []).slice(0, 5);
  const actors = (stage.actors ?? []).slice(0, 4);
  const beats = localBeats(ctx.ts);
  const W = box.w - S.offset;
  const H = box.h - S.offset;
  const rect = (z: Zone) => ({ x: z.x * W, y: z.y * H, w: z.w * W, h: z.h * H });
  const zAt = new Map(zones.map((z, i) => [z.id, firstAt(beats, ["reveal", "appear"], z.id) ?? i * 8]));
  const aAt = new Map(actors.map((a, i) => [a.id, firstAt(beats, ["reveal", "appear"], a.id) ?? zones.length * 8 + 6 + i * 8]));
  const events: FocusEvent[] = beats.filter((b) => b.do === "highlight").flatMap((b) => { const id = b.targets.find((x) => zones.some((z) => z.id === x) || actors.some((a) => a.id === x)); return id ? [{ at: b.at, id, explicit: true }] : []; }).sort((a, b) => a.at - b.at);

  // spot for actor i in zone z (spread so two actors in one room don't overlap)
  const spot = (zoneId: string, actorId: string) => {
    const z = zones.find((q) => q.id === zoneId);
    if (!z) return { x: W / 2, y: H / 2 };
    const r = rect(z);
    const idx = actors.findIndex((a) => a.id === actorId);
    const mates = actors.filter((a) => a.id !== actorId);
    const off = (idx - (actors.length - 1) / 2) * (R * 2.5); // spread by actor, so two in one room never overlap
    return { x: r.x + r.w / 2 + (mates.length ? off : 0), y: r.y + r.h / 2 + R * 0.35 };
  };
  const where = (a: DioActor) => {
    let from = spot(a.at, a.id);
    let to = from;
    let t0 = -1e9;
    for (const b of beats.filter((x) => x.do === "step" && x.targets.includes(a.id))) {
      if (f < b.at) break;
      from = to;
      to = spot(String(b.args?.to ?? a.at), a.id);
      t0 = b.at;
    }
    const k = tween(f, t0, WALK, ease.std);
    const bob = k > 0 && k < 1 ? Math.sin(k * Math.PI * 6) * 6 : 0;
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k - Math.abs(bob), walking: k > 0 && k < 1 };
  };

  return (
    <>
      {/* a faint floor grid, so the room reads as a place */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, borderRadius: 36, backgroundImage: `radial-gradient(${c.line} 3px, transparent 3.5px)`, backgroundSize: "44px 44px", opacity: 0.55 }} />
      {zones.map((z) => {
        const r = rect(z);
        const k = pop(f, zAt.get(z.id)!);
        const lv = focusLevels(events, z.id, f);
        if (k <= 0) return <div key={z.id} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: 30, border: `4px dashed ${c.line}`, opacity: tokens.motion.ghost.opacity }} />;
        const stroke = mixColor(mixColor(c.cream, c.orange, lv.on), c.cream3, lv.dim);
        return (
          <div key={z.id} style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, transform: `scale(${0.85 + 0.15 * k})`, opacity: Math.min(1, k * 1.5) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset * 0.7}px, ${S.offset * 0.7}px)`, borderRadius: 30, background: hatch(lv.on > 0.5 ? HATCH.orange : lv.dim > 0.5 ? HATCH.dim : HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: 30, background: c.surface, border: `${tokens.node.stroke}px solid ${stroke}` }} />
            {z.icon && <div style={{ position: "absolute", right: 22, top: 18, opacity: 0.35 }}><Icon name={z.icon} size={Math.min(96, r.h * 0.4)} color={stroke} /></div>}
            <div style={{ position: "absolute", left: 24, top: 16, font: `800 36px ${fonts.display}`, color: mixColor(c.cream, c.cream3, lv.dim) }}>{z.label}</div>
          </div>
        );
      })}
      {actors.map((a) => {
        const k = pop(f, aAt.get(a.id)!);
        const p = where(a);
        const lv = focusLevels(events, a.id, f);
        const shakeAt = firstAt(beats, ["shake"], a.id);
        const sh = shakeAt !== undefined && f >= shakeAt && f < shakeAt + tokens.motion.shake.frames ? Math.sin(((f - shakeAt) / tokens.motion.shake.frames) * Math.PI * 6) * tokens.motion.shake.amplitude : 0;
        if (k <= 0) return null;
        return (
          <div key={a.id} style={{ position: "absolute", left: p.x - R + sh, top: p.y - R, width: 2 * R, height: 2 * R, transform: `scale(${k})`, opacity: Math.min(1, k * 1.6) * (1 - 0.5 * lv.dim) }}>
            <div style={{ position: "absolute", inset: 0, transform: `translate(${S.offset * 0.7}px, ${S.offset * 0.7}px)`, borderRadius: "50%", background: hatch(HATCH.cream) }} />
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: c.cream, border: `${tokens.node.stroke}px solid ${lv.on > 0.5 ? c.orange : c.cream}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={a.icon} size={R * 1.1} color={c.charcoal} />
            </div>
            {a.label && <div style={{ position: "absolute", left: -40, width: 2 * R + 80, top: 2 * R + 8, textAlign: "center", font: `700 28px ${fonts.mono}`, color: c.cream, background: "rgba(34,34,34,.78)", borderRadius: 8 }}>{a.label}</div>}
          </div>
        );
      })}
    </>
  );
};
