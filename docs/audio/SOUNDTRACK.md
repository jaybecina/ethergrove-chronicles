# Ethergrove Chronicles soundtrack

Every piece of music and every sound in the game, where it plays, and a link to the file. All of it is
original: composed as scores in `apps/web/src/studio/` and rendered with CC0 VSCO 2 samples (see the
[audio spec](../superpowers/specs/2026-10-30-ethergrove-audio-design.md)).

**Listening:** a Markdown file can't play audio inline. Open a link to play the file in your music app (locally)
or to download it (on GitHub). Tracks loop, so play one to its end to hear it return to the start.

## Motifs

| Motif                | Meaning                      | Heard in                                                    |
| -------------------- | ---------------------------- | ----------------------------------------------------------- |
| **Rootsong** (major) | The player, the valley, home | Title, spring, summer, winter, night, three season fanfares |
| **Rootsong** (minor) | Longing, the missing grandpa | Title (opening), fall, rain, the fall fanfare               |
| **Grandpa's theme**  | Elias and the farmhouse      | Grandpa's Kitchen                                           |

## Tracks (they loop)

| Track                 | Plays when                        | Key, tempo                   | Style                                    | Motif                      | Loop | File                                                        |
| --------------------- | --------------------------------- | ---------------------------- | ---------------------------------------- | -------------------------- | ---- | ----------------------------------------------------------- |
| **Ethergrove**        | The title screen                  | D major, 70 bpm              | Orchestral with an ether shimmer         | Rootsong, minor then major | 82 s | [title.m4a](../../apps/web/public/assets/music/title.m4a)   |
| **Seedlings Wake**    | Spring days on the farm           | C major, 96 bpm              | Pastoral orchestral                      | Rootsong on flute          | 80 s | [spring.m4a](../../apps/web/public/assets/music/spring.m4a) |
| **Sunwarm Fields**    | Summer days                       | D major, 108 bpm             | Orchestral with a synth arp and sub bass | Rootsong on horns          | 71 s | [summer.m4a](../../apps/web/public/assets/music/summer.m4a) |
| **Amber Harvest**     | Fall days                         | A minor, 88 bpm, waltz (3/4) | Folk-orchestral                          | Rootsong (minor) on oboe   | 66 s | [fall.m4a](../../apps/web/public/assets/music/fall.m4a)     |
| **Snow on the Roots** | Winter days                       | E♭ major, 66 bpm             | Piano and strings                        | Rootsong on piano          | 73 s | [winter.m4a](../../apps/web/public/assets/music/winter.m4a) |
| **Rain on the Roots** | Rainy and stormy days, any season | D minor, 72 bpm              | Lo-fi                                    | Rootsong (minor)           | 53 s | [rain.m4a](../../apps/web/public/assets/music/rain.m4a)     |
| **Fireflies**         | From 8 pm                         | F major, 62 bpm              | Lo-fi                                    | Rootsong at half speed     | 62 s | [night.m4a](../../apps/web/public/assets/music/night.m4a)   |
| **Grandpa's Kitchen** | Inside the farmhouse              | G major, 74 bpm              | Lo-fi                                    | Grandpa's theme            | 52 s | [home.m4a](../../apps/web/public/assets/music/home.m4a)     |
| **Wandering Wares**   | Sol's cart is open                | B♭ major, 116 bpm            | Playful orchestral                       | —                          | 66 s | [shop.m4a](../../apps/web/public/assets/music/shop.m4a)     |

When two apply, the first in this order wins: title screen, Sol's cart, night, farmhouse, rain, season. So a
storm at night plays **Fireflies**.

## Jingles (play once)

