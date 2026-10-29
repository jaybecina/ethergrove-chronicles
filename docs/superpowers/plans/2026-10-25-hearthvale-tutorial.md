# Grandpa's Lessons (Tutorial) Implementation Plan

> Written when the game was named Hearthvale; it is now Ethergrove Chronicles (see [the 2026-10-29 spec](../specs/2026-10-29-ethergrove-chronicles-design.md)).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a guided, never-blocking tutorial (10 lessons + 10 one-time notes + a Journal tab) that teaches the farm loop from Day 1 to the first sale and seed purchase.

**Architecture:** Tutorial progress is a `tutorial` field in the core `GameState` (save v2), advanced by a pure `advanceTutorial(prev, next, events)` step that runs after every command, like `checkMilestones`. The web app only draws it: a goal card and note cards in the HUD, a 3D marker plus screen-edge pointer, a hotbar highlight, a completion panel, and a Journal tab, all reading core state and core events.

**Tech Stack:** TypeScript 6, pnpm workspace, `packages/core` (pure TS, zod, Vitest, fast-check), `apps/web` (React 19, React Three Fiber 9, drei 10, Zustand, Vitest + Testing Library, Playwright).

**Spec:** `docs/superpowers/specs/2026-10-25-hearthvale-tutorial-design.md` (read it before starting; section numbers below refer to it).

## Global Constraints

- All player-facing text comes verbatim from spec Appendix A. Lesson/note bodies ≤ 20 words, titles ≤ 5 words.
- Lesson order, done conditions, adaptive rules, note triggers and marker targets are exactly spec §3.2–§3.9.
- Save version becomes **2**; v1 saves migrate with `{ lesson: 'off', count: 0, notesSeen: [...NOTE_IDS] }`.
- Gift on completion: **100** gold (`LESSONS_GIFT`).
- Timings: goal card auto-collapses after **8 s**; note cards auto-dismiss after **10 s**; done flash **1.2 s**; slide-in **250 ms**, 12 px (none under Reduced motion).
- Use existing `theme.css` tokens only; no new colours. Touch targets ≥ 44 × 44 px.
- No tutorial code may disable or intercept player input.
- `createNewGame`'s `lessons` option is **optional and defaults to `false`**, so existing core tests, the e2e debug hook and the title-screen backdrop are unchanged. The New Game screen passes it explicitly (checkbox default checked). The e2e `newGame` helper also defaults to lessons **off**; only `lessons.spec.ts` turns them on.
- Every commit runs the pre-commit hook (lint-staged, typecheck, unit tests); never use `--no-verify`. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Core coverage must stay ≥ 90% (`pnpm test:coverage`). The initial bundle grows by ≤ 6 KB gzipped (`pnpm --filter web size`).

## Review Focus

1. **Loading a save mid-lesson** (no `lessonStarted` event fires): the goal card must show the saved lesson and progress straight from state. → Task 7 test `renders the saved lesson without any event`.
2. **Switching device mid-lesson** (keyboard → touch → gamepad): chips must change immediately, not on the next lesson. → Task 7 test `chips follow the current device`.
3. **Finishing a lesson inside another overlay**: `buySeeds` completes while the cart is open and `ship` while the bin is open. The completion panel must wait until that overlay closes, not replace it. → Task 6 test `opens the lessons overlay only once no other overlay is open`.
4. **Harvesting by hand** (`interact`, not the sickle) must complete `harvest` too. → Task 2 test `harvest completes by hand or by sickle`.
5. **Small phone with Text size 1.5**: the goal card must stay inside the viewport and not cover the hotbar or joystick. → Task 10 test `goal card fits on a phone at text size 1.5` in `devices.spec.ts`.

---

### Task 1: Core state, data and save v2

**Files:**
- Modify: `packages/core/src/types.ts` (add types from spec §3.1; `GameState.version: 2`; `tutorial: TutorialState`; commands; events; `NewGameOptions.lessons?: boolean`)
- Create: `packages/core/src/data/lessons.ts` (`LESSON_ORDER`, `LESSON_GOAL`, `NOTE_IDS`, `LESSONS_GIFT` exactly as spec §3.2)
- Modify: `packages/core/src/data/layouts.ts` (export `FIELD_RECT`, spec §3.6)
- Modify: `packages/core/src/newGame.ts` (spec §3.8)
- Modify: `packages/core/src/save/schema.ts` (`version: z.literal(2)`, `tutorial` object, spec §6.1)
- Modify: `packages/core/src/save/migrate.ts` (`CURRENT_SAVE_VERSION = 2`; `MIGRATIONS[1]`, spec §6.2)
- Modify: `packages/core/src/applyCommand.ts` (add `skipLessons`/`restartLessons` cases returning `only(state)` for now; Task 2 fills them)
- Modify: `packages/core/src/index.ts` (export `LESSON_ORDER`, `LESSON_GOAL`, `NOTE_IDS`, `LESSONS_GIFT`, `FIELD_RECT`)
- Create: `packages/core/test/fixtures/part1-save-v1.json` (`git checkout docs/part2a-spec -- packages/core/test/fixtures/part1-save-v1.json`)
- Test: `packages/core/test/lessonsData.test.ts`, `packages/core/test/save.test.ts`, `packages/core/test/newGame.test.ts`

