# Ethergrove Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Ship the Ethergrove farm soundtrack: port the unfinished orchestral studio onto the renamed `main`,
add lo-fi voices and rules, re-theme the music around the Rootsong, render it, and play it in the game.

**Architecture:** A dev-only studio (`apps/web/src/studio/`, `studio.html`, `scripts/studio.mjs`) renders scores
with VSCO samples and synths to WAV, encodes AAC `.m4a` with `afconvert` and writes `src/audio/manifest.ts`. The
game swaps the chiptune backend for `orchestraBackend.ts` over a small loop player. The music director gains a
`rain` track.

**Tech Stack:** TypeScript (strict), Web Audio (`OfflineAudioContext`, `ConvolverNode`, `WaveShaperNode`,
`DelayNode`), Playwright (studio driver and e2e), macOS `afconvert`, Vitest + jsdom + `fake-indexeddb`.

**Spec:** `docs/superpowers/specs/2026-10-30-ethergrove-audio-design.md` (§ numbers refer to it). It builds on
the orchestral spec and its plan, which Task 1 ports as `docs/superpowers/specs/2026-10-29-hearthvale-orchestral-audio-design.md`
and `docs/superpowers/plans/2026-10-29-hearthvale-orchestral-audio.md`. Where this plan says "as orchestral plan
Task N", read that task.

## Global Constraints

- Work only in the worktree `.claude/worktrees/ethergrove-chronicles`, branch `docs/ethergrove-audio`. The old
  checkout (`/Users/apple/Documents/Jay Dev/hearthvale`, branch `feat/bgm-sound-effects`) is **read-only**: never
  commit, stash, reset, clean, switch branches or edit files there.
- **Don't commit or push** unless the owner asks in this conversation (`AGENTS.md`). Ledger:
  `.superpowers/sdd/2026-10-30-ethergrove-audio/progress.md`.
- No new runtime dependencies; JS budgets unchanged; the game never imports `src/studio/`.
- Audio budgets: total ≤ 9 MB; each track ≤ 1 MB; each jingle ≤ 120 KB; each SFX ≤ 40 KB; AAC-LC 64 kbps.
- Samples only from `VSCO_DIR` (default `../VSCO-2-CE` from the repo root; the owner's copy is
  `/Users/apple/Documents/Jay Dev/VSCO-2-CE`). Never copy or commit samples. `apps/web/studio-out/` is gitignored.
- Original music only (§2.4, orchestral spec §6.1). **No Hearth motif anywhere** (its steps:
  `+3 +2 −2 −3 −2 −2 +2 +2 +3 −5`). Never hip-hop (§2.4).
- Motifs, exactly (§2.2), lengths in 16ths:
  - Rootsong major (D): `B3:2 D4:2 F#4:4 E4:2 D4:2 A4:4 | G4:2 F#4:2 E4:2 F#4:2 D4:8`
  - Rootsong minor (B minor): `B3:2 D4:2 F#4:4 E4:2 D4:2 G4:4 | F#4:2 E4:2 D4:2 C#4:2 B3:8`
  - Gloam: `B3:2 D4:2 F4:4 E4:2 D4:2 G4:4 | F4:2 E4:2 D4:2 C#4:2 B3:8`
  - Grandpa's theme (G): `G4:3 A4:1 B4:4 D5:4 B4:4 | C5:2 B4:2 A4:2 G4:2 E4:4 D4:4`
- Write each test first and watch it fail. Tests: `pnpm --filter web exec vitest run <path>`. E2E:
  `cd apps/web && CI=true pnpm exec playwright test e2e/audio.spec.ts --project=chromium --project=webkit --retries=0`.
- Nobody can hear tests. Report RMS, peaks and sizes; never claim the sound "is good".
- Keep port 5199 free when not running e2e or the studio; stop servers before handoff.

## Review Focus

