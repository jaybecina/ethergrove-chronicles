# Hearthvale: Chiptune Soundtrack and Sound Design Spec

> Written when the game was named Hearthvale; it is now Ethergrove Chronicles (see [the 2026-10-29 spec](2026-10-29-ethergrove-chronicles-design.md)).
> Soundtrack superseded by [the Ethergrove audio spec](2026-10-30-ethergrove-audio-design.md).

**Status:** draft for review · **Date:** 2026-10-26 · **Branch:** `feat/bgm-sound-effects` · **Builds on:** Part 1 and the tutorial (merged to `main`)

This spec is written so that an implementer with no context from the design conversation can build it. Every
name, number and rule is given. Where the spec says "MUST", do exactly that. The one creative task left to the
implementer is writing the melodies inside the chord charts and forms given in §6; §6.1 sets the rules for that.

---

## 1. Goal

The game has no background music, and the owner finds the current sound effects ugly. They are Kenney sample
files plus a small fallback synth, and they don't match each other. This spec replaces all game audio with an
**original chiptune soundtrack and sound set** in the spirit of the best 8/16-bit console RPGs and farm games:
warm pulse-wave melodies, a triangle bass, noise drums and a soft console-style echo. Every situation gets its
own music.

### 1.1 Success criteria

1. Every screen and situation in §5 plays its own track, and changes crossfade smoothly.
2. Every sound effect in §7 is a new chiptune sound. No sample files ship anymore.
3. Menus click like a console game: a cursor blip, a confirm and a back sound (§8).
4. All music and SFX are original. No melody quotes a melody from an existing game or song.
5. There are no new runtime dependencies, Howler is removed, and the bundle stays inside its size budget.
6. Nothing runs per frame. No React re-renders, and no audible glitches on a mid-range phone.
7. The owner listens to WAV previews of every track, jingle and SFX (§10.4) before merging.
8. All checks pass (`pnpm checks`).

### 1.2 Decisions already made (do not revisit)

- **Our own Web Audio chiptune engine.** No Tone.js, no MIDI files or soundfonts, no audio files.
- **Original compositions only** ([[decisions/0004-original-ip-cc0-only]]).
- The core (`packages/core`) and saves don't change. All audio work stays in `apps/web`.
- **Ambient beds are removed.** Birds, cicadas, wind, night, rain and thunder loops never had audio files and
  were always silent, so their dead code goes. A future spec may add synthesized ambience. The thunder
  one-shot SFX on lightning stays.
- **Menu blips are in scope** (§8).

## 2. Scope

### 2.1 In scope

- The chiptune engine: instruments, mixer, echo and a look-ahead sequencer.
- The score format and its validator.
- 8 looping tracks (the 4 season tracks also get a rain arrangement), plus 4 jingles.
- 22 sound effects: 19 game and 3 menu.
- The track director (`pickTrack`) and the jingle rules.
- Ducking, a muffled pause, and suspending audio while the tab is hidden.
- Removing Howler, the sample files, the synth fallback and the silent ambience code.
- The debug hook, offline rendering for previews and tests, and docs and credits.

### 2.2 Out of scope

- Ambient sound beds (see §1.2).
- Any new settings beyond the existing Music and SFX volume sliders.
- Remembering a track's playback position. A track always starts again from its beginning.

### 2.3 Files

