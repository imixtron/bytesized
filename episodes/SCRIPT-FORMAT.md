# Bytesized Script Format — v1.4

> **v1.4, locked (approved by Imad 2026-10-06).** Changes need a versioned update with explicit approval.
> v1.4: an optional **BigPicture** scene (a pull-back over the episode's own diagrams) just before the gist, for whole-system topics. v1.3 approved 2026-10-06.
> v1.3: the wave-1 diagram templates (Sequence, Split, Decision, Tiers) join the menu, **diagrams are picked from the idea** (§3b), and **variety rules** (§4) keep episodes from looking alike. v1.2 approved 2026-10-06.
> v1.2: length 30–60s → **80–90s** (fixed, so every short is consistent and clears TikTok's 60s rewards floor), more breakdown scenes. v1.1 approved 2026-09-29.

Every episode is one `episode.yaml`. The **Script Creator** (`/script`) writes it, and the **Video Creator** (`/video`) turns it into a video. Visuals are chosen from a fixed menu of **templates**, **node types** and **verbs**, so the output is predictable and always on-brand ([design language v1.6](../brand/design-language/DESIGN-LANGUAGE.md)).

---

## 1. Episode rules (3.1)

### Length
| Rule | Value |
|---|---|
| Total length | **80–90s**, including the ~1–2s branding sting. **Never over 90s.** Aim for **85s** so text-to-speech variance stays inside the window |
| Voiceover words | **Guidance only, never a rejection rule.** Roughly `2.5 × (target − 1.5)` words, so ~195 words for 80s, ~210 for 85s and ~220 for 90s. `/script` sizes the script to its chosen target |
| Hard check | The **real voiceover length** measured after text-to-speech must be 80–90s. If it's outside that, trim or extend only the affected scenes' lines and re-voice just those scenes |
| Scenes | 9–15 content scenes (the branding sting is added automatically) |
| Scene length | 3–8s each |
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
- **Tone:** playful and a bit cheeky, with short sentences.

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
- Each new episode gets the **next voice in the roster** (`episodes/voices.json`: Liam → Laura → Jessica → Chris → Liam…). `/script` runs `npm run voice:assign -- <nnn>` right after writing the file.
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
format: "1.3"                          # the script format it was written to; turns the variety rules (§4) into hard fails

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
  speed: 1.0

music:                                 # set by `npm run music:assign -- <nnn>` (omitted → the main theme)
  track: bytesized-theme-2             # a track id from assets/music/library.json (random from episodes/music.json)
  volume: 0.12                         # ducked under the voice automatically

scenes:
  - id: hook                           # unique within the episode
    part: hook                         # hook | idea | breakdown | gist  (branding is automatic)
    template: Hook                     # from the template menu (§3)
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
| `MetricChart` | Growth, latency or uptime numbers | `chart: {type: bar\|line\|gauge, data}` |
| `Zoom` | Zooming into one node to show what's inside | `from`, `into` |
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
| `count` | Animate a counter to its `to` value |
| `reveal` | Reveal the next row or card |
| `shake` | Failure shake |
| `reroute` | Traffic moves from one target to others |
| `zoom` | Camera push toward a node |
| `accent` | Show the script accent text. `args: {text}`, once per episode |
| `step` | **Sequence:** draw the next message (a packet rides the arrow) or show a side note |
| `branch` | **Decision:** a packet goes through a check. `args: {to: yes\|no}`; the path it takes lights up |
| `race` | **Split (race):** both halves send at once; each result lands when its packet arrives |

### 3b. Pick the diagram from the idea
Before choosing a template, name **what kind of idea** the scene explains, then use its template. Text templates (Analogy, ThreeCards) are for analogies and short lists, not for mechanisms.
| The scene explains… | Template | e.g. |
|---|---|---|
| Requests moving through parts of a system | `FlowDiagram` | load balancer spreading traffic, a server going down |
| Who talks to whom, in what order | `Sequence` | TCP handshake, login, a cache miss round trip |
| Two ways of doing the same thing | `Split` (`race` when speed is the point) | sync vs async, cache vs no cache, two-tier vs three-tier |
| A rule, a check, a fork | `Decision` | rate limiter, validation, cache hit or miss, retry |
| Levels or a scale with a trade-off | `Tiers` (stack / pyramid / spectrum) | storage tiers, memory hierarchy, consistency levels |
| "X is like Y" | `Analogy` | restaurant = client/server |
| Three properties or steps | `ThreeCards` | the three things every system needs |
| An idea best shown by a template that isn't built yet (Tree, Chart, Timeline, Zoom, StateMachine, Ring, Cells, Stream, Cluster, Graph, Transform, Snippet, Estimate, Fleet, Map, DataView, Matrix; see STATUS.md → Diagram roadmap) | the closest built one, and name the better template in the hand-over so it counts toward that wave | |

A long mechanism can continue one diagram over up to 3 scenes (`stage.reuse`), then switch to a different kind.

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

**Variety (hard fails for `format: "1.3"` episodes, warnings for older ones):**
- The breakdown uses **fewer than 4 different templates** (5+ reads better: warning)
- One template is used in **more than 3 scenes** (continuations with `reuse` count; Hook and GistCard don't)
- The breakdown's template order (continuations folded in) is **identical to the previous episode's**

**Warnings only:** word count far from the target length · a scene over 8s · fewer beats than one per 2s · two breakdown scenes in a row with the same template that don't continue it (`reuse`) · fewer than half the breakdown scenes are diagrams · a run of 3 templates in the same order as the previous episode.
