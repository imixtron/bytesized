// v1.5 review gallery: each wave-1 diagram template and variant, drawn by the real
// template code from a demo scene (with chrome and captions, as in an episode), plus a contact
// sheet that freezes every demo and tiles it. Not used in episodes.
import { AbsoluteFill, Freeze } from "remotion";
import { Captions } from "../../chrome/Captions";
import { Chrome } from "../../chrome/Chrome";
import type { Episode, Scene } from "../../episode/schema";
import { TEMPLATE_COMPONENTS } from "../../templates";
import type { Ctx } from "../../templates/common";
import { tokens } from "../../theme/tokens";
import type { TimedBeat, TimedScene } from "../../timing/timeline";

const c = tokens.color;

type DemoBeat = { at: number; do: TimedBeat["do"]; target?: string | string[]; args?: Record<string, unknown> };
type Demo = { scene: Omit<Scene, "beats" | "transition" | "part"> & { part?: Scene["part"] }; beats: DemoBeat[]; frames: number; still: number };

export const DEMOS: Record<string, Demo> = {
  "sequence-handshake": {
    frames: 210, still: 200,
    scene: {
      id: "handshake", template: "Sequence", vo: "Before any data moves, the client and server shake hands. If a SYN gets lost, it simply tries again.",
      headline: { text: "The three-way handshake", accent: "handshake" },
      stage: {
        actors: [{ id: "client", type: "phone", family: "solid", label: "client" }, { id: "server", type: "server", family: "outlined", label: "server" }],
        steps: [
          { id: "syn1", from: "client", to: "server", label: "SYN", lost: true },
          { id: "syn2", from: "client", to: "server", label: "SYN (retry)" },
          { id: "synack", from: "server", to: "client", label: "SYN-ACK", kind: "response" },
          { id: "ack", from: "client", to: "server", label: "ACK" },
          { id: "get", from: "client", to: "server", label: "GET /" },
          { id: "ok", from: "server", to: "client", label: "200 OK", kind: "response" },
        ],
      },
    },
    beats: [{ at: 20, do: "step", target: "syn1" }, { at: 55, do: "step", target: "syn2" }, { at: 85, do: "step", target: "synack" }, { at: 115, do: "step", target: "ack" }, { at: 145, do: "step", target: "get" }, { at: 172, do: "step", target: "ok" }],
  },
  "sequence-3lane": {
    frames: 200, still: 190,
    scene: {
      id: "login", template: "Sequence", vo: "You log in, the app asks the auth server, which checks your password and hands back a token.",
      headline: { text: "Who are you?", accent: "you" },
      stage: {
        actors: [{ id: "you", type: "phone", family: "solid", label: "you" }, { id: "app", type: "server", family: "outlined", label: "app" }, { id: "auth", type: "service", family: "hero", icon: "lock", label: "auth" }],
        steps: [
          { id: "login", from: "you", to: "app", label: "log in" },
          { id: "ask", from: "app", to: "auth", label: "check" },
          { id: "verify", at: "auth", note: "compare the hash" },
          { id: "token", from: "auth", to: "app", label: "token", kind: "response" },
          { id: "welcome", from: "app", to: "you", label: "welcome", kind: "response" },
        ],
      },
    },
    beats: [{ at: 25, do: "step", target: "login" }, { at: 60, do: "step", target: "ask" }, { at: 95, do: "step", target: "verify" }, { at: 125, do: "step", target: "token" }, { at: 155, do: "step", target: "welcome" }],
  },
  "split-compare": {
    frames: 210, still: 200,
    scene: {
      id: "sync-async", template: "Split", vo: "Sync makes the client wait for the copy. Async replies first and copies later.",
      headline: { text: "Sync vs async", accent: "async" },
      stage: {
        variant: "compare",
        before: { id: "sync", title: "sync", note: "client waits for the copy", nodes: [{ id: "s-client", type: "phone", family: "solid", label: "client" }, { id: "s-primary", type: "db", family: "outlined", label: "primary" }, { id: "s-replica", type: "db", family: "outlined", label: "replica" }] },
        after: { id: "async", title: "async", note: "replies first, copies later", nodes: [{ id: "a-client", type: "phone", family: "solid", label: "client" }, { id: "a-primary", type: "db", family: "outlined", label: "primary" }, { id: "a-replica", type: "db", family: "outlined", label: "replica" }] },
      },
    },
    beats: [{ at: 0, do: "appear", target: "sync" }, { at: 25, do: "send", target: "sync", args: { kind: "roundtrip" } }, { at: 80, do: "appear", target: "async" }, { at: 105, do: "send", target: "async", args: { to: "a-primary", kind: "roundtrip" } }, { at: 135, do: "send", target: "async" }, { at: 175, do: "highlight", target: "async" }],
  },
  "split-race": {
    frames: 180, still: 170,
    scene: {
      id: "cache-race", template: "Split", vo: "Same question, two paths. The cache answers in two milliseconds; the database takes a hundred and twenty.",
      headline: { text: "Why caches win", accent: "caches" },
      stage: {
        variant: "race",
        before: { id: "hit", title: "with cache", result: "2 ms", slow: 1, nodes: [{ id: "h-app", type: "server", family: "outlined", label: "app" }, { id: "h-cache", type: "cache", family: "hero", label: "redis" }] },
        after: { id: "miss", title: "no cache", result: "120 ms", slow: 3.2, nodes: [{ id: "m-app", type: "server", family: "outlined", label: "app" }, { id: "m-db", type: "db", family: "outlined", label: "postgres" }] },
      },
    },
    beats: [{ at: 35, do: "race" }, { at: 140, do: "highlight", target: "hit" }],
  },
  "decision-validation": {
    frames: 200, still: 192,
    scene: {
      id: "validate", template: "Decision", vo: "Every record gets checked. Right shape? Makes sense? Accepted. Fail either, and it waits in quarantine.",
      headline: { text: "Is this row valid?", accent: "valid" },
      stage: {
        start: { id: "rec", type: "storage", family: "solid", icon: "file", label: "record" },
        checks: [
          { id: "shape", q: "Right shape?", no: { id: "quar", label: "quarantine", tone: "down", retry: true } },
          { id: "sense", q: "Makes sense?", no: "quar" },
        ],
        yes: { id: "ok", label: "accepted", tone: "ok" },
      },
    },
    beats: [{ at: 40, do: "branch", target: "shape", args: { to: "yes" } }, { at: 72, do: "branch", target: "sense", args: { to: "yes" } }, { at: 125, do: "branch", target: "shape", args: { to: "no" } }],
  },
  "decision-ratelimit": {
    frames: 190, still: 178,
    scene: {
      id: "limiter", template: "Decision", vo: "Each request asks one question. Under the limit? Go through. Over it? Slow down.",
      stage: {
        start: { id: "req", type: "user", family: "solid", label: "request" },
        checks: [{ id: "limit", q: "Under the limit?", no: { id: "r429", label: "429 slow down", tone: "down" } }],
        yes: { id: "srv", type: "server", label: "server" },
      },
    },
    beats: [{ at: 30, do: "branch", target: "limit", args: { to: "yes" } }, { at: 70, do: "branch", target: "limit", args: { to: "yes" } }, { at: 115, do: "branch", target: "limit", args: { to: "no" } }],
  },
  "tiers-stack": {
    frames: 200, still: 190,
    scene: {
      id: "temps", template: "Tiers", vo: "Hot data is read constantly, warm now and then, cold barely at all. Faster costs more.",
      headline: { text: "Hot, warm, cold", accent: "cold" },
      stage: {
        variant: "stack",
        tiers: [{ id: "hot", icon: "hot", title: "hot", sub: "read constantly" }, { id: "warm", icon: "warm", title: "warm", sub: "now and then" }, { id: "cold", icon: "cold", title: "cold", sub: "barely read" }],
        axes: [{ id: "speed", label: "speed", dir: "down" }, { id: "cost", label: "cost", dir: "down" }],
      },
    },
    beats: [{ at: 10, do: "reveal", target: "hot" }, { at: 40, do: "reveal", target: "warm" }, { at: 70, do: "reveal", target: "cold" }, { at: 105, do: "reveal", target: "speed" }, { at: 125, do: "reveal", target: "cost" }, { at: 165, do: "highlight", target: "cold" }],
  },
  "tiers-pyramid": {
    frames: 190, still: 180,
    scene: {
      id: "memory", template: "Tiers", vo: "The closer to the CPU, the faster and the smaller. Every step down is bigger and slower.",
      headline: { text: "The memory pyramid", accent: "memory" },
      stage: {
        variant: "pyramid",
        tiers: [{ id: "l1", icon: "cpu", title: "cpu cache", sub: "1 ns" }, { id: "ram", icon: "server", title: "ram", sub: "100 ns" }, { id: "ssd", icon: "storage", title: "ssd", sub: "100 µs" }, { id: "disk", icon: "disk", title: "disk", sub: "10 ms" }],
      },
    },
    beats: [{ at: 10, do: "reveal", target: "l1" }, { at: 35, do: "reveal", target: "ram" }, { at: 60, do: "reveal", target: "ssd" }, { at: 85, do: "reveal", target: "disk" }, { at: 140, do: "highlight", target: "ram" }],
  },
  "tiers-spectrum": {
    frames: 200, still: 190,
    scene: {
      id: "consistency", template: "Tiers", vo: "Consistency is a dial. Strong reads the latest, eventual catches up, session sits in between.",
      headline: { text: "Pick your consistency", accent: "consistency" },
      stage: {
        variant: "spectrum", ends: ["consistent", "available"],
        tiers: [{ id: "strong", icon: "lock", title: "strong", sub: "reads latest" }, { id: "session", icon: "user", title: "session", sub: "your writes" }, { id: "eventual", icon: "clock", title: "eventual", sub: "catches up" }],
      },
    },
    beats: [{ at: 50, do: "highlight", target: "strong" }, { at: 100, do: "highlight", target: "eventual" }, { at: 150, do: "highlight", target: "session" }],
  },
};