```
apps/web/src/audio/
  chip/notes.ts          note-name → Hz, transposition
  chip/score.ts          Song types, token parser, compileSong(), validateSong()
  chip/instruments.ts    instrument table, pulseCoefficients(), noise buffers
  chip/engine.ts         createChipEngine(ctx): buses, voices, playNote(), playDrum(), playBlips()
  chip/sequencer.ts      createSequencer(): look-ahead scheduling, loop, stop
  songs/title.ts  songs/spring.ts  songs/summer.ts  songs/fall.ts  songs/winter.ts
  songs/night.ts  songs/home.ts    songs/shop.ts    songs/jingles.ts  songs/index.ts
  sfx.ts                 SFX recipe table (data)
  music.ts               pickTrack(), jingleFor(), CueId, JingleId
  menuSounds.ts          installMenuSounds(): DOM listeners for menu blips
  soundMap.ts            soundsFor() (kept, ambience entries removed, menu ids added)
  sound.ts               createSoundSystem(backend) (rewritten around an AudioBackend)
  install.ts             installAudio() wiring (rewritten)
  offline.ts             renderOffline(): OfflineAudioContext → Float32Array (debug hook only)
  *.test.ts              tests beside each file (see §10)
Deleted: audio/howler.ts, audio/synth.ts, public/assets/audio/*, SOUND_FILES in scene/assets.ts,
         the howler and @types/howler dependencies.
apps/web/src/game/debugHook.ts   adds `audio` (see §9)
apps/web/e2e/audio.spec.ts       new e2e spec
apps/web/scripts/audition.mjs    renders WAV previews to apps/web/audition/ (gitignored)
CREDITS.md, brain/ notes          updated (§11)
```

## 3. Engine

### 3.1 Instruments (`chip/instruments.ts`)

`InstrumentId = 'pulse12' | 'pulse25' | 'pulse50' | 'triangle' | 'flute' | 'musicBox'`. Drums use the noise
voices in §3.3.

| Id | Wave | Attack | Decay → sustain | Release | Vibrato |
|---|---|---|---|---|---|
| `pulse12` | pulse, duty 0.125 | 4 ms | 90 ms → 0.55 | 50 ms | none |
| `pulse25` | pulse, duty 0.25 | 4 ms | 120 ms → 0.6 | 60 ms | 10 cents, 5.5 Hz, after 180 ms |
| `pulse50` | pulse, duty 0.5 | 4 ms | 120 ms → 0.6 | 60 ms | 8 cents, 5 Hz, after 220 ms |
| `triangle` | NES-style 16-step quantized triangle | 2 ms | none (sustain 1.0) | 30 ms | none |
| `flute` | same as `triangle` | 40 ms | 200 ms → 0.8 | 120 ms | 12 cents, 5 Hz, after 150 ms |
| `musicBox` | partials 1 : 0.3 (×3) : 0.1 (×5) | 2 ms | exponential to 0 over 1.2 s | 80 ms | none |

- Pulse waves are `PeriodicWave`s. `pulseCoefficients(duty, harmonics = 24)` returns `{ real, imag }` with
  `real[n] = (2 / (n·π)) · sin(π·n·duty)` for n = 1…24, and `real[0] = imag[*] = 0`. Limiting it to 24 harmonics is
  deliberate: it keeps the tone warm and stops it aliasing.
- The quantized triangle is built by sampling a 32-sample, 16-level stepped triangle and taking its first 24 DFT
  harmonics into a `PeriodicWave`.
- Waves and noise buffers are built once per `AudioContext` and cached.

### 3.2 Voices

`playNote(instrument, hz, start, durationSec, gain, bus)`:

- It creates one `OscillatorNode` and one `GainNode` for the ADSR envelope. Instruments with vibrato also get an
  LFO `OscillatorNode` → `GainNode` (depth in Hz) → `osc.frequency`, whose gain ramps from 0 at `start + delay`
  to full over 100 ms.
- The release starts at `start + durationSec`. Use `setTargetAtTime` for ramps toward 0, never
  `exponentialRampToValueAtTime(0)`.
- The oscillators stop at `start + durationSec + release + 0.02`, and on `ended` they disconnect every node they
  created. This is the whole lifecycle; nothing else may hold references to voices.

### 3.3 Drums

The noise is a 2-second buffer from an NES-style 15-bit LFSR at 44.1 kHz. **Long mode** (taps 0 and 1) is used for
hiss, and **short mode** (taps 0 and 6) for metallic sounds.

| Token | Name | Recipe | Peak gain |
|---|---|---|---|
| `k` | kick | triangle sweep 160 → 50 Hz over 90 ms, plus long noise through a 400 Hz lowpass for 15 ms | 0.9 |
| `s` | snare | long noise, bandpass 1800 Hz Q 0.9, decay 110 ms, plus triangle 190 Hz for 40 ms | 0.6 |
| `h` | closed hat | short noise, highpass 7000 Hz, decay 30 ms | 0.25 |
| `o` | open hat | short noise, highpass 6500 Hz, decay 140 ms | 0.22 |
| `t` | soft tick (brush) | long noise, bandpass 5000 Hz Q 0.7, decay 45 ms | 0.15 |

