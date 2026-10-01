# Bytesized: status

_Last updated 2026-10-01. Replaces the old PLAN.md and PROGRESS.md._

## Where we are
| Area | State |
|---|---|
| Brand | ✅ Bytesized logo ("The Bite") + Back in a Gist logo, both vector |
| Design language | ✅ **v1.4 locked** (music: 4 sibling themes, random per episode; charcoal stage, orange sting after the hook, top bar and mark, centred stage, lower captions, audio library and sound map) |
| Script format | ✅ **v1.1 locked** (Hook → sting → Idea → Breakdown → Gist, 30–60s, Part 1/2, beat `sfx:` override) |
| Engine | ✅ Remotion engine: 5 of 8 templates built (Hook, Analogy, FlowDiagram, ThreeCards, GistCard). BeforeAfter, MetricChart and Zoom get built when an episode needs them |
| Audio | ✅ ElevenLabs voiceover with word timing · round-robin voices · 8 SFX + 4 sibling theme tracks (random per episode, `episodes/music.json`), all paid-plan and ✔ licensed |
| Skills | ✅ `/script`, `/video` and `/queue` |
| Pilot (ep 001) | ✅ **Final rendered and locked** (41.75s, paid audio, `out/upload.md`) · Notion #3 Rendered · ready to publish |
| Notion queue | ✅ `/queue` skill, `Pipeline Status` + `AI Notes` columns, status map (AGENTS.md §1b). ✅ Mac mini set up · **"Bytesized queue" schedule live** (every 6h at 00/06/12/18). First up: #3 (the pilot) |
| Next | Publish the pilot · mark the next Notion row **Idea** · each episode ends with a commit + push to `main` (AGENTS §6) |

## Key decisions (the why, in one line each)
- **Remotion + TypeScript**, one `episode.yaml` per episode, visuals only from fixed menus, so output is predictable and on-brand.
- **Logos after the hook, not at the start or end:** retention research says hook first. The sting is the brand moment.
- **Charcoal everywhere, orange only for the sting:** the brand rule is that our logos always sit on orange.
- **30–60s** (was under 30s): room to explain properly. Topics too big for 60s split into two parts.
- **Round-robin voices** keep the channel lively. **One theme track** makes it recognisable by ear.
- **Generate audio once, reuse it; licensing gate on final renders:** saves credits and prevents publishing free-plan audio.
- **Captions sit below the old TikTok safe line** (Imad's call, for more content room). Check this on the phone.

## ElevenLabs
- Plan: **Creator (paid)** (`engine/plan.json` = paid) since 2026-10-01. 128,974 credits at start; ≈ 5,600 spent (themes ×4 + preview, SFX, pilot re-voice) → ≈ 123k left.
- Key permissions: Text to Speech, Voices: Read, Sound Effects, Music Generation, User: Read, Models: Read, Pronunciation Dictionaries.

## Changelog (condensed)
- **2026-09-29:** Project set up. Logo, design language v1.0 → v1.3, script format v1.0 → v1.1 and the Remotion engine built. Pilot voiced (Liam, 41.9s), storyboarded and approved, and the draft rendered. Renamed Bitesized → Bytesized. Audio library + 8 draft SFX. `/script` and `/video` skills. Repo cleaned up, docs consolidated into AGENTS / STATUS / TASKS. Notion queue designed: status map, and Pipeline Status + AI Notes columns created. Pushed to github.com/imixtron/bytesized. Added `/queue`, SETUP.md, `npm run doctor` and `.claude/settings.json`.
- **2026-09-30:** Mac mini set up via SETUP.md (Node 26 via Homebrew, `npm ci`, `engine/.env`, doctor ✔ ready, pilot re-rendered 41.96s, Notion queried). 6-hour "Bytesized queue" scheduled task created. #3 (pilot) is the first Idea. 06:08 scheduled run: #3 linked to 001, moved to Draft Review / Draft Ready.
- **2026-10-01:** ElevenLabs Creator plan. `plan.json` → paid, doctor --online ✔. Generated `bytesized-theme` (+ preview), upgraded 8 SFX, re-voiced the pilot (Liam, 37.8s speech, 41.7s measured), ≈ 2,200 credits. Library fully licensed. Draft re-rendered for #3 Draft Review.
- **2026-10-01 (later):** Pilot draft approved → `render:final` (41.75s, 5.7 MB) + `upload.md`, Notion #3 Rendered. 3 sibling themes (`bytesized-theme-2/3/4`, 3,375 credits) + `episodes/music.json` + `npm run music:assign` (random, no repeat); design language v1.4. New rule: commit the recipe (yaml, audio, storyboard, upload.md) and push to `main` at the end of each episode. Pinned zod 4.5.4 for Remotion.
