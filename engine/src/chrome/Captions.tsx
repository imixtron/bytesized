// Captions from the voiceover (design language §3): 3–5 word chunks that break at punctuation,
// the current word in ember, spoken words cream, upcoming words cream2.
import { useCurrentFrame } from "remotion";
import type { TimedScene, TimedWord } from "../timing/timeline";
import { pop } from "../motion/motion";
import { fonts } from "../theme/fonts";
import { tokens } from "../theme/tokens";

const c = tokens.color;
const MAX = tokens.type.caption.chunkWords[1];

export type Chunk = { words: TimedWord[]; start: number; end: number };

/** Splits a scene's words into caption chunks, each shown until the next begins. */
export function chunkWords(scene: TimedScene): Chunk[] {
  const chunks: TimedWord[][] = [];
  let cur: TimedWord[] = [];
  for (const w of scene.words) {
    cur.push(w);
    const hard = /[.?!:]$/.test(w.text);
    const soft = /[,;]$/.test(w.text) && cur.length >= 3;
    if (hard || soft || cur.length === MAX) {
      chunks.push(cur);
      cur = [];
    }
  }
  if (cur.length) chunks.push(cur);
  // never flash a lone word: fold it into the previous chunk (or the next one if it's first)
  for (let i = 0; i < chunks.length; i++) {
    if (chunks[i].length !== 1 || chunks.length === 1) continue;
    if (i > 0) chunks[i - 1].push(...chunks[i]);
    else chunks[i + 1].unshift(...chunks[i]);
    chunks.splice(i--, 1);
  }
  const sceneEnd = scene.start + scene.duration;
  return chunks.map((words, i) => ({ words, start: words[0].start, end: chunks[i + 1]?.[0].start ?? sceneEnd }));
}

export const Captions = ({ scene }: { scene: TimedScene }) => {
  const frame = useCurrentFrame();
  const chunk = chunkWords(scene).find((ch) => frame >= ch.start && frame < ch.end);
  if (!chunk) return null;
  const z = tokens.layout.zones.caption;
  const { safe } = tokens.layout;
  const s = 0.94 + 0.06 * pop(frame, chunk.start);
  return (
    <div
      style={{
        position: "absolute", left: safe.left, top: z.y[0], width: safe.right - safe.left, height: z.y[1] - z.y[0],
        display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", textWrap: "balance",
        font: `800 ${tokens.type.caption.size}px/${tokens.type.caption.lineHeight} ${fonts.text}`, transform: `scale(${s})`,
      }}
    >
      <div>
        {chunk.words.map((w, i) => (
          <span key={i} style={{ color: frame >= w.start && frame < w.end ? c.ember : frame >= w.end ? c.cream : c.cream2 }}>
            {w.text}{i < chunk.words.length - 1 ? " " : ""}
          </span>
        ))}
      </div>
    </div>
  );
};
