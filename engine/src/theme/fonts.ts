// Loads the four design-language fonts (all free, Google Fonts). Families match tokens.font.
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadYellowtail } from "@remotion/google-fonts/Yellowtail";

const display = loadUnbounded("normal", { weights: ["600", "800"], subsets: ["latin"] });
const text = loadInter("normal", { weights: ["600", "700", "800"], subsets: ["latin"] });
const mono = loadMono("normal", { weights: ["700"], subsets: ["latin"] });
const script = loadYellowtail("normal", { weights: ["400"], subsets: ["latin"] });

export const fonts = {
  display: display.fontFamily,
  text: text.fontFamily,
  mono: mono.fontFamily,
  script: script.fontFamily,
};

// loadFont() holds the render (delayRender) until each font file is ready, so frames never use a fallback font.
