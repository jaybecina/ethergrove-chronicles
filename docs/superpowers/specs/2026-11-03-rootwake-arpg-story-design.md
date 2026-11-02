# The Rootwake, ARPG cut: Story Bible and Action-RPG Design Spec

**Status:** approved, story locked (§14) · revision 3 (after the third ChatGPT review, §11.5) · **Date:** 2026-11-03 · **Author:** Jay Becina (with Claude) · **Builds on:**
`2026-10-29-ethergrove-chronicles-design.md` (the October spec) · **Replaces:** its §1.2 "life-sim loop is the
heart" rule, §4 (story bible) and §5 (gameplay loop); amends §5.2, §5.3, §6.2, §6.5 and §9 as listed in §12

This spec turns Ethergrove Chronicles into an **action RPG first**. It keeps the Rootwake's emotional core
(Grandpa Elias, his son Victor, the sleeping Rootsinger Isel) and the existing Deep order and seasons, and adds
a mandatory faction choice, a legendary Grandpa, a human antagonist, a compact open valley and multi-day
expeditions. The decisions in §1.2 were approved by the owner in chat on 2026-11-03, and the owner approved the
whole spec and locked the story on the same day (§14).

Like the October spec, this is a design target: each later part gets its own spec and plan, which may tune the
numbers marked **(draft)** but not the story, names or rules. **MUST** marks an approved rule or exact text: do
exactly that. **SHOULD** marks a recommendation a later spec may change with a reason. **(draft)** marks a number
to tune in playtests.

---

## 1. Goal

The owner wants Ethergrove to play as an action RPG in the spirit of Outward: monsters, dungeons, bosses, an
invasion of dark forces, good allies, an open world, an overpowered retired Grandpa, and a **mandatory choice
between a light and a dark side** that changes your journey (the principle of _Battle Realms_' Kenji's Journey,
not its content). The owner had ChatGPT analyse the story; this spec keeps what held up and replaces what did
not (§11).

### 1.1 Success criteria

1. A reader can name the three pillars (§2), both factions and how the choice is made (§5), the antagonist
   (§4.6) and all four endings (§6) without reading anything else.
2. Every later part (§13) can be specced from this document without asking the owner the story, names or
   rules again.
3. Every new proper noun passed a web search for clashes with existing games on 2026-11-03 (§11.3).
4. Faction-only content stays inside the 30% budget in §10; nothing in this spec needs two separate maps.
5. The vertical slice (§13.1) passes its checklist and the owner's playtest before any zone beyond Lowmere Woods
   is built.

### 1.2 Decisions approved by the owner (2026-11-03, do not revisit)

| Decision | Choice |
|---|---|
| Main pillar | **Action RPG first.** The farm is the home base. Reverses the October spec §1.2 "life-sim loop kept as the heart". |
| Factions | **The Rootwardens vs the Lantern Guild.** Not ChatGPT's Verdant Accord / Umbral Dominion. |
| How you choose | By a **deed** during the Siege of Lowmere on Skyglass night (§5.2), not a menu. Permanent. |
| Antagonist | New character **Guildmaster Maren Ashcombe** (§4.6). Not ChatGPT's "Hollow King". |
| Grandpa | **Elias Hale, the Rootblade**: the greatest Rootwarden, revealed by clues; teaches five **Rootblade forms** through his journal pages; the Hollow Warden fights with his perfected style (§4.5). |
| Cold open | About 3 playable minutes as Elias on the night he went down, before the unchanged letter and tutorial (§7). He is old, and still unstoppable: the retired legend at full strength. |
| World | A **compact open valley** of six hand-made zones, not kingdoms (§8). |
| Expeditions | **Multi-day**, with a bedroll and camp spots (§9). |
| Platforms | Web (desktop and phones), the Mac and Windows apps, **and Steam** (owner, 2026-11-03; §13.2). |
| Unchanged | Real-time Outward-style combat, never turn-based; XP levels 1–50; 2.5D; no town building; no monster taming; no children; the farm loop and tutorial from Part 1. |

## 2. Pillars

| Weight | What | Why it is there |
|---|---|---|
| **Primary** | Real-time combat, the Deeps, bosses, the open valley, levels, skills and gear | What the player does most of the time |
| **Secondary** | The invasion, the faction war, companions, story choices | Why the fighting matters and changes |
| **Supporting** | Farming, cooking, crafting, friendship, romance, festivals | What the player is protecting, and what feeds expeditions |

**The farm's job.** Every supporting system pays into an expedition:

- **Cooking:** farm meals give the strongest food buffs in the game. Basic cooking ships in the vertical slice
  (§13.1), because expeditions depend on it.
- **Magic crops** (October spec §5.1, unchanged): tonics, oils and salves for delving; Heartvine clears Gloam
  burden (§9.3).
- **Kindlings:** grow stronger when fed magic crops (October spec §4.7, unchanged).
- **Rest:** only your farm bed fully restores Energy and clears all Gloam burden (§9).
- **People:** friends at 4 hearts become companions (§6.3); the spouse waits at home.

A day no longer has a fixed shape. There are **home days** (farm, Lowmere, a short delve) and **expeditions**
(one to three nights out, §9).

## 3. World

### 3.1 Logline

> You take over your missing grandpa's farm in the valley of Ethergrove, learn he was the greatest warden who
> ever lived, and must choose who you'll stand with as the nightmare under the farm wakes.

### 3.2 Terms

All October spec §4.2 terms stay. New or changed:

| Term | Meaning |
|---|---|
| **The Rootblade** | Elias's title among those who remember: the greatest Rootwarden. Also how Hilda speaks of his sword. |
| **Rootwarden blade** | Elias's sword. Found broken in Chapter 1, reforged by Hilda in Chapter 2 (unchanged). |
| **Rootblade forms** | Five sword techniques Elias wrote into his journal (§4.5). |
| **The Rootwardens** | The old order of keepers, revived by Granny Fern. Faction A (§5.1). |
| **The Lantern Guild** | Now led by Guildmaster Maren Ashcombe, with Victor as her captain. Faction B (§5.1). |
| **Gloam burden** | The cost of using the Gloam as a weapon, carried by Guild members (§9.3). |
| **The Gloamscar** | Maren's open dig in the hills east of Lowmere: a raw wound into the roots, and a side shaft into the Heartdeep. |
| **Waystones** | Root stones in the valley that wake when a Rootstone is returned; fast travel (§8.2). |
| **Gloam stage** | How far the invasion has spread, 0–5 (§8.3). |

### 3.3 Premise

- **The player** (one of the two heroes from the creator; never shown an age) receives Grandpa Elias's letter
  and arrives at the overgrown farm. The letter text in October spec §3.3 MUST stay exactly as it is.
- **Grandpa is missing.** A year ago he walked into the Heartdeep under the farm's root cellar and never came
  back. Lowmere thinks he is dead. Granny Fern does not.
- **The Gloam is rising**, and it is not an accident: the Lantern Guild's digging is waking Isel faster than any
  warden can keep her calm.
- **The main questions:** what happened to Grandpa, who was he really, and whose side are you on?

