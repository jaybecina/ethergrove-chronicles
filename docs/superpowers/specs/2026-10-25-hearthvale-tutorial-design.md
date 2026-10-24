# Hearthvale: Grandpa's Lessons (Tutorial) Design Spec

**Status:** draft for review · **Date:** 2026-10-25 · **Builds on:** Part 1 (merged to `main`) · **Comes before:** Part 2A (town and villagers)

This spec is written so that an implementer with no context from the design conversation can build it. Every name, number, rule and line of player-facing text is given. Where the spec says "MUST", do exactly that; do not improvise new text, new lessons or new UI.

---

## 1. Goal

New players are confused. Today the game shows an intro letter, then drops them on the farm. The only help is a 7-second tip the first time each tool is picked, and the tips never come back. Nobody tells the player what to do first, how the crop cycle works, where to sell, or where to buy seeds.

This spec adds **Grandpa's Lessons**: a short, guided path that teaches the basic farm loop by doing it, from Day 1 to the first sale and the first seed purchase. On top of that, it adds one-time **notes** that appear at the moment they matter, and a **Journal** tab in the pause menu where every lesson, note and control can be read again.

### 1.1 Success criteria

1. A first-time player who reads nothing but the lesson card can, unaided, till, plant, water, sleep, harvest, ship, sell and buy seeds.
2. At every moment of the guided path the player can see **what to do next** (goal card) and **where** (world marker or screen-edge pointer), with the **right buttons for their device** (keyboard, touch or gamepad).
3. The path **never blocks** anything and can **never get stuck**: if the player loses their crops or seeds, the path adapts.
4. Players can **skip** the lessons, **restart** them, and **reread** any of them at any time.
5. Existing Part 1 saves load and play unchanged (lessons off, restartable from the Journal).
6. All checks pass (`pnpm checks`), core coverage stays at or above 90%.

### 1.2 Decisions already made (do not revisit)

| Decision | Choice |
|---|---|
| Who teaches | **Grandpa Elias's farm journal.** Every lesson and note is written in his voice, as notes he left for the player. It continues the intro letter (Part 1 Appendix A.2). |
| How strict | **Guided, never blocking.** One goal at a time, with a marker. The player may do anything else; the goal waits. |
| Where the logic lives | **In the core (`packages/core`), saved per save slot.** Lessons are a data table driven by core events and state. The web app only draws them. |
| Order vs Part 2A | **Build this before Part 2A.** This spec takes save version **2**. Part 2A moves to version 3 (see §9). |

### 1.3 Teaching rules (the standard every lesson follows)

These are the rules good farming and cozy games follow for onboarding. Every lesson and note in this spec was written against them; any future lesson MUST follow them too.

1. **Learn by doing.** A lesson is one action to perform, not a page to read. It completes when the player does the action.
2. **One thing at a time, just in time.** Only one goal is active. Notes appear at the moment they are needed, never as a list up front.
3. **Always know the next goal.** The goal card is always visible during the path (except under menus), and a marker shows where to go.
4. **Short.** A lesson body is at most **20 words**. A title is at most **5 words**. Controls are shown as key chips, not prose.
5. **Device-aware.** Control hints show the keys of the device the player is using right now (keyboard, touch or gamepad) and update live when they switch.
6. **Never block, never trap.** No action is ever disabled by the tutorial. If the player can no longer finish a lesson, the path adapts (§3.5).
7. **Skippable and rereadable.** Skip at any time; restart at any time; every lesson, note and control is in the Journal.
8. **Accessible.** Everything shown visually is announced to screen readers; no flashing; all motion respects the Reduced motion setting; text follows the Text size setting; touch targets are at least 44 × 44 px.
9. **Reward progress.** Each finished lesson gets a small, quick confirmation (tick + sound), and finishing the path gets a small gift.

---

## 2. Scope

### 2.1 In scope

- Core: tutorial state, lesson and note rules, marker targets, two new commands, new events, save v2 with migration.
- Web: goal card, note cards, completion card, 3D world marker, screen-edge pointer, hotbar highlight, Journal tab in the pause menu, "Grandpa's lessons" option on the New Game screen.
- Removal of the old tip system (`Tips.tsx`, `offerTip`, `seenTips`).
- Unit, component and end-to-end tests.

### 2.2 Out of scope

Voice-over, videos or animated demonstrations; control remapping; a general quest system; achievements UI; any Part 2A content (town, villagers, store); translations.

### 2.3 Files