### 3.4 Mixer

```
music voices → musicIn (Gain) → musicFilter (lowpass) ─┬─→ musicOut (Gain = music volume × duck × pause) → master
                                                        └─→ echoSend (Gain 0.18) → echoDelay ⟲ echoFeedback (0.3, lowpass 2500 Hz) → musicOut
sfx voices   → sfxOut (Gain = sfx volume) → master
master → DynamicsCompressor (threshold −18 dB, knee 12, ratio 3, attack 10 ms, release 200 ms) → destination
```

- `echoDelay.delayTime` is a dotted eighth of the playing song: `0.75 × 60 / bpm` seconds, set on track start.
- `musicFilter.frequency`: 9000 Hz normally, 2200 Hz for the rain arrangement, 1200 Hz while paused (§5.3).
  Changes ramp over 400 ms.
- Volume changes ramp over 50 ms with `setTargetAtTime`, so there are no clicks.
- `createChipEngine(ctx: BaseAudioContext)` works with both `AudioContext` and `OfflineAudioContext`.

### 3.5 Sequencer (`chip/sequencer.ts`)

`createSequencer({ now, schedule, lookaheadSec = 0.12 })`:

- `now(): number` is the audio clock in seconds. `schedule(ev: ScheduledEvent)` hands the event to the engine.
  Both are injected, so tests drive the sequencer with a fake clock.
- `start(song: CompiledSong, at: number)`, `stop()`, `tick()` and `isPlaying()`.
- `tick()` schedules every event whose time is less than `now() + lookaheadSec` and that hasn't been scheduled
  yet. When the last bar ends, `loop: true` songs jump to `introBars` and continue with no gap. `loop: false`
  songs (jingles) end.
- `install.ts` calls `tick()` from a `setInterval(…, 25)` that exists only while a track or jingle is playing.
- Swing: an event on an odd 8th-note position (step % 4 === 2) is delayed by `swing × stepSec × 2`.

## 4. Score format (`chip/score.ts`)

```ts
type ChannelId = 'lead' | 'harmony' | 'bass' | 'drums';
interface PartSpec {
  instrument?: InstrumentId; // required for every channel but drums
  gain?: number;             // default: lead 0.22, harmony 0.12, bass 0.28, drums 0.18
  notes: string;             // see the token grammar below
  arp?: 'up' | 'down' | 'updown' | 'block'; // how chords play; default 'block'
  arpRate?: number;          // steps per arpeggio note; default 1
}
interface Song {
  id: string; title: string; bpm: number; meter: 3 | 4; swing?: number; // 0–0.3
  introBars: number; loop: boolean;
  parts: Partial<Record<ChannelId, PartSpec>>;
}
```

There are 4 steps per beat (16th notes). A bar has `meter × 4` steps. Tokens are separated by whitespace, and
`|` separates bars.

| Token | Meaning |
|---|---|
| `A4`, `C#5:2`, `Bb3:8` | Note: name `C D E F G A B`, an optional `#` or `b`, an octave from 1 to 8, then `:steps` (default 4) |
| `r`, `r:8` | Rest |
| `~`, `~:4` | Extends the previous note by that many steps; carries over the bar line |
| `(C4 E4 G4):8` | Chord: plays per `arp` |
| drums only: `k s h o t .` | One step per character, with `.` as a rest. Whitespace is ignored inside drum bars |

- `compileSong(song, { transpose = 0, arrangement = 'normal' })` → `CompiledSong`:
  `{ bpm, meter, swing, stepSec, introBars, totalBars, loop, events: NoteEvent[] }`, where
  `NoteEvent = { step, steps, channel, instrument, hz, gain } | { step, channel: 'drums', drum, gain }`.
