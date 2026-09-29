# Setting up Bytesized on a new machine (e.g. the Mac mini)

About 15 minutes. After this, the desktop app runs the Notion queue every 6 hours, and you review and approve in the sessions it opens.

## 1. Prerequisites
- macOS with **Node 20+** (`node -v`). If not: install [nvm](https://github.com/nvm-sh/nvm), then `nvm install 20`
- **git**, with your SSH key added to GitHub
- **Claude desktop app**, signed in (Code tab)

## 2. Get the project
```bash
git clone git@github.com:imixtron/bytesized.git
cd bytesized/engine
npm ci
cp .env.example .env        # then open .env and paste your ElevenLabs API key
npm run doctor -- --online  # every line should be ✔ (the plan line is ⚠ until you subscribe)
```
The first render downloads Remotion's headless Chrome (~100 MB, one time).

## 3. Check the pilot renders
```bash
npm run render -- ep-001 out/pilot.mp4 --crf=18
```
Open `engine/out/pilot.mp4`. You should hear Liam, the chomp and the placeholder music.

## 4. Connect Notion in the desktop app
- Enable the **Notion** connector (claude.ai → Settings → Connectors) and give it access to **Back in a gist → Bytesized → Shorts**.
- Open a Code session **in the `bytesized` folder** and ask: *"query the Shorts database and show me the Idea rows"*. It should list them.
- `.claude/settings.json` pre-approves the Notion tools and the engine commands so scheduled runs don't stall on permission prompts. If your Notion tools use a different name (check one in the session), add that prefix to the `allow` list.

## 5. Keep the Mac awake
System Settings → **Energy** (or Battery → Options):
- Prevent automatic sleeping when the display is off: **on**
- Start up automatically after a power failure: **on**
- Wake for network access: **on**

Keep the Claude desktop app open. Add it to Login Items (System Settings → General → Login Items) so it comes back after a reboot.

## 6. Create the 6-hour schedule
In a Code session **opened in the `bytesized` folder**, paste:

> Create a scheduled task named **"Bytesized queue"** that runs **every 6 hours** in this project folder, with the prompt **`/queue`**. It should open a new session each run and notify me when it stops at a review gate.

(or add it by hand in the desktop app's Scheduled tasks: every 6 hours, folder `bytesized`, prompt `/queue`).

**How it behaves** (full rules in AGENTS.md §1b):
- If a row is already active (In progress, Awaiting Approval or Draft Ready), the run exits immediately.
- Otherwise it takes the lowest-ID **Idea** and runs it to **Script Review**, then waits in its session and notifies you.
- You **approve or request changes in that session**, and it continues right away: voice → storyboard (review) → draft (review) → final render → **Rendered**.
- You only ever set **Idea** (to queue a topic) and **Published** (after posting).

## 7. Before publishing anything
Do TASKS.md → **"After subscribing to ElevenLabs"** (paid plan, theme track, SFX and voice upgrade). Until then, `render:final` refuses and the queue marks rows **Blocked** at the final step, with the reason in AI Notes.

## Troubleshooting
| Symptom | Fix |
|---|---|
| `npm run doctor` shows ✖ | Follow the → hint on that line |
| A row is stuck **In progress** | After 12h the next run marks it **Failed**. Open a session and say *"review <nnn>"* to resume |
| "voiceover is out of date" | The script changed after voicing: `npm run voice -- <nnn>` (only changed scenes are billed) |
| Permission prompt during a scheduled run | Add that command or tool to `.claude/settings.json` → `allow`, then commit it |
