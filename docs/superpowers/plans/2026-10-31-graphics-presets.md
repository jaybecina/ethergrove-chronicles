# Low / Medium / High Graphics Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the graphics tiers to Low / Medium / High, make Automatic start on Medium, migrate saved settings,
and give each preset its own vegetation and crop/character detail.

**Architecture:** Every per-tier value lives in `QUALITY` (`apps/web/src/render/quality.ts`); scene components read
`QUALITY[tier]` through `useGame((s) => s.tier())`. Saved settings gain a version, and a pure `migrateSettings`
maps the old ids once on load.

**Tech Stack:** TypeScript (strict), React 19, React Three Fiber, three.js 0.186, Zustand, Vitest (jsdom),
Playwright.

**Spec:** `docs/superpowers/specs/2026-10-31-graphics-presets-design.md`

## Global Constraints

- Tier ids: `'low' | 'medium' | 'high'`; settings choice `'auto' | QualityTier`.
- Labels, in this order: `Automatic (recommended)`, `High (stronger GPUs)`, `Medium`,
  `Low (older or built-in graphics)`.
- Automatic never picks `high`. `stepDown`: high → medium → low → low.
- No `any`; no `if (tier === …)` for a new per-tier value (put it in `TierSettings`).
- Per-frame code does not allocate; selectors return primitives.
- Every source change ships with a test in the same area; the test must fail without the change.
- Do not commit or push (AGENTS.md). The executor stops at a ready-to-push handoff.
- Single tests: `pnpm --filter web exec vitest run <file>`; e2e:
  `cd apps/web && CI=true pnpm exec playwright test <spec> --project=chromium`.

## Review Focus

1. A stored `quality` that is not a string (`null`, `3`) → loads as `'auto'`, no crash. Test in Task 2.
2. A versioned value with an old id (`{ settingsVersion: 2, quality: 'lite' }`) → `'auto'`, not silently `'low'`.
   Test in Task 2.
3. Migration with blocked storage (write throws) → returns the migrated settings and does not throw. Test in Task 2.
4. Switching presets mid-game → grass, bushes and crop sway change without a reload, and no bush moves position
   (subset rule). Subset test in Task 3; live switch checked by eye in Task 6.
5. Automatic stepped down to `low`, then the player picks `Medium` → Medium wins (`resolveTier`). Test in Task 1.

---

### Task 1: Tier ids, table and Automatic

**Files:**
- Modify: `apps/web/src/render/quality.ts`, `apps/web/src/render/weatherVisuals.ts`,
  `apps/web/src/render/PostFX.tsx` (comments only), `apps/web/src/ui/screens/Settings.tsx`,
  `apps/web/src/game/store.ts` (`autoTier: 'medium'` only)
- Test: `apps/web/src/render/quality.test.ts`, `apps/web/src/render/weatherVisuals.test.ts`,
  `apps/web/src/input/menuIntents.test.tsx`

**Interfaces:**
- Produces: `type QualityTier = 'low' | 'medium' | 'high'`;
  `interface TierSettings { shadowMapSize: 2048 | 1024; dprMax: 2 | 1.5 | 1; ao: boolean; grassDensity: number;
  decorDensity: number; cropSway: number; shadows: boolean; bloom: boolean }`;
  `pickInitialTier(env: { renderer?: string }): QualityTier`; `stepDown(tier: QualityTier): QualityTier`;
  `resolveTier` and `isWeakGpu` unchanged in signature.

- [ ] **Step 1: Rewrite the tier tests**

In `quality.test.ts`:
- `it('tiers match the spec')`: `toEqual` for all three, exact values:
  `high { shadowMapSize: 2048, dprMax: 2, ao: true, grassDensity: 1, decorDensity: 2, cropSway: 0.07, shadows: true, bloom: true }`,
  `medium { 1024, 1.5, false, 0.6, 1, 0.05, true, true }`, `low { 1024, 1, false, 0.35, 0.5, 0, false, false }`
  (same field order).
- Replace the three `pickInitialTier` device tests with `it('Automatic starts every capable device on medium')`:
  `pickInitialTier({})` and each `capable` renderer → `'medium'`; and `it('a weak GPU starts on low')`: each `weak`
  renderer → `'low'`. Move the `weak`/`capable` arrays to the top of the file so both describes share them.
- `stepDown`: `high → medium`, `medium → low`, `low → low`.
- `resolveTier`: `('medium', 'low') → 'medium'`, `('high', 'medium') → 'high'`, `('auto', 'low') → 'low'`.
- `it('each preset draws no more than the one above')`: for each pair (low, medium) and (medium, high), every
  numeric field of the lower is `<=` the higher's, and every boolean field is not `true` where the higher's is
  `false`.