- `validateSong(song)` throws an `Error` naming the song, channel and bar when:
  - a bar's steps don't equal `meter × 4`,
  - the channels have different bar counts,
  - `introBars` is at least the total bar count,
  - a note is outside C2 to C8,
  - a token can't be parsed,
  - a `~` has no note before it.
- **Rain arrangement** (`arrangement: 'rain'`):
  - The lead's instrument becomes `flute`.
  - The harmony gain is ×0.6.
  - Drum events are dropped.
  - The engine sets `musicFilter` to 2200 Hz.

## 5. Music director (`music.ts`)

```ts
type TrackId = 'title' | 'spring' | 'summer' | 'fall' | 'winter' | 'night' | 'home' | 'shop';
type CueId = TrackId | `${'spring' | 'summer' | 'fall' | 'winter'}:rain`;
type JingleId = 'morning' | 'season' | 'lessonsComplete' | 'faint';
```

### 5.1 `pickTrack(s: { screen, overlay, location, season, minute, weather } | null): CueId`

The first rule that matches wins:

1. `screen` is not `'game'`, or there is no game → `'title'`.
2. `overlay === 'cart'` → `'shop'`.
3. `minute >= 1200` (8 pm or later) → `'night'`.
4. `location === 'house'` → `'home'`.
5. `weather` is `'rain'` or `'storm'` → `` `${season}:rain` ``.
6. Otherwise → `season`.

It returns a string literal, so it allocates nothing. `install.ts` subscribes to the store, recomputes the cue
on each change and acts only when the cue string changes.

### 5.2 Track changes

- On a new cue, the old track fades to 0 over 1200 ms and stops. The new track starts from bar 1 (its intro) and
  fades in over 1200 ms.
- Each track gets its own channel gain node under `musicIn` so the two can overlap.

### 5.3 Pause, hidden tab, unlock

- `overlay === 'pause'` muffles the music: `musicFilter` goes to 1200 Hz and the music gain to ×0.6. Both are
  restored when the overlay closes.
- On `document.visibilitychange`, the `AudioContext` is suspended while hidden and resumed when visible.
- Audio stays silent until the first `pointerdown` or `keydown` (the existing unlock). The `AudioContext` is
  created inside that gesture, and then the current cue starts.

### 5.4 Jingles (`jingleFor(events: GameEvent[]): JingleId | null`)

Jingles are judged per event batch. Priority: `passedOut` → `'faint'`, then `seasonChanged` → `'season'`, then
`dayStarted` → `'morning'`, then `lessonsComplete` → `'lessonsComplete'`.

- Only one jingle plays at a time, and a new one cuts off the old.
- While a jingle plays, the track's gain ramps to ×0.2 over 80 ms. When the jingle ends, it comes back over
  800 ms.
- `'season'` is transposed into the new season's key: spring 0, summer +2, fall −3, winter +3 semitones from the
  title key of F (0).

## 6. The soundtrack

### 6.1 Composition rules (MUST)

- Every melody is newly written for Hearthvale. Never reproduce or paraphrase a recognisable melody from a game,
  film, folk song or pop song. Avoid the stock two-note "coin" figures (B5→E6 and the like).
- Leads stay mostly within A3–C7 and move by step, with occasional leaps of a 4th to an octave. Each phrase is
  4 bars and ends on a chord tone. Every 8-bar section has a clear question-and-answer shape.
- **The leitmotif** ("Hearth motif") appears in `title`, `night`, `home` and the `season` jingle. Written in F:
  `A4:2 C5:2 D5:4 C5:2 A4:2 G4:4 | F4:2 G4:2 A4:2 C5:2 G4:8`
- The harmony never doubles the lead in unison. The bass plays chord roots on strong beats, with passing tones
  allowed.

### 6.2 Tracks

The chord charts are one chord per bar unless two are shown. The intro bars come first and play once. A and B
are 8 bars each, and the loop is A then B.

