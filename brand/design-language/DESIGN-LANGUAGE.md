# Bytesized Design Language — v1.3

> **v1.3, locked (approved by Imad 2026-09-29).** Changes need a versioned update (v1.4…) with explicit approval.
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
| Scene change | Hard cut or camera push, on a beat |

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
| Music | **The same channel theme under every short** (`bytesized-theme`, 75s instrumental, playful 112 BPM tech). Volume 0.14, **ducked to 45% while the voice speaks** (8-frame ramps), 0.4s fade in, 0.8s fade out. The placeholder loop stands in until the theme exists |
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