| Jingle               | Plays when                                                | Length | File                                                                          |
| -------------------- | --------------------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| **Morning**          | A new day starts                                          | 7 s    | [morning.m4a](../../apps/web/public/assets/music/morning.m4a)                 |
| **Spring fanfare**   | The season turns to spring (Rootsong in C)                | 9 s    | [season-spring.m4a](../../apps/web/public/assets/music/season-spring.m4a)     |
| **Summer fanfare**   | The season turns to summer (Rootsong in D)                | 9 s    | [season-summer.m4a](../../apps/web/public/assets/music/season-summer.m4a)     |
| **Fall fanfare**     | The season turns to fall (Rootsong in A minor)            | 9 s    | [season-fall.m4a](../../apps/web/public/assets/music/season-fall.m4a)         |
| **Winter fanfare**   | The season turns to winter (Rootsong in E♭, sleigh bells) | 9 s    | [season-winter.m4a](../../apps/web/public/assets/music/season-winter.m4a)     |
| **Lessons complete** | All of Grandpa's lessons are done                         | 7 s    | [lessonsComplete.m4a](../../apps/web/public/assets/music/lessonsComplete.m4a) |
| **Faint**            | The farmer passes out at 2 am                             | 8 s    | [faint.m4a](../../apps/web/public/assets/music/faint.m4a)                     |

## Sound effects

| Sound         | Plays when                       | File                                                                |
| ------------- | -------------------------------- | ------------------------------------------------------------------- |
| Hoe           | The hoe tills the soil           | [hoe.m4a](../../apps/web/public/assets/sfx/hoe.m4a)                 |
| Water         | The watering can waters a tile   | [water.m4a](../../apps/web/public/assets/sfx/water.m4a)             |
| Sickle        | The sickle cuts a weed           | [sickle.m4a](../../apps/web/public/assets/sfx/sickle.m4a)           |
| Chop          | The axe hits a stump             | [chop.m4a](../../apps/web/public/assets/sfx/chop.m4a)               |
| Break         | The hammer breaks a rock         | [break.m4a](../../apps/web/public/assets/sfx/break.m4a)             |
| Swing         | A tool swings at nothing         | [swing.m4a](../../apps/web/public/assets/sfx/swing.m4a)             |
| Harvest       | A crop is harvested              | [harvest.m4a](../../apps/web/public/assets/sfx/harvest.m4a)         |
| Plant         | A seed is planted                | [plant.m4a](../../apps/web/public/assets/sfx/plant.m4a)             |
| Refill        | The can is refilled at the pond  | [refill.m4a](../../apps/web/public/assets/sfx/refill.m4a)           |
| Eat           | The farmer eats                  | [eat.m4a](../../apps/web/public/assets/sfx/eat.m4a)                 |
| Coin          | Gold comes in                    | [coin.m4a](../../apps/web/public/assets/sfx/coin.m4a)               |
| Door          | The farmer goes in or out        | [door.m4a](../../apps/web/public/assets/sfx/door.m4a)               |
| Chime         | A milestone or lesson is reached | [chime.m4a](../../apps/web/public/assets/sfx/chime.m4a)             |
| Deny          | An action isn't possible         | [deny.m4a](../../apps/web/public/assets/sfx/deny.m4a)               |
| Thunder       | Thunder in a storm               | [thunder.m4a](../../apps/web/public/assets/sfx/thunder.m4a)         |
| Step on grass | Walking on grass                 | [step-grass.m4a](../../apps/web/public/assets/sfx/step-grass.m4a)   |
| Step on dirt  | Walking on soil                  | [step-dirt.m4a](../../apps/web/public/assets/sfx/step-dirt.m4a)     |
| Step on wood  | Walking in the farmhouse         | [step-wood.m4a](../../apps/web/public/assets/sfx/step-wood.m4a)     |
| Step on snow  | Walking in winter                | [step-snow.m4a](../../apps/web/public/assets/sfx/step-snow.m4a)     |
| Menu move     | Moving through a menu            | [menuMove.m4a](../../apps/web/public/assets/sfx/menuMove.m4a)       |
| Menu confirm  | Choosing a menu item             | [menuConfirm.m4a](../../apps/web/public/assets/sfx/menuConfirm.m4a) |
| Menu back     | Closing a menu                   | [menuBack.m4a](../../apps/web/public/assets/sfx/menuBack.m4a)       |

## Changing the music

Edit the scores in `apps/web/src/studio/pieces/`, re-render with `pnpm --filter web studio` (see `AGENTS.md`,
Audio), and update this guide. A test (`apps/web/src/audio/soundtrackDoc.test.ts`) fails if a shipped file is
missing here or a link points to a file that isn't shipped.