**Interfaces:**
- Produces: types `LessonId`, `NoteId`, `TutorialState { lesson: LessonId | 'complete' | 'off'; count: number; notesSeen: NoteId[] }`; commands `{ type: 'skipLessons' }`, `{ type: 'restartLessons' }`; events `lessonStarted { id: LessonId }`, `lessonDone { id: LessonId }`, `lessonsComplete { gift: number }`, `noteShown { id: NoteId }`; constants above; `FIELD_RECT = { x0: 3, y0: 6, x1: 27, y1: 16 }` (inclusive).

- [ ] **Step 1: Write the failing tests**

```ts
// lessonsData.test.ts
it('FIELD_RECT covers exactly the field cells of FARM_LAYOUT', () => {
  FARM_LAYOUT.forEach((row, y) => [...row].forEach((c, x) => {
    const inside = x >= FIELD_RECT.x0 && x <= FIELD_RECT.x1 && y >= FIELD_RECT.y0 && y <= FIELD_RECT.y1;
    expect(c === '.').toBe(inside);
  }));
});
it('lists 10 lessons and 10 notes', () => {
  expect(LESSON_ORDER).toHaveLength(10);
  expect(new Set(NOTE_IDS).size).toBe(10);
  expect(LESSON_GOAL).toEqual({ till: 3, plant: 3 });
  expect(LESSONS_GIFT).toBe(100);
});

// newGame.test.ts
it('starts lessons only when asked', () => {
  expect(fresh().tutorial).toEqual({ lesson: 'off', count: 0, notesSeen: [] });
  const on = createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari', lessons: true });
  expect(on.tutorial).toEqual({ lesson: 'walkToField', count: 0, notesSeen: [] });
  expect(on.version).toBe(2);
});

// save.test.ts
it('migrates a real Part 1 save to v2 with lessons off', () => {
  const v1 = JSON.parse(readFileSync(new URL('./fixtures/part1-save-v1.json', import.meta.url), 'utf8'));
  const r = migrate(v1);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expect(r.file.version).toBe(2);
  expect(r.file.state.version).toBe(2);
  expect(r.file.state.tutorial).toEqual({ lesson: 'off', count: 0, notesSeen: [...NOTE_IDS] });
  const { tutorial: _t, version: _v, ...rest } = r.file.state;
  const { version: _v1, ...restV1 } = v1.state;
  expect(rest).toEqual(restV1);
  expect(saveFileSchema.safeParse(r.file).success).toBe(true);
});
```

