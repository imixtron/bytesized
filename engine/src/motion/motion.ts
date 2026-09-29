// Motion tokens (design language §6) as Remotion helpers.
import { Easing, interpolate, spring } from "remotion";
import { FPS, tokens } from "../theme/tokens";

const m = tokens.motion;
const bez = (b: number[]) => Easing.bezier(b[0], b[1], b[2], b[3]);

export const ease = { std: bez(m.standard.easing), exit: bez(m.exit.easing), pop: bez(m.pop.easing) };

/** 0→1 springy entrance starting at `from` (frames), with ~8% overshoot. */
export const pop = (frame: number, from = 0) =>
  spring({ frame: frame - from, fps: FPS, config: m.pop.spring, durationInFrames: m.pop.frames });

/** 0→1 over `frames` using an easing, clamped. */
export const tween = (frame: number, from: number, frames: number, easing = ease.std) =>
  interpolate(frame, [from, from + frames], [0, 1], { easing, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