## 4. The story

### 4.1 The past (revealed in play, never in one speech)

1. **About forty years ago**, Elias Hale and Maren Ashcombe were the last two Rootwardens, trained together.
   Elias was the strongest warden the order ever had; the people of the valley called him **the Rootblade**.
2. **Twenty-five years ago, the Long Surge:** the Gloam broke out of the Deeps for three nights. Elias held the
   **Root Shrine** on the farm: had it fallen, every field in the valley would have soured. Maren held the line
   at the **old pier**, where Lowmere's people were escaping by boat. On the third night the pier line broke.
   Eleven people died there, among them **Anna Hale**, Elias's wife, carrying lanterns to the boats. Victor, ten
   years old, watched from a boat. Elias did not leave the shrine.
3. The same night taught them opposite things. Elias: the Gloam is a sleeper's nightmare; calm it, or it comes
   back worse. Maren: every time the wardens wait, someone dies; the Gloam must be ended for good, cut out and
   turned on itself. Her line, used when she tells her side in fall, MUST be: **"Every time we wait, someone
   else's Anna dies."** They split, and Maren founded the **Lantern Guild**.
4. Elias hung up his sword and farmed. Victor grew up believing his father chose a stone over his mother.
   **The player's parent:** Elias's elder child, who left the valley at seventeen, two years after
   the Long Surge, unable to live beside the lake where their mother died. It became a quiet distance, not a feud.
   The parent is alive, lives far away, never appears in the game, and sends one letter in each ending's
   epilogue. The player grew up far from Ethergrove and barely knew Elias, but as a child was the one who wrote
   back to him; Elias kept every letter in a tin in the farmhouse (a Spring Y1 clue). That is why his letter
   (October spec §3.3) comes to the player.
5. Maren recruited Victor at eighteen. She saw her own grief in him, and Elias's son at her side was proof she
   was right. She raised him into her captain. Victor is 35 when the game starts.
6. **A year before the game**, the Guild's digging began waking Isel too fast. Her nightmare took a shape, the
   **Hollow Warden**. Elias walked into the Heartdeep alone to hold it (the cold open, §7).

**The mirror:** the Siege (§5.2) puts the player at the choice Elias faced in the Long Surge: the shrine or the
pier. This time, on either path, nobody dies.

### 4.2 Gloam stages by season

The invasion grows on a schedule tied to the story (exact triggers in §8.3).

| Season | Chapter | Deep | Gloam stage | What the player sees |
|---|---|---|---|---|
| Spring Y1 | 1 | Mossdeep | 1 | Sour patches after storms; Gloamed beasts in the Deeps and the woods at night |
| Summer Y1 (from Mossdeep cleared) | 2 | Cinder Galleries | 2 | Gloamed beasts on every road at night; one elite per zone |
| Summer 25 Y1 | Siege | (Lowmere) | 3 | The Siege of Lowmere and the faction choice (§5.2) |
| Fall Y1 | 3 | Drowned Archive | 4 | Places taken: the Gloamscar fortified, the quarry forge camp held; day patrols |
| Winter Y1 | 4 | Frostvault | 5 | A Gloam storm over the North Pass; Maren's move (§4.6) |
| Spring Y2 | 5 | Heartdeep | 5 | The Hollow Warden, Isel, the final choice |

### 4.3 Chapters

| Ch. | Story beat (both paths) | Rootwarden path | Guild path |
|---|---|---|---|
| 1 | Find Grandpa's lantern and his broken blade on Mossdeep's last floor. Meet Victor and the Guild. Villagers go quiet at Elias's name. | — | — |
| 2 | Hilda reforges the blade: "I never thought I'd hold the Rootblade's sword again." Victor races you to the Slag Colossus. Ends with the Siege (§5.2). | — | — |
| 3 | Read the Veyl archive and learn Isel's name. The Tidewyrm hurts Victor; you may carry him out (unchanged). | Fern sends you to cleanse the Archive's root before the Guild drains it | Maren sends you to secure the Archive's ether before the Rootwardens seal it |
| 4 | Find Elias's last camp and the murals of Elias and Maren holding the old surge. Maren strikes at the camp (§4.6). The way to the Heartdeep opens. | Maren is the enemy commander you finally reach | Maren betrays you (§4.6) |
| 5 | The Heartdeep: find Elias alive, his moment (§4.5), the Hollow Warden, Isel, the final choice (§6). | — | — |

### 4.4 Journal pages

Twelve pages, placed exactly as in October spec §4.4: two in each Deep (ten), one at Lantern Drift, one in
Granny Fern's 6-heart event. What they reveal is unchanged (Isel's nightmare, the wardens' real job, why Elias
went down, Victor). They also tell Elias's side of §4.1, and each Deep's second page ends with a drill sketched
in the margin, "for whoever comes after me", which teaches that Deep's Rootblade form (§4.5). The pages' story
text is otherwise unchanged. Frostvault's second page lies at Elias's last camp (floor 10).

### 4.5 Elias Hale, the Rootblade

**The rule:** Elias is overpowered in the story, but he never solves the player's problem. He cannot leave the
Heartdeep: he is the lid.

**The Rootstone rule:** with all five Rootstones on the farm's Root Shrine, the shrine itself steadies the roots
and holds the nightmare quiet. Without them, only a warden standing in the Heartdeep can. The stones were lost
in the Deeps, guarded by their bosses, so Elias had to stand there himself. Returning all five is what frees
him, and what lets any later warden tend the valley from the farm.

**How the player learns who he was:**

| When | Clue |
|---|---|
| Spring Y1 | Medals and an old training post in the farmhouse; villagers go quiet at his name |
| Chapter 2 | Hilda's line at the reforge (§4.3) |
| The Siege | Gloamed beasts shy from the Rootwarden blade, because they remember who carried it |
| Fall Y1 | Maren tells her side of §4.1; it does not match his journal |
| Chapter 4 | The murals at his last camp |
| Chapter 5 | You find him alive, worn thin after a year holding the nightmare back |

**Rootblade forms.** Reading **both** journal pages of a Deep teaches that Deep's form. Forms are **not**
skills: they use no skill points and **no skill slots**. A learned form is always on and is triggered by a
context input built from the basic moves, so all five work together and on the touch layout's four buttons.
Both factions use all five. Values are **(draft)**; the combat spec fixes them and the exact timings.

| # | Form | Deep | Input | Effect (draft) | Stamina (draft) |
|---|---|---|---|---|---|
| I | **Thornreply** | Mossdeep | Attack within 0.4 s after a successful parry | A counter at 250% weapon damage | 10 |
| II | **Emberline** | Cinder Galleries | Heavy attack while locked on to an enemy 4–8 m away | A lunge to the target, ending in a cut at 150% | 30 |
| III | **Tidebreak** | Drowned Archive | Heavy attack on an enemy that is blocking | Breaks its block and staggers it for 1.5 s | 35 |
| IV | **Rimeguard** | Frostvault | Block and dodge pressed together | For 3 s, blocking costs no stamina and returns 50% of blocked damage | 25 |
| V | **Heartcut** | Heartdeep | Heavy attack on a staggered enemy (a prompt shows) | A finisher at 400% weapon damage | 40 |