Update the existing "runs injected migrations" test so its expectations use `CURRENT_SAVE_VERSION` instead of a literal `1`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm --filter @hearthvale/core test`
Expected: FAIL (`FIELD_RECT`/`LESSON_ORDER` not exported; `tutorial` undefined; migration returns `unsupportedVersion` or no `tutorial`).

- [ ] **Step 3: Implement**

Types, data, `FIELD_RECT`, `createNewGame` (`opts.lessons === true` → `'walkToField'`, else `'off'`), schema v2, `MIGRATIONS[1] = (file) => ({ ...file, version: 2, state: { ...file.state, version: 2, tutorial: { lesson: 'off', count: 0, notesSeen: [...NOTE_IDS] } } })` (follow the existing `Migration` type). Fix every compile error the version bump causes in core tests by using `fresh()`/`createNewGame` instead of hand-written `version: 1` states.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @hearthvale/core test && pnpm typecheck`
Expected: all pass. (The web app still compiles: `lessons` is optional.)

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): tutorial state, lesson data and save v2"
```

---

### Task 2: Lesson progression, skip and restart

**Files:**
- Create: `packages/core/src/systems/tutorial.ts`
- Modify: `packages/core/src/applyCommand.ts` (run `advanceTutorial` after `checkMilestones`; real `skipLessons`/`restartLessons`)
- Test: `packages/core/test/tutorial.test.ts`

**Interfaces:**
- Consumes: Task 1 types and constants.
- Produces:
  - `advanceTutorial(prev: GameState, next: GameState, events: GameEvent[]): Result`
  - `startLesson(state: GameState, id: LessonId, events: GameEvent[]): GameState` (appends to `events`; chains through "already done" lessons per spec §3.4; completes the path with the gift past `buySeeds`)
  - `skipLessons(state: GameState): Result`, `restartLessons(state: GameState): Result`
  - `applyCommand` returns `advanceTutorial(state, milestoneResult.state, milestoneResult.events)`.

- [ ] **Step 1: Write the failing tests** (build states with `fresh`, `blankFarm`, `standAt`, `withTile`, `withBag`; add `lessonAt(state: GameState, id: LessonId, count = 0): GameState` to `test/helpers.ts`, which sets `tutorial` directly; Tasks 3 and 4 reuse it)

```ts
it('walkToField completes on entering the field and starts till', () => {
  const s = lessonAt(standAt(blankFarm(fresh()), 10, 17, 'n'), 'walkToField');
  const r = applyCommand(s, { type: 'move', dx: 0, dz: -1, dtMs: 500 });
  expect(types(r)).toEqual(expect.arrayContaining(['lessonDone', 'lessonStarted']));
  expect(r.state.tutorial).toMatchObject({ lesson: 'till', count: 0 });
});
it('till counts tileTilled events and completes at 3', () => { /* 3 useTool on grass → lesson 'plant', count 0 */ });
it('plant also completes after 1 when no seeds are left', () => { /* bag with 1 seed, plant it → lesson 'water' */ });
it('water completes when every farm crop is watered', () => { /* 2 crops, water one → still 'water'; water both → 'sleep' */ });
it('sleep completes on dayStarted, by bed or by passing out', () => { /* both paths → 'waterDaily' */ });
it('waterDaily completes at once on a rainy morning', () => { /* weather.today 'rain' at dayStarted → 'harvest' */ });
it('harvest completes by hand or by sickle', () => { /* mature crop: interact → 'ship'; separately sickle useTool → 'ship' */ });
it('ship completes when the bin gains items', () => { /* shipItem → 'sellOvernight' */ });
it('sellOvernight completes on a shipping report with money', () => { /* bin with turnip, sleep → 'buySeeds' */ });
it('buySeeds completes the path and gives 100 gold once', () => {
  const s = lessonAt(standAt(blankFarm(fresh()), 30, 17, 'e'), 'buySeeds'); // at 10:00, cart open
  const r = applyCommand(s, { type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
  expect(r.state.tutorial.lesson).toBe('complete');
  expect(r.state.gold).toBe(s.gold - 20 + 100);
  expect(r.events).toContainEqual({ type: 'lessonsComplete', gift: 100 });
  expect(r.events).toContainEqual(expect.objectContaining({ type: 'goldChanged', delta: 100 }));
});
it('restartLessons passes through lessons the farm already satisfies', () => {
  // player in field, 3 crops planted and watered, lesson 'off'
  const r = applyCommand(s, { type: 'restartLessons' });
  expect(r.events.filter((e) => e.type === 'lessonDone').map((e) => e.id))
    .toEqual(['walkToField', 'till', 'plant', 'water']);
  expect(r.state.tutorial.lesson).toBe('sleep');
});
it('skipLessons turns lessons off and keeps notesSeen', () => { /* lesson 'off', count 0 */ });
it('emits no lesson events while lessons are off', () => { /* fresh() + 7 nights of tick/sleep → no lesson* events */ });
```

(`types(r)` = `r.events.map((e) => e.type)`.)

- [ ] **Step 2: Run to see them fail**

Run: `pnpm --filter @hearthvale/core test tutorial`
Expected: FAIL (`advanceTutorial` not wired; lesson never changes).

- [ ] **Step 3: Implement `systems/tutorial.ts` and wire `applyCommand`**

One `isDone(id, prev, next, events): boolean` and one `doneAtStart(id, state): boolean`, each a `switch` over `LessonId` with the rules from spec §3.2. Keep §3.5 (adaptive) and §3.7 (notes) out of this task; Task 3 adds them as further steps inside `advanceTutorial` (leave the call order from spec §3.3 visible as comments: count → done → adaptive → complete → notes).

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @hearthvale/core test`
Expected: PASS, all suites.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): lesson progression with skip and restart"
```

---

### Task 3: Adaptive rules, notes, and the property test

**Files:**
- Modify: `packages/core/src/systems/tutorial.ts`
- Test: `packages/core/test/tutorial.test.ts`, create `packages/core/test/tutorial.property.test.ts`

**Interfaces:**
- Consumes: Task 2's `advanceTutorial`, `startLesson`.
- Produces: no new exports; `advanceTutorial` now also applies spec §3.5 and §3.7.

- [ ] **Step 1: Write the failing tests**

```ts
it('all crops gone with seeds in bag → back to plant', () => { /* lesson 'waterDaily', farm has 0 crops, bag has seed:turnip, spring → after any command lesson 'plant' */ });
it('all crops gone and no seeds → buySeeds', () => { /* … → 'buySeeds' */ });
it('nothing left to learn with → complete with gift', () => { /* 'buySeeds', no seeds, no crops, gold 10 → 'complete', gold 110 */ });
it('winter with no seeds and no crops → complete with gift', () => {});
it('crops dying while others remain does not move the lesson', () => {});
it.each([
  ['canEmpty', /* useTool with can, canCharges 0, facing grass */],
  ['staminaLow', /* …*/], ['exhausted'], ['passedOut'], ['rain'], ['obstacles'],
  ['wrongSeason'], ['newSeason'], ['bagFull'], ['cartClosed'],
])('note %s shows once', (id, makeState, cmd) => { // one case per trigger row of spec §3.7
  const r1 = applyCommand(makeState(), cmd);
  expect(r1.events).toContainEqual({ type: 'noteShown', id });
  expect(r1.state.tutorial.notesSeen).toContain(id);
  const r2 = applyCommand(withSameTrigger(r1.state), cmd);
  expect(r2.events.some((e) => e.type === 'noteShown')).toBe(false);
});
it('shows at most one note per command, first in NOTE_IDS order', () => {});
it('shows no notes when lessons are off, but still after completion', () => {});
```

```ts
// tutorial.property.test.ts — 200 runs, reuse arbitraries.ts command generators
it('never throws, stays schema-valid, and only moves back via the adaptive rules', () => {
  fc.assert(fc.property(seedArb, fc.array(commandArb, { maxLength: 300 }), (seed, cmds) => {
    let s = createNewGame({ seed, farmName: 'A', playerName: 'B', lessons: true });
    for (const c of cmds) {
      const before = order(s.tutorial.lesson);
      s = applyCommand(s, c).state;
      const after = order(s.tutorial.lesson);
      if (after < before) expect(['plant', 'buySeeds']).toContain(s.tutorial.lesson);
    }
    expect(gameStateSchema.safeParse(s).success).toBe(true);
  }), { numRuns: 200 });
});
```

(`order('off')` = −1, a `LessonId` = its index, `'complete'` = 10.)

- [ ] **Step 2: Run to see them fail**

Run: `pnpm --filter @hearthvale/core test tutorial`
Expected: FAIL on the adaptive and note tests.

- [ ] **Step 3: Implement spec §3.5 and §3.7 inside `advanceTutorial`**

The cheapest seed of a season = minimum `CROPS[c].seedCost` over crops with `season === calendar.season`; winter has none. The `obstacles` trigger reads the faced tile with `targetTile(next.player)` and `tileAt` on `next.maps[next.player.location]`.

- [ ] **Step 4: Run tests and coverage**

Run: `pnpm --filter @hearthvale/core test:coverage`
Expected: PASS; `systems/tutorial.ts` ≥ 90% lines; package total ≥ 90%.

- [ ] **Step 5: Commit**

```bash
git add packages/core
git commit -m "feat(core): adaptive lessons, one-time notes, property test"
```

---

### Task 4: Marker target and hotbar slot

**Files:**
- Modify: `packages/core/src/systems/tutorial.ts`, `packages/core/src/index.ts`
- Test: `packages/core/test/tutorialTarget.test.ts`

**Interfaces:**
- Produces: `interface LessonTarget { location: LocationId; x: number; y: number }`; `lessonTarget(state: GameState): LessonTarget | null`; `lessonSlot(state: GameState): HotbarIndex | null`. Export `lessonTarget`, `lessonSlot` and `LessonTarget` from `index.ts`; `advanceTutorial` stays internal.

- [ ] **Step 1: Write the failing tests**, one per row of spec §3.9, plus:

```ts
it('points at the door when the target is on the other map', () => {
  const s = lessonAt({ ...fresh(), player: { ...fresh().player, location: 'house' } }, 'ship');
  expect(lessonTarget(s)).toEqual({ location: 'house', ...doorOf(s.maps.house, 'exitDoor') });
});
it('breaks distance ties by lower y, then lower x', () => {
  // lesson 'till', player on (10, 10); the only grass in the field is (11, 10), (9, 10) and (10, 11), all at distance 1
  expect(lessonTarget(s)).toEqual({ location: 'farm', x: 9, y: 10 });
});
it('is null when lessons are off or complete, and for harvest before anything is ripe', () => {});
it('lessonSlot picks the pinned seed quick slot', () => {
  const s = lessonAt(fresh(), 'plant'); // quickSlots [0, null, null], bag[0] seeds
  expect(lessonSlot(s)).toBe(5);
  expect(lessonSlot({ ...s, quickSlots: [null, null, null] })).toBeNull();
});
```

- [ ] **Step 2: Run to see them fail** — `pnpm --filter @hearthvale/core test tutorialTarget` → FAIL (not exported).

- [ ] **Step 3: Implement** — a `nearest(grid, from, predicate)` helper scanning tiles in row-major order and keeping the first strictly-smaller Manhattan distance (row-major order gives the lower-y-then-lower-x tie-break for free). Door tiles come from `findFeature`.

- [ ] **Step 4: Run tests** — `pnpm --filter @hearthvale/core test` → PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(core): lesson marker target and hotbar slot"`

---

### Task 5: Lesson text and control chips

**Files:**
- Create: `apps/web/src/ui/lessons/lessonText.ts`, `apps/web/src/ui/lessons/hints.ts`
- Test: `apps/web/src/ui/lessons/lessons.test.ts`

**Interfaces:**
- Produces:
  - `LESSON_TEXT: Record<LessonId, { title: string; body: string }>`, `NOTE_TEXT: Record<NoteId, { title: string; body: string }>`, `COMPLETE_TEXT = { title, body, gift: (n: number) => string, button }`, `JOURNAL_TEXT` (Appendix A.4 strings) — all verbatim from spec Appendix A.
  - `type HintAction = 'walk' | 'run' | 'camera' | 'pickHoe' | 'pickCan' | 'pickSickle' | 'pickSeeds' | 'useTool' | 'interact' | 'menu'`
  - `interface Chip { keys: string[]; label: string }`
  - `chipsFor(lesson: LessonId, device: Device, state: GameState): Chip[]` (spec §4.3 tables; `Device` from `apps/web/src/input/intents.ts`)
  - `chipFor(action: HintAction, device: Device, state: GameState): Chip` (used by the Journal's Controls table)
  - `HINT_ACTIONS: readonly HintAction[]` in table order.

- [ ] **Step 1: Write the failing tests**

```ts
it('every lesson and note body is at most 20 words, titles at most 5', () => {
  for (const t of [...Object.values(LESSON_TEXT), ...Object.values(NOTE_TEXT)]) {
    expect(t.body.split(/\s+/).length).toBeLessThanOrEqual(20);
    expect(t.title.split(/\s+/).length).toBeLessThanOrEqual(5);
  }
});
it('till on keyboard shows 1 Hoe and Space Use', () => {
  expect(chipsFor('till', 'keyboard', g)).toEqual([{ keys: ['1'], label: 'Hoe' }, { keys: ['Space'], label: 'Use' }]);
});
it('pickSeeds uses the real seed slot, or Bag when none is pinned', () => {
  expect(chipsFor('plant', 'keyboard', g)[0]).toEqual({ keys: ['6'], label: 'Seeds' });
  expect(chipsFor('plant', 'keyboard', noPin)[0]).toEqual({ keys: ['Esc'], label: 'Bag' });
});
it.each(['keyboard', 'gamepad', 'touch'] as const)('every lesson has chips on %s', (d) => {
  for (const id of LESSON_ORDER) expect(chipsFor(id, d, g).length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run** — `pnpm --filter web test lessons` → FAIL.
- [ ] **Step 3: Implement** the two modules (data tables + the `pickSeeds` special case via `lessonSlot`).
- [ ] **Step 4: Run** — `pnpm --filter web test lessons` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): lesson text and device-aware control chips"`

---

### Task 6: Event routing, sounds, and removing the old tips

**Files:**
- Create: `apps/web/src/ui/lessons/lessonStore.ts`
- Modify: `apps/web/src/ui/uiBridge.ts`, `apps/web/src/audio/soundMap.ts`, `apps/web/src/audio/install.ts`, `apps/web/src/game/store.ts`, `apps/web/src/ui/uiStore.ts`, `apps/web/src/App.tsx`, `apps/web/src/game/debugHook.ts`
- Delete: `apps/web/src/ui/screens/Tips.tsx` (and its tests/CSS `.tip` rules)
- Test: `apps/web/src/ui/lessons/lessonStore.test.ts`, existing `audio/audio.test.ts`, existing store/settings tests, `game/debugHook.test.ts`

**Interfaces:**
- Produces:
  - `lessonStore` (Zustand vanilla + `useLessons` hook): `{ expanded: boolean; doneFlash: LessonId | null; noteQueue: NoteId[]; completeGift: number | null; setExpanded(v: boolean): void; dismissNote(): void; clearComplete(): void }`
  - `installLessonBridge(store: StoreApi<GameStore>, bus: EventBus): () => void` (called from `installUiBridge`): `lessonStarted` → `expanded = true` and (re)start an 8 s timer that sets it false; `lessonDone` → `doneFlash = id`, cleared after 1.2 s; `noteShown` → push to `noteQueue`; `lessonsComplete` → `completeGift = gift`.
  - `Overlay` gains `'lessons'`. When `completeGift` is set and `overlay === null`, the bridge calls `setOverlay('lessons')` (subscribe to the store; this is what makes Review Focus #3 work).
  - Debug hook: `setSeed(seed: number, opts?: { lessons?: boolean })`.

- [ ] **Step 1: Write the failing tests** (fake timers)

```ts
it('expands on lessonStarted and collapses after 8 s', () => {});
it('flashes done for 1.2 s', () => {});
it('queues notes in arrival order and dismissNote pops the head', () => {});
it('opens the lessons overlay only once no other overlay is open', () => {
  gameStore.getState().setOverlay('cart');
  bus.emit([{ type: 'lessonsComplete', gift: 100 }]);
  expect(gameStore.getState().overlay).toBe('cart');
  gameStore.getState().setOverlay(null);
  expect(gameStore.getState().overlay).toBe('lessons');
});
// audio.test.ts
it('lessonDone chimes; a milestone in the same command chimes only once', () => {});
// settings
it('loadSettings drops unknown keys like seenTips', () => {});
```

- [ ] **Step 2: Run** — `pnpm --filter web test` → the new tests FAIL.
- [ ] **Step 3: Implement**
  - `soundsFor`: `lessonDone` → `['chime']`, `lessonsComplete` → `['chime']` (the gift's `goldChanged` already plays `coin`).
  - `install.ts`: skip a repeat of the same sound id within 150 ms (covers milestone + lessonDone chiming together).
  - `store.ts`: remove `seenTips`; `loadSettings` copies only keys present in `DEFAULT_SETTINGS`.
  - Remove `offerTip`, `TipId`, `uiStore.tip`, every `offerTip(...)` call, `<Tips />` and the late-sleep tip subscription in `uiBridge`.
- [ ] **Step 4: Run** — `pnpm --filter web test && pnpm typecheck && pnpm lint` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): route lesson events, chime, retire old tips"`

---

### Task 7: Goal card and note card

**Files:**
- Create: `apps/web/src/ui/lessons/GoalCard.tsx`, `apps/web/src/ui/lessons/NoteCard.tsx`, `apps/web/src/ui/lessons/lessons.css` (imported from `theme.css` or `main.tsx`, following the existing CSS pattern)
- Modify: `apps/web/src/ui/hud/Hud.tsx` (mount `<NoteCard />` then `<GoalCard />` in a `.hud-lessons` column under the clock and stamina)
- Test: `apps/web/src/ui/lessons/cards.test.tsx`

**Interfaces:**
- Consumes: `LESSON_TEXT`, `NOTE_TEXT`, `chipsFor` (Task 5); `lessonStore` (Task 6); `CROPS`, `isMature`, `LESSON_GOAL` from core.
- Produces: `<GoalCard />`, `<NoteCard />` (no props; read stores). A visually hidden live region `<div role="status" aria-live="polite" className="sr-only">` inside `GoalCard` used by both cards.

- [ ] **Step 1: Write the failing tests**

```ts
it('renders the saved lesson without any event', () => {
  setGame(lessonAt(game, 'plant', 2));
  render(<GoalCard />);
  expect(screen.getByRole('button', { name: /Plant your turnips/ })).toBeInTheDocument();
  expect(screen.getByText('2 / 3')).toBeInTheDocument();
});
it('shows watered / total for water lessons and Ripe in N days for harvest', () => {});
it('chips follow the current device', () => {
  render(<GoalCard />); act(() => lessonStore.getState().setExpanded(true));
  expect(screen.getByText('Space')).toBeInTheDocument();
  act(() => gameStore.getState().setDevice('touch'));
  expect(screen.getByText('✦')).toBeInTheDocument();
});
it('toggles expanded on click and sets aria-expanded', () => {});
it('announces new goals in the live region', () => {});
it('is hidden when lessons are off or complete, or an overlay is open', () => {});
it('NoteCard shows the head of the queue, Got it dismisses, 10 s auto-dismiss', () => {});
```

- [ ] **Step 2: Run** — FAIL (components missing).
- [ ] **Step 3: Implement** to spec §4.2 and §4.4: parchment slip (`--parchment`, `--ink`, `var(--panel-edge), var(--lift)`, 10 px radius, 12 px padding), width `min(320px, 100vw - var(--gutter) - var(--gutter-r))`, collapsed row ≥ 44 px, pill `--gold` on `--wood-dark`, slide-in 12 px / 250 ms disabled under `.reduced-motion` (use the class/setting the app already applies), eyebrow `From Grandpa's notes` in small caps.
- [ ] **Step 4: Run** — `pnpm --filter web test cards` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): goal card and note card"`

---

### Task 8: World marker, edge pointer, hotbar highlight

**Files:**
- Create: `apps/web/src/scene/markerScreen.ts`, `apps/web/src/scene/LessonMarker.tsx`, `apps/web/src/ui/hud/MarkerPointer.tsx`
- Modify: `apps/web/src/scene/World.tsx` (mount `<LessonMarker />`), `apps/web/src/ui/hud/Hud.tsx` (mount `<MarkerPointer />`), `apps/web/src/ui/hud/Hotbar.tsx` (`is-lesson` class), CSS for `.slot.is-lesson` and `.marker-pointer`
- Test: `apps/web/src/scene/markerScreen.test.ts`, `apps/web/src/ui/hud/hud.test.tsx`

**Interfaces:**
- Consumes: `lessonTarget`, `lessonSlot` (Task 4).
- Produces:
  - `markerScreen: { visible: boolean; onScreen: boolean; x: number; y: number }` (CSS px; written by the marker each frame)
  - `edgePoint(p: { x: number; y: number }, view: { w: number; h: number }, inset: number): { x: number; y: number; angle: number }` — pure: clamps the ray from the viewport centre to `p` onto the rectangle inset by `inset`, `angle` in radians pointing at `p`.

- [ ] **Step 1: Write the failing tests**

```ts
it('edgePoint clamps to the right edge for a point far right', () => {
  expect(edgePoint({ x: 5000, y: 300 }, { w: 800, h: 600 }, 24)).toMatchObject({ x: 776, y: 300, angle: 0 });
});
it('edgePoint handles the four corners and points behind the camera (flipped)', () => {});
it('hotbar rings the lesson slot unless it is already active', () => {});
```

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** to spec §4.6: octahedron r 0.18 at y 1.4, `#f3cf72` / emissive `#d9a441` ×1.5, bob ±0.08 @ 1 Hz, spin 0.6 rad/s; ring r 0.36–0.46, opacity 0.35↔0.8 @ 1 Hz, `depthWrite: false`, y 0.02; static (opacity 0.6) under Reduced motion. Render only when the target's `location` equals the player's. Each frame project with the R3F camera and write `markerScreen` (`onScreen` false when outside the viewport inset by 48 px or `z > 1` after projection). `MarkerPointer` reads it in a `requestAnimationFrame` loop, shows a 40 × 40 px gold arrow at `edgePoint(…, 24)` when `visible && !onScreen`, `aria-hidden`. Hotbar ring: 2 px `--gold-bright`, opacity pulse 60–100% over 1.6 s, static under Reduced motion.
- [ ] **Step 4: Run** — `pnpm --filter web test` → PASS. Then `pnpm dev`, start a new game with lessons on, and check by eye: marker over the field, pointer at the edge after walking away, hoe slot ringed during `till`.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): lesson marker, edge pointer, hotbar highlight"`

---

### Task 9: Completion panel, Journal tab, New Game option

**Files:**
- Create: `apps/web/src/ui/lessons/LessonsComplete.tsx`, `apps/web/src/ui/screens/JournalPanel.tsx`
- Modify: `apps/web/src/App.tsx` (`overlay === 'lessons' && <LessonsComplete />`), `apps/web/src/ui/screens/Pause.tsx` (tabs Bag · Calendar · Journal · Settings), `apps/web/src/ui/screens/NewGame.tsx` (checkbox; pass `lessons`)
- Test: `apps/web/src/ui/screens/screens.test.tsx`, `apps/web/src/ui/lessons/complete.test.tsx`

**Interfaces:**
- Consumes: `lessonStore.completeGift`, `clearComplete` (Task 6); text (Task 5); `chipFor`, `HINT_ACTIONS` (Task 5).
- Produces: `<LessonsComplete />` (uses the existing `Panel` like `MorningReport`; button closes: `clearComplete()` + `setOverlay(null)`); `<JournalPanel />`.

- [ ] **Step 1: Write the failing tests**

```ts
it('LessonsComplete shows the gift and closes on Thanks, Grandpa', () => {});
it('Journal marks done / current / upcoming rows mid-path', () => { /* lesson 'water' → 3 ticks, 1 current, 6 upcoming */ });
it('Journal shows plain rows when off and all ticks when complete', () => {});
it('every row and note expands to its body and device chips', () => {});
it('Skip lessons asks first; Keep learning has focus; Skip dispatches skipLessons', () => {});
it('Start lessons again dispatches restartLessons and closes the menu', () => {});
it('Controls table highlights the current device column', () => {});
it('New Game checkbox defaults to checked and passes lessons through', () => {});
```

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** to spec §4.5, §4.8, §4.9 and Appendix A.3–A.4. `LessonsComplete` copies `MorningReport`'s focus and close keys (Enter, Space, Escape, gamepad A/B). Below 480 px the Controls table shows only the current device column plus a `Show all devices` toggle.
- [ ] **Step 4: Run** — `pnpm --filter web test && pnpm lint && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): lessons complete panel, Journal tab, New Game option"`

---

### Task 10: End-to-end, phone layout, docs, baselines

**Files:**
- Modify: `apps/web/e2e/helpers.ts` (`newGame(page, seed, { lessons = false } = {})` → `setSeed(seed, { lessons })`)
- Create: `apps/web/e2e/lessons.spec.ts`
- Modify: `apps/web/e2e/devices.spec.ts`, `apps/web/e2e/a11y.spec.ts`, `README.md`, `apps/web/e2e/visual.spec.ts-snapshots/*` (regenerated)

- [ ] **Step 1: Write the e2e tests** (spec §7.3 scenarios 1–6; Chromium + WebKit desktop)

Golden path assertions, in order, each with `await expect(page.getByRole('button', { name: /<title>/ })).toBeVisible()`: `Walk to the field` → `Break some ground` → `Plant your turnips` → `Water the seedlings` → `Rest for the night` → `Water every morning` → `Harvest a turnip` → `Fill the shipping bin` → `Sleep on it` → `Buy more seeds` → dialog `The rest is yours` and `gold` rose by exactly 100 beyond the purchase → after `Thanks, Grandpa`, no goal card. Use real keys for the first till/plant/water (`Space`, `Digit6`, `KeyF`, `Digit2`), `act()` afterwards. For the cart: `skipMinutes` to 10:00, teleport to `(30.5, 17.5, 'e')`, `KeyF`, buy one turnip pack in the dialog.

Phone layout (in `devices.spec.ts`, runs on pixel-7 and iphone-14):

```ts
test('goal card fits on a phone at text size 1.5', async ({ page }) => {
  // settings textScale 1.5 before boot, newGame(page, 3, { lessons: true })
  const card = await page.locator('.goal-card').boundingBox();
  const hotbar = await page.getByRole('tablist', { name: 'Hotbar' }).boundingBox();
  const vp = page.viewportSize()!;
  expect(card!.x).toBeGreaterThanOrEqual(0);
  expect(card!.x + card!.width).toBeLessThanOrEqual(vp.width);
  expect(card!.y + card!.height).toBeLessThan(hotbar!.y);
});
```

a11y: add the expanded goal card and the Journal tab to the axe checks.

- [ ] **Step 2: Run** — `pnpm --filter web e2e e2e/lessons.spec.ts e2e/devices.spec.ts e2e/a11y.spec.ts` → fix until PASS on all projects that run them.
- [ ] **Step 3: Regenerate visual baselines** (the pause menu gained a tab) — `pnpm --filter web e2e e2e/visual.spec.ts --project=chromium --update-snapshots`, then open the new `pause.png` and check it by eye.
- [ ] **Step 4: README** — in "Play", add one line: `New farms start with Grandpa's lessons. Reread them, skip them or start them again from the Journal tab in the menu.`
- [ ] **Step 5: Full check** — `pnpm checks` → `✓ All 7 checks passed`.
- [ ] **Step 6: Commit** — `git commit -m "test(e2e): Grandpa's lessons end to end; docs and baselines"`