/** A demo as a timed scene: beats at fixed frames, words spread evenly over the scene. */
function demoCtx(d: Demo): Ctx {
  const scene = { part: "breakdown", transition: "cut", beats: [], ...d.scene } as Scene;
  const toks = scene.vo.split(/\s+/);
  const per = (d.frames - 10) / toks.length;
  const ts: TimedScene = {
    scene, index: 0, start: 0, duration: d.frames,
    words: toks.map((text, i) => ({ text, start: Math.round(5 + i * per), end: Math.round(5 + (i + 0.8) * per) })),
    beats: d.beats.map((b) => ({ on: "", do: b.do, target: b.target, args: b.args, frame: b.at, targets: b.target === undefined ? [] : [b.target].flat() })),
  };
  return { ts, episode: {} as Episode, timeline: { scenes: [ts], sting: { start: -1000, duration: 0 }, totalFrames: d.frames, source: "estimate" } };
}

export const DiagramDemo = ({ demo }: { demo: string }) => {
  const d = DEMOS[demo];
  const ctx = demoCtx(d);
  const T = TEMPLATE_COMPONENTS[ctx.ts.scene.template]!;
  return (
    <AbsoluteFill style={{ background: c.charcoal, color: c.cream }}>
      <T ctx={ctx} />
      <Chrome progress={0.45} />
      <Captions scene={ctx.ts} />
    </AbsoluteFill>
  );
};

