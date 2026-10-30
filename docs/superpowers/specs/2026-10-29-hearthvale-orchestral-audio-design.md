# Hearthvale: Orchestral Soundtrack and Sound Design Spec

> Written when the game was named Hearthvale; it is now Ethergrove Chronicles (see [the 2026-10-29 spec](2026-10-29-ethergrove-chronicles-design.md)).
> Soundtrack superseded by [the Ethergrove audio spec](2026-10-30-ethergrove-audio-design.md).

**Status:** draft for review · **Date:** 2026-10-29 · **Branch:** `feat/bgm-sound-effects`

**Replaces:** the sound of `2026-10-26-hearthvale-chiptune-audio-design.md`, which was never merged. That spec's
music director (§5), menu blips (§8), sound-system rules and tests stay. This spec replaces its engine (§3), score
sound (§4), soundtrack (§6), SFX (§7) and previews (§10.4).

This spec is written so an implementer with no context can build it. Every name, number and rule is given.
"MUST" means exactly that. The creative task left open is writing the melodies and voicings inside the forms and
chord charts in §6; §6.1 sets the rules for that.

---

## 1. Goal

The owner wants modern, console-quality RPG music and sound in place of the chiptune: warm, majestic orchestral
music with tasteful modern synth layers, a theme for every place and situation, and gentle, polished sound
effects. Everything must be original and every source CC0. The download must stay small.

### 1.1 Success criteria

1. Every situation in the chiptune spec §5.1 plays its own orchestral track, and changes crossfade smoothly.
2. Every SFX and menu blip is a new sample-based sound with a soft room reverb.
3. All music and SFX are original compositions or recipes. Samples come only from VSCO 2 CE (CC0 1.0).
4. Shipped audio is AAC in `.m4a`. Total size ≤ 9 MB, each track ≤ 1 MB, each SFX ≤ 40 KB, each jingle ≤ 120 KB.
5. Loops are seamless: no click or gap at the loop point (§3.4).
6. The game's JS bundle gets smaller. The studio code is never imported by the game.
7. Nothing new runs per frame. No more than 2 decoded tracks are held in memory.
8. The owner listens to the shipped `.m4a` files before merging (§9.4).
9. All checks pass (`pnpm checks`).

### 1.2 Decisions already made (do not revisit)

- **Rendered offline, played as files.** Music and SFX are composed as scores, rendered by a "studio" in headless
  Chromium with real samples, compressed with macOS `afconvert`, and committed as `.m4a`. The game streams them.
  This is how console games ship music, and it keeps runtime CPU and memory low.
