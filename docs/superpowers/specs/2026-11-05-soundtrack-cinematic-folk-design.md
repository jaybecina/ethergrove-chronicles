# Soundtrack revision: cinematic folk (medieval, gypsy, bard) — design

Date: 2026-11-05 · Tier: T2 · Status: pilot built and rendered (2026-11-05); the rollout waits for the owner's listening
pass on the pilot (AC-27)

## Purpose

The owner heard the folk restyle (`2026-11-05-outward-style-soundtrack-design.md`) and found it "kinda far from
Outward": the reference is "a mix of medieval, gypsy, bard, a little cinematic", fantasy-adventure music. This
revision keeps that spec's place sets, leitmotifs, Godot playback and budgets, and changes **how the music is
voiced and played**: weight in the low register, fuller harmony, calmer motion, gypsy modes in fights and towns,
strummed rather than plinked strings, string swells for the cinematic moments, and human timing. Only ideas and
measured traits are borrowed; no Outward melody, progression, rhythm or arrangement is quoted (REQ-07 of the first
spec still applies).

## Evidence: measured comparison (2026-11-05)

Both sets were measured with the same Web Audio analyser (FFT 8192, hop 1024, 25 s per track from mid-track).
Outward: the *Outward Official Soundtrack (FULL)* video by Jean-François Racine (13 of 25 tracks: Main Theme,
Cierzo, Chersonese, Fight in Chersonese, Cierzo at night, Men's Dungeon, Enmerkar Forest, Fight in Enmerkar,
Monsoon, Hallowed Marsh, Abrassar, Fight in Abrassar, Conclusion). Ours: the current renders of `title`, `spring`,
`night`, `shop` (web) and `woods`, `woodsFight`, `lowmere`, `mossdeep`, `matron` (Godot).

| Trait | Outward | Ours | Gap |
|---|---|---|---|
| Energy below 150 Hz (median) | 10–52 %; exploration 23–29 %, fights 44–47 %, Main Theme 52 % | exploration 2–5 % | **Ours has almost no low end**: thin and small |
| Largest single pitch class in the chroma | 15–23 % (Cierzo 49 %) | title 60 %, spring 67 % | One exposed lead note dominates; the harmony underneath is thin |
| Note onsets per second | 1.0–2.1 (night 0.7) | 1.6–3.2 | Ours is busier: constant 8th-note picking and tambourine |
| High-frequency share of onsets | 13–33 % | Lowmere 73 %, shop 55 % | Our towns are jingly percussion, not music |
| Fight loudness spread (p10→p90) | 7–8 dB, p10 ≈ −21 dB | 18–19 dB, p10 ≈ −35 dB | Our fights are drum hits with gaps; Outward's are a dense, sustained wall |
| Mode | minor in wilds, dungeons, fights and the theme; major in towns; a semitone colour (flat 2nd, raised 4th) in fights and the desert (Abrassar: E with strong F and G♯, Phrygian dominant) | modal major/Dorian, Phrygian fights | No gypsy (augmented-second) colour anywhere |
| Tempo (pulse estimate) | towns 86–100, wilds 90–100, fights 100–130, theme 58/116 | similar | No change needed |

Not measurable, from the owner's words: medieval (drones, modal tunes, recorder, frame and tenor drums), gypsy
(fiddle and clarinet leads, augmented seconds, boom-chuck accompaniment, rubato feel), bard (strummed plucked
strings, ballad tunes), cinematic (string swells, timpani and bass-drum builds, a few big moments).

## Requirements

### A. Engine (studio)

- **REQ-20 Humanise.** `Piece.humanize?: { ms: number; gain: number }` moves every note and hit by a deterministic
  offset in `[−ms, +ms]` and scales its gain by a factor in `[1 − gain, 1 + gain]`, both from a hash of
  `(part, noteIndex)`, so a render is repeatable and the two loop passes match. Notes at step 0 are never moved
  earlier than 0. Default for tracks: `{ ms: 14, gain: 0.1 }`; jingles `{ ms: 8, gain: 0.06 }`; `{ ms: 0, gain: 0 }`
  turns it off. (Built opt-in: the compiler applies none unless the piece sets it; REQ-29 makes every piece set it.)
- **REQ-21 Strum.** `PartSpec.strum?: number` (ms) plays each block chord as a strum: note *i* of an *n*-note chord
  starts *i* × `strum` ms late, downward (low to high) on chords that start on an even 8th and upward on odd ones.
  Strummed chord notes play at full gain (no `BLOCK_GAIN` cut).
- **REQ-22 Swell.** `PartSpec.attack?: number` (seconds) gives every note of the part a linear fade-in of that
  length (bowed swells). Default stays 5 ms.