1. **Rain at night:** at 21:00 in a storm the night track plays, not rain (rule order §4.1). Task 8 pins it.
2. **Storm flapping:** weather toggling rain → clear → rain within seconds must never stack more than 2 tracks or
   restart a track that is already playing. Task 7 pins it (same cue twice = no restart).
3. **Loop seam on lo-fi tracks:** the wobble and hiss must not break the seamless loop. Task 4 pins the whole-cycle
   wobble; Task 9's correlation check runs on `home`, `night` and `rain` too.
4. **A missing or failed sample** in the new voices (`uprightNr1`, kits) must fail the studio loudly, never render
   silence into a shipped file. Task 3 pins it.
5. **Old players' settings:** music and SFX volumes saved by the chiptune build still apply (same setting keys).
   Task 8 pins it: `setVolumes` is called with the stored values on install.

---

## File map

```
Ported (Task 1) from the old checkout, then renamed to @ethergrove/core:
  apps/web/studio.html, apps/web/scripts/studio.mjs, apps/web/src/studio/**,
  apps/web/src/audio/{chipBackend,install,manifest,menuSounds,music,offline,sfx,sound,soundMap}.ts (+ tests),
  apps/web/src/audio/songs/**, apps/web/src/audio/audio.test.ts, apps/web/src/test/fakeAudio.ts,
  apps/web/e2e/audio.spec.ts, apps/web/src/game/debugHook.ts (audio parts), apps/web/src/scene/assets.ts (+test),
  apps/web/package.json (scripts, devDeps), .gitignore (studio-out), deletions of public/assets/audio/* and
  src/audio/{howler,synth}.ts; history docs: 2 specs, 2 plans, brain/decisions/0010
New:
  apps/web/src/studio/motifs.ts (+test)        Task 2, replaces pieces/leitmotif.ts
  apps/web/src/studio/lofi.ts (+test)          Task 4
  apps/web/src/studio/pieces/rain.ts           Task 5
  apps/web/src/audio/player.ts (+test)         Task 7
  apps/web/src/audio/orchestraBackend.ts (+test) Task 7
  apps/web/src/audio/assets.test.ts            Task 8
Deleted (Task 8): src/audio/chipBackend.ts, offline.ts, sfx.ts, songs/ (+ tests)
```

---

### Task 1: Port the old audio work

**Files:** everything under "Ported" in the file map.

**Interfaces:**

- Produces: the old working tree's audio state on this branch, compiling against `@ethergrove/core`, with its
  existing tests green. Later tasks change these files.

- [ ] **Step 1: Apply the tracked changes** (modifications and deletions) under `apps/web` and `.gitignore`,
      excluding rendered music:

```bash
git -C "/Users/apple/Documents/Jay Dev/hearthvale" diff -- apps/web .gitignore ':!apps/web/public/assets/music' > .superpowers/sdd/2026-10-30-ethergrove-audio/old-audio.patch
git apply --3way .superpowers/sdd/2026-10-30-ethergrove-audio/old-audio.patch
```

      Resolve conflicts by keeping both sides: the rename's names (`__ethergrove`, `ethergrove:settings`,
      `@ethergrove/core`) and the audio additions (e.g. `renderAudio` in `debugHook.ts`). In `apps/web/package.json`
      keep the audio scripts and devDependencies.
- [ ] **Step 2: Copy the untracked files** listed under "Ported" (code, tests, `studio.html`, `studio.mjs`,
      `e2e/audio.spec.ts`, `test/fakeAudio.ts`) with `rsync -R` from the old checkout, plus the history docs:
      `docs/superpowers/specs/2026-10-26-hearthvale-chiptune-audio-design.md`,
      `docs/superpowers/specs/2026-10-29-hearthvale-orchestral-audio-design.md`,
      `docs/superpowers/plans/2026-10-26-hearthvale-chiptune-audio.md`,
      `docs/superpowers/plans/2026-10-29-hearthvale-orchestral-audio.md`,
      `brain/decisions/0010-original-chiptune-audio.md`. Never copy `public/assets/music/`, `studio-out/` or
      `.superpowers/`.