```
packages/core/src/
  types.ts                      CHANGED  GameState v2 `tutorial`, LessonId, NoteId, commands, events (§3.1)
  data/lessons.ts               NEW      lesson and note tables: order, rules metadata (§3.2, §3.4)
  data/layouts.ts               CHANGED  export FIELD_RECT (§3.6)
  systems/tutorial.ts           NEW      advanceTutorial, startLessons, skip/restart, lessonTarget, lessonSlot (§3.3–§3.7)
  applyCommand.ts               CHANGED  call advanceTutorial after checkMilestones; new commands (§3.3)
  newGame.ts                    CHANGED  NewGameOptions.lessons (§3.8)
  save/schema.ts, migrate.ts    CHANGED  v2 + migration 1 → 2 (§6)
  index.ts                      CHANGED  export the new public API
packages/core/test/
  tutorial.test.ts              NEW
  tutorialTarget.test.ts        NEW
  tutorial.property.test.ts     NEW
  migration.test.ts             CHANGED
  fixtures/part1-save-v1.json   NEW      (copied, see §6.3)

apps/web/src/
  ui/lessons/lessonText.ts      NEW      all player-facing text, verbatim from Appendix A
  ui/lessons/hints.ts           NEW      device-aware control chips (§4.3)
  ui/lessons/GoalCard.tsx       NEW      (§4.2)
  ui/lessons/NoteCard.tsx       NEW      (§4.4)
  ui/lessons/LessonsComplete.tsx NEW     (§4.5)
  ui/lessons/lessonStore.ts     NEW      transient UI state: expanded card, note queue (§4.7)
  ui/lessons/lessons.css        NEW      (or a section in theme.css; follow the existing pattern)
  ui/hud/MarkerPointer.tsx      NEW      screen-edge pointer (§4.6)
  ui/hud/Hud.tsx                CHANGED  mounts GoalCard, NoteCard, MarkerPointer
  ui/hud/Hotbar.tsx             CHANGED  lesson highlight (§4.6)
  ui/screens/Pause.tsx          CHANGED  Journal tab (§4.8)
  ui/screens/JournalPanel.tsx   NEW      (§4.8)
  ui/screens/NewGame.tsx        CHANGED  "Grandpa's lessons" checkbox (§4.9)
  ui/screens/Tips.tsx           DELETED
  ui/uiBridge.ts                CHANGED  routes lesson/note events; old offerTip calls removed (§4.7)
  ui/uiStore.ts                 CHANGED  `tip` state removed
  game/store.ts                 CHANGED  Settings.seenTips removed; loadSettings keeps known keys only (§4.10)
  scene/LessonMarker.tsx        NEW      3D marker (§4.6)
  scene/markerScreen.ts         NEW      shared projected marker position (§4.6)
  App.tsx                       CHANGED  Tips removed; LessonsComplete mounted
apps/web/e2e/
  lessons.spec.ts               NEW      (§7.3)
README.md                       CHANGED  "Play" section mentions the Journal
```

---

## 3. Core

### 3.1 Types (add to `types.ts`)

```ts
export type LessonId =
  | 'walkToField'
  | 'till'
  | 'plant'
  | 'water'
  | 'sleep'
  | 'waterDaily'
  | 'harvest'
  | 'ship'
  | 'sellOvernight'
  | 'buySeeds';

export type NoteId =
  | 'canEmpty'
  | 'staminaLow'
  | 'exhausted'
  | 'passedOut'
  | 'rain'
  | 'obstacles'
  | 'wrongSeason'
  | 'newSeason'
  | 'bagFull'
  | 'cartClosed';

export interface TutorialState {
  /** The active lesson; 'complete' after the last one; 'off' when skipped or never started. */
  lesson: LessonId | 'complete' | 'off';
  /** Progress inside the active lesson (only used by counted lessons, §3.2). Reset to 0 when a lesson starts. */
  count: number;
  /** Notes already shown in this save. A note is shown at most once per save. */
  notesSeen: NoteId[];
}

// GameState: `version: 1` becomes `version: 2`, and add:
//   tutorial: TutorialState;

// Command: add
//   | { type: 'skipLessons' }
//   | { type: 'restartLessons' }

// GameEvent: add
//   | { type: 'lessonStarted'; id: LessonId }
//   | { type: 'lessonDone'; id: LessonId }
//   | { type: 'lessonsComplete'; gift: number }
//   | { type: 'noteShown'; id: NoteId }

// NewGameOptions: add
//   lessons: boolean;
```

### 3.2 Lesson table (`data/lessons.ts`)

