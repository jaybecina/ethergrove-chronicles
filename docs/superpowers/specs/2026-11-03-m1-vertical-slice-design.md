# M1 Vertical Slice in Godot: Design Spec

**Status:** draft for owner review · **Date:** 2026-11-03 · **Author:** Jay Becina (with Claude) · **Builds on:**
`2026-11-03-rootwake-arpg-story-design.md` (the ARPG spec, story locked) §13.1 and §13.3, and
`2026-10-29-ethergrove-chronicles-design.md` (the October spec) §5.2, §5.3, §6 · **Asset board:** cards F0–F5
approved at Gate 1 (read from the board's `approvals` collection on 2026-11-03)

This spec builds milestone **M1** of the ARPG spec §13: a vertical slice in Godot that proves the core loop:
**leave the farm prepared, fight through a dangerous place, beat a boss, bring something meaningful home.** It
settles the four open engine points of ARPG §13.3 and gives exact names, numbers and files so the plan can be
written without asking the owner again. **MUST**, **SHOULD** and **(draft)** mean what they mean in the ARPG spec.
No story decision changes here (ARPG §14 story lock).

---

## 1. Goal and success criteria

1. Every box of the ARPG §13.1 checklist is ticked (§14 below repeats it with how each is checked).
2. The ported rules match `packages/core`: every parity test in §4.4 passes against the TypeScript fixtures.
3. A save from the current web game (version 2) loads in the slice through the import in §5.4 and keeps its
   farm, bag, gold, calendar and milestones.
4. `godot --headless` runs the whole GUT suite and the smoke boot with no errors or warnings, locally and in CI.
5. The owner plays the slice on the desktop build at the **Low** tier on a mid-range laptop and signs off that
   combat feels good (the ARPG §13 quality gate). Until then M1 is not done, whatever the tests say.

## 2. Decisions (the four open points of ARPG §13.3, and the rest)

| Point | Decision |
|---|---|
| Project | A new Godot **4.7** project at `apps/game` in this monorepo (Godot 4.7.2 stable is installed). `apps/web`, `apps/desktop` and `packages/core` are not edited by M1 except where §11 says. |
| Language | **GDScript only**, with static typing everywhere (`var x: int`, typed arrays, typed returns). C# is rejected because Godot 4 C# projects do not export to the web. |
| Core port | **Port `packages/core` to GDScript** (owner, 2026-11-03), as pure logic under `apps/game/core/`. The TypeScript code stays as the reference and is not deleted until the web game is retired (§4). |
| Renderer, desktop | **Forward+** at every tier, per the approved card F3 (Low uses Forward+ too; Compatibility only as a fallback for GPUs that cannot run it). The F0 look kit carries over (§8). |
| Renderer, web | **Compatibility**, because Forward+ does not run in a browser. The web build may look simpler (ARPG §13.3). |
| Web threads | **Single-threaded web export** (`variant/thread_support=false`), so no cross-origin isolation headers are needed and `vercel.json` stays as it is in M1. |
| Audio | Godot does not import `.m4a`. The shipped scores are converted to **Ogg Vorbis** at quality 6 with `ffmpeg`, but **not in M1**: the slice uses at most 3 placeholder loops from the CC0 Kenney packs already credited (§10). |
| Tests | **GUT** (Godot Unit Test, MIT licence) for all logic, plus a headless smoke boot (§11). |
| Movement | One `CharacterBody3D` controller for every area. Part 1's tile movement (`systems/movement.ts` `stepMovement`) is not ported; its speeds are (§4.2). |
| Self-update | The Godot build MUST contain no self-update code (ARPG §13.2). |

## 3. Project layout

```
apps/game/
  project.godot              # Godot 4.7, Forward+, main scene res://boot/boot.tscn
  export_presets.cfg         # "macOS", "Windows Desktop", "Web" (§9)
  addons/gut/                # GUT, vendored (§11.1)
  core/                      # pure rules: extends RefCounted, no Node, no scene, no OS/Time calls
    data/                    # balance.gd, crops.gd, items.gd, layouts.gd, lessons.gd, weather_table.gd,
                             # enemies.gd, gear.gd, recipes.gd, deeps.gd (all const dictionaries)
    rng.gd grid.gd calendar.gd weather.gd crops.gd bag.gd economy.gd tools.gd interact.gd
    day.gd milestones.gd tutorial.gd new_game.gd apply_command.gd
    combat.gd progression.gd cooking.gd delve.gd
    save/schema.gd save/migrate.gd
  game/                      # nodes: autoloads, player, enemies, UI, scenes
    autoload/game_state.gd   # owns the one GameState Dictionary, calls core, emits signals
    autoload/save_service.gd # user:// slots (§5.3)
    autoload/settings.gd     # tier, bindings
    player/ enemies/ ui/ world/
  scenes/
    farm.tscn house.tscn lowmere.tscn lowmere_woods.tscn mossdeep/floor_1.tscn … floor_8.tscn clinic.tscn
  web/shell.html             # custom HTML shell with the phone message (§9.2)
  test/
    core/test_*.gd           # GUT unit tests, one file per core module
    game/test_*.gd           # GUT tests for nodes that hold logic (combat state machine, AI)
    fixtures/                # JSON written by scripts/export-core-fixtures.mjs (§4.4)
    smoke/smoke_boot.gd      # headless boot: load each scene, save, load, quit 0
```

- **Rule:** `core/` never touches nodes, signals, the scene tree, files or the clock. Time arrives as an argument
  (milliseconds or in-game minutes), randomness only through `core/rng.gd`. This is the GDScript version of
  "`packages/core` stays pure and deterministic" (`AGENTS.md`).
- **State shape:** `GameState` is one `Dictionary` whose keys and JSON form match the TypeScript `GameState`
  exactly (camelCase keys), so fixtures compare with `==` after a JSON round trip. Core functions take a state
  and return a new state (`state.duplicate(true)` first); they never mutate their input. Tests check this.

## 4. The core port

### 4.1 Module map

| TypeScript (`packages/core/src`) | GDScript (`apps/game/core`) | Ported |
|---|---|---|
| `rng.ts` | `rng.gd` | Fully; MUST give bit-identical output (32-bit integer maths, `& 0xFFFFFFFF`) |
| `grid.ts` | `grid.gd` | Fully |
| `systems/calendar.ts`, `weather.ts` | `calendar.gd`, `weather.gd` | Fully |
| `systems/crops.ts`, `bag.ts`, `economy.ts`, `tools.ts`, `interact.ts`, `milestones.ts` | same names, `.gd` | Fully |
| `systems/day.ts` | `day.gd` | Fully, including passing out and tilled-soil revert |
| `systems/tutorial.ts`, `data/lessons.ts` | `tutorial.gd`, `data/lessons.gd` | Fully: the tutorial is unchanged (ARPG §1.2) |
| `newGame.ts`, `applyCommand.ts` | `new_game.gd`, `apply_command.gd` | Fully; commands are `{"type": String, …}` dictionaries with the same names |
| `systems/movement.ts` | none | `targetTile` only, inside `interact.gd`. `stepMovement` is replaced by the `CharacterBody3D` controller |
| `save/schema.ts` (zod) | `save/schema.gd` | A hand-written validator returning `{"ok": bool, "error": String}` |
| `save/migrate.ts`, `repository.ts` | `save/migrate.gd`; `repository.ts` → `game/autoload/save_service.gd` | Fully, plus migration 2 → 3 (§5.2) |

GDScript names are snake_case (`end_day`, `add_item`); the dictionary keys and command and event names stay as in
TypeScript so the fixtures match.

### 4.2 Movement speeds kept

One tile is **1 m**. Walk 2.6 m/s, run 4.6 m/s, exhausted ×0.6, player radius 0.3 m (`BALANCE`). On the farm and
in the house, every blocked tile (`grid.isBlocked`) becomes a 1 × 1 m static collision box, rebuilt when the grid
changes, so Part 1's walls, rocks and stumps block as before.

### 4.3 Port order

`rng → grid → calendar → weather → crops → bag → economy → tools → interact → milestones → day → tutorial →
new_game → apply_command → save`. Each module lands with its tests green before the next starts.

### 4.4 Parity with the TypeScript

- **`scripts/export-core-fixtures.mjs`** (new, node, run by hand and in CI) imports `@ethergrove/core`, runs a
  fixed list of scenarios and writes `apps/game/test/fixtures/*.json`. Each file is
  `{ "name", "seed", "state", "commands": [...], "expected": { "state", "events" } }`. The scenarios:
  1. `rng`: the first 1,000 outputs for seeds 1, 42 and 2147483647.
  2. `new-game`: `createNewGame` for seeds 1 and 42 with names "Willow Farm" / "Ash".
  3. One scenario per core test file in `packages/core/test` (`bag`, `calendar`, `crops`, `day`, `economy`,
     `grid`, `interact`, `milestones`, `quickSlots`, `tools`, `tutorial`, `weather`): the commands each test
     sends, recorded with their result.
  4. `full-year`: the `fullYear.test.ts` run (seed, every command, the final state).
  5. `save-v1`, `save-v2`: `test/fixtures/part1-save-v1.json` and the same file migrated to version 2.
- **GUT parity tests** (`test/core/test_parity.gd`) load each fixture, replay the commands through
  `apply_command.gd` / `day.gd` and assert the state and events equal `expected` (deep `==` after
  `JSON.parse_string(JSON.stringify(x))`, which normalises int and float).
- The fixtures are committed. `scripts/export-core-fixtures.test.mjs` fails when a fixture on disk differs from
  a fresh export, so a TypeScript rule change cannot silently break parity.
- **Property tests** in `packages/core` (`tutorial.property.test.ts`, `invariants.test.ts`) are not ported as
  property tests. Their invariants become GUT tests over the 200 states the full-year fixture passes through.

### 4.5 Deviations recorded during Plan 1

- `target_tile` lives in `grid.gd`, not in a separate module.
- The fixture recorder is a Vitest file (`packages/core/test/parity`, run with `pnpm game:fixtures`), not
  `scripts/export-core-fixtures.mjs`; its freshness test is `parityFixtures.test.ts`.
- The version 3 feature tiles cannot hold crops, so there is no "nearest free tile" rule.
- `SaveSlots` lives in `game/save/save_slots.gd`; the `save_service.gd` autoload that wraps it comes in Plan 2.
- The web-export fixture copy lives in `apps/game/test/data`.
- Windows rename-over atomicity is unverified; check it before the Windows export ships.
- The `move` command is not ported: the CharacterBody3D controller replaces it.
- The parity test wraps the Mossdeep `open` field until the core applies the §6.3 opening rule (Plan 4); only
  `deeps.mossdeep.open` is overridden to `false`, the rest of `deeps` comes from the migration.

## 5. Saves

### 5.1 Version 3

`CURRENT_SAVE_VERSION` in the slice is **3**. Version 3 is version 2 plus these keys (draft values where marked):

| Key | Type | New game / migrated value |
|---|---|---|
| `player.location` | adds `"lowmere"`, `"woods"`, `"mossdeep"`, `"clinic"` to `"farm"`, `"house"` | unchanged |
| `player.energy` | number 0–100 | renamed from `player.stamina` (the Part 1 bar is Energy in ARPG §9.5) |
| `player.floor` | int 0–8 | 0 (only used when `location` is `"mossdeep"`) |
| `hp` | int | `maxHp` |
| `xp`, `level` | int | 0, 1 |
| `gear` | `{ weapon, offHand, head, body, feet, trinket1, trinket2 }`, each a gear id or `null` | all `null` |
| `bag` | stacks may also hold `copperOre`, `copperBar`, gear ids, dish ids, quest ids | unchanged |
| `buff` | `{ id, untilMinute }` or `null` (one food buff at a time) | `null` |
| `deeps.mossdeep` | `{ open: bool, cleared: bool, checkpoints: int[] }`; checkpoints hold floor numbers from `0` (the entrance), `4`, `8` | `{ false, false, [] }` |
| `lootSinceSleep` | stacks picked up since you last slept in the farm bed, anywhere outside the farm, house and Lowmere | `[]` |
| `elites.mossmaw` | `{ defeatedSeason: String or null }` | `null` |
| `rootstones` | array of `"verdant"` … | `[]` |
| `kindlings` | int | 0 |
| `talked` | array of villager ids met this save | `[]` |

The unbuilt Part 2A draft (`docs/part2a-spec`) also planned a version 3 for the web game. The web game gets no new
features ([[decisions/0019-godot-main-no-phones]]), so version 3 belongs to the Godot game; if Part 2A's town is
ever built, it is built in Godot on top of this version.

Combat Stamina is **not saved**: it refills in seconds and is full on load. `maxHp` and `maxStamina` are derived
from `level` (§7.4), never stored. Ether, Gloam stage, faction and burden come in M2 with their own migration.

### 5.2 Migrations

- `migrate.gd` keeps `1 → 2` exactly as TypeScript and adds **`2 → 3`**: rename `player.stamina` to
  `player.energy`, add every key in §5.1 with its new-game value, place the new farm and house features (§6.1)
  on their tiles (a tile already holding a crop keeps the crop; the feature moves to the nearest free path tile),
  and set `deeps.mossdeep.open` by the opening rule (§6.3).
- A file with a version above 3 returns `unsupportedVersion`; a malformed file returns `invalid`. Neither
  overwrites the slot.

### 5.3 Slots

`user://saves/slot-1.json` … `slot-3.json`, written atomically (write `slot-N.json.tmp`, then rename). The file is
the TypeScript `SaveFile` shape (`version`, `savedAt`, `playTimeMs`, `summary`, `state`). "Save anywhere"
(ARPG §13.1) means the pause menu saves at any moment outside a fight (no Gloamed enemy aggroed); in Mossdeep the
save restores you at the last checkpoint stone you touched, so a save never drops you mid-room.

### 5.4 Import from the web game

The title screen has **Import a save from the web game**. It opens a file picker for the `*.ethergrove.json` file
that the web game's existing **Export save** button writes (`apps/web/src/save/fileIO.ts`, unchanged), runs
`migrate.gd`, and writes it to a free slot. Invalid or newer files show "This save can't be opened." and change
nothing. On the Web
build the picker is the browser's file input. No browser-storage bridge is built in M1.

## 6. Slice content

### 6.1 Places

| Place | What is in it |
|---|---|
| **Farm** | Part 1's farm (32 × 24, `FARM_LAYOUT`) plus two features: the **Root Shrine** (`R`, feature `rootShrine`) at x 28, y 2, and the **farm gate** (`G`, feature `farmGate`) at x 16, y 23, replacing that fence tile. The gate leads to Lowmere. |
| **House** | Part 1's house plus a **stove** (`K`, feature `stove`) at x 1, y 1. |
| **Lowmere** | A small square with three doors: **Hilda's forge**, **Doc Aldous's clinic** and **Granny Fern's cottage**, plus **Mayor Bram** by the notice board in the square. Exits: farm gate, Lowmere Woods. Seeds stay at Sol's cart on the farm, so the Part 1 tutorial's `buySeeds` lesson is unchanged. No other shop in M1. |
| **Lowmere Woods** | One hand-made forest zone, about 120 × 90 m (draft), with the **old well** (Mossdeep entrance), copper-free forage (fiber, wood) and Gloamed spawns at night (§6.4). |
| **Mossdeep** | 8 floors (October spec §5.2), one scene each, about 3–4 rooms per floor (draft), stairs down at the end of each. **Checkpoint stones** (elevator stones) at the entrance and floors 4 and 8: touching one records it, and from the well you may start at any recorded one. Floor 8 ends in the Bramble Matron's arena. Copper nodes on every floor (2 hits, 4 Energy a swing, October §6.4). |
| **Clinic** | Doc Aldous's room, where you wake (§6.6). |

### 6.2 Villagers (four, to talk to)

Each has one greeting the first time (adds them to `talked`) and one repeat line. Lines are exact:

| Villager | First line | Repeat line |
|---|---|---|
| Hilda | "Elias's grandchild. Same stubborn chin. Bring me ore." | "Copper first. Five ore, one bar." |
| Doc Aldous | "If the woods knock you flat, they carry you here. Try not to make it a habit." | "Eat before you go down. Empty stomachs make poor fighters." |
| Granny Fern | "The old well in the woods has woken, dear. Elias would have gone down already. Bring its stone home to the shrine." | "The shrine remembers him, dear. Give it time to remember you." |
| Mayor Bram | "Welcome to Lowmere. Stay out of the woods after dark. Please." | "Lock your gate at night. Everyone's doing it now." |

These lines are new text written under ARPG §14 ("dialogue … written in each milestone's spec") and say nothing
the story bible does not. The voices follow the unbuilt Part 2A dialogue draft (branch `docs/part2a-spec`,
appendix C): Hilda "blunt, few words", Aldous "dry, deadpan", Fern calls you "dear". The owner approves them with
this spec.

### 6.3 When Mossdeep opens

October spec §5.2: **Spring Y1 day 8, or the first shipment, whichever comes later.** Before that the well is
covered by a fallen trunk and the prompt reads "The old well is blocked." When it opens, Hilda's first line
changes to the one in §6.2 and she gives a **practice sword** once (the first time you talk to her after it
opens).

### 6.4 Enemies (Gloamed)

The ARPG spec already names the **Gloamed burrower** and **Gloamed brute** (cold open, §7; art list, §10), and its
reuse rules want enemy families. So the slice uses those two plus one new type. "Gloamed wisp" had no clash in a
web search on 2026-11-03 (ARPG §11.3); "wisp" alone is a common word in many games, so only the full name is ours.

All numbers are **(draft)**. Every attack telegraphs for at least 0.5 s, bosses at least 0.7 s (October §6.3).

| Enemy | Role | Levels | HP | Attack | Telegraph | Stagger | Teaches |
|---|---|---|---|---|---|---|---|
| **Gloamed burrower** | Fast melee, comes in 2–4 | 1–5 | 40 + 10/level | Bite, 8 + 2/level | 0.5 s | Any hit; a parry staggers 1.5 s | Parry |
| **Gloamed brute** | Slow heavy melee, alone or with burrowers | 3–8 | 160 + 25/level | Slam, 22 + 3/level, 2.5 m circle | 0.9 s | Heavy hits only; a parry does not stagger | Dodge |
| **Gloamed wisp** | Ranged, keeps 6–9 m away | 2–8 | 30 + 6/level | Bolt, 10 + 2/level, 12 m/s, blockable | 1.0 s glow | Any hit | Lock-on and closing in |
| **Mossmaw** (elite) | A Gloamed bristleboar (ARPG §8.1) in Lowmere Woods | 7 | 900 | Charge, 30, then 2 tusk swipes, 18 | 0.8 s | A parried charge staggers 2 s | Reading a combo |
| **Bramble Matron** (boss) | Mossdeep floor 8 | 10 | 2,600 | Thorn lash 24; root burst 30 (3 m circle) | 0.7 s | Only during a phase change | Reading telegraphs (October §5.3) |

- **Spawns:** Mossdeep floors 1–3 burrowers and wisps; floors 4–7 add brutes; levels rise from 1 on floor 1 to 8
  on floor 7 (draft). Lowmere Woods: packs of 2–3 burrowers at levels 1–3, at night only (20:00–05:00), per Gloam stage 1
  (ARPG §8.3).
  Cleared rooms stay clear until you sleep.
- **Mossmaw** appears only once Mossdeep is cleared (stage 2 in ARPG §8.3), in a clearing marked by torn earth,
  and respawns once per season (`elites.mossmaw.defeatedSeason`). It drops one **Mossmaw tusk**, a unique
  material that is never lost (ARPG §9.1); M1 has no recipe for it.
- **Bramble Matron:** phase 1, thorn walls rise and split the arena into three lanes every 20 s; phase 2 (50% HP),
  she summons 3 **saplings** (20 HP, slow, explode for 12 after 6 s) every 25 s. Ember oil is not in the slice; the
  fight MUST be fair without it. She drops the **Verdant Rootstone** and gives 1,000 XP (October §6.1).
- **Grandpa's lantern and broken blade** (ARPG §4.3 chapter 1) lie past the arena. Picking them up shows the item
  name only; their scenes come in M2. Both are quest items and never lost.

### 6.5 The Rootstone and the first Kindling

Placing the Verdant Rootstone at the Root Shrine (interact while carrying it) adds `"verdant"` to `rootstones`,
sets `deeps.mossdeep.cleared`, and wakes the **first Kindling** (`kindlings = 1`). The Kindling follows the
player in Mossdeep and Lowmere Woods only, lights a 6 m radius, and heals **5 HP every 15 s** (draft) while you
are below max HP. Hidden doors, feeding and the waystone come later (M2, M3). The waking is a 3 s moment: the
shrine glows, the Kindling rises and settles beside you. No dialogue.

### 6.6 Falling and passing out

- **Falling in Mossdeep or Lowmere Woods:** you wake at the clinic at 20:00 the same day, or 08:00 the next day if
  it was already past 20:00, at full HP, and lose half (rounded down, per stack) of `lootSinceSleep`
  (October §6.3). Only ordinary materials, ore and consumables can be lost; gold, equipped gear, quest items,
  the Rootstone and the Mossmaw tusk never are (ARPG §9.1).
- **Passing out at 02:00** away from home: the same clinic wake and the same loss (ARPG §9.1). At home, Part 1's
  passing-out rule is unchanged.
- Sleeping in the farm bed clears `lootSinceSleep`. Camping and the bedroll are M3.

## 7. Combat, progression and gear

### 7.1 Moves (October §6.3; numbers there are the rules, not drafts)

| Move | Stamina | Rule |
|---|---|---|
| Light attack | 12 | 3-hit chain, 0.45 s each (draft) |
| Heavy attack | 25 | Hold attack 0.35 s (draft); 1.8 × damage |
| Dodge roll | 20 | 0.25 s with no damage taken |
| Block | half the damage blocked | Hold; 70% of damage blocked without a shield, 90% with one (draft) |
| Parry | as block | Block pressed within **0.15 s** before a hit lands; staggers most enemies |
| Run in a Deep | 10 per second | Running on the farm and in town is unchanged |

Stamina refills at 30 per second after 0.8 s without spending. **Lock-on:** the nearest enemy in a 10 m cone in
front; one input switches to the next nearest in the cone.

### 7.2 Where the rules live

`core/combat.gd` is pure: `resolve_hit(attacker, defender, move, timing_ms) -> {damage, staggerMs, blocked,
parried}`, `stamina_after(stamina, spent, idle_ms)`, and the parry and dodge windows. Damage is
`round(power × moveMultiplier × 100 / (100 + defence))` (draft). The player's `CombatStateMachine` node
(`game/player/combat_state_machine.gd`) only reads input, plays animations and calls `combat.gd`; its states are
`idle, light_1, light_2, light_3, heavy_windup, heavy, dodge, block, parry_window, staggered, down`. Enemy AI is a
small state machine per family (`idle, chase, telegraph, attack, recover, staggered`) with numbers from
`core/data/enemies.gd`.

### 7.3 Controls (defaults; rebinding is M2)

| Action | Keyboard and mouse | Gamepad |
|---|---|---|
| Move / run | WASD or arrows / Shift | Left stick / L3 or hold LB |
| Light (tap) / heavy (hold) | Left mouse | X (west) |
| Block / parry | Right mouse | RB |
| Dodge | Space in Lowmere Woods and Mossdeep | B (east) |
| Use tool | Space on the farm, in the house and in Lowmere (unchanged from Part 1) | A (south) |
| Interact / mine | F | A (south) |
| Lock-on / switch target | Q or middle mouse / mouse wheel | R3 / right stick flick |
| Item slots | 1–8 | D-pad left and right |
| Pause and save | Esc | Start |

Space keeps Part 1's meaning wherever the tutorial teaches it; it becomes dodge only where you fight. Every
menu works on keyboard and gamepad alone (Steam Deck rule, ARPG §13.2).

### 7.4 Levels and XP (October §6.1)

XP from level L to L+1 is `round(100 × L^1.5)`. A monster gives `10 × its level`; the boss 1,000; a first-time
floor 50; each harvest 1 per crop. Max HP `100 + 8 × (level − 1)`, max Stamina `100 + 3 × (level − 1)`. No skill
points are spent in M1; the counter appears in M2.

### 7.5 Gear (draft)

| Id | Slot | Power / Defence | How you get it |
|---|---|---|---|
| `practiceSword` | weapon | power 10 | Hilda, once (§6.3) |
| `copperSword` | weapon | power 16 | Forge: 3 copper bars + 100 gold |
| `woodBuckler` | off-hand | defence 5, block 90% | Forge: 5 wood + 50 gold |
| `copperHelm` | head | defence 4 | Forge: 2 bars + 60 gold |
| `copperMail` | body | defence 8 | Forge: 4 bars + 120 gold |
| `copperBoots` | feet | defence 3 | Forge: 2 bars + 60 gold |

Copper bar: 5 copper ore + 25 gold at the forge. Gear never breaks (October §6.3). The two trinket slots are in
the save and the screen but hold nothing in M1.

### 7.6 Cooking (draft)

Cook at the house stove. One buff at a time; a new dish replaces it. Buffs last until the in-game minute stored in
`buff.untilMinute` (6 in-game hours) or until you sleep.

| Dish | Ingredients | Eat | Buff |
|---|---|---|---|
| `turnipStew` | 2 turnip | +40 HP | **Steady:** blocking drains 25% less Stamina |
| `potatoHash` | 1 potato + 1 turnip | +60 HP | **Hearty:** +20 max HP |
| `strawberryTart` | 3 strawberry | +30 HP | **Quickstep:** Stamina refills 20% faster |

## 8. Rendering and graphics tiers

- The desktop build uses the approved F3 table (asset board), including: Low at 75% resolution with FSR, FXAA,
  blob shadow and baked lighting; Medium at 100%, MSAA 2×, sun shadows 2048 with 2 cascades, SSAO, glow; High at
  MSAA 4×, sun 4096 with 4 cascades, SSIL, volumetric fog. Art, models, gameplay and hitboxes are identical on
  every tier, and no tier may look dull.
- **Camera:** fixed angle, 50° pitch, one fixed yaw, orthographic, following the player by panning (October §7.2).
  The camera spec in the plan confirms the orthographic size by eye against the F0 renders.
- **Assets:** only CC0 packs already credited in `CREDITS.md`, or Poly Haven scans used by the F0 kit in
  `ethergrove-godot-proof` (CC0; each one added to `CREDITS.md` when copied in). Placeholder enemy and boss models
  are recoloured CC0 creatures until the commissioned art lands; heroes use the current CC0 Quaternius
  placeholders. No VRoid content at any stage.
- **Budget (draft):** 60 fps at Low on the owner's mid-range laptop, measured in Lowmere Woods with 6 enemies and
  in the Bramble Matron fight; at most 2,000 draw calls (Godot counts per mesh surface).

## 9. Builds

### 9.1 Exports

- `macOS` (universal), `Windows Desktop` (x64) and `Web` presets in `export_presets.cfg`, exported with
  `godot --headless --export-release`. Builds go to `apps/game/build/` (gitignored).
- The Web build is **not deployed** in M1. The live site keeps serving the current web game until Godot reaches
  parity (ARPG §13.3). It is served locally for the phone-message check (§9.2).

### 9.2 Phone and tablet message (ARPG §13.4)

`apps/game/web/shell.html` is the export's custom HTML shell. Before the engine loads it runs
`detectUnsupported()` from `apps/game/web/detect.mjs`:

- **Unsupported** when `matchMedia('(pointer: coarse)')` and `matchMedia('(hover: none)')` match and the shorter
  screen side is under 900 CSS px, **or** the platform reports `MacIntel` with `navigator.maxTouchPoints > 1` and
  `(pointer: fine)` does not match (an iPad reporting itself as a Mac).
- Touch laptops, Chromebooks and Steam Deck MUST NOT be blocked: any `(pointer: fine)` or `(hover: hover)` match
  means supported.
- The message uses the exact wording of ARPG §13.4 with the buttons **Copy link for my computer** (copies
  `location.href`, then shows "Link copied") and **Play anyway** (loads the engine unsupported, with no touch
  support). No data is collected.

### 9.3 Desktop app and Steam

The Godot desktop exports are not packaged, signed or put on Steam in M1 (M6). They are run straight from
`apps/game/build/` for the owner's playtest.

## 10. Audio

No score integration in M1. Up to three CC0 loops from `assets-src/kenney-*` (already credited) as placeholders:
farm day, woods, Mossdeep. Hit, parry and dodge sounds come from the Kenney impact pack. The `.m4a` → Ogg Vorbis
conversion (`ffmpeg -i in.m4a -c:a libvorbis -q:a 6 out.ogg`) is the M6 audio step and is recorded here only so
that part needs no new decision.

## 11. Tooling and checks

### 11.1 New dependencies (each needs the owner's OK before it is downloaded)

- **GUT 9.x** (MIT), vendored into `apps/game/addons/gut/` from its GitHub release.
- **Godot 4.7.2 export templates** for macOS, Windows and Web (official, from godotengine.org).
- **CI:** the official Godot 4.7.2 Linux headless binary, downloaded in the CI job and cached.
- `ffmpeg` is **not** needed in M1.

### 11.2 Commands (added to `package.json` at the root, run with `pnpm`)

```bash
pnpm game:test        # godot --headless --path apps/game -s addons/gut/gut_cmdln.gd -gdir=res://test -gexit
pnpm game:smoke       # godot --headless --path apps/game -s res://test/smoke/smoke_boot.gd
pnpm game:fixtures    # node scripts/export-core-fixtures.mjs
pnpm game:export      # macOS, Windows and Web exports into apps/game/build/
```

`GODOT_BIN` selects the binary, defaulting to `/Applications/Godot.app/Contents/MacOS/Godot` on macOS and
`godot` elsewhere.

### 11.3 Test guard and CI

- `scripts/testGuard.mjs` gets a **game** area: code `^apps/game/(core|game)/.+\.gd$`, tests
  `^apps/game/test/.+/test_.+\.gd$`, hint text `apps/game/test/{core,game}/test_*.gd`. Its own test
  (`scripts/testGuard.test.mjs`) covers the new area first.
- `pnpm checks:commit` adds `game:test` (GUT, about 5 s when Godot is installed; skipped with a printed notice when
  `GODOT_BIN` is not found, so contributors without Godot can still commit).
- `.github/workflows/ci.yml` adds a **game** job: download and cache Godot, `pnpm game:fixtures` with a clean-tree
  check, `pnpm game:test`, `pnpm game:smoke`. `scripts/checks.mjs` and `scripts/checks.test.mjs` change together
  (`AGENTS.md`). The job is added to the required checks by the owner after the first green run.
- Lint: `gdlint` and `gdformat` (gdtoolkit, MIT, pip) SHOULD be added when the owner approves the dependency;
  until then typed GDScript with Godot's warnings set to errors (`debug/gdscript/warnings/*` = error for
  untyped declarations, unused variables and unsafe calls) is the lint.

