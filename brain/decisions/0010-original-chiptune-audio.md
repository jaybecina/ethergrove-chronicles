# 0010 — Original chiptune music and sound, generated in the browser

- **Status:** superseded by [[decisions/0012-ethergrove-audio-direction]] · **Date:** 2026-10-26 · **Evidence:** `docs/superpowers/specs/2026-10-26-hearthvale-chiptune-audio-design.md`,
  `apps/web/src/audio/`, `CREDITS.md`

## Context

The game had no music, and the owner found the sound effects ugly: Kenney sample files mixed with a fallback
synth, which didn't match. The owner asked for "the most beautiful" retro / console-RPG style music and sound,
original, with music for every situation.

## Decision

- Hearthvale has its own Web Audio chiptune engine (`audio/chip/`). It uses band-limited pulse waves, a stepped
  triangle, a music box, LFSR noise, a soft echo and a compressor.
- The soundtrack is original scores in a small text format (`audio/songs/`):
  - 8 looping tracks: title, the four seasons, night, home and shop. Each season track has a rain arrangement.
  - 4 jingles. The "Hearth motif" leitmotif ties the soundtrack together.
- The SFX are blip recipes (`audio/sfx.ts`). There are no audio files, and Howler is removed.
- A pure `pickTrack()` chooses the music from screen, overlay, location, time and weather.

## Rejected

- **Tone.js:** about 150 KB more JS for what a ~20 KB engine does.
- **MIDI files with a General MIDI soundfont:** 1–30 MB of downloads, messy soundfont licences, and it sounds
  like a 90s PC game rather than a console one.
- **CC0 music packs:** they wouldn't share a motif or fit each situation.

## Consequences

- Nobody can hear a test. `songs/index.test.ts` pins structure, e2e `renderAudio` pins loudness (RMS), and
  `pnpm --filter web audition` renders WAVs for a person to judge by ear.
- New music must stay original (decision 0004). Write it inside the score format; `validateSong` rejects bars of
  the wrong length.
- Ambient beds (birds, rain loops) were dropped as dead code. A future spec can add them as synthesized
  ambience.
