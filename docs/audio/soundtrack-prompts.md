# Ethergrove Chronicles — soundtrack prompts for AI music tools

Ready-to-paste prompts for every Godot music track and jingle, for any text-to-music tool (ACE-Step, Stable Audio,
Suno, Udio and the like). Direction: **cinematic orchestral fantasy as the foundation, medieval and folk
instruments as the colour** ([spec](../superpowers/specs/2026-11-06-soundtrack-cinematic-orchestral-design.md)).
Cue list and placements: `docs/superpowers/specs/2026-11-05-outward-style-soundtrack-design.md`. Melodies:
`docs/superpowers/specs/2026-10-30-ethergrove-audio-design.md` §2.2. A test (`scripts/audio/promptSheet.test.mjs`)
keeps this sheet in line with the spec.

## How to use

1. Paste the **shared style** first, then the cue's **Prompt**. In tools with two fields, put the style and prompt in
   the style/caption field and the **Structure** line in the lyrics field, one tag per line.
2. Always instrumental. Ask for 4 takes per cue and keep the best. A/B the negatives: two takes with the "No …" lists
   (shared negatives and the cue's own) and two without; some tools read "no synths" as "synths".
3. **Never** put a game, composer, band, film or song name in a prompt. Describe the sound only; the game must stay
   original (`brain/decisions/0004-original-ip-cc0-only.md`).
4. Ask for a take 20 s longer than the **Length** and cut it on bar lines: an intro can play once, and the body that
   follows loops (a `loop_offset` in the track's `.ogg.import`). Every loop must return to the opening texture with no
   fade-out. Exploration cues run 2–3 minutes so the melody can develop; combat cues stay short.
5. AI music may ship in the Godot game ([decision 0025](../../brain/decisions/0025-ai-generated-audio-may-ship.md));
   tick Steam's "pre-generated AI content" disclosure and credit the model in `CREDITS.md`. Check the tool's own
   licence allows commercial use before using it.
6. **ACE-Step reads only about 200 tokens of the caption** (its text encoder cuts at 256 including the template and
   metas), so the long prompts below lose their ending there. For ACE-Step, write a short form of about 190 tokens, put
   the "No …" words in `lm_negative_prompt`, and keep the arc in the lyrics tags (see
   `brain/lessons/ace-step-caption-256-tokens.md`). Other tools have other limits; the full text is the source.
7. Held strings must move: swell, rest or carry a line. Never leave one unchanging chord for more than 8 bars.

**Shared style (prepend to every prompt):**

```text
Original instrumental cinematic fantasy RPG soundtrack, emotionally expressive orchestral composition enriched by authentic medieval and European folk instruments. Memorable lyrical melodies, sophisticated modal harmonies, warm legato strings, expressive woodwind soloists, deep resonant cellos and double basses, occasional noble French horns, delicate harp and lute textures, organic acoustic percussion, natural human phrasing, dynamic orchestral swells, spacious atmospheric passages, and a strong sense of exploration, wonder, nostalgia, mystery, and adventure. Rich cinematic orchestration with realistic acoustic instrument performances. Develop musical themes gradually through contrasting sections rather than repeating short rhythmic patterns. The music should feel like a living fantasy world, not a tavern band or cheerful folk dance.
```

**Shared negatives (a negative-prompt field, or the end of the prompt):**

```text
No vocals, no choir, no synthesizers, no electronic beats, no modern drum kit, no cartoonish melodies, no repetitive boom-chuck rhythm, no excessive percussion, no generic trailer music.
```

Also avoid, if the tool has a negative field: lo-fi, hip-hop beat, electric guitar, glockenspiel, bells, church organ.

## The leitmotifs (mood guide)

Text-to-music tools cannot follow exact notes. Use these only if a tool takes a melody or MIDI; otherwise they are
the emotional reference for each cue. ABC notation, `L:1/16` (`2` is an eighth note). Keep the rhythm and
intervals; any key is fine.

| Motif                | Means                            | ABC                                              |
| -------------------- | -------------------------------- | ------------------------------------------------ |
| **Rootsong** (major) | The player, the valley, home     | `K:D` `B,2 D2 F4 E2 D2 A4 \| G2 F2 E2 F2 D8`     |
| **Rootsong** (minor) | Longing, the missing grandfather | `K:Bm` `B,2 D2 F4 E2 D2 G4 \| F2 E2 D2 C2 B,8`   |
| **The Gloam**        | Danger, the sour ether           | `K:Bm` `B,2 D2 =F4 E2 D2 G4 \| =F2 E2 D2 C2 B,8` |
| **Grandpa's theme**  | The grandfather, the farmhouse   | `K:G` `G3 A B4 d4 B4 \| c2 B2 A2 G2 E4 D4`       |

## Music tracks (16, they loop)

The web-only `shop` cue is not covered here (it keeps its current audio).

### 1. `title` — title screen

- **Length / tempo / key:** 120–180 s · 70 BPM · D Dorian → D major
- **Structure:** `[Intro - solo violin and harp] [Main Theme - violin and flute in D Dorian] [Development - strings and cello join, theme in D major] [Climax - horns and strings swell] [Return - solo violin and harp]`
- **Motif:** Rootsong (minor first, then major)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG main theme. An emotional, majestic overture with a warm, nostalgic sense of a journey about to begin.

Open with a single solo violin playing a wistful, lyrical melody in D Dorian over a soft harp and a low cello drone. A wooden flute answers the phrase. Gradually bring in warm legato violas and violins, deep cellos and double bass, and a gentle frame drum, while the melody turns to bright D major and grows through long, breathing phrases with a graceful countermelody.

The atmosphere is a vast green valley at dawn: small farms, ancient roots under the soil, and mountains beyond that promise adventure. Hope with a thread of longing for someone who is missing.

Build over the second half to a majestic but restrained peak: noble French horns carry the theme over swelling strings and a soft timpani roll, then everything relaxes back to the solo violin and harp of the opening. Natural orchestral dynamics, expressive rubato, spacious concert-hall acoustics. Seamless loop, no fade-out.

No vocals, no choir, no synthesizers, no electronic drums, no epic trailer impacts, no constant percussion, no cartoonish melodies.
```

### 2. `spring` — farm, spring days

- **Length / tempo / key:** 120–180 s · 90 BPM · D Mixolydian
- **Structure:** `[Intro - solo flute and lute] [Main Theme - flute over violas] [Development - violins, cello and harp join] [Climax - warm strings with a quiet horn] [Return - flute and lute]`
- **Motif:** Rootsong (major)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG farm soundtrack for the start of spring. A warm, lyrical pastoral orchestral composition with a hopeful, sunlit feel.

Begin with a bright wooden flute playing an unhurried, singing melody over delicate fingerpicked lute and soft sustained violas. Bring in legato violins, a gentle cello line and plucked double bass, and a light harp in the second phrase. The melody unfolds in long, breathing phrases with a graceful countermelody on solo violin.

The atmosphere is morning light on wet fields, seedlings breaking through the soil and a long day of honest work ahead: fresh, gentle and a little wistful.

Use a flowing, organic pulse rather than a dance beat, with a soft frame drum only at the transitions. Swell into a warm full-strings passage with a single quiet French horn, then return to the intimate flute and lute of the opening. Natural dynamics, spacious acoustics. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no bouncy tavern dance, no constant percussion, no cartoonish melodies.
```

### 3. `summer` — farm, summer days

- **Length / tempo / key:** 120–180 s · 96 BPM · G Mixolydian
- **Structure:** `[Intro - solo violin, recorder and harp] [Main Theme - violin and recorder] [Development - legato strings and bass] [Climax - warm orchestral swell with horn] [Return - violin, recorder and harp]`
- **Motif:** Rootsong (major)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG farm soundtrack for high summer. A gentle, optimistic orchestral folk composition, golden and unhurried.

Open with a solo violin and a recorder trading a sunny, lyrical melody over a light harp and pizzicato cellos. Let legato strings take over the accompaniment in the second phrase, with a soft double bass and warm violas, and let the melody develop with variations and a flowing countermelody rather than repeating one short tune.

The atmosphere is tall crops in golden light, long evenings and a valley at its most generous: relaxed, bright and quietly proud.

Keep the rhythm gently swinging and organic, with a quiet frame drum only for lift at the transitions. Rise to a warm, restrained orchestral swell with a mellow French horn, then settle back to the violin, recorder and harp. Natural dynamics, spacious acoustics. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no cheerful folk jig, no constant percussion, no cartoonish melodies.
```

### 4. `fall` — farm, autumn days

- **Length / tempo / key:** 120–180 s · 80 BPM · B Aeolian
- **Structure:** `[Intro - solo cello and harp] [Main Theme - solo violin over violas] [Development - clarinet answers, strings join] [Climax - rich strings with a horn] [Return - solo cello and harp]`
- **Motif:** Rootsong (minor)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG farm soundtrack for autumn. A nostalgic, bittersweet string composition that remembers someone loved and missed.

Begin with a solo cello playing a slow, singing minor melody over a soft harp and warm violas. A solo violin takes the melody in the second phrase, with a clarinet answering. Gradually add legato violins, deep cellos and a quiet double bass, and let the harmonies shift between B Aeolian and a brighter major colour.

The atmosphere is falling leaves, low harvest light over the fields and an empty chair in the farmhouse: warm, wistful and tender, never sad for long.

Use long breathing phrases and gentle rubato, with no steady drum and only a soft frame drum at one transition. Swell to a rich but controlled string passage with a single warm French horn, then return to the solo cello and harp. Natural dynamics, spacious acoustics. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no constant percussion, no cheerful folk dancing, no cartoonish melodies.
```

### 5. `winter` — farm, winter days

- **Length / tempo / key:** 120–180 s · 72 BPM · D Dorian
- **Structure:** `[Intro - harp arpeggios and cello drone] [Main Theme - solo wooden flute] [Development - hammered dulcimer and muted strings] [Climax - quiet string swell with distant horn] [Return - harp and flute]`
- **Motif:** Rootsong (major, slower)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG farm soundtrack for deep winter. A sparse, delicate, mysterious composition: cold air and warm light.

Open with slow harp arpeggios and a breathy solo wooden flute over a long, quiet cello drone. Add a hammered dulcimer for glints of light and, late in the piece, soft muted strings and a distant, gentle French horn. The melody moves in long, spacious phrases with plenty of silence between them.

The atmosphere is snow settling on the roots and roofs, a still valley and smoke from one chimney: cold but cosy, with something old stirring beneath the ground.

Use almost no percussion, only a very soft heartbeat on the frame drum at the peak. Grow slowly to a quiet string swell, then fall back to the harp and flute of the opening. Natural dynamics, spacious acoustics. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no sleigh bells, no constant percussion, no cartoonish melodies.
```

### 6. `night` — farm after 20:00

- **Length / tempo / key:** 90–150 s · 60 BPM · B Aeolian
- **Structure:** `[Intro - double-bass drone and recorder] [Main Theme - recorder and harp] [Development - psaltery shimmer and muted strings] [Climax - gentle string swell] [Return - drone and recorder]`
- **Motif:** Rootsong (major, fragments)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG farm soundtrack for a quiet night. A hushed, safe, sleepy composition with very few notes.

Begin with a deep double-bass drone and a distant solo recorder playing a slow, fragile melody with long rests. Add a soft harp, a barely audible psaltery shimmer, and low muted strings that swell and fade like breathing. Fragments of the melody come back in new colours rather than repeating.

The atmosphere is a farm after the lamps go out: the field dark, the stars bright and the world large and kind. Calm, a little lonely, completely safe.

Use no steady rhythm and no drums. Reach one gentle swell of strings with a single quiet horn, then dissolve back to the drone and recorder. Natural dynamics, a close and spacious acoustic. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no percussion, no cheerful folk dancing, no cartoonish melodies.
```

### 7. `home` — inside the farmhouse

- **Length / tempo / key:** 90–150 s · 70 BPM · G major
- **Structure:** `[Intro - fingerpicked lute] [Main Theme - solo clarinet] [Development - cello and harp join] [Climax - warm string swell] [Return - lute and clarinet]`
- **Motif:** Grandpa's theme

**Prompt:**

```text
Original instrumental cinematic fantasy RPG interior soundtrack for an old farmhouse. An intimate, tender chamber composition for lute, clarinet and cello.

Open with fingerpicked lute and a tender solo clarinet melody, then add a solo cello underneath and a soft harp. Let the melody unfold in long, simple phrases with a gentle countermelody. As the cello takes the tune, a few warm legato strings enter and recede.

The atmosphere is the grandfather's kitchen: a crackling fire, worn wooden boards, tools on hooks and a lifetime of memories. Nostalgic, kind and unhurried.

Keep the pulse soft and organic, with no percussion. Build to one warm, modest swell, then return to the lute and clarinet of the opening. Natural dynamics, a small warm room. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no percussion, no cheerful folk jig, no cartoonish melodies.
```

### 8. `rain` — rain and storms, any season

- **Length / tempo / key:** 90–150 s · 64 BPM · B Aeolian
- **Structure:** `[Intro - cello drone and ocean drum] [Main Theme - solo violin] [Development - lute, flute and violas] [Climax - restrained string swell with distant horn] [Return - cellos and violin]`
- **Motif:** Rootsong (minor)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG soundtrack for a grey, rainy day on the farm. A quiet, reflective, wistful composition in muted colours.

Begin with low sustained cellos and double bass, a soft ocean drum like rain on a roof, and a slow solo violin playing a gentle minor melody. Add fingerpicked lute, a solo flute that answers the violin, and warm violas that swell and fade with the weather. The harmonies drift through B Aeolian with brief breaks of light.

The atmosphere is water running off thatch, wet earth, a lamp in the window and time to think: reflective and soft, never bleak.

Use no steady beat. Rise to a restrained string swell with a distant French horn as the clouds part, then settle back to the cellos and violin. Natural dynamics, spacious acoustics. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no constant percussion, no cheerful folk dancing, no cartoonish melodies.
```

### 9. `lowmere` — Lowmere, the town, by day

- **Length / tempo / key:** 120–180 s · 90 BPM · D Dorian / D Mixolydian
- **Structure:** `[Intro - solo wooden flute and lute] [Main Theme - flute over violas] [Development - violins and cellos join] [Climax - restrained orchestral swell with horns] [Return - flute and lute]`
- **Motif:** Rootsong (major)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG town exploration soundtrack. A beautiful, emotionally expressive medieval-inspired orchestral composition with a warm, nostalgic sense of adventure.

Begin with a gentle solo wooden flute performing a memorable, lyrical melody over delicate fingerpicked lute and warm sustained violas. Gradually introduce expressive legato violins, rich cellos, soft double bass, and subtle French horn harmonies. The main melody unfolds naturally through long, breathing phrases, with graceful countermelodies and evolving harmonies.

The atmosphere evokes walking through an ancient countryside town surrounded by mountains and forests: welcoming but mysterious, peaceful yet full of possibilities. A subtle undercurrent of longing suggests distant adventures and forgotten history.

Use a flowing, organic rhythm rather than a repetitive dance beat. Restrained acoustic percussion only at important musical transitions. Natural orchestral dynamics, expressive rubato, spacious concert-hall acoustics, detailed acoustic instrumentation.

Build toward a beautiful, restrained orchestral swell before returning to the intimate opening theme. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no bouncy tavern dance, no repetitive boom-chuck accompaniment, no cartoonish melodies, no constant percussion, no overly cheerful folk jig.
```

### 10. `lowmereNight` — Lowmere at night

- **Length / tempo / key:** 90–150 s · 66 BPM · D Mixolydian → B Aeolian
- **Structure:** `[Intro - harp and double-bass drone] [Main Theme - solo recorder] [Development - muted cellos and psaltery] [Climax - gentle string swell with distant horn] [Return - harp and recorder]`
- **Motif:** Rootsong (major, fragments)

**Prompt:**

```text
Original instrumental cinematic fantasy RPG town soundtrack for a small town asleep at night. A hushed, lamplit, slightly lonely chamber composition.

Open with a soft folk harp and a quiet solo recorder playing a slow lyrical melody over a low double-bass drone. Add muted cellos, a faint psaltery shimmer and a single solo viola line, with the harmonies moving gently between D Mixolydian and B Aeolian.

The atmosphere is empty cobbled streets, lanterns, closed shutters and a clock tower in the distance: peaceful, a little melancholy and full of quiet stories.

Use no drums. Let one gentle string swell with a distant horn rise and recede, then return to the harp and recorder. Natural dynamics, spacious acoustics. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no percussion, no bouncy tavern dance, no cartoonish melodies.
```

### 11. `woods` — the Woods, by day (exploration)

- **Length / tempo / key:** 120–180 s · 72 BPM · D Dorian
- **Structure:** `[Intro - low cello drone and tremolo violas] [Main Theme - distant wooden flute] [Development - harp and solo violin] [Climax - string ensemble with horn] [Return - drone and flute]`
- **Motif:** none

**Prompt:**

```text
Original instrumental cinematic fantasy wilderness exploration soundtrack. Deeply atmospheric, mysterious, emotionally moving orchestral fantasy music with subtle medieval folk character.

Open with a low sustained cello and double bass foundation, gentle tremolo violas, and a distant solo wooden flute playing a slow, haunting melody. Introduce delicate harp arpeggios, expressive solo violin, and warm orchestral strings with gradually shifting modal harmonies.

Create the feeling of exploring an enormous ancient forest filled with forgotten ruins, towering trees, hidden dangers, and quiet natural beauty. The music should evoke wonder, solitude, discovery, melancholy, and the irresistible desire to explore further.

Use long lyrical melodic phrases, gentle harmonic tension, spacious silences, and organic dynamic swells. A restrained French horn may briefly introduce a noble, adventurous quality. Maintain a strong emotional melodic identity without overwhelming the environmental atmosphere.

Gradually develop into a rich but controlled string ensemble passage, then return to the mysterious opening texture. Natural acoustic orchestration, cinematic depth, realistic instrumental performances, seamless loop.

No vocals, no synth pads, no electronic percussion, no cheerful folk dancing, no bouncy plucked bass, no constant rhythmic ostinato, no playful cartoon fantasy, no repetitive short melody loops.
```

### 12. `woodsNight` — the Woods at night

- **Length / tempo / key:** 90–150 s · 60 BPM · D Dorian
- **Structure:** `[Intro - double-bass drone and cello harmonics] [Main Theme - sparse harp and psaltery] [Development - distant flute and muted strings] [Climax - dark string swell with far-away horn] [Return - drone]`
- **Motif:** none

**Prompt:**

```text
Original instrumental cinematic dark fantasy RPG wilderness soundtrack for a forest at night. A dark, spacious, restrained composition, uneasy but beautiful.

Begin with a deep double-bass drone and low cello harmonics, a sparse folk harp and a few psaltery notes, then a distant solo wooden flute with long silences between phrases. Add low muted strings that swell and fall back, and a far-away French horn call near the middle. The harmony shifts slowly in D Dorian with a touch of tension.

The atmosphere is moonlight between ancient trunks, unseen movement in the dark and ruins half remembered: wonder with caution.

Use only a very soft distant frame drum, if any percussion at all. Grow to one dark, controlled string swell and return to the opening drone. Natural dynamics, vast acoustics. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no constant percussion, no cheerful folk dancing, no jump-scare stingers, no cartoonish melodies.
```

### 13. `woodsFight` — combat in the Woods

- **Length / tempo / key:** 60–90 s · 128 BPM · E Phrygian dominant
- **Structure:** `[Intro - low cello ostinato and frame drums] [Main Theme - fierce solo violin] [Break - low strings alone] [Climax - full orchestra with horn accents] [Main Theme - violin and drums]`
- **Motif:** none

**Prompt:**

```text
Original instrumental cinematic dark fantasy RPG combat soundtrack. Intense, dramatic orchestral battle music combining powerful medieval acoustic instrumentation with expressive symphonic writing.

Begin with aggressive low cello ostinatos, forceful double bass, deep frame drums, and tense low strings. Introduce a fierce solo violin performing a memorable, dark modal battle melody, supported by driving violas, urgent orchestral string figures, and powerful French horn accents.

The music evokes a dangerous encounter deep inside an ancient wilderness. The battle feels desperate, physical, mysterious, and heroic rather than playful or triumphant.

Use strong rhythmic momentum, dramatic harmonic changes, tightly controlled percussion, and contrasting musical sections. Allow the main battle melody to develop across the ensemble. Include brief moments of reduced instrumentation to create tension before the full orchestra returns.

Deep acoustic bass, realistic ensemble performances, rich cinematic dynamics, urgent string writing, restrained brass, and organic percussion. Seamless loop with sustained combat intensity.

No vocals, no synthesizers, no electronic dance beats, no cheerful folk jig, no tavern music, no cartoonish action melody, no generic epic trailer impacts, no modern drum kit.
```

### 14. `mossdeep` — Mossdeep, the first dungeon

- **Length / tempo / key:** 90–150 s · free time, about 60 BPM · E Phrygian
- **Structure:** `[Intro - low string clusters and timpani] [Main Theme - sparse harp and distant flute] [Development - psaltery swells and log drum] [Climax - tense low strings and horns] [Return - clusters and timpani]`
- **Motif:** the Gloam (slow, low, partial)

**Prompt:**

```text
Original instrumental cinematic dark fantasy RPG dungeon soundtrack for an ancient underground ruin choked with roots. Ominous, damp and oppressive, mostly texture with very little melody.

Open with low cello and double-bass clusters and a slow, deep timpani and log-drum pulse in free time. Add sparse harp notes, a distant solo flute and bowed psaltery swells that come and go, and let a slow, low phrase in E Phrygian surface and sink back.

The atmosphere is dripping stone, roots through collapsed walls, torchlight on wet ground and something old waiting in the dark.

Use rare, heavy hits rather than a beat. Rise to a tense low-string and horn swell, then return to the quiet clusters of the opening. Natural dynamics, a huge stone space. Seamless loop, no fade-out.

No vocals, no synthesizers, no electronic drums, no steady dance rhythm, no cheerful folk dancing, no jump-scare stingers, no cartoonish melodies.
```

### 15. `mossdeepFight` — combat in Mossdeep

- **Length / tempo / key:** 60–90 s · 122 BPM · E Phrygian
- **Structure:** `[Intro - frame drum and log drum] [Main Theme - cello and bass ostinato] [Break - low strings alone] [Climax - violin stabs and horn accents] [Main Theme - drums and low strings]`
- **Motif:** the Gloam

**Prompt:**

```text
Original instrumental cinematic dark fantasy RPG combat soundtrack for a close, low fight in a cave. Heavy, tense chamber-orchestral battle music.

Begin with a pounding frame drum and log drum, a heavy cello and double-bass ostinato in E Phrygian, and tense low violas. Add dark, stabbing solo violin figures, short horn accents and a slow-moving, ominous theme in the low strings that develops through the piece.

The fight is claustrophobic and relentless: stone walls close in, roots twist and each blow echoes.

Keep strong rhythmic momentum with tightly controlled percussion and contrasting sections. Include a short moment of reduced instrumentation before the full ensemble slams back in. Realistic ensemble performances, deep acoustic bass, a dry, close acoustic. Seamless loop with sustained combat intensity, no fade-out.

No vocals, no synthesizers, no electronic dance beats, no cheerful folk jig, no cartoonish action melody, no generic epic trailer impacts, no modern drum kit.
```

### 16. `matron` — the Bramble Matron (boss)

- **Length / tempo / key:** 60–90 s · 132 BPM · B Phrygian
- **Structure:** `[Intro - timpani and frame drums] [Main Theme - fierce solo violin] [Break - low strings and drums] [Climax - full orchestra with horns] [Main Theme - violin and timpani]`
- **Motif:** the Gloam

**Prompt:**

```text
Original instrumental cinematic dark fantasy RPG boss battle soundtrack. Dramatic, terrifying orchestral music for a fight against an ancient thorn creature.

Open with thunderous timpani and frame drums, deep French horns and a driving cello and double-bass ostinato in B Phrygian. Introduce a menacing, dark solo violin theme backed by violas, urgent string figures and eerie bowed psaltery, and let the theme develop across the whole ensemble.

The battle feels huge and desperate: a monster as old as the forest, a small hero's heroic struggle and thorns closing in.

Use strong momentum, dramatic harmonic changes and contrasting sections, with one brief reduced passage of low strings and drums before the full orchestra returns. Rich cinematic dynamics, realistic performances, restrained brass. Seamless loop with sustained intensity, no fade-out.

No vocals, no synthesizers, no electronic dance beats, no cheerful folk jig, no cartoonish action melody, no generic epic trailer impacts, no modern drum kit.
```

## Jingles (7, one-shot, no loop)

Jingles end cleanly (no loop) and sit over ducked music, so keep them short and complete. Each is a short orchestral
phrase with one folk soloist; French horns may join in season jingles and `lessonsComplete`. Lengths are suggestions.
Add the shared negatives to every one.

| Cue               | Plays when                 | Length | Prompt                                                                                                                                                                    |
| ----------------- | -------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `morning`         | A new day starts           | 3–5 s  | short morning flourish, a rising solo flute phrase over a soft string swell and harp, bright and hopeful, ends resolved on the tonic                                      |
| `season-spring`   | Spring begins              | 4–6 s  | short spring fanfare, solo violin and wooden flute over a warm string swell and harp, fresh and joyful, D major, a quiet French horn may join, ends resolved on the tonic |
| `season-summer`   | Summer begins              | 4–6 s  | short summer fanfare, solo violin and recorder over a full string swell and a soft frame drum, sunny, G major, French horns may join, ends resolved on the tonic          |
| `season-fall`     | Autumn begins              | 4–6 s  | short autumn fanfare, solo clarinet and violin over warm strings and harp, bittersweet, B minor, ends resolved quietly                                                    |
| `season-winter`   | Winter begins              | 4–6 s  | short winter fanfare, solo wooden flute over harp, hammered dulcimer and a soft string swell, calm and cold, D Dorian, ends resolved quietly                              |
| `lessonsComplete` | Grandpa's lessons finished | 5–7 s  | short proud flourish, solo violin and flute in unison over a string swell with a small timpani roll and French horns, triumphant but cosy, ends resolved on the tonic     |
| `faint`           | The player passes out      | 3–5 s  | short falling phrase, solo cello and violin sliding down over a hushed string bed, soft and dazed, ends quietly                                                           |

Season jingles carry the Rootsong (minor for fall).
