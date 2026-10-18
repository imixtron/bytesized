# Pronunciation tracker

Tech terms the voiceover says wrong (or might). Add them **as they come up**: when `/script` writes a new term or a render sounds off. Fixes go in `episodes/pronunciations.json` (`{ "Term": "respelling" }`, one word each): `npm run voice` swaps them into the text sent to ElevenLabs only, so captions and beat words keep the written term. A changed respelling re-voices just the scenes that use the term.

| Term | Should sound like | Heard wrong in | Status |
|---|---|---|---|
| _e.g._ PostgreSQL | "post-gress-Q-L" | — | example |
| idempotency / Idempotent | "eye-dem-POH-tun-see" / "eye-dem-POH-tent" | 004 (VO only says "idempotency") | to check |
| HTTP, API | spelled out: "H-T-T-P", "A-P-I" | 004 | to check |
| GET / PUT / POST / DELETE | read as words ("get", "put"), not spelled out | 004 | to check |
| TCP, UDP | spelled out: "T-C-P", "U-D-P" | 005 | to check |
| NGINX | "engine-X" | 007 (read as "N-G-I-N-X") | **fixed** via `episodes/pronunciations.json` (`"NGINX": "engine-x"`) |
| HAProxy | "H-A-proxy" | 007 | to check |
| AWS ALB | spelled out: "A-W-S A-L-B" | 007 | to check |
| CDN | spelled out: "C-D-N" | 008 | to check |
| Akamai | "AH-kuh-my" | 008 | to check |
| Cloudflare, Fastly | read as words | 008 | to check |
| CNAME | "see-name" | 009 | to check |
| DNS, MX, TXT, TTL, IP | spelled out: "D-N-S", "M-X", "T-X-T", "T-T-L", "I-P" | 009 | to check |
| google.com | "google dot com" | 009 | to check |