```ts
export const LESSON_ORDER: readonly LessonId[] = [
  'walkToField', 'till', 'plant', 'water', 'sleep',
  'waterDaily', 'harvest', 'ship', 'sellOvernight', 'buySeeds',
];
/** Lessons whose card shows "count / goal". */
export const LESSON_GOAL: Partial<Record<LessonId, number>> = { till: 3, plant: 3 };
export const NOTE_IDS: readonly NoteId[] = [
  'canEmpty', 'staminaLow', 'exhausted', 'passedOut', 'rain',
  'obstacles', 'wrongSeason', 'newSeason', 'bagFull', 'cartClosed',
];
/** Gold given when the last lesson is done (§3.3 step 5). */
export const LESSONS_GIFT = 100;
```

Done conditions. `prev` is the state before the command, `next` the state after it, `events` the command's events (including milestone events). "Farm crops" means tiles of `next.maps.farm` that have a `crop`.

| # | Lesson | Done when (checked after every command) | Already done when it starts (§3.4) |
|---|---|---|---|
| 1 | `walkToField` | The player's tile is inside `FIELD_RECT` on the farm (§3.6). | Same check. |
| 2 | `till` | `count` reaches 3. Each `tileTilled` event adds 1. | The farm has ≥ 3 `tilled` tiles without a crop, or ≥ 3 farm crops. |
| 3 | `plant` | `count` reaches 3. Each `cropPlanted` event adds 1. Also done when `count ≥ 1` and the bag holds no seed of any kind. | ≥ 3 farm crops. |
| 4 | `water` | ≥ 1 farm crop and every farm crop has `watered: true`. | Same check. |
| 5 | `sleep` | A `dayStarted` event (sleeping or passing out). | Never. |
| 6 | `waterDaily` | ≥ 1 farm crop and every farm crop has `watered: true`. | Same check (rain waters crops, so a rainy morning completes it at once). |
| 7 | `harvest` | A `cropHarvested` event. | Never. |
| 8 | `ship` | `next.bin` holds more items in total than `prev.bin` (sum of `qty`). | `next.bin` is not empty. |
| 9 | `sellOvernight` | A `shippingReport` event with `total > 0`. | Never. |
| 10 | `buySeeds` | A `buyItem` command succeeded: an `itemGained` event whose item starts with `seed:` together with a `goldChanged` event with `delta < 0`. | Never. |

### 3.3 `advanceTutorial(prev, next, events)` (`systems/tutorial.ts`)

Called by `applyCommand` **after** `checkMilestones`, with the milestone result's state and events; its return value is what `applyCommand` returns. It MUST be a pure function and MUST NOT change anything outside `next.tutorial` and (step 5) `next.gold`.

Steps, in order:

1. If `next.tutorial.lesson` is `'off'` or `'complete'`: go to step 6 (notes still run only when `lesson` is not `'off'`, see §3.7).
2. Update `count` for counted lessons (`till`, `plant`) from this command's events.
3. If the active lesson's done condition (§3.2) holds: append `{ type: 'lessonDone', id }`, then **start the next lesson** in `LESSON_ORDER` (§3.4).
4. Apply the adaptive rules (§3.5).
5. If the path just moved past `buySeeds`: set `lesson: 'complete'`, add `LESSONS_GIFT` to `gold`, append `{ type: 'goldChanged', gold, delta: LESSONS_GIFT }` and `{ type: 'lessonsComplete', gift: LESSONS_GIFT }`.
6. Notes (§3.7).

`applyCommand` also handles the two new commands:

- `skipLessons`: `tutorial.lesson = 'off'`, `count = 0`. No events. Allowed at any time; does nothing if already `'off'`.
- `restartLessons`: start the path from `walkToField` using §3.4 (so lessons the farm has already satisfied are passed straight through), emitting the resulting `lessonStarted`/`lessonDone` events. `notesSeen` is kept.

### 3.4 Starting a lesson

`startLesson(state, id, events)`: set `lesson = id`, `count = 0`, append `{ type: 'lessonStarted', id }`. Then, if the lesson is "already done when it starts" (right column of §3.2), immediately append `lessonDone` and start the next one, repeating until a lesson is not already done (or the path completes, §3.3 step 5). This makes the path skip over things the player already did on their own, so it never asks for something pointless.

### 3.5 Adaptive rules (never trap)

After step 3, if the active lesson is `plant`, `water`, `waterDaily` or `harvest` **and the farm has no crops**:

- if the bag holds a seed of the current season → start `plant` (unless it is already the active lesson);
- otherwise → start `buySeeds`.

When `buySeeds` is active, the bag holds no seed, the farm has no crops, and `gold` is below the cheapest seed of the current season (or the season is winter): set `lesson: 'complete'` with gift (§3.3 step 5). The player has nothing left to learn from the path, and the gift gets them going again.

Do not otherwise move backwards. In particular, crops that die or get harvested while other crops remain do not change the lesson.

### 3.6 Field rectangle (`data/layouts.ts`)