## 12. Build order

Each step is test-first and ends green (`pnpm game:test`, and `pnpm checks:commit` for steps touching scripts).

1. Godot project, GUT, the root commands, the test guard area and the CI job; the smoke boot opens an empty scene.
2. Fixture exporter and core port part 1: `rng`, `grid`, `calendar`, `weather`, `crops`, with parity tests.
3. Core port part 2: `bag`, `economy`, `tools`, `interact`, `milestones`, `day`, `tutorial`, `new_game`,
   `apply_command`, `save` (schema, `1 → 2`), then the full-year parity test.
4. Save version 3, the `2 → 3` migration, slots and the web-save import.
5. Farm and house scenes from the layouts, the player controller, camera, tiers, and the Part 1 loop and tutorial
   playable in Godot.
6. Lowmere and the four villagers; the farm gate, shop, forge and clinic.
7. `combat.gd`, then the player combat state machine and controls; a training dummy in Lowmere Woods.
8. The three Gloamed enemies, Lowmere Woods and its night spawns.
9. Mossdeep floors 1–8, copper, checkpoints, falling and the clinic wake, loot loss.
10. The Bramble Matron, the lantern and blade pickups, the Rootstone, the shrine and the first Kindling; Mossmaw.
11. XP and levels, gear and the forge, cooking and buffs.
12. Exports and the phone message.
13. Gate: every automated check, then the owner's playtest at Low on the laptop.