- **REQ-23 New articulations** (VSCO 2 CE, CC0; pitch measured 2026-11-05: each sounds an octave above its file
  name): `cellosSpic` (`Strings/Cello Section/spic`, `spic_<note>_v<layer>_RR<rr>`), `bassesPizz`
  (`Strings/Solo Contrabass/Pizz`, `BKCtbss_Pizz_<note>_v<layer>_rr<rr>`), `fiddleSpic` (`Strings/Solo Violin/spic`,
  `LLVln_spic_<note>_v<layer>_rr<rr>`). All three play to their natural end like the other plucked or short notes.
  New kit sounds: `tenorDrum` (`VSCO 1 Percussion/drums/tenor/tenor_higher/tenorH_mf_{1,2,3}.wav`) and `bassDrumBig`
  (`VSCO 1 Percussion/drums/bass/bdrum_f_{1,2}.wav`).

### B. Style rules (replace REQ-02 and the palette column of §A in the first spec)

- **REQ-24 Low register.** Every track except night variants has a note at or below C3 (MIDI 48), from a pitched
  part, at a compiled gain of at least 0.15, in at least 60 % of its bars; fights and the boss in every bar. (The old
  tracks had low cello drones in every bar, but at pp, about 0.09: that is what measured as 2–5 % low end.)
- **REQ-25 Beds.** Parts named `drone…` or `strings…` are beds and do not count as melodic voices. A `strings…` part
  must have `attack` ≥ 0.4 s and must rest in at least 25 % of the track's bars, so strings swell in and out and never
  become a held pad (the "church" cause stays retired). At most 4 melodic voices sound at once (3 in night
  variants), as before.
- **REQ-26 Jingle percussion.** `tamb` and `shaker` together play at most 4 hits per bar.
- **REQ-27 Gypsy colour.** Every fight, the boss and Lowmere's day track contain an augmented second (two notes 3
  semitones apart with nothing between them and a semitone on each side) within some 4 bars of one melodic part: Phrygian dominant or Hungarian minor.
  The Gloam keeps its exact intervals; its colour comes from the parts around it.
- **REQ-28 Fights are a wall.** In fights and the boss, a sustained or repeated pitched layer (spiccato, tremolo or
  held notes) sounds in every 8th of every bar.
- **REQ-29 Humanised.** Every track and jingle renders with humanise on (REQ-20 defaults or larger).
- Unchanged from the first spec: REQ-01 (retired timbres; horns and trumpets only in season jingles), REQ-03
  (leitmotifs and placements), REQ-04 (night variants), REQ-05 (lengths), REQ-06 (4-bar rests), REQ-07 (originality),
  budgets NFR-01.

### C. Pieces

| Track | Character | Key, tempo | Core palette |
|---|---|---|---|
| `title` (pilot) | Bard opens, cinematic swell, bard closes | B minor → D major, 72 | strummed `strumstick`, `fiddle`, `recorder`, `stringsSwell` (violins, violas, cellos), `basses` drone, `timpRoll`, `bassDrumBig`, `cymbalSwell` |
| `woods` (pilot) | Medieval wilds: drone and tune | D Dorian, 78 | `droneCellos` + `basses` fifth, `psaltery`, `recorder`, `fiddle`, strummed `strumstick` on beats, `frameDrum`, `tenorDrum`, one string swell |
| `woodsFight` (pilot) | Gypsy-cinematic fight | D Phrygian dominant, 126 | `cellosSpic` ostinato, `bassesPizz`, `violinsTrem` wall, `fiddle` + `fiddleSpic` riff, `frameDrum`, `tenorDrum`, `bassDrumBig`, `darbuka`, `timpRoll` |
| `lowmere` (pilot) | Bard and gypsy town: tavern lilt | D Mixolydian with a Phrygian-dominant turn, 100 | boom-chuck: `bassesPizz` + `cellosPizz` on 1 and 3, strummed `strumstick` on 2 and 4; `fiddle` Rootsong, `clarinet` answers; `darbuka`, sparse `tamb` |
| everything else | Rollout after the pilot is approved, same rules | as the first spec | as the rules above |

- **REQ-30 Pilot first.** `title`, `woods`, `woodsFight` and `lowmere` are rewritten and rendered first, together
  with the three restyled sounds of REQ-31; the other tracks and jingles follow only after the owner has listened.
- **REQ-31 Bardic UI sounds.** `menuConfirm` is a 3-string downward strum (E3, B3, E4 on `strumstick`, 25 ms
  apart) over a soft `frameDrum` tap; `menuBack` is the same strum upward (E4, B3, E3) at −3 dB; `coin` drops the
  `marimba` and becomes two `strumstick` notes (B4 then E5, 40 ms apart) with a single `tamb` hit at −12 dB.
  Every other effect is unchanged.

## Acceptance criteria

- **AC-20** (REQ-20) Score tests: the same piece compiles to identical offsets twice; offsets stay within ±`ms` and
  gains within the factor; a note at step 0 has offset ≥ 0; `{ ms: 0, gain: 0 }` gives offsets 0 and unchanged gain.
- **AC-21** (REQ-21) A strummed 3-note chord at step 0 gives offsets 0, `strum`, 2 × `strum` ms low to high; one at
  step 2 (an odd 8th) gives them high to low; each at full part gain.
- **AC-22** (REQ-22) A sampler test: a note with `attack` 0.5 reaches its gain at start + 0.5 s.
- **AC-23** (REQ-23) The sample index finds the three new articulations at their measured pitch (`spic_A2` →
  MIDI 57) and the two kit sounds.