```ts
/** The farm's crop field: the '.' cells of FARM_LAYOUT. */
export const FIELD_RECT = { x0: 3, y0: 6, x1: 26, y1: 16 } as const; // inclusive
```

A unit test MUST assert that every cell inside `FIELD_RECT` is `'.'` in `FARM_LAYOUT` and every `'.'` cell is inside it, so the two cannot drift.

### 3.7 Notes

Only when `next.tutorial.lesson !== 'off'`. For each note below whose trigger fires in this command and which is not in `notesSeen`: append it to `notesSeen` and append `{ type: 'noteShown', id }`. At most **one** note per command: if several fire, take the first in `NOTE_IDS` order (the others will fire again next time their trigger happens).

| Note | Trigger |
|---|---|
| `canEmpty` | `actionFailed` with `reason: 'canEmpty'`. |
| `staminaLow` | `staminaLow` event. |
| `exhausted` | `exhausted` event. |
| `passedOut` | `passedOut` event. |
| `rain` | `dayStarted` event and `next.weather.today` is `'rain'` or `'storm'`. |
| `obstacles` | `toolUsed` with `hit: false`, or `actionFailed` with `reason: 'noTarget'`, while the tile the player faces (`targetTile(next.player)`) on the current map is `weed`, `rock` or `stump`. |
| `wrongSeason` | `actionFailed` with `reason: 'wrongSeason'`. |
| `newSeason` | `seasonChanged` event. |
| `bagFull` | `actionFailed` with `reason: 'bagFull'`. |
| `cartClosed` | `actionFailed` with `reason: 'cartClosed'`. |

### 3.8 New game

`createNewGame(opts)`: if `opts.lessons` is true, `tutorial = { lesson: 'walkToField', count: 0, notesSeen: [] }`, else `{ lesson: 'off', count: 0, notesSeen: [] }`. No events (new game has none); the web reads the starting lesson from state. `walkToField` cannot already be done at the spawn tile (15, 22), so no §3.4 pass is needed here.

### 3.9 Marker target and hotbar slot (`systems/tutorial.ts`)

```ts
export interface LessonTarget { location: LocationId; x: number; y: number } // tile coordinates
export function lessonTarget(state: GameState): LessonTarget | null;
export function lessonSlot(state: GameState): HotbarIndex | null;
```

`lessonTarget` returns `null` when `lesson` is `'off'` or `'complete'`. Otherwise it picks the tile below for the active lesson, as `{ location, x, y }` on the map where the target is. **If the target is on a different map than the player, return the door tile of the player's current map instead** (`houseDoor` on the farm, `exitDoor` in the house).

"Nearest" means the smallest Manhattan distance from the player's tile (`Math.floor(x)`, `Math.floor(z)`); ties go to the lower `y`, then the lower `x`. This makes targets deterministic and testable.

| Lesson | Target |
|---|---|
| `walkToField`, `till` | Nearest farm tile inside `FIELD_RECT` of kind `grass`. |
| `plant` | Nearest farm `tilled` tile with no crop. If none: same as `till`. |
| `water`, `waterDaily` | Nearest farm crop with `watered` not true. If none: `null`. |
| `sleep`, `sellOvernight` | The `bed` tile in the house. |
| `harvest` | Nearest mature farm crop (`isMature`). If none: `null` (no marker until something is ripe). |
| `ship` | The `bin` tile on the farm. |
| `buySeeds` | The `cart` tile on the farm. |

`lessonSlot` returns the hotbar slot the lesson wants, or `null`:

| Lesson | Slot |
|---|---|
| `till` | `0` (hoe) |
| `water`, `waterDaily` | `1` (can) |
| `harvest` | `2` (sickle) |
| `plant` | The hotbar index `5 + i` of the first quick slot `i` whose bag item is a seed; `null` if no seed is pinned. |
| all others | `null` |

---

## 4. Web

### 4.1 Where things appear

```
┌──────────────────────────────────────────────┐
│ [Clock]                              [Gold]  │
│ [Stamina]                                    │
│ ┌──────────────────────┐                     │
│ │ NOTE CARD (when one) │                     │
│ ├──────────────────────┤                     │
│ │ GOAL CARD            │        ◆ marker     │
│ └──────────────────────┘          (3D)       │
│                                          ➤ ← edge pointer
│                [Space Till]  ← existing prompt chips
│            [ hotbar, lesson slot ringed ]    │
└──────────────────────────────────────────────┘
```

The goal card and note card stack in the left column under the clock and stamina, at `left: var(--gutter)`, width `min(320px, 100vw - var(--gutter) - var(--gutter-r))`. On touch layouts they sit in the same place; the joystick lives at the bottom left, so there is no overlap. All lesson UI is hidden while `screen !== 'game'`, during the intro, and while any panel, menu or overlay is open.