The Heartdeep's two pages lie on floors 4 and 9, so Heartcut is learnable before the boss on floor 12.

**The Hollow Warden** is the nightmare that learned Elias's style by fighting him for a year. It wears the
Gloam's copy of his armour and fights with the five forms, faster and harder. Every form the player has learned
is one they can read and counter; each form's telegraph lasts at least 0.7 s (October spec §6.3 boss rule).
The Hollow Warden MUST be beatable with **no** forms learned: it is balanced with zero forms, and each learned
form makes it easier, never possible.

**Elias's moment.** Between the Hollow Warden's phases 2 and 3, a scripted scene (at most 45 s, skippable after
the first viewing): the Warden swells to a size no party could stand against; Elias steps in front of the
player and holds it alone with Rimeguard and Heartcut, then sinks to one knee. The exact lines MUST be:

> **Elias:** Go on. I've held it a year. I can hold it one more breath.

> **Elias:** Now you. Show me what you'd do differently.

Phase 3 then starts with the Warden at 60% of its phase-3 health (draft).

### 4.6 Guildmaster Maren Ashcombe (new character)

- **Who:** Elias's old sword-partner, the other last Rootwarden, founder and Guildmaster of the Lantern Guild.
  Around Elias's age, upright, scarred from the old surge; she carries a Gloam lantern on a staff.
- **What she wants:** no more Annas (§4.1). Not power for its own sake: she believes waiting is what kills
  people, and that the nightmare can only be ended by a warden strong enough to hold it inside herself.
- **What she does:** her Gloamscar dig drives the invasion (§8.3). In winter she plans the **binding**.
- **The binding:** to bind the nightmare into a living body, the binder stands at the heart of the Heartdeep
  holding a Rootstone as an anchor. When Maren moves, the stones stand like this:

| Rootstone | Where it is when Maren confronts the player |
|---|---|
| Verdant, Ember, Tide | On the Root Shrine, **sealed in its ward**: a returned stone can be lifted only by a warden the shrine knows, so Maren cannot take them |
| Rime | In the player's pack, unsealed, at Elias's last camp |
| Heart | In the Heartdeep, inside the nightmare's reach; it cannot anchor a binding against the very nightmare that holds it |

  So the Rime Rootstone is the only anchor she can get.
- **Rootwarden path:** she is the enemy commander from the Siege on. Her lieutenants lead the Guild's day
  patrols in fall.
- **Guild path:** she is your commander, fair and proud of you, until Chapter 4.
- **At the last camp (both paths):** the player reads Frostvault's second page, where Elias writes that a
  nightmare bound into a body only makes a new Hollow Warden. Maren arrives and asks for the Rime Rootstone.
  The player refuses (a story beat, not a choice). On the Guild path she sees the open page, knows the player
  understands what she means to do, and draws; on the Rootwarden path she simply means to take it.
- **Boss fight (both paths):** at Elias's last camp, Frostvault floor 10, right after the Rime Stag. Two
  phases: Rootwarden swordplay with forms I–III, then Gloamfire (§9.4). She is beaten, not killed, and escapes
  without the Rootstone.
- **Between Frostvault and the Heartdeep:** she goes down the Gloamscar shaft alone, without an anchor. That
  night at 22:00 every lantern in Lowmere flickers violet for 10 s and the ground shakes (a scripted world
  event). The next morning Celeste, or a Guild delver if Celeste is not in Lowmere, tells the player that Maren
  went down the shaft.
- **Her end:** on Heartdeep floor 11 her cracked lantern and staff lie in a scorched binding circle. Touching the
  lantern plays a 15 s echo (non-interactive, skippable): Maren tries the binding without an anchor, the
  nightmare pours into her, and the Hollow Warden takes her. Her last line MUST be: **"Elias... you were right.
  It's someone dreaming."** In phase 2 the Hollow Warden also uses her Gloamfire. Both factions learn the same
  truth: the nightmare cannot be owned.

### 4.7 Victor Hale

Victor is a rival on both paths, never the villain. His ending depends on the Chapter 3 rescue (unchanged
rule) and now also on your faction:

| | Carried out in Chapter 3 | Not carried out |
|---|---|---|
| **Rootwarden path** | Turns on Maren at the last camp and fights beside you; fights in the Heartdeep; reconciles with Elias | Stays with Maren at the camp (her phase 2 add); survives; leaves the valley; a letter in the epilogue |
| **Guild path** | Sides with you against Maren; fights in the Heartdeep; reconciles with Elias | Stands with Maren at the camp (her phase 2 add); survives; leaves the valley; a letter in the epilogue |

Victor is not a romance candidate.

**The Guild after Maren falls** (the game continues after every ending, so this MUST hold in the postgame):

| | Victor on your side | Victor gone |
|---|---|---|
| **Rootwarden path** | Victor stops the digging and turns the Guild into Lowmere's lantern-makers and road wardens | The Guild breaks up; the Lantern Camp stands empty by Spring 1 Y2 |
| **Guild path** | Victor becomes Guildmaster; you are his captain | You become acting Guildmaster |

## 5. The factions and the choice

### 5.1 The two factions

Both are right about something. Neither is evil.

