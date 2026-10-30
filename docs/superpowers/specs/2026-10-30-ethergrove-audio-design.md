# Ethergrove Chronicles: Audio Bible and Farm Soundtrack Spec

**Status:** draft for review · **Date:** 2026-10-30 · **Author:** Jay Becina (with Claude) · **Branch:**
`docs/ethergrove-audio`, cut from `main` after the rename (PR #8)

**Builds on:** the orchestral audio spec (`2026-10-29-hearthvale-orchestral-audio-design.md`) and, through it, the
chiptune spec (`2026-10-26-hearthvale-chiptune-audio-design.md`). Neither was ever merged; both are ported into
this branch as history (§8). **This spec wins** wherever they disagree. Everything those specs say about the
studio engine, the runtime player, the sound effects, budgets and tests still holds unless §3–§7 change it.

This spec does two jobs:

1. **The audio bible (§2)** sets the sound of the whole game: the main theme, the leitmotifs and a style for every
   area. Later parts (Lowmere, the Deeps, combat, festivals) spec their own tracks against it.
2. **The farm soundtrack (§3–§7)** is built right after this spec: it finishes the orchestral work for what the
   game has today, re-themed for Ethergrove, with lo-fi for the cozy moments.

"MUST" means exactly that. The creative task left open is writing melodies and voicings inside the forms and
charts given here, under the composition rules (§3.1).

---

## 1. Goal

The game was renamed and given a new story (spec `2026-10-29-ethergrove-chronicles-design.md`). Its unfinished
orchestral soundtrack is built around the old "Hearth motif" and covers only the farm. The owner wants:

- music in **orchestral, synth, bass and lo-fi** styles, suited to a farm-life RPG; **never hip-hop**;
- a main theme that feels like **wonder and mystery**: small and secret, then warm and wide;
- **each style in its place**: orchestral for the title, seasons and story; lo-fi for home, night and rain; synth
  and bass for magic and the Gloam;
- the finished studio work and the parts of the old soundtrack that still fit **kept**;
- everything **original**, all samples **CC0**.

### 1.1 Success criteria

1. The audio bible (§2) names a style, palette and tempo range for every area in the Ethergrove roadmap.
2. Every farm situation plays its own track (§4.1), and changes crossfade smoothly.
3. The Rootsong (§2.2) is in the title, every season track and every season jingle. The Hearth motif is gone.
4. Home, night and rain tracks follow the lo-fi rules (§3.3), which tests enforce.
5. All sources are original or CC0 (VSCO 2 CE). Size budgets, seamless loops and the per-frame rules of the
   orchestral spec §1.1 hold. The download stays ≤ 9 MB.
6. The owner listens to every shipped `.m4a` before merging.
7. All checks pass (`pnpm checks`).

### 1.2 Decisions already made (do not revisit)

| Decision | Choice |
|---|---|
| Scope now | Audio bible for the whole game + the farm soundtrack. Music for later areas is made with those features. |
| Main theme | **The Rootsong**: wonder and mystery (§2.2) |
| Style map | Each style has its place (§2.3) |
| Old work | Keep the studio, the 4 season tracks, the shop track, morning / lessonsComplete / faint jingles and the 22 SFX. Rewrite title, home, night; add rain; re-theme the season jingles. |
| How it's built | Port the old uncommitted work onto this branch (§8). The old checkout is not committed, merged or deleted. |
| Engine | Unchanged from the orchestral spec: offline studio render with VSCO samples → AAC `.m4a` → streamed loop player |

## 2. The audio bible (whole game)

### 2.1 Sound of Ethergrove

A cozy valley sitting on a hidden magical world. The music is warm and acoustic on the surface (strings,
woodwinds, harp, upright piano) with a thin layer of **ether shimmer** (glock, `pad`, `choir` at pp) that hints
at the Undergrove. The deeper the player goes, the more synth and bass take over. The Gloam is the same music
bent out of shape.

### 2.2 Leitmotifs

Notation as in the orchestral spec §4: `note:length`, length in 16th notes, `|` between bars.

| Motif | Meaning | Notes (2 bars, 4/4) | Used |
|---|---|---|---|
| **Rootsong** (major) | The player, the valley, home | D major: `B3:2 D4:2 F#4:4 E4:2 D4:2 A4:4 \| G4:2 F#4:2 E4:2 F#4:2 D4:8` | Now: title, seasons, night, season jingles |
| **Rootsong** (minor) | Longing, the missing grandpa | B minor: `B3:2 D4:2 F#4:4 E4:2 D4:2 G4:4 \| F#4:2 E4:2 D4:2 C#4:2 B3:8` | Now: title A, fall, rain, fall jingle |
| **The Gloam** | Danger, the sour ether | `B3:2 D4:2 F4:4 E4:2 D4:2 G4:4 \| F4:2 E4:2 D4:2 C#4:2 B3:8` on synth (`arp`, `subBass`) | Later: Deeps, bosses |
| **Grandpa's theme** | Elias, the farmhouse | G major: `G4:3 A4:1 B4:4 D5:4 B4:4 \| C5:2 B4:2 A4:2 G4:2 E4:4 D4:4` | Now: home |
| **Isel's Lullaby** | The sleeping Rootsinger | Written in the Part 6 story spec; glock or celesta-like glock at pp, 3/4 | Later: story |

A motif may be transposed to any key. Its **rhythm and interval steps** (semitones between notes) MUST stay as
written, so tests can find it in any key:

- Rootsong major steps: `+3 +4 −2 −2 +7 −2 −1 −2 +2 −4`
- Rootsong minor steps: `+3 +4 −2 −2 +5 −1 −2 −2 −1 −2`
- Gloam steps: `+3 +3 −1 −2 +5 −2 −1 −2 −1 −2`
- Grandpa's theme steps: `+2 +2 +3 −3 +1 −1 −2 −2 −3 −2`
- Rhythm (Rootsong and Gloam): `2 2 4 2 2 4 | 2 2 2 2 8`. Grandpa's theme: `3 1 4 4 4 | 2 2 2 2 4 4`.

### 2.3 Style map

| Area | Style | Palette | Tempo | Part |
|---|---|---|---|---|
| Title, story moments | Orchestral + ether shimmer | strings, horns, flute, harp, glock, `pad`, `choir` | 60–80 | now |
| Seasons on the farm | Pastoral orchestral | woodwinds, strings, harp, marimba, light percussion; summer adds `arp` and `subBass` | 88–110 | now |
| Sol's cart (shop) | Playful orchestral | staccato clarinet, bassoon, pizzicato, marimba, tuba | 110–120 | now |
| Home, night, rainy days | **Lo-fi** (§3.3) | upright pianos, `ePiano`, `subBass`, soft kit, `pad`, clarinet or flute | 60–85 | now |
| Magic, the Gloam | Synth and bass | `pad`, `arp`, `subBass`, `choir`, glock; the Gloam motif | 60–90 | later (Part 5) |
| Lowmere town | Folk-orchestral | pizzicato, harp, marimba, clarinet, oboe, tambourine | 96–112 | later (Part 4) |
| The Lantern Guild | Low brass march | trombone, tuba, horn, snare, low strings | 100–112 | later (Part 4) |
| Mossdeep | Synth + wood | log drum, marimba, `pad`, `subBass` | 80–96 | later (Part 5) |
| Cinder Galleries | Synth + metal | anvil, timpani, brake drum, `subBass`, low brass | 90–110 | later (Part 6) |
| Drowned Archive | Synth + water | harp, `choir`, filtered `pad`, low strings | 70–90 | later (Part 6) |
| Frostvault | Synth + ice | glock, high violins, triangle, `pad` | 70–90 | later (Part 6) |
| Heartdeep | Full Gloam | the Gloam motif, `choir`, `subBass`, strings | 70–100 | later (Part 6) |
| Combat | Driving orchestral + synth | string ostinato, `subBass`, timpani, bass drum, horns | 120–140 | later (Part 5) |
| Bosses | Orchestra + synth + choir | full orchestra, `arp`, `subBass`, `choir`; each boss theme is built on the Gloam | 120–150 | later (Parts 5–6) |
| Festivals | One piece each, in the area's style | per festival (story spec §4.8) | any | later (Part 7) |

Short cues for later parts (level-up, victory, discovery) are original 2–4 s jingles in the area's style. They
MUST NOT copy or paraphrase any game's victory or level-up fanfare.

### 2.4 Rules for every track, now and later

- **Original:** never quote or paraphrase existing game, film, classical or pop melodies (orchestral spec §6.1).
- **Never hip-hop:** no boom-bap backbeat, no 808 bass or kicks, no trap hi-hats, no rap or vocal chops, no
  scratches. Lo-fi stays on the soft kit (§3.3).
- **Samples:** VSCO 2 CE only (CC0 1.0), plus the studio's own synths. Never committed to the repo.
- **One motif per track at most as the lead idea**, so themes stay recognizable.

## 3. Studio changes

### 3.1 Composition rules (MUST)

The orchestral spec §6.1 rules hold (originality, voicing, ranges, endings), with two changes:

- The **Rootsong** replaces the Hearth motif. The **Hearth motif MUST NOT appear** in any piece.
- Lo-fi tracks also follow §3.3.

### 3.2 New voices

| Id | Kind | Sound |
|---|---|---|
| `uprightNr1` | sampled | `Keys/Upright Nr1` (a second, darker upright); range A1–C7; the plan gives the file pattern |
| `ePiano` | synth (`synths.ts`) | FM: sine carrier, sine modulator at ratio 1, modulation index 2.0 → 0.3 over 0.6 s; tremolo 4.5 Hz ±1.5 dB; attack 4 ms, release 0.35 s |
| kit `softKick` | sampled | `Percussion/BDrumNewhit` layers v1–v2 only, through a lowpass at 2000 Hz |
| kit `snareTap` | sampled | `Percussion/Snare2-taps` |
| kit `shakerSoft` | sampled | `Percussion/Tamb1-Shake` |

### 3.3 Lo-fi tracks

A piece with `lofi` set is a lo-fi track:

```ts
interface Piece { ...; lofi?: LofiSpec }
interface LofiSpec {
  wowHz: number;     // tape wobble rate, 0.4–0.8
  wowMs: number;     // delay swing depth, 0.5–2.0 ms
  drive: number;     // tanh saturation drive, 1.0–2.0
  lowpassHz: number; // 5000–8000
  hissDb: number;    // −48 to −38 dBFS, seeded noise
}
```

**Chain** (master, after the compressor): modulated delay (wow) → `WaveShaper` `tanh(drive·x)/tanh(drive)` →
lowpass (Q 0.7) → sum with hiss → out.

- **Seamless wow:** the render sets the wobble rate to `round(L·wowHz)/L` (L = loop seconds, at least 1 cycle),
  so a whole number of cycles fits the loop.
- **Hiss:** pink-ish noise from a seeded PRNG (mulberry32, seed 23), through a lowpass at 7000 Hz. The same seed
  gives the same samples.

**Rules (tests enforce them):**

- `bpm` 60–85; `swing` ≤ 0.15.
- Kit parts use only `softKick`, `snareTap`, `shakerSoft`. Kit dynamics never above `mp`.
- **No backbeat:** in no bar does `snareTap` sound on both beat 2 and beat 4.
- Bass is `subBass` or `cellosPizz`; no other synth bass.
- Values within the `LofiSpec` ranges above.

## 4. The farm soundtrack

### 4.1 Situations (music director)

`pickTrack` keeps the chiptune spec §5.1 order with one change: rule 5 now returns the single `rain` track.

1. `screen` is not `'game'`, or there is no game → `title`
2. `overlay === 'cart'` → `shop`
3. `minute >= 1200` (8 pm or later) → `night`
4. `location === 'house'` → `home`
5. `weather` is `'rain'` or `'storm'` → `rain`
6. Otherwise → the season (`spring` · `summer` · `fall` · `winter`)

`CueId` becomes `TrackId` (`'title' | 'spring' | 'summer' | 'fall' | 'winter' | 'night' | 'home' | 'shop' |
'rain'`). `cueParts` and the rain flag are removed. The player's rain filter goes (rain has its own track); the
pause filter (1200 Hz, ×0.6) stays.

### 4.2 Tracks

| Cue | Title | Status | Key, tempo, meter, bars | Form, chords and orchestration |
|---|---|---|---|---|
| `title` | **Ethergrove** | **new** | D major, 70, 4/4, 24 bars (≈82 s) | **A** (1–8) Bm G D A · Bm G Em F♯sus4·F♯: glock and harp arpeggios at pp, `pad` shimmer, the flute plays the **Rootsong minor** (in B minor) at p. **B** (9–16) D A Bm G · D/F♯ G Em7 A: horns play the **Rootsong major** (in D) at mf, a cello countermelody, violins tremolo, a timpani roll into bar 17. **C** (17–24) G A F♯m Bm · G D/F♯ Em7 Asus4·A: tutti at f, violins the Rootsong in octaves, `choir` at mp, a cymbal swell into bar 17, then down to p over bars 23–24; the last A leads back to bar 1 |
| `spring` | **Seedlings Wake** | kept | as the orchestral spec | Add the **Rootsong major** in C on the flute, replacing 2 bars of melody in A′ |
| `summer` | **Sunwarm Fields** | kept | as the orchestral spec | Add the **Rootsong major** in D on the horn, replacing 2 bars of melody in B |
| `fall` | **Amber Harvest** | kept | as the orchestral spec | Add the **Rootsong minor** in A minor on the oboe, replacing 2 bars of melody in A′ |
| `winter` | **Hearth & Snow** → **Snow on the Roots** | kept, renamed | as the orchestral spec | Add the **Rootsong major** in E♭ on the piano, replacing 2 bars of melody in B |
| `shop` | **Wandering Wares** | kept | as the orchestral spec | unchanged |
| `home` | **Grandpa's Kitchen** | **rewritten, lo-fi** | G major, 74, 4/4, swing 0.1, 16 bars (≈52 s) | **A** (1–8) Gmaj7 Em7 Cmaj7 D7 · Gmaj7 Em7 Am7 D7: `piano` soft block chords on beat 1, `ePiano` comping on the off-beats, the clarinet plays **Grandpa's theme** (bars 1–2 and 5–6) at p, `subBass` roots; kit: `softKick` on beat 1, `shakerSoft` in 8ths at pp, `snareTap` on the "and" of 2. **B** (9–16) Cmaj7 Bm7 Am7 D7sus4·D7 · Gmaj7 Em7 Am7·D7 Gmaj7: `ePiano` takes the melody, the clarinet answers with Grandpa's theme in bars 13–14, `pad` at pp. `lofi`: wowHz 0.5, wowMs 1.2, drive 1.4, lowpassHz 6500, hissDb −44 |
| `night` | **Fireflies** | **rewritten, lo-fi** | F major, 62, 4/4, 16 bars (≈62 s) | **A** (1–8) Fmaj7 Am7 B♭maj7 C9 · Fmaj7 Dm9 Gm7 Csus4·C: `ePiano` broken chords, `uprightNr1` plays the **Rootsong major** in F at half speed (each length ×2, over 4 bars, twice), `pad` and `choir` at pp, `subBass`; no drums. **B** (9–16) B♭maj7 Am7 Gm7 Fmaj7 · B♭maj7 Am7 Gm7·C Fmaj7: harp sparkles, `shakerSoft` at pp only, a glock on the last note. `lofi`: wowHz 0.4, wowMs 1.5, drive 1.2, lowpassHz 6000, hissDb −46 |
| `rain` | **Rain on the Roots** | **new, lo-fi** | D minor (dorian colour), 72, 4/4, swing 0.08, 16 bars (≈53 s) | **A** (1–8) Dm9 B♭maj7 Fmaj7 C · Dm9 Gm7 B♭maj7 A7sus4·A7: `ePiano` chords, `uprightNr1` melody, `subBass`; kit: `softKick` on beats 1 and the "and" of 3, `snareTap` ghost notes on off-beats (never on both 2 and 4), `shakerSoft` 16ths at pp. **B** (9–16) Gm7 Am7 B♭maj7 C · Dm9 Gm7 A7sus4 Dm9: the **Rootsong minor** in D minor on `uprightNr1` (bars 9–10), the flute answers, `pad` at p. `lofi`: wowHz 0.6, wowMs 1.0, drive 1.6, lowpassHz 7000, hissDb −42 |

### 4.3 Jingles

| Id | Status | Content |
|---|---|---|
| `morning` | kept | as the orchestral spec |
| `season-spring`, `season-summer`, `season-fall`, `season-winter` | **re-themed** | The **Rootsong**'s 2 bars on horns at mf, with strings, a timpani roll into the last chord and a cymbal swell. Spring in C, summer in D, winter in E♭ (adds sleigh bells), all major; fall in A minor with the **Rootsong minor** |
| `lessonsComplete` | kept | as the orchestral spec |
| `faint` | kept | as the orchestral spec |

### 4.4 Sound effects

The 22 SFX of the orchestral spec §7 are kept unchanged.

## 5. Runtime changes

Only what §4.1 changes: `CueId = TrackId`, `pickTrack` rule 5, `cueParts` and the rain flag removed, the
player's rain filter removed. Everything else follows the orchestral spec §5 (loop player, crossfade 1.2 s,
at most 2 decoded tracks, jingle duck, failures stay silent).