- **Samples:** VSCO 2 Community Edition, CC0 1.0, at `VSCO_DIR` (default `../VSCO-2-CE` from the repo root;
  the owner's copy is at `/Users/apple/Documents/Jay Dev/VSCO-2-CE`). Samples are never copied into the repo or
  committed.
- **Format:** AAC-LC, 64 kbps, 44.1 kHz. Music is stereo and SFX are stereo. It plays in Chrome, Safari, Firefox,
  iOS and Android, so there is no second format.
- The rain arrangement is a live filter in the game, not extra files.
- The core (`packages/core`) and saves are untouched.

## 2. Scope

### 2.1 In scope

- The studio:
  - a sampler, synth layers, a generated hall reverb, a mixer, an offline renderer and a WAV writer;
  - the score format, extended for orchestral parts;
  - 8 tracks, 7 jingles (`morning`, `lessonsComplete`, `faint`, and `season-<season>` for each of the 4 seasons)
    and 22 SFX;
  - the `studio` script that renders, normalizes and encodes them.
- The game runtime:
  - an AAC loop player with crossfades, rain and pause filters, and jingle ducking;
  - a manifest of files and loop points;
  - removing the chip engine from the game bundle.
- Tests, the e2e audio checks, the size budget, credits and docs.

### 2.2 Out of scope

- Ambient beds (still out, as in the chiptune spec §1.2).
- New settings.
- Adaptive stems or layering.

### 2.3 Files

```
apps/web/studio.html                     dev-only entry (never in the production build: vite builds index.html only)
apps/web/src/studio/
  notes.ts, score.ts, sequencer.ts       moved from audio/chip/, extended (§4)
  samples.ts                             VSCO sample map: InstrumentId → files, root notes, layers (§3.1)
  sampler.ts                             note → nearest sample, pitch, velocity layer, round robin, envelope
  synths.ts                              pad, subBass, arp, choir (§3.2)
  reverb.ts                              seeded generated hall impulse response (§3.3)
  render.ts                              renderPiece(id) → stereo Float32Arrays, loop wrap, normalize (§3.4)
  wav.ts                                 16-bit stereo WAV writer
  main.ts                                exposes window.studio for the script
  pieces/*.ts                            8 tracks, 7 jingles (§6), sfx.ts (§7), index.ts
  *.test.ts                              beside each file
apps/web/scripts/studio.mjs              drives Chromium, writes WAV, runs afconvert, writes public files + manifest
apps/web/public/assets/music/<id>.m4a    tracks and jingles (committed)
apps/web/public/assets/sfx/<id>.m4a      SFX (committed)
apps/web/src/audio/
  manifest.ts                            generated by the studio: files, bytes, loopStart/loopEnd (committed)
  player.ts                              AAC loop player (§5)
  orchestraBackend.ts                    AudioBackend over player.ts (replaces chipBackend.ts)
  music.ts, sound.ts, install.ts, menuSounds.ts, soundMap.ts   kept; small changes in §5.4
Deleted from the game: audio/chip/*, audio/songs/*, audio/sfx.ts, audio/offline.ts, audio/chipBackend.ts
  (score, sequencer and notes move to studio/; the chip voices are deleted).
apps/web/scripts/audition.mjs            deleted (the studio script makes the previews)
```

## 3. The studio

### 3.1 Sampler (`samples.ts`, `sampler.ts`)

`InstrumentId` (sampled):

- **Strings:** `violins`, `violinsPizz`, `violinsTrem`, `violas`, `cellos`, `cellosPizz`, `basses`, `harp`
- **Brass:** `horn`, `trumpet`, `trombone`, `tuba`
- **Woodwinds:** `flute`, `oboe`, `clarinet`, `clarinetStac`, `bassoon`
- **Keys and pitched percussion:** `piano`, `glock`, `marimba`

The sample map lists each instrument's VSCO folder and filename pattern, e.g. `Strings/Violin Section/susVib`,
`VlnEns_susVib_<note>_v<layer>.wav`. The plan gives every pattern.

**Reading root notes:**
- A root note is read from the name: `[A-G]#?-?\d` (octaves 0–8; VSCO uses sharps only).
- Upright Piano files are `Player_dyn<1|2>_rr1_<idx>.wav`. Their key comes from `Keys/Upright Piano/MappingChart.txt`,
  where `idx → MIDI key number`.

**Velocity layers:** `v1` is the softest. Dynamics map to layers as follows:

| Dynamic | Layer |
|---|---|
| pp, p | lowest |
| mp, mf | middle (rounded down) |
| f, ff | highest |

**Playing a note:**
- Choose the nearest root at or below the note, otherwise above, never more than ±7 semitones away. Then set
  `playbackRate = 2^((note − root)/12)`.
- Round robins (`rr1`, `rr2`) alternate.
- Envelope: a 5 ms attack, then hold. At the note's end, release with a time constant of 0.08 s for plucked or
  struck instruments and 0.25 s for sustained ones.
- A note longer than its sample plays the whole sample and its natural decay. Sustained parts MUST keep notes
  within the sample length, which the plan lists per instrument.

**Unpitched percussion** uses kit names (§4.2), each mapped to one or more VSCO files:

| Kit name | VSCO source |
|---|---|
| `timpHit` | Timpani hits |
| `timpRoll` | Timpani rolls |
| `bassDrum` | `VSCO 1 Percussion/drums/bass/bdrum_mp_*` |
| `cymbalSwell` | `varMetal/Cymbals/susp` roll |
| `triangle` | `varMetal/triangle` |
| `sleigh` | `Misc 2/sleighbell1_hit_*` |
| `tamb` | `Misc 2/tamb3_*` |
| `shaker` | `varMetal/various/cabasa_*` |
| `claves` | `varWood/claves_mp.wav` |
| `logDrum` | `varWood/log_drum` |
| `bellTree` | `varMetal/various/bell_tree_scrape*` |
| `glockGliss` | `Misc 2/glock_glisses` |
| `gong` | `varMetal/Gong/gong_hit_p.wav` |

### 3.2 Synth layers (`synths.ts`)

Synths are used sparingly, for the "modern" sheen:

| Id | Sound |
|---|---|
| `pad` | 3 sawtooth oscillators at ±7 cents through a lowpass at 1800 Hz (Q 0.5); attack 0.8 s, release 1.5 s |
| `subBass` | sine, plus a sine an octave up at 0.15; attack 10 ms, release 0.15 s |
| `arp` | square wave through a lowpass with an envelope (3000 → 600 Hz over 0.18 s); attack 3 ms, release 0.1 s |
| `choir` | sawtooth through two bandpasses (700 Hz and 1200 Hz, Q 6) mixed 0.6 / 0.4, slow vibrato 5 Hz ±8 cents; attack 0.6 s, release 1.2 s |

### 3.3 Reverb (`reverb.ts`)

`hallImpulse(sampleRate, seconds = 2.8, seed = 7)` returns a stereo `AudioBuffer`:
- decorrelated noise from a seeded PRNG (mulberry32), separately for L and R;
- an envelope `exp(−6.9·t/seconds)`, which is −60 dB at `seconds`;
- 20 ms of silence first (pre-delay);
- a one-pole lowpass that falls from 12 kHz to 3 kHz over the tail.

The output is deterministic: the same seed gives the same samples. SFX use `roomImpulse` (0.6 s, seed 11).

### 3.4 Render and loop (`render.ts`)

`renderPiece(piece)`:
1. **Graph:** one bus per part (gain, pan) → a dry master and a reverb send (`piece.reverb` per part, default 0.3).
   The reverb returns to the master → a `DynamicsCompressor` (threshold −14 dB, ratio 2.5, attack 0.02 s, release
   0.25 s) → the output.
2. **Loops (tracks):** render 2 full passes plus 3 s of tail, at 44.1 kHz stereo. Keep the second pass (that is,
   `[L, 2L)`), so the reverb tail from the first pass wraps into its start. Then the file is
   `[the last 0.5 s of the kept pass] + [the kept pass] + [its first 0.5 s]`, giving `loopStart = 0.5` and
   `loopEnd = 0.5 + L`. Any encoder priming delay shifts both points equally over identical audio, so the loop
   stays seamless in every decoder.
3. **One-shots (jingles, SFX):** render once with a tail (jingles 3 s, SFX 0.8 s), then trim trailing samples
   below −70 dBFS.
4. **Normalize:**
   - Tracks to an RMS of 0.1 (−20 dBFS) with a peak ≤ 0.89 (−1 dBFS). If the peak would be exceeded, use the
     lower gain.
   - Jingles to an RMS of 0.11.
   - SFX to a peak of 0.7, then the recipe's `level`.

`studio.mjs` writes the WAV (`wav.ts`) to `apps/web/studio-out/` (gitignored). It then runs
`afconvert <wav> <out>.m4a -f m4af -d aac -b 64000` and writes `src/audio/manifest.ts` with `{ file, bytes, duration, loopStart, loopEnd }`
for tracks and `{ file, bytes, duration }` for the rest. `duration` is the WAV's length in seconds.
`apps/web/studio-out/` is added to `.gitignore`. Samples are served to the studio page by Playwright `page.route('/vsco/**')`
from `VSCO_DIR`. `studio.mjs` exits with a clear message if `VSCO_DIR` or `afconvert` is missing.

## 4. Score format (extended)

### 4.1 Parts

```ts
interface PartSpec {
  instrument: InstrumentId | SynthId | 'kit';
  notes: string;                   // same tokens as before; for 'kit' parts, one kit token per step (§4.2)
  gain?: number;                   // default 0.5
  pan?: number;                    // −1..1, default from §4.3
  reverb?: number;                 // send 0..1, default 0.3
  dyn?: string;                    // one dynamic per bar: pp p mp mf f ff, or a hairpin `<` or `>` (see below)
  arp?: 'up' | 'down' | 'updown' | 'block';
  arpRate?: number;
  octave?: number;                 // transpose the part by whole octaves
}
interface Piece { id: string; kind: 'track' | 'jingle' | 'sfx'; bpm: number; meter: 3 | 4; swing?: number;
  parts: Record<string, PartSpec>; level?: number }
```

- **Bars:** every part has the same bar count. `validatePiece` names the piece, part and bar on any error, as
  `validateSong` did.
- **`dyn` tokens and gain:**
  - pp 0.25, p 0.4, mp 0.55, mf 0.7, f 0.85, ff 1.0.
  - `<` and `>` ramp linearly from the previous bar's value to the next one's over the bar.
  - The final note gain is `part.gain × dyn`, and the dynamic also picks the velocity layer (§3.1).

### 4.2 Kit parts

A kit part reads one character per step. `.` is a rest, and the other characters are defined in the piece:

```ts
kit: { k: 'bassDrum', t: 'tamb', s: 'shaker', g: 'glockGliss', ... }
```

### 4.3 Default pan (orchestral seating)

| Instruments | Pan |
|---|---|
| violins | −0.35 |
| violas | −0.1 |
| cellos | 0.25 |
| basses | 0.4 |
| harp | −0.5 |
| piano | 0 |
| horn | 0.3 |
| trumpet | 0.15 |
| trombone, tuba | 0.35 |
| flute | −0.2 |
| oboe | 0.05 |
| clarinet | −0.15 |
| bassoon | 0.2 |
| glock, marimba | −0.25 |
| synths | 0 |
| kit | 0 |

## 5. Game runtime

### 5.1 Player (`player.ts`)

- **Loading:** `loadTrack(id)` fetches `/assets/music/<file>` and calls `decodeAudioData`. Compressed bytes are
  cached for every track loaded; decoded buffers are cached for the 2 most recently used tracks only (an LRU).
- **Playing:** an `AudioBufferSourceNode` with `loop = true`, `loopStart` and `loopEnd` from the manifest, started
  at offset `loopStart`.
- **Crossfade:** 1.2 s. A track that is already fading is cut in 30 ms, so at most 2 ever overlap. This keeps the
  chiptune ruling.
- **Graph:** `trackBus` (duck) → `musicFilter` (rain, pause) → `musicOut` (volume × pause 0.6) → master; and
  `sfxOut` → master.
- **Rain:** `musicFilter` at 1800 Hz. Normal: 20000 Hz. Paused: 1200 Hz. Ramps take 0.4 s. The `trackBus` gain
  target is always `duck × (rain ? 0.8 : 1)`, so rain and ducking can't overwrite each other.
- **Jingles:** decoded once and kept (they are small). They connect straight to `musicFilter`, past the duck. The
  duck (`duck` = 0.25) takes 80 ms, and the track comes back to `duck` = 1 over 0.8 s after the jingle ends.
- **SFX:** decoded on first use and kept. They play at `currentTime + 0.005` with a `playbackRate` of `pitchMul`.
- **Failures:** a fetch or decode failure is caught. That sound is silent, and the game goes on.

### 5.2 Backend (`orchestraBackend.ts`)

- It implements the existing `AudioBackend` and `stats()`: `contextState`, `activeTracks`, and `loaded` (the
  count of decoded buffers).
- `cue(c)` maps a `CueId` to a track and the rain flag via `cueParts`.
- The context is created on the first `resume()`, inside the unlocking gesture, which keeps the retry from the
  chiptune ruling.

### 5.3 Memory and network

- At most 2 decoded track buffers are held. A 90 s stereo track at 48 kHz takes about 35 MB.
- Only the current scene's track downloads. The title track loads on the first gesture.

### 5.4 Changes to kept modules

- `AudioBackend.jingle(id, transpose)` becomes `jingle(id: JingleFile)`, where
  `JingleFile = 'morning' | 'lessonsComplete' | 'faint' | `season-${Season}``.
- `install.ts` passes `season-<new season>` for the season jingle, read from the batch's `seasonChanged`.
- `JINGLE_TRANSPOSE` is deleted.
- The debug hook's `renderAudio` becomes `probeAudio(kind, id)`. It fetches and decodes the shipped file and
  returns `{ rms, duration, loopStart?, loopEnd? }`.

## 6. The soundtrack

### 6.1 Composition rules (MUST)

- **Originality:** all melodies are new. Never quote or paraphrase existing game, film, classical or pop
  melodies. That includes no famous RPG prelude arpeggio patterns and no victory-fanfare rhythms copied from
  games.
- **The Hearth motif** (from the chiptune spec, in F: `A4:2 C5:2 D5:4 C5:2 A4:2 G4:4 | F4:2 G4:2 A4:2 C5:2 G4:8`)
  appears in `title`, `night`, `home` and every `season-*` jingle.
- **Voicing:**
  - Strings voice chords in close position, with the cellos and basses on the root.
  - Brass enters only at mf or louder.
  - Each section of a track changes orchestration, so the loop never feels repetitive.
- **Instrument ranges:**

  | Instrument | Range |
  |---|---|
  | violins | G3–E6 |
  | violas | C3–A5 |
  | cellos | C2–E5 |
  | basses | E1–G3 |
  | horn | B2–F5 |
  | trumpet | F#3–C6 |
  | flute | C4–C7 |
  | oboe | B3–F6 |
  | clarinet | E3–C6 |
  | bassoon | Bb1–D5 |
  | harp | C2–G6 |
  | piano | A1–C7 |
  | glock | G5–C8 |

- **Ending:** every track ends on a chord that leads back into its first bar.

### 6.2 Tracks

| Cue | Title | Key, tempo, meter, bars | Form, chords and orchestration |
|---|---|---|---|
| `title` | **Hearthvale** | F major, 72, 4/4, 24 bars (80 s) | **A** F Dm B♭ C · F Dm Gm7 C: harp up-arpeggios, violas and cellos pad at p, the flute plays the Hearth motif. **B** B♭ C Am Dm · Gm B♭ Csus4 C: horns take the theme at mf, a cello countermelody, a timpani roll swelling into bar 17. **C** F C/E Dm B♭ · F/C C B♭ F: tutti at f, violins with the theme in octaves, horn and trombone chords, a cymbal swell into bar 17, then a decrescendo to p over bars 23–24 |
| `spring` | **Seedlings Wake** | C major, 96, 4/4, 32 bars (80 s) | **A** C G Am F · C G F G: flute melody, violins pizzicato off-beats, harp, marimba, a light shaker. **B** F G Em Am · F G C C: a clarinet countermelody, the cellos sustain, a tambourine on beats 2 and 4. **A′**: violins take the melody sustained, flute descant. **B′**: tutti at mf |
| `summer` | **Sunwarm Fields** | D major, 108, 4/4, 32 bars (71 s) | **A** D G D A · Bm G A D: piano chords, a synth `arp` in 16ths (filtered), `subBass`, a claves and bass-drum groove, violins melody. **B** G A F♯m Bm · G A Em7·A D: horn melody, the strings sweep, a cymbal swell into A′. **A′**: the trumpet joins the melody at f. **B′**: brass drops out, ending at mf |
| `fall` | **Amber Harvest** | A minor (dorian colour), 88, 3/4, 32 bars (65 s) | **A** Am G Am D · Am G Em Am: oboe melody, harp waltz, cellos pizzicato on beat 1, violas on 2 and 3. **B** F G Am Am · F G E E: violins take the melody, a bassoon countermelody, `pad`. **A′**: flute and oboe in thirds. **B′**: full strings at mf, then a soft ending on E that leads home |
| `winter` | **Hearth & Snow** | E♭ major, 66, 4/4, 20 bars (73 s) | **A** E♭ Cm A♭ B♭ · E♭ Cm Fm7 B♭: piano melody, a glock doubling every other phrase, strings pad at pp, `pad` shimmer. **B** A♭ B♭ Gm Cm · A♭ Fm B♭sus4 B♭: violins at p with the melody, sleigh bells on the off-beats, a harp gliss into bar 17. Last 4 bars: piano alone |
| `night` | **Fireflies** | F major, 60, 4/4, 16 bars (64 s) | **A** Fmaj7 Am7 B♭maj7 C · Fmaj7 Dm7 Gm7 Csus4·C: piano broken chords, the flute plays the Hearth motif at half speed, `pad` and `choir` at pp. **B** B♭maj7 Am7 Gm7 C · Fmaj7 Dm7 Gm7·C F: harp sparkles, violas sustain, a glock on the last note. No percussion |
| `home` | **Grandpa's Kitchen** | G major, 76, 4/4, swing 0.12, 24 bars (76 s) | **A** G Em C D · G Em Am7·D G: upright piano with clarinet melody, cellos pizzicato walking bass, a soft shaker. **B** C D Bm Em · C D Am7 D: the Hearth motif in G on bassoon, then clarinet. **A′**: piano melody, with violas joining at p |
| `shop` | **Wandering Wares** | B♭ major, 116, 4/4, 32 bars (66 s) | **A** B♭ Gm E♭ F · B♭ Gm Cm·F B♭: a staccato clarinet hook, bassoon answers, violins pizzicato, tuba oom-pah, marimba, tambourine. **B** E♭ F Dm Gm · E♭ F Cm F: piano takes the hook, horn stabs on 2 and 4. **A′**: tutti. **B′**: down to pizzicato and marimba, then a turnaround |

### 6.3 Jingles

| Id | Length | Content |
|---|---|---|
| `morning` | about 3 s | C major. A harp glissando C4→C6 over 0.6 s, a flute `G5 C6 E6`, a glock C7 sparkle, strings `(C4 E4 G4)` at p |
| `season-spring`, `season-summer`, `season-fall`, `season-winter` | about 5 s | The Hearth motif's 2 bars on horns at mf, with strings, a timpani roll into the last chord and a cymbal swell. Keys: spring C, summer D, fall A minor (the motif in minor), winter E♭. Winter adds sleigh bells |
| `lessonsComplete` | about 5 s | C major. Trumpets and horns with an original rising fanfare (`C5 E5 G5 C6`, then `A5 B5 D6 C6` held), strings tremolo, timpani hits on beat 1 of each bar, a cymbal on the final chord |
| `faint` | about 4 s | Cellos descend `E4 Eb4 D4 Db4 C4`, with a low piano cluster `(C2 G2 C3)` at pp and the `pad` fading |

## 7. Sound effects (`pieces/sfx.ts`)

All SFX play through a `roomImpulse` reverb at a send of 0.15. Each has a `level` (0–1) applied after
normalization.

| SoundId | Recipe | Level |
|---|---|---|
| `hoe` | `Misc 1/brick_scrape.wav` (first 180 ms, fade out) + `bdrum_muted_pp_1` lowpassed at 300 Hz | 0.7 |
| `water` | `Misc 1/bubbles.wav` (400 ms) + harp E6 pp | 0.6 |
| `sickle` | `tamb3_1` highpassed at 4 kHz + `cabasa_1`, 150 ms | 0.55 |
| `chop` | `log_drum` hit + `claves_mp` at −8 dB | 0.75 |
| `break` | `Misc 1/metal_hit3.wav` lowpassed at 2.5 kHz + `bdrum_mp_1` | 0.7 |
| `swing` | `cabasa_2` with its playback rate swept 0.8 → 1.3 | 0.35 |
| `harvest` | marimba C6, then glock G6 at 60 ms, plus a `bellTree` sparkle at −12 dB | 0.7 |
| `plant` | marimba G4 at p + `shaker` at −10 dB | 0.55 |
| `refill` | `bubbles2.wav` (700 ms) | 0.6 |
| `eat` | `claves_pp1`, twice, 120 ms apart, + harp G5 at 260 ms | 0.55 |
| `coin` | glock C7 + `triangle` at −10 dB | 0.6 |
| `door` | `bdrum_muted_mp_1` lowpassed at 600 Hz + `claves_mp` pitched down an octave | 0.6 |
| `chime` | `glockGliss` + harp `E5 G#5 B5 E6` arpeggio at 50 ms steps | 0.7 |
| `deny` | piano `D3`, then `C#3` at 90 ms, at p + `bdrum_muted_ppp_1` | 0.5 |
| `thunder` | `timpRoll` + `bdrum_roll1` lowpassed at 400 Hz, 2.2 s | 0.8 |
| `step-grass` | `cabasa_3` highpassed at 2 kHz, 60 ms | 0.18 |
| `step-dirt` | `bdrum_muted_ppp_2` lowpassed at 900 Hz | 0.2 |
| `step-wood` | `claves_pp1` lowpassed at 1.5 kHz | 0.2 |
| `step-snow` | `maraca1` lowpassed at 2 kHz | 0.2 |
| `menuMove` | glock C7 lowpassed at 4 kHz, 80 ms | 0.25 |
| `menuConfirm` | harp `E5`, then `B5` at 50 ms | 0.4 |
| `menuBack` | harp `B5`, then `E5` at 50 ms | 0.35 |

Exact sample paths are confirmed in the plan against `VSCO_DIR`. If a named file is missing, use the nearest
file in the same folder and record it in the plan.

## 8. Credits and docs

- **`CREDITS.md`, Music and sound:** "All music and sound effects are original to Hearthvale, composed for the
  game. They are performed with samples from **VSCO 2 Community Edition** by Versilian Studios (CC0 1.0); the
  upright piano was sampled by Simon Dalzell of Ivy Audio. https://github.com/sgossner/VSCO-2-CE"
- **Brain:** `brain/decisions/0010-original-chiptune-audio.md` is renamed to `0010-original-orchestral-audio.md`
  and rewritten. Chiptune is listed under Rejected ("owner found it too dated"), and `MEMORY.md` is updated.
- **`AGENTS.md`:** the loop bullet and the "Audio is generated" gotcha are rewritten for the studio workflow.
  This covers `pnpm --filter web studio`, `VSCO_DIR`, and committing the `.m4a` and `manifest.ts` together.

## 9. Testing

### 9.1 Unit

- **studio:**
  - parsing the sample map;
  - choosing the nearest root and velocity layer;
  - mapping dynamics to gain and ramping hairpins;
  - `validatePiece` errors;
  - every piece validates, has its bar count, and has the leitmotif where required;
  - the reverb IR is deterministic and decays;
  - the WAV header;
  - the loop-wrap layout;
  - normalization math.
- **audio:**
  - `player` with the fake context: the LRU of 2, crossfade and quick-cut, loop points set from the manifest,
    rain and pause filter targets, the jingle duck, and a decode failure that stays silent;
  - `orchestraBackend` with no context;
  - the existing `music`, `sound`, `menuSounds` and `install` tests, updated for `JingleFile`.
- **`audio/assets.test.ts`** (node environment):
  - every manifest file exists and its byte size equals the file's;
  - the budgets in §1.1.4 hold;
  - `loopEnd − loopStart` is within the track's expected seconds ±0.05;
  - no `.m4a` in `public/` is missing from the manifest.

### 9.2 E2E (`e2e/audio.spec.ts`, Chromium and WebKit)

- Keep:
  - unlock;
  - cue per place;
  - rain;
  - flapping (≤ 2, then 1);
  - the hidden tab.
- Add:
  - `probeAudio` for every track, jingle and SFX: `rms > 0.01` (SFX > 0.005), and `duration` within ±0.1 s of
    the manifest;
  - **seamless loop:** for each track, the decoded samples at `loopStart` and at `loopEnd` (2048 samples each)
    match with correlation > 0.99.

### 9.3 Must-fail checks

Every test is run red first. Temporarily break the loop wrap (keep the first pass instead of the second) and
confirm the seamless-loop e2e fails.

### 9.4 Listening

The studio writes WAVs to `apps/web/studio-out/` and the `.m4a` files to `public/`. The owner listens to the
`.m4a` files, which are exactly what ships, before merging. The implementer reports levels and peaks and never
claims the sound "is good".

## 10. Acceptance criteria

1. Every situation plays its orchestral track. All tests and `pnpm checks` pass.
2. Audio budgets: ≤ 9 MB total, track ≤ 1 MB, jingle ≤ 120 KB, SFX ≤ 40 KB. The JS budget is unchanged and the
   game bundle is smaller than now.
3. Seamless loops are verified in Chromium and WebKit.
4. There are no samples in the repo, and every source is CC0 and credited.
5. The owner has listened to the files.