## 13. Tests (write each first and watch it fail)

- **Core, GUT:** one `test/core/test_<module>.gd` per module in §4.1; `test_parity.gd` (§4.4); `test_combat.gd`
  (parry window edges at 0.149 s and 0.151 s, dodge i-frames, block drain, damage formula, stamina refill after
  0.8 s); `test_progression.gd` (XP curve at L 1, 10 and 49 against the October values 100, 3,162 and 34,300);
  `test_delve.gd` (opening rule, checkpoints, the clinic wake time before and after 20:00, loot loss rounding and
  the never-lost list); `test_cooking.gd`; `test_migrate.gd` (`1 → 2 → 3` from `part1-save-v1.json`, a crop on a
  new feature tile, version 4 rejected, a malformed file rejected); purity tests (every core function leaves its
  input unchanged).
- **Game, GUT:** `test_combat_state_machine.gd` (inputs to states, heavy on a 0.35 s hold, no attack while
  staggered), `test_enemy_ai.gd` (telegraph lasts at least 0.5 s, 0.7 s for the boss; the wisp keeps 6–9 m).
- **Smoke:** every scene loads; new game, save, quit, load returns the same state.
- **Web shell:** `apps/game/web/detect.test.mjs` (node:test) for the detection matrix: phone, iPad, iPad as Mac,
  touch laptop, Chromebook, Steam Deck, desktop. One Playwright check serves the Web export locally and confirms
  the message shows under emulated `pointer: coarse` + `hover: none` + 390 × 844 and does not at 1280 × 800. This
  is a check of the message, not a phone gameplay test.