## 6. Budgets

As the orchestral spec §1.1: AAC-LC 64 kbps; total ≤ 9 MB; each track ≤ 1 MB; each jingle ≤ 120 KB; each SFX
≤ 40 KB. Nine tracks now.

## 7. Testing

The orchestral spec §9 holds. Add or change:

- **Motifs:** a `findMotif(piece, steps, rhythm)` helper finds a motif in any part and any key.
  - The Rootsong (major or minor form) is in `title`, `spring`, `summer`, `fall`, `winter`, `night`, `rain` and the
    4 season jingles.
  - Grandpa's theme is in `home`.
  - The Hearth motif's steps (`+3 +2 −2 −3 −2 −2 +2 +2 +3 −5`) are in **no** piece.
- **Lo-fi rules (§3.3):** for `home`, `night`, `rain`: tempo, swing, kit names, kit dynamics, no backbeat, bass
  voices, `LofiSpec` ranges. A must-fail check: add `snareTap` on beats 2 and 4 of one bar and confirm the test
  fails.
- **Lo-fi chain:** the wow rate fits a whole number of cycles in the loop; the hiss is deterministic for its seed;
  the saturation curve is odd and bounded by 1.
- **New voices:** `ePiano` envelope and tremolo; `uprightNr1`, `softKick`, `snareTap`, `shakerSoft` resolve to
  existing files.