### 4.2 Goal card (`GoalCard.tsx`)

Shown while `tutorial.lesson` is a `LessonId`.

- **Collapsed (default):** one row, min height 44 px: a small journal icon, the lesson **title** (Fraunces, `--step-0`), and for counted lessons a progress pill `count / goal` (e.g. `2 / 3`). For `water`/`waterDaily` the pill shows `watered / total` farm crops. For `harvest` with no ripe crop, a muted line under the title: `Ripe in N days` where N is the smallest `CROPS[id].days - age` over farm crops (minimum 1).
- **Expanded:** adds the lesson **body** (Nunito, `--step--1`, `--ink`) and the **control chips** for the current device (§4.3).
- The card **expands automatically** when a lesson starts and **collapses after 8 seconds**. Clicking or tapping it toggles expanded/collapsed. It is a `<button>` with `aria-expanded`.
- **Lesson done:** the title gets a tick and a strike-through for 1.2 s, the existing `chime` sound plays once (§4.7), then the next lesson's card replaces it (slides up 12 px and fades in over 250 ms; no motion when Reduced motion is on).
- **Look:** a parchment slip in the Part 1 style: background `--parchment`, text `--ink`, `box-shadow: var(--panel-edge), var(--lift)`, 10 px radius, 12 px padding. The pill uses `--gold` on `--wood-dark`. Use the existing tokens in `theme.css`; add no new colours.
- **Screen readers:** a visually hidden live region (`role="status"`, `aria-live="polite"`) announces `New goal: <title>. <body>` when a lesson starts, and `Done: <title>` when it completes.

### 4.3 Control chips (`hints.ts`)

Chips are `<kbd>`-styled pills, same as the existing prompt chips. The device is `useGame(s => s.device)` and the chips update live when it changes.

| Action id | Keyboard | Gamepad | Touch |
|---|---|---|---|
| `walk` | `WASD` Walk | `L-stick` Walk | `Drag left side` Walk |
| `run` | `Shift` Run | `B` Run | `Drag to ring` Run |
| `camera` | `Q` `E` Turn camera | `LT` `RT` Turn camera | `⟲` `⟳` Turn camera |
| `pickHoe` | `1` Hoe | `LB` `RB` Hoe | `⇄` Hoe |
| `pickCan` | `2` Can | `LB` `RB` Can | `⇄` Can |
| `pickSickle` | `3` Sickle | `LB` `RB` Sickle | `⇄` Sickle |
| `pickSeeds` | `6` Seeds | `LB` `RB` Seeds | `⇄` Seeds |
| `useTool` | `Space` Use | `A` Use | `✦` Use |
| `interact` | `F` Interact | `X` Interact | `✋` Interact |
| `menu` | `Esc` Menu | `Start` Menu | `☰` Menu |

For `pickSeeds` the keyboard key is `String(lessonSlot(state) + 1)` when `lessonSlot` is not null (it is `6` on a new game); if it is null, show the `menu` chip with the label `Bag` instead.

Chips per lesson:

| Lesson | Chips |
|---|---|
| `walkToField` | `walk`, `run`, `camera` |
| `till` | `pickHoe`, `useTool` |
| `plant` | `pickSeeds`, `interact` |
| `water`, `waterDaily` | `pickCan`, `useTool` |
| `sleep`, `sellOvernight` | `interact` |
| `harvest` | `pickSickle`, `useTool`, `interact` |
| `ship` | `interact` |
| `buySeeds` | `interact` |

### 4.4 Note card (`NoteCard.tsx`)

- Shown when a `noteShown` event arrives (via the UI bridge, §4.7). Notes are queued; one is shown at a time, above the goal card, in the same parchment style with an eyebrow line `From Grandpa's notes` (`--ink-soft`, `--step--1`, small caps).
- Content: note **title** and **body** (Appendix A.2). A `Got it` button dismisses it (min 44 × 44 px). It auto-dismisses after **10 seconds**. The next queued note then shows.
- Screen readers: announced through the same live region: `Note: <title>. <body>`.
- Notes never pause the game and never take keyboard focus.

### 4.5 Lessons complete (`LessonsComplete.tsx`)

On the `lessonsComplete` event: a centred parchment panel (the same panel component and focus handling as the existing Morning Report), with the title, body and gift line from Appendix A.3 and one button `Thanks, Grandpa`. It pauses the clock like other panels. Focus goes to the button; Enter, Space, Escape, gamepad A/B and the button all close it.

### 4.6 Markers

**3D marker (`scene/LessonMarker.tsx`).** Rendered inside the game canvas when `lessonTarget(state)` is not null **and** its `location` equals the player's location. At the centre of the target tile:

