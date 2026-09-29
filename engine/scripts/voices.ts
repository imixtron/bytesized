// Voice audition helper.
//   npm run voices                         → list available voices + remaining credits
//   npm run voices -- sample <id> [<id>…]  → render the pilot hook line in each voice to out/voice-samples/ (scratch, safe to delete)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { apiKey, listVoices, speak, subscription } from "../src/voice/elevenlabs";

const ENGINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const SAMPLE =
  "How does Netflix survive millions of people hitting play at once? That's system design. And load balancers? They're the traffic cops.";

const key = apiKey(ENGINE);
const [cmd, ...ids] = process.argv.slice(2);

// Credit info needs the optional "User: read" key permission; skip quietly without it.
await subscription(key)
  .then((sub) => console.log(`plan: ${sub.tier} · credits used ${sub.character_count}/${sub.character_limit}`))
  .catch(() => console.log("plan: (add the 'User: read' key permission to see remaining credits)"));

const voices = await listVoices(key);
if (cmd !== "sample") {
  for (const v of voices) {
    const l = v.labels ?? {};
    const tags = [l.gender, l.age, l.accent, l.descriptive ?? l.description, l.use_case ?? l["use case"]].filter(Boolean).join(" · ");
    console.log(`${v.voice_id}  ${v.name.padEnd(28).slice(0, 28)}  ${(v.category ?? "").padEnd(10)}  ${tags}`);
  }
} else {
  const outDir = join(ENGINE, "out/voice-samples");
  mkdirSync(outDir, { recursive: true });
  for (const id of ids) {
    const v = voices.find((x) => x.voice_id === id);
    const name = (v?.name ?? id).split(/\s+[-–]\s+/)[0].replace(/[^\w-]+/g, "_");
    const mp3 = await speak(key, id, SAMPLE, { stability: 0.4, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true });
    const file = join(outDir, `${name}.mp3`);
    writeFileSync(file, mp3);
    console.log(`✔ ${name} → out/voice-samples/${name}.mp3`);
  }
}
