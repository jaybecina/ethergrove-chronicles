# Hearthvale Chiptune Audio Implementation Plan

> Written when the game was named Hearthvale; it is now Ethergrove Chronicles (see [the 2026-10-29 spec](../specs/2026-10-29-ethergrove-chronicles-design.md)).
> Soundtrack superseded by [the Ethergrove audio spec](../specs/2026-10-30-ethergrove-audio-design.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every game sound with an original Web Audio chiptune engine. It adds 8 looping tracks, 4 jingles,
22 SFX and menu blips, and plays the right music for every situation.

**Architecture:**

- Pure, tested modules turn note strings into timed events (`chip/notes`, `chip/score`, `chip/sequencer`,
  `music.ts`).
- A thin Web Audio layer (`chip/instruments`, `chip/engine`, `chipBackend.ts`) plays those events through a
  mixer with echo, filter and compressor.
- `sound.ts` keeps the game-facing rules (unlock gate, dedupe, volumes), and `install.ts` connects it to the
  store and event bus.

**Tech Stack:** TypeScript (strict), Web Audio API (`BaseAudioContext`, `PeriodicWave`, `OfflineAudioContext`),
Zustand vanilla store, Vitest + jsdom + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-26-hearthvale-chiptune-audio-design.md`. Section numbers (§) below refer to
it, and every value in a spec table is binding.

## Global Constraints

- No new runtime dependencies. Remove `howler` and `@types/howler`. The size-limit budgets stay as they are (500 KB initial, 650 KB all, gzip).
- `packages/core` and saves are untouched.
- Strict types, no `any`, and lint suppressed only with a reason. Run `pnpm lint` on touched files.
- **Every melody is original (§6.1).** Never quote a known game, film, folk or pop melody, and never use the B5→E6 coin figure.
- Nothing runs in `useFrame` or the 50 ms step. The scheduler `setInterval(…, 25)` runs only while a track or jingle plays.
- Per AGENTS.md: write the test first and watch it fail. **Don't commit.** The owner commits from the handoff at the end, so each task ends with its tests green rather than a commit.
- Test commands: `pnpm --filter web exec vitest run <file>` from the repo root. For e2e:
  `cd apps/web && CI=true pnpm exec playwright test e2e/audio.spec.ts --project=chromium`.
- The implementer can't hear audio. Never claim it "sounds good". Report rendered previews and RMS results instead.

## Review Focus

1. **The first gesture after loading a save mid-situation** (in the house at night, say) must start the cue for
   that situation, not `title`. Task 10 pins this.
2. **Rapid cue flapping** (opening and closing the cart five times, or going in and out of the door) must never
   stack tracks. At most 2 are audible during a fade, and 1 after it. Task 12's e2e test pins this.
3. **Returning from a hidden tab or a long stall** must not burst-play a backlog of late notes. The sequencer
   drops events more than 50 ms late. Task 4 pins this.
4. **No `AudioContext`** (old browsers, blocked audio): the game runs silent and nothing throws. Task 12's
   `chipBackend` test pins this.
5. **Pausing during a jingle duck:** the music gain must always equal volume × duck × pause factor, and both
   restore independently. Task 5 pins this.

---

## File map

```
apps/web/src/audio/
  chip/notes.ts (+test)        note names → MIDI → Hz
  chip/score.ts (+test)        Song types, parse, compileSong, validateSong
  chip/instruments.ts (+test)  INSTRUMENTS table, wave coefficients, LFSR noise, per-context wave cache
  chip/sequencer.ts (+test)    look-ahead scheduler (pure, injected clock)
  chip/engine.ts (+test)       mixer and voices on a BaseAudioContext
  sfx.ts (+test)               SFX blip recipes (data)
  songs/*.ts, songs/index.test.ts   8 tracks, 4 jingles, LEITMOTIF
  music.ts (+test)             pickTrack, jingleFor, cue helpers
  sound.ts, audio.test.ts      SoundSystem around AudioBackend (rewritten)
  menuSounds.ts (+test)        menu blips
  chipBackend.ts (+test)       the real AudioBackend (engine + sequencers + crossfades)
  offline.ts (+test)           offline render, rms, WAV encoding
  install.ts                   wiring (rewritten); covered by e2e/audio.spec.ts
  soundMap.ts                  menu ids added; ambience, LoopId and soundUrls removed
Deleted: audio/howler.ts, audio/synth.ts, public/assets/audio/, SOUND_FILES (scene/assets.ts)
apps/web/src/game/debugHook.ts   audio(), renderAudio()
apps/web/e2e/audio.spec.ts
apps/web/scripts/audition.mjs, apps/web/package.json ("audition" script), .gitignore
CREDITS.md, docs/ARCHITECTURE.md, AGENTS.md, brain/decisions/0010-original-chiptune-audio.md, brain/MEMORY.md
```

---

### Task 1: Notes

**Files:** Create `apps/web/src/audio/chip/notes.ts`, `apps/web/src/audio/chip/notes.test.ts`

**Interfaces:**

- Produces:
  - `noteMidi(name: string): number`. Throws `Error('Bad note "<name>"')` for a bad name.
  - `noteHz(name: string, transpose = 0): number`.
  - `midiHz(midi: number): number`.
  - `NOTE_MIN = 36` (C2) and `NOTE_MAX = 108` (C8).

- [ ] **Step 1: Write the failing tests** in `notes.test.ts`:
  ```ts
  expect(noteHz('A4')).toBe(440);
  expect(noteHz('C4')).toBeCloseTo(261.63, 2);
  expect(noteMidi('Bb3')).toBe(noteMidi('A#3'));
  expect(noteHz('A4', 12)).toBe(880);
  expect(noteMidi('C2')).toBe(NOTE_MIN);
  expect(noteMidi('C8')).toBe(NOTE_MAX);
  for (const bad of ['H4', 'C', 'C9', 'c4', 'C#'])
    expect(() => noteMidi(bad)).toThrow(`Bad note "${bad}"`);
  ```
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/chip/notes.test.ts`. Expected: FAIL
      (module not found).
- [ ] **Step 3: Implement it.** Match `/^([A-G])([#b]?)([1-8])$/`. MIDI is `12 × (octave + 1) + semitone`, and Hz is
      `440 × 2^((midi − 69) / 12)`.
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 2: Score format, compiler and validator

**Files:** Create `apps/web/src/audio/chip/score.ts`, `apps/web/src/audio/chip/score.test.ts`

**Interfaces:**

- Consumes:
  - `noteMidi`, `noteHz`, `NOTE_MIN` and `NOTE_MAX` from Task 1.
  - The type `InstrumentId` from Task 3. Declare it in `score.ts` first if Task 3 isn't done yet, then move it
    there and re-export it.
- Produces (exact names):
  ```ts
  export type ChannelId = 'lead' | 'harmony' | 'bass' | 'drums';
  export type DrumId = 'k' | 's' | 'h' | 'o' | 't';
  export type Arrangement = 'normal' | 'rain';
  export interface PartSpec {
    instrument?: InstrumentId;
    gain?: number;
    notes: string;
    arp?: 'up' | 'down' | 'updown' | 'block';
    arpRate?: number;
  }
  export interface Song {
    id: string;
    title: string;
    bpm: number;
    meter: 3 | 4;
    swing?: number;
    introBars: number;
    loop: boolean;
    parts: Partial<Record<ChannelId, PartSpec>>;
  }
  export type ToneEvent = {
    kind: 'tone';
    step: number;
    steps: number;
    channel: Exclude<ChannelId, 'drums'>;
    instrument: InstrumentId;
    hz: number;
    gain: number;
  };
  export type DrumEvent = {
    kind: 'drum';
    step: number;
    channel: 'drums';
    drum: DrumId;
    gain: number;
  };
  export type NoteEvent = ToneEvent | DrumEvent;
  export interface CompiledSong {
    id: string;
    bpm: number;
    meter: 3 | 4;
    swing: number;
    stepSec: number;
    barSteps: number;
    introBars: number;
    totalBars: number;
    loop: boolean;
    filterHz: number;
    events: NoteEvent[];
  } // events sorted by step, then channel order lead, harmony, bass, drums
  export const DEFAULT_GAIN: Record<ChannelId, number> = {
    lead: 0.22,
    harmony: 0.12,
    bass: 0.28,
    drums: 0.18,
  };
  export function validateSong(song: Song): void;
  export function compileSong(
    song: Song,
    opts?: { transpose?: number; arrangement?: Arrangement },
  ): CompiledSong;
  ```

**Rules the tests pin:**

- `stepSec = 60 / bpm / 4` and `barSteps = meter × 4`.
- Parsing is in two passes:
  1. Tokens become items `{ pitches: string[] | null (rest), steps }`, and `~[:n]` adds `n` (default 4) to the
     previous non-rest item.
  2. Items become events.
- Arp:
  - `up` plays the notes ascending in the order written, and `down` reverses that.
  - `updown` follows the pattern `[0..n-1, n-2..1]`. For 3 notes that is `0 1 2 1`.
  - Each arp note lasts `arpRate` steps (default 1), and the last one is trimmed to the item's end.
  - `block` plays every note for the full length, each at `gain × 0.6`.
- Rain arrangement:
  - The lead's instrument becomes `flute`.
  - The harmony gain is ×0.6.
  - Drum events are dropped.
  - `filterHz` is 2200. Otherwise it is 9000.
- `transpose` shifts every pitch, and the range check uses the transposed MIDI.
- Error messages are exactly `` `${song.id} ${channel} bar ${n}: ${problem}` ``, with bars counted from 1.
  The problems are:
  - `has ${x} steps, expected ${barSteps}`
  - `note ${name} out of range`
  - `bad token "${tok}"`
  - `tie with no note`
- Two song-level errors don't name a channel or bar:
  - `` `${song.id}: channels have different bar counts` ``
  - `` `${song.id}: introBars must be less than total bars` ``

- [ ] **Step 1: Write the failing tests** in `score.test.ts`. Use a helper
      `song(parts, extra?)` that returns a 4/4, 120 bpm, `introBars: 0`, `loop: true` Song.
  - `'C4:4 D4:4 E4:8'` → tones at steps 0, 4 and 8, with steps 4, 4 and 8. `stepSec` = 0.125 at 120 bpm.
  - A tie across a bar line: `'C4:16 | ~:8 D4:8'` → one C4 tone with `steps: 24`, then D4 at step 24.
  - A tie after a rest: `'C4:12 r:4 | ~:4 r:12'` throws `t lead bar 2: tie with no note`.
  - Chord `'(C4 E4 G4):4'`:
    - `up` → 4 tones of 1 step each: C E G C.
    - `updown` with 8 steps → C E G E C E G E.
    - `down` → G E C G.
    - `block` → 3 tones at step 0, each `gain: 0.12 * 0.6` on harmony.
  - `arpRate: 2`, `'(C4 E4 G4):6'`, `up` → 3 tones of 2 steps each.
  - Drums `'k.h. s.h. k.h. s.h.'` → drum events `k@0 h@2 s@4 h@6 k@8 h@10 s@12 h@14`.
  - `validateSong` throws:
    - `'t lead bar 1: has 12 steps, expected 16'` for `'C4:12'`.
    - `'t: channels have different bar counts'`.
    - `'t lead bar 1: note B8 out of range'` for `'B8:16'`. B8 parses, but its MIDI number is above `NOTE_MAX`.
    - `'t lead bar 1: bad token "X4"'`.
    - `'t lead bar 1: tie with no note'` for `'~:4 r:12'`.
    - `'t: introBars must be less than total bars'`.
  - Rain: compile with `{ arrangement: 'rain' }` → the lead instrument is `'flute'`, there are no drum events, the
    harmony gain is `0.12 * 0.6`, and `filterHz` is 2200 (9000 for normal).
  - Transpose +2 → C4 becomes D4's frequency.
  - Meter 3: `barSteps` is 12, and `'C4:12'` is valid.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/chip/score.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `score.ts`.** `compileSong` calls `validateSong` first. Bars come from `notes.split('|')`,
      and drum bars have their whitespace removed.
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 3: Instruments, waves and noise

**Files:** Create `apps/web/src/audio/chip/instruments.ts`, `apps/web/src/audio/chip/instruments.test.ts`

**Interfaces:**

- Produces:
  ```ts
  export type InstrumentId = 'pulse12' | 'pulse25' | 'pulse50' | 'triangle' | 'flute' | 'musicBox';
  export type WaveId = 'pulse12' | 'pulse25' | 'pulse50' | 'tri' | 'box';
  export interface InstrumentDef {
    wave: WaveId;
    attack: number;
    decay: number;
    sustain: number;
    release: number;
    vibrato?: { cents: number; hz: number; delay: number };
    decayToZero?: number;
  } // seconds
  export const INSTRUMENTS: Record<InstrumentId, InstrumentDef>; // values from spec §3.1, ms → s
  export function pulseCoefficients(
    duty: number,
    harmonics?: number,
  ): { real: Float32Array; imag: Float32Array };
  export function triangleCoefficients(harmonics?: number): {
    real: Float32Array;
    imag: Float32Array;
  };
  export function musicBoxCoefficients(): { real: Float32Array; imag: Float32Array }; // 1:1, 3:0.3, 5:0.1
  export function lfsrNoise(length: number, mode: 'long' | 'short'): Float32Array;
  export function wavesFor(ctx: BaseAudioContext): {
    wave(id: WaveId): PeriodicWave;
    noise(mode: 'long' | 'short'): AudioBuffer;
  }; // cached per context in a WeakMap
  ```
- `musicBox` has `decayToZero: 1.2`.

- [ ] **Step 1: Write the failing tests:**
  - `pulseCoefficients(0.5).real.length` is 25. Even harmonics are within `1e-6` of 0. `real[1]` is within
    `1e-6` of `2/π`.
  - The `|real[n]|` values for duty 0.125 and 0.875 are equal for n = 1..24.
  - `triangleCoefficients()`:
    - The odd harmonics carry the energy: `mag(2) < 0.02 × mag(1)`.
    - `mag(3) / mag(1)` is within 15% of `1/9`.
    - `mag(n) = hypot(real[n], imag[n])`.
  - `lfsrNoise(40000, 'long')`:
    - Every value is ±1.
    - The first 32767 samples aren't periodic at any smaller period that the test checks (`p` in
      `[31, 93, 127, 1023]`).
    - `s[i] === s[i + 32767]` for `i < 1000`.
  - `lfsrNoise(500, 'short')` has a period `p ≤ 93`. Find the smallest `p` with `s[i] === s[i + p]` for all
    `i < 300`.
  - `INSTRUMENTS.flute.vibrato` equals `{ cents: 12, hz: 5, delay: 0.15 }`.
  - `INSTRUMENTS.pulse12.vibrato` is undefined.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/chip/instruments.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - The pulse formula is in spec §3.1.
  - Triangle: build a 32-sample, 16-level stepped triangle (values `(0..15, 15..0)` mapped to −1..1), then take its
    DFT for n = 1..24 into real and imag.
  - LFSR: a 15-bit register seeded with 1. Each step, `fb = (r & 1) ^ ((r >> tap) & 1)` with `tap` 1 for long mode
    and 6 for short, then `r = (r >> 1) | (fb << 14)`. The output is `r & 1 ? -1 : 1`.
  - `wavesFor` builds `ctx.createPeriodicWave(real, imag, { disableNormalization: false })` and a 2-second noise
    buffer at `ctx.sampleRate`.
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 4: Sequencer

**Files:** Create `apps/web/src/audio/chip/sequencer.ts`, `apps/web/src/audio/chip/sequencer.test.ts`

**Interfaces:**

- Consumes: `CompiledSong` and `NoteEvent` from Task 2.
- Produces:
  ```ts
  export interface ScheduledEvent {
    ev: NoteEvent;
    time: number;
    durSec: number;
  } // durSec = steps × stepSec (drums: stepSec)
  export interface Sequencer {
    start(song: CompiledSong, at: number): void;
    stop(): void;
    tick(): void;
    isPlaying(): boolean;
    endsAt(): number | null;
  } // endsAt: non-loop songs only
  export function createSequencer(o: {
    now: () => number;
    schedule: (e: ScheduledEvent) => void;
    lookaheadSec?: number;
  }): Sequencer; // lookahead default 0.12
  export const LATE_DROP_SEC = 0.05;
  ```

**Timing (decided here):**

- Let `barSec = barSteps × stepSec`.
- The first pass schedules every event at `at + step × stepSec + swing(step)`.
- Each loop pass `k ≥ 1` schedules only the events with `step ≥ introBars × barSteps`, at
  `at + totalBars × barSec + (k − 1) × loopBars × barSec + (step − introBars × barSteps) × stepSec + swing(step)`.
  Here `loopBars = totalBars − introBars`.
- `swing(step) = step % 4 === 2 ? swing × stepSec × 2 : 0`.
- Any event whose time is earlier than `now() − LATE_DROP_SEC` is skipped (not scheduled), and the cursor moves
  past it.
- A non-loop song ends at `at + totalBars × barSec`, and `isPlaying()` is false once `now() ≥` that time.

- [ ] **Step 1: Write the failing tests.** Use a fake clock `let t = 0` and a 2-bar, 120 bpm song (`stepSec` 0.125,
      bar 2 s), with `introBars` 1, `loop` true, and a lead tone at steps 0 and 16.
  - At `start(song, 0)` with `t = 0`, `tick()` schedules only the step-0 event (time 0). Ticking again schedules
    nothing new.
  - At `t = 2.0`, `tick()` schedules step 16 at time 2.0.
  - At `t = 4.0`, `tick()` schedules the loop pass: step 16 at time 4.0. Bar 1 (the intro) is never repeated.
  - At `t = 6.0`, the next pass is at 6.0. There are no duplicates or gaps across 5 passes.
  - Swing 0.2: an event at step 2 gets time `2 × 0.125 + 0.2 × 0.125 × 2`.
  - **Late drop (Review Focus 3):** start at 0, set `t = 10` without ticking, then tick. No scheduled event has
    `time < 9.95`. Events at ≥ 10 within the lookahead are scheduled.
  - A non-loop song of 1 bar: `endsAt()` is 2. `isPlaying()` is true at `t = 1.9` and false at `t = 2`.
  - `stop()` → later ticks schedule nothing, and `isPlaying()` is false.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/chip/sequencer.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement it.** Keep the cursor index, the pass number and the scheduled-up-to time. Use no
      timers; the caller ticks.
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 5: Engine (mixer and voices)

**Files:** Create `apps/web/src/audio/chip/engine.ts`, `apps/web/src/audio/chip/engine.test.ts`

**Interfaces:**

- Consumes: `INSTRUMENTS`, `wavesFor`, `InstrumentId` (Task 3); `DrumId` (Task 2); `noteHz` (Task 1).
- Produces:
  ```ts
  export interface Blip {
    at: number;
    voice: InstrumentId | 'noiseLong' | 'noiseShort';
    hz?: number;
    note?: string;
    toHz?: number;
    dur: number;
    gain: number; // at and dur in ms
    filter?: { type: BiquadFilterType; hz: number; toHz?: number; q?: number };
    tremoloHz?: number;
  }
  export interface ChipEngine {
    readonly ctx: BaseAudioContext;
    trackGain(): GainNode; // a new per-track gain into musicIn
    playTone(
      o: { instrument: InstrumentId; hz: number; start: number; dur: number; gain: number },
      dest: AudioNode,
    ): void;
    playDrum(drum: DrumId, start: number, gain: number, dest: AudioNode): void;
    playBlips(blips: readonly Blip[], start: number, pitchMul?: number): void; // to sfxOut
    setMusicVolume(v: number): void;
    setSfxVolume(v: number): void;
    setSongFilter(hz: number): void;
    setEcho(bpm: number): void;
    setDuck(mul: number, rampSec: number): void;
    setPaused(paused: boolean): void;
  }
  export function createChipEngine(ctx: BaseAudioContext): ChipEngine;
  export function musicGainTarget(s: { volume: number; duck: number; paused: boolean }): number; // volume × duck × (paused ? 0.6 : 1)
  export function filterTarget(s: { songHz: number; paused: boolean }): number; // paused ? 1200 : songHz
  ```
- The graph and values follow spec §3.2–§3.4 exactly. Volume, duck and pause changes go through
  `setTargetAtTime(target, now, 0.05/3)`. The filter ramps over 400 ms: `setTargetAtTime(hz, now, 0.4/3)`.
  The drum recipes are in §3.3.

- [ ] **Step 1: Write the failing tests.** Use a minimal fake `BaseAudioContext` in `engine.test.ts`: it records the
      nodes it creates, `connect` and `disconnect` calls, `AudioParam` method calls, and `onended` handlers.
  - **Review Focus 5:**
    - `musicGainTarget({ volume: 0.5, duck: 0.2, paused: true })` is `0.06`.
    - Unpaused, it is `0.1`. With duck 1, unpaused, it is `0.5`.
    - Through the engine: `setDuck(0.2, 0.08)`, then `setPaused(true)`, then `setPaused(false)`, then
      `setDuck(1, 0.8)`. The musicOut gain's `setTargetAtTime` targets are, in order, `[…, v*0.2, v*0.2*0.6, v*0.2, v]`,
      with `v` = the set music volume.
  - `filterTarget({ songHz: 2200, paused: true })` is 1200, and unpaused it is 2200.
  - `playTone` with `pulse25` creates 2 oscillators (the voice and the vibrato LFO) and stops them at
    `start + dur + 0.06 + 0.02`. Firing `onended` disconnects every node it created (the fake records the count).
  - No `exponentialRampToValueAtTime` call ever has the value 0.
  - `setEcho(120)` sets `delayTime` to `0.375`.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/chip/engine.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement it.**
  - Vibrato depth in Hz is `hz × (2^(cents/1200) − 1)`.
  - `musicBox` uses an exponential decay to 0.0001 over `decayToZero`.
  - Blips resolve `note` with `noteHz` and multiply the frequency by `pitchMul` (default 1). A filter sweeps from
    `hz` to `toHz` over `dur`. `tremoloHz` adds a gain LFO of depth 0.5.
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 6: SFX recipes and the sound map

**Files:**

- Create: `apps/web/src/audio/sfx.ts`, `apps/web/src/audio/sfx.test.ts`
- Modify: `apps/web/src/audio/soundMap.ts` and the `soundsFor` tests in `apps/web/src/audio/audio.test.ts`

**Interfaces:**

- Consumes: `Blip` (Task 5).
- Produces:
  - `SoundId` gains `'menuMove' | 'menuConfirm' | 'menuBack'`.
  - `export type MenuSound = 'menuMove' | 'menuConfirm' | 'menuBack'`.
  - `export const SFX: Record<SoundId, readonly Blip[]>`, with values from spec §7, one entry per row.
  - `soundsFor(event, ctx): SoundId[]`. The return type narrows to `SoundId[]`. `'weatherChanged'` now returns `[]`.
  - `LoopId` and `soundUrls` are deleted.

- [ ] **Step 1: Write the failing tests.**
  - `sfx.test.ts`:
    - `Object.keys(SFX)` covers every `SoundId`. List the 22 ids in the test as a literal array and expect equality
      after sorting.
    - Every recipe has at least one blip.
    - For every blip, `dur ≤ 2000`, `0 < gain ≤ 1`, and exactly one of `hz` or `note` is set.
    - `SFX.coin` uses the notes `['G6', 'C7', 'E7']` in order.
    - `SFX.menuMove` is a single `pulse12` blip with `note: 'A5'`.
  - `audio.test.ts` (the `soundsFor` block): `soundsFor({ type: 'weatherChanged', weather: 'storm' }, ctx)` is `[]`.
    Delete the old `toContain('thunderAmbient')` assertion. Keep all the other existing `soundsFor` cases.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/sfx.test.ts src/audio/audio.test.ts`.
      Expected: FAIL. Other `audio.test.ts` blocks may also fail to compile; Task 10 rewrites them.
- [ ] **Step 3: Implement `sfx.ts`** from the §7 table and edit `soundMap.ts`.
- [ ] **Step 4: Run `sfx.test.ts`.** Expected: PASS.

### Task 7: The leitmotif tracks and the jingles

**Files:**

- Create in `apps/web/src/audio/songs/`: `title.ts`, `night.ts`, `home.ts`, `jingles.ts`, `index.ts`, `index.test.ts`.

**Interfaces:**

- Consumes: `Song` (Task 2).
- Produces:
  - `songs/index.ts` exports `LEITMOTIF` (the exact string in §6.1).
  - `TRACKS: Record<TrackId, Song>` is filled for all 8 in Task 8. Until then, `spring`, `summer`, `fall`, `winter`
    and `shop` are absent, and the test `it.todo`s them.
  - `JINGLES: Record<JingleId, Song>`.
  - `TrackId` and `JingleId` are imported from `../music` (Task 9). If Task 9 isn't done, declare the two types in
    `music.ts` now with just these exports.
  - Each file exports one `Song` const named after its id: `title`, `night`, `home`, and `morning`, `season`,
    `lessonsComplete` and `faint` in `jingles.ts`.

- [ ] **Step 1: Write the failing tests** in `songs/index.test.ts`:
  - For every song in `TRACKS` and `JINGLES`, `expect(() => validateSong(s)).not.toThrow()`.
  - Every track has `loop: true` and `totalBars − introBars ≥ 16`. Every jingle has `loop: false`.
  - The jingle note strings equal §6.3 exactly. Compare `JINGLES.morning.parts.lead?.notes` to the literal in the
    spec, and do the same for every part of the 4 jingles.
  - **Leitmotif:** let `intervals(events)` be the semitone steps between consecutive lead tone onsets, with tied
    and arp duplicates removed. Then `LEITMOTIF`'s interval list `[3, 2, -2, -3, -2, -2, 2, 2, 3, -5]` appears as a
    contiguous run in the lead of `title`, `night` and `home`.
  - Each track's `bpm`, `meter`, `swing` and `introBars`, and the instrument per channel, match the §6.2 table.
    Write a table-driven test with the values from the spec.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/songs/index.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the jingles** verbatim from §6.3.
- [ ] **Step 4: Compose `title`, `night` and `home`** inside their §6.2 chord charts, forms and voices, following
      §6.1:
  - **Harmony:** the chord tones in the given `arp`.
  - **Bass:** the chord roots on strong beats.
  - **Lead:** an original melody. `title` opens A with `LEITMOTIF` in F. `night` plays it slowly (doubled note
    lengths over bars 1–4). `home` puts it in G (transposed +2) at the start of B.
- [ ] **Step 5: Run the tests.** Expected: PASS. Then render each of these songs with `compileSong` in a scratch test and
      check by reading that no lead note falls outside A3–C7. The range rule is advisory, so don't add a test for it.

### Task 8: The season tracks and the shop

**Files:** Create in `apps/web/src/audio/songs/`: `spring.ts`, `summer.ts`, `fall.ts`, `winter.ts`, `shop.ts`.
Modify `index.ts` and `index.test.ts`.

**Interfaces:** Each file exports one `Song` const named after its id. `TRACKS` is now complete.

- [ ] **Step 1: Write the failing test.** Turn Task 7's `it.todo` entries into the table-driven checks for these 5 rows, and
      add the check that every `TrackId` key exists in `TRACKS`.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Compose the 5 tracks** to their §6.2 rows: drum patterns verbatim, chords per bar, the meter (`fall`
      is 3/4) and the swing values. Each lead has its own original melody with a distinct rhythmic character:
  - `spring`: staccato, with 8th-note pickups.
  - `summer`: syncopated and swung.
  - `fall`: long bowed notes and turns.
  - `winter`: sparse, high and bell-like.
  - `shop`: quick repeated notes and a hook.
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 9: Music director

**Files:** Create `apps/web/src/audio/music.ts`, `apps/web/src/audio/music.test.ts`

**Interfaces:**

- Consumes: `Screen` and `Overlay` (`game/store.ts`); `GameEvent`, `LocationId`, `Season` and `Weather`
  (`@hearthvale/core`).
- Produces:

  ```ts
  export type TrackId =
    'title' | 'spring' | 'summer' | 'fall' | 'winter' | 'night' | 'home' | 'shop';
  export type CueId = TrackId | `${Season}:rain`;
  export type JingleId = 'morning' | 'season' | 'lessonsComplete' | 'faint';
  export interface MusicInput {
    screen: Screen;
    overlay: Overlay | null;
    location: LocationId;
    season: Season;
    minute: number;
    weather: Weather;
  }
  export function pickTrack(s: MusicInput | null): CueId;
  export function cueParts(cue: CueId): { track: TrackId; arrangement: Arrangement };
  export function jingleFor(events: readonly GameEvent[]): JingleId | null;
  export const JINGLE_TRANSPOSE: Record<Season, number>; // { spring: 0, summer: 2, fall: -3, winter: 3 }
  ```
  - `jingleFor` priority: `passedOut` → `faint`, then `seasonChanged` → `season`, then `dayStarted` → `morning`,
    then `lessonsComplete` → `lessonsComplete`.

- [ ] **Step 1: Write the failing tests.** The base input is `{ screen: 'game', overlay: null, location: 'farm',
season: 'spring', minute: 600, weather: 'sunny' }`.
  - `pickTrack(null)` is `'title'`.
  - Screen is `'title'`, `'slots'`, `'newGame'` or `'intro'` → `'title'`.
  - The base → `'spring'`.
  - Cart → `'shop'`. Cart at minute 1300 → `'shop'`.
  - Minute 1200 → `'night'`, and 1199 → `'spring'`.
  - House → `'home'`. House at 1250 → `'night'`.
  - Rain → `'spring:rain'`. Storm in fall → `'fall:rain'`. House in the rain → `'home'`.
  - Snow in winter → `'winter'`. Cloudy → the season.
  - `cueParts('fall:rain')` is `{ track: 'fall', arrangement: 'rain' }`, and `cueParts('home')` is
    `{ track: 'home', arrangement: 'normal' }`.
  - `jingleFor([dayStarted, passedOut])` is `'faint'`. `[dayStarted, seasonChanged]` → `'season'`.
    `[dayStarted]` → `'morning'`. `[lessonsComplete]` → `'lessonsComplete'`. `[goldChanged]` → `null`.
  - **Must-fail check (§10.3):** temporarily swap rules 2 and 3 in `pickTrack`, confirm the "cart at minute 1300"
    test fails, then restore them.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/music.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement it.** Use rule order §5.1 and return string literals only (no allocation).
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 10: Sound system around AudioBackend

**Files:** Rewrite `apps/web/src/audio/sound.ts` and the `sound system` and `lesson sounds` blocks of `apps/web/src/audio/audio.test.ts`.

**Interfaces:**

- Consumes: `SoundId` and `Surface` (Task 6); `CueId` and `JingleId` (Task 9).
- Produces:
  ```ts
  export interface AudioBackend {
    sfx(id: SoundId, pitchMul: number): void;
    cue(cue: CueId): void;
    jingle(id: JingleId, transpose: number): void;
    setVolumes(music: number, sfx: number): void;
    setPaused(paused: boolean): void;
    suspend(): void;
    resume(): void;
  }
  export interface AudioState {
    unlocked: boolean;
    cue: CueId | null;
    jingle: JingleId | null;
    lastSfx: SoundId | null;
  }
  export function createSoundSystem(
    backend: AudioBackend,
    now?: () => number,
  ): {
    unlock(): void;
    play(id: SoundId): void;
    footstep(surface: Surface): void;
    setCue(cue: CueId): void;
    playJingle(id: JingleId, transpose?: number): void;
    setVolumes(m: number, s: number): void;
    volumes(): { music: number; sfx: number };
    setPaused(p: boolean): void;
    suspend(): void;
    resume(): void;
    state(): AudioState;
  };
  export type SoundSystem = ReturnType<typeof createSoundSystem>;
  ```

**Behavior:**

- **Before `unlock()`:** `play`, `footstep` and `playJingle` are no-ops. `setCue` only records the cue.
- **`unlock()`:**
  - Calls `backend.resume()`, then `backend.setVolumes(music, sfx)`, then `backend.cue(lastCue)` if a cue was
    recorded.
  - Calling it again does nothing.
- **`setCue`:** calls `backend.cue` only when the cue differs from the last one sent.
- **Footsteps:** they alternate `pitchMul` between 0.97 and 1.03.
- **Calls and defaults:**
  - The `REPEAT_MS` 150 dedupe stays.
  - Every backend call is wrapped in try/catch, and every catch carries a comment.
  - The default volumes are music 0.6 and sfx 0.8, clamped to 0..1.

- [ ] **Step 1: Write the failing tests.** Use a fake backend that logs calls as strings like `cue:spring`,
      `sfx:hoe:1`, `jingle:season:2`, `vol:0.6:0.8`, `paused:true` and `resume`.
  - Silent until unlocked: `play('hoe')` logs nothing, and after `unlock()` it logs `sfx:hoe:1`.
  - **Review Focus 1:** `setCue('title')`, then `setCue('night')` before unlock → nothing is logged. `unlock()` →
    the log is `['resume', 'vol:0.6:0.8', 'cue:night']`.
  - `setCue('spring')` twice after unlock logs `cue:spring` once.
  - Clamps: `setVolumes(2, -1)` → `volumes()` is `{ music: 1, sfx: 0 }` and `vol:1:0` is logged.
  - The dedupe test: keep the existing `chime` within 150 ms case, adapted to `sfx:chime:1`.
  - `footstep('grass')` three times, 400 ms apart on the fake clock → `sfx:step-grass:0.97`, `…:1.03`, `…:0.97`.
  - `playJingle('season', 2)` → `jingle:season:2`. `state().jingle` is `'season'`.
  - A backend whose methods throw: none of `unlock`, `play`, `setCue` or `playJingle` throws.
  - `state()` after `play('coin')` has `lastSfx: 'coin'`.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/audio.test.ts`. Expected: FAIL.
- [ ] **Step 3: Rewrite `sound.ts`.** Remove `SoundHandle`, `SoundFactory`, `AmbientState`, `wantedAmbience` and the
      ambience code.
- [ ] **Step 4: Run the tests.** Expected: PASS. `install.ts` won't compile until Task 12; that's expected.

### Task 11: Menu blips

**Files:** Create `apps/web/src/audio/menuSounds.ts`, `apps/web/src/audio/menuSounds.test.tsx`

**Interfaces:**

- Consumes: `MenuSound` (Task 6); `GameStore` (`game/store.ts`).
- Produces:
  - `export const MENU_SELECTOR = '.title-screen, .screen, .panel'`.
  - `export function installMenuSounds(play: (id: MenuSound) => void, store: StoreApi<GameStore>): () => void`.
- The rules are in spec §8. Track the last menuConfirm time with `performance.now()`. The keydown listener is
  in the capture phase on `document`, and the click listener is in the bubble phase.

- [ ] **Step 1: Write the failing tests.** Render fixtures with plain DOM in jsdom. Use a real
      `createGameStore()` and `vi.fn()` for `play`.
  - **Arrow move:** a `.panel` with buttons A and B, with A focused. Press `ArrowDown` while a test listener moves
    focus to B, then await a microtask. `play` gets `'menuMove'` once.
  - **No move:** an arrow inside a text `input` that doesn't move focus → no call.
  - **Confirm:** clicking a button inside `.title-screen` → `'menuConfirm'`.
  - **Close button:** clicking `.panel .panel-head .icon-btn` → `'menuBack'`, not `'menuConfirm'`.
  - **Overlay closes:** `store.getState().setOverlay('pause')`, then `setOverlay(null)` → `'menuBack'`.
  - **Overlay closes right after a confirm:** a button click, then `setOverlay(null)` within 150 ms → only
    `'menuConfirm'`.
  - **Screen back:** `setScreen('slots')`, then `setScreen('title')` → `'menuBack'`.
  - **HUD button:** clicking a button inside `.hud` → no call.
  - **Disabled button:** clicking it → no call.
  - **Dispose:** after the returned dispose function runs, clicks → no call.
- [ ] **Step 2: Run the tests.** Run `pnpm --filter web exec vitest run src/audio/menuSounds.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 12: Real backend, offline render, wiring, removals and e2e

**Files:**

- Create:
  - `apps/web/src/audio/chipBackend.ts` and `apps/web/src/audio/chipBackend.test.ts`
  - `apps/web/src/audio/offline.ts` and `apps/web/src/audio/offline.test.ts`
  - `apps/web/e2e/audio.spec.ts`
- Modify:
  - `apps/web/src/audio/install.ts` (rewrite)
  - `apps/web/src/game/debugHook.ts`
  - `apps/web/src/scene/assets.ts` (delete `SOUND_FILES` and its comment)
  - `apps/web/src/scene/assets.test.ts` (replace the sound case)
  - `apps/web/package.json`
- Delete: `apps/web/src/audio/howler.ts`, `apps/web/src/audio/synth.ts`, `apps/web/public/assets/audio/`

**Interfaces:**

- Consumes: everything above.
- Produces:
  ```ts
  // chipBackend.ts
  export interface BackendStats { contextState: AudioContextState | 'none'; scheduled: number; activeTracks: number }
  export function chipBackend(makeCtx?: () => AudioContext | null): AudioBackend & { stats(): BackendStats };
  // offline.ts
  export type RenderKind = 'track' | 'jingle' | 'sfx';
  export function renderOffline(kind: RenderKind, id: string, seconds: number): Promise<Float32Array>;
  export function rms(samples: Float32Array): number;
  export function toWavBase64(samples: Float32Array, sampleRate: number): string; // 16-bit PCM mono RIFF
  // install.ts
  export function installAudio(store: StoreApi<GameStore>, bus: EventBus, backend?: AudioBackend & { stats?(): BackendStats }): () => void;
  export function audioDebug(): AudioState & BackendStats;
  // debugHook.ts (DebugHook gains)
  audio(): AudioState & BackendStats;
  renderAudio(kind: RenderKind, id: string, seconds: number): Promise<{ rms: number; wav: string }>;
  ```

**`chipBackend` behavior:**

- **Creating the context:**
  - `makeCtx` defaults to `() => typeof AudioContext === 'undefined' ? null : new AudioContext()`.
  - The context is created lazily on the first `resume()`. With no context, every method is a no-op and `stats()`
    is `{ contextState: 'none', scheduled: 0, activeTracks: 0 }`.
- **`cue(c)`:**
  - Fades every active track's gain to 0 over 1.2 s and marks it `stopAt = now + 1.2`.
  - Makes a new `trackGain()` (fading in from 0 to 1 over 1.2 s), then a sequencer with `compileSong(TRACKS[track],
{ arrangement })`, started at `now + 0.05`.
  - Calls `setSongFilter(compiled.filterHz)` and `setEcho(bpm)`.
- **`jingle(id, transpose)`:**
  - Stops any current jingle, then calls `setDuck(0.2, 0.08)`.
  - Plays `JINGLES[id]` on its own gain node. At `endsAt()` the duck restores with `setDuck(1, 0.8)`.
- **The scheduler:**
  - One `setInterval(tick, 25)` runs while any sequencer is active and is cleared when none is.
  - `tick` advances every sequencer, removes tracks past `stopAt` (stopping them and disconnecting their gains) and
    counts the scheduled events.
- **The rest:** `sfx(id, mul)` calls `engine.playBlips(SFX[id], ctx.currentTime, mul)`. `suspend` and `resume` call
  `ctx.suspend()` and `ctx.resume()`.

**`install.ts` wiring:**

- **Unlock:** keep the existing pointerdown/keydown unlock. It calls `sys.unlock()`, which creates the context
  inside the gesture.
- **Bus events:** `bus.onAny` plays `soundsFor` SFX, keeps the touch vibrate, and pushes each event into `batch`.
  The first push queues a microtask that runs `jingleFor(batch)` and then
  `sys.playJingle(id, id === 'season' ? JINGLE_TRANSPOSE[season] : 0)`.
- **Store subscription:**
  - It maps the store to `MusicInput` (null when there is no game) and calls `sys.setCue(pickTrack(input))` and
    `sys.setPaused(overlay === 'pause')`. `setPaused` only calls the backend on a change.
  - It runs once at install as well.
- **Existing behavior:** keep `onThunder` → `play('thunder')`, the footstep timer and the volumes.
- **Other wiring:**
  - Remove all `setAmbient`, `playMusic` and season calls.
  - Add a `document` `visibilitychange` listener → `sys.suspend()` or `sys.resume()`.
  - Call `installMenuSounds(sys.play, store)`.
  - Every disposer runs in the returned cleanup.

- [ ] **Step 1: Write the failing unit tests.**
  - `chipBackend.test.ts`:
    - **Review Focus 4:** `chipBackend(() => null)`. Every method can be called without throwing, and `stats()`
      equals `{ contextState: 'none', scheduled: 0, activeTracks: 0 }`.
    - With a `vi.stubGlobal('AudioContext', undefined)` default, the same holds.
  - `offline.test.ts`:
    - `rms(new Float32Array([1, -1, 1, -1]))` is 1, and an all-zero buffer gives 0.
    - `toWavBase64(new Float32Array(10), 44100)` decodes to 64 bytes that start with `RIFF` and contain `WAVE`,
      `fmt `, and `data` at offset 36 with length 20.
  - `assets.test.ts`: replace the sound case with
    `expect(credits).toContain('All music and sound effects are original to Hearthvale')` and
    `expect(existsSync(join(pub, 'assets/audio'))).toBe(false)`.
- [ ] **Step 2: Write the failing e2e test** `e2e/audio.spec.ts` (skip on mobile, like `seasons.spec.ts`):
  1. `boot(page)`, then `audio().unlocked` is false. Press `Shift`, then poll until `unlocked` is true, `cue` is
     `'title'`, and `contextState` is `'running'`. Poll that `scheduled > 0`.
  2. `newGame(page, 3)` and press `Shift`. Poll that `cue` is `'spring'`. Then `teleport('house', 4.5, 4.5, 's')`
     → `'home'`. Then teleport to the farm and `skipMinutes(900)` → `'night'`.
  3. A fresh `newGame` and press `Shift`. Then `setWeather('rain')` → `'spring:rain'`.
  4. **Review Focus 2:** in a game, call `window.__hearthvale.setOverlay` alternately with `'cart'` and `null` 5 times,
     50 ms apart. `setOverlay(o: Overlay | null)` is a new `DebugHook` method that calls the store's `setOverlay`.
     Then `activeTracks ≤ 2` immediately, and `activeTracks` is 1 after 1500 ms.
  5. For each of the 8 `TrackId`s, `renderAudio('track', id, 4)` gives `rms > 0.01`. `renderAudio('sfx', 'coin', 1)`
     gives `rms > 0.005`. Every jingle gives `rms > 0.01` over 3 s.
  6. **Hidden tab:** in a page script, set `Object.defineProperty(document, 'hidden', { value: true, configurable: true })`
     and dispatch `visibilitychange` → poll that `contextState` is `'suspended'`. Then set `hidden` back to false
     and dispatch again → `'running'`.
- [ ] **Step 3: Run the tests.**
  - Unit: `pnpm --filter web exec vitest run src/audio src/scene/assets.test.ts`.
  - e2e: `cd apps/web && CI=true pnpm exec playwright test e2e/audio.spec.ts --project=chromium`.
  - Expected: both FAIL.
- [ ] **Step 4: Implement it.**
  - Build `chipBackend.ts`, `offline.ts` and `install.ts`.
  - Add `audio()`, `renderAudio()` and `setOverlay()` to `debugHook.ts`.
  - Delete `howler.ts`, `synth.ts`, `public/assets/audio/` and `SOUND_FILES`.
  - Run `pnpm --filter web remove howler @types/howler`.
  - `renderOffline`:
    - It uses `new OfflineAudioContext(1, 44100 × seconds, 44100)` and `createChipEngine`.
    - For a track or jingle, a sequencer with `now = () => 0` and `lookaheadSec = seconds` is ticked once. For an
      SFX, it calls `playBlips`.
    - Then `startRendering()`.
- [ ] **Step 5: Run the tests again.** Use the unit and e2e commands from Step 3, adding `--project=webkit` for the
      e2e spec. Expected: PASS on Chromium and WebKit.
- [ ] **Step 6: Run the whole web suite and typecheck.** Run
      `pnpm --filter web exec vitest run && pnpm typecheck && pnpm lint`. Expected: all green, with no reference to
      howler left anywhere. `grep -rn howler apps/web/src` returns nothing.

### Task 13: Previews, docs and final verification

**Files:**

- Create: `apps/web/scripts/audition.mjs`, `brain/decisions/0010-original-chiptune-audio.md`
- Modify: `apps/web/package.json` (`"audition": "node scripts/audition.mjs"`), `.gitignore` (`apps/web/audition/`),
  `CREDITS.md`, `docs/ARCHITECTURE.md`, `AGENTS.md`, `brain/MEMORY.md`, `brain/sessions/2026-10-26.md`

- [ ] **Step 1: Write `audition.mjs`.**
  - It launches Playwright Chromium against `http://localhost:5199` and exits with a clear message if the server
    isn't up.
  - Then, for each track (`introBars + 2 × loopBars` worth of seconds, capped at 90), each jingle (4 s) and each
    SFX (2.5 s), it calls `window.__hearthvale.renderAudio`.
  - It decodes the base64 and writes `apps/web/audition/<kind>-<id>.wav`.
- [ ] **Step 2: Run it** with `pnpm --filter web dev:e2e` running in the background, then
      `pnpm --filter web audition`. Expected: 34 WAV files (8 + 4 + 22), each larger than 1 KB.
- [ ] **Step 3: Update the docs.**
  - `CREDITS.md` gets the §11 text, replacing the Sound table and the "There is no background music yet" line.
  - In `docs/ARCHITECTURE.md`, replace the Howler mentions with the chip engine.
  - In `AGENTS.md`, the loop bullet now reads "audio (`audio/install.ts`, chiptune engine in `audio/chip/`)".
  - Write the decision note `0010`: its context, the decision (own engine, original scores), the rejected options
    (Tone.js at ~150 KB, MIDI with a soundfont because of licensing and size) and its consequences.
  - In `brain/MEMORY.md`, resolve the music open thread and link `[[decisions/0010-original-chiptune-audio]]`.
  - Add one line to the session log.
- [ ] **Step 4: Run the final checks.**
  - Run `pnpm checks` in the background, with a 600000 ms timeout and port 5199 free. Expected: every step green,
    including size and `check:build`.
  - Then run `pnpm --filter web size`. Expected: both budgets pass.
  - Finally, `graphify update .`.
- [ ] **Step 5: Run the final review** with superpowers:requesting-code-review over the branch diff, and fix the
      findings.
- [ ] **Step 6: Hand off.**
  - Stop any preview or dev server (it frees port 5199).
  - Send the 34 WAVs to the owner with SendUserFile.
  - Post the AGENTS.md ready-to-push handoff, listing every file in `git add` with its test beside it. State
    plainly that the music was verified by RMS and structure tests, not by ear.