In `weatherVisuals.test.ts`: rename ids — `'low'` → `'medium'` and `'lite'` → `'low'`, same numbers.

In `menuIntents.test.tsx`: `'A picks a focused radio option'` focuses `'Medium'` and expects `'medium'`;
`'A picks the lowest graphics tier'` focuses `'Low (older or built-in graphics)'` and expects `'low'`. Add
`it('Graphics lists the four choices in order')`: `screen.getAllByRole('radio')` names, first four,
`['Automatic (recommended)', 'High (stronger GPUs)', 'Medium', 'Low (older or built-in graphics)']`.

- [ ] **Step 2: Run and watch them fail**

Run: `pnpm --filter web exec vitest run src/render/quality.test.ts src/render/weatherVisuals.test.ts src/input/menuIntents.test.tsx`
Expected: FAIL (old ids and labels).

- [ ] **Step 3: Implement**

- `quality.ts`: the types and table above; `pickInitialTier` per the Interfaces block (`'low'` when
  `env.renderer !== undefined && isWeakGpu(env.renderer)`, else `'medium'`); `detectTier` passes only
  `{ renderer: rendererName(gl.getContext()) }` and its `gl` parameter type drops `capabilities`. Update the file's
  header comment (`low` is the tier for weak GPUs, desktop spec §4 / presets spec §3).
- `weatherVisuals.ts` `COUNTS`: `rain { high: 6000, medium: 2500, low: 1200 }`,
  `storm { high: 9000, medium: 3500, low: 1800 }`, `snow { high: 3000, medium: 1200, low: 600 }`.
- `PostFX.tsx`: logic unchanged; the "Lowest" comment says "Low".
- `Settings.tsx`: `QUALITY_LABEL = { auto: 'Automatic (recommended)', high: 'High (stronger GPUs)', medium: 'Medium', low: 'Low (older or built-in graphics)' }`, order `['auto', 'high', 'medium', 'low']`.
- `store.ts`: initial `autoTier: 'medium'`.

- [ ] **Step 4: Run the tests and typecheck**

