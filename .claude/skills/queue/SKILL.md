---
name: queue
description: Runs the Bytesized Notion queue (Back in a gist → Bytesized → Shorts). One row at a time: picks the next Idea, drives it through /script and /video, keeps Notion's status, Pipeline Status and AI Notes in sync, and waits in the session at every review gate. Use for scheduled runs, "run the queue", "review <nnn>", or "approve" / "change …" on a queued episode.
---

# /queue: Notion topics → finished episodes

The rules live in **AGENTS.md §1b** (status map, Pipeline Status map, approvals, AI Notes, WIP limit 1). This skill is the procedure. If they ever disagree, AGENTS.md wins.

## Constants
- Data source: `collection://2a331e0f-b686-80a9-9213-000bae1d96ff`
- Properties (exact names): `Topic` (title), `ID`, `Category`, `Engineering Level`, `Reel Hook`, `Outline`, `status`, `Pipeline Status`, `AI Notes`
- `status` options: `Not started` · `Idea` · `In progress` · `Awaiting Approval` · `Draft Ready` · `Rendered` · `Published`
- Episode ↔ row link: the `Notion ID` column in `episodes/INDEX.md`, plus the folder named in AI Notes.

## 0. Entry: what was asked?
| Invocation | Go to |
|---|---|
| Scheduled run, or "run the queue" | **§1** |
| "review 002" (or `ID 16`) | Find the row and episode, show its current review material (§4), then wait |
| "approve" / "change …" in a session that's waiting at a gate | **§5** |

## 1. Look for an active row (WIP limit 1)
Query with the Notion connector's data-source query tool (SQL mode):
```sql
SELECT url, "userDefined:ID" AS id, "Topic", "status", "Pipeline Status", "AI Notes"
FROM "collection://2a331e0f-b686-80a9-9213-000bae1d96ff"
WHERE "status" IN ('In progress', 'Awaiting Approval', 'Draft Ready')
```
- **There is one** → don't start anything new. It's either running in another session or waiting for Imad there.
  - Stale check: `status` = In progress and the **last AI Notes line is more than 12h old**. Then append a `… → Failed · session went quiet >12h, resume with "review <nnn>"` line, set Pipeline Status → `Failed` and status → `Awaiting Approval`, notify, and **stop**.
  - Otherwise say one line ("Queue busy: #<ID> <Topic> at <Pipeline Status>") and **stop**. Don't touch the row.
- **None** → §2.

## 2. Pick the next Idea
```sql
SELECT url, "userDefined:ID" AS id, "Topic", "Category", "Engineering Level", "Reel Hook", "Outline"
FROM "collection://2a331e0f-b686-80a9-9213-000bae1d96ff"
WHERE "status" = 'Idea' ORDER BY "userDefined:ID" ASC LIMIT 1
```
- None → "Queue empty" and **stop**. (Never look at `Not started` rows.)
- Found → **check `episodes/INDEX.md` for its Notion ID first.**
  - **Already linked to an episode** (e.g. #3 = the pilot `001`): don't script it again. Resume from that episode's INDEX status:

    | INDEX status | Resume at |
    |---|---|
    | scripted | Script Review |
    | script approved / voiced | Voicing |
    | storyboard approved | Rendering Draft |
    | draft rendered | Draft Review |

    Append `linked to existing episode <nnn>` and continue in §3 or §4.
  - Not linked → set `status` = **In progress**, `Pipeline Status` = **Queued**, and append an AI Notes line (§6). Then §3.

## 3. Drive the row (repeat until a gate or the end)
Before each stage, set the stage's Pipeline Status and status (AGENTS §1b table) and append a line. After it, append the result line.

| Stage | Do | Then |
|---|---|---|
| **Scripting** | Run **`/script`** with Topic as the subject, Reel Hook as the hook seed, Outline as the breakdown points, Engineering Level for depth and target length (Junior ~35–40s · Software ~40–50s · Senior/Staff ~50–60s or Part 1/2), and Category as context. Add the row to `episodes/INDEX.md` with its **Notion ID** | Gate: **Script Review** |
| **Building Parts** (only if `/video` step 1 finds something missing) | Build it into the library (`/video` step 1) | Gate: **Parts Review** |
| **Voicing** | `npm run voice -- <nnn>`, then `npm run validate -- <nnn>` (measured). Log characters billed and measured length | continue |
| **Storyboarding** | `npm run storyboard -- <nnn>`. Self-check the stills (`/video` step 3) and fix before showing | Gate: **Storyboard Review** |
| **Rendering Draft** | `/video` step 4 (full-quality draft) | Gate: **Draft Review** (status **Draft Ready**) |
| **Final Rendering** (status stays **Draft Ready**) | `npm run render:final -- <nnn>` and `upload.md` (`/video` step 5) | **Rendered** → done (§7) |

**Blocked** (Pipeline Status Blocked, status Awaiting Approval): a missing brand logo, `render:final` refusing because audio isn't licensed or the plan is free, or the ElevenLabs quota running out. Log the exact reason and the fix (the TASKS.md step), notify, and **wait**.
**Failed**: an error you can't fix after one honest retry. Log the error and the step, notify, and **wait**.

## 4. At a gate: show, notify, wait
1. Set status and Pipeline Status for the gate, and append a line with what to review and where it is.
2. Show the material **in the session**:
   - Script Review: the `/script` summary table
   - Parts Review: a still or gallery of the new part
   - Storyboard Review: send `storyboard.html`
   - Draft Review: send the draft MP4
3. **Notify** (desktop notification, e.g. the PushNotification tool): `"<nnn> · <Topic> · <gate> ready for review"`.
4. **Stop and wait for Imad in this session.** Never approve on his behalf, and never move on without his word.

## 5. Imad's answer (in the session)
- **"approve"** → append `approved by Imad in session`, then continue §3 from the next stage.
  - At **Draft Review**: go straight to Final Rendering. status **stays Draft Ready** until it's **Rendered**.
- **"change …"** → append `changes requested: <summary>`, set status → In progress, revise the relevant artifact (script, part, storyboard or draft), then return to the **same gate** (§4). For draft changes, return to **Draft Ready**.
- Anything unclear → ask one question and keep waiting.

## 6. AI Notes: append-only
- Read the current value, then write **old value + newline + new line**. Never rewrite or delete earlier lines.
- Line format: `YYYY-MM-DD HH:MM · <from> → <to> · <what> · <numbers/files>`. Use local time.
- A Notion text property holds about 2,000 characters. Near the limit, keep appending to the **page body** under a `## AI log (cont.)` heading, and add a final property line `… continued in page body`.

## 7. Done
- status **Rendered**, Pipeline Status **Rendered**, and a last line with the output path, length and total credits.
- `episodes/INDEX.md` → `final rendered`, plus one `STATUS.md` changelog line.
- Commit the episode (script, voice cache, INDEX, STATUS; renders are git-ignored) with a message like `episode <nnn>: <topic>`, and push.
- Notify: `"<nnn> · <Topic> · rendered, ready to publish"`. Imad sets **Published** himself.

## Never
- Touch `Not started` rows, or set `Idea` or `Published`.
- Run two rows at once, or pick a new row while one is active.
- Spend ElevenLabs credits before Script Review is approved.
- Bypass `render:final`'s licensing gate.
- Overwrite Imad's columns (Topic, Category, Engineering Level, Reel Hook, Outline).
