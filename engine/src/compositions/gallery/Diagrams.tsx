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
type Demo = { scene: Omit<Scene, "beats" | "transition" | "part" | "enter" | "camera"> & { part?: Scene["part"] }; beats: DemoBeat[]; frames: number; still: number };

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

  // ------------------------------------------------ v1.8 proposal: variety plan Batch 1
  "v18-timeline-line": {
    frames: 210, still: 200,
    scene: {
      id: "tl", template: "Timeline", vo: "You click. A hundred milliseconds later the DNS answers. Then the handshake, then the page.",
      headline: { text: "One page load", accent: "load" },
      stage: {
        events: [
          { id: "click", at: "0 ms", label: "You click", sub: "the browser starts", icon: "user" },
          { id: "dns", at: "100 ms", label: "DNS answers", sub: "name becomes address", icon: "dns" },
          { id: "tls", at: "180 ms", label: "Handshake", sub: "TCP then TLS", icon: "lock" },
          { id: "page", at: "400 ms", label: "Page arrives", sub: "bytes on screen", icon: "file" },
        ],
      },
    },
    beats: [{ at: 10, do: "reveal", target: "click" }, { at: 50, do: "reveal", target: "dns" }, { at: 90, do: "reveal", target: "tls" }, { at: 130, do: "reveal", target: "page" }, { at: 170, do: "highlight", target: "tls" }],
  },
  "v18-timeline-lanes": {
    frames: 220, still: 210,
    scene: {
      id: "tll", template: "Timeline", vo: "Two servers, two clocks. A message carries its time, and the other clock jumps forward to match.",
      stage: {
        variant: "lanes",
        lanes: [{ id: "a", label: "server A" }, { id: "b", label: "server B" }],
        events: [
          { id: "a1", at: "t=1", label: "write x", lane: "a" },
          { id: "b1", at: "t=1", label: "write y", lane: "b" },
          { id: "a2", at: "t=2", label: "send", lane: "a" },
          { id: "b2", at: "t=3", label: "receive", lane: "b" },
          { id: "b3", at: "t=4", label: "reply", lane: "b" },
          { id: "a3", at: "t=5", label: "receive", lane: "a" },
        ],
        links: [{ id: "m1", from: "a2", to: "b2", label: "msg" }, { id: "m2", from: "b3", to: "a3" }],
      },
    },
    beats: [{ at: 10, do: "reveal", target: "a1" }, { at: 28, do: "reveal", target: "b1" }, { at: 50, do: "reveal", target: "a2" }, { at: 78, do: "step", target: "m1" }, { at: 82, do: "reveal", target: "b2" }, { at: 110, do: "reveal", target: "b3" }, { at: 135, do: "step", target: "m2" }, { at: 140, do: "reveal", target: "a3" }, { at: 175, do: "highlight", target: "b2" }],
  },
  "v18-chart-bars": {
    frames: 200, still: 190,
    scene: {
      id: "cb", template: "MetricChart", vo: "A cache hit takes one millisecond. A database read takes fifty. A cold disk read takes two hundred.",
      headline: { text: "How long a read takes", accent: "read" },
      stage: { chart: { type: "bar", unit: " ms", data: [{ id: "cache", label: "cache", value: 1, tone: "ok" }, { id: "db", label: "database", value: 50 }, { id: "disk", label: "cold disk", value: 200, tone: "down" }] } },
    },
    beats: [{ at: 14, do: "reveal", target: "cache" }, { at: 60, do: "reveal", target: "db" }, { at: 105, do: "reveal", target: "disk" }, { at: 150, do: "highlight", target: "disk" }],
  },
  "v18-chart-line": {
    frames: 200, still: 190,
    scene: {
      id: "cl", template: "MetricChart", vo: "Traffic doubles every few months, until the one server cannot keep up.",
      headline: { text: "Traffic keeps climbing", accent: "climbing" },
      stage: { chart: { type: "line", unit: "k", data: [{ id: "p1", label: "jan", value: 10 }, { id: "p2", label: "mar", value: 22 }, { id: "p3", label: "may", value: 48 }, { id: "p4", label: "jul", value: 95 }, { id: "p5", label: "sep", value: 180 }] } },
    },
    beats: [{ at: 14, do: "reveal", target: "p1" }, { at: 44, do: "reveal", target: "p2" }, { at: 74, do: "reveal", target: "p3" }, { at: 104, do: "reveal", target: "p4" }, { at: 134, do: "reveal", target: "p5" }, { at: 170, do: "highlight", target: "p5" }],
  },
  "v18-chart-gauge": {
    frames: 160, still: 150,
    scene: {
      id: "cg", template: "MetricChart", vo: "Ninety nine point nine percent uptime still means almost nine hours of downtime a year.",
      stage: { chart: { type: "gauge", unit: "%", max: 100, data: [{ id: "up", label: "uptime", value: 99.9, tone: "ok" }] } },
    },
    beats: [{ at: 14, do: "count", target: "up" }],
  },
  "v18-snippet": {
    frames: 230, still: 220,
    scene: {
      id: "sn", template: "Snippet", vo: "You send a GET. The server answers with JSON: a status, and your cart.",
      headline: { text: "Ask, then answer", accent: "answer" },
      stage: {
        title: "terminal",
        lines: [
          { id: "cmd", kind: "cmd", text: "curl api.shop.io/cart" },
          { id: "status", kind: "out", text: "HTTP/1.1 200 OK" },
          { id: "body", kind: "json", text: '{ "items": 3, "total": 42.5, "paid": false }' },
        ],
      },
    },
    beats: [{ at: 12, do: "reveal", target: "cmd" }, { at: 70, do: "reveal", target: "status" }, { at: 105, do: "reveal", target: "body" }, { at: 175, do: "highlight", target: "status" }],
  },
  "v18-stat": {
    frames: 120, still: 70,
    scene: {
      id: "st", part: "hook", template: "Stat", vo: "Four hundred milliseconds. That is all a user will wait before they leave.",
      stage: { stat: { id: "stat", value: "400", unit: "ms", label: "before they leave" }, sub: { id: "sub", text: "every request has a clock on it" } },
    },
    beats: [{ at: 8, do: "appear", target: "stat" }, { at: 60, do: "reveal", target: "sub" }],
  },

  // ------------------------------------------------ v1.9 proposal: variety plan Batch 2
  "v19-zoom": {
    frames: 220, still: 210,
    scene: {
      id: "zm", template: "Zoom", vo: "Your app talks to one service. Zoom in, and it is really a cache sitting in front of a database.",
      headline: { text: "Inside one service", accent: "service" },
      stage: {
        from: { id: "svc", type: "service", family: "outlined", label: "the service" },
        inside: {
          nodes: [{ id: "gw", type: "gateway", family: "outlined", label: "gateway" }, { id: "ch", type: "cache", family: "outlined", label: "cache" }, { id: "dbx", type: "db", family: "outlined", label: "database" }],
          links: [{ from: "gw", to: "ch" }, { from: "ch", to: "dbx" }],
        },
      },
    },
    beats: [{ at: 4, do: "appear", target: "svc" }, { at: 50, do: "zoom", target: "svc" }, { at: 100, do: "appear", target: "gw" }, { at: 125, do: "appear", target: "ch" }, { at: 150, do: "appear", target: "dbx" }, { at: 185, do: "highlight", target: "ch" }],
  },
  "v19-statemachine": {
    frames: 260, still: 250,
    scene: {
      id: "sm", template: "StateMachine", vo: "A circuit breaker starts closed. Too many failures, and it opens. After a pause it tests the water, half open.",
      headline: { text: "The circuit breaker", accent: "breaker" },
      stage: {
        start: "closed",
        states: [{ id: "closed", label: "closed", tone: "ok" }, { id: "open", label: "open", tone: "down" }, { id: "half", label: "half", tone: "warn" }],
        transitions: [{ id: "trip", from: "closed", to: "open", label: "5 failures" }, { id: "wait", from: "open", to: "half", label: "30 s later" }, { id: "good", from: "half", to: "closed", label: "success" }, { id: "bad", from: "half", to: "open", label: "fails" }],
      },
    },
    beats: [{ at: 8, do: "reveal", target: "closed" }, { at: 24, do: "reveal", target: "open" }, { at: 40, do: "reveal", target: "half" }, { at: 90, do: "step", target: "trip" }, { at: 140, do: "step", target: "wait" }, { at: 190, do: "step", target: "good" }],
  },
  "v19-tree": {
    frames: 230, still: 220,
    scene: {
      id: "tr", template: "Tree", vo: "A web address is a tree. The dot at the top points to com, which points to the site, which points to a page.",
      headline: { text: "DNS is a tree", accent: "tree" },
      stage: {
        variant: "tree",
        root: { id: "root", label: "root .", children: [
          { id: "com", label: ".com", children: [{ id: "shop", label: "shop.com" }, { id: "blog", label: "blog.com" }] },
          { id: "org", label: ".org", children: [{ id: "wiki", label: "wiki.org" }] },
        ] },
      },
    },
    beats: [{ at: 8, do: "reveal", target: "root" }, { at: 40, do: "reveal", target: "com" }, { at: 70, do: "reveal", target: "org" }, { at: 100, do: "reveal", target: "shop" }, { at: 120, do: "reveal", target: "blog" }, { at: 140, do: "reveal", target: "wiki" }, { at: 185, do: "highlight", target: "shop" }],
  },
  "v19-tree-radial": {
    frames: 220, still: 210,
    scene: {
      id: "tm", template: "Tree", vo: "To scale, you can go bigger, or go wider. Wider means more servers, and a way to share the work.",
      stage: {
        variant: "radial",
        root: { id: "scale", label: "scaling", children: [
          { id: "up", label: "bigger", children: [{ id: "cpu", label: "more cpu" }, { id: "ram", label: "more ram" }] },
          { id: "out", label: "wider", children: [{ id: "lbx", label: "balancer" }, { id: "rep", label: "replicas" }] },
        ] },
      },
    },
    beats: [{ at: 8, do: "reveal", target: "scale" }, { at: 40, do: "reveal", target: "up" }, { at: 60, do: "reveal", target: "cpu" }, { at: 76, do: "reveal", target: "ram" }, { at: 100, do: "reveal", target: "out" }, { at: 120, do: "reveal", target: "lbx" }, { at: 136, do: "reveal", target: "rep" }, { at: 175, do: "highlight", target: "rep" }],
  },
  "v19-transform": {
    frames: 220, still: 210,
    scene: {
      id: "tf", template: "Transform", vo: "A hash turns any text into a fixed scramble. Encrypt that, and only a key can bring it back.",
      headline: { text: "Same text, new shape", accent: "shape" },
      stage: {
        items: [{ id: "plain", label: "plain", text: "hello world" }, { id: "hashed", label: "hashed", text: "b94d27b9934d" }, { id: "locked", label: "encrypted", text: "7f3a9c01e8d2" }],
        via: [{ id: "hash", label: "hash", icon: "cpu" }, { id: "enc", label: "encrypt", icon: "lock" }],
      },
    },
    beats: [{ at: 8, do: "reveal", target: "plain" }, { at: 40, do: "step", target: "hash" }, { at: 115, do: "step", target: "enc" }, { at: 190, do: "highlight", target: "locked" }],
  },

  // ------------------------------------------------ v1.10 proposal: variety plan Batch 3
  "v110-ring": {
    frames: 300, still: 290,
    scene: {
      id: "rg", template: "Ring", vo: "Servers and keys share one ring. Each key walks clockwise to the next server. Lose a server, and only its keys move on.",
      headline: { text: "The hash ring", accent: "ring" },
      stage: {
        servers: [{ id: "a", label: "server A", at: 20 }, { id: "b", label: "server B", at: 140 }, { id: "c", label: "server C", at: 250 }],
        keys: [{ id: "k1", label: "k1", at: 60 }, { id: "k2", label: "k2", at: 115 }, { id: "k3", label: "k3", at: 190 }, { id: "k4", label: "k4", at: 300 }],
      },
    },
    beats: [{ at: 8, do: "reveal", target: "a" }, { at: 20, do: "reveal", target: "b" }, { at: 32, do: "reveal", target: "c" }, { at: 50, do: "reveal", target: "k1" }, { at: 62, do: "reveal", target: "k2" }, { at: 74, do: "reveal", target: "k3" }, { at: 86, do: "reveal", target: "k4" }, { at: 110, do: "step", target: "k1" }, { at: 120, do: "step", target: "k2" }, { at: 130, do: "step", target: "k3" }, { at: 140, do: "step", target: "k4" }, { at: 200, do: "state", target: "b", args: { to: "down" } }],
  },
  "v110-cells": {
    frames: 260, still: 250,
    scene: {
      id: "cl4", template: "Cells", vo: "Split the data across shards. Each user lands on one. If everyone picks the same shard, it runs hot while the others sit idle.",
      headline: { text: "Sharding", accent: "Sharding" },
      stage: {
        cells: [{ id: "s1", label: "shard 1" }, { id: "s2", label: "shard 2" }, { id: "s3", label: "shard 3" }, { id: "s4", label: "shard 4" }],
        items: [{ id: "u1", label: "ann", into: "s1" }, { id: "u2", label: "bo", into: "s3" }, { id: "u3", label: "cy", into: "s2" }, { id: "u4", label: "di", into: "s2" }, { id: "u5", label: "ed", into: "s2" }, { id: "u6", label: "flo", into: "s2" }, { id: "u7", label: "gus", into: "s2" }],
      },
    },
    beats: [{ at: 6, do: "reveal", target: "s1" }, { at: 14, do: "reveal", target: "s2" }, { at: 22, do: "reveal", target: "s3" }, { at: 30, do: "reveal", target: "s4" }, { at: 50, do: "step", target: "u1" }, { at: 66, do: "step", target: "u2" }, { at: 82, do: "step", target: "u3" }, { at: 110, do: "step", target: "u4" }, { at: 126, do: "step", target: "u5" }, { at: 142, do: "step", target: "u6" }, { at: 158, do: "step", target: "u7" }, { at: 190, do: "state", target: "s2", args: { to: "overloaded" } }, { at: 215, do: "highlight", target: "s2" }],
  },
  "v110-stream": {
    frames: 280, still: 270,
    scene: {
      id: "sr", template: "Stream", vo: "Producers write messages. Each lane keeps its own order. A slow consumer does not lose anything, the queue just grows.",
      headline: { text: "A queue per lane", accent: "queue" },
      stage: {
        lanes: [{ id: "p1", label: "partition 1", producer: "phone", consumer: "server" }, { id: "p2", label: "partition 2", producer: "phone", consumer: "server" }],
        messages: [{ id: "m1", lane: "p1", label: "order 1" }, { id: "m2", lane: "p2", label: "order 2" }, { id: "m3", lane: "p1", label: "order 3" }, { id: "m4", lane: "p2", label: "order 4" }, { id: "m5", lane: "p2", label: "order 5" }, { id: "m6", lane: "p2", label: "order 6" }],
      },
    },
    beats: [{ at: 20, do: "send", target: "m1" }, { at: 34, do: "send", target: "m2" }, { at: 48, do: "send", target: "m3" }, { at: 62, do: "send", target: "m4" }, { at: 76, do: "send", target: "m5" }, { at: 90, do: "send", target: "m6" }, { at: 110, do: "step", target: "p1" }, { at: 150, do: "step", target: "p1" }, { at: 190, do: "step", target: "p2" }, { at: 235, do: "state", target: "p2", args: { to: "overloaded" } }],
  },
  "v110-cluster": {
    frames: 330, still: 320,
    scene: {
      id: "cc", template: "Cluster", vo: "A write needs most of the cluster to agree. One node down is fine. Lose the leader, and the others elect a new one.",
      headline: { text: "Most must agree", accent: "agree" },
      stage: { leader: "n1", nodes: [{ id: "n1", type: "server", family: "outlined", label: "node 1" }, { id: "n2", type: "server", family: "outlined", label: "node 2" }, { id: "n3", type: "server", family: "outlined", label: "node 3" }, { id: "n4", type: "server", family: "outlined", label: "node 4" }, { id: "n5", type: "server", family: "outlined", label: "node 5" }] },
    },
    beats: [{ at: 4, do: "appear", target: "n1" }, { at: 10, do: "appear", target: "n2" }, { at: 16, do: "appear", target: "n3" }, { at: 22, do: "appear", target: "n4" }, { at: 28, do: "appear", target: "n5" }, { at: 60, do: "send", target: "n1" }, { at: 125, do: "state", target: "n3", args: { to: "down" } }, { at: 150, do: "send", target: "n1" }, { at: 215, do: "state", target: "n1", args: { to: "down" } }, { at: 245, do: "highlight", target: "n2" }, { at: 275, do: "send", target: "n2" }],
  },

  // ------------------------------------------------ v1.11 proposal: variety plan Batch 4
  "v111-fleet": {
    frames: 300, still: 290,
    scene: {
      id: "fl", template: "Fleet", vo: "One server copes with a quiet day. A spike doubles the traffic and its cpu maxes out. Autoscaling adds pods until the bars come down.",
      headline: { text: "Autoscaling", accent: "Autoscaling" },
      stage: { pods: [{ id: "p1", label: "pod 1" }, { id: "p2", label: "pod 2" }, { id: "p3", label: "pod 3" }, { id: "p4", label: "pod 4" }, { id: "p5", label: "pod 5" }, { id: "p6", label: "pod 6" }], load: { id: "load", label: "traffic", perPod: 10, max: 100 } },
    },
    beats: [{ at: 4, do: "reveal", target: "p1" }, { at: 12, do: "count", target: "load", args: { to: 8 } }, { at: 70, do: "count", target: "load", args: { to: 50 } }, { at: 130, do: "reveal", target: "p2" }, { at: 150, do: "reveal", target: "p3" }, { at: 170, do: "reveal", target: "p4" }, { at: 190, do: "reveal", target: "p5" }, { at: 210, do: "reveal", target: "p6" }, { at: 235, do: "count", target: "load", args: { to: 42 } }],
  },
  "v111-map": {
    frames: 320, still: 310,
    scene: {
      id: "mp", template: "Map", vo: "A user in Sydney asks a server in Virginia, and waits. A copy in Singapore answers sooner. A copy in Sydney answers instantly.",
      headline: { text: "Closer is faster", accent: "faster" },
      stage: {
        pins: [{ id: "syd", label: "you", at: [151, -34], kind: "user" }, { id: "sin", label: "edge SG", at: [104, 1], kind: "edge" }, { id: "vir", label: "origin", at: [-78, 38], kind: "origin" }],
        routes: [{ id: "far", from: "syd", to: "vir", ms: 220 }, { id: "mid", from: "syd", to: "sin", ms: 90 }],
      },
    },
    beats: [{ at: 8, do: "reveal", target: "syd" }, { at: 20, do: "reveal", target: "vir" }, { at: 32, do: "reveal", target: "sin" }, { at: 70, do: "step", target: "far" }, { at: 160, do: "step", target: "mid" }, { at: 250, do: "highlight", target: "mid" }],
  },
  "v111-estimate": {
    frames: 260, still: 250,
    scene: {
      id: "es", template: "Estimate", vo: "A million users, ten requests each a day. Divide by the seconds in a day. About a hundred and fifteen a second, call it three hundred at peak.",
      headline: { text: "Napkin maths", accent: "maths" },
      stage: { lines: [{ id: "a", text: "1M users" }, { id: "b", text: "x 10 req / day" }, { id: "c", text: "= 10M req / day" }, { id: "d", text: "/ 86,400 s = 115 /s" }, { id: "e", text: "peak x3 = ~350 /s", result: true }] },
    },
    beats: [{ at: 10, do: "reveal", target: "a" }, { at: 50, do: "reveal", target: "b" }, { at: 90, do: "reveal", target: "c" }, { at: 130, do: "reveal", target: "d" }, { at: 175, do: "reveal", target: "e" }],
  },
  "v111-chat": {
    frames: 280, still: 270,
    scene: {
      id: "ch", template: "Chat", vo: "The app asks, the server answers. Hello, hello back. Can I have my cart? Here it is, two hundred.",
      stage: {
        actors: [{ id: "app", type: "phone", family: "solid", label: "app" }, { id: "srv", type: "server", family: "outlined", label: "server" }],
        messages: [{ id: "m1", from: "app", text: "hello?" }, { id: "m2", from: "srv", text: "hello! ready" }, { id: "m3", from: "app", text: "GET /cart please" }, { id: "m4", from: "srv", text: "200 OK: 3 items" }],
      },
    },
    beats: [{ at: 12, do: "reveal", target: "m1" }, { at: 70, do: "reveal", target: "m2" }, { at: 128, do: "reveal", target: "m3" }, { at: 186, do: "reveal", target: "m4" }, { at: 240, do: "highlight", target: "m4" }],
  },
  "v111-diorama": {
    frames: 300, still: 290,
    scene: {
      id: "di", template: "Diorama", vo: "In a restaurant, you sit at a table and order. The waiter carries it to the kitchen, and brings your food back.",
      headline: { text: "A restaurant is a server", accent: "server" },
      stage: {
        zones: [{ id: "kitchen", label: "kitchen", x: 0.04, y: 0.04, w: 0.92, h: 0.27, icon: "cpu" }, { id: "floor", label: "the floor", x: 0.04, y: 0.37, w: 0.92, h: 0.2 }, { id: "tables", label: "tables", x: 0.04, y: 0.63, w: 0.92, h: 0.33, icon: "user" }],
        actors: [{ id: "you", icon: "user", label: "you", at: "tables" }, { id: "waiter", icon: "service", label: "waiter", at: "floor" }],
      },
    },
    beats: [{ at: 4, do: "reveal", target: "kitchen" }, { at: 12, do: "reveal", target: "floor" }, { at: 20, do: "reveal", target: "tables" }, { at: 40, do: "reveal", target: "you" }, { at: 52, do: "reveal", target: "waiter" }, { at: 90, do: "step", target: "waiter", args: { to: "tables" } }, { at: 140, do: "step", target: "waiter", args: { to: "kitchen" } }, { at: 200, do: "step", target: "waiter", args: { to: "tables" } }],
  },
  "v111-matrix": {
    frames: 260, still: 250,
    scene: {
      id: "mx", template: "Matrix", vo: "Compare three databases. The first is fast but not strict. The second is strict but slower. The third needs care.",
      headline: { text: "Pick a database", accent: "database" },
      stage: {
        cols: [{ id: "kv", label: "key-value", icon: "key" }, { id: "sql", label: "SQL", icon: "db" }, { id: "doc", label: "document", icon: "file" }],
        rows: [{ id: "fast", label: "fast reads", cells: ["yes", "partial", "yes"] }, { id: "acid", label: "strict rules", cells: ["no", "yes", "partial"] }, { id: "join", label: "joins", cells: ["no", "yes", "no"] }, { id: "scale", label: "scales out", cells: ["yes", "partial", "yes"] }],
      },
    },
    beats: [{ at: 14, do: "reveal", target: "fast" }, { at: 60, do: "reveal", target: "acid" }, { at: 106, do: "reveal", target: "join" }, { at: 150, do: "reveal", target: "scale" }, { at: 205, do: "highlight", target: "sql" }],
  },
  "v111-slider": {
    frames: 240, still: 230,
    scene: {
      id: "sl", template: "Slider", vo: "Without a cache every read walks to the database, and takes two hundred milliseconds. With one, most reads stop at the cache.",
      headline: { text: "With a cache", accent: "cache" },
      stage: {
        before: { id: "before", title: "no cache", nodes: [{ id: "u1", type: "user", family: "solid", label: "user" }, { id: "s1", type: "server", family: "outlined", label: "server" }, { id: "d1", type: "db", family: "outlined", label: "database" }], note: "every read goes to disk", result: "200ms" },
        after: { id: "after", title: "cache", nodes: [{ id: "u2", type: "user", family: "solid", label: "user" }, { id: "s2", type: "server", family: "outlined", label: "server" }, { id: "c2", type: "cache", family: "hero", label: "cache" }], note: "most reads stop here", result: "2ms" },
      },
    },
    beats: [{ at: 120, do: "reveal", target: "after" }],
  },
};

/** A demo as a timed scene: beats at fixed frames, words spread evenly over the scene. */
function demoCtx(d: Demo): Ctx {
  const scene = { part: "breakdown", transition: "cut", enter: "pop", camera: "still", beats: [], ...d.scene } as Scene;
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
export const DiagramSheet = ({ only }: { only?: "v18" | "v19" | "v110" | "v111" } = {}) => {
  const names = Object.keys(DEMOS).filter((n) => (only ? n.startsWith(`${only}-`) : !/^v1(8|9|10|11)-/.test(n)));
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
  id: "bigpicture", part: "breakdown", template: "BigPicture", transition: "cut", enter: "pop", camera: "still",
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
