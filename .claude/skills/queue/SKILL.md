---
name: queue
description: Runs the Bytesized Notion queue (Back in a gist → Bytesized → Shorts). One row at a time: picks the next Idea, drives it through /script and /video, keeps Notion's status, Pipeline Status and AI Notes in sync, and posts every review gate to Discord, where Imad approves or requests changes. Use for the 6-hour tick, Discord events from the bridge, "run the queue", "review <nnn>", or "approve" / "change …" on a queued episode.
---

# /queue: Notion topics → finished episodes

The rules live in **AGENTS.md §1b** (status map, Pipeline Status map, approvals, AI Notes, WIP limit 1). This skill is the procedure. If they ever disagree, AGENTS.md wins.

## Constants
- Data source: `collection://2a331e0f-b686-80a9-9213-000bae1d96ff`
- Properties (exact names): `Topic` (title), `ID`, `Category`, `Engineering Level`, `Reel Hook`, `Outline`, `Visual Reference` (optional files), `status`, `Pipeline Status`, `AI Notes`
- `status` options: `Not started` · `Idea` · `In progress` · `Awaiting Approval` · `Draft Ready` · `Rendered` · `Published`
- Episode ↔ row link: the `Notion ID` column in `episodes/INDEX.md`, plus the folder named in AI Notes.
- Discord: `npm --prefix engine run discord -- <command>` (usage at the top of `engine/scripts/discord.ts`; how it fits together: `bridge/README.md`). Open forms per episode: `npm --prefix engine run discord -- state <nnn>`.

## Running unattended (no permission prompts)
Every run is unattended: the bridge starts it with `claude -p`, and nobody is watching the session. It must only ever end at a review gate (posted to Discord) or at the end of the work, never on a permission prompt, and it **never waits for input**. `.claude/settings.json` pre-approves file edits (`acceptEdits`) and the commands below, so stay inside them:
- **Change files with the Edit/Write tools only.** Never `sed -i`, `python3 -c`, `python3 -` heredocs, `awk` or `perl` rewrites, and never `echo >`/`cat >` redirects.
- **Read with the Read/Grep/Glob tools** (or plain `cat`, `grep`, `ls`, `head`, `tail`, `find`, `wc`).
- **Engine and Discord commands:** `npm --prefix engine run <script> -- <args>` from the repo root, or `npm run …`/`npx remotion …`/`npx tsc …` from `engine/`. Don't chain with `&&`/`;`/pipes into unlisted commands, and don't add `export PATH=…` (npm is already on PATH).
- **Git:** only the forms in AGENTS.md §6 (`git add <explicit paths>`, `git commit`, `git push origin main`).
- If a step truly needs a command that isn't covered, use the closest covered form. If there is none, note it in AI Notes, post it with `discord -- alert`, and say which rule to add to `settings.json`. Don't work around the deny list.

