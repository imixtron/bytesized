# Bytesized: tasks for Imad

> Only things a human needs to do or decide. State: [STATUS.md](STATUS.md). How agents work: [AGENTS.md](AGENTS.md).

## 🔴 Needed now

- [ ] **Publish the pilot**: `episodes/001-what-is-system-design/out/what-is-system-design.mp4` + copy from `out/upload.md`, then set Notion #3 → **Published**
- [ ] **Listen to the 3 new theme siblings** (`assets/music/bytesized-theme-2.mp3`, `-3`, `-4`). Any you don't like: say which, and I'll re-prompt it (~1,125 credits each) or drop it from `episodes/music.json`
- [ ] **Mark the next Shorts row `Idea`** to start episode 002 (the queue picks it up within 6h)

- [x] **Set up the Mac mini** (2026-09-30): Node, `npm ci`, `engine/.env`, `npm run doctor -- --online` ✔ ready, Notion connector, keep-awake, and the 6-hour **"Bytesized queue"** schedule (`0 */6 * * *`)
- [x] **Queue the first topic**: #3 "What is System Design?" (the pilot, the channel's first topic) is **Idea**. The queue takes it to completion before anything else

- [ ] **Check the new crunchier chomp** (`assets/sfx/chomp.mp3`, also in the pilot draft)
- [ ] **Watch the full-quality pilot draft on your phone** (`episodes/001-what-is-system-design/out/what-is-system-design-draft.mp4`): check the caption position against the platform overlays, and the pacing
- [ ] **Fix the Notion rows whose Outline and Reel Hook don't match their Topic** (from about #21 onwards they look shifted by one row) before marking them Idea
- [ ] Send the Netflix brand-page URL you downloaded the kit from, for `assets/logos/netflix/SOURCE.md`

## 💳 After subscribing to ElevenLabs (do these in order, before publishing anything)

Free-plan audio has **no commercial licence**, so everything audible gets regenerated on the paid plan. `npm run render:final` refuses to make a publishable video until all of this is done.

- [x] 1. **Subscribe** (2026-10-01: Creator plan, 128,974 credits) (Starter or above). Check your balance in the dashboard afterwards: unused free credits should carry over
- [x] 2. **Edit `engine/plan.json`** and set `"elevenlabs_plan": "paid"` (or tell me and I'll do it)
- [x] 3. **Confirm the key permissions** (doctor --online ✔) are still set (listed in STATUS.md)
- [x] 4. **Generate the channel theme** (done, ~1,125 credits. ⏳ Imad: listen to `assets/music/bytesized-theme.mp3`), once, and it's reused forever. Optionally try the 20s preview first (`npm run audio -- bytesized-theme-preview`, ~300 credits) to check the mood:
  ```bash
  cd engine && npm run audio -- bytesized-theme
  ```
  ~75s, about 1,100 credits. Listen before continuing. If the mood is off, tweak the prompt in `assets/music/library.json` and re-run with `--force`
- [x] 5. **Regenerate the sound effects** on the paid plan, once for all episodes:
  ```bash
  cd engine && npm run audio -- --upgrade
  ```
  About 240 credits. This replaces the free-plan drafts
- [x] 6. **Regenerate the pilot voiceover** on the paid plan:
  ```bash
  cd engine && npm run voice -- 001 --upgrade
  ```
  About 520 credits
- [x] 7. **Check the library is fully licensed:** (all ✔)
  ```bash
  cd engine && npm run audio -- --list
  ```
  Every line should say `✔ licensed`
- [x] 8. **Publishable render** (2026-10-01, draft approved):
  ```bash
  cd engine && npm run render:final -- 001
  ```
  Output: `episodes/001-what-is-system-design/out/what-is-system-design.mp4`. Every later episode only needs steps 6 and 8

## 🟢 Needed later

- [ ] **Rename the project folder `bitesized/` → `bytesized/`** at the end of the project. The brand is already renamed. The folder move is last because it changes paths for the engine, `.claude/launch.json` and Claude's memory. Tell me when, and I'll update the references first
- [ ] Check that the **"Bytesized"** handle or name is free on YouTube, Instagram and TikTok
- [ ] Set up or confirm accounts for YouTube, Instagram and TikTok under the Back in a Gist / Bytesized name
- [ ] (Optional, as needed) **Pronunciation fixes**: log any tech term the voice says wrong in `episodes/pronunciations.md`. When there are a few, I'll turn them into an ElevenLabs pronunciation dictionary applied to every voiceover (the key already has the permission)
- [ ] (Optional) 1–3 more reference channels besides ByteByteGo, plus anything you **don't** want
- [ ] (Optional) Swap any library sound or track for one you've licensed elsewhere: drop the file into `assets/music/` or `assets/sfx/` and update its entry in that folder's `library.json` (`source: "licensed"`, `licensed: true`)

## ✋ Approvals

- [x] Gate 1: Bytesized logo (approved 2026-09-29)
- [x] Gate 2: Design language (v1.0 → v1.3, all approved 2026-09-29)
- [x] Gate 3: Script format (v1.0 → v1.1) and pilot script (approved 2026-09-29)
- [x] Gate 4: Pilot storyboard ✅ approved · final render ✅ locked 2026-10-01
