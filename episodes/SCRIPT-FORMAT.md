# Bytesized Script Format — v1.8

> **v1.8, locked (approved by Imad 2026-10-18): calibrated length, slower voice.** New episodes are voiced at `speed: 0.93` (set by `voice:assign`; earlier episodes keep 1.0). The validator's length estimate is calibrated to measured ElevenLabs speech (it ran ~13% long, so scripts that estimated ~85s measured ~76s and came back for a second script round) and scales with `voice.speed`. A measured length under 80s is still fixed in the script, never with padded pauses (tried on 009, felt draggy). No schema change: scripts keep `format: "1.6"`. Changes need a versioned update with explicit approval.
> v1.7, locked (approved by Imad 2026-10-18): narration reads as one speech.** The tone line no longer asks for "short sentences"; §1 gains the *Narration reads as one speech* rule, checked by warning-only validator rules (`engine/src/episode/narration.ts`). The word budget follows measured voiceovers (~2.2 words/s), and breakdown scenes may run to 10s so a connected sentence isn't chopped. No schema change: scripts keep `format: "1.6"`. Changes need a versioned update with explicit approval.
> v1.6 (approved by Imad 2026-10-12): variety plan v2. Every episode gets a **look** (two motion recipes, `npm run look:assign`), scenes can set `transition` / `enter` / `camera`, 25 templates are on the menu, and variety is measured by **fingerprints** (template · entrance · transition · camera), not template names alone. Hard fails apply to `format: "1.6"` scripts (§4); older formats keep their warnings. Changes need a versioned update with explicit approval.
> v1.5.1 (2026-10-12, folded into v1.6): templates `Timeline`, `MetricChart`, `Snippet`, `Stat` are built (design language v1.8). `Zoom`, `StateMachine`, `Tree`, `Transform` are built (v1.9), and `Ring`, `Cells`, `Stream`, `Cluster` (v1.10). The motion fields `transition` (cut, push, whip, flip, stack, dive, iris), `enter` (pop, drop, snap, stamp, wipe) and `camera` (still, drift, rack) are optional per scene (v1.7); the full variety rules arrive with v1.6.
> v1.5: **topic-first visual plan**. Each script decides its 1–2 core diagrams (the "spine") before writing scenes and records them in `visual_plan`; extra templates only where the idea changes kind. Reuse chains up to 5 scenes; variety rules (§4) now guard both extremes. v1.4 approved 2026-10-06.
> v1.4: an optional **BigPicture** scene (a pull-back over the episode's own diagrams) just before the gist, for whole-system topics. v1.3 approved 2026-10-06.
> v1.3: the wave-1 diagram templates (Sequence, Split, Decision, Tiers) join the menu, **diagrams are picked from the idea** (§3b), and **variety rules** (§4) keep episodes from looking alike. v1.2 approved 2026-10-06.
> v1.2: length 30–60s → **80–90s** (fixed, so every short is consistent and clears TikTok's 60s rewards floor), more breakdown scenes. v1.1 approved 2026-09-29.

Every episode is one `episode.yaml`. The **Script Creator** (`/script`) writes it, and the **Video Creator** (`/video`) turns it into a video. Visuals are chosen from a fixed menu of **templates**, **node types** and **verbs**, so the output is predictable and always on-brand ([design language v1.11](../brand/design-language/DESIGN-LANGUAGE.md)).

---

## 1. Episode rules (3.1)

### Length
| Rule | Value |
|---|---|
| Total length | **80–90s**, including the ~1–2s branding sting. **Never over 90s.** Aim for **85s** so text-to-speech variance stays inside the window |
| Voiceover words | **Guidance only, never a rejection rule.** Roughly `2.2 × (target − 1.5)` words, so ~175 words for 80s, ~185 for 85s and ~195 for 90s (at `speed: 0.93` voices read ~2.3 words/s; trust `npm run validate`'s length estimate, which is calibrated to measured speech). `/script` sizes the script to its chosen target |
| Hard check | The **real voiceover length** measured after text-to-speech must be 80–90s. If it's outside that, trim or extend only the affected scenes' lines and re-voice just those scenes |
| Scenes | 9–15 content scenes (the branding sting is added automatically) |
| Scene length | 3–8s each; a breakdown scene may run to 10s when its line is one connected thought |
| Beats | A visual change every **1.5–2s**, each tied to a word in the voiceover |

### Structure (always in this order)
| Part | Time | Scenes | Job |
|---|---|---|---|
| **Hook** | 0–3s | 1 | A question or surprising claim in the **first sentence**. No greetings ("Hey guys…") and no Bytesized logo |
| **Branding** | ~1–2s max | auto | A quick logo sting: bite wipe to orange, the Bytesized + Back in a Gist lockup, then cut to the Idea. No voiceover, just a sound effect. Added by the engine, not written in the script |
| **Idea** | next ~5s | 1 | Name the concept in plain words, usually with an analogy |
| **Breakdown** | the bulk | 6–12 | How it works, mostly as **diagrams picked from the idea** (§3b): a request flow, a message sequence, a comparison, a rule, a trade-off, a failure and recovery |
| **BigPicture** (optional) | ~3–5s | 0–1 | The last breakdown scene: a pull-back over 2–4 of the episode's own diagrams, so the viewer sees how the pieces fit. Only for whole-system topics (§3b) |
| **Gist** | ~4s | 1 | A one-line takeaway on the gist card. The voiceover starts with "That's the gist". **The video ends here**, and the last frame loops cleanly back into the hook |

### Writing rules
- **Headlines** go in most scenes, but not all: ≤5 words, ≤2 lines, and exactly one `accent` word. At least 1 scene per episode has no headline, and never more than 3 headline scenes in a row. Never put a headline on the `GistCard` scene.
- **Captions** are generated from `vo` automatically, so they're never written by hand.
- **The headline and the voiceover must not repeat each other.** The headline names the idea and the voiceover explains it.
- **The script accent** (`accent:`) can be used at most once per episode.
- **At most one hero node** on screen at a time, and it should be the episode's topic.
- **No emojis in `vo`**, since the voiceover would read them out. Write numbers the way they should be spoken ("two million").
- **Tone:** a knowledgeable engineer explaining something to a curious friend: conversational, a little playful, never theatrical.
- **Narration reads as one speech.** The `vo` lines, read in order with headlines ignored, must sound like one person developing a thought: each sentence follows from the last (cause, consequence, contrast, a pronoun that points back, the answer to something just raised), breakdown scenes open by continuing rather than restarting, and rhythm is mixed, with short sentences kept for the points they land. No filler openers (Now, So, But, Here's the thing), textbook definitions, invented suspense or influencer energy; at most one question. Outline points are what to cover, not one scene each or the order to say them in. The validator warns on the mechanical symptoms (`engine/src/episode/narration.ts`, §4); `/script` step 3b is the full method.

### Third-party logos (e.g. Netflix, Uber, AWS)
Allowed **as a reference**, to show clearly *who we're talking about*, never to suggest that brand made or sponsored the video.
- ✅ **Use when:** the episode is *about* that company or its engineering ("How Netflix streams", "Uber's dispatch system"), or the brand is a named node in the diagram, e.g. a central Netflix node with users flooding in.
- ✅ **How:** only inside a diagram node (a `brand` node, §3), at node size, in the company's **original, unaltered** logo, from their official press or brand kit.
- ❌ **Never:** in the branding sting, the corner mark, the progress bar or the gist card. Never full-screen, never as the first frame on its own, never recoloured, distorted or animated beyond the normal node pop-in, and never next to wording like "presented by" or "official".
- **Our branding always wins.** The Bytesized mark, progress bar and branding sting stay, so it's always clearly our video.
- **Upload description** adds: *"Not affiliated with or endorsed by [Brand]. Logos are used for identification only."*
- Logo files live in `assets/logos/<brand>/` (the official kit as supplied), with a `source:` URL recorded in `assets/logos/<brand>/SOURCE.md`. The engine uses **`derived/node.png`** (or `node.svg`): the official logo with transparent padding trimmed and nothing else changed.

### Two-part episodes
When a topic can't be explained well in 90s, `/script` **splits it into Part 1 and Part 2**. These are uploaded as separate videos, each 80–90s, and follow all the rules above.
- **Max 2 parts.** If a topic needs more, `/script` narrows the scope and proposes the rest as separate episodes.
- **Part 1** ends its gist with a **teaser** for Part 2 ("Next: what happens when the cache is wrong"). Its gist voiceover ends with *"Part 2 is next, follow so you don't miss it."*
- **Part 2** opens with a hook that includes a **one-sentence recap** ("Last time: caches make reads fast. But what if the cache lies?"), so it still works on its own.
- **Each part is its own episode folder:** `episodes/007-caching-part-1/` and `episodes/008-caching-part-2/`, linked by `series:` (§2).
- **On screen:** a small `PART 1/2` tag sits next to the corner mark. This is part of design language v1.1.

### Voice rotation
- Each new episode gets the **next voice in the roster** (`episodes/voices.json`: Liam → Matilda → Jessica → Chris → Liam…). `/script` runs `npm run voice:assign -- <nnn>` right after writing the file.
- The tracker records every assignment in `history` and advances `next`. Running it again for the same episode keeps that episode's voice.
- **Part 2 of a series reuses Part 1's voice**, for continuity, and doesn't advance the rotation.
- To change the lineup, edit `roster`. Only ElevenLabs premade voices work on the free tier.

### Music rotation
- Each new episode gets **one of the four sibling theme tracks at random** (`episodes/music.json`), never the same as the previous episode. `/script` runs `npm run music:assign -- <nnn>` right after `voice:assign`.
- The pick is written to `music.track` and recorded in `history`, so renders are reproducible. Running it again keeps the episode's track (`--force` re-picks).
- **Part 2 of a series reuses Part 1's track.**
- To change the lineup, edit `roster` (each id must exist in `assets/music/library.json`).

### Asset folders
All assets use `assets/<asset_type>/<files or sub-folders>`:
| Folder | Holds |
|---|---|
| `assets/logos/<brand>/` | Third-party logos (the official kit), plus `SOURCE.md` |
| `assets/music/` | Tracks, plus `library.json` (prompt, source, plan, licence per track) |
| `assets/sfx/` | Sound effects, plus `library.json` (same) |
| `assets/icons/` | Extra icons beyond the design-language set |

Our own brand assets stay in `brand/`, which isn't under `assets/`.

---

## 2. File format (3.2)

```yaml
id: 1                                  # episode number
slug: what-is-system-design            # folder name: episodes/001-what-is-system-design/
title: What is System Design?          # used for the upload title
topic: system design basics
target_sec: 85                         # 80–90, chosen by /script (85 suits most)
format: "1.6"                          # the script format it was written to (1.3+ makes the variety rules hard fails; 1.5 adds the visual-plan rules; 1.6 adds looks and the fingerprint rules)
visual_plan: "Spine: one FlowDiagram (app box splits into services, then one fails alone) over 4 scenes. Split for the comparison, Decision for when to pick which, Analogy for the restaurant."   # required for 1.5+, ≤300 characters: the spine diagram(s) and why each other template is there

series:                                # only for two-part episodes
  key: caching                         # shared by both parts
  part: 1                              # 1 | 2
  of: 2
  teaser: "Next: what happens when the cache is wrong"   # part 1 only
  recap: "Last time: caches make reads fast."            # part 2 only

brands: []                             # third-party logos used, e.g. [netflix] → assets/logos/netflix/

voice:                                 # ElevenLabs. Set by `npm run voice:assign -- <nnn>`, never by hand
  name: Liam                           # round robin from episodes/voices.json
  voice_id: TX3LPaxmHKxFdv7VOQHJ
  speed: 0.93                          # 0.93 from v1.8 (adds ~6s vs 1.0); older episodes keep 1.0

music:                                 # set by `npm run music:assign -- <nnn>` (omitted → the main theme)
  track: bytesized-theme-2             # a track id from assets/music/library.json (random from episodes/music.json)
  volume: 0.12                         # ducked under the voice automatically

look:                                  # set by `npm run look:assign -- <nnn>`, never by hand (format 1.6 requires it)
  recipes: [slam, drop]                # two recipes from episodes/looks.json (snap · draw · slam · drop); random, not the last 3 episodes'; Part 2 reuses Part 1's

scenes:
  - id: hook                           # unique within the episode
    part: hook                         # hook | idea | breakdown | gist  (branding is automatic)
    template: Hook                     # from the template menu (§3)
    # optional motion overrides: transition (cut | push | whip | flip | stack | dive | iris), enter (pop | drop | snap | stamp | wipe),
    # camera (still | drift | rack). Leave them out and the episode's look fills them in; set one only for a deliberate exception.
    vo: "How does Netflix survive millions of people hitting play at once?"
    headline: { text: "Millions. At once.", accent: "At once." }   # optional
    stage:                             # what's on screen (template-specific)
      nodes:
        - { id: nflx, type: brand, logo: netflix, family: hero }
      crowd: { id: crowd, count: 40, target: nflx }
    beats:                             # visual changes, each on a voiceover word
      - { on: "Netflix", do: appear, target: nflx }
      - { on: "millions", do: flood, target: crowd }
```

### Beats
- **`on`** is a word from this scene's `vo`, matched case-insensitively. Use `"word#2"` for the second occurrence. The engine converts it to a frame using the ElevenLabs word timestamps.
- **`do`** is a verb from the menu (§3). **`target`** is a node, link or element `id`, or a list of them.
- Optional: **`offset`** (seconds, ±, to nudge timing) and **`args`** (verb-specific).
- Optional: **`sfx`**, a sound id from `assets/sfx/library.json` or `none`. Normally you leave it out: the sound map in the design language picks the sound from the verb (pop on appear, error on `state: down`…). Use it only for a deliberate exception.
- Scenes change on the first word of the next scene's `vo`, as a hard cut by default. Set `transition: push` on a scene to push instead.

---

## 3. Menus

### Templates
| Template | Use for | `stage` fields |
|---|---|---|
| `Hook` | Opening visual plus an optional counter | `nodes`, `crowd`, `counter` |
| `Analogy` | "X is like Y" lists (up to 3 rows), with an optional morph | `rows: [{icon, key, value}]`, `morph` |
| `FlowDiagram` | Requests moving through a system (top → bottom) | `layers: [[node ids]…]`, `nodes`, `links` |
| `ThreeCards` | Three properties or steps, revealed one by one | `cards: [{icon, title, sub}]` |
| `Sequence` | Who talks to whom, in order: 2–3 actors, numbered messages stepping down (left ↔ right) | `actors: [nodes]`, `steps: [{id, from, to, label, kind?, lost?} \| {id, at, note}]`, `reuse` |
| `Split` | The same idea twice, stacked top/bottom. `variant: compare` (default) or `race` (both send, the faster finishes first) | `variant`, `before` / `after`: `{id, title, nodes, note?, result?, slow?}` |
| `Decision` | Rules and branching: start node, 1–3 question diamonds, a yes outcome, no outcomes to the side | `start: node`, `checks: [{id, q, no: outcome \| outcome id}]`, `yes: outcome` (outcome = `{id, label, type?, icon?, tone?: ok\|down, retry?}`) |
| `Tiers` | Levels of a trade-off. `variant: stack` (+ up to 2 axis wedges), `pyramid`, or `spectrum` (a dial between two ends) | `variant`, `tiers: [{id, title, sub?, icon?}]`, `axes: [{id, label, dir}]`, `ends: [left, right]` |
| `BeforeAfter` | Older name for `Split` (same template) | as `Split` |
| `BigPicture` | Optional, last breakdown scene: 2–4 earlier diagrams frozen on their last frame, tiled; the camera pulls back from panel 1. Usually no headline | `panels: [{id, scene: <earlier diagram scene id>, label?}]` (label ≤16 characters) |
| `Timeline` | Events in time, down the whole stage. `variant: line` (2–6 events) or `lanes` (2–3 lanes, ≤7 events, links between events: messages, logical clocks, waterfalls) | `variant`, `events: [{id, at, label, sub?, icon?, lane?}]`, `lanes: [{id, label}]`, `links: [{id, from, to}]` |
| `MetricChart` | Numbers that fill the stage: `bar` (2–5), `line` (2–5 points), `gauge` (1 value + `max`) | `chart: {type, unit?, max?, data: [{id, label, value, tone?: ok\|warn\|down}]}` |
| `Snippet` | A terminal or code window that types itself: a request, a response, a config, a log | `title?`, `lines: [{id, text, kind?: cmd\|out\|json\|comment}]` (2–8 lines) |
| `Stat` | Hook only: one giant number slams in, then its label | `stat: {id, value (≤7 chars), unit?, label?}`, `sub?: {id, text}` |
| `Zoom` | Diving into one node to show what is inside it | `from: node`, `inside: {nodes: [2–4], links?: [{from, to}]}` |
| `StateMachine` | States and the transitions between them (circuit breaker, leader election, order status) | `states: [{id, label (≤10), icon?, tone?}]` (2–5), `transitions: [{id, from, to, label? (≤14)}]`, `start?` |
| `Tree` | A hierarchy: `variant: tree` (levels down the stage) or `radial` (mind map). ≤3 levels, ≤10 nodes | `variant`, `root: {id, label, icon?, children?: [...]}` |
| `Ring` | Consistent hashing: servers on a ring, keys slide clockwise to the next live server; a `down` server re-homes only its keys | `servers: [{id, label, at}]` (2–5), `keys: [{id, label?, at}]` (1–8); `at` = degrees clockwise from the top |
| `Cells` | Sharding and buckets: items fly into 2–6 cells; a cell can run hot | `cells: [{id, label}]`, `items: [{id, label?, into}]` (1–14) |
| `Stream` | Queues and partitions: messages queue down 1–4 lanes, consumers take one per `step` | `lanes: [{id, label, producer?: icon, consumer?: icon}]`, `messages: [{id, lane, label?}]` (2–12) |
| `Cluster` | Nodes that must agree: leader, acks counted against the majority, a new leader after a failure | `nodes: [{id, type, label}]` (3–5), `leader: id` |
| `Fleet` | Autoscaling: traffic meter + pods whose cpu bars follow traffic ÷ pods | `pods: [{id, label?}]` (2–12), `load: {id, label?, max?, perPod?}`; beats `count` + `args.to` |
| `Map` | Geography: pins on a dot-matrix world, arcs a packet rides, a latency list | `pins: [{id, label, at: [lon, lat], kind?: origin\|edge\|user}]` (2–6), `routes: [{id, from, to, ms?}]` (≤5) |
| `Estimate` | Napkin maths written by hand; the result line is circled | `lines: [{id, text (≤30), result?}]` (2–6) |
| `Chat` | A protocol as a conversation (typing dots, then bubbles) | `actors: [node, node]`, `messages: [{id, from, text (≤40), kind?}]` (2–7) |
| `Diorama` | A top-down mini-world for analogies: rooms and characters that walk between them | `zones: [{id, label, x, y, w, h, icon?}]` (2–5, fractions 0–1), `actors: [{id, icon, label?, at}]` (1–4); `step` + `args.to: zone` |
| `Matrix` | Options × criteria, filled in row by row | `cols: [{id, label, icon?}]` (2–4), `rows: [{id, label, cells: [yes\|no\|partial\|"text"]}]` (2–5) |
| `Slider` | A before / after wipe with a divider | `before` / `after`: `{id, title, nodes (1–4), note?, result? (≤8)}` |
| `Transform` | Something goes into a machine and comes out changed (hash, encrypt, serialize) | `items: [{id, text (≤30), label?}]` (2–4), `via: [{id, label, icon?}]` (one fewer than items) |
| `GistCard` | The one-line takeaway (bite-corner card), plus the Part 2 teaser if there is one | `text`, `accent`, `teaser` |

### Node types
`phone` · `user` · `crowd` · `server` · `db` · `lb` · `cache` · `queue` · `cdn` · `gateway` · `dns` · `storage` · `service` · `internet` · `thirdparty` · **`brand`** (a third-party logo; needs `logo:`)

Any node can take **`icon:`** to swap its picture for one from the icon set (e.g. `lock`, `key`, `file`, `clock`, `cpu`, `disk`, `hot`, `cold`, `check`, `cross`; full list in `engine/src/parts/icons.tsx`).

Families: `outlined` (default, inside our system) · `solid` (outside our system) · `hero` (the topic, max 1). A `brand` node sits the logo on a cream plate, and as a hero it gets an orange ring instead of an orange fill, so the logo is never recoloured. That ring is part of design language v1.1. `/video` adds a new type to the library when a script needs one.

### Verbs
| Verb | Effect |
|---|---|
| `appear` | Pop in (optionally with a staggered group) |
| `highlight` | Make it the focus: ember, with everything else dimmed |
| `dim` / `undim` | Push back or bring forward |
| `state` | `args: {to: idle\|active\|overloaded\|down\|recovered}` |
| `send` | Packets along a link. `args: {kind: request\|response, count}` |
| `flood` | A crowd rushes in toward its target |
| `count` | Animate a counter to its `to` value. **Fleet:** set the traffic level (`args.to`); **MetricChart:** grow a bar / swing the gauge |
| `reveal` | Reveal the next row or card |
| `shake` | Failure shake |
| `reroute` | Traffic moves from one target to others |
| `zoom` | **Zoom:** start the dive (the node grows into the stage) |
| `accent` | Show the script accent text. `args: {text}`, once per episode |
| `step` | **Sequence:** draw the next message (a packet rides the arrow) or show a side note. **Timeline (lanes):** draw a link between two events. **StateMachine:** the token rides a transition. **Transform:** run a machine (the next item appears). **Ring:** a key slides to its server. **Diorama:** a character walks to `args.to` (a zone). **Chat:** a bubble. **Map:** a packet rides a route. **Cells:** an item flies into its cell. **Stream:** a lane's consumer takes one message |
| `branch` | **Decision:** a packet goes through a check. `args: {to: yes\|no}`; the path it takes lights up |
| `race` | **Split (race):** both halves send at once; each result lands when its packet arrives |

### 3b. Plan the visuals from the topic
Before writing scenes, make a **visual plan**: decide the topic's **1–2 core diagrams** (the "spine", e.g. one evolving FlowDiagram, or one Sequence) and add another template **only where the idea genuinely changes kind** (a comparison, a rule or fork, an analogy, levels). Use only the diagram kinds the topic actually has. A single-mechanism topic can be one evolving diagram plus an analogy. Never add a template to tick it off, but **don't repeat the last episode's treatment by default**: the 25 templates and the look exist so each short feels different. If a scene repeats a template the previous episode used in the same place, say why in the plan. Write the plan in the `visual_plan` field (≤300 characters): the spine, and why each other template is there.

The table below is a lookup ("if the scene explains X, use Y"), not a menu to cover. Text templates (Analogy, ThreeCards) are for analogies and short lists, not for mechanisms.
| The scene explains… | Template | e.g. |
|---|---|---|
| Requests moving through parts of a system | `FlowDiagram` | load balancer spreading traffic, a server going down |
| Who talks to whom, in what order | `Sequence` | TCP handshake, login, a cache miss round trip |
| Two ways of doing the same thing | `Split` (`race` when speed is the point) | sync vs async, cache vs no cache, two-tier vs three-tier |
| A rule, a check, a fork | `Decision` | rate limiter, validation, cache hit or miss, retry |
| Levels or a scale with a trade-off | `Tiers` (stack / pyramid / spectrum) | storage tiers, memory hierarchy, consistency levels |
| "X is like Y" | `Analogy` | restaurant = client/server |
| Events in time, or messages between servers over time | `Timeline` (`lanes` for who-did-what-when) | page-load waterfall, logical clocks |
| Numbers: how much, how fast, how many | `MetricChart` (`bar` compare, `line` growth, `gauge` one value) | latency by layer, uptime |
| The thing itself: a request, a response, a config | `Snippet` | `curl` + JSON reply |
| Something with states that change on events | `StateMachine` | circuit breaker, order lifecycle |
| What is inside a box | `Zoom` | the service is a cache + a database |
| A hierarchy or a map of ideas | `Tree` (`radial` for a mind map) | DNS, file systems, "ways to scale" |
| Data changed by a function | `Transform` | hash, encrypt, compress |
| Data spread by a hash, and what happens when a server leaves | `Ring` | consistent hashing |
| Splitting data into buckets or shards, a hot shard | `Cells` | sharding |
| Messages waiting for a consumer | `Stream` | queue, Kafka partitions |
| Servers that must agree, a leader and a majority | `Cluster` | quorum, leader election |
| Servers scaling out under load | `Fleet` | autoscaling, a traffic spike |
| Where things are in the world | `Map` | CDN edges, regions, latency |
| A back-of-envelope number | `Estimate` | requests per second from users |
| A protocol told as a conversation | `Chat` | the handshake as "hello?" / "hello!" |
| A place with people moving through it | `Diorama` | restaurant, post office, library |
| Several options against several criteria | `Matrix` | which database, which protocol |
| Before and after | `Slider` (full-stage wipe; `Split` when both must stay on screen) | with and without a cache |
| A shocking number as the opener | `Stat` (hook) | "400 ms" |
| Three properties or steps | `ThreeCards` | the three things every system needs |
| An idea no template covers (Graph, DataView; see STATUS.md → Diagram roadmap) | the closest built one, and name the better template in the hand-over if one fits | |

The spine can be built up over **up to 5 scenes** with `stage.reuse` (up to 3 for `format` below 1.5), then the script moves on to a different kind only if the idea changes.

**BigPicture: when to use it.** Add one (and only one) as the last breakdown scene when the breakdown described **parts of one system that connect** (a request's journey, a pipeline, an architecture). Skip it for single-mechanism topics (a hash function, one protocol, one rule). Its voiceover is one short line that ties the panels together ("Put it together: ask, check, answer, scale out."), with a `highlight` on each panel as it's named. Pick the panels that tell the story in order; use the last scene of a continued diagram so it's complete. It doesn't count toward the variety rules.

---

## 4. Validation (enforced by `/script` and the engine)
**Hard fails:**
- Measured voiceover length is outside 80–90s
- A headline has more than 5 words, or its `accent` isn't in the text
- More than 3 headline scenes in a row, or no scene without a headline
- More than 1 `accent` beat
- A beat's `on` word isn't in that scene's `vo`
- Unknown template, type or verb, or a beat `sfx` / `music.track` id that isn't in the library
- More than one hero on screen
- Parts are out of order (the branding sting always follows the hook)
- A `brand` node without a logo in `assets/logos/<brand>/` and a `SOURCE.md`
- A logo used outside a diagram node
- A `series` with more than 2 parts, a Part 1 without a `teaser`, or a Part 2 without a `recap`

- A BigPicture that isn't the last breakdown scene before the gist, has other than 2–4 panels, points at a scene that isn't an earlier breakdown diagram, or appears more than once
- A diagram that breaks its template's shape: Sequence with other than 2–3 actors or more than 7 steps in total; Split without both halves or with more than 4 nodes in one; Decision without a start or with other than 1–3 checks; Tiers with other than 2–5 tiers or more than 2 axes; an `icon` not in the set; `step` / `branch` / `race` outside their template

**Variety, `format: "1.6"` and later (hard fails; for 1.5 and older the same checks are warnings):**
- A `look:` is required (`npm run look:assign -- <nnn>`)
- Fewer than **3 kinds of scene transition** in the episode (cut, push, whip, flip, stack, dive, iris; the first scene and the one after the hook count as cuts)
- The same entrance style in **3 scenes in a row** (pop counts)
- The same **3-scene run of fingerprints** (template · entrance · transition · camera) as any of the **last 3 episodes**
- An **Analogy** Idea scene in a **third episode running** (try Diorama, Transform, Zoom, Chat or Slider)
- Everything from 1.5 below still applies

**Variety, `format: "1.5"` and later (the visual plan decides the templates; these rules only stop the extremes):**
- Hard fail: one template used for **more than 3 separate diagrams** in the breakdown (a `reuse` continuation chain counts as ONE diagram; Hook, GistCard and BigPicture never count)
- Hard fail: a `reuse` chain **longer than 5 scenes**
- Hard fail: `visual_plan` missing or empty, or longer than 300 characters
- Warning: **6 or more different templates** in the breakdown (reads like a sampler; does the topic need all of them?)
- Warning: the breakdown's template order (continuations folded in) is identical to the previous episode's
- Warning: two breakdown scenes in a row with the same template that don't continue it (`reuse`) · fewer than half the breakdown scenes are diagrams · a run of 3 templates in the same order as the previous episode

**Variety for `format: "1.3"`–`"1.4"` (unchanged; hard fails for 1.3+, warnings for older):** fewer than 4 different templates in the breakdown (5+ reads better: warning), one template in more than 3 scenes (continuations count), or the same template order as the previous episode.

**Other warnings:** word count far from the target length · a scene over 8s (10s for breakdown scenes) · the narration checks of §1 (`narration.ts`: staccato runs, too few developed sentences, repeated or filler openers, textbook phrasing, more than one question, breakdown scenes that open cold) · fewer beats than one per 2s. The repeat-style warnings above apply to every format. Warnings, not failures: a transition that cannot play (`whip` / `flip` / `stack` / `dive` / `iris` on the first scene or straight after the hook).
