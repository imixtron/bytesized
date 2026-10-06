# Bytesized engine

Remotion (React + TypeScript) project. It renders `episodes/<nnn-slug>/episode.yaml` using the locked design tokens in `brand/design-language/tokens.json`. Run every command inside `engine/`.

## Commands
| Command | What it does |
|---|---|
| `npm run voice:assign -- <nnn>` | Gives the episode the next round-robin voice (`episodes/voices.json`) |
| `npm run music:assign -- <nnn> [--force\|--dry-run]` | Picks the episode's theme track at random, never the previous episode's (`episodes/music.json`), and writes `music.track`. Keeps an existing pick unless `--force`. Part 2 reuses Part 1's track |
| `npm run validate [-- <nnn>]` | Checks episodes against SCRIPT-FORMAT v1.2 (80–90s). Uses the measured length once voiced |
| `npm run voice -- <nnn> [--force\|--upgrade]` | ElevenLabs voiceover per scene with word timestamps, cached → `episodes/<nnn-slug>/audio/` |
| `npm run storyboard -- <nnn>` | One still per beat → `episodes/<nnn-slug>/storyboard/storyboard.html`, plus one phone-readable image per section → `storyboard/sections/*.jpg` (`storyboard-sheet` composition), plus contact sheets → `storyboard/contact-*.jpg` |
| `npm run contact -- <nnn>` | Re-makes only the contact sheets from existing storyboard frames: 12 small stills per image, tagged `<n> <scene> <time>` (`contact-sheet` composition). Claude's self-check uses these, not the section images, because an image costs tokens by its pixels |
| `npm run cost [-- <nnn>] [--json\|--line]` | Build cost from `episodes/<nnn-slug>/cost.jsonl`: Claude runs (tokens, API-equivalent $) by stage, and ElevenLabs credits. No number gives every episode plus the total |
| `npm run commit:episode -- <nnn> [--push]` | Commits the episode's recipe plus the shared inputs, never renders or secrets (AGENTS §6). The bridge runner runs it after the final render. `--message "<subject>" --allow-incomplete` takes a mid-pipeline snapshot |
| `npm run render -- ep-<nnn> <out.mp4>` | Draft render (add `--crf=18` for full quality) |
| `npm run render:final -- <nnn>` | Publishable render → `episodes/<nnn-slug>/out/<slug>.mp4`. Refuses if any audio isn't licensed |
| `npm run still -- ep-<nnn> <out.png> --frame=<f>` | One frame, for checking |
| `npm run studio` | Remotion Studio (live preview, galleries, checks) |
| `npm run audio [-- ids] [--list\|--upgrade\|--force]` | Fills the audio library with ElevenLabs, once. Missing items only |
| `npm run voices [-- sample <id>…]` | Lists voices and credits, or renders audition clips to `out/voice-samples/` |
| `npm run make-audio` | Regenerates the procedural placeholder music loop |
| `npm run sync` | Copies `brand/`, `assets/` and `episodes/` into `public/` (generated, never edit it) |
| `npm run typecheck` | TypeScript check |
| `npm run discord -- <gate\|note\|blocked\|failed\|rendered\|status\|close\|state> …` | Posts the pipeline to Discord through the gateway bot (usage at the top of `scripts/discord.ts`, setup in `bridge/README.md`) |
| `npm run cover -- <nnn>` | (v1.6) Cover / thumbnail → `episodes/<nnn-slug>/out/cover.png`: the title + the episode's diagrams |
| `npm run refs -- <Notion ID> <url>… \| --list` | Saves a Notion row's Visual Reference images (signed URLs from the Notion connector) → `bridge/files/notion-<ID>/` (gitignored) |
| `npm run doctor [-- --online]` | Checks a machine is ready: Node, deps, key present, plan, audio files, sync, types, episodes, ffmpeg |

**Typical episode:** `voice:assign` → `music:assign` → `validate` → `voice` → `validate` → `storyboard` ✋ → `render` (draft) → `render:final`.
`engine/plan.json` records which ElevenLabs plan new audio is made on (`free` or `paid`). Only `paid` output is licensed.

## Architecture
```
episode.yaml ─ parse (episode/schema.ts) ─► Episode ─ rules.ts ─► errors / warnings
                                              │
voice.json (measured words) ────────────────► timing/timeline.ts: frames for scenes, words, beats, sting
                                              │
Root.tsx → one composition per episode (ep-001…) → compositions/Episode.tsx
   scenes: templates/*        (Hook, Analogy, FlowDiagram, ThreeCards, GistCard; v1.5: Sequence, Split/BeforeAfter, Decision, Tiers, drawn in panels; v1.6: BigPicture, via PanelGrid)
   parts:  parts/*            (Node, Wires/Packet, Crowd/Counter, icons, Diagram: arrows, step badges, notes, diamonds, chips)
   chrome: chrome/*           (BrandSting, Captions, Chrome = bar/mark/PART tag, SoundLayer)
   values: theme/tokens.ts    (tokens.json; never hard-code a value)
   audio:  audio/library.ts   (assets/{sfx,music}/library.json + sound map)
```
- **Templates still to build** when an episode first needs them: MetricChart, Zoom (BeforeAfter is drawn by Split).
- **v1.5 diagram gallery:** Studio → Gallery → Diagrams-v1-5 (`gallery-diagrams-sheet`, plus one `gallery-<demo>` per variant). Review renders: `engine/out/v1.5-diagrams/`.
- **v1.6:** Studio → Gallery → `preview-bigpicture-003` (a BigPicture added to 003, estimated timing) and Covers → `cover-<nnn>`. Review renders: `engine/out/v1.6-bigpicture/`.
- **Studio folders:** Episodes · Checks (tokens, sting preview) · Gallery (nodes, flow, crowd/counter/icons, Diagrams-v1-5).
- `public/` and `out/` are generated and safe to delete.
