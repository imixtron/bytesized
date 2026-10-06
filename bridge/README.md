# Discord bridge

Imad reviews and approves every Bytesized gate from Discord (his private server, through the **discord-gateway** bot in `~/Projects/AI/mario`; contract: `http://localhost:8787/setup.md`). Claude still does all the work. The bridge only carries clicks in and keeps the clock.

```
Claude (claude -p) ── npm run discord -- gate … ──► gateway :8787 ──► Discord thread (files + buttons, pings Imad)
Imad clicks Approve / Request changes
gateway ── signed webhook ──► bytesized-bridge (Docker) ──► bridge/inbox/<item>.json  (+ "📥 Got it" reply)
launchd (WatchPaths) ──► bridge/runner.mjs ──► claude -p [--resume <episode session>] "/queue event bridge/processing/<item>.json"   (one at a time)
bytesized-bridge, at 00/06/12/18 ──► bridge/inbox/<tick>.json ──► claude -p "/queue tick"
```

| Piece | Where | Job |
|---|---|---|
| `manifest.json` | gateway (integration `bytesized`) | Channel, webhook, the 4 forms: `review` (Approve / Request changes + notes + images), `blocked` (Retry / Fixed, continue / Reply), `run-failed` (Retry run / Leave it), `next-idea` (Yes / No). Only Imad's user can answer. Forms close on the first answer |
| `server.mjs` + `Dockerfile` + `compose.yaml` | container `bytesized-bridge` on `mario_default`, `restart: unless-stopped` | Verifies signatures, de-duplicates, downloads reference images to `bridge/files/`, writes `bridge/inbox/`, replies "Got it". A **Retry run** click moves the item from `bridge/failed/` back to the inbox itself. Catches up from `GET /v1/responses` after downtime. Writes the 6-hour **tick** |
| `runner.mjs` + `launchd/` | host (launchd agent `com.bytesized.runner`) | Claude needs the Mac (render toolchain, CLI login, Notion connector, git), so the runner lives on the host. Woken by changes to `bridge/inbox/`, drains it one item at a time with `claude -p` (resuming the episode's session, see Sessions), logs to `bridge/logs/`, and posts **Retry run** if a run fails |
| `engine/scripts/discord.ts` | `npm run discord -- …` | What Claude calls: `gate`, `note`, `blocked`, `failed`, `runfailed`, `rendered`, `status`, `close`, `state`. Picks the attachments per gate and keeps `bridge/state/discord.json` (thread per episode, the open form and its round) |

## What gets posted
| Moment | In Discord |
|---|---|
| First message of an episode | A root message that opens the episode's **thread**. Everything else goes inside it |
| Script Review | A script card: one embed per section (spoken line, on-screen headline, length) + `episode.yaml`. An 80–90s episode has 9–15 sections, so the card goes out over 2 messages (Discord allows 10 embeds per message); the buttons sit under the last one |
| Parts Review | Still(s) of the new part |
| Storyboard Review | One image per section (`storyboard/sections/*.jpg`, in batches of 10, buttons under the last batch) + the full HTML for desktop |
| Draft Review | The draft MP4 (a 720p preview when it's over the 10 MB upload limit, which is normal for 80–90s drafts) |
| Blocked / Failed | The reason and the fix, with Retry / Fixed / Reply |
| A Claude run failed / hit a usage limit | The error (and the reset time), with Retry run / Leave it |
| Rendered | The final MP4 + `upload.md` text, then "Start the next Idea now?" (expires at the next tick) |
| Every tick | One quiet channel line: "Queue busy: …", "Picked up #…" or "No new idea" |
| Progress | Quiet thread lines (voiced, credits, measured length …) |

Reviews, blockers and renders ping Imad. Everything else is silent.

## Setup (done once; re-run any step safely)
```bash
node bridge/register.mjs
```
Validates and registers the manifest with `MARIO_ADMIN_TOKEN` (from `engine/.env`), and writes the token, webhook secret, channel, user and time zone to `bridge/.env` (gitignored, never printed). After editing `manifest.json`, run it again to update the manifest (`--rotate` for new secrets).

```bash
docker compose -f bridge/compose.yaml up -d --build
```
```bash
zsh bridge/install-runner.sh
```
```bash
npm --prefix engine run discord -- check
```

## Sessions (why clicks don't start cold)
Each episode keeps **one Claude session**. `npm run discord` records the runner's session id (`BYTESIZED_SESSION_ID`) on the episode in `bridge/state/discord.json` (`episodes.<nnn>.session`), and the next click on that episode runs `claude -p --resume <id>`, so the skills, rules and episode files are already in context.
- A fresh run starts at about 33k tokens, but a stage can end at 110–150k (screenshots, render output). Carrying that into every turn of the next run would cost more than starting cold. So when a run ends with its session over **`SESSION_COMPACT_TOKENS`** (default 60k), the runner runs `/compact` on it **straight away, while the prompt cache is still warm** (that pass is billed mostly as cheap cache reads). The next click resumes the small session. If that didn't happen (the run failed), it compacts before resuming instead.
- Ticks and "Start the next Idea" start a new session. Whatever episode that run posts to adopts it. `rendered` clears the episode's session.
- If a transcript is gone or can't be resumed, the runner starts a new session. Nothing depends on the session: Notion, AI Notes and the files are still the truth.
- **Mechanical stages run lighter:** Approve on a storyboard (→ draft render) or on a draft (→ final render, `upload.md`, commit) runs with `--model sonnet --effort medium` (`LIGHT_MODEL`, `LIGHT_EFFORT`; `LIGHT_MODEL=` turns it off). Scripting, storyboards, revisions and blockers keep the default model. Resuming a session with another model keeps its context (tested).
- **Ticks while an episode waits on a review** are answered by the runner itself ("Queue busy: …"), with no Claude run.
- Each log ends with a usage line: `[runner] session … · turns · in · cache write · cache read · out`.

## Operating
- **Logs:** `bridge/logs/runner.log` (the runner), `bridge/logs/<item>.log` (each Claude run), `bridge/state/bridge.log` (webhooks, ticks), `docker logs bytesized-bridge`.
- **A run failed** (crash, timeout, or a usage limit such as "You've hit your session limit · resets 10pm"): Discord posts it, in the episode's thread when there is one, with **🔁 Retry run** / **🗑️ Leave it**. Retry moves the item from `bridge/failed/` back to `bridge/inbox/`, and the new run resumes the session and picks up where it stopped. By hand: move the file yourself.
- **Run the queue now:** `npm --prefix engine run discord -- next` asks "Start the next Idea now?" in the channel.
- **Mac or Docker down:** the gateway keeps clicks and delivers them in order later (up to 7 days, `delivery.give_up_after`). The bridge also catches up from the gateway's response log when it starts.