/** All demos frozen on their review frame, tiled 3×3 (also a check that panels compose). */
export const DiagramSheet = () => {
  const names = Object.keys(DEMOS);
  const s = 1 / 3;
  return (
    <AbsoluteFill style={{ background: c.line }}>
      {names.map((n, i) => (
        <div key={n} style={{ position: "absolute", left: (i % 3) * 360, top: Math.floor(i / 3) * 640, width: 1080, height: 1920, transform: `scale(${s})`, transformOrigin: "0 0", overflow: "hidden", outline: `6px solid ${c.line}` }}>
          <Freeze frame={DEMOS[n].still}><DiagramDemo demo={n} /></Freeze>
        </div>
      ))}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- v1.6: BigPicture preview on a real episode
import type { LoadedEpisode } from "../../episode/load";
import { buildTimeline } from "../../timing/timeline";

/** A BigPicture scene added before the gist of a real episode (estimated words, no voice). */
export const BIG_PICTURE_PREVIEW = {
  id: "bigpicture", part: "breakdown", template: "BigPicture", transition: "cut",
  vo: "Put it all together: ask, check the rules, answer, and spread the load.",
  stage: {
    panels: [
      { id: "p1", scene: "response", label: "ask + answer" },
      { id: "p2", scene: "twotier", label: "guard the data" },
      { id: "p3", scene: "threetier", label: "one job each" },
      { id: "p4", scene: "scale", label: "spread the load" },
    ],
  },
  beats: [
    { on: "ask", do: "highlight", target: "p1" },
    { on: "rules", do: "highlight", target: "p2" },
    { on: "answer", do: "highlight", target: "p3" },
    { on: "spread", do: "highlight", target: "p4" },
  ],
} as unknown as Scene;

export const BigPicturePreview = ({ loaded }: { folder: string; loaded: LoadedEpisode | null }) => {
  if (!loaded) return <AbsoluteFill style={{ background: c.charcoal }} />;
  const scenes = [...loaded.episode.scenes];
  scenes.splice(scenes.length - 1, 0, BIG_PICTURE_PREVIEW);
  const ep = { ...loaded.episode, scenes };
  const est = buildTimeline(ep); // estimate for the new scene only
  const bp = est.scenes.find((t) => t.scene.id === "bigpicture")!;
  const ts: TimedScene = { ...bp, start: 0, words: bp.words.map((w) => ({ ...w, start: w.start - bp.start, end: w.end - bp.start })), beats: bp.beats.map((b) => ({ ...b, frame: b.frame - bp.start })) };
  const ctx: Ctx = { ts, episode: ep, timeline: { ...loaded.timeline, scenes: [...loaded.timeline.scenes, ts] } };
  const T = TEMPLATE_COMPONENTS.BigPicture!;
  return (
    <AbsoluteFill style={{ background: c.charcoal, color: c.cream }}>
      <T ctx={ctx} />
      <Chrome progress={0.93} />
      <Captions scene={ts} />
    </AbsoluteFill>
  );
};
export const bigPicturePreviewFrames = (loaded: LoadedEpisode) => {
  const scenes = [...loaded.episode.scenes];
  scenes.splice(scenes.length - 1, 0, BIG_PICTURE_PREVIEW);
  return buildTimeline({ ...loaded.episode, scenes }).scenes.find((t) => t.scene.id === "bigpicture")!.duration;
};
