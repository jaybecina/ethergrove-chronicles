# Soundtrack revision: cinematic orchestral fantasy with folk colour — design

Date: 2026-11-06 · Tier: T2 · Status: approved 2026-11-06 (owner chose the recommended answers to Q1 and Q2); pilot rendered, awaiting the owner's listening pass (AC-07)

## Purpose

The owner hears the current music, and the ACE-Step pilot takes, as a cheerful medieval bard band, far from the
feeling of _Outward_'s soundtrack: a small adventurer in a beautiful, mysterious, enormous world. The cause is the
brief, not the instruments: every prompt makes folk the genre ("cinematic medieval folk played by a small live
acoustic ensemble", Lowmere's "bardic tavern lilt, four-piece band, boom-chuck"), so the generator answers with a
tavern band repeating short tunes over a busy rhythm. This revision makes **cinematic orchestral fantasy the
foundation** and folk instruments the **colour**: long lyrical phrases that develop, strings and low brass that
swell and rest, solo folk voices on top, restrained percussion. It keeps everything that already works: the place
sets, the leitmotifs, the low end, the Phrygian-dominant fights and the ban on church timbres. Ideas only: no
_Outward_ melody, progression, rhythm or arrangement is quoted or imitated.

## Sources of truth

- `2026-11-05-outward-style-soundtrack-design.md`: cue list and placements (REQ-03, REQ-11), night variants (REQ-04),
  originality (REQ-07), Godot playback (§D). This spec replaces its REQ-05 (lengths) for the AI route.
- `2026-11-05-soundtrack-cinematic-folk-design.md`: the measured comparison (Evidence table) and the analyser recipe.
  This spec keeps its low register, swells that rest and Phrygian-dominant fights, and **drops** its bard foundation:
  Lowmere's tavern boom-chuck, strummed-chord accompaniment as the default texture, and "a hint of gypsy" in towns.
- [[decisions/0023-outward-style-folk-soundtrack]] (retired timbres), [[decisions/0024-cinematic-folk-revision]]
  (superseded in part, see REQ-01), [[decisions/0004-original-ip-cc0-only]] (see Open questions, Q1).
- `brain/sessions/2026-11-05.md`, `2026-11-06.md`: the owner rejected the sampled studio sound; the route is ACE-Step
  1.5 (MIT), rendered outside the repo in `../ai-audio/` into the git-excluded `audio-pilot/`.
- `docs/audio/soundtrack-prompts.md`: the paste-ready prompt sheet this spec rewrites.

## Requirements

### A. Direction

- **REQ-01 Foundation.** Every music cue is briefed as _original instrumental cinematic fantasy RPG music_ whose
  foundation is a chamber-to-full orchestra (strings, low strings, harp, woodwinds, French horns, timpani), with folk
  instruments (wooden flute, recorder, solo violin played as a fiddle, lute, hammered dulcimer, frame drum) as solo
  colour. Creative weight for exploration cues: about 65 % cinematic orchestral, 25 % folk character, 10 % ambient
  texture (a listening guide, not a mix formula). Fights, the boss and Mossdeep shift toward low strings, drums and
  brass. This supersedes the "bard" and "tavern" parts of [[decisions/0024-cinematic-folk-revision]].
- **REQ-02 Shared style (verbatim).** The prompt sheet's shared style becomes:

  > Original instrumental cinematic fantasy RPG soundtrack, emotionally expressive orchestral composition enriched
  > by authentic medieval and European folk instruments. Memorable lyrical melodies, sophisticated modal harmonies,
  > warm legato strings, expressive woodwind soloists, deep resonant cellos and double basses, occasional noble
  > French horns, delicate harp and lute textures, organic acoustic percussion, natural human phrasing, dynamic
  > orchestral swells, spacious atmospheric passages, and a strong sense of exploration, wonder, nostalgia,
  > mystery, and adventure. Rich cinematic orchestration with realistic acoustic instrument performances. Develop
  > musical themes gradually through contrasting sections rather than repeating short rhythmic patterns. The music
  > should feel like a living fantasy world, not a tavern band or cheerful folk dance.

  **Shared negatives** (a tool's negative-prompt field, or the tail of the prompt; see REQ-09):

  > No vocals, no choir, no synthesizers, no electronic beats, no modern drum kit, no cartoonish melodies, no
  > repetitive boom-chuck rhythm, no excessive percussion, no generic trailer music.

- **REQ-03 Every cue prompt has the same five parts, in this order:** (1) a one-line identity ("Original instrumental
  cinematic fantasy … soundtrack" plus the cue's mood words), (2) an opening: which solo voice starts, over which
  bed, (3) a development: which sections enter, how the melody grows (long breathing phrases, countermelody,
  variation), (4) a place image of 1–2 sentences (no game, composer, band or song name; REQ-07 of the first spec),
  (5) an arc that names the peak and the return to the opening texture, and the words "seamless loop" (new prompts
  end "Seamless loop, no fade-out.").
  Then the cue's own "No …" list on top of the shared negatives.
- **REQ-04 Pilot prompts (verbatim).** `lowmere`, `woods` and `woodsFight` use the three prompts in the Appendix,
  word for word, with these settings: `lowmere` 90 BPM, D Dorian / D Mixolydian, 120–180 s; `woods` 72 BPM, D Dorian,
  120–180 s; `woodsFight` 128 BPM, E Phrygian dominant, 60–90 s.
- **REQ-05 Identity per cue.** The other 13 Godot cues get new prompts written to REQ-03 from this table (lead and
  bed are the starting point, not a limit):

  | Cue | Identity | Lead → bed | BPM, mode | Length | Motif |
  |---|---|---|---|---|---|
  | `title` | Emotional, majestic fantasy overture | solo violin → harp, low strings; horns at the peak | 70, D Dorian → D major | 120–180 s | Rootsong, minor then major |
  | `spring` | Warm, lyrical pastoral orchestra | wooden flute → fingerpicked lute, legato strings | 90, D Mixolydian | 120–180 s | Rootsong (major) |
  | `summer` | Gentle, optimistic orchestral folk | solo violin and recorder → harp, pizzicato then legato strings | 96, G Mixolydian | 120–180 s | Rootsong (major) |
  | `fall` | Nostalgic, bittersweet strings | solo cello, then violin → harp, warm violas | 80, B Aeolian | 120–180 s | Rootsong (minor) |
  | `winter` | Sparse, delicate, mysterious | wooden flute → harp, hammered dulcimer, cello drone | 72, D Dorian | 120–180 s | Rootsong (major, slower) |
  | `night` | Quiet farm night, safe and still | distant recorder → harp, double-bass drone | 60, B Aeolian | 90–150 s | Rootsong fragments |
  | `home` | Intimate hearth | clarinet → fingerpicked lute, solo cello | 70, G major | 90–150 s | Grandpa's theme |
  | `rain` | Grey, reflective | solo violin → low strings, soft frame drum like rain | 64, B Aeolian | 90–150 s | Rootsong (minor) |
  | `lowmereNight` | Lamplit town asleep | recorder → harp, muted strings | 66, D Mixolydian → B Aeolian | 90–150 s | Rootsong fragments |
  | `woodsNight` | Dark, spacious, restrained | harp and psaltery notes → double-bass drone, distant horn | 60, D Dorian | 90–150 s | — |
  | `mossdeep` | Ominous, ancient dungeon | low string clusters, slow timpani → sparse harp, distant flute | free / 60, E Phrygian | 90–150 s | the Gloam (slow, low) |
  | `mossdeepFight` | Heavy, tense chamber-orchestral combat | cello and bass ostinato → frame drums, violin stabs | 122, E Phrygian | 60–90 s | the Gloam |
  | `matron` | Dramatic, terrifying orchestral boss | timpani and low brass → driving strings, fierce solo violin | 132, B Phrygian | 60–90 s | the Gloam |

  The web-only `shop` cue is out of scope (see Non-goals).
- **REQ-06 Jingles.** The 7 jingles keep their cues and lengths (3–7 s) and are re-briefed as short orchestral
  phrases with one folk soloist: a string swell under a flute, violin or clarinet phrase that ends resolved on the
  tonic. Horns may join in season jingles and `lessonsComplete`. `faint` stays a falling solo cello and violin.
- **REQ-07 Horns and held strings.** French horns may play short phrases and peak chords in any cue (this relaxes
  REQ-01 of the first spec, which kept horns to season jingles). Held strings must **move**: swell, rest, or carry a
  line. No cue may sit on an unchanging held chord for more than 8 bars (the "church" cause of decision 0023).

### B. Rendering and loops

- **REQ-08 Round 3 briefs.** The pilot renders with ACE-Step 1.5 (turbo DiT, 0.6B LM, `use_cot_caption=False`, as in
  round 2) from `../ai-audio/pilot/round3/<cue>.toml`: `caption` = shared style + cue prompt, `lyrics` = the cue's
  section tags (REQ-10), `bpm` and `keyscale` from REQ-04, `duration` = the top of the cue's length range plus 20 s
  (headroom for the loop cut). Four seeds per cue: 4242, 777, 2026, 31337.
- **REQ-09 Negatives A/B.** Seeds 4242 and 777 carry the shared and cue negatives at the end of the caption; seeds
  2026 and 31337 leave them out (`instrumental = true` still forbids vocals). Text encoders can read "no synths" as
  "synths"; the A/B shows which works for ACE-Step, and the winner becomes the rule for the rollout.
- **REQ-10 Section tags.** Each cue's `lyrics` holds its structure as tags, one per line with a blank line between,
  in the form `[Intro - solo wooden flute]`, ending with a section that returns to the opening texture, never
  `[Outro - fade out]`. Pilot tags:
  - `lowmere`: `[Intro - solo wooden flute and lute]`, `[Main Theme - flute over violas]`,
    `[Development - violins and cellos join]`, `[Climax - restrained orchestral swell with horns]`,
    `[Return - flute and lute]`
  - `woods`: `[Intro - low cello drone and tremolo violas]`, `[Main Theme - distant wooden flute]`,
    `[Development - harp and solo violin]`, `[Climax - string ensemble with horn]`, `[Return - drone and flute]`
  - `woodsFight`: `[Intro - low cello ostinato and frame drums]`, `[Main Theme - fierce solo violin]`,
    `[Break - low strings alone]`, `[Climax - full orchestra with horn accents]`, `[Main Theme - violin and drums]`
- **REQ-11 Intro plus loop body.** A take may play an intro once and then loop a body: the shipped Ogg ends at
  `loopEnd`, and its `.ogg.import` sets `loop_offset` = `loopStart` (seconds). `MusicPlayer` already sets
  `loop = true` and keeps the import's offset. The body (`loopEnd − loopStart`) must fall in the cue's length range.
- **REQ-12 Loop finder.** `../ai-audio/pilot/loop.py <wav> --bpm N --min S --max S` proposes `loopStart` and
  `loopEnd` on bar lines (±50 ms) where the 2 s after `loopEnd` in the raw take best matches the 2 s after
  `loopStart` (normalised cross-correlation of mono), trims there with a 30 ms equal-power crossfade into the body
  start, and prints both times and the seam correlation. A seam passes at ≥ 0.95 (the e2e bar; AAC/Vorbis noise puts
  a clean seam at 0.98–0.99).

### C. Measured targets (same recipe as the cinematic folk spec, plus whole-track dynamics)

- **REQ-13 Targets.** `../ai-audio/pilot/measure.py` reports, per take, on the 25 s window from 20 s in unless noted:

  | Measure | Exploration and towns | Fights, boss | Night, home, rain, Mossdeep | Why |
  |---|---|---|---|---|
  | Energy below 150 Hz (median) | 10–35 % | 30–60 % | 8–40 % | _Outward_ 10–52 %; round-2 fights at 67–80 % were mud |
  | Onsets per second | ≤ 2.1 | ≤ 3.5 | ≤ 1.5 | _Outward_ 1.0–2.1; our tavern Lowmere 3.18 |
  | High-frequency share of onsets | ≤ 33 % | ≤ 45 % | ≤ 33 % | _Outward_ 13–33 %; our Lowmere 73 % then 36 % |
  | Window loudness spread p90 − p10 | — | ≤ 10 dB | — | a sustained wall, not hits with gaps |
  | Whole-track spread p90 − p10 (400 ms RMS over the full take) | ≥ 6 dB | — | — | the music swells and returns |

  `measure.py` gains the high-frequency onset share (onsets whose flux is mostly above 4 kHz) and the whole-track
  spread. Numbers screen takes; they do not pick the winner (REQ-14).

### D. Listening and rollout

- **REQ-14 The owner picks.** For each pilot cue the owner hears the passing takes (as `.m4a` in
  `audio-pilot/listen/round3/`, loop seam included) and picks one or redirects. Tests cannot hear.
- **REQ-15 Rollout after the pilot.** Only after REQ-14 says go: the other 13 cues and 7 jingles render with the
  winning negatives rule, pass REQ-12 and REQ-13, the owner picks takes, and the picks ship as Godot Ogg (Vorbis
  `-q:a 3`) in `apps/game/assets/audio/{music,jingles}/` with their `.ogg.import` files and `loop_offset`.
- **NFR-01 Size.** A Godot music file is at most 3.0 MB (180 s at Vorbis q3 is about 2.5 MB; this replaces the
  1.6 MB cap that assumed 96–150 s loops). Jingles stay ≤ 120 KB.
- **NFR-02 Originality and disclosure.** No prompt names a game, composer, band, film or song. Shipping any AI take
  needs Q1 answered and Steam's "pre-generated AI content" disclosure; `CREDITS.md` names the model and its licence.

## Non-goals

- The web game (React + three.js) keeps its current audio; it retires at Godot parity
  ([[decisions/0019-godot-main-no-phones]]). The web-only `shop` cue is not re-briefed.
- Sound effects (the Kenney CC0 picks are a separate thread).
- The sampled studio (`apps/web/src/studio/`) and its rule tests are not changed; its samples are gone.
- Exact leitmotif notes: text-to-music tools cannot follow them. The motif column is a mood guide until a tool that
  takes a melody is chosen.
- Rendering any cue beyond the three pilot cues before the owner's go.

## Acceptance criteria

- **AC-01** (REQ-02, REQ-03, REQ-05, REQ-06, NFR-02) A script test reads `docs/audio/soundtrack-prompts.md` and passes
  only when: the shared style and shared negatives match REQ-02 word for word; there is one section per Godot music
  cue in `apps/game/game/audio/audio_manifest.gd` (16) and one row per jingle (7); every music section has
  **Length / tempo / key**, **Prompt** and **Structure** lines, a prompt containing "seamless loop" (any case) and
  no "fade out" or "fade-out" except as "no fade-out", a length range from REQ-04/REQ-05, and structure tags with no
  `[Outro - fade out]`; and no prompt contains "Outward", "tavern band", "boom-chuck" or "jig" outside a negative clause
  (a comma- or period-separated clause that starts with "no ", e.g. "no repetitive boom-chuck accompaniment"),
  or a name from the banned list in the test.
- **AC-02** (REQ-04) The three pilot prompts in the sheet equal the Appendix text (same test).
- **AC-03** (REQ-08–10) The three round-3 briefs exist with the REQ-08 settings and REQ-10 tags; 12 takes render
  into `audio-pilot/round3/`.
- **AC-04** (REQ-11, REQ-12) Every take offered to the owner has a loop body in its length range and a seam
  correlation ≥ 0.95, printed by `loop.py`.
- **AC-05** (REQ-13) A table of all 12 takes (low end, onsets/s, high-frequency onset share, window and whole-track
  spread, length, seam) is added to this spec under Results; takes outside REQ-13 are marked and not offered.
- **AC-06** (REQ-09) The Results say which negatives variant measured and sounded better, and the rollout uses it.
- **AC-07** (REQ-14) The owner picks or redirects each pilot cue.
- **AC-08** (REQ-11, NFR-01; rollout) A GUT test loads every shipped music stream and checks `loop` is set by the
  player, `0 ≤ loop_offset < length − 60 s`, and the file is ≤ 3.0 MB; a jingle check keeps ≤ 120 KB.

## Architecture (T2, one line)

Prompts and briefs are text (`docs/audio/soundtrack-prompts.md`, `../ai-audio/pilot/round3/`); renders, loop cuts and
measurements run outside the repo; the game only receives Ogg files and their `.import` loop offsets, so no Godot code
changes beyond the AC-08 test.

## Risks and dependencies

- **Licence of AI audio (blocking for shipping, not for the pilot).** The CC0-only rule
  ([[decisions/0004-original-ip-cc0-only]]) covers third-party assets; AI output from an MIT model is ours but was
  never decided. → Q1 below; nothing ships until a decision note records it.
- **"Cinematic orchestral" turns into trailer music.** → REQ-03 asks for phrasing, roles and dynamics, the negatives
  ban trailer impacts, and REQ-13's onset and spread limits flag constant hits.
- **Held strings bring back the "church" sound.** → REQ-07 and the owner's listening pass.
- **Long captions are cut by the text encoder.** → Before rendering, count the caption's tokens with ACE-Step's own
  tokenizer; if it is cut, keep the cue prompt whole and shorten the shared style to its first sentence plus the
  last two sentences, and record that in Deviations.
- **AI takes drift and do not loop.** → Intro plus loop body (REQ-11), bar-aligned cuts with a measured seam
  (REQ-12), and the prompt's "returns to the opening texture" arc.
- **Seed variance is large** (round 2: low end 0.3–47 % on one prompt). → Four seeds, screening by REQ-13, owner picks.
- **Render time.** About 2 min per 90 s take on the 16 GB M4; 12 takes of 80–200 s ≈ 40–50 min, run in the background.

## Open questions (answered 2026-11-06)

- **Q1 AI audio in the shipped game: yes.** ACE-Step 1.5 output (MIT) may ship as original game audio with the Steam
  disclosure and a `CREDITS.md` line; recorded in [[decisions/0025-ai-generated-audio-may-ship]], which amends 0004.
- **Q2 Web game audio: frozen** as it is (see Non-goals).

## Tasks

- [x] **T1** Write the AC-01/AC-02 test, see it fail on the current sheet — `scripts/audio/promptSheet.test.mjs`
- [x] **T2** Rewrite `docs/audio/soundtrack-prompts.md`: shared style and negatives (REQ-02), pilot prompts
      (REQ-04, Appendix), the 13 other cues (REQ-03, REQ-05), jingles (REQ-06); "How to use" updated for the
      intro-plus-body loop; test passes
- [x] **T3** Round-3 briefs and render (REQ-08–10): token check, then 12 takes in the background — `../ai-audio/pilot/round3/`
- [x] **T4** `loop.py` (REQ-12) and the `measure.py` additions (REQ-13); cut and measure every take; Results table (AC-04–06)
- [~] **T5** Listening files in `audio-pilot/listen/round3/`; owner picks (AC-07)
- [ ] **T6** After go: rollout per REQ-15 with the AC-08 GUT test, `CREDITS.md`, `docs/audio/SOUNDTRACK.md`
- [ ] **T7** Verify: `node --test scripts/audio/promptSheet.test.mjs`, `pnpm checks:commit`; at rollout `pnpm game:test`
      and `pnpm game:smoke`

## Deviations

Found while setting up round 3 (2026-11-06); each is a pilot-method change, not a change to the sound the spec asks for.

- **REQ-08/09: the caption is cut by the encoder, so the A/B changed.** ACE-Step's DiT keeps only 256 tokens of its
  template (55 are template and metas), so about 200 caption tokens reach it ([[lessons/ace-step-caption-256-tokens]]).
  The literal caption (shared style + prompt + negatives) is 416–440 tokens: the DiT sees the shared style and the first
  sentence or two of the cue prompt, and never the "No …" list. The spec's fallback (shorten the style, keep the prompt
  whole) cannot fit either, since the Woods prompt alone is 255 tokens. So each pilot cue has two captions and two
  negatives settings, one take per cell (different seeds, so indicative only):

  | Seed | Caption | Negatives |
  |---|---|---|
  | 4242 | literal (shared style + prompt + negatives, word for word) | none beyond the caption's own tail |
  | 777 | literal | `lm_negative_prompt` set (the LM's guidance) |
  | 2026 | short form, 189–204 of 256 tokens, fits | none |
  | 31337 | short form | `lm_negative_prompt` set |

  Short forms and the `lm_negative_prompt` text are in Appendix B. REQ-04 (verbatim prompts) still holds for the sheet.
- **REQ-12 / AC-04: the seam score is not waveform correlation.** Two performances of one passage never match sample for
  sample (a synthetic, exactly periodic test piece scores about 0 by waveform), so the 0.95 bar of the web e2e loops
  cannot apply to AI takes. `loop.py` instead scores the mean frame-wise cosine similarity of the log-spectra of the 2 s
  after `loopEnd` and after `loopStart` (bar: ≥ 0.90, set before seeing any result), prints the waveform correlation for
  information, splices with a 30 ms equal-power crossfade, and writes a 50 s clip around the seam for the owner's ears.
  The bar-line grid is not imposed: the match picks musically equivalent positions, and the body length is printed in
  bars of the requested BPM.
- **REQ-13: `measure.py` is calibrated to the browser analyser, and the high-frequency share is information only.** The
  bars came from a Web Audio analyser; `measure.py` is a Python re-implementation. Measured both ways on four cinematic
  folk pilot tracks (script / browser): onsets per second `lowmere` 3.40 / 1.41, `title` 2.84 / 1.21, `woodsFight`
  3.24 / 1.85, `woods` 2.76 / 1.05, so the script counts 1.8–2.6 times more (mean 2.28) and its onsets are divided by
  2.28 before they meet the bar. Low end agrees directly (10.8 / 11.7, 19.3 / 19.0, 21.7 / 28, 14.2 / 15.3 %). The
  high-frequency onset share has one browser value (`lowmere` 0.36, here 0.18), too little to calibrate, so it is
  printed and not a gate. Without this scaling every take "missed" the onsets bar (3.4–4.0 against ≤ 2.1), which was an
  artefact of the tool, not of the music.
- **Listening files are `.m4a` (afconvert); Ogg is not encoded yet.** `ffmpeg` and `oggenc` were uninstalled on
  2026-11-05, and Ogg output is only needed at rollout (REQ-15).

## Results

Rendered 2026-11-06 with ACE-Step 1.5 (turbo DiT, 0.6B LM) on the 16 GB M4: 200 s takes for `lowmere` and `woods`, 110 s
for `woodsFight`, about 5 min per 200 s take. Measured with `measure.py` (REQ-13, onsets in browser units, see
Deviations) and cut with `loop.py` (seam bar 0.90). Takes marked "no" are not offered for listening as picks, but their
files exist in `audio-pilot/listen/round3/` (`<take>-loop.m4a` is intro plus body, `<take>-seam.m4a` is 50 s around the
loop jump).

| Cue | Seed | Caption | Negatives | Low end % | Onsets/s | Window spread dB | Take spread dB | Seam | Loop body | Offered |
|---|---|---|---|---|---|---|---|---|---|---|
| `lowmere` | 4242 | literal | none | 1.0 | 1.74 | 10.1 | 15.1 | 0.90 | 151 s (44-195) | no: low end 1.0 % outside 10-35 |
| `lowmere` | 777 | literal | LM neg | 10.9 | 1.61 | 13.5 | 17.9 | 0.91 | 125 s (30-155) | **yes**: passes all |
| `lowmere` | 2026 | short | none | 0.2 | 1.49 | 6.9 | 21.9 | 0.61 | 172 s (8-180) | no: low end 0.2 % outside 10-35; seam 0.61 < 0.90 |
| `lowmere` | 31337 | short | LM neg | 24.1 | 1.68 | 15.5 | 18.9 | 0.99 | 171 s (20-192) | **yes**: passes all |
| `woods` | 4242 | literal | none | 20.5 | 1.67 | 11.7 | 25.9 | 0.95 | 179 s (3-181) | **yes**: passes all |
| `woods` | 777 | literal | LM neg | 0.2 | 1.56 | 17.0 | 20.9 | 0.92 | 121 s (58-179) | no: low end 0.2 % outside 10-35 |
| `woods` | 2026 | short | none | 40.8 | 1.74 | 14.8 | 36.5 | 0.86 | 129 s (51-180) | no: low end 40.8 % outside 10-35; seam 0.86 < 0.90 |
| `woods` | 31337 | short | LM neg | 22.0 | 1.56 | 11.3 | 15.6 | 0.94 | 145 s (35-180) | **yes**: passes all |
| `woodsFight` | 4242 | literal | none | 17.4 | 1.63 | 12.3 | 20.7 | 0.80 | 80 s (11-90) | no: low end 17.4 % outside 30-60; window spread 12.3 dB > 10; seam 0.80 < 0.90 |
| `woodsFight` | 777 | literal | LM neg | 30.5 | 1.88 | 6.0 | 15.1 | 0.79 | 68 s (24-91) | no: seam 0.79 < 0.90 |
| `woodsFight` | 2026 | short | none | 67.4 | 1.86 | 4.4 | 7.0 | 0.84 | 68 s (21-89) | no: low end 67.4 % outside 30-60; seam 0.84 < 0.90 |
| `woodsFight` | 31337 | short | LM neg | 51.5 | 2.05 | 5.9 | 9.3 | 0.89 | 60 s (17-77) | no: seam 0.89 < 0.90 |

- **Offered (4):** `lowmere` 777 and 31337, `woods` 4242 and 31337. No `woodsFight` take clears the seam bar (best 0.89).
- **Negatives (AC-06, measured only):** takes with `lm_negative_prompt` passed the REQ-13 gates 5 of 6 times, takes
  without it 1 of 6; the literal and short captions passed 3 of 6 each. Each cell used its own seed, so seed luck and
  setting are tangled (the pattern held in all three cues). Which one sounds better is the owner's call.
- **Low end swings with the seed,** from 0.2 % to 41 % on one prompt in the towns and woods, and the two fight takes
  without `lm_negative_prompt` were off the other way (67 %, and 17 % with a 12 dB loudness spread).
- **Seam score caveat:** it compares the texture of the 2 s after each point, so a steady drone scores high for free
  (`lowmere` 31337 scores 0.99). Loop bodies are not forced onto bar lines (lengths in bars at the requested BPM are not
  whole), so a jump can land off the beat. Both are for the owner's ears.
- **Not verified:** how any take sounds (AC-07), whether the take's real tempo matches the requested BPM, and Ogg size
  (no encoder installed; rollout only).

## Appendix: pilot prompts (verbatim, REQ-04)

### `lowmere` — town exploration

Original instrumental cinematic fantasy RPG town exploration soundtrack. A beautiful, emotionally expressive
medieval-inspired orchestral composition with a warm, nostalgic sense of adventure.

Begin with a gentle solo wooden flute performing a memorable, lyrical melody over delicate fingerpicked lute and
warm sustained violas. Gradually introduce expressive legato violins, rich cellos, soft double bass, and subtle
French horn harmonies. The main melody unfolds naturally through long, breathing phrases, with graceful
countermelodies and evolving harmonies.

The atmosphere evokes walking through an ancient countryside town surrounded by mountains and forests: welcoming
but mysterious, peaceful yet full of possibilities. A subtle undercurrent of longing suggests distant adventures
and forgotten history.

Use a flowing, organic rhythm rather than a repetitive dance beat. Restrained acoustic percussion only at important
musical transitions. Natural orchestral dynamics, expressive rubato, spacious concert-hall acoustics, detailed
acoustic instrumentation.

Build toward a beautiful, restrained orchestral swell before returning to the intimate opening theme. Seamless
loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no bouncy tavern dance, no repetitive boom-chuck accompaniment, no
cartoonish melodies, no constant percussion, no overly cheerful folk jig.

### `woods` — forest exploration

Original instrumental cinematic fantasy wilderness exploration soundtrack. Deeply atmospheric, mysterious,
emotionally moving orchestral fantasy music with subtle medieval folk character.

Open with a low sustained cello and double bass foundation, gentle tremolo violas, and a distant solo wooden flute
playing a slow, haunting melody. Introduce delicate harp arpeggios, expressive solo violin, and warm orchestral
strings with gradually shifting modal harmonies.

Create the feeling of exploring an enormous ancient forest filled with forgotten ruins, towering trees, hidden
dangers, and quiet natural beauty. The music should evoke wonder, solitude, discovery, melancholy, and the
irresistible desire to explore further.

Use long lyrical melodic phrases, gentle harmonic tension, spacious silences, and organic dynamic swells. A
restrained French horn may briefly introduce a noble, adventurous quality. Maintain a strong emotional melodic
identity without overwhelming the environmental atmosphere.

Gradually develop into a rich but controlled string ensemble passage, then return to the mysterious opening
texture. Natural acoustic orchestration, cinematic depth, realistic instrumental performances, seamless loop.

No vocals, no synth pads, no electronic percussion, no cheerful folk dancing, no bouncy plucked bass, no constant
rhythmic ostinato, no playful cartoon fantasy, no repetitive short melody loops.

### `woodsFight` — wilderness combat

Original instrumental cinematic dark fantasy RPG combat soundtrack. Intense, dramatic orchestral battle music
combining powerful medieval acoustic instrumentation with expressive symphonic writing.

Begin with aggressive low cello ostinatos, forceful double bass, deep frame drums, and tense low strings. Introduce
a fierce solo violin performing a memorable, dark modal battle melody, supported by driving violas, urgent
orchestral string figures, and powerful French horn accents.

The music evokes a dangerous encounter deep inside an ancient wilderness. The battle feels desperate, physical,
mysterious, and heroic rather than playful or triumphant.

Use strong rhythmic momentum, dramatic harmonic changes, tightly controlled percussion, and contrasting musical
sections. Allow the main battle melody to develop across the ensemble. Include brief moments of reduced
instrumentation to create tension before the full orchestra returns.

Deep acoustic bass, realistic ensemble performances, rich cinematic dynamics, urgent string writing, restrained
brass, and organic percussion. Seamless loop with sustained combat intensity.

No vocals, no synthesizers, no electronic dance beats, no cheerful folk jig, no tavern music, no cartoonish action
melody, no generic epic trailer impacts, no modern drum kit.

## Appendix B: ACE-Step short forms (pilot, 2026-11-06)

Generated by `../ai-audio/pilot/round3/make_briefs.py`; each fills its template to ≤ 256 tokens.

`lm_negative_prompt` (all cues): vocals, choir, synthesizers, electronic beats, drum kit, tavern dance, boom-chuck
rhythm, constant percussion, cartoonish melodies, trailer music

### `lowmere` (key D major, 200 s take)

Original instrumental cinematic fantasy RPG town exploration music, warm, nostalgic, a little mysterious. A solo wooden
flute sings a lyrical melody over fingerpicked lute and sustained violas; legato violins, rich cellos, soft double bass
and subtle French horns gradually join. Long breathing phrases, graceful countermelodies, flowing organic rhythm with no
dance beat, restrained percussion only at transitions. An ancient countryside town among mountains and forests. Builds
to a restrained orchestral swell, then returns to flute and lute. Natural dynamics, expressive rubato, concert-hall
space. Memorable lyrical melodies, sophisticated modal harmonies, warm legato strings, deep resonant cellos and basses,
natural human phrasing.

### `woods` (key D minor, 200 s take)

Original instrumental cinematic fantasy wilderness exploration music, atmospheric, mysterious, melancholy, full of
wonder. Low sustained cello and double bass, gentle tremolo violas and a distant solo wooden flute playing a slow
haunting melody; delicate harp arpeggios, expressive solo violin and warm strings join, modal harmonies shifting slowly.
An enormous ancient forest with forgotten ruins. Long lyrical phrases, spacious silences, organic swells, a restrained
French horn. Grows to a controlled string ensemble passage, then returns to the opening drone and flute. Realistic
acoustic orchestration, cinematic depth. Memorable lyrical melodies, sophisticated modal harmonies, warm legato strings,
deep resonant cellos and basses, natural human phrasing.

### `woodsFight` (key E minor, 110 s take)

Original instrumental cinematic dark fantasy RPG combat music, intense, dramatic, desperate and heroic. Aggressive low
cello ostinato, forceful double bass, deep frame drums and tense low strings; a fierce solo violin plays a dark modal
battle melody over driving violas, urgent string figures and powerful French horn accents. A dangerous encounter in an
ancient wilderness. Strong rhythmic momentum, dramatic harmonic changes, tightly controlled percussion, brief reduced
passages for tension before the full orchestra returns. Deep acoustic bass, rich cinematic dynamics, sustained
intensity. Memorable melodies, sophisticated modal harmonies, deep resonant cellos and basses, natural human phrasing,
realistic ensemble performance.
