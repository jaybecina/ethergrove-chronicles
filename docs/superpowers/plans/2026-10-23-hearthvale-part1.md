# Hearthvale Part 1 — Farm Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable, tested, deployed 3D browser farming game covering one full in-game year: clear land, 5 tools, 8 crops, 4 seasons, weather, stamina, shipping, merchant cart, and local saves, on desktop and phone.

**Architecture:** A pure, deterministic TypeScript rules engine (`packages/core`, `applyCommand(state, cmd) → { state, events }`) is driven by a Vite + React + React Three Fiber app (`apps/web`). The app maps input to commands on a fixed 50 ms step, holds state in Zustand, renders with R3F, and reacts to core events for FX, audio, and UI.

**Tech Stack:** pnpm workspaces, TypeScript (strict), Vite, React 19, three.js, @react-three/fiber, @react-three/drei, @react-three/postprocessing, n8ao, Zustand, zod, idb, Howler, Framer Motion (`motion`), Vitest, fast-check, Testing Library, fake-indexeddb, Playwright, @axe-core/playwright, size-limit, gltf-transform, ESLint (flat), Prettier, Husky, lint-staged, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-10-23-hearthvale-part1-design.md`

## Global Constraints

- `packages/core` imports no DOM, React, or three.js (enforced by an ESLint `no-restricted-imports` rule).
- Core is deterministic: same seed + same command sequence ⇒ deep-equal state. All randomness flows through `state.rng` (mulberry32).
- TypeScript: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`. Node 24. Dependency versions: latest stable at scaffold time, pinned exactly (`save-exact=true`).
- Time scale: 10 game minutes per 7 real seconds. Day starts 6:00 (minute 360); pass out at 26:00 (minute 1560).
- Seasons: 28 days each. Start: Year 1, Spring 1, 6:00, gold 500, 6 Turnip seeds.
- Max stamina 100; bag 12 slots; stack max 99; watering can 20 charges.
- Assets are CC0 only (KayKit, Quaternius, Kenney); each one is listed in `CREDITS.md`. Downloading any asset pack requires the user's OK first (state file, source, size).
- No Harvest Moon / Story of Seasons names, characters, or assets anywhere.
- Copy: use the game name "Hearthvale"; merchant is "Sol"; grandpa is "Grandpa Elias"; letter text is copied verbatim from spec Appendix A.2.
- Core coverage ≥ 90% lines and branches. Initial JS ≤ 500 KB gzipped.
- `window.__hearthvale` exists only when `VITE_E2E === 'true'`.
- Conventional Commits; every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- **Huge frame gaps** (phone locked, tab backgrounded, debugger pause): the loop must clamp a frame to 250 ms so the clock never jumps hours or causes a surprise pass-out. Test in Task 14.
- **Held input that never releases** (window blur, finger slides off screen, `pointercancel`, gamepad disconnect): movement must stop, not run forever. Tests in Task 16.
- **Holding the action button**: tool use must repeat at most once per 350 ms, not every 50 ms step (a full stamina bar must not vanish in 2 seconds). Test in Task 16.
- **Quick slot pointing at an emptied or moved bag slot**: using it must fail with `actionFailed(noItem)` and the HUD must show it empty, never crash or use the wrong item. Test in Task 4.
- **Reload after an autosave mid-day**: the game must resume at the saved minute, location, and position, with the clock frozen until the player closes the slots screen. Test in Task 15.

---

## File Map

```
hearthvale/
  package.json, pnpm-workspace.yaml, tsconfig.base.json, eslint.config.js, .prettierrc, .npmrc
  .husky/pre-commit, .github/workflows/ci.yml, vercel.json
  README.md, CREDITS.md, docs/ARCHITECTURE.md
  packages/core/
    package.json, tsconfig.json, vitest.config.ts
    src/index.ts                 public API barrel
    src/types.ts                 all shared types (Task 2)
    src/data/balance.ts          numeric constants
    src/data/crops.ts            CROPS table
    src/data/items.ts            ITEMS table (sell price, kind, eat value)
    src/data/weatherTable.ts
    src/data/layouts.ts          ASCII farm + house maps
    src/rng.ts                   mulberry32
    src/grid.ts                  parseLayout, tileAt, setTile, isBlocked
    src/newGame.ts
    src/systems/calendar.ts
    src/systems/bag.ts
    src/systems/movement.ts
    src/systems/tools.ts
    src/systems/crops.ts
    src/systems/weather.ts
    src/systems/day.ts           endDay
    src/systems/economy.ts
    src/systems/interact.ts
    src/systems/milestones.ts
    src/applyCommand.ts          dispatcher
    src/save/schema.ts, src/save/migrate.ts, src/save/repository.ts
    test/*.test.ts               one file per system, plus invariants.test.ts, determinism.test.ts
  apps/web/
    package.json, tsconfig.json, vite.config.ts, vitest.config.ts, playwright.config.ts, index.html, .size-limit.json
    scripts/optimize-assets.mjs
    public/assets/{models,textures,audio}/
    src/main.tsx, src/App.tsx
    src/game/store.ts, src/game/loop.ts, src/game/eventBus.ts, src/game/debugHook.ts, src/game/config.ts
    src/input/intents.ts, keyboard.ts, gamepad.ts, touch.ts, mapper.ts, actionGate.ts, toCommands.ts
    src/save/idbRepository.ts, src/save/autosave.ts, src/save/fileIO.ts
    src/scene/GameCanvas.tsx, World.tsx, Terrain.tsx, Tiles.tsx, Features.tsx, Player.tsx, CameraRig.tsx, TargetHighlight.tsx, HouseInterior.tsx, Crops.tsx, Grass.tsx, Trees.tsx, Water.tsx, Sky.tsx, Weather.tsx, Kindling.tsx
    src/scene/fx/Particles.tsx, FloatText.tsx
    src/render/lighting.ts, Lighting.tsx, PostFX.tsx, quality.ts, seasonPalette.ts, shaders/{wind,snowMask,water}.ts
    src/ui/hud/{Hud,Clock,Gold,Stamina,Hotbar,Prompt}.tsx
    src/ui/screens/{Title,SaveSlots,NewGame,Intro,Pause,BagPanel,CalendarPanel,Settings,ShippingBin,MerchantCart,MorningReport,SleepConfirm,Toasts,Tips,WebGLFallback,StorageBanner}.tsx
    src/ui/touch/{Joystick,ActionButtons}.tsx
    src/ui/theme.css, src/ui/ErrorBoundary.tsx
    src/audio/sound.ts, src/audio/soundMap.ts
    src/**/*.test.ts(x)
    e2e/{golden-path,devices,a11y,visual,seasons}.spec.ts
```

---

## Phase A — Foundation and Core Rules

### Task 1: Workspace scaffold and tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc`, `.husky/pre-commit`, `packages/core/{package.json,tsconfig.json,vitest.config.ts,src/index.ts}`, `packages/core/test/smoke.test.ts`

**Interfaces:**
- Produces: root scripts `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:coverage`, `pnpm format`; package `@hearthvale/core` (ESM, `exports: "./src/index.ts"` for workspace use).