- **By eye (Claude, then the owner):** each tier on the farm, in the woods and in the boss fight; parry and dodge
  timing; telegraphs readable at Low.

## 14. Done checklist (ARPG §13.1, with how each is checked)

- [ ] 2.5D renderer in Godot with the farm, Lowmere and Lowmere Woods (§6.1; smoke + by eye)
- [ ] Real-time combat on keyboard and gamepad: light, heavy, dodge, block, parry, lock-on (§7; GUT + by eye)
- [ ] The phone and tablet message shows on a phone and does not block a laptop (§9.2; node:test + Playwright)
- [ ] Gloamed burrower, brute and wisp; Mossmaw; the Bramble Matron (§6.4; GUT + by eye)
- [ ] Mossdeep complete, with checkpoint stones (§6.1; GUT + by eye)
- [ ] The first Kindling and the Verdant Rootstone returned to the Root Shrine (§6.5; GUT + by eye)
- [ ] XP and levels, basic gear and inventory, the pickaxe and copper (§7.4, §7.5; GUT)
- [ ] Basic cooking: 3 farm recipes with expedition buffs (§7.6; GUT)
- [ ] Falling in a Deep and waking at the clinic (§6.6; GUT)
- [ ] Save and load anywhere, with a migration from the current save version (§5; GUT + smoke)
- [ ] Owner playtest: combat feels good at Low on a mid-range laptop

