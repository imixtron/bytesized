# Bytesized engine

Remotion (React + TypeScript) project. It renders `episodes/<nnn-slug>/episode.yaml` using the locked design tokens in `brand/design-language/tokens.json`. Run every command inside `engine/`.

## Commands
| Command | What it does |
|---|---|
| `npm run voice:assign -- <nnn>` | Gives the episode the next round-robin voice (`episodes/voices.json`) |
| `npm run validate [-- <nnn>]` | Checks episodes against SCRIPT-FORMAT v1.1. Uses the measured length once voiced |
| `npm run voice -- <nnn> [--force\|--upgrade]` | ElevenLabs voiceover per scene with word timestamps, cached → `episodes/<nnn-slug>/audio/` |
| `npm run storyboard -- <nnn>` | One still per beat → `episodes/<nnn-slug>/storyboard/storyboard.html` |
| `npm run render -- ep-<nnn> <out.mp4>` | Draft render (add `--crf=18` for full quality) |
| `npm run render:final -- <nnn>` | Publishable render → `episodes/<nnn-slug>/out/<slug>.mp4`. Refuses if any audio isn't licensed |
| `npm run still -- ep-<nnn> <out.png> --frame=<f>` | One frame, for checking |
| `npm run studio` | Remotion Studio (live preview, galleries, checks) |
| `npm run audio [-- ids] [--list\|--upgrade\|--force]` | Fills the audio library with ElevenLabs, once. Missing items only |
| `npm run voices [-- sample <id>…]` | Lists voices and credits, or renders audition clips to `out/voice-samples/` |
| `npm run make-audio` | Regenerates the procedural placeholder music loop |
| `npm run sync` | Copies `brand/`, `assets/` and `episodes/` into `public/` (generated, never edit it) |
| `npm run typecheck` | TypeScript check |

**Typical episode:** `voice:assign` → `validate` → `voice` → `validate` → `storyboard` ✋ → `render` (draft) → `render:final`.
`engine/plan.json` records which ElevenLabs plan new audio is made on (`free` or `paid`). Only `paid` output is licensed.

## Architecture
```
episode.yaml ─ parse (episode/schema.ts) ─► Episode ─ rules.ts ─► errors / warnings
                                              │
voice.json (measured words) ────────────────► timing/timeline.ts: frames for scenes, words, beats, sting
                                              │
Root.tsx → one composition per episode (ep-001…) → compositions/Episode.tsx
   scenes: templates/*        (Hook, Analogy, FlowDiagram, ThreeCards, GistCard)
   parts:  parts/*            (Node, Wires/Packet, Crowd/Counter, icons)
   chrome: chrome/*           (BrandSting, Captions, Chrome = bar/mark/PART tag, SoundLayer)
   values: theme/tokens.ts    (tokens.json; never hard-code a value)
   audio:  audio/library.ts   (assets/{sfx,music}/library.json + sound map)
```
- **Templates still to build** when an episode first needs them: BeforeAfter, MetricChart, Zoom.
- **Studio folders:** Episodes · Checks (tokens, sting preview) · Gallery (nodes, flow, crowd/counter/icons).
- `public/` and `out/` are generated and safe to delete.