- [ ] **Step 3: Rename** `@hearthvale/core` → `@ethergrove/core` and `__hearthvale` → `__ethergrove` in every
      ported code file. Run `pnpm install` (only `pnpm-lock.yaml` and audio devDependencies may change).
- [ ] **Step 4: Verify:** `pnpm typecheck`, `pnpm --filter web exec vitest run`, `pnpm lint`. Expected: all pass
      (the old work's tests included). Record counts in the ledger.
- [ ] **Step 5: Verify the old checkout is untouched:** before Step 1, record
      `git -C "/Users/apple/Documents/Jay Dev/hearthvale" status --short | shasum` in the ledger; after Step 4 the
      same command prints the same hash.

### Task 2: Motifs and `findMotif`

**Files:**

- Create: `apps/web/src/studio/motifs.ts`, `apps/web/src/studio/motifs.test.ts`
- Delete: `apps/web/src/studio/pieces/leitmotif.ts` (its one use moves to `motifs.ts`; pieces keep compiling by
  importing `HEARTH` until Task 5 removes it)

**Interfaces:**

- Produces in `motifs.ts`:
  - `interface Motif { name: string; notes: string; steps: readonly number[]; rhythm: readonly number[] }`
  - `ROOTSONG_MAJOR`, `ROOTSONG_MINOR`, `GLOAM`, `GRANDPA` (values from Global Constraints) and `HEARTH`
    (notes `A4:2 C5:2 D5:4 C5:2 A4:2 G4:4 | F4:2 G4:2 A4:2 C5:2 G4:8`, used only to forbid it)
  - `findMotif(piece: Piece, m: Motif): boolean` — true when any non-kit part has the motif's interval steps
    and rhythm as consecutive notes, in any key, at the written lengths **or exactly doubled** (half speed).
    Rests break a match; chords use their top note.
  - `transpose(m: Motif, semitones: number): string` — the motif's notes moved by semitones, for composing.

- [ ] **Step 1: Write the failing tests** in `motifs.test.ts`:
  - each motif's `steps` and `rhythm` match its `notes` (computed);
  - `findMotif` finds `ROOTSONG_MAJOR` transposed to C and to E♭, and at half speed;
  - it rejects one changed interval, one changed length, and a rest inside the motif;
  - it finds `HEARTH` in a piece built from the old `LEITMOTIF` string.
- [ ] **Step 2: Run, expect FAIL** (module missing).
- [ ] **Step 3: Implement** `motifs.ts`; repoint the old `LEITMOTIF` imports to `HEARTH`.
- [ ] **Step 4: Run** `pnpm --filter web exec vitest run src/studio`. Expected: PASS.

### Task 3: New voices

**Files:**

- Modify: `apps/web/src/studio/samples.ts` (`InstrumentId` + `uprightNr1`, `KitId` + `softKick`, `snareTap`,
  `shakerSoft`), `apps/web/src/studio/synths.ts` (`SynthId` + `ePiano`), `apps/web/src/studio/score.ts`
  (`DEFAULT_PAN`: `uprightNr1` 0, `ePiano` 0)
- Test: `apps/web/src/studio/samples.test.ts`, `apps/web/src/studio/voices.test.ts`

**Interfaces:**

- `SAMPLE_MAP.uprightNr1`: folder `Keys/Upright Nr1`, range A1–C7. Read the folder's file names first and write
  their exact pattern into the map (ledger the pattern).
- `KIT_MAP.softKick`: `Percussion/BDrumNewhit_v1_*` and `_v2_*` only; `snareTap`: `Percussion/Snare2-taps*`;
  `shakerSoft`: `Percussion/Tamb1-Shake*`.
- `playSynth(ctx, 'ePiano', note)`: FM sine carrier and modulator at ratio 1, index 2.0 → 0.3 over 0.6 s; tremolo
  4.5 Hz ±1.5 dB; attack 4 ms; release 0.35 s (§3.2). `softKick` hits pass a lowpass at 2000 Hz.

- [ ] **Step 1: Write the failing tests:**
  - every new map entry resolves to at least one file in the real library listing the existing "use only files
    confirmed in the library" test uses;
  - **Review Focus 4:** `pickSample` for an `uprightNr1` note with an empty index throws an error naming the
    instrument (it must not return silence);
  - `ePiano` with the fake context: the modulator gain ramps 2.0 × f → 0.3 × f over 0.6 s, the tremolo LFO is
    4.5 Hz, the attack ramp is 4 ms, the stop time is end + release.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm --filter web exec vitest run src/studio`. Expected: PASS.

### Task 4: Lo-fi chain and rules

**Files:**

- Create: `apps/web/src/studio/lofi.ts`, `apps/web/src/studio/lofi.test.ts`
- Modify: `apps/web/src/studio/score.ts` (`Piece.lofi?: LofiSpec`; `validatePiece` calls `validateLofi` when set),
  `apps/web/src/studio/render.ts` (apply the chain after the compressor when `piece.lofi` is set)

**Interfaces (in `lofi.ts`):**

- `interface LofiSpec { wowHz: number; wowMs: number; drive: number; lowpassHz: number; hissDb: number }`
- `fitWowRate(loopSeconds: number, hz: number): number` → `max(1, round(loopSeconds·hz)) / loopSeconds`
- `saturationCurve(drive: number, n = 2048): Float32Array` → `tanh(drive·x)/tanh(drive)` for x in [−1, 1]
- `hissSamples(rate: number, seconds: number, seed = 23): Float32Array` — mulberry32 noise, pinked with a
  one-pole filter, lowpassed at 7000 Hz, peak-normalized to 1 (gain applied by the chain from `hissDb`)
- `validateLofi(p: Piece): void` — throws naming the piece and rule: `bpm` 60–85; `swing` ≤ 0.15; kit tokens only
  `softKick`, `snareTap`, `shakerSoft`; kit dynamics ≤ `mp`; **no bar with `snareTap` on both beat 2 and beat 4**;
  bass parts only `subBass` or `cellosPizz`; `LofiSpec` values within §3.3 ranges
- `applyLofi(ctx: BaseAudioContext, input: AudioNode, spec: LofiSpec, loopSeconds: number): AudioNode` — wow
  (`DelayNode` 10 ms base, modulated ±`wowMs` at `fitWowRate`) → `WaveShaper(saturationCurve)` → lowpass (Q 0.7)
  → sum with hiss (`AudioBufferSourceNode`, looped, gain `10^(hissDb/20)`)

- [ ] **Step 1: Write the failing tests:**
  - **Review Focus 3:** `fitWowRate(53.3, 0.6) × 53.3` is a whole number; `fitWowRate(0.5, 0.4)` gives one cycle;
  - `saturationCurve(1.6)` is odd (`c[i] = −c[n−1−i]`), monotonic and within [−1, 1];
  - `hissSamples(44100, 1)` equals itself on a second call and differs for seed 24;
  - `validateLofi` accepts a minimal valid piece and rejects each rule broken alone — **the must-fail case:**
    `snareTap` on beats 2 and 4 of one bar;
  - `renderPiece` on a `lofi` piece adds the WaveShaper and the hiss source (fake context).
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm --filter web exec vitest run src/studio`. Expected: PASS.

### Task 5: Compose the Ethergrove soundtrack

**Files:**

- Modify: `apps/web/src/studio/pieces/{title,spring,summer,fall,winter,night,home,jingles,index}.ts`,
  `apps/web/src/studio/pieces/index.test.ts`
- Create: `apps/web/src/studio/pieces/rain.ts`
- Modify: `apps/web/src/audio/music.ts` — `TrackId` adds `'rain'` (the director change itself is Task 8)

**Interfaces:**

- `TRACK_PIECES: Record<TrackId, Piece>` gains `rain`. Track titles (piece metadata or comments): `Ethergrove`,
  `Seedlings Wake`, `Sunwarm Fields`, `Amber Harvest`, `Snow on the Roots`, `Fireflies`, `Grandpa's Kitchen`,
  `Wandering Wares`, `Rain on the Roots`.

- [ ] **Step 1: Write the failing tests** in `pieces/index.test.ts` (replace the Hearth-motif test):
  - `findMotif(p, ROOTSONG_MAJOR) || findMotif(p, ROOTSONG_MINOR)` for `title`, `spring`, `summer`, `fall`,
    `winter`, `night`, `rain` and the 4 `season-*` jingles; `title` has **both** forms; `fall`, `rain` and
    `season-fall` have the minor form;
  - `findMotif(home, GRANDPA)`;
  - `findMotif(p, HEARTH)` is false for **every** track, jingle and SFX piece;
  - `home`, `night`, `rain` have `lofi` set and pass `validateLofi`; their `lofi` values equal §4.2 exactly;
  - key facts per §4.2: `title` 70 bpm, 24 bars; `home` 74 bpm, swing 0.1, 16 bars; `night` 62 bpm, 16 bars;
    `rain` 72 bpm, swing 0.08, 16 bars; `night` has no kit part in bars 1–8;
  - the existing range, sustain-length and brass-dynamics tests still run over all pieces, including `rain`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Compose** per §4.2 and §4.3: write `title`, `home`, `night`, `rain` new; in `spring`, `summer`,
      `fall`, `winter` replace two bars of melody with the Rootsong at the place §4.2 names (use `transpose`);
      re-theme the four `season-*` jingles; remove every `HEARTH` use from pieces. Follow the composition rules
      (orchestral spec §6.1, §3.1, §3.3).
- [ ] **Step 4: Run** `pnpm --filter web exec vitest run src/studio`. Expected: PASS.

### Task 6: Studio script and render

**Files:**

- Modify: `apps/web/scripts/studio.mjs`, `apps/web/src/studio/main.ts` (as orchestral plan Task 7; pass `lofi`
  through; add the `--only <id>` flag)
- Generated: `apps/web/public/assets/music/*.m4a`, `apps/web/public/assets/sfx/*.m4a`, `apps/web/src/audio/manifest.ts`

- [ ] **Step 1: Finish the script** per orchestral plan Task 7 (it exists in part; keep its behaviour).
- [ ] **Step 2: Render.** Start `pnpm --filter web dev:e2e` in the background, then `pnpm --filter web studio`.
      Expected: 38 files (9 tracks + 7 jingles + 22 SFX), each within budget, every peak ≤ 0.9.
- [ ] **Step 3: Measure** every WAV (peak, clipped samples, loudest and quietest 1 s RMS) and write the table to
      the ledger.
- [ ] **Step 4: Stop the dev server.**

### Task 7: Player and backend

**Files:**

- Create: `apps/web/src/audio/player.ts`, `apps/web/src/audio/orchestraBackend.ts` and their tests
- Test helper: `apps/web/src/test/fakeAudio.ts` (extend if needed)

**Interfaces:** as orchestral plan Task 8, with the rain parts removed (§5):

```ts
export function createPlayer(d: PlayerDeps): {
  playTrack(id: TrackId): Promise<void>; // crossfade 1.2 s; quick-cut fading tracks; stale loads ignored; same id = no-op
  playJingle(id: JingleFile): Promise<void>;
  playSfx(id: SoundId, pitchMul: number): void;
  setPaused(p: boolean): void; setVolumes(music: number, sfx: number): void;
  stats(): { activeTracks: number; loaded: number };
};
```

- `trackBus` gain = `duck`; `musicFilter` targets 20000 Hz (normal) and 1200 Hz (paused); `musicOut` =
  `volume × (paused ? 0.6 : 1)`.

- [ ] **Step 1: Write the failing tests** (orchestral plan Task 8 Step 1, minus rain), plus:
  - **Review Focus 2:** `playTrack('rain')` twice while it plays → one active track, no restart; then
    `spring` → `rain` → `spring` within 0.5 s → at most 2 active, then 1 after 1.2 s.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm --filter web exec vitest run src/audio`. Expected: PASS.

### Task 8: Wire the game and the music director

**Files:**

- Modify: `apps/web/src/audio/music.ts` (`CueId = TrackId`, `pickTrack` rule 5 → `'rain'`, remove `cueParts` and
  `JINGLE_TRANSPOSE`, add `JingleFile` and `jingleFile`), `sound.ts`, `install.ts` (use `orchestraBackend()`),
  `apps/web/src/game/debugHook.ts` (`probeAudio`, per orchestral plan Task 9), their tests
- Create: `apps/web/src/audio/assets.test.ts` (orchestral plan Task 9)
- Delete: `src/audio/chipBackend.ts`, `offline.ts`, `sfx.ts`, `songs/` and their tests

- [ ] **Step 1: Write the failing tests** (orchestral plan Task 9 Step 1), plus in `music.test.ts`:
  - rain and storm → `'rain'` in each of the four seasons; snow → the season;
  - **Review Focus 1:** storm at minute 1260 → `'night'`; storm in the house → `'home'`; storm with the cart open
    → `'shop'`;
  - and in `install.test.ts`, **Review Focus 5:** with stored settings `{ musicVolume: 0.3, sfxVolume: 0.5 }`,
    install calls the backend's `setVolumes(0.3, 0.5)`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**, and delete the chiptune runtime files.
- [ ] **Step 4: Run** `pnpm --filter web exec vitest run`, `pnpm typecheck`, `pnpm lint`. Expected: PASS.

### Task 9: E2E

**Files:** Modify `apps/web/e2e/audio.spec.ts`.

- [ ] **Step 1: Update the tests** per orchestral plan Task 10, and change the rain test: rain → cue `'rain'`.
      The `probeAudio` loop over every manifest entry includes `home`, `night` and `rain` (**Review Focus 3**:
      `corr > 0.99`).
- [ ] **Step 2: Run** on Chromium and WebKit with `--retries=0 --repeat-each=2`. Expected: PASS.
- [ ] **Step 3: Must-fail check:** make `wrapLoop` keep `[0, L)`, re-render `rain` with
      `pnpm --filter web studio --only rain`, confirm `corr` fails; restore and re-render.

### Task 10: Docs, checks, review, handoff

- [ ] **Step 1: Docs.**
  - `CREDITS.md`: VSCO 2 CE (CC0 1.0) for music and SFX; remove the Kenney audio rows (those files are deleted).
  - `AGENTS.md`: an Audio section (studio, `pnpm --filter web studio`, `VSCO_DIR`, budgets, motifs, lo-fi rules).
  - `docs/ARCHITECTURE.md`: the audio runtime and the studio.
  - `brain/decisions/0012-ethergrove-audio-direction.md` → accepted; `0010` → superseded by 0012;
    `brain/MEMORY.md` audio line → verified.
  - History notes on the 4 ported docs: the rename note line, plus
    `> Soundtrack superseded by [the Ethergrove audio spec](…2026-10-30-ethergrove-audio-design.md).`
- [ ] **Step 2: Checks:** `graphify update .`; port 5199 free; `pnpm checks` (≥ 600000 ms timeout). Expected: 8/8.
- [ ] **Step 3: Final review:** a fresh reviewer on the most capable model over the branch vs `main`, with this
      plan's Review Focus and the ledger rulings; one test-first fix pass.
- [ ] **Step 4: Handoff:** stop servers; send the 9 tracks and 7 jingles (`.m4a`) and a zip of the 22 SFX to the
      owner with SendUserFile for listening; post the `AGENTS.md` ready-to-push handoff with every file, the sizes
      and levels, and what was not verified (not listened to by the implementer; no real phone).