- a gold octahedron, radius 0.18, at height 1.4, `MeshStandardMaterial` colour `#f3cf72` with emissive `#d9a441` at intensity 1.5 (so it glows under the existing bloom); it bobs ±0.08 at 1 Hz and spins at 0.6 rad/s;
- a flat ring on the ground (inner radius 0.36, outer 0.46, colour `#f3cf72`, opacity pulsing between 0.35 and 0.8 at 1 Hz, `depthWrite: false`, 0.02 above the ground).

With Reduced motion on, the marker does not bob, spin or pulse (opacity fixed at 0.6). Each frame, the marker writes its projected screen position to the shared object in `scene/markerScreen.ts` (`{ visible: boolean; x: number; y: number; onScreen: boolean }`, in CSS pixels), the same way `playerMotion` is shared today.

**Screen-edge pointer (`ui/hud/MarkerPointer.tsx`).** When the 3D marker exists but its projected position is outside the viewport inset by 48 px (or behind the camera), show a gold arrow chip (40 × 40 px, `--gold` on `--wood-dark`) clamped to the viewport edge (inset 24 px), rotated to point at the marker. It reads the shared object in a `requestAnimationFrame` loop and is `aria-hidden` (the goal card already says where to go).

**Hotbar highlight (`Hotbar.tsx`).** The slot `lessonSlot(state)` gets class `is-lesson`: a 2 px `--gold-bright` ring that pulses between 60% and 100% opacity every 1.6 s (static at 100% with Reduced motion). If that slot is already the active slot, no highlight (the player already has the right tool).

### 4.7 UI bridge and lesson store

- `lessonStore.ts` (Zustand, transient, never saved): `expanded: boolean`, `noteQueue: NoteId[]`, `doneFlash: LessonId | null`, `complete: { gift: number } | null`.
- `uiBridge.ts` routes core events: `lessonStarted` → `expanded = true` (and starts the 8 s collapse timer); `lessonDone` → `doneFlash = id` for 1.2 s; `noteShown` → push to `noteQueue`; `lessonsComplete` → `complete = { gift }`.
- The goal card reads the lesson from `gameStore` state (not from events), so it is correct after loading a save.
- Sounds (`audio/soundMap.ts`): `lessonDone` → `['chime']`; `lessonsComplete` → `['chime', 'coin']`; `noteShown` → none. When one command emits both `lessonDone` and `milestoneReached` (e.g. the first till), play `chime` once, not twice.
- Remove every `offerTip(...)` call in `App.tsx` and `uiBridge.ts`.

### 4.8 Journal tab (`JournalPanel.tsx`)

The pause menu tabs become **Bag · Calendar · Journal · Settings**. The Journal has three sections:

