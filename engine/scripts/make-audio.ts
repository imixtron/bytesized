// Generates the placeholder music loop procedurally, so it's original and royalty-free by
// construction (sound effects now come from ElevenLabs via `npm run audio`). Replace them any time with licensed files of the same names.
//   npm run make-audio
// Writes: assets/music/placeholder-playful-loop.wav
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const SR = 44100;

// ---------------------------------------------------------------- helpers
function wav(path: string, L: Float32Array, R: Float32Array = L) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
}

let seed = 1234567;
const noise = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x3fffffff) - 1;
const midi = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const tri = (ph: number) => 1 - 4 * Math.abs(((ph % 1) + 1) % 1 - 0.5);

function normalize(bufs: Float32Array[], peak = 0.7) {
  let m = 0;
  for (const b of bufs) for (const v of b) m = Math.max(m, Math.abs(v));
  for (const b of bufs) for (let i = 0; i < b.length; i++) b[i] = (b[i] / (m || 1)) * peak;
}

/** Adds a sound into a looping buffer (tails wrap around, so the loop is seamless). */
function addLoop(out: Float32Array, start: number, len: number, fn: (t: number) => number, gain: number) {
  const s0 = Math.round(start * SR);
  const n = Math.round(len * SR);
  for (let i = 0; i < n; i++) out[(s0 + i) % out.length] += fn(i / SR) * gain;
}

// ---------------------------------------------------------------- music: playful 120bpm loop, C–Am–F–G
function music() {
  const bpm = 120;
  const beat = 60 / bpm;
  const bars = 8;
  const len = bars * 4 * beat;
  const L = new Float32Array(Math.round(len * SR));
  const R = new Float32Array(L.length);
  const M = new Float32Array(L.length); // centred parts: drums and bass
  const chords = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
  const roots = [48, 45, 41, 43];

  for (let bar = 0; bar < bars; bar++) {
    const ch = chords[bar % 4];
    const root = roots[bar % 4];
    const t0 = bar * 4 * beat;

    // kick on 1 and 3, plus a bounce on the "and" of 4
    for (const b of [0, 2, 3.5]) {
      addLoop(M, t0 + b * beat, 0.25, (t) => Math.sin(2 * Math.PI * (50 * t + (100 / 18) * (1 - Math.exp(-18 * t)))) * Math.exp(-t * 16), 0.55);
    }
    // clap on 2 and 4 (two noise flams)
    for (const b of [1, 3]) {
      let lp = 0;
      addLoop(M, t0 + b * beat, 0.18, (t) => {
        const n = noise();
        lp += 0.35 * (n - lp);
        const flam = t < 0.012 ? 1 : Math.exp(-(t - 0.012) * 28);
        return (n - lp) * flam;
      }, 0.22);
    }
    // closed hats on the off-8ths
    for (let e = 0; e < 8; e++) {
      if (e % 2 === 0) continue;
      let lp = 0;
      addLoop(M, t0 + e * (beat / 2), 0.06, (t) => {
        const n = noise();
        lp += 0.6 * (n - lp);
        return (n - lp) * Math.exp(-t * 90);
      }, 0.09);
    }
    // bass: 8ths, root with an octave hop
    for (let e = 0; e < 8; e++) {
      const note = root + (e % 4 === 3 ? 12 : 0);
      let lp = 0;
      addLoop(M, t0 + e * (beat / 2), beat / 2, (t) => {
        const sq = Math.sign(Math.sin(2 * Math.PI * midi(note) * t));
        lp += 0.08 * (sq - lp);
        return lp * Math.exp(-t * 5) * Math.min(1, t * 400);
      }, 0.32);
    }
    // plucky arpeggio on 16ths, alternating left/right
    const pattern = [0, 1, 2, 1, 2, 0, 1, 2];
    for (let s = 0; s < 16; s++) {
      const note = ch[pattern[s % 8]] + 12;
      const pan = s % 2 ? 0.7 : 0.3;
      const fn = (t: number) => (tri(midi(note) * t) * 0.8 + Math.sin(2 * Math.PI * midi(note) * 2 * t) * 0.2) * Math.exp(-t * 14) * Math.min(1, t * 300);
      addLoop(L, t0 + s * (beat / 4), 0.3, fn, 0.1 * (1 - pan) * 2);
      addLoop(R, t0 + s * (beat / 4), 0.3, fn, 0.1 * pan * 2);
    }
  }
  // mix centred parts into both sides, then soft-clip
  for (let i = 0; i < L.length; i++) {
    L[i] = Math.tanh((M[i] + L[i]) * 1.2);
    R[i] = Math.tanh((M[i] + R[i]) * 1.2);
  }
  normalize([L, R], 0.7);
  return [L, R] as const;
}

const [mL, mR] = music();
wav(join(ROOT, "assets/music/placeholder-playful-loop.wav"), mL, mR);
console.log("wrote assets/music/placeholder-playful-loop.wav");