| Cue | Title | Key, tempo, meter | Intro | Chords A / B | Voices (lead / harmony / bass / drums) | Character |
|---|---|---|---|---|---|---|
| `title` | **Hearthvale** | F major, 84, 4/4 | 2 bars, harmony only on F | A: F Dm B♭ C F Dm Gm7·C F · B: B♭ C Am Dm Gm B♭ Csus4 C | pulse25 / pulse12 `updown` 16ths / triangle half notes / none in A, `k...h...k...h...` in B | Wistful main theme. The leitmotif opens A |
| `spring` | **Seedlings Wake** | C major, 100, 4/4 | 1 bar of drums and bass | A: C G Am F C G F G · B: F G Em Am F G C C | pulse50 staccato / pulse25 off-beat stabs / triangle walking 8ths / `k.h.s.h.k.h.s.h.` | Bouncy and hopeful |
| `summer` | **Sunwarm Fields** | D major, 112, 4/4, swing 0.16 | 1 bar | A: D G D A Bm G A D · B: G A F♯m Bm G A Em7·A D | pulse25 / pulse12 `up` arpeggio / triangle octave bounce / `k.hhs.hhk.hhs.ho` | Bright, sunny shuffle |
| `fall` | **Amber Harvest** | A dorian, 92, 3/4 | 2 bars of waltz bass | A: Am G Am D Am G Em Am · B: F G Am Am F G E E | pulse50 fiddle-like with slow vibrato / pulse25 "oom-pah-pah" on beats 2 and 3 / triangle on beat 1 / `t...t...t...` | Folk harvest waltz, warm and bittersweet |
| `winter` | **Hearth & Snow** | E♭ major, 72, 4/4 | 2 bars of music box alone | A: E♭ Cm A♭ B♭ E♭ Cm Fm7 B♭ · B: A♭ B♭ Gm Cm A♭ Fm B♭sus4 B♭ | musicBox / musicBox `up` 8ths (arpRate 2) / triangle whole notes / none in A, `..t...t...t...t.` in B | Snowfall, gentle and glowing |
| `night` | **Fireflies** | F major, 66, 4/4 | none | A: Fmaj7 Am7 B♭maj7 C Fmaj7 Dm7 Gm7 Csus4·C · B: B♭maj7 Am7 Gm7 C Fmaj7 Dm7 Gm7·C F | flute (leitmotif, slow) / pulse12 sparse quarter arpeggio / triangle / none | A lullaby that quotes the motif |
| `home` | **Grandpa's Kitchen** | G major, 80, 4/4, swing 0.2 | 1 bar | A: G Em C D G Em Am7·D G · B: C D Bm Em C D Am7 D | pulse25 soft / pulse12 block chords on beats 2 and 4 / triangle walking quarters / `t.t.t.t.t.t.t.t.` | Cozy indoor tune; the motif appears in B, in G |
| `shop` | **Wandering Wares** | B♭ major, 120, 4/4 | 1 bar | A: B♭ Gm E♭ F B♭ Gm Cm·F B♭ · B: E♭ F Dm Gm E♭ F Cm F | pulse12 staccato / pulse25 off-beat / triangle oom-pah / `k.h.s.hhk.h.s.h.` | Jaunty peddler tune |

### 6.3 Jingles (`songs/jingles.ts`, `loop: false`)

| Id | Tempo, meter | Notes (exact) |
|---|---|---|
| `morning` | 100, 4/4, 2 bars | lead pulse25 `G4:1 C5:1 E5:1 G5:1 C6:8 r:4 \| r:16`; harmony musicBox `(C5 E5 G5):12 r:4 \| r:16` with `up`, arpRate 2; bass triangle `C3:12 r:4 \| r:16` |
| `season` | 92, 4/4, 2 bars | lead pulse25 is the leitmotif (§6.1); harmony pulse12 `(F4 A4 C5):16 \| (C4 E4 G4):8 (F4 A4 C5):8` with `updown`; bass triangle `F2:16 \| C3:8 F2:8`. Transposed per §5.4 |
| `lessonsComplete` | 120, 4/4, 2 bars | lead pulse25 `C5:2 E5:2 G5:2 C6:6 r:4 \| A5:2 B5:2 D6:2 C6:10`; harmony pulse12 `(E4 G4):16 \| (F4 A4):8 (E4 G4):8`; bass triangle `C3:4 G2:4 C3:8 \| F2:8 C3:8`; drums `k...s...k.k.s... \| k...s...k...o...` |
| `faint` | 70, 4/4, 2 bars | lead flute `E5:4 Eb5:4 D5:4 Db5:4 \| C5:12 r:4`; bass triangle `A2:16 \| F2:12 r:4` |