- **Music director:** rain or storm → `rain` in every season; snow → the season; the other rules unchanged.
- **Assets:** nine tracks in the manifest; budgets hold; seamless loops in Chromium and WebKit (e2e).
  **Deviation from the orchestral spec §9.2 (recorded 2026-10-30):** the e2e seam bar is a correlation above
  **0.95**, not 0.99. Rendered loops match exactly (1.0); AAC encoding brings correct loops to 0.98–0.99 after
  decoding, while a broken loop wrap measures about 0.59, so 0.99 measured codec noise rather than seams.
- **Listening:** the owner listens to every `.m4a` before merging; the implementer reports levels and never
  claims the sound "is good".

## 8. Porting the old work

The orchestral work exists only as **uncommitted files** in the main checkout on `feat/bgm-sound-effects`
(tasks 1–6 of its plan done, 7 tracks rendered). This branch takes it over:

- **Ported:** the studio (`apps/web/studio.html`, `apps/web/src/studio/**`, `apps/web/scripts/studio.mjs`), the
  audio runtime files the orchestral plan keeps or adds, `apps/web/e2e/audio.spec.ts`, the `package.json` script
  entries, the `.gitignore` line for `apps/web/studio-out/`, and the two older audio specs, the orchestral plan
  and decision 0010 as history. The implementation plan lists every file.
- **On port:** every `@hearthvale/core` import becomes `@ethergrove/core`, and any "Hearthvale" text in ported
  code becomes Ethergrove. The two older specs and the plan get the history note used by the rename (`Written when
  the game was named Hearthvale…`) and a line saying this spec supersedes their soundtrack.
- **Not ported:** the 7 rendered `.m4a` files (everything is re-rendered), the old chip-only files the orchestral
  spec deletes, and anything under `.superpowers/`.
- **The old checkout** is never committed, merged, stashed or deleted by the implementer. After this lands, the
  owner decides whether to discard it.

## 9. Out of scope

- Music for Lowmere, the Deeps, combat, bosses, festivals and story scenes (made with those parts, against §2).
- Adaptive stems, ambient beds, new settings (as before).
- Any change to `packages/core` or saves.

## 10. Acceptance criteria

1. §1.1 holds. All tests and `pnpm checks` pass.
2. Nine tracks, seven jingles and 22 SFX are rendered, in budget and seamless.
3. No piece contains the Hearth motif; the Rootsong and Grandpa's theme are where §7 says.
4. Lo-fi tracks pass the lo-fi rules, including the must-fail check.
5. The owner has listened to every file.
