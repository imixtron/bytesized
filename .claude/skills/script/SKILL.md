---
name: script
description: Script Creator for Bytesized, the 30–60s system-design shorts of Back in a Gist. Turns a topic, notes or a rough draft into a validated episodes/<nnn-slug>/episode.yaml (or a Part 1 + Part 2 pair), assigns the round-robin voice, and stops for Imad's approval. Use when asked to write, draft, plan or rework a Bytesized episode or script.
---

# /script: topic → episode.yaml

You write **one Bytesized episode** as `episodes/<nnn-slug>/episode.yaml`. Everything visual is chosen from a fixed menu, so the Video Creator (`/video`) can render it predictably. You never render video here.

## Read first (sources of truth, don't restate them from memory)
1. `episodes/SCRIPT-FORMAT.md`: rules, file format, menus, validation. **This wins over anything below.**
2. `brand/design-language/DESIGN-LANGUAGE.md`: node families, tone, what a headline looks like.
3. `episodes/001-what-is-system-design/episode.yaml`: the approved pilot, the reference for style and beat density.
4. `episodes/INDEX.md`: existing episodes (numbering, topics already covered, series).
5. `engine/src/templates/index.tsx`: the templates that are **built**. Others in the menu exist in the format but `/video` has to build them first.
6. `episodes/pronunciations.md`: known tricky terms.

## Steps

### 1. Understand the ask
- Input can be a topic ("consistent hashing"), notes, a blog post from backinagist.com, or a draft script. If it's a company's engineering ("How Netflix streams"), it's a brand episode (step 4).
- If the angle is unclear, ask **one** question at most. Otherwise pick the angle a curious beginner would care about most.

### 2. Size it
- Pick `target_sec` in **30–60** (35–45 suits most). Word budget ≈ `2.5 × (target_sec − 1.5)`: about 80 words for 35s, 105 for 45s, 145 for 60s. This is guidance, not a hard limit.
- **Split into Part 1 / Part 2** when explaining it well needs more than ~145 words or more than 5 breakdown ideas. Max 2 parts. If it would need more, narrow the scope and propose the rest as future episodes.
  - Part 1: gist VO ends with *"Part 2 is next, follow so you don't miss it."* It needs `series.teaser`.
  - Part 2: the hook contains a one-sentence recap and it needs `series.recap`. Both parts share `series.key`.

### 3. Write the story (Hook → Idea → Breakdown ×2–6 → Gist)
- **Hook (0–3s):** a question or surprising claim in the first sentence. No greetings. Make it concrete (a real product, a number, a failure).
- **Idea:** name the concept in plain words, ideally with an everyday analogy.
- **Breakdown:** show *how it works*, preferring a diagram (`FlowDiagram`) and a failure/recovery moment. One idea per scene, 3–8s each.
- **Gist:** the VO starts with *"That's the gist:"*, gives a one-line takeaway (≤ 8 words on the card), then *"Follow for more."* (or the Part 2 line).
- **Voice:** playful, a bit cheeky, short sentences. Write numbers as spoken ("two million"). No emojis. Spell brand names the way they're said.
- **Headlines:** ≤ 5 words, exactly one `accent` word that's in the text. Most scenes, but at least one without, never more than 3 in a row, and never on the GistCard. The headline names the idea and must not repeat the VO.

### 4. Pick the visuals (menus only)
- Templates, node types, families and verbs come **only** from SCRIPT-FORMAT §3. Prefer built templates. If a scene truly needs an unbuilt one (BeforeAfter, MetricChart, Zoom), use it and list it under "Needs for /video" in your summary.
- **Families:** `outlined` = inside our system (with states), `solid` = outside it (users, third parties), `hero` = the episode's topic, at most one on screen.
- **FlowDiagram:** give `layers` top → bottom, `nodes`, `links`. Reuse the same diagram across scenes with `stage.reuse: <scene id>` so nodes don't jump.
- **Beats:** a visual change every 1.5–2s, each `on` a word that is literally in that scene's `vo` (use `"word#2"` for a repeat). Pilot density is the reference.
- **Sounds:** don't list them, because the sound map picks them. Use a beat `sfx:` only for a deliberate exception (`none` to mute).
- **Music:** don't write it by hand. `music:assign` (step 6) picks one of the four sibling theme tracks at random and writes `music.track`. Only set it yourself if Imad asked for a specific track.
- **Brand logos:** only as a `brand` node inside a diagram, and list it in `brands:`. It needs `assets/logos/<brand>/derived/node.png` and `SOURCE.md`. If they're missing, **don't block**: add a task to `TASKS.md` for Imad to download the official kit, and mention it in the summary.

### 5. Write the file(s)
- Folder: `episodes/<nnn>-<slug>/episode.yaml`, where `<nnn>` = highest existing number + 1 (zero-padded) and `slug` is lowercase-kebab. For a series, use consecutive numbers (`007-caching-part-1`, `008-caching-part-2`).
- Start with a comment line: `# Episode <nnn>. Draft (awaiting approval ✋)`.
- Leave `voice:` as `{ voice_id: TBD, speed: 1.0 }`. The next step fills it.

### 6. Assign the voice and music, then validate (run from `engine/`)
```bash
npm run voice:assign -- <nnn>        # round robin; Part 2 reuses Part 1's voice (assign Part 1 first)
npm run music:assign -- <nnn>        # random theme track, never the previous episode's; Part 2 reuses Part 1's
npm run validate -- <nnn>
```
Fix every `✖` error and re-run until it says `✔ PASS`. Warnings are fine if you can justify them.

### 7. Log it
- New terms that might be mispronounced (product names, acronyms) → add rows to `episodes/pronunciations.md` with status `to check`.
- Add or update the row in `episodes/INDEX.md` with status `scripted`.

### 8. Hand over for approval ✋ (stop here)
Show Imad a readable version, not the raw YAML:
- Title, target and estimated length, voice, single or Part 1/2.
- A table: part | headline | voiceover line | what's on screen.
- "Needs for /video": unbuilt templates, new node types or icons, missing logos.

Ask for approval or changes. On approval, change the file's first comment to `# Episode <nnn>. Script approved <date>`, set INDEX status to `script approved`, and suggest running `/video <nnn>`.

## Don'ts
- Don't invent templates, node types or verbs outside the menus. Don't hand-write captions (they come from `vo`).
- Don't show third-party logos outside diagram nodes, or imply sponsorship.
- Don't call ElevenLabs here. `voice:assign` and `music:assign` are local only, so no credits are used.
