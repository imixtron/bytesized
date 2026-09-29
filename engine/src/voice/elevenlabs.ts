// Minimal ElevenLabs client (Node side only — never bundled into Remotion).
// The key is read from engine/.env and never logged.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.elevenlabs.io/v1";

export function apiKey(engineDir: string): string {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY;
  const envPath = join(engineDir, ".env");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*ELEVENLABS_API_KEY\s*=\s*"?([^"\s]+)"?\s*$/);
      if (m) return m[1];
    }
  }
  throw new Error("ELEVENLABS_API_KEY missing: add it to engine/.env");
}

async function call(key: string, path: string, init: RequestInit = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": key, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`ElevenLabs ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res;
}

export type Voice = {
  voice_id: string;
  name: string;
  category?: string;
  description?: string | null;
  labels?: Record<string, string>;
  preview_url?: string;
};

export async function listVoices(key: string): Promise<Voice[]> {
  const res = await call(key, "/voices");
  return ((await res.json()) as { voices: Voice[] }).voices;
}

export type VoiceSettings = { stability?: number; similarity_boost?: number; style?: number; use_speaker_boost?: boolean; speed?: number };
export const MODEL = "eleven_multilingual_v2";

/** Plain TTS → mp3 bytes. */
export async function speak(key: string, voiceId: string, text: string, settings: VoiceSettings = {}): Promise<Buffer> {
  const res = await call(key, `/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: "POST",
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: settings }),
  });
  return Buffer.from(await res.arrayBuffer());
}

export type Alignment = { characters: string[]; character_start_times_seconds: number[]; character_end_times_seconds: number[] };

/** TTS with character-level timestamps → mp3 bytes + alignment. */
export async function speakWithTimestamps(
  key: string, voiceId: string, text: string, settings: VoiceSettings = {},
  context: { previous_text?: string; next_text?: string } = {},
) {
  const res = await call(key, `/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    body: JSON.stringify({ text, model_id: MODEL, voice_settings: settings, ...context }),
  });
  const json = (await res.json()) as { audio_base64: string; alignment: Alignment };
  return { audio: Buffer.from(json.audio_base64, "base64"), alignment: json.alignment };
}

export async function subscription(key: string) {
  const res = await call(key, "/user/subscription");
  return (await res.json()) as { tier: string; character_count: number; character_limit: number; next_character_count_reset_unix?: number };
}