- [ ] **Step 1:** Create the root workspace: `pnpm-workspace.yaml` with `packages/*` and `apps/*`; `.npmrc` with `save-exact=true`; root `package.json` (`"private": true`, `"type": "module"`, `"packageManager": "pnpm@10.33.0"`, `"engines": {"node": ">=24"}`).
- [ ] **Step 2:** `tsconfig.base.json`: `target ES2022`, `module ESNext`, `moduleResolution Bundler`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`, `isolatedModules`, `skipLibCheck`.
- [ ] **Step 3:** Install dev tools at the root: `typescript eslint typescript-eslint eslint-plugin-react-hooks eslint-plugin-jsx-a11y prettier husky lint-staged vitest @vitest/coverage-v8 fast-check`. `eslint.config.js`: typescript-eslint `strictTypeChecked`, react-hooks and jsx-a11y for `apps/web/**`, and for `packages/core/**` a `no-restricted-imports` rule banning `react`, `react-dom`, `three`, `@react-three/*`, plus `no-restricted-globals` for `window`, `document`, `localStorage`.
- [ ] **Step 4:** Write `packages/core/test/smoke.test.ts`: `expect(CORE_VERSION).toBe(1)`, imported from `../src/index`.
- [ ] **Step 5:** Run `pnpm test`. Expected: FAIL (`CORE_VERSION` not exported).
- [ ] **Step 6:** Export `export const CORE_VERSION = 1 as const;` from `src/index.ts`. Configure `vitest.config.ts` with v8 coverage thresholds `{ lines: 90, branches: 90, functions: 90, statements: 90 }` on `src/**` (excluding `src/index.ts`, `src/types.ts`).
- [ ] **Step 7:** Run `pnpm test && pnpm lint && pnpm typecheck`. Expected: all PASS.
- [ ] **Step 8:** `pnpm exec husky init`; pre-commit runs `pnpm exec lint-staged` (eslint --fix + prettier on staged files).
- [ ] **Step 9:** Commit: `chore: scaffold pnpm workspace, tooling, and core package`.

### Task 2: Types, data tables, RNG, grid, new game

**Files:**
- Create: `packages/core/src/{types.ts,rng.ts,grid.ts,newGame.ts}`, `src/data/{balance.ts,crops.ts,items.ts,weatherTable.ts,layouts.ts}`
- Test: `packages/core/test/{rng,grid,newGame}.test.ts`

**Interfaces:**
- Produces (in `types.ts`; every later task uses these names exactly):

```ts
export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow';
export type CropId = 'turnip' | 'potato' | 'strawberry' | 'tomato' | 'corn' | 'melon' | 'pumpkin' | 'eggplant';
export type SeedId = `seed:${CropId}`;
export type ItemId = SeedId | CropId | 'fiber' | 'wood' | 'stone';
export type ToolId = 'hoe' | 'can' | 'sickle' | 'axe' | 'hammer';
export type Facing = 'n' | 's' | 'e' | 'w';
export type LocationId = 'farm' | 'house';
export type FeatureId = 'houseDoor' | 'exitDoor' | 'bin' | 'bed' | 'cart';
export type TileKind = 'grass' | 'path' | 'weed' | 'rock' | 'stump' | 'tilled' | 'water' | 'building' | 'fence' | 'wall' | 'floor' | 'feature';

export interface CropState { id: CropId; age: number; regrowing: boolean }
export interface Tile { kind: TileKind; feature?: FeatureId; hits?: number; watered?: boolean; crop?: CropState }
export interface Grid { width: number; height: number; tiles: Tile[] }   // row-major, index = y * width + x
export interface Calendar { year: number; season: Season; day: number; minute: number } // day 1..28, minute since 00:00
export interface ItemStack { id: ItemId; qty: number }
export type HotbarIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;  // 0..4 tools (TOOL_ORDER), 5..7 quick slots
export interface PlayerState { location: LocationId; x: number; z: number; facing: Facing; stamina: number }
export type MilestoneId = 'firstTill' | 'firstPlant' | 'firstHarvest' | 'firstShipment' | 'gold1k' | 'gold10k' | 'allCrops' | 'fullYear';

export interface GameState {
  version: 1;
  seed: number;
  rng: number;
  farmName: string;
  playerName: string;
  calendar: Calendar;
  weather: { today: Weather; tomorrow: Weather };
  player: PlayerState;
  canCharges: number;
  activeSlot: HotbarIndex;
  selectedQuick: 0 | 1 | 2;
  quickSlots: [number | null, number | null, number | null];   // bag indexes
  bag: (ItemStack | null)[];                                       // length 12
  bin: ItemStack[];
  gold: number;
  pendingGold: number;
  wakeHalfStamina: boolean;
  maps: Record<LocationId, Grid>;
  milestones: MilestoneId[];
  harvested: Partial<Record<CropId, number>>;
}

export type Command =
  | { type: 'tick'; minutes: number }
  | { type: 'move'; dx: number; dz: number; dtMs: number }
  | { type: 'selectHotbar'; index: HotbarIndex }
  | { type: 'cycleHotbar'; dir: 1 | -1 }
  | { type: 'useTool' }
  | { type: 'useItem' }
  | { type: 'interact' }
  | { type: 'shipItem'; bagIndex: number; qty: number }
  | { type: 'unshipItem'; binIndex: number; qty: number }
  | { type: 'buyItem'; itemId: SeedId; qty: number }
  | { type: 'sleep' }
  | { type: 'moveBagItem'; from: number; to: number }
  | { type: 'assignQuickSlot'; slot: 0 | 1 | 2; bagIndex: number | null };

export type FailReason = 'noStamina' | 'canEmpty' | 'bagFull' | 'notEnoughGold' | 'wrongSeason' | 'cartClosed' | 'noTarget' | 'noItem' | 'notSellable' | 'notHere';

export type GameEvent =
  | { type: 'toolUsed'; tool: ToolId; x: number; y: number; hit: boolean }
  | { type: 'tileTilled' | 'cropWatered' | 'tileCleared'; x: number; y: number }
  | { type: 'canRefilled' }
  | { type: 'cropPlanted' | 'cropHarvested' | 'cropDied' | 'cropGrew'; x: number; y: number; crop: CropId }
  | { type: 'itemGained'; item: ItemId; qty: number }
  | { type: 'itemEaten'; item: CropId; stamina: number }
  | { type: 'staminaLow' | 'exhausted' | 'passedOut' }
  | { type: 'dayStarted'; calendar: Calendar }
  | { type: 'seasonChanged'; season: Season }
  | { type: 'weatherChanged'; weather: Weather }
  | { type: 'goldChanged'; gold: number; delta: number }
  | { type: 'shippingReport'; items: ItemStack[]; total: number }
  | { type: 'milestoneReached'; id: MilestoneId }
  | { type: 'locationChanged'; location: LocationId }
  | { type: 'openUi'; ui: 'bin' | 'cart' | 'sleep' }
  | { type: 'actionFailed'; reason: FailReason };

export interface Result { state: GameState; events: GameEvent[] }
export interface NewGameOptions { seed: number; farmName: string; playerName: string }
```

- Produces (`data/`): `BALANCE` (`startGold 500`, `maxStamina 100`, `staminaLowAt 20`, `bagSlots 12`, `stackMax 99`, `canCharges 20`, `dayStartMinute 360`, `passOutMinute 1560`, `seasonDays 28`, `passOutGoldPct 0.1`, `passOutGoldCap 1000`, `tilledRevertChance 0.1`, `walkSpeed 4` tiles/s, `exhaustedSpeedFactor 0.6`, `playerRadius 0.3`, `missCostsStamina true`, `cartOpen 540`, `cartClose 1020`, `axeHits 3`, `hammerHits 2`); `TOOL_ORDER: ToolId[] = ['hoe','can','sickle','axe','hammer']`; `TOOL_COST = { hoe: 2, can: 2, sickle: 1, axe: 4, hammer: 4 }`; `CROPS: Record<CropId, { season: Season; seedCost: number; days: number; regrow: number | null; sell: number; eat: number }>` with the spec §3.6 table values; `ITEMS: Record<ItemId, { kind: 'seed' | 'crop' | 'material'; sell: number | null; eat: number | null }>` (seeds `sell: null`; fiber 1, wood 2, stone 2); `WEATHER_TABLE` from spec §3.9 as `Record<Season, [Weather, number][]>`; `FARM_LAYOUT: string[]` (24 rows × 32 chars), `HOUSE_LAYOUT: string[]` (6 × 8), and their `FARM_LEGEND` / `HOUSE_LEGEND: Record<string, Tile>`.
- Produces: `nextFloat(rng: number): [value: number, rng: number]` (mulberry32, value in [0,1)); `parseLayout(rows: string[], legend: Record<string, Tile>): Grid`; `tileAt(grid, x, y): Tile | undefined`; `setTile(grid, x, y, tile): Grid` (returns a new grid, copies only the tiles array); `isBlocked(tile: Tile | undefined): boolean`; `findFeature(grid, feature): { x: number; y: number }`; `createNewGame(opts): GameState`.

Layout legend: `#` fence, `H` building, `D` feature houseDoor, `B` feature bin, `C` feature cart, `~` water, `_` path, `.` field (obstacle roll), `P` path + player spawn. House: `W` wall, `F` floor, `Z` feature bed, `X` feature exitDoor, `S` floor + spawn. Blocked kinds: `rock`, `stump`, `water`, `building`, `fence`, `wall`, `feature`.

- [ ] **Step 1: Write failing tests**

```ts
// rng.test.ts
it('is deterministic and in [0,1)', () => {
  const [a, r1] = nextFloat(42); const [b] = nextFloat(42);
  expect(a).toBe(b); expect(a).toBeGreaterThanOrEqual(0); expect(a).toBeLessThan(1); expect(r1).not.toBe(42);
});
// grid.test.ts
it('parses FARM_LAYOUT to 32x24', () => { const g = parseLayout(FARM_LAYOUT, FARM_LEGEND); expect([g.width, g.height, g.tiles.length]).toEqual([32, 24, 768]); });
it('setTile does not mutate the source grid', ...);
it('isBlocked: rock/stump/water/fence/feature true; grass/weed/tilled false', ...);
// newGame.test.ts
it('starts at Year 1 Spring 1 6:00 with 500 gold and 6 turnip seeds in bag[0] pinned to quick slot 0', () => {
  const s = createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari' });
  expect(s.calendar).toEqual({ year: 1, season: 'spring', day: 1, minute: 360 });
  expect(s.gold).toBe(500); expect(s.bag[0]).toEqual({ id: 'seed:turnip', qty: 6 }); expect(s.bag).toHaveLength(12);
  expect(s.quickSlots).toEqual([0, null, null]); expect(s.weather.today).toBe('sunny');
  expect(s.player).toMatchObject({ location: 'farm', stamina: 100 }); expect(s.canCharges).toBe(20);
});
it('field obstacles are seeded: same seed same map, different seed different map', ...);
it('obstacle share in field cells is near spec (weeds 25–35%, rocks 7–13%, stumps 3–7%) for seed 1', ...);
it('player spawn tile is not blocked', ...);
```

- [ ] **Step 2:** Run `pnpm --filter @hearthvale/core test`. Expected: FAIL (modules missing).
- [ ] **Step 3:** Implement the data tables, `rng.ts` (mulberry32), `grid.ts`, and `createNewGame` (roll each `.` cell: <0.30 weed, <0.40 rock, <0.45 stump, else grass; the tomorrow forecast via `rollWeather` is stubbed as `'sunny'` until Task 8 replaces it). Export everything from `index.ts`.
- [ ] **Step 4:** Run the tests. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): add types, data tables, rng, grid, and new game`.

### Task 3: Calendar and time

**Files:**
- Create: `packages/core/src/systems/calendar.ts`; Test: `test/calendar.test.ts`

**Interfaces:**
- Produces: `advanceMinutes(cal: Calendar, minutes: number): Calendar` (no day rollover; the day ends only via `endDay`); `nextDay(cal: Calendar): Calendar` (day+1, season/year rollover, minute 360); `weekday(cal): 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'` (Spring 1, Year 1 = Mon); `formatClock(minute: number): string` (`360 → "6:00 AM"`, `780 → "1:00 PM"`, `1500 → "1:00 AM"`); `shouldPassOut(cal): boolean` (minute ≥ 1560).

- [ ] **Step 1: Write failing tests:** `nextDay({1,'spring',28,900})` → `{1,'summer',1,360}`; `nextDay({1,'winter',28,…})` → `{2,'spring',1,360}`; `weekday` of Spring 8 = `'Mon'`; Summer 1 = `'Mon'` (28 is a multiple of 7); the `formatClock` cases above plus `0 → "12:00 AM"`, `720 → "12:00 PM"`; `shouldPassOut` at 1559 false, 1560 true; `advanceMinutes` rejects negative input by throwing `RangeError`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): calendar and clock`.

### Task 4: Bag, hotbar, and quick slots

**Files:**
- Create: `packages/core/src/systems/bag.ts`; Test: `test/bag.test.ts`

**Interfaces:**
- Produces: `addItem(bag, id: ItemId, qty: number): { bag; added: number; overflow: number }` (fills existing stacks first, then empty slots, cap 99); `removeAt(bag, index, qty): (ItemStack | null)[]` (stack → null at 0; throws `RangeError` if qty > stack); `countOf(bag, id): number`; `quickItem(state): { bagIndex: number; stack: ItemStack } | null` (resolves `quickSlots[selectedQuick]`, null if the slot is unset or the bag cell is empty); `activeTool(state): ToolId | null` (from `activeSlot` 0..4); handlers `selectHotbar`, `cycleHotbar` (wraps 7→0 and 0→7; selecting 5..7 also sets `selectedQuick`), `moveBagItem` (swap; quick slots follow the moved indexes), `assignQuickSlot`.

- [ ] **Step 1: Write failing tests:** adding 150 turnips to an empty bag → slots `[99, 51]`; adding to a full bag → `overflow` equals qty and the bag is unchanged; `moveBagItem(0→3)` keeps `quickSlots[0]` pointing at the turnip seeds (now 3); `cycleHotbar(-1)` from 0 → 7 and `selectedQuick` 2; **Review Focus:** assign quick slot 0 → bag 0, remove all of bag 0, then `quickItem(state)` is `null` and `applyCommand(useItem)` emits `actionFailed('noItem')` (wire this assertion in Task 7, where `useItem` exists; here assert `quickItem` is null).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): bag, hotbar, quick slots`.

### Task 5: Movement, collision, target tile

**Files:**
- Create: `packages/core/src/systems/movement.ts`; Test: `test/movement.test.ts`

**Interfaces:**
- Produces: `stepMovement(state, dx, dz, dtMs): GameState` (normalizes the vector when its length is > 1, speed = `walkSpeed` × (stamina 0 ? 0.6 : 1), axis-separated circle-vs-tile collision with radius 0.3 against `isBlocked` tiles of the current location's grid and the grid bounds, sets `facing` from the dominant axis when moving; `|dx|,|dz| < 0.1` = no move); `targetTile(player): { x: number; y: number }` = `floor(x)`, `floor(z)` offset by 1 in the facing direction (`n` = z−1, `s` = z+1, `e` = x+1, `w` = x−1). World convention: tile (x, y) spans [x, x+1) × [y, y+1); `player.z` maps to grid `y`.

- [ ] **Step 1: Write failing tests:** 1000 ms east on open ground moves exactly +4.0 x; exhausted (stamina 0) moves +2.4; walking into a fence stops at `fenceX − 0.3` (±1e-6); a diagonal (1,1) is normalized (distance 4.0 per second, not 5.66); sliding along a wall keeps the free-axis motion; `targetTile` for each facing; tiny input (0.05, 0) changes neither position nor facing.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): movement with tile collision`.

### Task 6: Tools and stamina

**Files:**
- Create: `packages/core/src/systems/tools.ts`, `src/applyCommand.ts` (dispatcher skeleton: `tick`, `move`, hotbar commands, `useTool`); Test: `test/tools.test.ts`

**Interfaces:**
- Consumes: `activeTool`, `targetTile`, `tileAt`/`setTile`, `TOOL_COST`, `addItem`.
- Produces: `useTool(state): Result`; `spendStamina(state, cost): { state; events }` (clamps at 0; emits `staminaLow` when crossing ≤ 20 and `exhausted` when reaching 0); `applyCommand(state, cmd): Result` (exported from `index.ts`; `tick` uses `advanceMinutes`, and if `shouldPassOut` it calls `endDay(state, 'passOut')`, wired in Task 9).

Rules (spec §3.4): stamina 0 → `actionFailed('noStamina')`, no change. Hoe: grass → tilled (`tileTilled`). Can: tilled → `watered: true`, charges −1 (`cropWatered`); charges 0 → `actionFailed('canEmpty')` with no stamina cost; target water → charges 20, no stamina (`canRefilled`). Sickle: weed → grass + 1 fiber (`tileCleared`, `itemGained`); any other target is a miss for now. Task 7 adds the mature-crop branch (`harvestAt`). Axe: stump `hits +1`; at 3 → grass + 4 wood. Hammer: rock at 2 hits → grass + 2 stone; tilled (no crop) → grass. Any other target → miss: costs stamina when `missCostsStamina`, emits `toolUsed{hit:false}`. Every use emits `toolUsed`. Clearing gives items via `addItem`; when the bag is full → `actionFailed('bagFull')` and the obstacle stays.

- [ ] **Step 1: Write failing tests:** hoe on grass → tilled and stamina 98; hoe on a rock → miss, stamina 98, tile unchanged; can on tilled → watered, charges 19; can with 0 charges → `canEmpty` and stamina unchanged; can facing the pond → 20 charges and stamina unchanged; axe ×3 on a stump → grass and `countOf(bag,'wood') === 4`; hammer ×2 on a rock → 2 stone; hammer on tilled → grass; stamina 1 then axe → stamina 0 and events include `exhausted`; stamina 0 then hoe → `noStamina`; crossing 20 emits `staminaLow` once; full bag + sickle on weed → `bagFull` and the weed remains.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement `tools.ts` and the dispatcher.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): tools and stamina`.

### Task 7: Crops — plant, grow, harvest, eat

**Files:**
- Create: `packages/core/src/systems/crops.ts`; Modify: `tools.ts` (sickle → `harvestAt`), `applyCommand.ts` (`useItem`); Test: `test/crops.test.ts`

**Interfaces:**
- Produces: `cropStage(crop: CropState): 'seed' | 'sprout' | 'young' | 'mature'` (age 0 → seed; regrowing and not mature → young; age < days/3 → sprout; age < days → young; else mature); `isMature(crop)`; `plantAt(state, x, y, seed: SeedId): Result`; `harvestAt(state, x, y): Result` (adds 1 crop item, `harvested[id]++`; non-regrow → crop removed, tile stays tilled; regrow → `age = days − regrow`, `regrowing = true`); `growCrops(grid): { grid; events }` (watered crops age +1, emit `cropGrew` on a stage change); `killOutOfSeason(grid, season): { grid; events }`; `useItem(state): Result` (quick item seed → plant at target; crop → eat: stamina += `eat` capped at 100, consume 1, `itemEaten`; none → `noItem`).

- [ ] **Step 1: Write failing tests:** a turnip planted, watered and grown 4 times → mature (stages seed → sprout → young → mature at ages 0, 1, 2, 4); an unwatered night → no growth; a strawberry harvested at age 8 → regrowing, `cropStage` young, mature again after 4 more watered nights; a tomato regrows in 3; planting a summer seed in spring → `wrongSeason` and the seed is not consumed; planting on grass or an occupied tile → `noTarget`; harvest with a full bag → `bagFull` and the crop is unchanged; eating a melon at stamina 90 → 100; `killOutOfSeason(grid,'summer')` removes the turnip but keeps the tile tilled and emits `cropDied`; **Review Focus test:** quick slot pointing at an emptied bag cell → `useItem` emits `actionFailed('noItem')` and state is unchanged.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): crop planting, growth, harvest, eating`.

### Task 8: Weather

**Files:**
- Create: `packages/core/src/systems/weather.ts`; Modify: `newGame.ts` (real forecast); Test: `test/weather.test.ts`

**Interfaces:**
- Produces: `rollWeather(season: Season, day: number, rng: number): [Weather, number]` (day 1 → `'sunny'` without consuming rng; else a weighted pick from `WEATHER_TABLE[season]`).

- [ ] **Step 1: Write failing tests:** day 1 is always sunny for all seasons and returns the same rng; spring never yields snow or storm and winter never yields rain (10,000 rolls); over 10,000 spring rolls the rain share is within 0.27–0.33; deterministic for the same rng.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement; `createNewGame` sets `tomorrow` by rolling for Spring 2.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): seeded weather`.

### Task 9: Economy — shipping bin and merchant cart

**Files:**
- Create: `packages/core/src/systems/economy.ts`; Modify: `applyCommand.ts`; Test: `test/economy.test.ts`

**Interfaces:**
- Produces: `sellPrice(id: ItemId): number | null`; `shipItem(state, bagIndex, qty): Result` (`notSellable` for seeds); `unshipItem(state, binIndex, qty): Result` (`bagFull` if no room); `sellBin(state): { state; total: number; items: ItemStack[] }`; `isCartOpen(state): boolean` (season ≠ winter, weather ≠ storm, 540 ≤ minute < 1020); `cartStock(state): SeedId[]` (seeds whose crop season is the current season); `buyItem(state, itemId, qty): Result` (`cartClosed`, `wrongSeason` if not in stock, `notEnoughGold`, `bagFull`; atomic: no partial buys).

- [ ] **Step 1: Write failing tests:** ship 10 turnips → bin has 10 and bag −10; unship 4 → back in bag; `sellBin` on the remaining 6 → `total` 210 (6 × 35), bin empty, items listed (the gold credit is tested in Task 10); buying 5 potato seeds with 250 gold → gold 0 (exact-gold boundary); 251 needed vs 250 held → `notEnoughGold` and nothing changes; cart at 8:59 closed, 9:00 open, 16:59 open, 17:00 closed; closed in winter and in storms; `cartStock` in summer = tomato, corn, melon; buying with a full bag → `bagFull` and gold unchanged.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): shipping bin and merchant cart`.

### Task 10: End of day — sleep and pass out

**Files:**
- Create: `packages/core/src/systems/day.ts`; Modify: `applyCommand.ts` (`sleep`; `tick` pass-out); Test: `test/day.test.ts`

**Interfaces:**
- Consumes: `growCrops`, `killOutOfSeason`, `nextDay`, `rollWeather`, `sellBin` (Task 9).
- Produces: `endDay(state, reason: 'sleep' | 'passOut'): Result`. `sleep` is valid only when `player.location === 'house'`, otherwise `actionFailed('notHere')`.

Order (spec §3.2, verbatim): 1 sell the bin → `pendingGold`, `shippingReport`; 2 `growCrops`; 3 `nextDay` + on a season change `killOutOfSeason` + `seasonChanged`; 4 `today = tomorrow`, roll the new `tomorrow` for the following date, `weatherChanged`; 5 dry all tiles, then if today is rain or storm set `watered` on every tilled tile; 6 stamina = 100, or 50 if `wakeHalfStamina` (set by pass-out); then clear the flag; credit `pendingGold` → `gold` (`goldChanged`); 7 each tilled tile without a crop and not watered reverts to grass with p = 0.1. The player is placed at the house spawn, location `house`. Pass-out: before step 1, `gold −= min(floor(gold × 0.1), 1000)`, set `wakeHalfStamina`, emit `passedOut`. Emit `dayStarted` last.

- [ ] **Step 1: Write failing tests:** a watered turnip grows overnight while an unwatered one does not; a crop watered on Spring 28 is killed by the summer change (growth happens before death); a rain day leaves all tilled tiles watered at 6:00; a sunny day leaves them dry; pass-out with 5,000 gold → 4,500 and next-day stamina 50, and the day after (normal sleep) 100; pass-out with 20,000 gold loses exactly 1,000; `tick` from 1550 by 10 triggers pass-out; sleeping in the farm → `notHere`; the new day starts at 6:00 in the house; Winter 28 → Year 2 Spring 1; 6 turnips in the bin → next morning gold +210 and a `shippingReport` with total 210.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): end of day processing, sleep, pass out`.

### Task 11: Interact and milestones

**Files:**
- Create: `packages/core/src/systems/{interact.ts,milestones.ts}`; Modify: `applyCommand.ts` (run `checkMilestones` after every command); Test: `test/{interact,milestones}.test.ts`

**Interfaces:**
- Produces: `interact(state): Result` — target feature `houseDoor` → location `house` at the house spawn (`locationChanged`); `exitDoor` → farm, standing one tile south of `houseDoor`, facing `s`; `bin` → `openUi('bin')`; `cart` → `openUi('cart')` if open, else `cartClosed`; `bed` → `openUi('sleep')`; a mature crop → `harvestAt`; water → refill the can; else `noTarget`. `resolveSecondary(state): 'interact' | 'useItem' | null` (spec §5.3 order: interactable target → `interact`; quick item is a seed and the target is tilled and empty → `useItem`; quick item edible → `useItem`; else null). `checkMilestones(prev: GameState, next: GameState, events): { state; events }` — adds each `MilestoneId` once (firstTill on `tileTilled`, firstPlant on `cropPlanted`, firstHarvest on `cropHarvested`, firstShipment on a `shippingReport` with total > 0, gold1k / gold10k on `gold` crossing, allCrops when every `CropId` has `harvested ≥ 1`, fullYear when `calendar.year` becomes 2).

- [ ] **Step 1: Write failing tests:** for each interact target above; `resolveSecondary` returns `interact` facing the bin even with seeds selected, `useItem` facing empty tilled with seeds, `useItem` facing grass with a turnip selected, null facing grass with seeds selected; `firstHarvest` is emitted once across two harvests; gold 990 → 1,010 emits `gold1k`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(core): interaction and milestones`.

### Task 12: Invariants, determinism, and a full-year simulation

**Files:**
- Test: `packages/core/test/{invariants,determinism,fullYear}.test.ts`; Create: `packages/core/test/arbitraries.ts`

**Interfaces:**
- Produces: `arbCommand: fc.Arbitrary<Command>` (weighted toward `move`, `useTool`, `useItem`, `interact`, `tick`, and occasional `sleep`/`buyItem`/`shipItem`) for reuse.

- [ ] **Step 1: Write the tests:** for 300 runs of 200 random commands from a random seed: `gold ≥ 0`, `0 ≤ stamina ≤ 100`, `0 ≤ canCharges ≤ 20`, every stack qty in 1..99, `bag.length === 12`, grid sizes unchanged, `minute` in [360, 1560), `day` in 1..28, the player is never inside a blocked tile. Determinism: replaying the same sequence from the same seed gives `toEqual` states. Full year: a scripted bot (till/plant/water a 4×4 plot daily, buy seasonal seeds, ship, sleep) runs from Spring 1 to Year 2 Spring 1 and ends with all 8 crops harvested and the `fullYear` milestone.
- [ ] **Step 2:** Run. Expected: PASS, or failures exposing real bugs. Fix any bug in its owning system with a focused regression test first (superpowers:systematic-debugging).
- [ ] **Step 3:** Run `pnpm --filter @hearthvale/core test:coverage`. Expected: ≥ 90% on every metric.
- [ ] **Step 4:** Commit: `test(core): property invariants, determinism, full-year simulation`.

### Task 13: Save schema, migrations, repository interface

**Files:**
- Create: `packages/core/src/save/{schema.ts,migrate.ts,repository.ts}`; Test: `test/save.test.ts`

**Interfaces:**
- Produces: `gameStateSchema: z.ZodType<GameState>`; `SaveFile = { version: number; savedAt: string; playTimeMs: number; summary: SaveSummary; state: GameState }`; `SaveSummary = { farmName; playerName; calendar: Calendar; gold: number }`; `makeSaveFile(state, playTimeMs, now: Date): SaveFile`; `migrate(raw: unknown, migrations?: Record<number, (s: unknown) => unknown>): { ok: true; file: SaveFile } | { ok: false; error: 'invalid' | 'unsupportedVersion' }`; `CURRENT_SAVE_VERSION = 1`; `type SlotId = 1 | 2 | 3`; `interface SaveRepository { list(): Promise<SaveSlotSummary[]>; load(slot: SlotId): Promise<LoadResult>; save(slot: SlotId, file: SaveFile): Promise<void>; remove(slot: SlotId): Promise<void> }`; `SaveSlotSummary = { slot: SlotId; summary: SaveSummary | null; savedAt: string | null; playTimeMs: number }`; `LoadResult = { kind: 'ok'; file: SaveFile } | { kind: 'missing' } | { kind: 'corrupt'; backupAvailable: boolean }`.

- [ ] **Step 1: Write failing tests:** a round-trip through `JSON.stringify` → `migrate` gives `toEqual` the state after 50 random commands; a missing field → `invalid`; `version: 999` → `unsupportedVersion`; an injected migration map `{0: s => ({...s, version: 1, ...})}` upgrades a v0 fixture to v1; `gold: -5` → `invalid`; a bag of length 11 → `invalid`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement (`zod` added as a core dependency; it is pure and allowed).
- [ ] **Step 4:** Run. Expected: PASS, coverage still ≥ 90%.
- [ ] **Step 5:** Commit: `feat(core): save schema, migrations, repository interface`.

---

## Phase B — Web Shell

### Task 14: Web app scaffold, store, game loop, event bus, debug hook

**Files:**
- Create: `apps/web/{package.json,tsconfig.json,vite.config.ts,vitest.config.ts,index.html}`, `src/{main.tsx,App.tsx}`, `src/game/{config.ts,store.ts,loop.ts,eventBus.ts,debugHook.ts}`; Test: `src/game/{loop,store,eventBus,debugHook}.test.ts`

**Interfaces:**
- Consumes: `@hearthvale/core` (`applyCommand`, `createNewGame`, types).
- Produces: `STEP_MS = 50`, `MAX_FRAME_MS = 250`, `GAME_MINUTES_PER_REAL_MS = 10 / 7000`; `advanceAccumulator(accMs: number, frameMs: number): { steps: number; accMs: number }`; `useGameStore` (Zustand) with `{ game: GameState | null; screen: Screen; overlay: Overlay | null; slot: SlotId | null; playTimeMs: number; settings: Settings; dispatch(cmd: Command): GameEvent[]; startGame(state: GameState, slot: SlotId): void; setScreen(s: Screen): void; setOverlay(o: Overlay | null): void; isClockRunning(): boolean }`; `type Screen = 'title' | 'slots' | 'newGame' | 'intro' | 'game'`; `type Overlay = 'pause' | 'bin' | 'cart' | 'sleep' | 'morning' | 'restoring'`; `Settings = { quality: 'auto' | 'high' | 'low'; musicVolume: number; sfxVolume: number; reducedMotion: boolean; textScale: 1 | 1.25 | 1.5; seenTips: string[]; introSeen: boolean }` (persisted in `localStorage` under `hearthvale:settings`, reads/writes wrapped in try/catch); `cameraYaw: 0 | 1 | 2 | 3` and `zoomStep: 0 | 1 | 2` slices; `eventBus.on(type, fn): () => void`, `eventBus.emit(events: GameEvent[])`; `installDebugHook(store)` exposing `window.__hearthvale = { getState, dispatch, setSeed(seed), skipMinutes(n), sleep(), setWeather(today: Weather), teleport(location: LocationId, x: number, z: number, facing: Facing) }` (test-only state edits go straight through the store's `set`).

- [ ] **Step 1:** Scaffold with Vite's React-TS template inside `apps/web`, then add `three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing n8ao zustand motion howler idb` and dev deps `@testing-library/react @testing-library/user-event jsdom fake-indexeddb @playwright/test @axe-core/playwright size-limit @size-limit/file`. Add `@hearthvale/core: "workspace:*"`.
- [ ] **Step 2: Write failing tests:** `advanceAccumulator(0, 120)` → `{steps: 2, accMs: 20}`; **Review Focus:** `advanceAccumulator(0, 60_000)` → `{steps: 5, accMs: 0}` (clamped to 250 ms); `dispatch` updates `game` and emits the core's events on the bus; `isClockRunning()` is false while `overlay !== null`, while `screen !== 'game'`, and while `document.hidden`; the debug hook is absent when `VITE_E2E` is unset.
- [ ] **Step 3:** Run `pnpm --filter web test`. Expected: FAIL.
- [ ] **Step 4:** Implement. `loop.ts` exports `useGameLoop()` (inside the Canvas, `useFrame` → `advanceAccumulator` → per step: `dispatch(move)` from intents (Task 16) + `dispatch(tick)` with `STEP_MS × GAME_MINUTES_PER_REAL_MS` if the clock is running). `debugHook` is imported via `if (import.meta.env.VITE_E2E === 'true') await import('./debugHook')` so it tree-shakes out of production.
- [ ] **Step 5:** Run. Expected: PASS. Run `pnpm --filter web build` and `grep -r "__hearthvale" apps/web/dist` → no matches.
- [ ] **Step 6:** Commit: `feat(web): app scaffold, store, fixed-step loop, event bus, debug hook`.

### Task 15: IndexedDB saves, autosave, export/import

**Files:**
- Create: `apps/web/src/save/{idbRepository.ts,autosave.ts,fileIO.ts}`; Test: `src/save/{idbRepository,autosave,fileIO}.test.ts`

**Interfaces:**
- Consumes: `SaveRepository`, `makeSaveFile`, `migrate` from core.
- Produces: `createIdbRepository(dbName = 'hearthvale'): SaveRepository` (object store `saves`, keys `slot:1..3` and `slot:N:backup`; `save` first copies the current value to backup; `load` → `migrate` → if invalid, check the backup → `corrupt{backupAvailable}`); `loadBackup(slot): Promise<LoadResult>`; `isStorageAvailable(): Promise<boolean>`; `installAutosave(store, repo): () => void` (saves on the `dayStarted` event and on `visibilitychange` → hidden); `exportSave(file: SaveFile): Blob` (filename `hearthvale-<farm>-y<year>-<season><day>.hearthvale.json`); `importSave(text: string): ReturnType<typeof migrate>`.

- [ ] **Step 1: Write failing tests** (with `fake-indexeddb/auto`): save → list shows the summary; a second save leaves the first in the backup; writing garbage to `slot:1` → `load` returns `corrupt` with `backupAvailable: true`, and `loadBackup` returns the earlier file; an export → import round-trip equals the original; importing `"{}"` → `invalid`; **Review Focus:** autosave on hidden mid-day (minute 845, player at (10.5, 7.25) in the farm), then a fresh store loads the slot → identical minute, location, and position, and `isClockRunning()` is false until `setScreen('game')`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement with `idb`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(web): IndexedDB saves with backup, autosave, export/import`.

### Task 16: Input — keyboard, gamepad, touch → intents → commands

**Files:**
- Create: `apps/web/src/input/{intents.ts,keyboard.ts,gamepad.ts,touch.ts,mapper.ts,actionGate.ts,toCommands.ts}`, `src/ui/touch/{Joystick.tsx,ActionButtons.tsx}`; Test: `src/input/*.test.ts`, `src/ui/touch/Joystick.test.tsx`

**Interfaces:**
- Produces: `Intents = { move: { x: number; z: number }; primary: boolean; secondary: boolean; cycle: -1 | 0 | 1; hotbar: HotbarIndex | null; rotate: -1 | 0 | 1; zoom: -1 | 0 | 1; menu: boolean; device: 'keyboard' | 'gamepad' | 'touch' }`; `InputSource = { read(): Partial<Intents>; reset(): void; dispose(): void }`; `createKeyboardSource(target: Window)`, `createGamepadSource(getPads = () => navigator.getGamepads())`, `createTouchSource()` (fed by the Joystick/ActionButtons components through `touchSource.setStick(x, z)`, `press(button)`, `release(button)`); `createInputMapper(sources): { read(): Intents }` (merges; the most recently active device wins `device`); `cameraRelative(move, yawSteps: 0 | 1 | 2 | 3): { x; z }` (rotates the vector by yawSteps × 90°); `createActionGate(repeatMs = 350): { allow(pressed: boolean, nowMs: number): boolean }`; `intentsToCommands(intents, state: GameState, yawSteps, gate, nowMs): Command[]` (primary → `useTool` if `activeSlot ≤ 4`, else `useItem`; secondary → per `resolveSecondary`; `cycle` → `cycleHotbar`; `hotbar` → `selectHotbar`; always one `move` with the camera-relative vector).
- Keyboard map (spec §5.3): WASD/arrows, Space primary, F secondary, 1–8 hotbar, wheel cycle, Q/E rotate, +/− zoom, Esc/Tab menu. Touch: ⟲ ⟳ buttons and a two-finger twist (> 35°) rotate; a horizontal swipe on the hotbar cycles. `Intents` also carries `zoom: -1 | 0 | 1`. Gamepad (standard mapping): left stick (deadzone 0.2), A=0 primary, X=2 secondary, LB=4/RB=5 cycle, LT=6/RT=7 rotate, Start=9 menu, B=1 back.

- [ ] **Step 1: Write failing tests:** W+D → move normalized to (0.707, −0.707); `cameraRelative({x:0,z:-1}, 1)` → `{x:-1, z:0}` (±1e-9); **Review Focus:** keydown W, then window `blur` → move (0,0); joystick `pointerdown` + `pointermove` then `pointercancel` → move (0,0); a gamepad that disappears from `getPads()` → its intents reset; **Review Focus:** gate with primary held from t=0 at 50 ms steps for 1000 ms → `allow` true at 0, 350, 700 only (3 tool uses); a new press after release fires immediately; `intentsToCommands` with `activeSlot 6` and primary → `useItem`; the rotate edge fires once per press, not per step; the Joystick renders inside the left 40% and its buttons are ≥ 56 px (checked via computed style).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The joystick uses Pointer Events with `setPointerCapture`, floats where the thumb lands, and has a radius of 60 px.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(web): unified input for keyboard, gamepad, touch`.

---

## Phase C — The 3D World

> Visual tasks: unit-test pure helpers; verify visuals by running `pnpm --filter web dev` and checking in the built-in browser at desktop and `mobile` presets (screenshots), then fix what looks wrong before committing. Invoke the frontend-design skill at the start of Task 22 for the UI direction.

### Task 17: Canvas, terrain, tiles, features, camera rig, placeholder player

**Files:**
- Create: `apps/web/src/scene/{GameCanvas,World,Terrain,Tiles,Features,Player,CameraRig,TargetHighlight,HouseInterior}.tsx`, `src/scene/cameraMath.ts`; Test: `src/scene/cameraMath.test.ts`

**Interfaces:**
- Consumes: store `game`, `targetTile`, input mapper, `useGameLoop`.
- Produces: `<GameCanvas />` (R3F `Canvas`, `shadows`, `dpr` from quality, `gl={{ antialias: false, powerPreference: 'high-performance' }}`); `useCameraYaw(): { yawSteps: 0 | 1 | 2 | 3; rotate(dir) }` (store slice `cameraYaw`); `cameraOffset(yawSteps, zoomStep: 0 | 1 | 2): [x, y, z]` (pitch 50°, distances 9 / 12 / 16); `tileToWorld(x, y): [number, 0, number]` = `[x + 0.5, 0, y + 0.5]`.
- Tiles render with one `InstancedMesh` per tile kind (rebuilt only when the grid reference changes). Placeholders: tilled = a dark brown slab, watered = a darker, glossier slab, rocks = icosahedrons, stumps = cylinders, weeds = cones, the house = boxes with a roof, the player = a capsule with a facing nose. Interpolate the player position between steps.

- [ ] **Step 1: Write failing tests:** `cameraOffset(0, 1)` has `y / horizontal = tan(50°)` (±1e-6); `cameraOffset(1, 1)` is `cameraOffset(0, 1)` rotated 90° about Y; `tileToWorld(3, 4)` → `[3.5, 0, 4.5]`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The camera rotation eases over 300 ms (instant when `reducedMotion`); the follow uses damping (`THREE.MathUtils.damp`, λ = 6). The default `zoomStep` is 1, or 2 in portrait (`innerHeight > innerWidth`).
- [ ] **Step 4:** Run tests. Expected: PASS. Run the dev server and verify in the browser: walk with WASD, collide with fences, rotate with Q/E (movement stays screen-relative), the target highlight follows facing, enter and exit the house.
- [ ] **Step 5:** Commit: `feat(web): 3D farm scene, camera rig, placeholder player`.

### Task 18: Lighting, sky, time of day, post-processing, quality tiers

**Files:**
- Create: `apps/web/src/render/{lighting.ts,Lighting.tsx,PostFX.tsx,quality.ts}`, `src/scene/Sky.tsx`; Test: `src/render/{lighting,quality}.test.ts`

**Interfaces:**
- Produces: `sunAt(minute: number): { elevationDeg: number; azimuthDeg: number; color: string; intensity: number; skyTop: string; skyBottom: string; ambient: number }` (keyframes at 360 dawn pink, 720 noon white, 1080 sunset gold, 1260 night blue with moonlight, interpolated in linear space; night intensity ≥ 0.15 so the game stays playable); `type QualityTier = 'high' | 'low'`; `pickInitialTier(env: { coarsePointer: boolean; deviceMemory?: number; maxTextureSize: number }): QualityTier`; `QUALITY: Record<QualityTier, { shadowMapSize: 2048 | 1024; dprMax: 2 | 1.5; ao: boolean; grassDensity: 1 | 0.5 }>`; `<PostFX tier />` (SMAA, N8AO on high, Bloom with `luminanceThreshold 0.9`, ToneMapping AgX, Vignette 0.25; the season/time grade arrives in Task 20); drei `PerformanceMonitor` with `onDecline` → `low` (sustained fps < 45 on high).

- [ ] **Step 1: Write failing tests:** `sunAt(720).elevationDeg > sunAt(400).elevationDeg`; `sunAt(1300).intensity ≥ 0.15`; values are continuous (sampling every minute changes intensity by < 0.02 per minute); `pickInitialTier({ coarsePointer: true, maxTextureSize: 4096 })` → `low`; desktop → `high`; a settings override beats auto.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement. The directional light's shadow camera follows the player (a 24-tile frustum); windows use emissive materials that switch on after 18:00.
- [ ] **Step 4:** Run tests. Expected: PASS. In the browser, use `__hearthvale.skipMinutes` (run with `VITE_E2E=true`) to check dawn, noon, sunset, and night screenshots on both tiers.
- [ ] **Step 5:** Commit: `feat(web): time-of-day lighting, sky, post-processing, quality tiers`.

### Task 19: Crops rendering and gameplay FX

**Files:**
- Create: `apps/web/src/scene/{Crops,Kindling}.tsx`, `src/scene/fx/{Particles,FloatText}.tsx`, `src/scene/fx/fxQueue.ts`; Test: `src/scene/fx/fxQueue.test.ts`

**Interfaces:**
- Consumes: `cropStage`, `eventBus`.
- Produces: `fxFromEvents(events: GameEvent[]): FxSpawn[]` with `FxSpawn = { kind: 'dust' | 'splash' | 'chips' | 'sparkle' | 'leafPuff'; x: number; y: number } | { kind: 'float'; x: number; y: number; text: string }` (`tileTilled` → dust; `cropWatered` → splash; `toolUsed` axe/hammer hit → chips; `cropHarvested` → sparkle + float `"+1 Turnip"`; `tileCleared` → leafPuff); `<Kindling />` plays once on the `firstHarvest` milestone (a glowing emissive sprite rising toward the hills over 4 s with a one-line toast, "Something small and bright wakes in the hills…").
- Crops: a per-stage placeholder mesh for each crop (distinct colors/shapes), replaced by models in Task 26; a scale pop of 0.8 → 1.1 → 1.0 over 250 ms on `cropGrew`. Camera micro-shake on axe/hammer hits (skipped when `reducedMotion`).

- [ ] **Step 1: Write failing tests:** the event → FX mapping for each case above, including the float text using the crop's display name.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement (pooled instanced particles, max 256 live).
- [ ] **Step 4:** Run tests. Expected: PASS. Check in the browser: till, water, plant, sleep ×4, harvest; FX visible; the Kindling plays once.
- [ ] **Step 5:** Commit: `feat(web): crop rendering, gameplay FX, Kindling glimpse`.

### Task 20: Living world — grass, trees, season palettes, snow cover

**Files:**
- Create: `apps/web/src/scene/{Grass,Trees}.tsx`, `src/render/seasonPalette.ts`, `src/render/shaders/{wind.ts,snowMask.ts}`; Modify: `PostFX.tsx` (season/time color grade); Test: `src/render/seasonPalette.test.ts`

**Interfaces:**
- Produces: `paletteFor(season: Season, dayOfSeason: number): { grass: string; grassTip: string; foliage: string; ground: string; grade: { saturation: number; warmth: number }; snowCover: number }` (`snowCover` ramps 0 → 1 over winter day 1, stays 1 through winter, and is 0 otherwise; fall foliage amber/red; spring adds blossom pink to blossom trees); `applyWind(material, uniforms)` and `applySnowMask(material, uniforms)` (`onBeforeCompile` patches; snow = mix toward white where `normal.y > 0.6`, weighted by `snowCover`).
- Grass: one `InstancedMesh` of blades on grass/path tiles only (density by quality tier; hidden on tilled tiles; flattened within 0.6 tiles of the player). Trees around the farm edge sway; falling-leaf particles in fall; petals in spring; fireflies on summer nights; a heat-shimmer screen distortion at summer noon (High only); breath puffs from the player in winter.

- [ ] **Step 1: Write failing tests:** `paletteFor('winter', 1).snowCover` is between 0 and 1 (partial on day 1), `paletteFor('winter', 2).snowCover === 1`, `paletteFor('fall', 10).snowCover === 0`; the four seasons return distinct `grass` colors.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run tests. Expected: PASS. In the browser, jump through seasons with the debug hook (sleep 28×) and screenshot each; check frame time on the `mobile` preset with the Low tier.
- [ ] **Step 5:** Commit: `feat(web): wind grass and trees, season palettes, snow cover`.

### Task 21: Weather FX and water

**Files:**
- Create: `apps/web/src/scene/{Weather,Water}.tsx`, `src/render/shaders/water.ts`, `src/render/weatherVisuals.ts`; Test: `src/render/weatherVisuals.test.ts`

**Interfaces:**
- Produces: `weatherVisuals(weather: Weather, tier: QualityTier): { rain: number; snow: number; wetness: number; cloudiness: number; lightning: boolean; fogDensity: number }` (counts: rain 6,000 high / 2,500 low; storm 9,000 / 3,500 with lightning; snow 3,000 / 1,200; wetness 1 for rain/storm lowers material roughness by 0.35 and fades in puddle decals on path tiles); `<Water />` (pond plane with fresnel, sky color reflection, scrolling normal ripples); lightning flashes every 6–14 s (seeded by the day) with a thunder event on the bus.

- [ ] **Step 1: Write failing tests:** sunny → all zeros and no lightning; storm high → rain 9,000 and `lightning: true`; low tier counts are below high tier counts for every weather.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement (GPU-driven particles: positions are wrapped in the vertex shader around the camera target, with no per-frame CPU loop).
- [ ] **Step 4:** Run tests. Expected: PASS. In the browser, force each weather with `__hearthvale.setWeather` and screenshot each.
- [ ] **Step 5:** Commit: `feat(web): rain, storm, snow effects and pond water`.

---

## Phase D — UI, Story Intro, Audio, Resilience

### Task 22: HUD

**Files:**
- Create: `apps/web/src/ui/theme.css`, `src/ui/hud/{Hud,Clock,Gold,Stamina,Hotbar,Prompt}.tsx`, `src/ui/labels.ts`; Test: `src/ui/hud/*.test.tsx`

**Interfaces:**
- Consumes: `formatClock`, `weekday`, `resolveSecondary`, `activeTool`, `quickItem`, store.
- Produces: `promptFor(state): string | null` in `labels.ts` (`'Till' | 'Water' | 'Refill' | 'Cut' | 'Chop' | 'Break' | 'Plant' | 'Harvest' | 'Ship' | 'Sleep' | 'Enter' | 'Exit' | 'Shop' | 'Eat'`); `displayName(id: ItemId | ToolId): string`.
- Invoke the frontend-design skill here: warm wood + parchment panels, thin gold edges, Fraunces + Nunito (self-hosted via `@fontsource`), CSS custom properties in `theme.css`, `env(safe-area-inset-*)` padding, text scale via a `--text-scale` variable.

- [ ] **Step 1: Write failing tests:** the clock shows "6:00 AM", "Spring 1 · Mon", and the weather and forecast icons with accessible labels ("Today: Sunny", "Tomorrow: Rain"); gold animates to its final value (fake timers) and exposes it via `aria-live="polite"`; stamina has `role="progressbar"` with `aria-valuenow`; the low class is applied at ≤ 20; the hotbar shows 8 slots, the active one marked `aria-selected`, the can's charge ring value, and an empty quick slot after its item is consumed (Review Focus); `promptFor` returns "Ship" facing the bin and "Water" with the can facing tilled.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement (HUD is DOM over the canvas; components subscribe with narrow selectors).
- [ ] **Step 4:** Run. Expected: PASS. Check desktop and mobile presets in the browser, in portrait and landscape.
- [ ] **Step 5:** Commit: `feat(web): HUD`.

### Task 23: Menus and overlays

**Files:**
- Create: `apps/web/src/ui/screens/{Title,SaveSlots,NewGame,Pause,BagPanel,CalendarPanel,Settings,ShippingBin,MerchantCart,MorningReport,SleepConfirm,Toasts,Tips}.tsx`, `src/ui/focus.ts`; Test: `src/ui/screens/*.test.tsx`

**Interfaces:**
- Consumes: the repository (Task 15), core commands, `cartStock`, `isCartOpen`, `CROPS`, `ITEMS`, the event bus (`openUi`, `shippingReport`, `milestoneReached`).
- Produces: `useMenuNavigation(ref)` in `focus.ts` (arrow keys / D-pad move focus, A/Enter selects, B/Esc goes back, focus trapped in the open overlay and restored on close); tip IDs `'move' | 'hoe' | 'can' | 'sickle' | 'axe' | 'hammer' | 'seeds' | 'bin' | 'sleep'` shown once each (stored in `settings.seenTips`).
- Title: live scene behind (camera drift), New / Continue (most recent slot) / Load / Settings. NewGame: farmer name + farm name (1–16 chars, trimmed, required) → `createNewGame({ seed: crypto.getRandomValues, ... })` → Intro. MerchantCart: quantity stepper 1–99, the total, a disabled buy button with the reason ("Not enough gold"). MorningReport after `shippingReport` when total > 0. SleepConfirm: "Sleep and save?" → `sleep` → save. Pause: Bag (move items, assign quick slots), Calendar (current month grid with today highlighted), Settings (quality, volumes, reduced motion, text size), Export save, Save & Quit. SaveSlots: each card has Play / Export / Delete (confirm); an Import button fills the first empty slot (or asks which slot to replace).

- [ ] **Step 1: Write failing tests:** new-game validation (an empty name blocks Start; 17 chars is trimmed to 16); the slots screen lists 3 cards with farm/date/gold/time, plus a "Damaged save — load backup?" dialog for a corrupt slot; Export (per slot) downloads via `exportSave` and Import validates via `importSave` and rejects a bad file with "This file isn't a Hearthvale save."; the cart shows only in-season seeds, buys, and updates gold; the bin moves items in and out; the morning report sums lines correctly; sleep confirm dispatches `sleep` and calls `repo.save`; Esc closes the top overlay and resumes the clock; keyboard-only navigation reaches every button in the pause menu.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement (Framer Motion springs; `reducedMotion` → fade only).
- [ ] **Step 4:** Run. Expected: PASS. Walk through every screen in the browser on desktop and mobile.
- [ ] **Step 5:** Commit: `feat(web): title, save slots, pause, shop, bin, reports, tips`.

### Task 24: Intro sequence

**Files:**
- Create: `apps/web/src/ui/screens/Intro.tsx`, `src/scene/introCamera.ts`; Test: `src/ui/screens/Intro.test.tsx`, `src/scene/introCamera.test.ts`

**Interfaces:**
- Produces: `introCameraAt(t: number): { position: [number, number, number]; target: [number, number, number] }` for t in [0, 1] (a spline from the hills to behind the player's spawn; `t = 1` equals the follow camera's pose); `INTRO_LETTER` (verbatim from spec Appendix A.2); `settings.introSeen`.
- Flow: parchment letter with typed text (30 ms per character, a tap/key shows it all, then Continue) → a 6 s camera flight at dawn → Game, with the `move` tip shown. A Skip button appears when `introSeen`.

- [ ] **Step 1: Write failing tests:** the letter text equals `INTRO_LETTER` once fully revealed; a key press reveals everything instantly; Skip is absent on the first view and present once `introSeen`; `introCameraAt(1)` equals `cameraOffset(0, 1)` added to the spawn position (±1e-6).
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS. Watch the intro in the browser.
- [ ] **Step 5:** Commit: `feat(web): intro letter and camera flight`.

### Task 25: Audio

**Files:**
- Create: `apps/web/src/audio/{sound.ts,soundMap.ts}`; Test: `src/audio/soundMap.test.ts`

**Interfaces:**
- Produces: `soundsFor(event: GameEvent, ctx: { surface: 'grass' | 'dirt' | 'wood' | 'snow' }): SoundId[]`; `createSoundSystem(howlerFactory)` with `unlock()` (called on the first pointer or key), `playMusic(season)`, `setAmbient({ weather, minute })`, `setVolumes(music, sfx)`, `footstep(surface)`; a crossfade of 2 s between season tracks; haptics `navigator.vibrate?.(15)` on `cropHarvested` (touch devices only).
- Files go in `public/assets/audio/` (CC0; listed in CREDITS.md). Until downloads are approved, `soundMap` points at files that may be missing and the system no-ops on load errors.

- [ ] **Step 1: Write failing tests:** a hoe `toolUsed` → `['hoe']`; `cropHarvested` → `['harvest']`; storm `weatherChanged` → includes `'thunderAmbient'`; the system stays silent before `unlock`; volumes clamp to [0, 1]; a missing file does not throw.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(web): music, ambience, SFX, haptics`.

### Task 26: CC0 assets — models, character, optimization pipeline

**Files:**
- Create: `apps/web/scripts/optimize-assets.mjs`, `apps/web/src/scene/assets.ts`, `CREDITS.md`, `public/assets/models/*.glb`, `public/assets/audio/*`; Modify: `Player.tsx`, `Features.tsx`, `Tiles.tsx`, `Crops.tsx`, `Trees.tsx`; Test: `src/scene/assets.test.ts`

**Interfaces:**
- Produces: `ASSETS: Record<AssetKey, { url: string; credit: string }>` with keys for the player, house, bin, cart, fence, rock, stump, weed, tree kinds, and each crop's 4 stages; `preloadAll()` called right after the title screen renders; `optimize-assets.mjs` runs `gltf-transform` (`dedup`, `prune`, `meshopt`, textures → KTX2 `etc1s`, `uastc` for normals) from `assets-src/` to `public/assets/models/`.
- Player animation clips map: `idle`, `walk`, `run`, `hoe`, `water`, `swing`, `eat` (fallback `swing` per spec §4.6), driven by the `toolUsed`/`itemEaten` events and the movement speed.

- [ ] **Step 1:** Ask the user before downloading. List each pack (name, source URL, license CC0, approximate size). Wait for a yes.
- [ ] **Step 2:** Download the approved packs into a new empty `assets-src/` directory (gitignored; add it to `.gitignore`). Run `node apps/web/scripts/optimize-assets.mjs assets-src apps/web/public/assets/models`.
- [ ] **Step 3: Write the failing test:** every `ASSETS` URL exists on disk under `public/`, and every entry has a non-empty credit that appears in `CREDITS.md`.
- [ ] **Step 4:** Run. Expected: FAIL until all assets and credits are in place; then wire the models into the scene components (keep the placeholder geometry as the `Suspense` fallback).
- [ ] **Step 5:** Run. Expected: PASS. Check the total model weight ≤ 15 MB, and check in the browser on both quality tiers.
- [ ] **Step 6:** Commit: `feat(web): CC0 models, animated character, asset pipeline, credits`.

### Task 27: Resilience — WebGL fallback, context loss, error boundaries, storage banner

**Files:**
- Create: `apps/web/src/ui/{ErrorBoundary.tsx}`, `src/ui/screens/{WebGLFallback,StorageBanner}.tsx`, `src/render/webgl.ts`; Test: `src/ui/ErrorBoundary.test.tsx`, `src/render/webgl.test.ts`, `src/ui/screens/StorageBanner.test.tsx`

**Interfaces:**
- Produces: `hasWebGL2(createCanvas = () => document.createElement('canvas')): boolean`; `<ErrorBoundary fallback onReset>`; context loss: on `webglcontextlost` → `preventDefault`, set the `overlay` to a "Restoring graphics…" state, pause the clock; on `webglcontextrestored` → remount the Canvas via a key bump; asset load: 2 retries then an error screen with Reload.

- [ ] **Step 1: Write failing tests:** `hasWebGL2` false when `getContext('webgl2')` returns null → App renders `WebGLFallback`; a throwing child inside `ErrorBoundary` shows the fallback while the store's `game` is unchanged; storage unavailable → the banner says "Progress can't be saved here. Use Export in the pause menu."; a simulated context loss pauses the clock and a restore resumes it.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit: `feat(web): WebGL fallback, context recovery, error boundaries, storage banner`.

---

## Phase E — End-to-End, CI, Ship

### Task 28: Playwright — golden path, devices, accessibility, visuals, seasons

**Files:**
- Create: `apps/web/playwright.config.ts`, `apps/web/e2e/{golden-path,devices,a11y,visual,seasons}.spec.ts`, `apps/web/e2e/helpers.ts`

**Interfaces:**
- Consumes: `window.__hearthvale` (dev server started with `VITE_E2E=true`).
- Produces: `helpers.ts`: `newGame(page, { seed })`, `faceTile(page, x, y)` (`__hearthvale.teleport` to the neighbor tile, facing the target), `act(page, cmd)`, `state(page)`.
- Projects: `chromium`, `webkit`, `Pixel 7`, `iPhone 14`.

- [ ] **Step 1:** Write `golden-path.spec.ts` (spec §6.2): seed 7 → till 1 tile → plant a turnip → water → sleep ×4 (watering each morning) → harvest → ship → sleep → gold = 500 + 35 → reload the page → Continue → state equals the saved state (calendar, gold, bag). Use real keyboard input for the first till and plant (proves the input wiring), then the debug `dispatch` for speed.
- [ ] **Step 2:** Write `devices.spec.ts`: on the mobile projects, the joystick and action buttons are visible and ≥ 56 px, a touch-drag on the joystick moves the player, there is no horizontal scroll at 375 px width, in portrait and landscape.
- [ ] **Step 3:** Write `a11y.spec.ts`: axe on Title, Slots, NewGame, Pause, Cart, Bin → zero `serious`/`critical` violations.
- [ ] **Step 4:** Write `visual.spec.ts`: screenshots of Title, Pause, Cart, and the HUD with the canvas masked (`mask: [page.locator('canvas')]`), Chromium only.
- [ ] **Step 5:** Write `seasons.spec.ts`: sleep through each season, assert `state.calendar.season` and the HUD season label, capture one canvas screenshot per season as an artifact (not compared).
- [ ] **Step 6:** Run `pnpm --filter web exec playwright test`. Expected: all PASS on all projects (update visual baselines on the first run with `--update-snapshots`, then rerun to PASS).
- [ ] **Step 7:** Commit: `test(web): end-to-end golden path, devices, a11y, visuals, seasons`.

### Task 29: CI, bundle budget, deploy, docs

**Files:**
- Create: `.github/workflows/ci.yml`, `apps/web/.size-limit.json`, `vercel.json`, `README.md`, `docs/ARCHITECTURE.md`; Modify: `apps/web/vite.config.ts` (manual chunks: `three`, `r3f`, `app`)

**Interfaces:**
- Produces: CI jobs `install → lint → typecheck → test:coverage → build → size-limit → e2e (chromium, webkit)`, with Playwright reports uploaded as artifacts on failure; `size-limit` on initial JS ≤ 500 KB gzip; `vercel.json` with build `pnpm --filter web build`, output `apps/web/dist`, and long-cache headers for `/assets/*`.

- [ ] **Step 1:** Add `.size-limit.json` and run `pnpm --filter web exec size-limit`. Expected: PASS (≤ 500 KB). If it fails, lazy-load the post-processing and the menus first, then re-measure.
- [ ] **Step 2:** Add a throttled load check (Chromium, 4× CPU slowdown, Fast 4G profile): it logs time-to-playable (the first `dayStarted` after Continue/New) and is reported, not gating, per spec §6.3.
- [ ] **Step 3:** Write `ci.yml`. Validate locally with `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm --filter web build && pnpm --filter web exec size-limit && pnpm --filter web exec playwright test --project=chromium --project=webkit`. Expected: all PASS.
- [ ] **Step 4:** Write `README.md` (pitch, GIF placeholder replaced by a real capture from the seasons spec, live link, controls table, scripts, architecture diagram) and `docs/ARCHITECTURE.md` (core/web boundary, command → events flow, fixed step loop, save design, quality tiers).
- [ ] **Step 5:** Commit: `ci: pipeline, bundle budget, Vercel config, docs`.
- [ ] **Step 6:** Ask the user before creating the GitHub repo, pushing, and connecting Vercel (these publish code). On a yes: create the repo, push, link Vercel, confirm the production URL loads and plays, and add the URL to the README.

### Task 30: Definition-of-Done pass

**Files:** none new (fixes go to their owning files with regression tests).

- [ ] **Step 1:** Walk spec §7 items 1–7 one by one. For each, name the test or the manual browser check that proves it, and run it.
- [ ] **Step 2:** Play the first 3 in-game days manually on desktop (keyboard and gamepad if one is attached) and on the `mobile` preset (touch), noting any friction; fix bugs via superpowers:systematic-debugging with a failing test first.
- [ ] **Step 3:** Run the full verification command from Task 29 Step 3. Expected: all PASS (superpowers:verification-before-completion).
- [ ] **Step 4:** Commit any fixes: `fix: definition-of-done pass`.
