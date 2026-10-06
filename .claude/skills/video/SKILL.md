---
name: video
description: Video Creator for Bytesized, the 80–90s system-design shorts of Back in a Gist. Takes an approved episodes/<nnn-slug>/episode.yaml through voiceover (ElevenLabs), storyboard review, draft render and final publishable render with the Remotion engine, and builds any missing template or part first. Use when asked to make, render, voice, storyboard or finish a Bytesized episode.
---

# /video: episode.yaml → video

You turn an **approved** episode into video with the engine in `engine/` (Remotion). All commands run from `engine/`. Read `engine/README.md` once for the command list.

## Read first (only what this stage needs)
- `episodes/INDEX.md`: the episode's status. It must be at least `script approved`. If it isn't, stop and suggest `/script`.
- `episodes/SCRIPT-FORMAT.md`: only when you change `episode.yaml` (fixes from the self-check or Imad's feedback).
- `brand/design-language/DESIGN-LANGUAGE.md` (v1.4) and `tokens.json`: only when you build or fix a template or part, or fix a visual problem.
- Skip anything already read earlier in this session (runs often resume the episode's session). Voicing, draft and final renders need none of the last two.

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
- Add it to a gallery composition (`src/compositions/gallery/`), run `npx tsc --noEmit`, render a still of it (`--scale=0.4 --image-format=jpeg` for your own check), **look at it**, and show Imad before using it in the episode. New parts follow the locked design language. If a need doesn't fit it, propose a design-language change instead of improvising.

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
The section images are what Imad reviews on his phone in Discord (`npm run discord -- gate <nnn> storyboard`, posted by `/queue` §4). Before sending, **check the storyboard yourself on the contact sheets** (`storyboard/contact-*.jpg`, 12 stills each, tagged `<n> <scene> <time>`). They cost far fewer tokens than the section images, so don't open the section images too. Only render a single bigger still (below) when a contact sheet shows a problem you need to see up close:
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
Commit everything needed to recreate the video (AGENTS §6 "Commit the recipe, not the render") **with the script, never by hand**, once `render:final` has succeeded and step 6 is done:
- **In a bridge run (`/queue`): don't commit.** The runner runs the script right after the run ends, so the build-cost line for this last run is in the commit too, then posts the sha and the build cost to the episode's thread.
- **In an interactive session:** from `engine/`, `npm run commit:episode -- <nnn> --push`, then report the sha it prints.

What the script stages: the episode folder (`episode.yaml`, `audio/`, `storyboard/`, `out/upload.md`, `cost.jsonl`) plus the shared inputs it was built with (`assets/` music, SFX and logos, `brand/`, `engine/` source, `episodes/*.md|json`, `bridge/` code, skills and docs). It never stages `out/*.mp4`, `engine/public/`, `engine/out/` or `.env` (it refuses and commits nothing if one shows up), leaves other episodes' folders alone and lists them, commits only on `main`, and pushes with `pull --rebase` and no force. The message is `Episode <nnn>: <title> (rendered)` with length, voice, music and build cost.

## Engine gotchas
- Always `npm run sync` after changing anything in `brand/`, `assets/` or `episodes/`. `render`, `still` and `storyboard` do it for you, but `npx remotion …` doesn't.
- The engine refuses stale audio. If `vo` changes, re-run `npm run voice -- <nnn>`.
- In zsh loops, list frames explicitly (`for f in 100 200 300`), since a `$VAR` with spaces won't split.
- Check stills after any visual change: `npx remotion still ep-<nnn> out/check.jpg --frame=<f> --scale=0.4 --image-format=jpeg`, then look at them. An image costs tokens by its pixels, so the 0.4 scale (432×768) is about a third of a full-size still, and it's enough to see overlaps. Don't extract frames from a rendered MP4 to re-check what the storyboard already showed.