## 7. Sound effects (`sfx.ts`)

Each SFX is a list of **blips**: `{ at, instrument | noise, fromHz, toHz?, dur, gain, filter? }`. Times are in
ms, and `toHz` means a linear pitch sweep. They play on `sfxOut`, which has no echo.

| SoundId | Event | Recipe |
|---|---|---|
| `hoe` | hoe hits | long noise lowpass 900 Hz, 70 ms, 0.5; triangle 180→70 Hz, 90 ms, 0.6 |
| `water` | can hits | pulse25 900 Hz, 45 ms at 0; 750 Hz at 55 ms; 600 Hz at 110 ms; each 0.25 ("blub blub blub") |
| `sickle` | sickle hits | short noise highpass 4000 Hz, 60 ms, 0.3; pulse12 2000→3200 Hz, 60 ms, 0.15 |
| `chop` | axe hits | long noise bandpass 1100 Hz Q 2, 50 ms, 0.5; triangle 140 Hz, 80 ms, 0.6 |
| `break` | hammer hits | short noise, 120 ms, 0.45; pulse50 400→120 Hz, 70 ms, 0.3 |
| `swing` | any tool misses | long noise bandpass sweeping 600→2400 Hz, 120 ms, 0.12 |
| `harvest` | crop harvested | pulse25 C6, E6, G6 at 0/30/60 ms, 30 ms each, 0.25; C7 at 90 ms, 160 ms, 0.25 |
| `plant` | seed planted | triangle 523→784 Hz, 60 ms, 0.4; long noise highpass 3000 Hz, 15 ms, 0.08 |
| `refill` | can refilled | pulse12 300→1200 Hz, 250 ms, 0.2, with 18 Hz tremolo (gain LFO depth 0.5) |
| `eat` | item eaten | long noise lowpass 1500 Hz, 50 ms, 0.3 at 0 and 140 ms; pulse25 G5, 60 ms, 0.2 at 280 ms |
| `coin` | gold gained | pulse25 G6 40 ms, C7 40 ms at 45 ms, E7 200 ms at 90 ms; all 0.2 ("tink-tink-ting") |
| `door` | location changed | triangle D4 70 ms 0.5, then A3 90 ms 0.5 at 80 ms; long noise lowpass 500 Hz, 40 ms, 0.3 |
| `chime` | milestone, lesson done | pulse25 E6, G6, B6, E7 at 0/60/120/180 ms, 0.2, the last lasting 400 ms; pulse12 the same notes an octave lower at +90 ms, 0.1 |
| `deny` | action failed | pulse50 196 Hz, 60 ms, then 147 Hz, 120 ms at 70 ms; 0.18 |
| `thunder` | lightning | long noise, lowpass sweeping 800→120 Hz, 1800 ms decay, 0.7 |
| `step-grass` | footstep | short noise highpass 3000 Hz, 25 ms, 0.06 |
| `step-dirt` | footstep | long noise lowpass 1000 Hz, 30 ms, 0.08 |
| `step-wood` | footstep | triangle 180 Hz, 35 ms, 0.1; long noise bandpass 800 Hz, 25 ms, 0.08 |
| `step-snow` | footstep | long noise lowpass 1800 Hz, 60 ms, 0.08 |
| `menuMove` | §8 | pulse12 A5, 30 ms, 0.15 |
| `menuConfirm` | §8 | pulse25 E6 35 ms, then A6 50 ms at 40 ms; 0.18 |
| `menuBack` | §8 | pulse25 A5 35 ms, then E5 50 ms at 40 ms; 0.18 |

- Footsteps alternate their pitch and filter frequency by ×0.97 and ×1.03 on each step, so they don't sound
  machine-gunned.
- The existing 150 ms same-sound dedupe (`REPEAT_MS`) stays.