| | **The Rootwardens** | **The Lantern Guild** |
|---|---|---|
| Leader | Granny Fern (Elias's way) | Maren Ashcombe, with Victor as captain |
| Belief | The Gloam is a sleeper's nightmare. Calm it; heal what it touched. | The Gloam is a weapon. Burn it out, or turn it on itself. |
| Looks | Green, bark and lamplight; leather and woven wood | Soot, brass and violet Gloamfire; plate and lantern-glass |
| Headquarters | The Root Shrine on your farm and Fern's cottage | The Lantern Camp at Quarry Hills |
| Faction tree | **Rootsong** (§9.4) | **Gloamfire** (§9.4) |
| Cost of the path | Slower, defensive, needs Kindlings and Ether | Gloam burden (§9.3); Fern's trust |
| Zone quests after the Siege | Restore and heal (§8.1) | Hold and harvest (§8.1) |

**Who the Rootwardens are now:** Granny Fern (keeper of the lore, not a fighter), the player as the first sworn
warden in a generation, and friends who help through faction quests (Rowan scouts, Mira brews, Sol reads the Veyl
songs). No army and no new NPCs. The **Lantern Guild** is the opposite: an existing order with a camp, paid
delvers, lieutenants and equipment.

**Both sides make their case before the Siege** (two story scenes in Chapter 2, neither optional):

- **"The Old Oath":** when Hilda reforges the blade, Fern takes the player to the Root Shrine and tells the
  warden's way.
- **"A Captain's Offer":** right after the Slag Colossus, Victor arrives late to the boss room, then walks the
  player to the Lantern Camp and offers them a place.

### 5.2 The Siege of Lowmere (the choice)

**When:** at 20:00 on the first Skyglass night (Summer 25) after the Ember Rootstone is returned. If the Ember
Rootstone is returned after Summer 25 of a year, the Siege happens at 20:00 three days after it is returned,
as a lake night with no festival. The Drowned Archive does not open until the Siege is done (amends October spec
§5.2).

**Warning:** that morning, Granny Fern visits the farm at 07:00. Her line MUST be:

> **Fern:** Tonight you'll have to choose what kind of warden you are.

The game saves at the end of the night before, as usual. There is no other save until the Siege ends.

**The scene:**

1. Skyglass begins at the lake. At 20:30 a root under the lake cracks (Maren's dig) and the Gloam surges up.
2. **Defence:** an action set piece in Lowmere: three waves of Gloamed beasts (draft: 8, 10, then 6 with one
   elite). Villagers shelter in the clinic.
3. **The split:** two things fail at once. Two markers appear; there is no timer and no fail state.
   - **The Root Shrine on your farm** is failing. Fern calls: "Hold the blade to the stone. Steady now. Breathe
     with it."
   - **Victor's squad is trapped at June's pier.** Victor throws you a Gloam lantern: "Take it! Burn them off
     the pier!"
4. **The deed:** at each marker the prompt names what the deed means: **"Hold the shrine (Rootwardens)"** or
   **"Take the lantern (Lantern Guild)"**. Committing takes holding interact for **2 s** while a ring fills;
   letting go cancels with nothing lost, and the player may still go to the other marker. When the ring fills, a
   short commitment scene plays (the player's hand on the stone, or closing on the lantern). There is no menu and
   no confirmation dialogue: the hold is the confirmation. The combat spec gives the accessible alternative to
   holding.

| | **Shrine → Rootwarden** | **Lantern → Guild** |
|---|---|---|
| What happens | The nightmare calms, the Kindlings flare, the surge sinks back | You burn the beasts out; the pier stands; nobody at the pier dies |
| The cost | The pier burns. Victor's squad is hurt. | 12 farm tiles become Gloamed soil (draft); your Kindling dims (its light and heal are halved until it is fed 5 Heartvine) |
| The line that closes it | **Victor:** You chose a stone over people. Just like him. | **Fern:** That's how the Veyl began. |
| And the other side | **Fern:** The valley's still green because of you. | **June:** My mother's pier is still standing. Thank you. |

5. The scene ends with the player asleep at home; the night saves, so the choice is permanent.

**No one dies in the Siege on either path.** Victor's squad is hurt and recovers by Fall 1 Y1. The closing lines
are the characters' opinions, not the game's verdict: each path gets one line against it and one for it.

**After the Siege:** no Siege cost is permanent, and each has a stated fix.

- **Rootwarden path:** June's pier is rebuilt through a fall quest with June; Victor's squad recovers by Fall 1 Y1.
- **Guild path:** each of the 12 Gloamed farm tiles clears when a magic crop grows on it (October spec §5.1); the
  Kindling recovers when fed 5 Heartvine.
- **Both paths:** Skyglass from Year 2 on holds a lantern memorial for the Siege.

### 5.3 What the faction changes, and what it doesn't

- **Changes:** the faction tree, armour sets, headquarters, faction quests, zone objectives (§8.1), some
  dialogue, Maren's and Victor's arcs, the endings.
- **Doesn't change:** which villagers are your friends or romance candidates, the Deeps, bosses, journal pages,
  Rootblade forms, festivals.
- **Two exceptions:**
  - **Fern:** on the Guild path, friendship with Fern rises at half speed until an ending.
  - **Celeste** (Guild cartographer, romance candidate): on the Rootwarden path she leaves the Guild for you if
    she is at 6 hearts or more on Winter 1 Y1; otherwise she follows Maren until Maren falls, then returns to
    Lowmere.

## 6. Endings and companions

### 6.1 Four endings

The Wake/Bind choice (October spec §4.6) stays and is made at the end of the Heartdeep. Your faction decides how
it plays out. The game continues after every ending.

| | **Wake Isel** | **Bind Isel** |
|---|---|---|
| **Rootwardens** | **The Rootwake.** The Undergrove fully wakes; magic crops grow in every season; the Gloam fades (Gloam stage 0); Isel comes to live in Lowmere. | **The Last Rootwarden.** Isel sleeps another generation; you take Elias's post; he retires to the farm. With all five Rootstones on the shrine (§4.5), the binding holds from the farm, so you keep exploring; once a season you renew it with a short rite at the Heartdeep's heart. Gloam stage 1. |
| **Lantern Guild** | **The Lantern's Debt.** Isel wakes free and her nightmare ends. But the Gloam the Guild drew out before she woke, in its lanterns and in you, is no longer her dream, so waking her cannot end it. You keep a permanent violet scar along your sword arm and the Gloam burden rules (§9.3); you become the valley's sword against what remains. The Guild (Victor's, or yours if he left; §4.7) stops digging. Gloam stage 1. | **The Gloamlit Age.** The bound nightmare lights the Guild's lanterns; the valley prospers and magic crops grow all year; Fern warns that this is how the Veyl fell. Gloam stage 2, kept off the roads by Guild patrols. Sequel hook. |

Each ending adds an epilogue for the spouse (if married), Victor, Elias and each romance candidate.

### 6.2 Romance (unchanged except as stated)

The six candidates and the flow in October spec §4.7 stay, plus the hero the player did not pick in the creator,
who is a companion and the **seventh romance candidate** (owner decision, 2026-11-02).

### 6.3 Companions

- **One companion slot.** Any friend at **4 hearts or more** can be asked along at their daily spot between
  06:00 and 12:00. They stay until you next sleep at home (camp nights included).
- **Downed companions** leave the fight, recover at the clinic, and can be asked again the next day.
- **Kits at launch:**

| Companion | Role | Kit (draft) |
|---|---|---|
| Rowan | Ranged, tracker | Bow; marks one elite, which takes +15% damage for 10 s |
| Mira | Healer | When you are below 50% HP, heals you 20% of max HP; 30 s cooldown |
| Theo | Tank | Greataxe; taunts the nearest enemy for 6 s every 20 s |
| Victor | Duelist | Sword; uses Thornreply. Only while he is on your side (§4.7). |

- **One framework:** every companion uses the same follower, targeting and recovery AI; a kit is data (weapon,
  role, one ability, timings). Kits are built in the order of §13.
- **Later kits** (their own part): June (spear, water routes), Celeste (staff, reveals the floor map), Sol
  (songs that buff), the other hero (sword and shield).
- The spouse uses their own kit. The October spec's "once a day in a Deep" rule is replaced by this section.

## 7. The cold open: "One Year Before"

**When:** on **New Game**, before the existing intro letter and tutorial, which MUST stay unchanged.

**Skipping:** the first time, it can be skipped from the pause menu ("Skip prologue"). After it has been seen once
on this device, a "Skip" button shows from the first frame. "Seen" is kept in **settings**, not in `GameState`,
so no save migration is needed.

**Beats (target 3 minutes, at most 5):**

1. Night, one year before. Elias, white-haired and unbowed in his old Rootwarden armour, opens the root
   cellar. He is a grandfather, not a young man: the point is that the retired legend is still overwhelming. Line: **"Hold on, little lights. I'm coming down."**
2. **Fight 1:** a root corridor, 6 Gloamed burrowers. Prompts teach light attack, dodge and parry.
3. **Fight 2:** a wide chamber, 8 burrowers and 2 Gloamed brutes. One prompt teaches Thornreply; Emberline and
   Heartcut work but are not prompted. The cold open shows Elias's strength; the tutorial and Mossdeep teach the
   player's own combat. Line after the fight: **"You've grown, haven't you. So have I."**
4. **The end:** the chamber's far wall breathes; a vast shape stands up in the dark. Elias draws.
   Line: **"Not tonight. Not while I can stand."** Cut to black. Title card: **One year later.**
5. The existing letter and tutorial begin.

**Elias's kit in the cold open:** the October spec's moves plus forms I, II and V; 300 stamina; he cannot drop
below 1 HP. Nothing carries over to the player's save. Every move works on keyboard, gamepad and touch.

## 8. The open valley

### 8.1 Zones

Six hand-made zones. The Deep entrances stay where the October spec put them. Walking times are from the farm
gate in in-game minutes **(draft)**.

| Zone | Walk | Deep inside | Elite (draft) | After the Siege: Rootwarden | After the Siege: Guild |
|---|---|---|---|---|---|
| Farm and Lowmere | 0 | Heartdeep (root cellar) | none: the safe base | HQ: Root Shrine | — |
| Lowmere Woods | 20 | Mossdeep (old well) | **Mossmaw**, a Gloamed bristleboar | Clear the Gloam nests | Harvest the nests for Gloam |
| Lakeshore and old pier | 40 | Drowned Archive (lake bed) | **Stillwing**, a Gloamed heron | Rebuild June's pier | Hold the pier as a Guild dock |
| Quarry Hills | 60 | Cinder Galleries (quarry mine) | **Cinderhide**, a Gloamed rock hound | Reseal the burst veins | HQ: the Lantern Camp; hold the forge |
| The Gloamscar | 90 | none (the open dig) | **Slaglight golem**, a runaway Guild construct | Heal the scar | Fortify the dig |
| North Pass | 120 | Frostvault | **The Rimefang pack** (alpha + 3) | Track Maren's caravan | Escort Maren's caravan |

- Each elite appears from Gloam stage 2, respawns once per season, and drops one unique crafting material.
- Each zone has **two camp spots** (§9.1) and at least one optional cave or ruin (the zone's own spec).
- **Environment kits:** zones SHOULD be built from shared kits (forest, village, quarry, lakeshore, snow) plus a
  Gloam-corrupted variant of each. The Gloamscar is built from the quarry kit and its corrupted variant and
  borders Quarry Hills; it stays its own zone because the story treats it as a place.

### 8.2 Travel

- No fast travel at the start. **Waystones:** returning a Rootstone to the Root Shrine wakes the waystone in that
  Rootstone's zone: Verdant → Lowmere Woods, Ember → Quarry Hills, Tide → Lakeshore, Rime → North Pass. The
  Root Shrine on the farm is a waystone from the start.
- **Hub and spoke:** a woken waystone connects only to the Root Shrine. From any woken waystone you can travel
  home, and from home to any woken waystone; there is no zone-to-zone hop. A trip costs **1 in-game hour**
  (draft) and works at any hour. Home is always one trip away; the field is still walked.
- The Gloamscar gets a waypoint when its faction quest is done: a cleansed waystone (Rootwarden) or a lantern
  lift (Guild).

### 8.3 Gloam stage rules

`gloamStage` is an integer 0–5 in the core state (the invasion part adds it with a save migration).

| Stage | Set when | Night (20:00–05:00) | Day |
|---|---|---|---|
| 1 | New game | Gloamed beasts in Lowmere Woods only | Normal animals |
| 2 | Mossdeep cleared | Gloamed beasts on every road; elites appear | Normal animals |
| 3 | The Siege starts | (the Siege) | — |
| 4 | The Siege ends | As stage 2, packs larger (draft +50%) | The other faction's answer on the roads (below); Gloamed packs by day; animals flee the woods toward the farm fences |
| 5 | Winter 1 Y1, or the Rime Rootstone is returned, whichever is first | As stage 4 | Gloam storm over the North Pass |

Endings set the post-game stage (§6.1). "Animals flee" is a spawn-table change, not a simulation.

**The other faction on the roads (stage 4 on):**

- **Rootwarden path:** **Guild patrols**, Maren's delvers led by her lieutenants, fight you on the roads to the
  Gloamscar and the Quarry Hills.
- **Guild path:** the Rootwardens have no army (§5.1), so there are **no patrols**. Fern wakes **rootwalls**,
  walls of thorn across the roads into Guild sites. They block and never attack; you burn through with
  Lanternburst or Ember oil, or go round. Fern's friends never fight you.

## 9. Expeditions

### 9.1 Camping

- **Bedroll:** sold at the Lowmere general store for 300 gold (draft) from the start of the game.
- **Camp spots:** two per open zone (§8.1) and every Deep checkpoint stone (every 4 floors).
- **Sleeping at a camp** saves the game, restores HP and Stamina fully, restores Energy to 60% (draft), and
  removes 20 Gloam burden. The next day starts at 06:00.
- **Ambush:** at Gloam stage 2 or higher, an open-zone camp spot can be ambushed **at most once per
  expedition** (an expedition ends when you sleep in your farm bed). When an ambush is possible, the camp spot
  shows fresh Gloam tracks before you lie down. The chance is 25% (draft) of a pack attack at 03:00, and you wake
  into the fight; a lit campfire (1 wood) halves it. Deep checkpoint stones are root-warded and never ambushed.
- **Passing out:** if 02:00 arrives while you are away from home and not asleep at a camp, you collapse and wake
  at Doc Aldous's clinic, losing half the loot picked up since you last slept (the October spec §6.3 Deep rule,
  now valid everywhere). Only ordinary materials, ore and consumables can be lost. **Never lost:** gold, equipped
  gear, quest items, journal pages, Rootstones and elite unique materials.

### 9.2 The farm while you are away

Part 1's rules already suit expeditions (verified in `packages/core/src/systems/day.ts`): crops grow only on days
they were watered and never die when dry, so a trip costs growth days, not a harvest; rain and storms water the
fields. Bare tilled soil left dry may revert to untilled ground. No change is needed.

### 9.3 Gloam burden (Guild path only)

- A number from **0 to 100**, shown as a violet ring around the HP bar.
- **Gains:** each Gloamfire skill use adds the burden in its row of §9.4.
- **Effects:**

| Burden | Effect |
|---|---|
| 0–29 | None |
| 30–49 | Violet veins on your hands and blade; the ring pulses (a warning only) |
| 50–79 | Gloamed enemies notice you from 50% further away |
| 80–99 | Your Kindling's light radius and heal are halved. It still reveals hidden doors, so no path is ever blocked. Does not stack with the Siege dimming (§5.2); the stronger applies. |
| 100 | Gloamfire skills are locked until the burden falls to 80 |

- **Predictable:** each Gloamfire skill's tooltip shows its burden, and the ring marks 30, 50, 80 and 100, so the
  player can count how many uses they can afford.
- **Clearing:** sleeping in your farm bed sets it to 0; camping removes 20; a Heartvine salve removes 40.
- Burden never lowers max HP. (This is deliberate: it keeps the mechanic clear of Outward's Corruption.)

### 9.4 Faction skill trees

A **fourth skill tree** that depends on your faction, beside Blade, Warden and Ether (October spec §6.2). Each
skill has ranks 1–3, one skill point per rank, so maxing everything would take 48 points.

**Skill points (amends October spec §6.1):** one at every even level (25 by level 50) and one for each Deep
boss's first defeat (5): **30 in all (draft)**. That masters about two trees with a dip into a third, so builds
differ (a Rootwarden duelist, an Ether caster, a Gloamfire lifestealer). **Respec** at the Root Shrine at any time
for 100 gold × level (draft); the faction tree stays locked to your faction.

| Rootsong (Rootwardens) | Effect (draft) | Ether (draft) |
|---|---|---|
| **Rootbind** | Roots hold one enemy in place for 2 s | 8 |
| **Kindling Shield** | Your Kindling absorbs the next hit within 10 s | 10 |
| **Mending Song** | Heals you and your companion 3% of max HP per second for 6 s | 12 |
| **Shrineward** | A 5 m circle for 8 s: Gloamed enemies inside are slowed 30% and take 20% more damage | 15 |

| Gloamfire (Lantern Guild) | Effect (draft) | Ether (draft) | Burden (draft) |
|---|---|---|---|
| **Gloam Brand** | Burns one enemy for 6 s; you heal 30% of the damage dealt | 4 | +10 |
| **Lanternburst** | A 4 m blast of Gloamfire around you | 6 | +15 |
| **Hungering Edge** | For 8 s, your weapon heals you 15% of damage dealt | 4 | +12 |
| **Nightstride** | Dash 5 m through enemies; untouchable while dashing | 3 | +8 |

### 9.5 Resources

Five meters, each with one job. No other meter may be added without a spec.

| Resource | Pays for | Max | Refills |
|---|---|---|---|
| HP | Staying alive | 100, +8 per level | Food, salves, Mira, Mending Song; full on sleep or camp |
| Stamina | Attacks, dodge, block, Rootblade forms, running in Deeps | 100, +3 per level | 30 per second after 0.8 s unspent (October spec §6.3) |
| Ether | Ether-tree and faction skills | 30, +2 per level | 1 per second after 3 s without casting (draft); Moonflour +30 (draft); full on sleep or camp |
| Energy | Farm tools and mining swings | Part 1 value | Sleep at home; 60% at camp (§9.1) |
| Gloam burden | Nothing: it is the cost of Gloamfire (Guild only) | 100 | §9.3 |

## 10. Production budget

**70% shared, 30% faction-only.** Both factions use the same six zones, five Deeps and all bosses.

| Faction-only content (per faction) | Count (draft) |
|---|---|
| Headquarters | 1 (the Rootwarden one reuses the farm's Root Shrine) |
| Faction quests | 12 |
| Faction skill tree | 1 (4 skills) |
| Armour sets | 4 (one per Deep tier, levels 10 / 20 / 30 / 40) |
| Zone objectives | 5 (§8.1) |
| Siege outcome, Maren and Victor scene variants | as §4.6, §4.7, §5.2 |
| Ending | 2 of the 4 |

**Reuse rules (SHOULD):** one humanoid rig and shared base animations for every human (player, villagers,
Elias, Maren, companions); enemies in families with variants (size, colour, one new move); each faction's four
armour tiers are variants of one base set (trim, colour, added pieces). Claude can write the code, quests,
dialogue and tests quickly; it cannot model, rig or animate characters, so new art stays the slowest cost.

**New art the commissioned artist and environment work must cover:** Elias (one model: rested in the cold open, worn in the Heartdeep); young Elias and Maren for the Frostvault murals (2D paintings, not models); Maren;
Gloamed burrower and brute; four zone elites and the Slaglight golem; the Gloamscar zone; the Lantern Camp; camp
spots; two faction armour lines.

**Playtime targets (draft, replaces October spec §6.5):**

| Player | Hours | Finishes |
|---|---|---|
| Rushing the story | 25–30 | One faction, five Deeps, one ending |
| Typical | 40–50 | Story, elites, a good farm, a few friendships, level 30–35 |
| Completionist | 100–120 | Both factions (two playthroughs), all four endings, level 50, all five forms, every elite |

## 11. Review of the ChatGPT analysis, and originality

### 11.1 First review (the story analysis): what was kept and what was not

| ChatGPT idea | Here |
|---|---|
| Keep Elias / Victor / Isel as the core; Isel is tragic, not evil | Kept |
| Legendary Grandpa, discovered through clues, who can't solve the plot | Kept, and tied to combat (§4.5) |
| Staged invasion; monster migration; dangerous roads | Kept as Gloam stages (§8.3) |
| Faction × Wake/Bind endings | Kept (§6.1) |
| 70/30 shared vs faction content | Kept (§10) |
| Farm as home base | Kept (§2) |
| Verdant Accord vs Umbral Dominion | Replaced by the existing Rootwardens vs Lantern Guild |
| "The Hollow King" | Rejected: a generic dark lord over a better mystery; the name clashes with the Hollow Warden and is close to _Hollow Knight_. Replaced by Maren. |
| The dark faction controls monsters | Rejected: monster taming is excluded (October spec §4.9) |
| Seven regions, kingdoms, a Blighted Expanse | Cut to six valley zones (§8) |
| "Fifth Rootstone undefined", "Deeps need structure", "timeline inconsistent" | Not real problems: the October spec already defines them, and the novel agrees with it |

### 11.2 Second review (of this spec): what was true

Every claim was checked against this spec, the October spec and `AGENTS.md`. ChatGPT's own follow-up withdrew
its scope cuts once it heard that Claude builds the game, so the full scope stays.

| Claim | Verdict | Change |
|---|---|---|
| Too much for one developer: cut romances, faction quests, companions, caves, playtime | Withdrawn by ChatGPT itself | Scope kept. Its true core, that art is the slow cost, became the reuse rules (§10) |
| Build a vertical slice first; features pass quality gates | True | §13 milestones and the §13.1 checklist |
| Put faction state in the save early | True | Milestone M2 |
| Cooking must come before expeditions | True: cooking sat in the last farm part | Basic cooking in the slice (§2, §13.1) |
| A 1 s hold could lock the campaign by accident | True | A labelled 2 s hold that cancels on release (§5.2) |
| Introduce both factions before the Siege | True: only Fern's warning existed | Two Chapter 2 scenes (§5.1) |
| No innocent deaths; closing lines are not the verdict | Already true; now stated | "No one dies" rule and a line for each side (§5.2) |
| The revived Rootwardens are undefined | True | §5.1 |
| Maren needs an emotional motive | Partly: §4.1 had it | Sharpened with the Long Surge and her line (§4.1) |
| Why Maren attacks, how she reaches the Heartdeep, her fate | True gaps | The binding's anchor, the lantern event, the echo (§4.6) |
| What happens to the Guild after Maren | True gap | §4.7 table |
| Anna's death, Victor's age, why he blames Elias | Partly: the death was stated, the age was not | §4.1, plus the shrine-or-pier mirror with the Siege |
| Five forms but at most four skill slots | True | Forms are context inputs with no slots (§4.5) |
| The Hollow Warden must be beatable without forms | True | MUST rule (§4.5) |
| The cold open teaches too much | True | One prompt (§7) |
| Drop touch because the game is for Steam | **False** | The game runs in browsers on desktop and phones and as Mac/Windows apps; `AGENTS.md` requires touch for every flow. Kept. |
| 49 points max every tree | True | 30 points and respec (§9.4) |
| Burden disables the Kindling | True, and worse than stated: Kindlings reveal hidden doors (October §4.7) | Halved, never blocking (§9.3) |
| Ether refill is undefined | True: the October spec gives max Ether only | §9.5 |
| Merge the Gloamscar into Quarry Hills | Partly | Built from the quarry kit; stays its own zone, as the owner approved six (§8.1) |
| "Two optional caves per zone, 12 in all" | **False** | The spec says at least one per zone |
| Waystones are too cheap | Partly | Hub and spoke, 1 hour (§8.2) |
| A 25% ambush on every camp is irritating | True | Once per expedition, with a warning (§9.1) |
| Passing out can lose rare items | Partly: gold and gear were already safe | Quest items, pages, Rootstones and elite materials now safe (§9.1) |
| Use a recoverable backpack instead | Not adopted | The never-lost list fixes the frustration without a new system |
| Guild + Wake contradicts "the Gloam fades" | True | Explained (§6.1) |
| §1.2 falsely claims owner approval | **False** | The owner approved each row in chat on 2026-11-03. The header now says the rest is proposed, and MUST/SHOULD/(draft) are defined. |
| The October spec was not cross-checked | Fair for ChatGPT, which did not have it | Done in §11.4 |
| Mossdeep with 3–5 floors in the slice | Not adopted | The October spec has 8 (draft); the slice spec may tune it |

### 11.3 Originality check

| Kept: shared genre mechanics (not ownable) | Removed or avoided |
|---|---|
| A mandatory faction choice that changes the campaign | _Battle Realms_' scene (saving or killing peasants), clans, names |
| Factions with their own quests; expeditions; camping; no early fast travel | Any Outward name, place, faction, item or its Corruption rule (Gloam burden never lowers max HP) |
| A playable flashback cold open | — |
| Corruption-style costs for dark power | — |
| | "First Blade" as Elias's title: clashes with _Assassin's Creed Odyssey_'s "Legacy of the First Blade". He is **the Rootblade**. |

New names searched on 2026-11-03 with no game clash found: **Rootblade**, **Maren Ashcombe**, **Gloamscar**,
**Gloamfire**. The "Gloam" prefix is shared with a few indie titles (_Gloamvault_, _Gloamryn_, _Gloamrift_); it
was already canon and is a common English word, so it stays. The later parts MUST search any further new name
the same way.

### 11.4 Continuity check against the October spec (done 2026-11-03)

| Item | October spec | This spec |
|---|---|---|
| Five Rootstones, the fifth is Heart | §4.5 | Unchanged |
| Twelve journal pages: two per Deep, Lantern Drift, Fern's 6-heart event | §4.4 | Unchanged placement; Frostvault's second page fixed at the last camp (§4.4) |
| Deep order, floors, levels and opening dates | §5.2 | Unchanged, plus the Siege gate for the Drowned Archive (§5.2) |
| Victor's Chapter 3 rescue decides his finale | §4.5 | Kept, extended by faction (§4.7) |
| Hollow Warden: Grandpa's armour, his moves, three phases | §5.3 | Kept; the moves are the five forms (§4.5) |
| Kindlings fight, light, heal and reveal hidden doors; no farm chores | §4.7 | Kept; burden never blocks hidden doors (§9.3) |
| Grandpa's letter text | §3.3 | MUST stay exact (§3.3) |
| Falling in a Deep: clinic, half the delve's loot | §6.3 | Extended to the valley, with a never-lost list (§9.1) |

### 11.5 Third review (of revision 2)

| Claim | Verdict | Change |
|---|---|---|
| "The other Rootstones are on the shrine" is wrong: Heart is still in the Heartdeep; and why can't Maren take a shrine stone? | True | A Rootstone table and the shrine's ward (§4.6); also why the Heart stone cannot anchor her binding |
| The player's parent needs a decision: why they left, alive or not, why Elias wrote to the player | True | Written in §4.1; approved by the owner |
| Bind makes the player the Rootwarden; how does the game continue? | True | The Rootstone rule (§4.5): the shrine holds the binding; a seasonal rite (§6.1). It also explains why Elias was trapped. |
| On the Guild path, "patrols of the enemy faction" contradicts "the Rootwardens have no army" | True | Rootwalls instead of patrols (§8.3) |
| The Siege costs need recovery systems | Mostly there already: June's pier quest, 5 Heartvine for the Kindling, and magic crops clearing Gloamed soil (October §5.1) | Gathered into one list (§5.2) |
| Dialogue, quest scripts and page text are not written | True, by design | Stated in §14 |
| Freeze the story once approved | Sound process | Story lock (§14) |
| Settle Steam, given "your Steam-focused direction" | The owner's call: the game today is web plus Mac/Windows apps | The owner chose Steam (§13.2) |

## 12. Changes to the October spec

| October spec | Change |
|---|---|
| §1 Goal, §1.2 | "Harvest Moon life-sim loop kept as the heart" becomes "action RPG first, farm as home base" (§2) |
| §4.1 Logline | Replaced by §3.1 |
| §4.2–§4.4 | Kept, with the additions in §3.2 and §4.4 |
| §4.5 Chapters | Replaced by §4.2–§4.3 |
| §4.6 Endings | Replaced by §6.1 |
| §4.7 Cast | Kept, plus Maren (§4.6), Elias's past (§4.1), Victor's matrix (§4.7), the seventh romance candidate and companions (§6.2–§6.3) |
| §4.8 Festivals | Kept; Skyglass Y1 becomes the Siege, and later Skyglasses hold a memorial (§5.2) |
| §4.9 Originality | Extended by §11.3 |
| §5 Gameplay loop | Replaced by §2 and §9 |
| §5.2 Deeps | Drowned Archive also needs the Siege done (§5.2) |
| §5.3 Bosses | Hollow Warden per §4.5; Maren added at Frostvault floor 10 (§4.6) |
| §6.1 Levels and XP | Skill points: one per even level plus one per Deep boss, 30 in all (§9.4) |
| §6.2 Skill trees | Plus the faction tree (§9.4); Rootblade forms sit outside the trees and slots (§4.5) |
| §6.3 Combat | Unchanged, plus the form inputs (§4.5) and Ether refill (§9.5) |
| §6.5 Playtime | Replaced by §10 |
| §9 Roadmap | Replaced by §13 |

## 13. Roadmap: milestones

Build in this order. Each milestone gets its own spec and plan, and ends at a **quality gate**: the automated
checks in `AGENTS.md` pass, and the owner plays it and signs off on how it feels. Claude builds fast; the gate is
there because code that works is not yet a game that is fun. The engine question (web three.js or the Godot
proof's F1) is separate and does not change this order.

| Milestone | Content | October parts |
|---|---|---|
| **M1 Vertical slice** | The §13.1 checklist | 3, 4, part of 5 |
| **M2 Frameworks** | Skill trees and respec; Rootblade forms; a data-driven quest, dialogue and branching framework; journal pages; the companion framework with Rowan and Mira; enemy families as data; **the faction, `gloamStage` and Gloam burden fields in the save, with migrations, even though their content comes in M4**; the cold open | rest of 5 |
| **M3 The valley** | Lakeshore, Quarry Hills, the Gloamscar, the North Pass overworld; environment kits; waystones; camping; elites; Gloam stages 1–2; Theo's kit | 6 |
| **M4 The branch** | Cinder Galleries; the two Chapter 2 scenes; the Siege and the choice; both faction trees; burden effects; 12 faction quests per faction; faction armour; Victor's kit; stages 3–4 | 7 |
| **M5 Endgame** | Drowned Archive; Frostvault and Maren; the Heartdeep, Elias's moment and the Hollow Warden; the four endings; postgame world states | 8 |
| **M6 Life and release** | All seven romances and weddings; festivals; animals, fishing, house and tool upgrades; the other companion kits; optional caves; audio integration (already composed on `docs/ethergrove-audio`); phone app; the Steam build and store (§13.2); release | 9, 10, 11 |

### 13.1 Vertical slice checklist (M1)

The slice proves the core loop: leave the farm prepared, fight through a dangerous place, beat a boss, bring
something meaningful home.

- [ ] The 2.5D renderer with the farm, Lowmere (shops and a few villagers to talk to) and Lowmere Woods
- [ ] Real-time combat per October spec §6.3 on keyboard, gamepad and touch: light, heavy, dodge, block, parry,
      lock-on
- [ ] Three regular Gloamed enemy types (named in the combat spec), Mossmaw as the elite, the Bramble Matron as
      the boss
- [ ] Mossdeep complete, with checkpoint stones
- [ ] The first Kindling, and the Verdant Rootstone returned to the Root Shrine
- [ ] XP and levels (no skill trees yet), basic gear and inventory, the pickaxe and copper
- [ ] Basic cooking: at least 3 farm recipes with expedition buffs
- [ ] Falling in a Deep and waking at the clinic (§9.1)
- [ ] Save and load anywhere in the slice, with a migration from the current save version
- [ ] Owner playtest: combat feels good at the Low tier on a mid-range laptop and on a phone

### 13.2 Steam

Steam is a release target beside the web game and the Mac and Windows apps. It adds packaging and store work, not
design: every rule in this spec holds on Steam. The M6 Steam spec settles the details below.

- **The build:** the existing Electron app in `apps/desktop` is the Steam build: Windows x64, and macOS arm64 and
  x64. Steam Deck runs the Windows build through Proton; a native Linux build is not planned.
- **Updates MUST come from Steam.** Today `updateMode` in `apps/desktop/src/policy.ts` installs updates itself on
  Windows and signed Macs ([[decisions/0016-desktop-auto-update]]). A Steam build MUST return `'off'`, through a
  build flag set by the Steam packaging, so the game never patches itself under Steam.
- **Steam Deck:** aim for Valve's Deck Verified rating: every flow works on a gamepad alone (already a rule), the
  UI and text are legible at 1280 × 800, and the on-screen keyboard opens where text is typed (hero names).
- **Saves and Steam Cloud:** saves live in IndexedDB inside Electron's `userData`, which Steam Cloud cannot sync
  well as files. The Steam spec decides between writing save slots as plain files for Steam Cloud, or shipping
  without Steam Cloud at first.
- **Steamworks:** achievements and Steam Cloud need a Steamworks binding for Electron, chosen in the Steam spec
  (no network origin or native module is added before then; any addition goes through the desktop CSP rules).
- **macOS:** the Steam spec checks Valve's current signing and notarisation requirements; the Mac app is unsigned
  today.
- **Store:** a Steam Direct app fee (US$100 per app), a store page with capsule art, screenshots and a trailer,
  and a "Coming soon" page live at least two weeks before release. Store art follows the board's art direction,
  never another game's.

## 14. Out of scope

- Implementing anything in this spec on this branch: each part in §13 gets its own spec and plan.
- Town building, monster taming, children, multiplayer.
- Regions beyond the valley. Elias's wars beyond the North Pass stay in lore only.
- **The narrative content package.** This spec is the story's frame, not its script: dialogue, quest-by-quest
  scripts, the twelve journal pages' final text and the romance storylines are written in each milestone's spec.
- **Story lock:** once the owner approves this spec, its story decisions are frozen. A later spec changes one only
  with an owner decision note in `brain/decisions/`.

## 15. Owner questions

1. **The player's parent** (§4.1): approved as written on 2026-11-03.
2. **New names and lines** (Anna Hale, the Long Surge, "The Old Oath", "A Captain's Offer", and the exact lines of
   Maren, Fern and June): approved as written on 2026-11-03.
3. **Platforms:** resolved on 2026-11-03: Steam is a release target (§1.2, §13.2).
4. **Engine:** three.js or the Godot proof (F1) is decided separately; this spec holds for either.
5. Names of the three regular Mossdeep enemies and the Guild's lieutenants are left to the M1 and M4 specs.

## 16. Change log

- **Revision 1 (2026-11-03):** first version, after the first ChatGPT analysis and the owner's decisions in §1.2.
- **Revision 2 (2026-11-03):** after the second ChatGPT review (§11.2): the Long Surge and the shrine-or-pier
  mirror; Victor's age; Maren's binding, her route to the Heartdeep and her end; the Guild after Maren; the
  Rootwardens defined; both sides' case before the Siege; a labelled 2 s deed; no deaths in the Siege; Rootblade
  forms as context inputs outside skill slots; the Hollow Warden beatable without forms; a lighter cold open;
  30 skill points and respec; softer Gloam burden; Ether refill and a resources table; hub-and-spoke waystones;
  ambush once per expedition; a never-lost list; the Lantern's Debt explained; reuse rules; milestones with a
  vertical slice; the October continuity check.
- **Revision 3 (2026-11-03):** after the third ChatGPT review (§11.5): the Rootstone table, the shrine's ward and
  the Rootstone rule; the player's parent proposed; the Bind ending's seasonal rite; rootwalls instead of
  Rootwarden patrols; Siege recovery gathered; the narrative content package and story lock in §14. The owner
  added Steam as a release target (§1.2, §13.2), including the rule that a Steam build never self-updates.
- **Approved (2026-11-03):** the owner approved revision 3, the player's parent and the new names and lines.
  The story is locked (§14); questions 4 and 5 in §15 stay with later specs.
