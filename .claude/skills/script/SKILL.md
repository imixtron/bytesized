---
name: script
description: Script Creator for Bytesized, the 80–90s system-design shorts of Back in a Gist. Turns a topic, notes or a rough draft into a validated episodes/<nnn-slug>/episode.yaml (or a Part 1 + Part 2 pair), assigns the round-robin voice, and stops for Imad's approval. Use when asked to write, draft, plan or rework a Bytesized episode or script.
---

# /script: topic → episode.yaml

You write **one Bytesized episode** as `episodes/<nnn-slug>/episode.yaml`. Everything visual is chosen from a fixed menu, so the Video Creator (`/video`) can render it predictably. You never render video here.

## Read first (sources of truth, don't restate them from memory)
1. `episodes/SCRIPT-FORMAT.md`: rules, file format, menus, validation. **This wins over anything below.**
2. `brand/design-language/DESIGN-LANGUAGE.md`: node families, tone, what a headline looks like.
3. `episodes/001-what-is-system-design/episode.yaml`: the approved pilot, the reference for style and beat density.
4. `episodes/INDEX.md`: existing episodes (numbering, topics already covered, series). Also open the **previous episode's** `episode.yaml` and note its breakdown template order: yours must not match it.
5. `engine/src/templates/index.tsx`: the templates that are **built**. Others in the menu exist in the format but `/video` has to build them first.
6. `episodes/pronunciations.md`: known tricky terms.

## Steps

### 1. Understand the ask
- Input can be a topic ("consistent hashing"), notes, a blog post from backinagist.com, or a draft script. If it's a company's engineering ("How Netflix streams"), it's a brand episode (step 4).
- If the angle is unclear, ask **one** question at most. Otherwise pick the angle a curious beginner would care about most.

### 2. Size it
- Pick `target_sec` in **80–90** (85 suits most; never over 90). Word budget ≈ `2.5 × (target_sec − 1.5)`: about 195 words for 80s, 210 for 85s, 220 for 90s. This is guidance, not a hard limit.
- **Split into Part 1 / Part 2** when explaining it well needs more than ~220 words or more than 12 breakdown ideas. Max 2 parts. If it would need more, narrow the scope and propose the rest as future episodes.
  - Part 1: gist VO ends with *"Part 2 is next, follow so you don't miss it."* It needs `series.teaser`.
  - Part 2: the hook contains a one-sentence recap and it needs `series.recap`. Both parts share `series.key`.

### 3. Write the story (Hook → Idea → Breakdown ×6–12 → Gist)
- **Hook (0–3s):** a question or surprising claim in the first sentence. No greetings. Make it concrete (a real product, a number, a failure).
- **Idea:** name the concept in plain words, ideally with an everyday analogy.
- **Breakdown:** show *how it works*, one idea per scene, 3–8s each, ideally with a failure/recovery moment. Show the kinds of idea the topic really has (a flow, a sequence, a comparison, a rule, a trade-off), following your visual plan (step 4); don't force variety.
- **BigPicture (optional):** if the breakdown described parts of one system that connect, end the breakdown with a 3–5s `BigPicture` scene: one short line tying it together, 2–4 panels from your own diagram scenes, a `highlight` on each panel as the VO names it (SCRIPT-FORMAT §3b). Skip it for single-mechanism topics. Budget its words inside the 80–90s.
- **Gist:** the VO starts with *"That's the gist:"*, gives a one-line takeaway (≤ 8 words on the card), then *"Follow for more."* (or the Part 2 line).
- **Voice:** playful, a bit cheeky, short sentences. Write numbers as spoken ("two million"). No emojis. Spell brand names the way they're said.
- **Headlines:** ≤ 5 words, exactly one `accent` word that's in the text. Most scenes, but at least one without, never more than 3 in a row, and never on the GistCard. The headline names the idea and must not repeat the VO.

