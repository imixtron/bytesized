---
name: video
description: Video Creator for Bytesized, the 80–90s system-design shorts of Back in a Gist. Takes an approved episodes/<nnn-slug>/episode.yaml through voiceover (ElevenLabs), storyboard review, draft render and final publishable render with the Remotion engine, and builds any missing template or part first. Use when asked to make, render, voice, storyboard or finish a Bytesized episode.
---

# /video: episode.yaml → video

You turn an **approved** episode into video with the engine in `engine/` (Remotion). All commands run from `engine/`. Read `engine/README.md` once for the command list.

## Read first
- `episodes/INDEX.md`: the episode's status. It must be at least `script approved`. If it isn't, stop and suggest `/script`.
- `episodes/SCRIPT-FORMAT.md` and `brand/design-language/DESIGN-LANGUAGE.md` (v1.4), plus `tokens.json` for every value.

## Steps

### 1. Check the episode can be built
```bash
npm run validate -- <nnn>
```
Then check what it uses against what exists:
- **Templates:** each `scene.template` must be in `src/templates/index.tsx` (`TEMPLATE_COMPONENTS`).
- **Node types and icons:** each type must be in `ICON_FOR` (`src/parts/icons.tsx`).
- **Verbs:** each verb must be handled by the templates it's used in.
- **Brand logos:** `assets/logos/<brand>/derived/node.png` must exist. If it doesn't, add a TASKS.md item for Imad and stop.

**If something's missing, build it into the library first** (never as a one-off in the episode):
- New template → `src/templates/<Name>.tsx`, following the existing ones: `ctx`, `localBeats`, `Headline`, content centred with `centredTop`/`stageBox`, values only from `tokens`. Register it in `index.tsx`.
- New icon or type → add it to `ICONS` / `ICON_FOR` (24-grid, 2px rounded strokes, `currentColor`).
- Add it to a gallery composition (`src/compositions/gallery/`), run `npx tsc --noEmit`, render a still of it, **look at it**, and show Imad before using it in the episode. New parts follow the locked design language. If a need doesn't fit it, propose a design-language change instead of improvising.

### 2. Voiceover (uses ElevenLabs credits)
```bash
npm run voice -- <nnn>          # per scene, cached; only changed scenes are billed
npm run validate -- <nnn>       # now uses the measured length
```
- Report the characters billed.
- If the **measured** length is outside 80–90s, don't pad or speed up. Go back to the script with Imad (trim or extend lines), then regenerate only the changed scenes.
- Listen for mispronounced terms. Log them in `episodes/pronunciations.md` and tell Imad.
- Set INDEX status to `voiced`.

### 3. Storyboard review ✋
```bash
npm run storyboard -- <nnn>     # → storyboard/storyboard.html + sections/<nn>-<scene>.jpg (one image per section)
```
The section images are what Imad reviews on his phone in Discord (`npm run discord -- gate <nnn> storyboard`, posted by `/queue` §4). Before sending, **check the section images yourself**:
- nothing overlapping (headline vs diagram, labels vs wires, stage vs captions)
- beats visible at the right moment
- one focus at a time, and no lone-word captions

Fix what you can: beat `offset`, layers, or a template fix that goes into the library. Then send the storyboard to Imad and **stop for approval**. Apply feedback, then re-run the storyboard. On approval, set INDEX status to `storyboard approved`.

### 4. Draft render
```bash
npm run sync && npx remotion render ep-<nnn> ../episodes/<nnn-slug>/out/<slug>-draft.mp4 --crf=18
```
Send it (in a queue run: `npm run discord -- gate <nnn> draft`, which plays inline on his phone). Set INDEX status to `draft rendered`.

### 5. Final render (publishable)
```bash
npm run render:final -- <nnn>   # → episodes/<nnn-slug>/out/<slug>.mp4
```
- This refuses unless the voiceover, music and every sound are licensed (paid-plan ElevenLabs or original). If it refuses, show Imad the listed fixes. They're in TASKS.md "After subscribing". Don't bypass it.
- Once it succeeds, write `episodes/<nnn-slug>/out/upload.md`:
  - a title of 60 characters or fewer
  - a 1–2 line description ending with "Follow Bytesized for byte-sized tech." (or the Part 2 line)
  - 3–5 hashtags (#systemdesign #shorts and topic tags)
  - for a Part 1/2, a link line to the other part
  - if `brands:` is set, the line: *"Not affiliated with or endorsed by <Brand>. Logos are used for identification only."*
- Render the cover: `npm run cover -- <nnn>` → `episodes/<nnn-slug>/out/cover.png` (the title + the episode's diagrams; its BigPicture panels if it has one). Look at it, and add a line to `upload.md`: `Cover: out/cover.png`. It's generated, so it isn't committed.
- Set INDEX status to `final rendered`. After Imad posts it, set it to `published`.

### 6. Wrap up
- Add one line to the `STATUS.md` changelog: episode, length, credits used, anything new added to the library. Update the ElevenLabs credits line.
- If you built new templates or parts, update the "Templates still to build" line and the architecture list in `engine/README.md`.

### 7. Commit and push the recipe
Commit everything needed to recreate the video (AGENTS §6 "Commit the recipe, not the render"), once `render:final` has succeeded and step 6 is done. From the repo root:
```bash
git status --short
git add episodes/<nnn-slug>/episode.yaml episodes/<nnn-slug>/audio episodes/<nnn-slug>/storyboard episodes/<nnn-slug>/out/upload.md
git add <each changed shared input from git status>   # see list below
git commit -m "Episode <nnn>: <title> (rendered)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git rev-parse --short HEAD                            # report the sha
git pull --rebase origin main && git push origin main
```
- **Shared inputs**, only if `git status` shows them changed: `assets/music/` and `assets/sfx/` (audio + `library.json`), `episodes/voices.json`, `episodes/music.json`, `episodes/pronunciations.md`, `episodes/INDEX.md`, `engine/plan.json`, new or changed `engine/src/` templates/parts/icons, `engine/README.md`, `brand/`, `STATUS.md`, `TASKS.md`.
- **Explicit paths only.** Never `git add -A` / `git add .`. Never stage `out/*.mp4`, `engine/public/`, `engine/out/` or any `.env`. If `git diff --cached --name-only` lists one, unstage it.
- Changes you didn't make in this run (another episode, someone's in-progress edit): leave them unstaged and mention them.
- Commit and push to **`main`**, only here at the end of episode creation (never mid-pipeline). If the checkout isn't on `main`, or the push or rebase fails, stop and report it; never force-push.

## Engine gotchas
- Always `npm run sync` after changing anything in `brand/`, `assets/` or `episodes/`. `render`, `still` and `storyboard` do it for you, but `npx remotion …` doesn't.
- The engine refuses stale audio. If `vo` changes, re-run `npm run voice -- <nnn>`.
- In zsh loops, list frames explicitly (`for f in 100 200 300`), since a `$VAR` with spaces won't split.
- Check stills after any visual change: `npx remotion still ep-<nnn> out/check.png --frame=<f>`, then look at them.