- **AC-24** (REQ-24–29) `pieces/folk.test.ts` checks each rule on the pieces it covers; the pilot pieces pass, and
  the rules apply to every piece once the rollout is done (a `REVISED` list until then, like the first spec's
  `MIGRATED`).
- **AC-25** (REQ-31) SFX tests: the three sounds match their recipes; the other 19 are unchanged.
- **AC-26** The four pilot tracks and three sounds render (web `.m4a` and Godot `.ogg` where each game ships them),
  the seam test passes, budgets pass, and a re-measure with the analyser shows a low-end share of at least 15 % for
  the title and wild regions and at least 8 % for towns (Outward: wilds 23–29 %, towns 10 %), and fight p10 within
  10 dB of p90.
- **AC-27** The owner listens to the pilot and says go or redirect (tests cannot hear).

## Non-goals

- Rewriting the other 13 tracks and 7 jingles before AC-27.
- New CC0 instruments that need a download (a hurdy-gurdy, lute, accordion or guitar with a verified licence would
  help, but none is local); no new dependency.
- Godot playback changes; saves; `GameState`.

## Architecture (T2, one line)

`score.ts` gains `humanize`, `strum` and `attack` (pure, in `compilePiece`'s `NoteEvent.offset` and
`NoteEvent.attack`); `render.ts` and `sampler.ts` apply them; `samples.ts` gains three articulations and two kit
sounds; pieces and `folk.test.ts` follow the rules above.

## Risks

- **Taste:** still subjective; the pilot exists to catch a second miss early.
- **Sample range:** spiccato and pizzicato cover fewer notes than sustains; the range test (`keeps the new
  instruments inside the notes that were recorded`) gains them.
- **Budgets:** denser tracks encode larger; the Godot total is already 19 of 20 MB, so pilot sizes are checked
  before the rollout.

## Tasks

- [x] **T1** Tests for AC-20–23, seen failing — `score.test.ts`, `voices.test.ts`, `samples.test.ts`
- [x] **T2** Engine: humanise, strum, swell, new samples — `score.ts`, `render.ts`, `sampler.ts`, `samples.ts`
- [x] **T3** Rule tests (AC-24) on a `REVISED` list, seen failing on the old pilot pieces — `pieces/folk.test.ts`
- [x] **T4** Pilot pieces: `title`, `woods`, `woodsFight`, `lowmere`; SFX (AC-25)
- [x] **T5** Render the pilot; re-measure (AC-26); checks
- [ ] **T6** Owner listening pass (AC-27); then rollout of the rest under the same rules

## Results (re-measured 2026-11-05, same analyser, 25 s from 20 s in)

| Track | Low end < 150 Hz | Largest pitch class | Onsets/s | p10 / p50 / p90 dB |
|---|---|---|---|---|
| `title` | 2.4 % → **19.0 %** | 60 % → 47 % | 1.61 → 1.21 | −37 / −29 / −25 |
| `woods` | 4.9 % → **15.3 %** | 22 % | 2.10 → 1.05 | −28 / −25 / −22 |
| `woodsFight` | 43 % → 28 % (wall now sustained) | 23 % | 2.46 → 1.85 | −35/−28/−16 → **−24 / −19 / −17** (spread 18 → 7 dB) |
| `lowmere` | 2.0 % → **11.7 %** (a town) | 31 % | 3.18 → 1.41 | −25 / −23 / −19 |

High-frequency share of onsets in Lowmere fell from 73 % to 36 %. Size: Godot `title` 1.22 MB, `woods` 1.31 MB,
`woodsFight` 0.73 MB, `lowmere` 1.40 MB (each ≤ 1.6 MB); web `title.m4a` 766 KB (≤ 1 MB).

## Deviations

- **Humanise is opt-in** in `compilePiece` (REQ-20 said "default for tracks"): a compiler default would have
  changed every existing exact-gain test; REQ-29's rule test makes every revised piece set `HUMANIZE_TRACK` instead.
- **REQ-24 gained a level** (gain ≥ 0.15): the first version passed the old tracks, whose low cello drones were in the
  score but at pp, which is exactly what measured as 2–5 % low end.
- **REQ-27 looks at 4-bar windows**: a part that plays the Rootsong and later a Phrygian-dominant line holds both E
  and E-flat over the whole track, which hides the augmented second.
- **AC-26's low-end bar** was 15 % for every exploration track; Outward's own towns measure about 10 %, so towns now
  need 8 % (Lowmere: 11.7 %, after a frame drum on the boom and a soft cello bed).
- **Lowmere's boom** is contrabass pizzicato and a frame drum, not `cellosPizz` too: a fifth melodic voice would
  break the 4-voice rule.
- **`woodsFight` moved** from `combat.ts`'s shared `fight()` builder into `pieces/woodsFight.ts`; Mossdeep's fight
  and the boss keep the builder until the rollout.
- The title's spec-table row (`pieces/index.test.ts`) is now 28 bars, 93.3 s (was 24 bars, 80 s).