## 0. Entry: what was asked?
| Invocation | Go to |
|---|---|
| `/queue tick` (the bridge's 6-hour tick), or "run the queue" | **§1** |
| `/queue event bridge/processing/<file>.json` (Imad clicked in Discord) | **§5** |
| "review 002" (or `ID 16`) in an interactive session | Find the row and episode, re-post its current gate to Discord (§4) and show it in the session |
| "approve" / "change …" typed in an interactive session at a gate | Treat it exactly like the Discord click (§5), then close the open Discord form: `discord -- close <nnn>` |

## 1. Look for an active row (WIP limit 1)
First, if a "Start the next Idea now?" question is still open, close it: `discord -- close next` (the tick takes over from it).

Query with the Notion connector's data-source query tool (SQL mode):
```sql
SELECT url, "userDefined:ID" AS id, "Topic", "status", "Pipeline Status", "AI Notes"
FROM "collection://2a331e0f-b686-80a9-9213-000bae1d96ff"
WHERE "status" IN ('In progress', 'Awaiting Approval', 'Draft Ready')
```
- **There is one** → don't start anything new. It's waiting for Imad in Discord, or another run is working on it.
  - Stale check: `status` = In progress and the **last AI Notes line is more than 12h old**. Then append a `… → Failed · run went quiet >12h` line, set Pipeline Status → `Failed` and status → `Awaiting Approval`, post `discord -- failed <nnn> "<what was running, and that Retry resumes it>"`, and **stop**.
  - Otherwise post one line, `discord -- status "Queue busy: #<ID> <Topic> at <Pipeline Status>"`, and **stop**. Don't touch the row.
- **None** → §1b.

## 1b. Rebuilds to script format v1.2 (before any new Idea)
Episodes made under v1.1 (30–60s) are rebuilt to 80–90s, one at a time, **newest first: 002, then 001**. They're marked `rebuild v1.2` in `episodes/INDEX.md`.
- Take the first INDEX row marked `rebuild v1.2` (lowest in that order) and its Notion row (by Notion ID). Set `status` = **In progress**, `Pipeline Status` = **Queued**, append `… → Queued · rebuild to script format v1.2 (80–90s)`, and post `discord -- status "Rebuilding <nnn> <title> to 80–90s"`. Work happens in the episode's **existing** Discord thread.
- **Scripting** is a rework of the existing `episode.yaml` in the same folder: same id, slug, Notion ID, **voice and music track** (don't run `voice:assign` or `music:assign` again), keep the approved hook and gist where they still work, and grow the Breakdown to 80–90s. Then continue exactly like a new episode through every gate (§3), including a fresh voiceover (changed scenes only are billed) and a new final render.
- In INDEX, replace `rebuild v1.2` with the normal status as it moves (`scripted` …).
- No `rebuild v1.2` rows left → §2.

## 2. Pick the next Idea
```sql
SELECT url, "userDefined:ID" AS id, "Topic", "Category", "Engineering Level", "Reel Hook", "Outline"
FROM "collection://2a331e0f-b686-80a9-9213-000bae1d96ff"
WHERE "status" = 'Idea' ORDER BY "userDefined:ID" ASC LIMIT 1
```
- None → `discord -- status "No new idea in the queue. Mark a Shorts row Idea in Notion and the next run picks it up."` and **stop**. (Never look at `Not started` rows.)
- Found → **check `episodes/INDEX.md` for its Notion ID first.**
  - **Already linked to an episode** (e.g. #3 = the pilot `001`): don't script it again. Resume from that episode's INDEX status:

    | INDEX status | Resume at |
    |---|---|
    | scripted | Script Review |
    | script approved / voiced | Voicing |
    | storyboard approved | Rendering Draft |
    | draft rendered | Draft Review |

    Append `linked to existing episode <nnn>` and continue in §3 or §4.
  - Not linked → set `status` = **In progress**, `Pipeline Status` = **Queued**, and append an AI Notes line (§6). Post `discord -- status "Picked up #<ID> <Topic>"`. Then §3.

## 3. Drive the row (repeat until a gate or the end)
Before each stage, set the stage's Pipeline Status and status (AGENTS §1b table) and append a line. After it, append the result line and post a short progress line to the episode's thread: `discord -- note <nnn> "<stage> done · <numbers>"` (no ping).

| Stage | Do | Then |
|---|---|---|
| **Scripting** | First **fetch the Visual Reference** (§3a). Then run **`/script`** with the saved reference images (if any), Topic as the subject, Reel Hook as the hook seed, Outline as the breakdown points, Engineering Level for depth (Junior: fewer ideas, more analogy · Software: the standard depth · Senior/Staff: trade-offs and failure modes, or Part 1/2). Category as context. Length is always **80–90s** (target 85s) whatever the level. Add the row to `episodes/INDEX.md` with its **Notion ID** | Gate: **Script Review** |
| **Building Parts** (only if `/video` step 1 finds something missing) | Build it into the library (`/video` step 1), and render a still of it | Gate: **Parts Review** |
| **Voicing** | `npm run voice -- <nnn>`, then `npm run validate -- <nnn>` (measured). Log characters billed and measured length | continue |
| **Storyboarding** | `npm run storyboard -- <nnn>` (writes `storyboard/sections/*.jpg`, one image per section). Self-check the section images (`/video` step 3) and fix before posting | Gate: **Storyboard Review** |
| **Rendering Draft** | `/video` step 4 (full-quality draft) | Gate: **Draft Review** (status **Draft Ready**) |
| **Final Rendering** (status stays **Draft Ready**) | `npm run render:final -- <nnn>` and `upload.md` (`/video` step 5), then commit (`/video` step 7) | **Rendered** → done (§7) |

### 3a. Visual Reference (optional, never wait for it)
Imad can attach reference images to a row's `Visual Reference` column for a complex use-case. Before **Scripting** (and again when Script Review comes back with changes):
1. Fetch the row page with the Notion connector (`fetch`, the row's `url`). The `Visual Reference` property lists its files as `notion-file-block://…` references. None → skip this section.
2. Get signed URLs right away: `get-file-download-urls` with those references (up to 25). They expire in minutes, so go straight to step 3.
3. Save them: `npm --prefix engine run refs -- <Notion ID> <url> <url> …` → `bridge/files/notion-<ID>/01-<name>…` (gitignored, never committed). If a URL has expired, get fresh ones and re-run.
4. Append an AI Notes line: `Visual Reference: <n> image(s) → bridge/files/notion-<ID>/`, and hand the paths to `/script`, which looks at each one and maps it to a template.
A download that keeps failing doesn't block the episode: log it, script without it, and say so in the Script Review note.

**Blocked** (Pipeline Status Blocked, status Awaiting Approval): a missing brand logo, `render:final` refusing because audio isn't licensed or the plan is free, or the ElevenLabs quota running out. Log the exact reason and the fix (the TASKS.md step), post `discord -- blocked <nnn> "<reason + the fix>"`, and **end the run**.
**Failed**: an error you can't fix after one honest retry. Log the error and the step, post `discord -- failed <nnn> "<error, step>"`, and **end the run**.

## 4. At a gate: post to Discord, then end the run
1. Set status and Pipeline Status for the gate, and append a line with what to review and where it is.
2. Post the gate. The command picks the right attachments itself and pings Imad:

   | Gate | Command | What Imad sees |
   |---|---|---|
   | Script Review | `discord -- gate <nnn> script --note "<one line: words, est. length, anything to flag>"` | A script card: one embed per section with the spoken line and on-screen headline, plus `episode.yaml` (split over several messages when there are more than 9 sections; the buttons go on the last) |
   | Parts Review | `discord -- gate <nnn> parts --files <repo-relative still paths, comma-separated>` | The still(s) of the new part |
   | Storyboard Review | `discord -- gate <nnn> storyboard --note "<self-check fixes, if any>"` | One image per section (batches of 10, buttons on the last batch), then the full HTML for desktop |
   | Draft Review | `discord -- gate <nnn> draft` | The draft MP4 (a 720p preview if it's over the upload limit) |

   Each post gets a correlation id `<nnn>:<gate>:r<round>`, and posting a new gate closes the episode's previous open form.
3. Append the correlation id to the AI Notes line (e.g. `… · Discord 002:storyboard:r2`).
4. **End the run.** Imad's click comes back as a new run (§5). Never approve on his behalf.

## 5. Imad's answer (Discord event)
Read the event file (`bridge/processing/<file>.json`): `data.action`, `data.values`, `data.correlation_id` (`<nnn>:<gate>:r<round>`, or `next:…`), and `files` (his reference images, saved locally: **look at them**).

**Is it current?** For an episode gate, check that the correlation id equals the episode's open form (`discord -- state <nnn>` → `open.correlation_id`), and that Notion's Pipeline Status is that gate (or Blocked/Failed for a `blocked` form). If not, post `discord -- note <nnn> "That button was for an older round, so nothing changed. The current review is the latest message."` and **end the run**.

| Form · action | Do |
|---|---|
| review · **approve** | Append `approved by Imad in Discord`, then continue §3 from the next stage. At **Draft Review**, go straight to Final Rendering: status **stays Draft Ready** until it's **Rendered** |
| review · **changes** | Append `changes requested: <summary of values.feedback>`, set status → In progress, revise the relevant artifact (script, part, storyboard or draft) using the feedback and reference images, then return to the **same gate** (§4, the next round). For draft changes, return to **Draft Ready** |
| blocked · **retry** | Append `retry requested`, then re-run the step that failed or was blocked |
| blocked · **resolved** | Append `Imad: fixed`, check the fix is really there (e.g. the logo file exists, `render:final` passes), then continue. If it isn't, post `discord -- blocked` again saying what's still missing |
| blocked · **reply** | Append `Imad: <values.note>`. Act on it if it tells you how to proceed. Otherwise answer with `discord -- note` and re-post `discord -- blocked` |
| next-idea · **start** | Run **§1** right away (it picks the next Idea if nothing is active) |

Anything unclear → post the question with `discord -- blocked <nnn> "<one question>"` (Imad answers with Reply), and end the run.

## 6. AI Notes: append-only
- Read the current value, then write **old value + newline + new line**. Never rewrite or delete earlier lines.
- Line format: `YYYY-MM-DD HH:MM · <from> → <to> · <what> · <numbers/files>`. Use local time.
- A Notion text property holds about 2,000 characters. Near the limit, keep appending to the **page body** under a `## AI log (cont.)` heading, and add a final property line `… continued in page body`.

## 7. Done
- status **Rendered**, Pipeline Status **Rendered**, and a last line with the output path, length and total credits.
- `episodes/INDEX.md` → `final rendered`, plus one `STATUS.md` changelog line.
- Commit the recipe with **`/video` step 7** (`Episode <nnn>: <title> (rendered)`, pushed to `main`), then append a line with the commit sha: `… · Rendered · committed <sha> · <n> files`.
- `discord -- rendered <nnn>`: posts the final MP4 and the `upload.md` text, then asks **"Start the next Idea now?"**. Yes comes back as a `next-idea · start` event. No, or no answer, leaves it to the next 6-hour tick. Imad sets **Published** himself.

## Never
- Touch `Not started` rows, or set `Idea` or `Published`.
- Run two rows at once, or pick a new row while one is active.
- Spend ElevenLabs credits before Script Review is approved.
- Bypass `render:final`'s licensing gate.
- Overwrite Imad's columns (Topic, Category, Engineering Level, Reel Hook, Outline).
- Act on a Discord click that doesn't match the open gate, or on any click not from Imad (the bridge drops those).
- Read or print `bridge/.env` or `engine/.env`.
