# Outward-style soundtrack: folk fantasy restyle and area sets — design

Date: 2026-11-05 · Tier: T2 · Status: approved (owner, 2026-11-05)

## Purpose

The owner finds the current music "like a church": held synth `pad` and `choir`, glockenspiel bells, lush full
string sections and horn chords. The owner wants grounded, intimate fantasy-RPG music in the spirit of _Outward_
(score by Jean-François Racine): small acoustic ensembles, folk modes, silence and space, a distinct sound per
region, and day / night / fight variants per place. This spec restyles every existing track and jingle, retires
the chime-like sound effects, adds area sets for the Godot zones, and gives the Godot game its first music and
sound playback. Only **ideas and structure** are borrowed: no melody, chord progression, rhythm or arrangement of
any Outward track is quoted or paraphrased.

## Sources of truth

- [[decisions/0012-ethergrove-audio-direction]] and `2026-10-30-ethergrove-audio-design.md` §2.2 (leitmotifs:
  kept), §2.3 (style map: replaced by §A below), §3.3 (lo-fi: retired), §6 (budgets), §7 (testing).
- [[decisions/0004-original-ip-cc0-only]]: samples are CC0 only.
- [[decisions/0019-godot-main-no-phones]], [[decisions/0021-godot-world-structure]]: Godot zones `farm`, `house`,
  `lowmere`, `clinic`, `woods`, `mossdeep`; `Zones.is_combat`; `CombatLayer` owns enemies and the boss.
- Owner answers, 2026-11-05: target **both** games; plucked folk sound from a **CC0 pack**; scope **restyle +
  area sets**; **keep the Rootsong melody**, retire lo-fi, `choir` and `pad`.

### Reference study (ideas only)

