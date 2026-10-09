# Hyperframes Composition Brief: Meme Capsule

## Objective
Create a short launch-style brag video for Meme Capsule, a curated one-tap meme PWA.

## Output
- Composition directory: `brag-output-2026-09-19-042303/composition/`
- Rendered video: `brag-output-2026-09-19-042303/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/Users/prathampandey/Desktop/ai-categoriser/Meme-Capsule`
- Primary files read: `index.html`, `src/App.tsx`, `src/styles.css`, `src/data/fallbackMemes.ts`, `functions/reports.ts`
- Product name: Meme Capsule
- Tagline / strongest claim: `One tap. One curated laugh.`
- Key UI or visual moment to recreate: capsule stage with Spawn a Random Meme, Rare badge, meme card, and Share/Save/Like/LOL action row.
- Copy that must appear verbatim:
  - `One tap. One curated laugh.`
  - `Spawn a Random Meme`
  - `Shaking the capsule...`
  - `CURATED CHAOS`
  - `Meme Reports`
  - `Curated chaos, responsibly shipped.`

## Creative Direction
- Tone preset: default
- Creative direction: warm, playful product launch for an absurdly focused meme machine
- Interpretation: friendly mixed-case typography, comfortable holds, clean wipes, and humor from taking one curated meme extremely seriously.
- Angle: the consumer experience is intentionally tiny and delightful, while the moderation dashboard proves the chaos is still being managed.
- Hook: `One tap. One curated laugh.` over the warm capsule-stage background.
- Outro / punchline: `Curated chaos, responsibly shipped.`
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: `#fff8e7`, with yellow/mint radial glow
- Text: `#16120f`
- Accent: `#ffcc4d`
- Display font: Inter/system sans, heavy weight
- Body font: Inter/system sans
- Visual references from the project: rounded white capsule stage, yellow rarity pill, coral/mint accent dots, rounded black CTA.

## Storyboard
Use `brag-plan.md` as the creative contract.

1. The focused problem — 3.7s — headline and single CTA.
2. Capsule action — 4.9s — simulated tap, shake state, Rare meme reveal.
3. One meme, four ways to react — 4.6s — Share/Save/Like/LOL chips.
4. Approved chaos — 3.4s — reports dashboard with Pending, Resolve, Dismiss.
5. Responsible punchline — 3.4s — Meme Capsule lockup and final line.

## Audio
- Audio role: warm upbeat bed with restrained professional UI accents
- Audio arc: warm hook, brighter reveal, playful action-chip rhythm, dry moderation cut, soft final landing
- Music: `assets/music/happy-beats-business-moves-vol-11-by-ende-dot-app.mp3`
- Music treatment: 0.28-0.34 volume, fade in at start, slight lift around the meme reveal, fade under final lockup.
- Music cue guidance: `assets/music/cues/happy-beats-business-moves-vol-11-by-ende-dot-app.music-cues.json`; major cue targets 3.70s, 8.96s, and 17.91s; action-chip beat-grid window 10.54-12.12s.
- Audio-reactive treatment: subtle capsule-glow and card-presence breathing if supported; no waveform/equalizer graphics. If extraction is unavailable, preserve the planned static glow and document the limitation.
- Audio-coupled moments:
  - Simulated tap on the spawn CTA
  - Meme card reveal near 3.70s
  - Share/Save/Like/LOL row arrival
  - Pending report badge and final logo hit
- SFX selection guidance: choose low/medium high-frequency-risk interface clicks and soft reveal impacts; keep the moderation cut dry.
- SFX analysis guidance: `.agents/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes should choose filenames and timestamps based on the implemented animation.
- Audio files: music and cue metadata are already copied into `composition/assets/music/`.

## Hyperframes Instructions
- Use native Hyperframes composition conventions and GSAP timelines.
- Show the actual product copy and a faithful recreation of the capsule interaction and reports dashboard.
- Keep all text readable and total duration at 20 seconds.
- Use the music asset and sparse SFX.
- Mark major reveal timing around the provided strong cues; prioritize readability over forced synchronization.
- Run `npx hyperframes check` before render.