## 8. Menu blips (`menuSounds.ts`)

`installMenuSounds(play: (id: 'menuMove' | 'menuConfirm' | 'menuBack') => void, store): () => void` adds
document-level listeners, so no component changes. A **menu element** is an element inside
`.title-screen`, `.screen` or `.panel`.

- **menuMove:** an arrow key, `Tab` or `Shift+Tab` keydown (or a gamepad d-pad, which the loop already turns into
  arrow keys) after which `document.activeElement` is a different menu element. Check this in a
  `queueMicrotask` after the keydown.
- **menuConfirm:** a `click` on an enabled `button` or `[role="button"]` that is a menu element, whether from a
  pointer or a keyboard. It is not played for the panel close button (`.panel-head .icon-btn`), which plays
  menuBack instead.
- **menuBack:** `overlay` changes from non-null to null in the store, or `screen` changes from `'slots'` or
  `'newGame'` to `'title'`. It is skipped when menuConfirm played within the last 150 ms, so confirming a
  dialog that closes doesn't double-blip.
- HUD buttons (hotbar, touch action buttons) MUST NOT blip, because they aren't menu elements.

## 9. Wiring and debug hook

- **`sound.ts`:**
  - `createSoundSystem(backend: AudioBackend, now?)`, with
    `AudioBackend = { sfx(id, vol), cue(cue: CueId), jingle(id: JingleId), setVolumes(m, s), setPaused(b), suspend(), resume() }`.
  - The system keeps the gate that stays silent until unlocked, the 0..1 clamps and the dedupe.
  - The real backend is `chipBackend(ctx)` in `install.ts`. Tests use a fake.
- **`soundMap.ts`:** `soundsFor` keeps its tool, harvest, coin and other mappings and drops the ambience ids.
  `'weatherChanged'` returns `[]`. `SoundId` gains `menuMove | menuConfirm | menuBack`. `LoopId` and `soundUrls`
  are deleted.
- **`install.ts`:** as today (unlock, events → SFX, thunder, footsteps, settings volumes), plus the store
  subscription for `pickTrack`, jingles per bus batch (`bus.onAny` gathers one dispatch's events, then
  `jingleFor`), pause muffling, visibility suspend and `installMenuSounds`.
  - It exports `audioDebug(): { unlocked: boolean; cue: CueId | null; jingle: JingleId | null; lastSfx: SoundId | null }`.
- **`debugHook.ts`:** adds `audio: () => audioDebug()` and
  `renderAudio(kind: 'track' | 'jingle' | 'sfx', id: string, seconds: number): Promise<{ rms: number; wav: string }>`.
  The `wav` is base64 16-bit mono at 44.1 kHz. It uses `offline.ts`, and exists only in e2e builds, like the rest
  of the hook.

## 10. Testing

### 10.1 Unit (Vitest, beside each file)

- **`notes.test.ts`:**
  - `A4` = 440 Hz, `C4` ≈ 261.63, and `Bb3` equals `A#3`.
  - A transposition of +12 doubles the frequency.
  - Bad names throw.
- **`score.test.ts`:**
  - Parses notes, rests, ties across a bar line, chords with each `arp` mode and drums.
  - Step positions are correct.
  - `validateSong` throws, with the song, channel and bar in the message, for:
    - a short bar,
    - mismatched bar counts,
    - an out-of-range note,
    - a stray `~`.
  - The rain arrangement swaps the lead to flute, drops the drums and scales the harmony.
- **`songs/index.test.ts`:**
  - Every track and jingle passes `validateSong`.
  - Every `TrackId` and `JingleId` has a song.
  - Every track loops and every jingle doesn't.
  - Each looping track is at least 16 bars after its intro.
  - The leitmotif's pitch sequence appears in `title`, `night` and `home` (allowing transposition).
- **`instruments.test.ts`:**
  - `pulseCoefficients(0.5)` has its even harmonics at about 0.
  - The coefficients are 25 long.
  - The duty 0.125 and 0.875 spectra are equal in magnitude.
  - The LFSR's short mode has a period of 93 samples or fewer, and its long mode a period of exactly 32767.
