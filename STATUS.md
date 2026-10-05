# Bytesized: status

_Last updated 2026-10-05. Replaces the old PLAN.md and PROGRESS.md._

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
| Notion queue | ✅ `/queue` skill, `Pipeline Status` + `AI Notes` columns, status map (AGENTS.md §1b). ✅ Mac mini set up |
| Discord | ✅ **Approvals in Discord** (`bridge/`): gateway integration `bytesized`, `bytesized-bridge` container (webhooks + 6h tick at 00/06/12/18), launchd runner → `claude -p`. Thread per episode, script card, storyboard section images, draft MP4, Approve / Request changes. Desktop scheduled task paused |
| Episode 002 | ✅ **Final rendered**: Monolith vs Microservices (Notion #1, Laura, 38.1s, 512 credits, `out/upload.md`) · ready to publish |
| Next | Publish the pilot and 002 · next Idea via Discord "Start the next Idea now?" or the next tick |

## Key decisions (the why, in one line each)
- **Remotion + TypeScript**, one `episode.yaml` per episode, visuals only from fixed menus, so output is predictable and on-brand.
- **Logos after the hook, not at the start or end:** retention research says hook first. The sting is the brand moment.
- **Charcoal everywhere, orange only for the sting:** the brand rule is that our logos always sit on orange.
- **30–60s** (was under 30s): room to explain properly. Topics too big for 60s split into two parts.
- **Round-robin voices** keep the channel lively. **One theme track** makes it recognisable by ear.
- **Generate audio once, reuse it; licensing gate on final renders:** saves credits and prevents publishing free-plan audio.
- **Captions sit below the old TikTok safe line** (Imad's call, for more content room). Check this on the phone.

## ElevenLabs
- Plan: **Creator (paid)** (`engine/plan.json` = paid) since 2026-10-01. 128,974 credits at start; ≈ 6,100 spent (themes ×4 + preview, SFX, pilot re-voice, 002 voice 512) → ≈ 122.9k left.
- Key permissions: Text to Speech, Voices: Read, Sound Effects, Music Generation, User: Read, Models: Read, Pronunciation Dictionaries.

## Changelog (condensed)
- **2026-09-29:** Project set up. Logo, design language v1.0 → v1.3, script format v1.0 → v1.1 and the Remotion engine built. Pilot voiced (Liam, 41.9s), storyboarded and approved, and the draft rendered. Renamed Bitesized → Bytesized. Audio library + 8 draft SFX. `/script` and `/video` skills. Repo cleaned up, docs consolidated into AGENTS / STATUS / TASKS. Notion queue designed: status map, and Pipeline Status + AI Notes columns created. Pushed to github.com/imixtron/bytesized. Added `/queue`, SETUP.md, `npm run doctor` and `.claude/settings.json`.
- **2026-09-30:** Mac mini set up via SETUP.md (Node 26 via Homebrew, `npm ci`, `engine/.env`, doctor ✔ ready, pilot re-rendered 41.96s, Notion queried). 6-hour "Bytesized queue" scheduled task created. #3 (pilot) is the first Idea. 06:08 scheduled run: #3 linked to 001, moved to Draft Review / Draft Ready.
- **2026-10-01:** ElevenLabs Creator plan. `plan.json` → paid, doctor --online ✔. Generated `bytesized-theme` (+ preview), upgraded 8 SFX, re-voiced the pilot (Liam, 37.8s speech, 41.7s measured), ≈ 2,200 credits. Library fully licensed. Draft re-rendered for #3 Draft Review.
- **2026-10-01 (later):** Pilot draft approved → `render:final` (41.75s, 5.7 MB) + `upload.md`, Notion #3 Rendered. 3 sibling themes (`bytesized-theme-2/3/4`, 3,375 credits) + `episodes/music.json` + `npm run music:assign` (random, no repeat); design language v1.4. New rule: commit the recipe (yaml, audio, storyboard, upload.md) and push to `main` at the end of each episode. Pinned zod 4.5.4 for Remotion.
- **2026-10-02:** 00:08 scheduled run picked up Notion #1 "Monolith vs Microservices" → episode 002 scripted (Laura, `bytesized-theme-4`, 88 words, ~44s est, validate ✔). At Script Review.
- **2026-10-02 (later):** 002 script approved. Voiced (Laura, 34.1s speech, 38.1s measured, 512 credits). Storyboard self-check fixes: quoted a YAML value with a comma, headline "One job each" (was 3 lines), hook flood earlier + shake (hero can't show overloaded), dropped dim on solid phones (no visible effect).
- **2026-10-02 (later):** 002 storyboard change from Imad: the hook no longer copies the pilot's node + crowd look. It's now a FlowDiagram where the monolith shakes and splits into users/payments/search. 0 credits (VO unchanged). Back at Storyboard Review.
- **2026-10-02 (later):** 002 storyboard approved → full-quality draft rendered (1143 frames, 38.1s, 5.0 MB, `out/monolith-vs-microservices-draft.mp4`). Draft Review / Draft Ready.
- **2026-10-02 (later):** 002 draft changes from Imad (beats out of sync). Engine fix in `FlowDiagram`: wires stay hidden until both ends appear (was 20% ghost wires), and no packets go into a down node (queued, ambient and in-flight). Re-timed 002 beats (hook split on "just", Analogy rows highlight as they're named). 0 credits. Redrafted (38.1s). Note: re-rendering 001 would now pick up the FlowDiagram fix too.
- **2026-10-05:** Discord approvals. `bridge/` (manifest + register, Docker webhook receiver + 6h tick, launchd runner that starts `claude -p "/queue tick|event …"` one at a time), `npm run discord` (gates, notes, blockers, rendered + "start next idea?"), `storyboard-sheet` composition + `storyboard/sections/*.jpg`. `/queue` and AGENTS §1b: gates post to Discord and end the run. Tested live: headless tick read Notion + posted, signature/dedupe checks, 002 draft gate posted (`002:draft:r1`). Desktop "Bytesized queue" task paused. 0 credits.
- **2026-10-05 (later):** 002 draft approved in Discord (first live click, `002:draft:r1`) → `render:final` (38.1s, 5 MB, licensing ✔) + `upload.md`. Notion #1 Rendered. 512 credits total, nothing new in the library this run.
