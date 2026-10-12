# Bytesized Design Language — v1.11

> **v1.11, locked 2026-10-12 (Batch 4 templates: Fleet, Map, Estimate, Chat, Diorama, Matrix, Slider, and motion looks; approved by Imad). v1.10 (Batch 3 templates), v1.9 (Batch 2 templates + `iris`), v1.8 (Batch 1 templates: Timeline, MetricChart, Snippet, Stat) and v1.7 (motion primitives: per-scene entrance style, transitions and camera) locked the same day. v1.6.1 (focus fades + ghost slots requested by Imad 2026-10-06 after the 003 draft review; BigPicture + cover approved 2026-10-06; v1.5 diagram templates 2026-10-06; v1.4 music 2026-10-01; v1.3 2026-09-29).** Changes need a versioned update (v1.12…) with explicit approval. See the [changelog](#changelog).
> - Machine-readable values: [`tokens.json`](tokens.json). The engine reads this file and never hard-codes values.
> - Visual reference: [`v1.2-reference.png`](v1.2-reference.png) (rendered by the engine) for layout. [`design-language-v1.1.html`](design-language-v1.1.html) is frozen for colour, type and components (it predates the rename, so it still says "bitesized").

## 1. Principles
1. **Charcoal stage, always.** Every scene is on `#222222`. Orange `#C84A27` appears as a full background **only in the branding sting**.
2. **Our logos only in the branding sting**: Bytesized and Back in a Gist together, on orange, for ~1.5s **right after the hook**. The video never opens on a logo and has no end outro. It ends on the gist card.
3. **Corner mark on every charcoal scene**, top-left, under the progress bar.
4. **One focus at a time.** Only one ember/orange element draws the eye per moment. Everything else stays cream or dims.
5. **Diagram-first, playful.** A ByteByteGo-style clarity with a warm, cheeky tone.

## 2. Colour
| Token | Hex | Role |
|---|---|---|
| charcoal | `#222222` | Background |
| surface | `#2C2B29` | Inside of nodes and cards |
| line | `#45423D` | Idle wires, dividers |
| cream | `#F4F0E6` | Main ink |
| cream2 | `#B9B3A6` | Secondary text, labels |
| cream3 | `#77726A` | Dimmed / inactive |
| orange | `#C84A27` | Brand: branding sting, active outlines, hero nodes, hero brand-node ring, progress bar |
| ember | `#E8693F` | Accent **text** and glows on charcoal, request packets |
| ok / warn / down | `#7FB685` / `#E9B44C` / `#E5484D` | **System health only**, always paired with a ✓ ! ✕ badge |

Requests are **ember** packets and responses are **cream** packets.

## 3. Typography
| Role | Font | Size (1080w) | Rules |
|---|---|---|---|
| Headline | Unbounded 800 | 88px | ≤5 words, ≤2 lines, one ember word |
| Caption | Inter 800 | 64px | Taken from the voiceover, 3–5 words per chunk, current word in ember, ≤2 lines |
| Label | JetBrains Mono 700 | 34px | Lowercase, cream2 (`lb-01`, `200 OK`) |
| Accent | Yellowtail | ~120px | Optional, **max once per video**, playful asides |

Minimum text size is 32px. The Canva brand fonts (Holiday, Trend Sans Four) are used only inside the logo files.

## 4. Layout (1080×1920)
- **Horizontal safe area:** x 64–930 (unchanged).
- **Progress bar:** y 48, 866×10, orange, fills linearly. It sits at the very top and may be hidden by platform UI, which is accepted.
- **Corner mark:** 84px at (64, 80). The `PART` tag sits beside it at y 100.
- **Zones:** headline y 200–400 · stage y 440–1370 · captions y 1420–1590. The captions sit below the old safe line on purpose (Imad's call). Check them against the TikTok description overlay.
- **Stage content is centred vertically.** When content doesn't fill the stage, the spare room becomes even whitespace above and below. Diagram rows are never more than 110px apart.
- **Scenes without a headline** can use the headline zone as extra stage (y 200–1370).
- **Flows run top → bottom.**
- **Headlines:** used in most scenes, not all. Skip them on big-visual moments (a full diagram, the gist card). At least one scene per video has no headline, and never more than 3 headline scenes in a row.

## 5. Components
**Node families (what a box *is*):**
| Family | Look | Meaning |
|---|---|---|
| Outlined | Cream outline, surface fill, hatched shadow | **Inside our system**: servers, DBs, caches, queues. The only family that shows states |
| Solid cream | Cream fill, charcoal icon | **Outside our system**: users, third-party APIs, the internet |
| Solid orange (hero) | Orange fill, cream icon | **The episode's topic.** Max 1 on screen |

**Brand node (third-party logos):** the official logo, unaltered, on a **cream plate**. As the hero it gets an **orange ring** (not a fill). Only inside diagrams, never in the sting, corner mark or gist card. Files: `assets/logos/<brand>/`.

**PART tag:** `PART 1/2` in mono (cream2, ember digit) next to the corner mark, on every charcoal scene of a two-part episode.

**States (outlined only):** idle · active (orange outline) · overloaded (warn + !) · down (down + ✕) · recovered (ok + ✓) · dimmed (cream3).

**Other elements:**
- **Node style:** 6px outline, 30px corners, hatched offset shadow (16px, −33°), echoing the GIST logo.
- **Wires:** 6px, rounded. Line colour when idle, cream3 when live.
- **Packets:** 26px glowing dots at ~700px/s.
- **Icons:** 24-grid line icons, 2px rounded strokes. Starter set: server, db, lb, phone, cache, queue, city, box, cop, scale, pulse, gauge.
- **Cards:** same style as nodes. The **gist card** is a cream card with the logo's bite cut from its corner.

## 5b. Diagram templates (v1.5)
Values live in `tokens.json → diagram`. Gallery: Studio → Gallery → Diagrams-v1-5 (approved renders in `engine/out/v1.5-diagrams/`).

- **Panels.** Every diagram template draws its body inside a panel (local coordinates, sized to the stage), so a later BigPicture beat can tile several panels into one composite.
- **Direction.** Flows still run top → bottom, except **Sequence messages and the rows inside Split halves, which run left → right**.
- **No new colours.** Lit paths and the current step badge are orange; wedges and bars reuse the node hatch. ok/warn/down stay system-health only (accepted ✓, rejected ✕, lost ✕).

| Template | Shows | Variants |
|---|---|---|
| **Sequence** | 2–3 actors with dashed lifelines; numbered messages step down over time. The current badge is orange and a packet rides the arrow as it draws | 2 lanes · 3 lanes · side note (done locally) · lost message (✕ halfway) · continues across scenes (`reuse`) |
| **Split** (also draws `BeforeAfter`) | The same idea twice, stacked top/bottom: a title chip and a row of nodes per half. The focused half stays bright, the other dims | compare · race (both send at once; the faster half's result lands first, in ember) |
| **Decision** | Start node, 1–3 question diamonds down a spine, the "yes" outcome below, "no" outcomes to the right. The path a packet takes lights orange | linear checks · shared reject outcome · retry loop (dashed "fix + resend") |
| **Tiers** | Levels of a trade-off | stack + up to 2 tapered axis wedges · pyramid · spectrum dial with a sliding marker |

New verbs: `step` (Sequence), `branch` (Decision, `args.to: yes|no`), `race` (Split). Sound map: step/branch → `pop`, race → `whoosh`. New icons: check, cross, lock, key, file, clock, retry, hot, warm, cold, shield, cpu, disk.

## 5d. Batch 1 templates (v1.8)
Variety plan v2. All four are **full-height**: content spreads over the whole stage instead of sitting in its top half. Same system rules as §5b (panels, focus fades, ghost slots, no new colours).

| Template | Shows | Variants |
|---|---|---|
| **Timeline** | Time down the whole stage. An ember playhead sweeps to each event as it's revealed; the focused event is orange, the rest push back | `line` (2–6 events: time chip · dot · card) · `lanes` (2–3 columns, up to 7 events, `step` draws arrows between events) |
| **MetricChart** | Numbers that fill the stage. Values count up as bars grow; ok/warn/down tones allowed for system health | `bar` (2–5 tall bars) · `line` (drawn point by point) · `gauge` (a needle swings on a half-dial) |
| **Snippet** | A terminal or code window that types lines on, with a blinking cursor; `highlight` gives a line an ember bar | `cmd` (`$` prompt) · `out` · `json` (strings cream, numbers ember) · `comment` |
| **Stat** | The stat-slam opener: a giant number slams in (scale-down, screen jolt, impact ring), then the label rises. Hooks only | number + optional unit, label, sub line |

Verbs: `step` also works in Timeline (`lanes` links); `count` also grows a MetricChart bar or swings the gauge. Sound map unchanged.

## 5e. Batch 2 templates (v1.9)
Same system rules as §5b and §5d (panels, focus fades, ghost slots, full-height layouts, no new colours).

| Template | Shows | Variants |
|---|---|---|
| **Zoom** | One node dives open: on the `zoom` beat it grows until it is the stage, its outline becomes a frame with a title chip, and 2–4 inside parts pop in (optional links) | one node → inside parts |
| **StateMachine** | 2–5 state circles on an ellipse, curved labelled transitions (a pair going both ways bends apart). An ember token rides each `step` and lights the state it arrives in; tones ok / warn / down for system health | circles + transitions |
| **Tree** | A hierarchy (≤3 levels, ≤10 nodes). `highlight` lights the path from the root to a node and pushes the rest back | `tree` (levels down the stage) · `radial` (root in the middle, rings of children) |
| **Transform** | 2–4 items down the stage with a machine (icon + label) between each pair. On `step` the item above flows in, the machine works (jiggle), and the next item's characters scramble then settle | items + `via` machines |

Verbs: `zoom` is Zoom-only (starts the dive); `step` also works in StateMachine (token rides a transition) and Transform (runs a machine). Transition `iris`: a circle opens from the stage centre over the outgoing scene; sound `whoosh`.

## 5f. Batch 3 templates (v1.10)
Same system rules as §5b, §5d and §5e (panels, focus fades, ghost slots, full-height layouts, no new colours). amber (`warn`) marks a hot cell or lane (system health).

| Template | Shows | Variants |
|---|---|---|
| **Ring** | Consistent hashing: 2–5 servers on a ring (by angle), up to 8 keys that slide clockwise to the next live server. A `down` server drops out and only its keys re-home | one ring |
| **Cells** | Sharding and buckets: 2–6 cells, items fly in from the top and stack inside their cell. `state: overloaded` runs a cell hot; `highlight` focuses one | 1 or 2 columns, by cell count |
| **Stream** | 1–4 lanes from producer to consumer. Messages join at the top, slide down and queue up; each `step` on a lane lets its consumer take the next one | partitions / queues |
| **Cluster** | 3–5 nodes around a count chip. A `send` fans a write out from the leader, followers answer ✓, the chip counts acks against the majority ("3/5 committed"). `down` nodes can't answer; the next `highlight` on a node makes it the new leader | one cluster |

Verbs: `step` also works in Ring (a key slides to its server), Cells (an item flies in) and Stream (a consumer takes one); `send` in Cluster fans a write out; `state to: down` re-homes Ring keys and silences Cluster nodes.

## 5g. Batch 4 templates (v1.11)
Same system rules as §5b and §5d–§5f (panels, focus fades, ghost slots, full-height layouts, no new colours).

| Template | Shows | Variants |
|---|---|---|
| **Fleet** | Autoscaling: a traffic meter above a grid of 2–12 pods. Each pod's cpu bar is traffic ÷ pods running (cream, amber above 85%, red above 100%); `reveal` spins a pod up, `count args.to` sets traffic, `state: down` removes one | pods grid |
| **Map** | A dot-matrix world, pins placed by `[lon, lat]` (origin = orange, edge/user = cream), arcs a packet rides, and a latency list that fills in per route | pins + routes |
| **Estimate** | Napkin maths: lines written on left → right in the script font on a tilted dashed card; the `result` line is circled in ember | 2–6 lines |
| **Chat** | A protocol as a conversation: two actors on top, 2–7 bubbles alternating down the stage, typing dots before each. Requests are ember-outlined, responses cream | one conversation |
| **Diorama** | A top-down mini-world for analogies: 2–5 rooms on a dotted floor, 1–4 characters that `step` (`args.to`) between rooms | rooms + characters |
| **Matrix** | Options × criteria: 2–4 columns, 2–5 rows filled one at a time with ✓ / ✕ / ~ (accepted / rejected / partly) or a short word; `highlight` a column or row | grid |
| **Slider** | A before / after wipe: both sides fill the stage (title chip, node column, note, big result) and an ember divider sweeps across on `reveal` of a side | before → after |

Verbs: `count` also sets Fleet traffic (`args.to`); `step` also in Diorama (`args.to: zone`), Chat (a bubble) and Map (a route).

## 5c. BigPicture and the cover (v1.6)
Values live in `tokens.json → bigPicture` and `cover`. Approved renders: `engine/out/v1.6-bigpicture/`.

- **BigPicture beat (optional).** The last breakdown scene, straight before the gist, 3–5s: 2–4 of the episode's own diagrams, **frozen on their last frame**, tiled two across. The camera starts inside panel 1 and pulls back (24 frames) to show how the pieces fit; the rest fade in. Each panel has a number badge on its top border and a short mono label on its bottom border. `highlight` keeps one panel bright and dims the others. Usually no headline (it's a big-visual moment). Use it only when the breakdown described **parts of one system that connect**; skip it for single-mechanism topics.
- **Cover / thumbnail.** One 1080×1920 image per episode: the title (Unbounded, last word in ember) over up to 4 diagram panels: the BigPicture's panels, or, without one, the last frame of each diagram (one per template). Corner mark only: our logos stay in the sting, and there's no end card. `npm run cover -- <nnn>` → `episodes/<nnn-slug>/out/cover.png` (generated, not committed).

## 6. Motion
| Token | Value |
|---|---|
| Pop (enter) | 400ms / 12f, spring with ~8% overshoot |
| Standard | 300ms / 9f, `cubic-bezier(.2,.8,.2,1)` |
| Exit | 200ms / 6f, ease-in (exits are faster than entrances) |
| Stagger | 100ms / 3f |
| Shake (failure) | 300ms, ±6px |
| Bite wipe | 300ms, **branding sting only** |
| Rhythm | A new motion every 1.5–2s, always on a voiceover word |
| Focus fade (v1.6.1) | A change of focus (highlight, dim, the newest card) eases over Standard (300ms). Nothing switches bright ↔ dim in one frame |
| Ghost slots (v1.6.1) | Reveal templates (Analogy, ThreeCards, Tiers) draw faint dashed slots from the first frame; each item pops in over its slot, so the stage is never empty before the first named word |
| Scene change | A `transition` per scene, on a beat: `cut`, `push` (4% camera push), `whip` (horizontal slide with blur), `flip` (card turn), `stack` (new scene rises over the old, which sinks back), `dive` (zoom through the old scene), `iris` (a circle opens over the old scene, v1.9). `whip`, `flip`, `stack`, `dive` and `iris` keep the outgoing scene on screen for `transitionOverlap` (10f). Nothing slides in after the hook (the sting sits there), and the orange bite stays exclusive to the sting |
| Entrance style (v1.7) | A per-scene `enter` sets how nodes arrive and the timing of every pop in that scene: `pop` (default, 12f), `drop` (falls and bounces, 22f), `snap` (slides in tilted from the nearest side, 18f), `stamp` (slams in from larger with an impact ring, 12f), `wipe` (left-to-right reveal, 18f). Springs in `motion.enter.springs` |
| Looks (v1.11) | A **look** is two named motion recipes per episode (`episodes/looks.json`, `npm run look:assign`): each recipe bundles an entrance style, a camera and a list of transitions (`snap`, `draw`, `slam`, `drop`). Scenes that don't set `transition` / `enter` / `camera` take them from the pair: recipes alternate every 2 scenes, transitions cycle through the recipe's list (never the same twice in a row), a continued diagram (`stage.reuse`) stays a cut. Picked at random, never a recipe used by the last 3 episodes where possible |
| Camera (v1.7) | A per-scene `camera`: `still` (default), `drift` (2% scale and 14px pan over the scene), `rack` (dimmed nodes blur 6px instead of only fading) |

## 7. Branding sting (fixed, right after the hook)
~1.5s (45 frames at 30fps, max 2s), orange background, no voiceover, just a "chomp" sound effect.
| Frames | What happens |
|---|---|
| 0–9 | Bite wipe from the top-right, charcoal → orange. The corner mark and progress bar fade out |
| 9–21 | Bytesized logo pops in, then "a segment by" and the Back in a Gist logo (100ms stagger) |
| 21–39 | Hold |
| 39–45 | Logos scale to 96% and fade, then hard cut to the Idea scene on its first word. The mark and bar return |

The video **ends on the gist card**, and its last frame is designed to loop back into the hook. The call to action ("Follow for more") is spoken in the gist voiceover.

## 8. Audio
**Library, generated once and reused.** `assets/music/library.json` and `assets/sfx/library.json` hold each item's prompt (the spec) and its file record: source, plan, licensed, date and credits. `npm run audio` only calls ElevenLabs for items that are missing. Every episode reuses the local files.

| Layer | Rule |
|---|---|
| Voice | ElevenLabs, round-robin voice per episode, volume 1.0 |
| Music | **One of the four sibling theme tracks, picked at random per episode** (`episodes/music.json`; never the previous episode's track, and Part 2 shares Part 1's). All are 75s instrumentals in the same playful, curious, voiceover-friendly brief at 106–116 BPM: `bytesized-theme` (synth plucks + marimba), `-2` (kalimba + brushed drums), `-3` (chiptune lead + vibraphone), `-4` (pizzicato + glockenspiel). `npm run music:assign` stores the pick as the episode's `music.track`, so renders are reproducible. Volume 0.14, **ducked to 45% while the voice speaks** (8-frame ramps), 0.4s fade in, 0.8s fade out. With no pick, `bytesized-theme` plays; the placeholder loop stands in if no theme file exists |
| SFX | Picked automatically by the **sound map**. Scripts don't list sounds |

**Sound map:**
| On screen | Sound | Level |
|---|---|---|
| Branding sting | `chomp` | 0.8 |
| `appear`, `reveal` | `pop` | 0.2 |
| `flood`, `push` transition | `whoosh` (leads the beat by 4 frames) | 0.28 |
| state → overloaded / down / recovered | `warning` / `error` / `success` | 0.35 / 0.4 / 0.35 |
| `count` | `tick` | 0.22 |
| `zoom` | `swoosh-up` | 0.28 |

Repeats of the same sound are at least 6 frames apart. A beat can override the map with `sfx: <id>`, or `sfx: none` to mute it.

**Licensing gate:** only original work and paid-plan ElevenLabs output are marked `licensed`. `npm run render:final` refuses to produce a publishable video if anything audible isn't licensed.

## 9. Copy tone
Playful and slightly cheeky ("every CPU earns its keep"), tuned per episode.

## Changelog
| Version | Date | Change |
|---|---|---|
| v1.11 | 2026-10-12 | §5g Batch 4 templates: Fleet, Map, Estimate, Chat, Diorama, Matrix, Slider (full-height); §6 Looks (motion recipes per episode, `episodes/looks.json`). Approved by Imad 2026-10-12 |
| v1.10 | 2026-10-12 | §5f Batch 3 templates: Ring, Cells, Stream, Cluster (full-height). Approved by Imad 2026-10-12 |
| v1.9 | 2026-10-12 | §5e Batch 2 templates: Zoom, StateMachine, Tree, Transform (full-height), and the `iris` transition (§6). Approved by Imad 2026-10-12 |
| v1.8 | 2026-10-12 | §5d Batch 1 templates: Timeline, MetricChart, Snippet, Stat (full-height). Approved by Imad 2026-10-12 |
| v1.7 | 2026-10-12 | §6 per-scene motion style: transitions (whip, flip, stack, dive), entrance styles (drop, snap, stamp, wipe), camera (drift, rack); sounds reuse whoosh / swoosh-up. `tokens.motion.enter/camera/transitionOverlap`. Approved by Imad 2026-10-12 (variety plan v2, Batch 0) |
| v1.6.1 | 2026-10-06 | §6 focus fades and ghost slots (`motion.focusFade`, `motion.ghost`). Fixes the "snaps at the scene end" / "plays late" feel Imad flagged on the 003 draft |
| v1.6 | 2026-10-06 | §5c BigPicture pull-back beat and the episode cover, `tokens.bigPicture` / `tokens.cover`. Approved by Imad 2026-10-06 |
| v1.5 | 2026-10-06 | §5b wave-1 diagram templates (Sequence, Split, Decision, Tiers), panels, new verbs and icons, `tokens.diagram`. Approved by Imad 2026-10-06 |
| v1.4 | 2026-10-01 | §8 Music: "one channel theme under every short" → one of the four sibling theme tracks (`bytesized-theme`, `-2`, `-3`, `-4`), picked at random per episode (`episodes/music.json`, `npm run music:assign`). Requested by Imad 2026-10-01 |
| v1.3 | 2026-09-29 | Audio library, sound map and licensing gate (approved by Imad) |
