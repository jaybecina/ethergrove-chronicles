# Hearthvale Orchestral Audio Implementation Plan

> Written when the game was named Hearthvale; it is now Ethergrove Chronicles (see [the 2026-10-29 spec](../specs/2026-10-29-ethergrove-chronicles-design.md)).
> Soundtrack superseded by [the Ethergrove audio spec](../specs/2026-10-30-ethergrove-audio-design.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the chiptune with original orchestral music and sample-based SFX. They are rendered offline from
VSCO 2 CE (CC0), shipped as small AAC files, and played by a light loop player in the game.

**Architecture:**

- A dev-only **studio** (`apps/web/src/studio/` plus `studio.html`, driven by `scripts/studio.mjs` in headless
  Chromium) renders scores with a sampler, synths and a generated reverb. It writes WAVs, encodes them with
  `afconvert`, and generates `src/audio/manifest.ts`.
- The **game** keeps its music director and sound rules, and swaps the chip backend for `orchestraBackend.ts` over
  `player.ts`.

**Tech Stack:** TypeScript (strict), Web Audio (`OfflineAudioContext`, `AudioBufferSourceNode`, `ConvolverNode`),
Playwright (as a studio driver and for e2e), macOS `afconvert`, Vitest + jsdom.

**Spec:** `docs/superpowers/specs/2026-10-29-hearthvale-orchestral-audio-design.md`. Section numbers (§) refer to it.
The chiptune spec's §5 (director) and §8 (menu blips) still hold.

## Global Constraints

- No new runtime dependencies, and the JS budgets are unchanged. The game must never import `src/studio/`; Task 9
  adds a test for this.
- Audio budgets: total ≤ 9 MB, each track ≤ 1 MB, each jingle ≤ 120 KB, each SFX ≤ 40 KB. AAC-LC at 64 kbps.
- Samples come only from `VSCO_DIR` (default `../VSCO-2-CE` from the repo root). Never copy or commit them.
  `apps/web/studio-out/` is gitignored.
- Original music only (§6.1). The Hearth motif is `A4:2 C5:2 D5:4 C5:2 A4:2 G4:4 | F4:2 G4:2 A4:2 C5:2 G4:8`.
- Write the test first and watch it fail. **Don't commit**; the owner commits from the handoff. Keep a ledger at
  `.superpowers/sdd/2026-10-29-hearthvale-orchestral-audio/progress.md`.
- Tests: `pnpm --filter web exec vitest run <path>`; e2e:
  `cd apps/web && CI=true pnpm exec playwright test e2e/audio.spec.ts --project=chromium --project=webkit --retries=0`.
- Nobody can hear tests. Report RMS, peaks and sizes, and never claim the sound is "good".

## Review Focus

1. **AAC priming offset at the loop point.** Different decoders (Chrome, Safari) shift the start by tens of ms. The
   pre/post-roll layout (§3.4) must keep the loop seamless anyway. Task 10's e2e correlation test pins this.
2. **A slow network or a failed fetch on a cue change** (e.g. the first trip to the cart) must not stack tracks,
   leave a gap that never ends, or throw. Task 8 pins this: a fetch resolving after a newer cue must not start.
3. **Phone memory:** never more than 2 decoded tracks held. Task 8's LRU test pins this.
4. **Sustained notes longer than their sample** (cellos 6.4 s, flute 7.3 s) must not cut off. Task 6's piece test
   pins this: each sustained note's duration is ≤ its instrument's `maxSustainSec`.
5. **Studio reproducibility:** the same score renders the same file (seeded reverb, round robin by note index,
   no `Math.random`). Task 3 and Task 5 pin this.

---

## File map

```
apps/web/studio.html                    dev-only page → src/studio/main.ts
apps/web/src/studio/
  notes.ts (+test)        moved from audio/chip; octave 0 allowed; sharps/flats
  score.ts (+test)        moved; Piece/PartSpec (§4), dyn, pan, reverb, octave, kit parts; validatePiece, compilePiece
  sequencer.ts (+test)    moved unchanged (offline: tick once with a big look-ahead)
  samples.ts (+test)      SAMPLE_MAP, parseRoot, pianoKey, buildIndex(paths), pickSample
  sampler.ts (+test)      playSample(ctx, buf, opts) voice
  synths.ts (+test)       pad, subBass, arp, choir voices
  reverb.ts (+test)       mulberry32, hallImpulse, roomImpulse
  render.ts (+test)       wrapLoop, normalizeGain, trimTail, renderPiece
  wav.ts (+test)          encodeWav(left, right, rate) → Uint8Array
  main.ts                 window.studio = { pieces(), render(id) }
  pieces/{title,spring,summer,fall,winter,night,home,shop,jingles,sfx,index}.ts, index.test.ts
apps/web/scripts/studio.mjs             render → WAV → afconvert → public files + src/audio/manifest.ts
apps/web/src/audio/manifest.ts          generated (committed)
apps/web/src/audio/player.ts (+test)    AAC loop player
apps/web/src/audio/orchestraBackend.ts (+test)
apps/web/src/audio/assets.test.ts       budgets + manifest ↔ files
Deleted: src/audio/chip/, src/audio/songs/, src/audio/sfx.ts(+test), src/audio/offline.ts(+test),
         src/audio/chipBackend.ts(+test), scripts/audition.mjs, "audition" script in package.json
```

---

### Task 1: Move the score tools into the studio and extend them

**Files:**
- Move: `src/audio/chip/{notes,score,sequencer}.ts` and their tests to `src/studio/`.
- Modify: `src/studio/notes.ts`, `src/studio/score.ts` and their tests.

**Interfaces:**

- Produces:
  - **`notes.ts`:** `noteMidi`, now accepting octaves 0–8 with `/^([A-G])([#b]?)(\d)$/` (still throws
    `Bad note "<n>"`). Also `noteHz`, `midiHz`, `NOTE_MIN = 12` (C0) and `NOTE_MAX = 108` (C8).
  - **`score.ts`:**
    ```ts
    export type Dyn = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
    export const DYN_GAIN: Record<Dyn, number> = { pp: 0.25, p: 0.4, mp: 0.55, mf: 0.7, f: 0.85, ff: 1 };
    export interface PartSpec { instrument: InstrumentId | SynthId | 'kit'; notes: string; gain?: number; pan?: number;
      reverb?: number; dyn?: string; arp?: 'up' | 'down' | 'updown' | 'block'; arpRate?: number; octave?: number;
      kit?: Record<string, KitId> }
    export interface Piece { id: string; kind: 'track' | 'jingle' | 'sfx'; bpm: number; meter: 3 | 4; swing?: number;
      parts: Record<string, PartSpec>; tailSec?: number }
    export interface NoteEvent { step: number; steps: number; part: string; instrument: InstrumentId | SynthId;
      midi: number; gain: number; dyn: Dyn; noteIndex: number }   // noteIndex counts within the part, for round robin
    export interface HitEvent { step: number; part: string; kit: KitId; gain: number; noteIndex: number }
    export interface CompiledPiece { id: string; kind: Piece['kind']; bpm: number; meter: 3 | 4; swing: number;
      stepSec: number; barSteps: number; totalBars: number; seconds: number; tones: NoteEvent[]; hits: HitEvent[];
      parts: Record<string, { pan: number; reverb: number }> }
    export function validatePiece(p: Piece): void;
    export function compilePiece(p: Piece): CompiledPiece;
    ```
  - `InstrumentId`, `SynthId` and `KitId` are imported from `samples.ts` and `synths.ts`. Declare them there first as
    type-only files if those tasks come later.
- The old `Song`, `compileSong`, the rain arrangement, `DEFAULT_GAIN` and `filterHz` are removed. `introBars` and
  `loop` go too: tracks are whole loops.
- The token grammar is unchanged (notes, `r`, `~`, chords and `arp`, from the chiptune spec §4).
- A kit part reads one character per step, mapped through `part.kit`. `.` is a rest, and an unmapped character is
  an error: `bad token "<c>"`.

**Rules:**
- **`dyn`:**
  - One token per bar: `pp p mp mf f ff < >`. A missing `dyn` means `mf` for every bar.
  - `<` and `>` interpolate per step from the previous bar's value to the next bar's value. The next value must
    exist (an error otherwise: `` `${id} ${part} bar ${n}: hairpin needs a target` ``).
  - A note's `dyn` is the nearest named dynamic at or below the interpolated gain.
- **Gain:** `gain = (part.gain ?? 0.5) × dynGain`.
- **Octave:** `octave` shifts every MIDI note by `12 × octave` before the range check.
- **`seconds`** is `totalBars × barSteps × stepSec`.
- **Default pan:** take it from §4.3 by instrument family, through a `DEFAULT_PAN: Partial<Record<InstrumentId |
  SynthId | 'kit', number>>` in `score.ts`. The default reverb is 0.3.

- [ ] **Step 1: Move the files.** `git mv` each pair into `src/studio/`, update the imports, and delete
  `src/audio/chip/{engine,instruments}.ts` and their tests. Run `pnpm --filter web exec vitest run src/studio`;
  expect the old score tests to FAIL to compile.
- [ ] **Step 2: Rewrite the score and notes tests.**
  - Keep every grammar case, adapted to `compilePiece`.
  - `noteMidi('A#0')` is 22, and `noteMidi('C9')` throws.
  - `dyn: 'p < f'` over 3 bars: the step-0 gain is `0.5×0.4`, the bar-2 gain rises linearly, and the bar-3 gain is
    `0.5×0.85`.
  - `dyn: 'p <'` throws `hairpin needs a target`.
  - `octave: -1` lowers MIDI by 12.
  - Kit `'k...t...'` with `kit: { k: 'bassDrum', t: 'tamb' }` gives hits at 0 and 4. An unmapped `x` throws.
  - The default pan for `violins` is −0.35, and `pan: 0.9` overrides it.
  - A piece whose parts have different bar counts throws `` `${id}: parts have different bar counts` ``.
  - `noteIndex` counts 0, 1, 2… per part.
- [ ] **Step 3: Run the tests.** Expected: FAIL.
- [ ] **Step 4: Implement it.**
- [ ] **Step 5: Run the tests.** Run `pnpm --filter web exec vitest run src/studio`. Expected: PASS. The sequencer
  tests pass unchanged against the new event shape once their fixtures use `compilePiece`. The sequencer keeps
  accepting `{ step, steps? }` events; adapt its types to `NoteEvent | HitEvent` with a `stepSec`.

### Task 2: The sample map

**Files:** Create `src/studio/samples.ts` and `samples.test.ts`.

**Interfaces:**

```ts
export type InstrumentId = 'violins' | 'violinsPizz' | 'violinsTrem' | 'violas' | 'cellos' | 'cellosPizz' | 'basses'
  | 'harp' | 'horn' | 'trumpet' | 'trombone' | 'tuba' | 'flute' | 'oboe' | 'clarinet' | 'clarinetStac' | 'bassoon'
  | 'piano' | 'glock' | 'marimba';
export type KitId = 'timpHit' | 'timpRoll' | 'bassDrum' | 'cymbalSwell' | 'cymbalHit' | 'triangle' | 'sleigh' | 'tamb'
  | 'shaker' | 'claves' | 'logDrum' | 'bellTree' | 'glockGliss' | 'gong';
export interface InstrumentDef { dir: string; pattern: RegExp; sustained: boolean; maxSustainSec: number }
export const SAMPLE_MAP: Record<InstrumentId, InstrumentDef>;
export const KIT_MAP: Record<KitId, readonly string[]>;   // VSCO-relative file paths (or dir + regex, expanded by buildIndex)
export function parseRoot(fileName: string): number | null;   // first [A-G]#?\d token → MIDI
export function pianoKey(fileName: string, chart: Record<string, number>): number | null;
export interface SampleRef { path: string; root: number; layer: number; rr: number }
export interface SampleIndex { instruments: Record<InstrumentId, SampleRef[]>; kit: Record<KitId, string[]> }
export function buildIndex(paths: readonly string[], pianoChart: Record<string, number>): SampleIndex;
export function pickSample(index: SampleIndex, id: InstrumentId, midi: number, dyn: Dyn, noteIndex: number):
  { ref: SampleRef; rate: number } | null;
```

**`SAMPLE_MAP`.** These are VSCO-relative directories and filename patterns. The capture groups are note, layer
and rr; a missing rr counts as 1.

| Id | Directory | Pattern | Sustained | maxSustainSec |
|---|---|---|---|---|
| violins | `Strings/Violin Section/susVib` | `VlnEns_susVib_(note)_v(\d)` | yes | 12 |
| violinsPizz | `Strings/Violin Section/Pizz` | `VlnEns_Pizz_(note)_v(\d)_rr(\d)` | no | — |
| violinsTrem | `Strings/Violin Section/Trem` | `VlnEns_Trem_(note)_v(\d)` | yes | 8 |
| violas | `Strings/Viola Section/susvib` | `ViolaEns_susvib_(note)_v(\d)_1` | yes | 8 |
| cellos | `Strings/Cello Section/susvib` | `susvib_(note)_v(\d)_1` | yes | 6 |
| cellosPizz | `Strings/Cello Section/pizzT` | `pizzT_(note)_v(\d)_RR(\d)` | no | — |
| basses | `Strings/Solo Contrabass/SusVib` | `BKCtbss_SusVib_(note)_v(\d)_rr(\d)` | yes | 6 |
| harp | `Strings/Harp` | `KSHarp_(note)_(mf\|f)` | no | — (the layer is mf=1, f=2) |
| horn | `Brass/F Horn/sus` | `MOHorn_sus_(note)_v(\d)_1` | yes | 12 |
| trumpet | `Brass/Trumpet/sus` | `Sum_SHTrumpet_sus_(note)_v(\d)_rr(\d)` | yes | 6 |
| trombone | `Brass/Tenor Trombone/sus` | `tenortbn_sus_(note)_v(\d)_1` | yes | 6 |
| tuba | `Brass/Tuba/sus` | `Tuba3_sus_(note)_v(\d)_rr(\d)_Mid` | yes | 6 |
| flute | `Woodwinds/Flute/susvib` | `LDFlute_susvib_(note)_v(\d)_1` | yes | 7 |
| oboe | `Woodwinds/Oboe/Sus` | `Oboe_Sus_(note)_v(\d)_Main` | yes | 6 |
| clarinet | `Woodwinds/Clarinet/susLong` | `DCClar_susLong_(note)_v(\d)_rr(\d)_sum` | yes | 8 |
| clarinetStac | `Woodwinds/Clarinet/stac` | `DCClar_stac_(note)_v(\d)_rr(\d)_sum` | no | — |
| bassoon | `Woodwinds/Bassoon/sus` | `PSBassoon_(note)_v(\d)_1` | yes | 6 |
| piano | `Keys/Upright Piano` | `Player_dyn(\d)_rr1_(\d{3})`, keyed by `pianoKey` | no | — |
| glock | `Percussion/Glock` | `glock_medium_(note)` | no | — |
| marimba | `Percussion/Marimba` | `Marimba_hit_Outrigger_(note)_loud_01` | no | — |

**`KIT_MAP`.** Paths are relative to `VSCO_DIR`. `P` is `VSCO 1 Percussion` and `M` is `Miscellania Raw`.

| Kit id | Files |
|---|---|
| timpHit | `Percussion/Timpani/Timpani2_Hit_v3_rr1_Sum.wav`, `…_rr2_Sum.wav` |
| timpRoll | `Percussion/Timpani/Rolls/Timpani2_Roll_v3_rr1_Sum.wav` |
| bassDrum | `P/drums/bass/bdrum_mp_1.wav`, `bdrum_mp_2.wav` |
| cymbalSwell | `P/varMetal/Cymbals/susp/susp_hit_softmall_roll2_cresc.wav` |
| cymbalHit | `P/varMetal/Cymbals/susp/susp_hit_hardmall_mf.wav` |
| triangle | `P/varMetal/triangle/1/triangle1_hit_mp.wav` |
| sleigh | `M/Misc 2/sleighbell1_hit_1.wav`, `_2`, `_3` |
| tamb | `M/Misc 2/tamb3_1.wav`…`tamb3_4.wav` |
| shaker | `P/varMetal/various/cabasa_1.wav`…`cabasa_3.wav` |
| claves | `P/varWood/claves_mp.wav` |
| logDrum | `P/varWood/log_drum/slitdrum0_ff_1.wav` |
| bellTree | `P/varMetal/various/bell_tree_scrape1.wav` |
| glockGliss | `M/Misc 2/glock_glisses/glock_fx_up_chromatic_med_01.wav` |
| gong | `P/varMetal/Gong/gong_hit_p.wav` |

**`pickSample` rules:**
- **Velocity layer:** for an instrument with layers `1..n`: pp/p → 1; mp/mf → `ceil(n/2)`; f/ff → n.
- **Root:** the nearest root, preferring at or below, within ±7 semitones; otherwise `null`.
- **Round robin:** `rr = (noteIndex % rrCount) + 1`.
- **Rate:** `rate = 2^((midi − root)/12)`.

- [ ] **Step 1: Write the failing tests.**
  - `parseRoot('VlnEns_susVib_G4_v1.wav')` is 67, `parseRoot('Tuba3_sus_A#0_v2_rr1_Mid.wav')` is 22, and
    `parseRoot('x.wav')` is null.
  - `pianoKey('Player_dyn1_rr1_024.wav', { '024': 69 })` is 69.
  - `buildIndex` over a fixture path list (two violin roots G4/B4, layers 1–2; a harp; piano entries) groups them
    correctly.
  - `pickSample(index, 'violins', 69 /*A4*/, 'f', 0)` gives the G4 sample, layer 2, and rate `2^(2/12)`.
  - A note more than 7 semitones from every root gives null.
  - Round robin alternates `rr` 1, 2, 1.
  - Every `KIT_MAP` id has at least one path.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Check against the real library.** In a scratch node script (not committed), glob `VSCO_DIR` with the
  `SAMPLE_MAP` patterns. Every instrument must match at least 5 files and every `KIT_MAP` path must exist. Record the
  counts in the ledger. Fix any pattern that matches nothing; that's a ruling.

### Task 3: Reverb and WAV

**Files:** Create `src/studio/reverb.ts`, `wav.ts` and their tests.

**Interfaces:**
- `mulberry32(seed): () => number`
- `impulseSamples(rate, seconds, seed, preDelaySec = 0.02): { left: Float32Array; right: Float32Array }`, a pure
  function.
- `hallImpulse(ctx: BaseAudioContext): AudioBuffer`, which is 2.8 s with seed 7.
- `roomImpulse(ctx)`, which is 0.6 s with seed 11.
- `encodeWav(left: Float32Array, right: Float32Array, rate: number): Uint8Array`, writing 16-bit stereo PCM.

**Rules:** see §3.3. The damping lowpass is one-pole, with a coefficient sweeping linearly from 12 kHz to 3 kHz over
the length.

- [ ] **Step 1: Write the failing tests.**
  - Identical seeds give identical arrays, and different seeds give different ones.
  - The first `0.02 × rate` samples are 0.
  - The RMS of the last 10% is below 0.002 × the RMS of the first 10% after the pre-delay.
  - L ≠ R.
  - WAV: 44-byte header, `RIFF` / `WAVE` / `fmt ` / `data`, channels 2, block align 4, and samples interleaved
    L, R, clipped to ±1.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 4: Sampler and synth voices

**Files:** Create `src/studio/sampler.ts`, `synths.ts` and their tests. Reuse `src/test/fakeAudio.ts`, adding
`createConvolver` and `createStereoPanner` to the fake.

**Interfaces:**
- `playSample(ctx, buffer: AudioBuffer, o: { start: number; dur: number | null; rate: number; gain: number;
  release: number; dest: AudioNode; lowpass?: number; highpass?: number; rateTo?: number }): void`
  - With `dur: null`, the sample plays to its end.
  - With a duration, it releases from `start + dur`.
  - It stops at `min(buffer.duration / rate, dur + release × 5)`.
  - It disconnects every node on `ended`.
- `export type SynthId = 'pad' | 'subBass' | 'arp' | 'choir'`
- `playSynth(ctx, id: SynthId, o: { start; dur; midi; gain; dest }): void`, with values from §3.2.

- [ ] **Step 1: Write the failing tests.**
  - `playSample` sets `playbackRate` and starts at `start`.
  - With a duration of 1 s and a release of 0.25, it stops at ≤ `start + 1 + 1.25`.
  - Every node is disconnected after `end()`.
  - `rateTo` ramps `playbackRate`.
  - `pad` creates 3 oscillators detuned by −7, 0 and +7 cents.
  - `choir` uses 2 bandpass filters at 700 and 1200 Hz.
  - No exponential ramp ever goes to 0. Reuse the check from the old engine test.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 5: Render

**Files:** Create `src/studio/render.ts` and `render.test.ts`.

**Interfaces:**
```ts
export function wrapLoop(l: Float32Array, r: Float32Array, loopSamples: number, edgeSamples: number):
  { left: Float32Array; right: Float32Array; loopStart: number; loopEnd: number }; // in seconds at the given rate
export function normalizeGain(l: Float32Array, r: Float32Array, rmsTarget: number, peakMax: number): number;
export function trimTail(l: Float32Array, r: Float32Array, floorDb = -70): number; // new length
export interface Rendered { left: Float32Array; right: Float32Array; rate: number; loopStart?: number; loopEnd?: number }
export function renderPiece(p: Piece, load: (path: string) => Promise<AudioBuffer>, index: SampleIndex): Promise<Rendered>;
```

**Rules (§3.4):**
- **Tracks:** render `2 × seconds + 3` s. Keep `[L, 2L)`, then `wrapLoop` with a 0.5 s edge. Normalize with an RMS
  target of 0.1 and a peak of 0.89.
- **Jingles:** `seconds + 3` s, trimmed, RMS 0.11, peak 0.89.
- **SFX:** `max(layers' end) + 0.8` s, trimmed, peak 0.7 × `level`.
- **Rate:** 44100 Hz.
- **SFX graph:** SFX use their own layer graph (Task 6) and `roomImpulse` at a 0.15 send.
- **Loading:** samples load through `load(path)`, cached per path for the whole render session.

- [ ] **Step 1: Write the failing tests.**
  - **`wrapLoop`:** the input is a ramp `0..2L`. The output's length is `L + 2·edge`. `out[edge]` equals the input
    at `L`, `out[edge + L]` equals `out[edge]` (the identical audio at both loop points), and `loopStart` is `edge/rate`.
  - **Must-fail variant (§9.3):** a version of `wrapLoop` taking `[0, L)` instead of `[L, 2L)` fails the
    "tail wraps" assertion.
  - **`normalizeGain`:** with an RMS target of 0.1 the gain is chosen, but if the peak would exceed 0.89 the lower
    gain wins.
  - **`trimTail`:** stops at the last sample above −70 dBFS.
  - **`renderPiece`:** test it with a stub `OfflineAudioContext` global (the fake) and stub buffers. It schedules one
    source per note and returns `loopStart`/`loopEnd` for tracks only.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 6: Compose the pieces

**Files:** Create `src/studio/pieces/*.ts` and `pieces/index.test.ts`, and delete `src/audio/songs/`.

**Interfaces:**
- `TRACK_PIECES: Record<TrackId, Piece>`
- `JINGLE_PIECES: Record<JingleFile, Piece>`
- `SFX_RECIPES: Record<SoundId, SfxRecipe>`
- `LEITMOTIF`
- The recipe type:
  ```ts
  interface SfxLayer { at: number; dur?: number; source: { file: string } | { kit: KitId } | { instrument: InstrumentId; note: string };
    gainDb?: number; lowpass?: number; highpass?: number; rate?: number; rateTo?: number }
  interface SfxRecipe { layers: SfxLayer[]; level: number }
  ```
- `JingleFile` is defined in `src/audio/music.ts` (Task 9). Add the type now.

- [ ] **Step 1: Write the failing tests.**
  - Every track and jingle validates, and every `TrackId` and `JingleFile` exists.
  - Each track's bars, bpm and meter match §6.2, and its `seconds` is within ±1 s of the table.
  - **Leitmotif:** the interval run `[3,2,-2,-3,-2,-2,2,2,3,-5]` appears in some part of `title`, `night`, `home` and
    each `season-*`. For fall, accept the minor-mode run `[3,2,-2,-3,-2,-2,2,1,3,-5]` as well.
  - **Review Focus 4:** for every sustained-instrument note, `steps × stepSec ≤ maxSustainSec`.
  - Every note is inside the instrument's §6.1 range.
  - Brass notes only appear where the part's dyn is ≥ mf.
  - `SFX_RECIPES` covers all 22 `SoundId`s with the §7 levels.
  - Every `{ file }` path in `SFX_RECIPES` is one of the confirmed paths. The list is in the test, from Task 2 Step 5.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Compose the 8 tracks, 7 jingles and 22 SFX** to §6.2, §6.3 and §7, following §6.1.
  - Each section changes the orchestration.
  - The B sections carry countermelodies.
  - The last bar of each track sets up its first.
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 7: The studio script and the first render

**Files:**
- Create: `apps/web/studio.html`, `src/studio/main.ts`, `scripts/studio.mjs`.
- Modify: `.gitignore` (add `apps/web/studio-out/`) and `apps/web/package.json` (add `"studio": "node scripts/studio.mjs"` and
  remove `audition`).
- Delete: `scripts/audition.mjs`.

**`studio.mjs` behaviour:**
1. Check `VSCO_DIR` and `/usr/bin/afconvert`, and exit 1 with a message if either is missing.
2. Glob `VSCO_DIR` for `.wav` files and read `Keys/Upright Piano/MappingChart.txt` into `{ '000': 21, … }`.
3. Launch Chromium against `http://localhost:5199/studio.html`. It needs `pnpm --filter web dev:e2e` running and exits
   with a message if that's down.
4. Route `/vsco/**` to files under `VSCO_DIR`.
5. Call `window.studio.init(paths, chart)`.
6. For each piece:
   - `await window.studio.render(kind, id)` returns `{ left, right, rate, loopStart, loopEnd }` as base64 Float32.
   - Write `studio-out/<kind>-<id>.wav`.
   - Run `afconvert … -f m4af -d aac -b 64000` to `public/assets/music/<id>.m4a` (tracks and jingles) or
     `public/assets/sfx/<id>.m4a`.
   - Print `id`, seconds, RMS, peak and bytes.
7. Write `src/audio/manifest.ts`, with entries sorted and formatted by Prettier.

**`manifest.ts` shape:**
```ts
export interface AudioFile { file: string; bytes: number; duration: number }
export interface TrackFile extends AudioFile { loopStart: number; loopEnd: number }
export const MUSIC: Record<TrackId, TrackFile>;
export const JINGLES: Record<JingleFile, AudioFile>;
export const SFX_FILES: Record<SoundId, AudioFile>;
```

- [ ] **Step 1: Write the files above.** `main.ts` is glue: it calls `buildIndex`, `renderPiece` and `encode`.
- [ ] **Step 2: Render.** Start `dev:e2e` in the background, then run `pnpm --filter web studio`. Expected: 37 files
  (8 + 7 + 22). The printed sizes must be within budget, and no peak may exceed 0.9.
- [ ] **Step 3: Check the numbers.** Analyze the WAVs with python `wave`, the same check as last time: peak, clipped
  sample count, and the loudest and quietest 1 s RMS. Write the table into the ledger.
- [ ] **Step 4: Stop the dev server.**

### Task 8: Player and backend

**Files:**
- Create: `src/audio/player.ts`, `orchestraBackend.ts` and their tests.
- Delete: `chipBackend.ts` and its test, and `offline.ts` and its test.

**Interfaces:**
```ts
// player.ts
export interface PlayerDeps { ctx: BaseAudioContext; fetchBytes(url: string): Promise<ArrayBuffer> }
export function createPlayer(d: PlayerDeps): {
  playTrack(id: TrackId, rain: boolean): Promise<void>;   // crossfade 1.2 s; quick-cut fading tracks; stale loads ignored
  playJingle(id: JingleFile): Promise<void>;              // duck 0.25 in 80 ms, restore over 0.8 s after it ends
  playSfx(id: SoundId, pitchMul: number): void;           // at currentTime + 0.005
  setRain(on: boolean): void; setPaused(p: boolean): void; setVolumes(music: number, sfx: number): void;
  stats(): { activeTracks: number; loaded: number };
};
// orchestraBackend.ts
export function orchestraBackend(makeContext?: () => AudioContext | null):
  AudioBackend & { stats(): BackendStats & { loaded: number } };
```

**Rules:**
- **Decoded buffers:** an LRU with at most 2 tracks.
- **Compressed bytes:** cached without limit. They are small.
- **Stale loads:** each `playTrack` call takes a token. When its decode resolves, if the token isn't the latest,
  the buffer is cached but not started.
- **Gains:** the `trackBus` gain is `duck × (rain ? 0.8 : 1)`. The filter targets are 20000, 1800 (rain) and 1200
  (pause). `musicOut` is `volume × (paused ? 0.6 : 1)`.
- **Errors:** fetch and decode errors are caught; that sound stays silent.

- [ ] **Step 1: Write the failing tests.** Use the fake context with a fake `decodeAudioData` that returns a buffer
  object.
  - Loop points come from the manifest.
  - Rapid cues give at most 2 tracks, then 1 once 1.2 s pass.
  - **Review Focus 2:** load A slowly and B quickly, then resolve A last. Only B plays.
  - **Review Focus 3:** after playing 3 different tracks, `loaded` is ≤ 2.
  - Rain and pause filter targets, and the trackBus `duck × rain` combinations.
  - The jingle duck and restore.
  - The SFX start offset.
  - A rejected fetch doesn't throw.
  - The backend with no context.
  - The refused-resume case, kept from `chipBackend.test`.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run the tests.** Expected: PASS.

### Task 9: Wire the game

**Files:**
- Modify:
  - `src/audio/music.ts`: add `JingleFile` and remove `JINGLE_TRANSPOSE`.
  - `sound.ts`: `jingle(id: JingleFile)`.
  - `install.ts`: use `orchestraBackend()`, and pass `season-${season}`.
  - `soundMap.ts`: unchanged ids.
  - `game/debugHook.ts`: `probeAudio`.
  - Their tests.
- Create: `src/audio/assets.test.ts`.
- Delete: `src/audio/sfx.ts` and its test.

**Interfaces:**
- `jingleFile(id: JingleId, season: Season): JingleFile`
- `probeAudio(kind: 'track' | 'jingle' | 'sfx', id: string): Promise<{ rms: number; duration: number;
  loopStart?: number; loopEnd?: number; corr?: number }>`. The `corr` field holds the correlation of 2048 samples at
  `loopStart` vs `loopEnd`, for tracks.

- [ ] **Step 1: Write the failing tests.**
  - `install.test`: a season batch gives `jingle:season-summer`.
  - `music.test`: `jingleFile('season', 'fall')` is `'season-fall'`.
  - `assets.test` (node environment):
    - the manifest and the files match, and the byte sizes are equal;
    - the budgets hold;
    - `loopEnd − loopStart` equals each track's `compilePiece(...).seconds` ±0.05;
    - no orphan `.m4a`;
    - no file under `src/` outside `src/studio/` imports from `studio/`. Grep the sources.
- [ ] **Step 2: Run the tests.** Expected: FAIL.
- [ ] **Step 3: Implement it.**
- [ ] **Step 4: Run the tests.** Run `pnpm --filter web exec vitest run`. Expected: PASS. Then run
  `pnpm typecheck` and `pnpm lint`.

### Task 10: E2E

**Files:** Modify `apps/web/e2e/audio.spec.ts`.

- [ ] **Step 1: Update the tests.**
  - Keep unlock, cue per place, rain, flapping and the hidden tab.
  - Replace the `renderAudio` loudness test with `probeAudio` over every manifest entry:
    - RMS: tracks and jingles > 0.01, SFX > 0.005.
    - Duration within ±0.1 s of the manifest.
    - For tracks, `corr > 0.99` (**Review Focus 1**).
- [ ] **Step 2: Run** on Chromium and WebKit with retries 0, `--repeat-each=2`. Expected: PASS.
- [ ] **Step 3: Must-fail check.** Temporarily make `wrapLoop` keep `[0, L)`, re-render one track with
  `pnpm --filter web studio --only title`, and confirm `corr` fails. Restore the code and re-render. `studio.mjs`
  takes an `--only <id>` flag for this.

### Task 11: Docs, checks, review, handoff

- [ ] **Step 1: Update the docs** per §8: `CREDITS.md`, the brain decision `0010` rename and rewrite, `MEMORY.md`,
  the session log and `AGENTS.md`. Mark the chiptune spec and plan with "Superseded in part by
  2026-10-29-hearthvale-orchestral-audio-design.md" at the top.
- [ ] **Step 2: Run the checks.** Run `graphify update .`, then `pnpm checks` in the background, with port 5199 free.
  Expected: all 8 green, with sizes reported.
- [ ] **Step 3: Final review.** Run a fresh reviewer on the most capable model over the working tree vs HEAD, with
  this plan's Review Focus and the ledger rulings. Do one fix pass, test-first.
- [ ] **Step 4: Hand off.**
  - Stop servers.
  - Send the 8 tracks and 7 jingles as `.m4a`, plus a zip of the SFX, with SendUserFile.
  - Post the AGENTS.md handoff, listing every file, the sizes and what wasn't verified (it hasn't been listened to;
    it hasn't been tested on a real phone).