### 4. Make the visual plan, then pick the visuals (menus only)
- **Visual plan first (SCRIPT-FORMAT §3b), before writing scenes:** decide the topic's **1–2 core diagrams** (the spine; it can be built up over up to 5 scenes with `stage.reuse`), then add another template only where the idea genuinely changes kind (a comparison, a rule/fork, an analogy, levels). Use only the diagram kinds the topic has; a single-mechanism topic can be one evolving diagram plus an analogy. Never add a template to tick it off. Write the plan in `visual_plan` (≤300 characters), e.g. `"Spine: one FlowDiagram (app box splits into services, then one fails alone) over 4 scenes. Split for the comparison, Decision for when to pick which, Analogy for the restaurant."`
- Templates, node types, families and verbs come **only** from SCRIPT-FORMAT §3. Prefer built templates. If a scene truly needs an unbuilt one (MetricChart, Zoom), use it and list it under "Needs for /video" in your summary.
- **Pick each breakdown diagram from the idea** with the lookup table in SCRIPT-FORMAT §3b ("if the scene explains X, use Y"): name the kind of idea first, then the template. If an unbuilt template would fit better (STATUS.md → Diagram roadmap), use the closest built one and name the better one in the hand-over.
- **Variety (format 1.5 guards the extremes, `npm run validate` enforces it):** no template for more than 3 separate diagrams in the breakdown (a `reuse` chain counts as one), no `reuse` chain over 5 scenes, `visual_plan` present (≤300 characters). Warnings: 6+ different templates (reads like a sampler), the previous episode's template order, two breakdown scenes in a row with the same template that don't continue it, fewer than half the breakdown as diagrams.
- **Visual Reference:** if the Notion row has `Visual Reference` images (the queue saves them to `bridge/files/notion-<ID>/` first; `npm --prefix engine run refs -- <ID> --list` shows them), open each with the Read tool and look at it. Map each to a template from §3b. If none fits, use the closest and list "missing template: <what the reference shows>" under "Needs for /video", which raises it at Parts Review. It's optional: never wait for one.
- **Families:** `outlined` = inside our system (with states), `solid` = outside it (users, third parties), `hero` = the episode's topic, at most one on screen.
- **FlowDiagram:** give `layers` top → bottom, `nodes`, `links`. Reuse the same diagram across scenes with `stage.reuse: <scene id>` so nodes don't jump.
- **Sequence:** 2–3 `actors`, up to 7 `steps` in total (continue across scenes with `reuse`). One `step` beat per message, on the word that names it. Keep labels short (≤12 characters with 3 actors).
- **Split:** `before` / `after`, each with a `title` chip and 1–4 nodes. `send` a half (`args: {to, kind: roundtrip}` as needed), `highlight` the winner. `variant: race` + `slow:` for speed comparisons.
- **Decision:** questions ≤18 characters, 1–3 checks. One `branch` beat per decision, `args.to: yes|no`.
- **Tiers:** 2–5 tiers with short titles. `reveal` each, then `highlight` the one the voiceover lands on.
- **Beats:** a visual change every 1.5–2s, each `on` a word that is literally in that scene's `vo` (use `"word#2"` for a repeat). Pilot density is the reference.
- **Sounds:** don't list them, because the sound map picks them. Use a beat `sfx:` only for a deliberate exception (`none` to mute).
- **Music:** don't write it by hand. `music:assign` (step 6) picks one of the four sibling theme tracks at random and writes `music.track`. Only set it yourself if Imad asked for a specific track.
- **Brand logos:** only as a `brand` node inside a diagram, and list it in `brands:`. It needs `assets/logos/<brand>/derived/node.png` and `SOURCE.md`. If they're missing, **don't block**: add a task to `TASKS.md` for Imad to download the official kit, and mention it in the summary.

### 5. Write the file(s)
- Folder: `episodes/<nnn>-<slug>/episode.yaml`, where `<nnn>` = highest existing number + 1 (zero-padded) and `slug` is lowercase-kebab. For a series, use consecutive numbers (`007-caching-part-1`, `008-caching-part-2`).
- Start with a comment line: `# Episode <nnn>. Draft (awaiting approval ✋)`.
- Set `format: "1.5"` and `visual_plan: "…"` (step 4).
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
- A table: part | headline | voiceover line | kind of idea → template | what's on screen.
- The breakdown's template order next to the previous episode's.
- If there were Visual Reference images: one line per image, saying which scene and template it became (or "missing template: …").
- "Needs for /video": unbuilt templates, new node types or icons, missing logos.

Ask for approval or changes. On approval, change the file's first comment to `# Episode <nnn>. Script approved <date>`, set INDEX status to `script approved`, and suggest running `/video <nnn>`.

## Don'ts
- Don't invent templates, node types or verbs outside the menus. Don't hand-write captions (they come from `vo`).
- Don't show third-party logos outside diagram nodes, or imply sponsorship.
- Don't call ElevenLabs here. `voice:assign` and `music:assign` are local only, so no credits are used.