- **`sequencer.test.ts`** (fake clock):
  - Events are scheduled only inside the look-ahead window and never twice.
  - A loop restarts at `introBars` with no gap or overlap.
  - Swing delays odd 8ths.
  - A jingle ends and `isPlaying()` turns false.
  - `stop()` stops scheduling.
- **`music.test.ts`:**
  - `pickTrack` has one case for each rule in §5.1, including the order of rules: cart at night → `shop`, house
    at night → `night`, and house in the rain → `home`.
  - `jingleFor` priority: passedOut and dayStarted → `faint`; seasonChanged and dayStarted → `season`.
- **`sfx.test.ts`:** every `SoundId` has a recipe with at least one blip, every blip has a duration of at most
  2000 ms, and every gain is between 0 and 1.
- **`audio.test.ts`** (rewritten around the fake backend):
  - Silent until unlocked.
  - Clamps, dedupe, footsteps by surface.
  - A cue change calls `backend.cue` once per change.
  - Pause calls `setPaused`.
  - A failing backend never throws.
- **`menuSounds.test.ts`** (Testing Library):
  - An arrow key moves focus → menuMove.
  - A button click in `.panel` → menuConfirm.
  - The close button → menuBack.
  - An overlay closing right after a confirm → no menuBack.
  - A HUD button → nothing.
- **`engine.test.ts`:** with a minimal fake `BaseAudioContext`, `playNote` disconnects every node it created after
  `ended`, and volume changes use `setTargetAtTime`.

### 10.2 E2E (`e2e/audio.spec.ts`, Chromium and WebKit)

1. Before any gesture, `audio().unlocked` is false. After a click on the title screen, it is true and `cue` is
   `'title'`.
2. In a new game in spring, `cue` is `'spring'`. After `teleport('house', …)`, it is `'home'`. After
   `skipMinutes` past 20:00, it is `'night'`.
3. `setWeather('rain')` in the daytime on the farm → `'spring:rain'`.
4. `renderAudio('track', id, 4)` returns `rms > 0.01` for every `TrackId`, and `renderAudio('sfx', 'coin', 1)`
   returns `rms > 0.005`. This proves real sound comes out.

### 10.3 Must-fail check

Each new test is run red before its code is written. Briefly break `pickTrack` rule 2 and confirm that the
cart test fails.

### 10.4 Listening previews

`node apps/web/scripts/audition.mjs` (it uses Playwright against `pnpm --filter web dev:e2e`) writes
`apps/web/audition/<kind>-<id>.wav`: each track for one full loop plus its intro, every jingle and every SFX.
The folder is gitignored. The owner listens before merging. The implementer can't hear audio, so they must not
claim the music "sounds good". They report that the previews were rendered and the RMS checks passed.

## 11. Docs and credits

- `CREDITS.md` Sound section becomes: "All music and sound effects are original to Hearthvale. They are
  composed for the game and generated live in the browser by its chiptune engine (`apps/web/src/audio/chip`).
  No audio files are used." The Kenney sound rows are removed.
- In `brain/MEMORY.md`, the open thread "Background music choice is still open" is resolved: generated
  original chiptune music, with a link to the new decision note `brain/decisions/0010-original-chiptune-audio.md`.
- In `AGENTS.md` (Architecture → The loop), "audio (`audio/soundMap.ts`)" becomes "audio (`audio/install.ts`,
  chiptune engine in `audio/chip/`)".

## 12. Acceptance criteria

1. §5.1's table holds in the running game (unit and e2e tests).
2. All 8 tracks, 4 jingles and 22 SFX render with RMS above zero, and their WAVs are delivered to the owner.
3. `pnpm checks` passes. The bundle stays under the size-limit budgets (no budget change).
4. `howler`, `@types/howler`, `audio/howler.ts`, `audio/synth.ts` and `public/assets/audio/` are gone.
5. Menu blips work with keyboard, gamepad (via arrow keys) and touch, and HUD buttons stay silent.
6. Nothing new runs in `useFrame` or the 50 ms step. The scheduler interval runs only while music plays, and the
   context suspends while the tab is hidden.
