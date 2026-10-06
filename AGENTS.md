# AGENTS.md: how to work on Bytesized

**Bytesized** is the 80–90s vertical-video segment (YouTube Shorts, Instagram Reels, TikTok) of **Back in a Gist** ([backinagist.com](https://backinagist.com/)), run by Imad. It covers playful, diagram-first system-design explainers. Episodes are written as `episode.yaml` and rendered by a Remotion engine with ElevenLabs audio.

Current state and open items: **[STATUS.md](STATUS.md)**. Human to-dos: **[TASKS.md](TASKS.md)**.

---

## 1. Route the prompt

| Imad asks… | Do this |
|---|---|
| "Run the queue", `/queue tick`, `/queue event …` (from the Discord bridge), "review 002", or "approve" / "change …" on a queued episode | **`/queue`** (`.claude/skills/queue/SKILL.md`), following the §1b rules |
| Setting up a new machine | `SETUP.md`, then `npm run doctor` |
| "Make an episode about X", "script X", a topic or notes | **`/script`** (`.claude/skills/script/SKILL.md`), then stop for approval, then **`/video`** |
| "Render / voice / storyboard / finish episode N" | **`/video`** (`.claude/skills/video/SKILL.md`) |
| Change the look, layout, colours, motion or sounds | Propose a **versioned change** to `brand/design-language/DESIGN-LANGUAGE.md` + `tokens.json` (v1.4 → v1.5). Show a render. Apply only after approval |
| Change script rules or structure | Propose a versioned change to `episodes/SCRIPT-FORMAT.md` (v1.5 → v1.6). Apply only after approval |
| New logo, music or sound | Put it in `assets/<asset_type>/…` and register it (logos: `SOURCE.md` + `derived/node.png`; audio: `library.json`) |
| "I subscribed to ElevenLabs" | Walk through TASKS.md → "After subscribing", in order |
| "Publish episode N" | `npm run render:final -- N`, then write `upload.md` (see `/video` step 5) |
| A question or idea | Answer with a recommendation (not a survey), plus the trade-off in one line |

## 1b. Notion queue (topics → episodes)
**Database:** Back in a gist → Bytesized → Shorts. Data source `collection://2a331e0f-b686-80a9-9213-000bae1d96ff`. Use the Notion connector.

**Columns:** `ID` (auto) · `Topic` (title) · `Category` · `Engineering Level` · `Reel Hook` · `Outline` · `Visual Reference` (optional reference images, Imad's; the queue saves them to `bridge/files/notion-<ID>/` and `/script` maps them to templates) · `status` (Imad sets only Idea and Published) · `Pipeline Status` (**Claude only**) · `AI Notes` (**Claude only, append-only log**).
- Topic, Reel Hook, Outline and Engineering Level are `/script`'s inputs: the hook seed, the breakdown points and the depth. They're Imad's words: use them, never overwrite them.

**`status` map (maintain exactly):**
| status | Who sets it | Meaning |
|---|---|---|
| **Not started** | Imad | **Do not touch.** Not in the queue, however complete the row looks |
| **Idea** | Imad | Ready to be picked up |
| **In progress** | Claude | Work is happening on it right now |
| **Awaiting Approval** | Claude | A gate needs Imad (any one or several). Nothing moves until he approves |
| **Draft Ready** | Claude | The draft is made: the **final stage**. Once approved it goes straight to Rendered, never back to Awaiting Approval |
| **Rendered** | Claude | The final publishable render exists |
| **Published** | Imad | Posted on the platforms. Never set by Claude |

**`Pipeline Status` (Claude updates it after every stage), and the `status` it goes with:**
| Pipeline Status | status | Stage |
|---|---|---|
| Queued | In progress | Picked up from Idea |
| Scripting | In progress | `/script` writing and validating |
| Script Review | **Awaiting Approval** | Script gate |
| Building Parts | In progress | `/video` building a missing template or part |
| Parts Review | **Awaiting Approval** | New part gate (only when something was built) |
| Voicing | In progress | ElevenLabs voiceover |
| Storyboarding | In progress | Storyboard + self-check |
| Storyboard Review | **Awaiting Approval** | Storyboard gate |
| Rendering Draft | In progress | Full-quality draft |
| Draft Review | **Draft Ready** | Imad reviews the draft in the session. Approve → final render → Rendered |
| Final Rendering | **Draft Ready** (unchanged) | `render:final` after the draft is approved |
| Rendered | **Rendered** | Publishable file + `upload.md` done |
| Blocked | Awaiting Approval | Needs Imad for something other than a review (missing logo, unlicensed audio, paid plan). The reason goes in AI Notes |
| Failed | Awaiting Approval | An error Claude couldn't fix. The error and where it happened go in AI Notes |

**Approvals happen in Discord** (Imad's private server, through the gateway bot; setup in `bridge/README.md`). No approvals through Notion comments or status changes.
- Each episode has one Discord **thread**. At a gate (Script, Parts, Storyboard or Draft Review), Claude sets the Notion status, appends to AI Notes, **posts the review to the thread** with `npm run discord -- gate …` (it pings Imad), and **ends the run**. Nothing waits in a session.
- Imad answers with the buttons: **Approve**, or **Request changes** (notes + optional reference images). The bridge saves the click and starts a new headless Claude run (`/queue event …`), which checks the click matches the open gate, then acts and continues to the next gate or to the end.
- Clicks on an older round are ignored ("outdated" reply). Only Imad's Discord user can answer.
- An interactive session can still say "review 002" or "approve"; it follows the same rules and closes the open Discord form.
- **Draft Review is special:** on approval, run the final render and set `status` → **Rendered** directly. Changes to a draft (rare): `status` → In progress, revise, then back to **Draft Ready**.
- Blockers and failures go to the thread with **Retry / Fixed, continue / Reply** buttons.
- Imad only ever sets **Idea** and **Published** in Notion. Everything else is Claude's.

**AI Notes is an append-only log.** Never edit or delete earlier lines. Add one line per stage change, newest at the bottom, in this format:
`YYYY-MM-DD HH:MM · <from> → <to> · <what happened> · <numbers/files>`
e.g. `2026-10-02 09:14 · Scripting → Script Review · 002-what-is-a-cache · Laura · 96 words, ~41s est · episodes/002-what-is-a-cache/episode.yaml`
Log approvals ("approved by Imad in session"), changes requested, credits spent, measured length, blockers and errors on their own lines.

**Scheduled runs (the bridge's tick at 00/06/12/18, `/queue tick`): one row at a time, taken to completion (WIP limit 1).** The bridge runs every Claude run (ticks and clicks) one at a time on the Mac mini, so two runs never overlap.
- **Is there an active row?** That's any row whose `status` is In progress, Awaiting Approval or Draft Ready. If so, **don't pick anything new, and don't touch it.** It's either being worked on or waiting for Imad in Discord. Post a one-line status to the channel and exit, which costs almost nothing.
  - Exception: if it's been In progress with no new AI Notes line for more than 12h, the run probably died. Append a note, set Pipeline Status → Failed (status → Awaiting Approval), post it to Discord, and exit.
- **No active row?** First, any episode marked `rebuild v1.2` in `episodes/INDEX.md` (002, then 001) is rebuilt to 80–90s through the same gates (`/queue` §1b). Otherwise take the `Idea` with the lowest ID, set it In progress / Queued, and run it until the first gate (Script Review), post it to Discord and end. No Idea → post "No new idea" to the channel.
- **After a render**, Discord asks "Start the next Idea now?". **Yes** runs the pick-up straight away. **No**, or no answer, leaves it to the next tick.
- **Rules:**
  - never touch Not started
  - never set Idea or Published
  - never spend ElevenLabs credits before the script is approved
  - update Pipeline Status and append to AI Notes at every stage, including on an error

## 2. How Imad likes to work
- **Approval gates.** Nothing is final (design, logo, script format, episode script, storyboard, final render) until Imad explicitly says so. Present options with **your recommendation first**, then wait.
- **Show, don't describe.** Send renders, stills, galleries and audio. **Check your own output first**: render stills, look at them, and fix overlaps and awkward timing before sending.
- **Be concise.** Tables and short bullets. Say what changed, what it cost (credits) and what's needed from him.
- **Keep the trackers current** after every meaningful step: `STATUS.md` (state plus a one-line changelog), `TASKS.md` (human to-dos, with exact commands), `episodes/INDEX.md` (per-episode status).
- **Human tasks go in TASKS.md**, explicit and ordered, with copy-paste commands.
- **Spend credits carefully.** Everything is cached or generated once. Say the credit cost before and after any ElevenLabs call. Free-plan output is draft-only.
- **Do small, obvious fixes yourself.** Ask only when the answer changes what you'd do.

## 3. Brand and content rules (always)
- **Name:** "Bytesized" (renamed from "Bitesized"; the project folder is still `bitesized/` until the end-of-project rename task).
- **Charcoal `#222222` stage for every scene.** The orange `#C84A27` background appears only in the **branding sting**.
- **Logos:** the Bytesized and Back in a Gist logos appear **together, only in the ~1.5s orange branding sting straight after the hook**. No logo intro and no end outro. The video ends on the gist card. Never recolour the Back in a Gist logo.
- **Corner mark and progress bar** at the very top of every charcoal scene.
- **Structure:** Hook → (sting) → Idea → Breakdown ×6–12 → Gist. **80–90s** measured, never over 90s. Big topics → Part 1 / Part 2 (max 2).
- **Third-party logos** (e.g. Netflix) only as a `brand` node inside diagrams, unaltered, from the official kit, and never implying sponsorship. The upload description carries the "not affiliated" line.
- **Voices:** round robin of Liam → Matilda → Jessica → Chris (`episodes/voices.json`, `npm run voice:assign`). Part 2 reuses Part 1's voice.
- **Music:** one of four sibling theme tracks (`bytesized-theme`, `-2`, `-3`, `-4`) per short, picked at random by `npm run music:assign` (`episodes/music.json`; never the previous episode's, Part 2 reuses Part 1's). **SFX** come from the sound map, never listed per script, with a beat `sfx:` override only for exceptions.
- **Licensing:** only paid-plan ElevenLabs output or original work is `licensed`. `render:final` enforces it. Never bypass it.
- **Fonts:** Holiday and Trend Sans Four (Canva) are used only inside logo files. Video text uses Unbounded, Inter, JetBrains Mono and Yellowtail.

## 4. Where the truth lives (read these, don't restate them)
| Topic | File |
|---|---|
| Look, layout, motion, audio rules (v1.4) | `brand/design-language/DESIGN-LANGUAGE.md` |
| Every value the engine uses | `brand/design-language/tokens.json` |
| Episode rules, `episode.yaml` format, menus, validation (v1.2) | `episodes/SCRIPT-FORMAT.md` |
| Reference episode (approved pilot) | `episodes/001-what-is-system-design/episode.yaml` |
| Engine commands and architecture | `engine/README.md` |
| Episode statuses | `episodes/INDEX.md` |
| Tricky pronunciations | `episodes/pronunciations.md` |
| Voice and music rotation | `episodes/voices.json`, `episodes/music.json` |
| Audio library (prompts, provenance, licence) | `assets/sfx/library.json`, `assets/music/library.json` |
| ElevenLabs plan for new audio | `engine/plan.json` |

## 5. Repo map
```
AGENTS.md  STATUS.md  TASKS.md  SETUP.md   ← start here
brand/
  bytesized/          logo SVG/PNG (outlined text) + build_assets.py to rebuild
  back-in-a-gist/     parent logo (on orange only)
  design-language/    DESIGN-LANGUAGE.md · tokens.json · v1.1 frozen page · v1.2 layout reference
assets/<asset_type>/  logos/<brand>/ · music/ · sfx/   (each audio folder has library.json)
episodes/             SCRIPT-FORMAT.md · INDEX.md · voices.json · pronunciations.md
  <nnn-slug>/         episode.yaml · audio/ (voice + voice.json) · storyboard/ · out/
engine/               Remotion + TypeScript (src/theme, chrome, parts, templates, episode, timing, audio, voice)
bridge/               Discord bridge: Docker webhook receiver + 6h tick, host runner (launchd → claude -p), manifest. See bridge/README.md
.claude/skills/       script/ · video/ · queue/
.claude/settings.json pre-approved commands and Notion tools for unattended runs (secrets denied)
```

## 6. Engineering conventions
- **Tokens only:** components read colours, sizes and timings from `src/theme/tokens.ts`, never from literals.
- **Build into the library, never one-offs:** new templates go in `src/templates/` (registered in `index.tsx`), parts in `src/parts/`, icons in `ICONS`. Add them to a gallery composition and check a still.
- **Verify** with `npx tsc --noEmit`, `npm run validate`, and rendered stills you've actually looked at.
- **`npm run sync`** after changing `brand/`, `assets/` or `episodes/`. `engine/public/` and `engine/out/` are generated and disposable.
- **Secrets:** never read, print or commit `engine/.env` (the ElevenLabs key). Only check that the key name exists.
- **Pin dependency versions** (Remotion 4.0.529 packages all at the same version).
- **Commit the recipe, not the render.** Each episode commits everything needed to rebuild its video: `episode.yaml`, `audio/` (voice mp3s + `voice.json` timings), `storyboard/`, `out/upload.md`, plus any shared inputs it changed (`assets/` audio + `library.json`, `episodes/voices.json`, `episodes/music.json`, `pronunciations.md`, `INDEX.md`, `engine/plan.json`, new templates/parts in `engine/src/`, `brand/`). Never commit `out/*.mp4`, `engine/public/`, `engine/out/`, `node_modules/` or `.env`: the MP4 is rebuilt with `npm run render:final`. Commit **and push to `main`** only once, as the last step of episode creation, with **`npm run commit:episode -- <nnn> --push`** (`/video` step 7; the bridge runner runs it after the final render). It stages exactly these paths and refuses renders and secrets. No force-push.
- **Build cost** per episode is in `episodes/<nnn-slug>/cost.jsonl` (Claude tokens and $ per bridge run, from the runner, and ElevenLabs credits, from `npm run voice`). It's committed with the episode. `npm run cost [-- <nnn>]` prints it by stage and in total.
- **zsh:** list loop items explicitly (a `$VAR` with spaces doesn't split).
- Commands run from `engine/`. The full list is in `engine/README.md`.

## 7. Don'ts
- Don't finalise anything without Imad's sign-off, or silently change a locked doc.
- Don't show our logos outside the sting, or third-party logos outside diagram nodes.
- Don't publish, or suggest publishing, unlicensed audio.
- Don't regenerate ElevenLabs audio that's already cached (unless it's `--upgrade` or intended).
- Don't `git add -A`, commit renders or secrets, push mid-pipeline, or force-push.
- Don't spread status notes across new files. Update STATUS.md, TASKS.md and INDEX.md.
