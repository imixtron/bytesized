# Bytesized: status

_Last updated 2026-09-29. Replaces the old PLAN.md and PROGRESS.md._

## Where we are
| Area | State |
|---|---|
| Brand | ✅ Bytesized logo ("The Bite") + Back in a Gist logo, both vector |
| Design language | ✅ **v1.3 locked** (charcoal stage, orange sting after the hook, top bar and mark, centred stage, lower captions, audio library and sound map) |
| Script format | ✅ **v1.1 locked** (Hook → sting → Idea → Breakdown → Gist, 30–60s, Part 1/2, beat `sfx:` override) |
| Engine | ✅ Remotion engine: 5 of 8 templates built (Hook, Analogy, FlowDiagram, ThreeCards, GistCard). BeforeAfter, MetricChart and Zoom get built when an episode needs them |
| Audio | ✅ ElevenLabs voiceover with word timing · round-robin voices · 8 draft SFX (free plan) · theme track waits on the paid plan (Music API is paid-only) |
| Skills | ✅ `/script` and `/video` |
| Pilot (ep 001) | Storyboard ✅ approved · full-quality draft rendered · **final waits on paid-plan audio** |
| Notion queue | ✅ `/queue` skill, `Pipeline Status` + `AI Notes` columns, status map (AGENTS.md §1b). ⏳ The 6h schedule gets created on the Mac mini (SETUP.md §6) |
| Next | Mac mini setup (SETUP.md) · mark the first Notion row **Idea** · post-subscription checklist (TASKS.md) |

## Key decisions (the why, in one line each)
- **Remotion + TypeScript**, one `episode.yaml` per episode, visuals only from fixed menus, so output is predictable and on-brand.
- **Logos after the hook, not at the start or end:** retention research says hook first. The sting is the brand moment.
- **Charcoal everywhere, orange only for the sting:** the brand rule is that our logos always sit on orange.
- **30–60s** (was under 30s): room to explain properly. Topics too big for 60s split into two parts.
- **Round-robin voices** keep the channel lively. **One theme track** makes it recognisable by ear.
- **Generate audio once, reuse it; licensing gate on final renders:** saves credits and prevents publishing free-plan audio.
- **Captions sit below the old TikTok safe line** (Imad's call, for more content room). Check this on the phone.

## ElevenLabs
- Plan: **free** (`engine/plan.json`). Used ≈ 1,630 of 10,000 credits.
- Key permissions: Text to Speech, Voices: Read, Sound Effects, Music Generation, User: Read, Models: Read, Pronunciation Dictionaries.

## Changelog (condensed)
- **2026-09-29:** Project set up. Logo, design language v1.0 → v1.3, script format v1.0 → v1.1 and the Remotion engine built. Pilot voiced (Liam, 41.9s), storyboarded and approved, and the draft rendered. Renamed Bitesized → Bytesized. Audio library + 8 draft SFX. `/script` and `/video` skills. Repo cleaned up, docs consolidated into AGENTS / STATUS / TASKS. Notion queue designed: status map, and Pipeline Status + AI Notes columns created. Pushed to github.com/imixtron/bytesized. Added `/queue`, SETUP.md, `npm run doctor` and `.claude/settings.json`.