Run: the Step 2 command, then `pnpm typecheck`.
Expected: PASS; typecheck clean (`GameCanvas.tsx`'s `detectTier(gl)` call still compiles).

---

### Task 2: Settings migration

**Files:**
- Modify: `apps/web/src/game/store.ts`
- Test: `apps/web/src/game/store.test.ts`

**Interfaces:**
- Consumes: `QualityTier` (Task 1).
- Produces: `Settings.settingsVersion: 2`; `export const CURRENT_SETTINGS_VERSION = 2`;
  `export function migrateSettings(parsed: Record<string, unknown>): Settings`.

- [ ] **Step 1: Write the failing tests**

New `describe('settings migration (presets spec §3.3)')` in `store.test.ts`:
- `it.each([['low', 'medium'], ['lite', 'low'], ['high', 'high'], ['auto', 'auto']])('unversioned %s loads as %s')`:
  `migrateSettings({ quality: from }).quality` equals `to`, and `.settingsVersion` is `2`.
- `it('unknown or non-string quality becomes auto')`: `'ultra'`, `null`, `3` → `'auto'`.
- `it('a versioned value is not mapped again')`: `{ settingsVersion: 2, quality: 'low' }` → `'low'`;
  `{ settingsVersion: 2, quality: 'lite' }` → `'auto'`.
- `it('an old stored value is written back once with the version')`: set `ethergrove:settings` to
  `{"quality":"lite"}`; `createGameStore()`; stored JSON has `settingsVersion: 2, quality: 'low'`; spy on
  `localStorage.setItem`, `createGameStore()` again, expect no call with `'ethergrove:settings'`.
- `it('legacy Hearthvale settings are migrated')`: `hearthvale:settings` = `{"quality":"lite"}` → store's
  `settings.quality` is `'low'`.
- `it('migrates with blocked storage')`: stored `{"quality":"low"}`, `setItem` throws → `settings.quality` is
  `'medium'`, no throw.
- Update `'loadSettings drops unknown keys'` if its key list check now needs `settingsVersion` (it compares to
  `DEFAULT_SETTINGS` keys, so it should pass unchanged).

- [ ] **Step 2: Run and watch them fail**

Run: `pnpm --filter web exec vitest run src/game/store.test.ts`
Expected: FAIL (`migrateSettings` is not exported).

- [ ] **Step 3: Implement**

`migrateSettings` copies known keys (as `parseSettings` does today), maps `quality` when
`parsed.settingsVersion !== 2`, then forces any `quality` outside `['auto', 'low', 'medium', 'high']` to `'auto'`,
and sets `settingsVersion: 2`. `parseSettings` becomes `JSON.parse` + `migrateSettings`. In `loadSettings`, when the
new key is present and its parsed `settingsVersion !== 2`, call `saveSettings` on the result (ignore its return).
`DEFAULT_SETTINGS` gains `settingsVersion: 2`.

- [ ] **Step 4: Run the whole web unit suite** (shared module)

Run: `pnpm --filter web exec vitest run`
Expected: PASS.

---

### Task 3: Vegetation and crop sway per preset

**Files:**
- Modify: `apps/web/src/scene/Decor.tsx`, `apps/web/src/scene/CropModels.tsx`
- Create test: `apps/web/src/scene/Decor.test.ts`

**Interfaces:**
- Consumes: `QUALITY[tier].decorDensity`, `QUALITY[tier].cropSway` (Task 1).
- Produces: `export const DECOR_CANDIDATES = 160`;
  `export function decorSpots(grid: Grid, density: number): Record<DecorKey, InstanceItem[]>`.

- [ ] **Step 1: Write the failing test**

`Decor.test.ts`, using a 32 × 24 grid built the way other scene tests build one (or `createNewGame({ seed: 1, … })`
from `@ethergrove/core` and its farm grid):
- `it('more density never moves a bush, only adds')`: flatten each density's spots to `"key@x,z"` strings; every
  string at 0.5 is in 1, every one at 1 is in 2; sizes strictly increase.
- `it('the farmhouse flower bed is on every preset')`: the four house spots (`flowers-1 @1.5,5.4`,
  `flowers-2 @2.6,5.5`, `bush-flowers @8.6,3.2`, `bush @1.4,1.6`) are present at 0.5, 1 and 2.
- `it('density 1 matches today')`: total spot count at density 1 equals the count before this change (record the
  number by running the old `decorSpots` once before editing; write it as a literal).

- [ ] **Step 2: Run and watch it fail**

Run: `pnpm --filter web exec vitest run src/scene/Decor.test.ts`
Expected: FAIL (`decorSpots` is not exported).

- [ ] **Step 3: Implement**

- `Decor.tsx`: export `decorSpots(grid, density)`, loop `i < Math.round(DECOR_CANDIDATES * density)`, hashes
  unchanged. `Decor` reads `const tier = useGame((s) => s.tier())`, `const density = QUALITY[tier].decorDensity`,
  memo deps `[grid.width, grid.height, density]`.
- `CropModels.tsx`: `const tier = useGame((s) => s.tier())`; `patch={{ wind: QUALITY[tier].cropSway }}`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter web exec vitest run src/scene`
Expected: PASS.

---

### Task 4: Player blob shadow on Low

**Files:**
- Create: `apps/web/src/scene/PlayerBlobShadow.tsx`
- Modify: `apps/web/src/scene/Player.tsx`
- Create test: `apps/web/src/scene/PlayerBlobShadow.test.ts`

**Interfaces:**
- Consumes: `QUALITY`, `TierSettings` (Task 1).
- Produces: `export function showBlobShadow(settings: TierSettings): boolean`;
  `export function PlayerBlobShadow(): JSX.Element | null`.

- [ ] **Step 1: Write the failing test**

`it('only Low, which has no shadow map, draws the blob')`: `showBlobShadow(QUALITY.low)` is `true`;
`QUALITY.medium` and `QUALITY.high` are `false`.

- [ ] **Step 2: Run and watch it fail**

Run: `pnpm --filter web exec vitest run src/scene/PlayerBlobShadow.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement**

`showBlobShadow` returns `!settings.shadows`. `PlayerBlobShadow` reads the tier with
`useGame((s) => s.tier())` and returns `null` unless `showBlobShadow(QUALITY[tier])`; otherwise a mesh per spec §4.4:
`circleGeometry args={[0.42, 24]}`, `rotation-x={-Math.PI / 2}`, `position-y={0.02}`, `renderOrder={1}`,
`castShadow={false}`, `receiveShadow={false}`; `meshBasicMaterial color="#000000" transparent opacity={0.3}
depthWrite={false} map={blobTexture()}`. `blobTexture()` lazily builds and caches one 64 × 64 `CanvasTexture`
with a radial gradient, alpha 1 at the centre to 0 at radius 32. Mount `<PlayerBlobShadow />` inside `Player`'s
`<group ref={ref}>`, beside the `Suspense`, so it shows while the model loads too.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter web exec vitest run src/scene/PlayerBlobShadow.test.ts && pnpm typecheck`
Expected: PASS.

---

### Task 5: e2e and desktop e2e on the new ids

**Files:**
- Create: `apps/web/e2e/graphics.spec.ts`
- Modify: `apps/web/e2e/helpers.ts:31-36`, `apps/web/e2e/legacySaves.spec.ts:19`, `apps/web/e2e/devices.spec.ts:16`,
  `apps/desktop/e2e/app.spec.ts:84,126`

**Interfaces:**
- Consumes: the labels (Task 1) and `settingsVersion` (Task 2).

- [ ] **Step 1: Write the failing e2e**

`graphics.spec.ts` (runs on chromium and webkit; phones don't run it):
- `test('Graphics lists Automatic, High, Medium and Low')`: `boot(page)`; click the title's `Settings` button; the
  dialog's radios in the `Graphics` group have the four labels in order; `Medium` is checked (helpers seed Medium).
- `test('a chosen preset survives a reload')`: check `Low (older or built-in graphics)`; reload; reopen Settings;
  it is checked.
- `test('an old Lowest choice opens as Low')`: after `boot`, set `ethergrove:settings` to `{"quality":"lite"}`;
  reload; Settings shows Low checked; stored JSON has `settingsVersion: 2`.

- [ ] **Step 2: Run and watch it fail**

Run: `cd apps/web && CI=true pnpm exec playwright test e2e/graphics.spec.ts --project=chromium`
Expected: before Tasks 1–2 it fails on labels; after them it may pass at once. If it passes, confirm it fails on
`git stash` of Tasks 1–2's `Settings.tsx` and `store.ts` changes, then restore.

- [ ] **Step 3: Update seeds**

- `helpers.ts` `boot()`: `const quality = process.env.SAVE_MEDIA ? 'high' : 'medium';` and seed
  `{ settingsVersion: 2, quality: q }`; the comment says "the Medium tier".
- `legacySaves.spec.ts` and `devices.spec.ts`: `{ settingsVersion: 2, quality: 'medium', … }`.
- `apps/desktop/e2e/app.spec.ts`: seed and expect `JSON.stringify({ settingsVersion: 2, quality: 'low' })`.

- [ ] **Step 4: Run the touched e2e**

Run: `cd apps/web && CI=true pnpm exec playwright test e2e/graphics.spec.ts e2e/legacySaves.spec.ts e2e/golden-path.spec.ts --project=chromium`,
then `pnpm --filter desktop build && pnpm --filter desktop e2e`.
Expected: PASS.

---

### Task 6: Docs, memory, full checks, eye check

**Files:**
- Modify: `README.md:97-98`, `AGENTS.md` (lines 290 and 318),
  `docs/superpowers/specs/2026-10-31-graphics-presets-design.md` §6 (e2e lives in `graphics.spec.ts`, since
  `devices.spec.ts` runs on phones only)
- Create: `brain/decisions/0015-low-medium-high-presets.md`

- [ ] **Step 1: Docs**

- README Weak GPUs line: Settings → Graphics → **Low (older or built-in graphics)** turns off shadows and bloom and
  draws at 1× pixels; Automatic picks Low for software renderers and older Intel graphics and Medium elsewhere.
- AGENTS.md: "Quality tiers. `low`, `medium` and `high` live in `render/quality.ts`; Automatic picks `low` for weak
  GPUs and `medium` otherwise, never `high`. Saved settings carry `settingsVersion`; `migrateSettings` in
  `game/store.ts` maps the pre-2 ids (`low`→`medium`, `lite`→`low`)." and `boot()` "loads the game at the Medium
  quality tier".
- Decision 0015 (format of 0014): renamed ids with a versioned migration (rejected: relabel only); Automatic
  never picks High; vegetation/detail are look choices per the profile; no LOD meshes.

- [ ] **Step 2: Full gate**

Run: `pnpm checks:commit` then `pnpm lint`, then `graphify update .`.
Expected: all PASS.

- [ ] **Step 3: Eye check**

Start `pnpm dev` through the preview tool. On a spring farm, switch High → Medium → Low in Settings without
reloading: grass thins, outer bushes thin (none moves), crops stop swaying on Low, the blob shadow appears only on
Low. Repeat at the `mobile` preset. Stop the preview (free port 5199 / 5173).

- [ ] **Step 4: Handoff**

Ready-to-push handoff per AGENTS.md, every changed file listed in `git add`.