The _Outward Official Soundtrack_ playlist (26 videos) is laid out as: Main Theme and Conclusion; four towns
(Cierzo, Berg, Monsoon, Levant); four wild regions (Chersonese, Enmerkar Forest, Hallowed Marsh, Abrassar), the
longest tracks at 3–6 min; one short fight cue per region (1:23–2:21); a night version of every town and region;
and one dungeon track per dungeon kind (Men's, Wild, Ruined). Ideas taken:

1. **Place sets:** each place has its own day theme, a night variant built from the same material (slower,
   fewer players, more space), and a fight cue in the region's own colour instead of one shared battle theme.
2. **Small ensemble:** solo instruments (fiddle, flute or recorder, plucked strings, cello, hand drums) rather
   than full sections, choir or organ.
3. **Folk modes:** Dorian, Aeolian and Mixolydian over plain major; drones under melodies.
4. **Silence:** phrases breathe; long exploration loops so repetition is not noticed.
5. **Dungeons are texture:** drones, sparse hits, little melody.
6. **Fights are rhythm:** hand-drum and low-string ostinatos, not heroic brass.

## Requirements

### A. New style map (replaces audio spec §2.3 for every row marked "now")

| Area | Style | Palette (instrument ids) | Mode | Tempo |
|---|---|---|---|---|
| Title | Folk fantasy, solo then small ensemble | `fiddle`, `recorder`, `strumstick`, `folkHarp`, `cellos` (pp), `frameDrum` | D Dorian / B Aeolian | 66–76 |
| Farm seasons (day) | Pastoral folk | `strumstick`, `folkHarp`, `flute` or `recorder`, `fiddle`, `cellosPizz`, light `frameDrum` | Mixolydian or Dorian | 84–104 |
| Home (house) | Hearthside folk | `strumstick`, `folkHarp`, `clarinet`, `cellos` (pp) | Major (Grandpa's theme) | 66–76 |
| Night (farm) | Sparse night variant of the seasons | `folkHarp`, `recorder`, `psaltery` (pp), contrabass drone | Aeolian | 56–66 |
| Rain | Grey folk | `strumstick`, `fiddle` (pp), `cellos` drone, `oceanDrum` | Aeolian | 60–70 |
| Shop (Sol's cart) | Light tavern dance | `strumstick`, `fiddle`, `darbuka`, `violinsPizz`, `bassoon` | Mixolydian | 104–116 |
| Lowmere (town, day) | Warm town folk | `strumstick`, `fiddle`, `recorder`, `tamb`, `cellosPizz` | Mixolydian | 92–104 |
| Lowmere (night) | Town night variant | `folkHarp`, `recorder`, `psaltery` (pp) | Mixolydian → Aeolian | 60–70 |
| Woods (day) | Wild exploration | `recorder`, `folkHarp`, `cellos` drone, `logDrum`, `fiddle` | Dorian | 72–84 |
| Woods (night) | Wild night variant | `psaltery`, `folkHarp`, contrabass drone, `frameDrum` (pp) | Dorian | 56–66 |
| Woods fight | Driving folk | `frameDrum`, `darbuka`, `cellos` ostinato, `fiddle` | Phrygian or Aeolian | 120–132 |
| Mossdeep (dungeon) | Texture, little melody | `cellos` and contrabass drones, `logDrum`, `slitDrum`, `psaltery` swells | Phrygian | free / 60 |
| Mossdeep fight | Low, close fight | `frameDrum`, `logDrum`, `cellos` ostinato, `basses` | Phrygian | 116–128 |
| Bramble Matron (boss) | The Gloam motif on folk instruments | `frameDrum`, `darbuka`, `timpHit`, `cellos`, `fiddle`, `psaltery` | B Phrygian | 126–138 |

- **REQ-01 Retired timbres.** No track or jingle uses the synths `pad`, `choir`, `ePiano` or `arp`, the VSCO `glock`,
  the `softKick` / `snareTap` / `shakerSoft` lo-fi kit, or the VSCO `Organ`. `subBass` remains allowed only under the
  Bramble Matron at pp. Horns and trumpets may appear only in season jingles, never as held chords under a melody.
- **REQ-02 Ensemble size.** At any moment a music track has at most **4 melodic voices** sounding (drones and
  percussion not counted), so it stays a small ensemble.
- **REQ-03 Leitmotifs kept.** The Rootsong (major and minor), Grandpa's theme and the Gloam keep the exact interval
  steps and rhythms of audio spec §2.2. Placement: Rootsong in title, the four seasons, night, rain, Lowmere and
  the season jingles; Grandpa's theme in home; the Gloam in Mossdeep and the Bramble Matron. The Hearth motif stays
  forbidden.
- **REQ-04 Place sets.** Each night variant uses the same key and the same lead motif as its day track, at
  0.65–0.8 of its tempo, with at most 3 melodic voices.
- **REQ-05 Track lengths (loop length).** Seasons, Lowmere and Woods day: 96–150 s. Title, home, night, rain,
  shop, night variants, Mossdeep: 60–120 s. Fights and boss: 40–75 s. Each loop is seamless (audio spec §7 seam
  test, bar 0.95).
- **REQ-06 Rests.** Every exploration track (seasons, Lowmere, Woods, Mossdeep and their night variants) has at
  least one stretch of **≥ 4 bars** in which no melodic voice plays, leaving only drones, percussion or silence.
- **REQ-07 Originality.** No track quotes or paraphrases Outward or any other existing music (audio spec §2.4).
  The track titles stay Ethergrove's own ids.

### B. Samples

- **REQ-08 VCSL.** The studio adds the Versilian Community Sample Library (VCSL, `github.com/sgossner/VCSL`,
  licence CC0-1.0, checked on GitHub 2026-11-05) beside VSCO 2 CE, read from `VCSL_DIR` (default
  `../VCSL` from the repo root). New instrument ids: `strumstick` (Chordophones/Composite Chordophones/Strumstick,
  finger-picked), `folkHarp` (…/Folk Harp), `psaltery` (Chordophones/Zithers/Psaltery, Bowed and Plucked, bowed),
  `recorder` (Aerophones/Edge-blown Aerophones/Baroque Alto Recorder). New kit ids: `frameDrum`, `darbuka`,
  `slitDrum`, `oceanDrum`. `fiddle` is VSCO `Solo Violin`. Samples are never committed. `CREDITS.md` names VCSL
  and its licence.
- **REQ-09 No guitar.** No CC0 nylon or steel guitar multisample was found whose licence could be verified; the
  strumstick (a fretted, plucked folk instrument) and the folk harp fill that role. A guitar may be added later
  only after its licence is verified.

### C. Tracks and jingles

- **REQ-10 Restyled shared tracks** (both games): `title`, `spring`, `summer`, `fall`, `winter`, `night`, `home`,
  `shop`, `rain`, rewritten to §A.
- **REQ-11 New Godot tracks:** `lowmere`, `lowmereNight`, `woods`, `woodsNight`, `woodsFight`, `mossdeep`,
  `mossdeepFight`, `matron`, written to §A. The web game does not ship them.
- **REQ-12 Jingles restyled** (both games): `morning`, `lessonsComplete`, `faint`, `season-spring`,
  `season-summer`, `season-fall`, `season-winter`; 2–6 s each, in §A's palette; no bells.
- **REQ-13 Sound effects.** The eight chime-like effects lose their bell timbres: `water`, `harvest`, `eat`, `coin`,
  `chime`, `menuMove`, `menuConfirm`, `menuBack` use `strumstick`, `folkHarp` (muted, short), `woodblock`-like
  `claves` or `logDrum`, with no `glock` and no ringing harp arpeggio over 300 ms. The other 14 effects are
  unchanged. Ids and the `soundMap` stay the same.

### D. Godot playback (new)

- **REQ-14 Music director (Godot).** A pure function `MusicDirector.pick(screen, zone, minute, weather, season,
  engagement) -> String` picks the cue; the first matching rule wins:
  1. `screen != "game"` (`GameSession.screen`) → `title`
  2. `engagement == "boss"` → `matron`
  3. `engagement == "fight"` and `zone == "woods"` → `woodsFight`; and `zone == "mossdeep"` → `mossdeepFight`
  4. `zone == "mossdeep"` → `mossdeep`
  5. `zone == "house"` → `home`
  6. `minute >= 1200`: `lowmere` or `clinic` → `lowmereNight`; `woods` → `woodsNight`; else → `night`
  7. `zone == "lowmere"` or `"clinic"` → `lowmere`
  8. `zone == "woods"` → `woods`
  9. `weather` is `rain` or `storm` → `rain`
  10. else → the season (`spring`, `summer`, `fall`, `winter`)
- **REQ-15 Engagement.** `CombatLayer.engagement() -> String` returns `"boss"` while the Bramble Matron is present
  and alive; `"fight"` while any non-passive enemy in the zone is in state `chase`, `telegraph`, `recover` or
  `staggered`; otherwise `"none"`. It allocates nothing.
- **REQ-16 Music player.** `MusicPlayer` (node under `WorldRoot`'s parent, alive across title and world) plays the
  cue as a looping Ogg Vorbis stream, crossfades over **2.0 s** on a cue change (**0.8 s** into a fight or boss),
  and holds a fight or boss cue for **4.0 s** after engagement ends before falling back. It re-picks on
  `GameSession.state_changed` and on a 0.5 s timer for engagement; it never re-picks per frame.
- **REQ-17 Jingles and sounds (Godot).** Jingles duck the music by 9 dB for their length, with the same event
  priority as the web (`passedOut` → `faint`, `seasonChanged` → season, `dayStarted` → `morning`,
  `lessonsComplete`). Godot plays the 22 effects on the events that exist in Godot today (tool use, steps, doors,
  coins, menus); effects with no Godot event yet are listed in the Deviations section when built.
- **REQ-18 Volume.** `Settings` gains `music_volume` (default 0.6) and `sfx_volume` (default 0.8), saved in
  `user://settings.cfg`, applied to two audio buses `Music` and `SFX`. A settings file without these keys loads the
  defaults.
- **REQ-19 Files.** The studio writes Godot audio as Ogg Vorbis (`ffmpeg -c:a libvorbis -q:a 3`) into
  `apps/game/assets/audio/{music,sfx}/` with each loop's start and end in a generated
  `apps/game/game/audio/audio_manifest.gd`. The web keeps AAC `.m4a`.
- **NFR-01 Budgets.** Web: unchanged (track ≤ 1 MB, jingle ≤ 120 KB, SFX ≤ 40 KB, total ≤ 9 MB). Godot: track
  ≤ 1.6 MB, total ≤ 20 MB.
- **NFR-02 Performance.** No per-frame allocation in `MusicPlayer` or `engagement()`; streams load once per cue.

## Non-goals

- New sound effects for combat (hits, blocks, enemy voices) or foley packs (Kenney RPG Audio): a later spec.
- Tracks for zones that do not exist yet (Cinder Galleries, Drowned Archive, Frostvault, Heartdeep, festivals).
- A settings choice between the old and new soundtrack.
- Copying, sampling or re-creating any Outward audio.
- Changing saves or `GameState` (no save impact).

## Acceptance criteria

- **AC-01** (REQ-01) The studio's piece tests fail if any music piece or jingle uses `pad`, `choir`, `ePiano`, `arp`,
  `glock`, `softKick`, `snareTap` or `shakerSoft`, or uses `subBass` outside `matron`.
- **AC-02** (REQ-02, REQ-04) A score test counts sounding melodic voices per 16th: never more than 4 (3 in night
  variants); each night variant has the same key and lead motif as its day track and 0.65–0.8 of its tempo.
- **AC-03** (REQ-03) The motif tests find each motif in the placements of REQ-03 and the Hearth motif nowhere.
- **AC-04** (REQ-05, REQ-06) Rendered loop lengths fall in their ranges; every exploration track has a ≥ 4-bar rest
  of melodic voices; the seam test passes (≥ 0.95).
- **AC-05** (REQ-08) The sample resolver finds every new instrument and kit id in VCSL; a missing `VCSL_DIR` stops
  the studio with `VCSL not found: set VCSL_DIR to the VCSL checkout (CC0, github.com/sgossner/VCSL).`
- **AC-06** (REQ-13) The SFX tests fail if any of the eight listed effects uses `glock` or a harp note longer than
  300 ms; the 14 others render byte-identical WAV before encoding.
- **AC-07** (REQ-14) GUT `test_music_director.gd` covers each rule of REQ-14, including rule order (a fight at night
  in the Woods picks `woodsFight`; rain in Lowmere picks `lowmere`; rain in the house picks `home`).
- **AC-08** (REQ-15) GUT tests: an idle dummy gives `"none"`; a chasing burrower gives `"fight"`; the Matron alive
  gives `"boss"`, and `"none"` once she has fallen.
- **AC-09** (REQ-16) GUT tests with a fake clock: a cue change starts a 2.0 s crossfade; engagement ending keeps the
  fight cue for 4.0 s; the same cue twice does not restart the stream.
- **AC-10** (REQ-17, REQ-18) GUT tests: a `dayStarted` + `seasonChanged` batch plays only the season jingle and
  ducks the music 9 dB; volume settings round-trip through `settings.cfg`, and an old file loads 0.6 and 0.8.
- **AC-11** (REQ-19, NFR-01) The web `assets.test.ts` budgets pass; a new `scripts/` test checks the Godot audio
  folder against its budgets and that every manifest entry has a file.
- **AC-12** (REQ-07, REQ-10–12) The owner listens to every changed or new file before merging (tests cannot hear).
- **AC-13** (REQ-16) `pnpm game:smoke` passes with music on, and the playthrough logs one cue per zone it visits,
  each equal to `MusicDirector.pick` for that moment, with no audio errors in the log.

## Architecture (T2, one line)

Studio (`apps/web/src/studio/`) gains VCSL instruments, new pieces and an Ogg output step; the web keeps
`music.ts`'s `pickTrack` with its 9 cues; Godot gets `game/audio/` (`music_director.gd` pure, `music_player.gd`,
`sfx_player.gd`, generated `audio_manifest.gd`) wired by `GameMain`, and one read-only `engagement()` on
`CombatLayer`; no core or save change.

## Risks and dependencies

- **New dev tools:** `ffmpeg` (Homebrew) for Ogg, and a local VCSL checkout (~2 GB). The studio checks both, like
  `afconvert`. Only the studio needs them; CI only reads the committed files.
- **Taste:** "Outward-like" is subjective. Mitigation: build the title and `woods` first and let the owner listen
  before the rest (task T5).
- **VCSL naming** may be an octave off like VSCO's; measure each instrument's pitch as `samples.ts` does.

## Tasks

- [x] **T1** Decision `brain/decisions/0023-outward-style-folk-soundtrack.md`, AGENTS.md's Audio section and
  `CREDITS.md` — files: `brain/`, `AGENTS.md`, `CREDITS.md`
- [x] **T2** Tests for AC-01/02/04/06 (retired timbres, voice count, rests, night variants, SFX bells), seen failing
  — files: `src/studio/pieces/index.test.ts`, `score.test.ts`, `lofi.test.ts` (retired), `motifs.test.ts`
- [x] **T3** VCSL in the sampler (AC-05): resolver, pitch offsets — files: `src/studio/samples.ts`,
  `samples.test.ts`, `scripts/studio.mjs` (`CREDITS.md` is still to do)
- [x] **T4** `title` and `woods` written and rendered; the owner was sent both and told me to continue with the rest
- [x] **T5** Rewrite the other shared tracks and jingles; new Godot tracks; restyle the eight SFX — files:
  `src/studio/pieces/*.ts`
- [x] **T6** Ogg output and `audio_manifest.gd` generation (AC-11) — files: `scripts/studio.mjs`, its test
- [x] **T7** Godot: `MusicDirector`, `engagement()`, `MusicPlayer`, `SfxPlayer`, buses and volume settings (AC-07–10,
  AC-13) — files: `apps/game/game/audio/`, `world/combat_layer.gd`, `autoload/settings.gd`, `boot/`, tests in
  `apps/game/test/game/`
- [x] **T8** (owner listening pass still pending) Verify: `pnpm checks:commit`, `pnpm --filter web exec playwright test e2e/audio.spec.ts
  --project=chromium`, `pnpm game:test`, `pnpm game:smoke`; owner listening pass (AC-12)

## Deviations

- **Retired-timbre, voice-count and rest tests apply to a `MIGRATED` list** (`pieces/folk.test.ts`), not yet to every
  piece, so the suite stays green while pieces are rewritten one at a time (T5). The list becomes "all pieces" at the
  end of T5. Until then the web game plays the new title with the old seasons, home, night, rain and shop.
- The solo violin (`fiddle`) is named in true pitch (offset 0); every VCSL instrument sounds an octave above its file
  name, like VSCO (measured by autocorrelation, 2026-11-05). Only the psaltery's `LongBow` files are used.
- `bellTree` joins the retired kit sounds (a bell timbre); `glockGliss` was already retired.
- VCSL files get the virtual path prefix `vcsl/` so one path list serves both libraries.
- The studio script now refuses `--only <id>` when `apps/web/studio-out/manifest.json` is missing: a first
  single-track run had rewritten `manifest.ts` with only that track (caught and restored before finishing).
- The retired-timbre, voice-count and rest rules now cover every piece (no `MIGRATED` list). The farm `night` track is
  the only night variant not paired with one day track (the farm has four seasons), so REQ-04's tempo ratio is tested
  for the Lowmere and Woods pairs only. `shop` (Sol's cart) is web-only.
- **Ogg:** Homebrew's ffmpeg has no libvorbis, so ffmpeg trims each loop to its seam and `oggenc` (vorbis-tools,
  quality 3) encodes it (`scripts/godotAudio.mjs`). Godot loops the trimmed file from end to start; encoder edges were
  not heard (no one has listened). Godot audio totals 19 MB of a 20 MB budget; the largest track (`winter`) is 1.58 MB
  of 1.6.
- The synths `pad`, `choir`, `ePiano`, `arp`, `subBass` stay in `synths.ts` unused (tests forbid using them); remove
  them in a later cleanup.
- **Godot sounds:** only events the Godot core emits today are mapped (tools, farm events, doors, gold, lessons,
  failures, jingles). Footsteps, thunder and the three menu sounds are shipped as files but have no Godot trigger yet.
  Volume has settings fields and buses but no Settings-screen sliders yet.
- The first VCSL size estimate was wrong: the whole library is 6.16 GB, the eight folders used are about 298 MB.