1. **Lessons.** The 10 lessons in order, each a row with a state icon: done (tick, `--leaf`), current (filled dot, `--gold`), upcoming (empty dot, `--ink-soft`). Lessons before the current one count as done; when `lesson` is `'complete'`, all are done; when `'off'`, none are marked (all shown as plain rows). Every row expands (disclosure button) to show its body and chips for the current device. All rows are readable at all times; nothing is locked.
2. **Notes.** All 10 notes, title and body, in `NOTE_IDS` order, always readable whether or not they have been shown in this save (help must always be available).
3. **Controls.** A table with the actions from §4.3 as rows and Keyboard / Gamepad / Touch as columns. The column of the current device is highlighted (`--parchment-deep` background) and comes first on narrow screens (below 480 px, show only the current device's column plus a `Show all devices` toggle).

At the bottom, one button:
- When `lesson` is a `LessonId`: **Skip lessons**. It opens a confirm dialog: title `Skip Grandpa's lessons?`, body `You can start them again from this Journal any time.`, buttons `Skip` and `Keep learning` (default focus on `Keep learning`). `Skip` dispatches `skipLessons`.
- When `lesson` is `'off'` or `'complete'`: **Start lessons again**. Dispatches `restartLessons` and closes the menu.

### 4.9 New Game screen

Add a checkbox under the name fields: label `Grandpa's lessons`, hint text `Recommended for your first farm.`, checked by default. Its value is passed as `NewGameOptions.lessons`.

### 4.10 Settings and old tips

- Delete `Tips.tsx`, `offerTip`, the `tip` field of `uiStore`, and `TipId`.
- Remove `seenTips` from `Settings` and `DEFAULT_SETTINGS`.
- `loadSettings` MUST copy only keys that exist in `DEFAULT_SETTINGS`, so an old `seenTips` value in localStorage is dropped and not written back.
- `introSeen` stays as it is.

---

## 5. Text

All player-facing text is in Appendix A and MUST be used verbatim (put it in `ui/lessons/lessonText.ts`). Bodies are at most 20 words; a unit test checks this.

---

## 6. Saves: version 2

### 6.1 Schema

`CURRENT_SAVE_VERSION = 2`. `gameStateSchema` accepts only `version: 2` and adds:

```ts
tutorial: z.object({
  lesson: z.enum([...LESSON_ORDER, 'complete', 'off']),
  count: z.number().int().min(0),
  notesSeen: z.array(z.enum(NOTE_IDS)),
}),
```

### 6.2 Migration 1 → 2

Input: a v1 `SaveFile`. Output: the same file with `version: 2`, `state.version: 2`, and `state.tutorial = { lesson: 'off', count: 0, notesSeen: [...NOTE_IDS] }`. Everything else is unchanged. Existing players know the basics, so their lessons and notes are off; they can start the lessons from the Journal.

### 6.3 Fixture

Copy `packages/core/test/fixtures/part1-save-v1.json` from the local branch `docs/part2a-spec` (commit `a3539cb`) with `git checkout docs/part2a-spec -- packages/core/test/fixtures/part1-save-v1.json`. It is a real Part 1 save. Do not edit it.

---

## 7. Testing

### 7.1 Core (`packages/core/test`)

`tutorial.test.ts`:
- each lesson's done condition, using small hand-built states (`blankFarm`, `fresh`, `standAt` helpers that exist today);
- counted lessons: three `tileTilled` events in one command complete `till` at once; `count` resets to 0 on the next lesson;
- "already done when it starts": `restartLessons` with the player standing in the field and 3 crops planted and watered emits `lessonStarted` + `lessonDone` for `walkToField`, `till`, `plant` and `water` in that order, then `lessonStarted` for `sleep`, which is active;
- adaptive rules: all crops died with seeds in bag → `plant`; no seeds → `buySeeds`; no seeds, no crops, gold below cheapest seed → `complete` with gift;
- gift: completing `buySeeds` adds exactly 100 gold and emits `goldChanged` and `lessonsComplete`;
- notes: each trigger shows its note once; a second trigger does nothing; at most one note per command; no notes when `lesson === 'off'`; notes still show when `lesson === 'complete'`;
- `skipLessons` and `restartLessons`;
- `lesson === 'off'` emits no lesson events for a full simulated week of play.

`tutorialTarget.test.ts`:
- every row of the §3.9 tables, including the "different map → door" rule and the tie-break order;
- `FIELD_RECT` matches `FARM_LAYOUT` (§3.6).

`tutorial.property.test.ts` (fast-check, 200 runs): from a new game with lessons on, any random sequence of up to 300 valid commands never throws, always yields a schema-valid state, and the lesson index only moves forward except through the §3.5 rules (which only ever target `plant` or `buySeeds`).

`migration.test.ts`: the fixture migrates to a valid v2 file with lessons off and all notes seen; all other fields are equal; unknown versions are still rejected.

### 7.2 Web (`apps/web/src`, Vitest + Testing Library)

- `GoalCard`: renders title, progress pill and chips for each device; auto-expands on `lessonStarted` and collapses after 8 s (fake timers); toggles on click; live region text.
- `hints`: every lesson maps to the chips in §4.3; `pickSeeds` uses the real slot number.
- `NoteCard`: queue order, `Got it`, 10 s auto-dismiss.
- `JournalPanel`: row states for `off`, mid-path and `complete`; Skip confirm flow; Start again dispatches `restartLessons`.
- `NewGame`: the checkbox defaults to checked and is passed through.
- `loadSettings` drops `seenTips`.
- Text: every body in `lessonText.ts` has at most 20 words.

### 7.3 End-to-end (`apps/web/e2e/lessons.spec.ts`, Chromium and WebKit)

1. **Golden path.** New game (lessons on) → the goal card says `Walk to the field` → walk north with the keyboard until the card changes → till 3 tiles (`faceTile` + `Space`) → plant 3 (`6`, `F`) → water 3 (`2`, `Space`) → `Rest for the night` → `sleepNight` → `Water every morning` → water → sleep 3 more nights, watering each morning → harvest → open the bin and ship → `sleepNight` → `Buy more seeds` → teleport to the cart, buy one turnip seed pack → the `The rest is yours` panel shows, gold rose by 100 → close it → no goal card.
2. **Skip.** New game → Esc → Journal → Skip lessons → Skip → resume → no goal card; Journal shows `Start lessons again`.
3. **Off by choice.** New game with the checkbox unticked → no goal card.
4. **Note.** New game → select the can, empty it on grass until `canEmpty` fires → the note card shows `Out of water` → `Got it` hides it.
5. **Old save.** Import the v1 fixture on the slots screen → plays, no goal card.
6. **Accessibility.** axe has no serious violations on the game screen with the goal card expanded and on the Journal tab.

Use the existing helpers (`newGame`, `faceTile`, `act`, `sleepNight`, `state`). Add a `newGame(page, seed, { lessons })` option if needed; it defaults to lessons off, so existing tests are unchanged; only `lessons.spec.ts` turns them on.

---

## 8. Acceptance criteria

1. All §1.1 success criteria hold.
2. `pnpm checks` passes; core coverage ≥ 90%.
3. Lesson UI adds at most **6 KB gzipped** to the initial bundle (`pnpm --filter web size` still passes).
4. With lessons on, the game still runs at the Part 1 frame budget (the marker is 2 meshes; no new post-processing).
5. No tutorial code path disables or intercepts any player input.

---

## 9. Impact on Part 2A (update that spec when this ships)

The Part 2A spec on branch `docs/part2a-spec` was written before this one. When this tutorial is merged, update it as follows:

1. Save version: Part 2A becomes **v2 → v3** (migration `2 → 3`), keeps `tutorial` unchanged, and its migration test uses a v2 fixture.
2. Part 2A removes Sol's cart and sells seeds in the town's general store. Update this spec's `buySeeds` lesson: target becomes the general store door; body text becomes `The general store in town sells seeds. Spend some of those coins.` (12 words); the `cartClosed` note becomes `storeClosed` with the store's hours.
3. Part 3's planned "journal" builds on the Journal tab added here.

---

## Appendix A: Text (verbatim)

### A.1 Lessons

| Lesson | Title | Body |
|---|---|---|
| `walkToField` | Walk to the field | The old field lies north of where you stand. Walk up and take a look. |
| `till` | Break some ground | Grass won't take seeds. Pick the hoe and turn three patches of grass into soil. |
| `plant` | Plant your turnips | Turnips are forgiving. Pick the seed pouch, face the soil, and tuck a seed into each patch. |
| `water` | Water the seedlings | Seeds are thirsty. Pick the watering can and give every planted patch a drink. |
| `sleep` | Rest for the night | Watch the clock and your energy. Sleeping in your bed ends the day and saves the farm. |
| `waterDaily` | Water every morning | Morning! Crops only grow on days they're watered. Rain does it for you. Turnips need four days. |
| `harvest` | Harvest a turnip | Look at that, it's ripe! Cut it with the sickle, or face it and pick it by hand. |
| `ship` | Fill the shipping bin | The bin by the house buys anything you grow. Open it and put your turnip in. |
| `sellOvernight` | Sleep on it | The bin is emptied at night, and the money is yours by morning. Go to bed. |
| `buySeeds` | Buy more seeds | Sol's cart on the east road sells seeds from nine to five. Spend some of those coins. |

### A.2 Notes

| Note | Title | Body |
|---|---|---|
| `canEmpty` | Out of water | An empty can waters nothing. Face the pond and use the can to fill it up. |
| `staminaLow` | Running low | You're tiring. Eat a crop you grew, or call it a day and sleep. |
| `exhausted` | Worn out | You've worked yourself to the bone. You'll move slowly until you eat or sleep. |
| `passedOut` | Too late a night | You stayed out too late and collapsed. You wake with half your energy. Bed earlier! |
| `rain` | Rainy day | Rain waters every crop for you. Spend the day clearing the field instead. |
| `obstacles` | Clearing the field | Weeds need the sickle, rocks the hammer, stumps the axe. Clear them to make room. |
| `wrongSeason` | Wrong season | Every seed has its season. Seeds planted out of season won't sprout. |
| `newSeason` | A new season | The season turned. Last season's crops wither, so plant what the cart sells now. |
| `bagFull` | Bag is full | Your bag is full. Ship or eat something to make room. |
| `cartClosed` | Cart is closed | Sol keeps the cart open nine to five, spring to fall. Come back then. |

### A.3 Lessons complete

- Title: `The rest is yours`
- Body: `That's all I can teach you from a notebook. The valley remembers people who stay. — Elias`
- Gift line: `Tucked in the last page: 100 gold.`
- Button: `Thanks, Grandpa`

### A.4 Journal and New Game

- Tab: `Journal`. Section headings: `Lessons`, `Notes`, `Controls`.
- Buttons: `Skip lessons`, `Start lessons again`, `Show all devices`.
- Skip dialog: title `Skip Grandpa's lessons?`, body `You can start them again from this Journal any time.`, buttons `Skip`, `Keep learning`.
- New Game checkbox: `Grandpa's lessons`, hint `Recommended for your first farm.`
