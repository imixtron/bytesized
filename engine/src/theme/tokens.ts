// Design language v1.1 — the single source of truth lives in brand/design-language/tokens.json.
// Never hard-code a colour, size or timing in a component; read it from here.
import raw from "../../../brand/design-language/tokens.json";

export const tokens = raw;
export type Tokens = typeof raw;
export type ColorName = keyof Tokens["color"];

export const color = (name: ColorName) => tokens.color[name];
export const { width: WIDTH, height: HEIGHT, fps: FPS } = tokens.canvas;

/** Convert milliseconds to frames at the canvas fps. */
export const msToFrames = (ms: number) => Math.round((ms / 1000) * FPS);