## 15. Out of scope

Skill trees and points, Rootblade forms, the cold open, the quest and dialogue framework, journal pages, companions,
Ether, Gloam stage, factions and burden (all M2); other zones, waystones, camping and the bedroll, environment kits
(M3); the web deploy, the Electron retirement, Steam, signing, score audio (M6); any change to the current web game.

## 16. Risks and trade-offs

- **Two codebases for a while.** The web game and the TypeScript core stay live and are the parity reference, so
  every Part 1 rule change until retirement must land in both. The fixture freshness check (§4.4) catches drift.
- **Web export size and speed are unknown** until step 12. If the single-threaded Compatibility build is too heavy
  for a laptop browser, the web target becomes a later decision; desktop is the playtest target.
- **Placeholder art.** Combat feel is judged on placeholder enemies; the owner's sign-off covers feel, not looks.
- **Godot counts differ from three.js** (draw calls per surface), so the October draw-call target does not carry
  over; §8 sets a Godot one.
- **The farm gate is south** (x 16, y 23), below the spawn. The Part 2A draft put the town exit east, in place of
  the cart at (31, 17); the slice keeps the cart because the tutorial teaches it. The town's direction can still
  change in M6 with a migration.
- **GUT in CI** adds a Godot download (about 60 MB, cached) to every pull request.

## 17. Owner questions

1. The four villager lines in §6.2 and the enemy, gear and dish names in §6.4–§7.6: approve as written?
2. The dependencies in §11.1 (GUT, export templates, Godot in CI): OK to download when the plan reaches them?
3. Is Mossmaw appearing only after Mossdeep is cleared (ARPG §8.3 stage 2) right for the slice, or should it be
   reachable earlier so the playtest meets it on the way in?
