// Per-scene motion style (design language v1.7, proposed): how nodes enter, how the camera behaves,
// and how scenes hand over to each other. Templates stay unaware: Node reads the context.
import { createContext, useContext, type CSSProperties } from "react";
import { WIDTH, tokens } from "../theme/tokens";

export const ENTER_STYLES = tokens.motion.enter.styles as readonly string[];
export const CAMERA_STYLES = tokens.motion.camera.styles as readonly string[];
export type EnterStyle = "pop" | "drop" | "snap" | "stamp" | "wipe";
export type CameraStyle = "still" | "drift" | "rack";
/** Transitions that keep the outgoing scene under the incoming one for a few frames. */
export const OVERLAP_TRANSITIONS = ["whip", "flip", "stack", "dive", "iris"] as const;
export type Transition = "cut" | "push" | (typeof OVERLAP_TRANSITIONS)[number];
export const OVERLAP = tokens.motion.transitionOverlap.frames;

export type SceneStyle = { enter: EnterStyle; camera: CameraStyle };
export const SceneStyleContext = createContext<SceneStyle>({ enter: "pop", camera: "still" });
/** The entrance style of the scene being rendered right now. SceneBody sets it before its children render
 *  (React renders them straight after, in the same pass), so every `pop()` in a scene gets that style's
 *  timing without each template passing it down. Reset after the scenes so captions and the sting stay on pop. */
export const ambient: { enter: EnterStyle } = { enter: "pop" };
export const useSceneStyle = () => useContext(SceneStyleContext);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Entrance of a node: `k` is the 0→1 spring (it overshoots slightly), `x` its centre, `w` its width. */
export function enterLook(style: EnterStyle, k: number, x: number, w: number): { style: CSSProperties; ring: number } {
  const dir = x < WIDTH / 2 ? -1 : 1;
  switch (style) {
    case "drop":
      return { style: { transform: `translateY(${(k - 1) * 280}px)`, opacity: Math.min(1, k * 4) }, ring: 0 };
    case "snap":
      return { style: { transform: `translateX(${dir * (1 - k) * 360}px) rotate(${dir * (1 - k) * -9}deg)`, opacity: Math.min(1, k * 3) }, ring: 0 };
    case "stamp":
      return { style: { transform: `scale(${1 + (1 - k) * 0.9})`, opacity: Math.min(1, k * 5) }, ring: clamp01((k - 0.55) / 0.45) * (k > 0.55 ? 1 : 0) };
    case "wipe": {
      const kc = clamp01(k);
      // no clip once in, so side labels (Decision, Sequence notes) aren't cut at w + 80
      return { style: { transform: `translateX(${(1 - kc) * -24}px)`, clipPath: kc >= 1 ? undefined : `inset(-200px ${(1 - kc) * (w + 80) - 80}px -200px -200px)` }, ring: 0 };
    }
    default:
      return { style: { transform: `scale(${0.4 + 0.6 * k})`, opacity: Math.min(1, k * 1.6) }, ring: 0 };
  }
}

/** Where a scene sits during a transition, both coming in (`tin`, 0→1) and going out (`tout`, 0→1). */
export function transitionLook(inKind: Transition, tin: number, outKind: Transition | undefined, tout: number): CSSProperties {
  const t: string[] = [];
  let opacity = 1;
  let filter = "";
  if (outKind && tout > 0) {
    if (outKind === "whip") { t.push(`translateX(${-tout * 1080}px)`); filter = `blur(${tout * 16}px)`; }
    if (outKind === "stack") { t.push(`scale(${1 - 0.1 * tout})`); opacity = 1 - 0.55 * tout; }
    if (outKind === "dive") { t.push(`scale(${1 + 0.9 * tout})`); opacity = 1 - tout; filter = `blur(${tout * 8}px)`; }
    if (outKind === "iris") { t.push(`scale(${1 - 0.06 * tout})`); opacity = 1 - 0.5 * tout; }
    if (outKind === "flip") { t.push(`perspective(1800px) rotateY(${clamp01(tout * 2) * 90}deg)`); opacity = tout > 0.5 ? 0 : 1; }
  } else if (tin < 1) {
    if (inKind === "whip") { t.push(`translateX(${(1 - tin) * 1080}px)`); filter = `blur(${(1 - tin) * 16}px)`; }
    if (inKind === "stack") t.push(`translateY(${(1 - tin) * 1920}px)`);
    if (inKind === "dive") { t.push(`scale(${0.75 + 0.25 * tin})`); opacity = tin; }
    if (inKind === "iris") return { opacity: 1, clipPath: `circle(${tin * 1400}px at 50% 46%)` };
    if (inKind === "flip") { const h = clamp01((tin - 0.5) * 2); t.push(`perspective(1800px) rotateY(${(1 - h) * -90}deg)`); opacity = tin < 0.5 ? 0 : 1; }
  }
  return { transform: t.join(" ") || undefined, opacity, filter: filter || undefined, backfaceVisibility: "hidden" };
}
