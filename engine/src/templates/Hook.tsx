// Hook template: one big visual (usually a hero or brand node), an optional crowd flooding it,
// and an optional counter. Verbs: appear, flood, count, highlight, state, shake.
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { NodeSpec } from "../episode/schema";
import { pop } from "../motion/motion";
import { Counter, Crowd } from "../parts/Crowd";
import { Node } from "../parts/Node";
import { tokens } from "../theme/tokens";
import { Headline, firstAt, localBeats, logoPath, stageBox, stateAt, stateEvents, type Ctx } from "./common";

type HookStage = {
  nodes?: NodeSpec[];
  crowd?: { id: string; count?: number; target: string };
  counter?: { id: string; from?: number; to: number; label?: string };
};

const COUNT_FRAMES = 36;

export const Hook = ({ ctx }: { ctx: Ctx }) => {
  const f = useCurrentFrame();
  const { scene } = ctx.ts;
  const stage = scene.stage as HookStage;
  const beats = localBeats(ctx.ts);
  const { safe } = tokens.layout;
  const cx = (safe.left + safe.right) / 2;
  // node + counter form one block, centred in the stage
  const cy = stageBox(scene).center - (stage.counter ? 50 : 0);
  const nodes = stage.nodes ?? [];

  return (
    <AbsoluteFill>
      <Headline ctx={ctx} />
      {stage.crowd && (
        <Crowd
          target={{ x: cx, y: cy }}
          frame={f - (firstAt(beats, ["flood"], stage.crowd.id) ?? 0)}
          count={stage.crowd.count ?? 40}
          radius={[300, 480]}
          seed={`${scene.id}-crowd`}
        />
      )}
      {nodes.map((n, i) => {
        const x = nodes.length === 1 ? cx : safe.left + ((i + 0.5) * (safe.right - safe.left)) / nodes.length;
        const appear = firstAt(beats, ["appear"], n.id) ?? i * 3;
        const hi = firstAt(beats, ["highlight"], n.id);
        const pulse = hi !== undefined && f >= hi ? Math.sin(Math.min(1, (f - hi) / 12) * Math.PI) * 0.12 : 0;
        const s = stateAt(stateEvents(beats, n.id, n.family), "idle", f);
        const shakeAt = firstAt(beats, ["shake"], n.id);
        const size = n.type === "phone" ? 200 : 240;
        return (
          <Node
            key={n.id} type={n.type} family={n.family} x={x} y={cy} w={size} h={n.type === "phone" ? 260 : size}
            logo={n.type === "brand" && n.logo ? logoPath(n.logo) : undefined} label={n.label}
            enter={pop(f, appear) + pulse} state={s.state} from={s.from} t={s.t} badgeIn={pop(f, s.since)}
            shake={shakeAt !== undefined ? Math.max(0, Math.min(1, (f - shakeAt) / tokens.motion.shake.frames)) : 0}
          />
        );
      })}
      {stage.counter && (() => {
        const at = firstAt(beats, ["count"], stage.counter.id) ?? 0;
        const k = interpolate(f, [at, at + COUNT_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
        const from = stage.counter.from ?? 0;
        // the counter only appears when it starts counting (no "0 watching" sitting there)
        const show = pop(f, at);
        return (
          <div style={{ opacity: Math.min(1, show * 1.5), transform: `translateY(${(1 - show) * 20}px)` }}>
            <Counter x={cx} y={cy + 190} value={from + (stage.counter.to - from) * k} label={stage.counter.label} />
          </div>
        );
      })()}
    </AbsoluteFill>
  );
};
