# Ethergrove Chronicles: Low / Medium / High Graphics Presets

**Status:** approved by the owner · **Date:** 2026-10-31 · **Author:** Jay Becina
(with Claude) · **Builds on:** the desktop spec (`2026-10-31-ethergrove-desktop-design.md` §4, the Lowest tier) and
the frame-rate profile (`docs/perf/2026-10-31-frame-rate-profile.md`) · **Branch:** `feat/graphics-presets`

The owner wants three graphics presets that make a lower setting, not a lower-quality game: Low for the widest
reach, Medium as the recommended default, High for stronger GPUs. The game already has three tiers (`high`,
`low` "Battery saver", `lite` "Lowest"). This part renames them, makes Medium the default, and gives each preset
its own vegetation and crop/character detail.

This is the first of three specs the owner split the request into. Out of scope here, each with its own spec:

- **Path-traced photo mode** (optional path-traced screenshots on High).
- **Desktop auto-update** (`electron-updater`, a release on every merge to `main`).

---

## 1. Goal and success criteria

1. Settings → Graphics offers exactly four choices, in this order, with this text:
   `Automatic (recommended)`, `High (stronger GPUs)`, `Medium`, `Low (older or built-in graphics)`.
2. A new player gets Automatic. Automatic starts weak GPUs on Low and every other device on Medium; it never
   picks High. When the frame rate stays low it steps down one preset at a time (High → Medium → Low).
3. A player who saved a choice before this change keeps the same look: Battery saver becomes Medium, Lowest
   becomes Low, High stays High, Automatic stays Automatic.
4. Each preset changes vegetation and crop/character detail per §4, and Low keeps the player visibly grounded
   although it has no shadow map.
5. Every preset uses the same models, palette, lighting model and game rules (same core game and art direction).
6. Every change ships with tests (§6).

## 2. What the profile says, and what that means here

The profile measured post-processing at ~80% of a frame, pixel ratio 2 → 1 saving 65% and shadows ~20%. **Grass
and particles cost nothing measurable**, and the crop and character models are single low-poly Kenney meshes
with no lower-detail versions. So:

- Speed still comes only from the existing knobs (pixel ratio, AO, bloom, shadow map). Their values per preset
  do not change in this part.
- Vegetation and crop/character detail are **look** choices: Low is calmer and sparser, High is lusher. They are
  not sold to the player as speed savings.
- No LOD meshes are made (rejected: new assets, no measured gain).

## 3. Names, default, and saved settings

### 3.1 Tier ids

`QualityTier = 'low' | 'medium' | 'high'` in `apps/web/src/render/quality.ts`.

| New id | Was | Label |
| --- | --- | --- |
| `high` | `high` | `High (stronger GPUs)` |
| `medium` | `low` (Battery saver) | `Medium` |
| `low` | `lite` (Lowest) | `Low (older or built-in graphics)` |

`'auto'` keeps its id; its label becomes `Automatic (recommended)`.

Rejected: keeping the old ids and changing only the labels. It needs no migration, but `'low'` would mean Medium
forever, a trap for every later change.

### 3.2 Automatic

- `pickInitialTier(env: { renderer?: string }): QualityTier` returns `'low'` when `renderer` is defined and
  `isWeakGpu(renderer)`, else `'medium'`. The `coarsePointer`, `deviceMemory` and `maxTextureSize` inputs are
  removed (every one of their branches already landed on Battery saver, now Medium, or on High, which Automatic
  no longer picks). `detectTier` passes only `renderer`.
- `stepDown`: `high → medium`, `medium → low`, `low → low`.
- The store's initial `autoTier` becomes `'medium'` (it was `'high'`), so the first frame before `detectTier`
  runs is never the most expensive one.
- `isWeakGpu` and its regex are unchanged.

### 3.3 Saved settings migration (`apps/web/src/game/store.ts`)

- `Settings` gains `settingsVersion: 2`. `DEFAULT_SETTINGS.settingsVersion = 2`.
- Export `CURRENT_SETTINGS_VERSION = 2` and a pure `migrateSettings(parsed: Record<string, unknown>): Settings`
  that `parseSettings` calls after `JSON.parse`:
  - When `parsed.settingsVersion !== 2`, map `quality`: `'low' → 'medium'`, `'lite' → 'low'`; `'high'` and
    `'auto'` are unchanged.
  - Then, for any version, a `quality` that is not one of `'auto' | 'low' | 'medium' | 'high'` becomes `'auto'`.
  - Copy known keys only, as today; missing keys take the defaults; `settingsVersion` is always 2 in the result.
- `loadSettings` writes the result back with `saveSettings` when the stored value had no `settingsVersion: 2`, so
  the mapping runs once. The legacy `hearthvale:settings` import goes through the same `parseSettings`, so it is
  migrated too (it never had a version).
- A blocked write (private mode) is fine: the next launch migrates again from the same old value, with the same
  result.

## 4. Vegetation and detail per preset

`TierSettings` changes (all values exact):

| Field | `low` | `medium` | `high` | Notes |
| --- | ---: | ---: | ---: | --- |
| `shadowMapSize` | 1024 | 1024 | 2048 | unchanged |
| `dprMax` | 1 | 1.5 | 2 | unchanged |
| `ao` | false | false | true | unchanged |
| `shadows` | false | true | true | unchanged |
| `bloom` | false | true | true | unchanged |
| `grassDensity` | 0.35 | 0.6 | 1 | was 0.5 / 0.5 / 1; type becomes `number` |
| `decorDensity` | 0.5 | 1 | 2 | new; scales the bush/flower scatter |
| `cropSway` | 0 | 0.05 | 0.07 | new; wind amplitude on crop models (today 0.05 everywhere) |

Weather particle counts (`render/weatherVisuals.ts` `COUNTS`) keep their values under the new ids:
`rain: { high: 6000, medium: 2500, low: 1200 }`, `storm: { high: 9000, medium: 3500, low: 1800 }`,
`snow: { high: 3000, medium: 1200, low: 600 }`.

`PostFX` keeps its three trees: `high && ao` (N8AO + bloom), `high` without AO, then the bloom tree, and the
no-bloom tree chosen by `!QUALITY[tier].bloom`. Any branch that tests `tier === 'high'` stays as is; nothing
tests `'low'` or `'lite'` by name after this part.

### 4.1 Grass (`scene/Grass.tsx`)

Reads `QUALITY[tier].grassDensity` as today. The capacity (`bladesFor(grid, 1).length + 4000`) is unchanged, so
High (1) still fits.

### 4.2 Bushes and flowers (`scene/Decor.tsx`)

- Export `DECOR_CANDIDATES = 160` and `decorSpots(grid: Grid, density: number)`.
- The scatter loop runs `i` from 0 to `Math.round(DECOR_CANDIDATES * density) - 1` (80 / 160 / 320 candidates).
  The hash of each `i` is unchanged, so Low's spots are a subset of Medium's and Medium's of High's: nothing
  moves when the player switches presets. The four hand-placed spots beside the farmhouse are on every preset.
- `Decor` reads `const tier = useGame((s) => s.tier())` and memoises on `[grid.width, grid.height, density]`.
  `capacity={400}` stays (320 candidates split over four models).

### 4.3 Crops (`scene/CropModels.tsx`)

`patch={{ wind: QUALITY[tier].cropSway }}`. `ModelInstances` already rebuilds materials when `patch` changes
(`patchKey`), and `wind: 0` disables the sway chunk. Seed specks (`Crops.tsx`) are unchanged.

### 4.4 Player blob shadow (`scene/PlayerBlobShadow.tsx`, new)

Without a shadow map the farmer floats. A soft dark disc under the player fixes that on Low.

- Rendered inside `Player`'s group (so it follows the player) only when `!QUALITY[tier].shadows`.
- Mesh: `circleGeometry` radius 0.42, 24 segments, rotated `-Math.PI / 2` on x, at y 0.02.
- Material: `MeshBasicMaterial`, colour `#000000`, `transparent`, `opacity` 0.3, `depthWrite: false`, `map` a
  64 × 64 radial-gradient `CanvasTexture` (alpha 1 at the centre to 0 at the rim) created once at module level
  on first use. `renderOrder` 1. `castShadow` and `receiveShadow` false.
- Not drawn while `screen === 'title'` (the player group is already hidden there).
- Export `showBlobShadow(settings: TierSettings): boolean` (returns `!settings.shadows`) for the unit test.

## 5. Files

- `apps/web/src/render/quality.ts`: ids, table, `pickInitialTier`, `stepDown`, `detectTier`.
- `apps/web/src/game/store.ts`: `settingsVersion`, `migrateSettings`, write-back, `autoTier: 'medium'`.
- `apps/web/src/ui/screens/Settings.tsx`: labels and order `['auto', 'high', 'medium', 'low']`.
- `apps/web/src/render/weatherVisuals.ts`, `render/PostFX.tsx`: ids only.
- `apps/web/src/scene/{Grass,Decor,CropModels,Player}.tsx`, new `scene/PlayerBlobShadow.tsx`.
- `apps/web/e2e/helpers.ts`: `boot()` seeds `{ settingsVersion: 2, quality: 'medium' }` (High for
  `SAVE_MEDIA`); comments say Medium. `e2e/legacySaves.spec.ts`, `e2e/devices.spec.ts`: seed
  `{ settingsVersion: 2, quality: 'medium', … }`.
- `apps/desktop/e2e/app.spec.ts`: seeds `{ settingsVersion: 2, quality: 'low' }` and expects that exact string
  back after the restart.
- Docs: `README.md` (Weak GPUs line: Settings → Graphics → **Low (older or built-in graphics)**), `AGENTS.md`
  "Quality tiers" gotcha and the `boot()` line, `brain/decisions/0015-low-medium-high-presets.md`.

## 6. Tests (write each first and watch it fail)

- `render/quality.test.ts`: the §4 table exactly; `pickInitialTier` returns `'low'` for each weak renderer
  string already in the file and `'medium'` for the strong ones (Apple M1, Iris Xe, NVIDIA) and for no renderer;
  `stepDown` for all three; `resolveTier`; "Low draws no more than Medium, Medium no more than High" for every
  numeric and boolean field.
- `game/store.test.ts` (`migrateSettings` and load): unversioned `low → medium`, `lite → low`, `high`, `auto`;
  unknown `'ultra' → 'auto'`; versioned `{ settingsVersion: 2, quality: 'low' }` stays `low`; legacy
  `hearthvale:settings` `{ quality: 'lite' }` loads as `low`; an unversioned stored value is written back with
  `settingsVersion: 2` exactly once.
- `input/menuIntents.test.tsx`: the radios are named per §1 item 1 and set `medium` and `low`.
- `scene/Decor.test.ts` (new): candidate counts per density; Low ⊂ Medium ⊂ High by position; the four house
  spots are on every density.
- `scene/PlayerBlobShadow.test.ts` (new): `showBlobShadow` is true only for `low`.
- `render/weatherVisuals.test.ts`: the counts under the new ids.
- e2e `e2e/graphics.spec.ts` (new; `devices.spec.ts` only runs on phones), chromium and webkit: the Graphics fieldset shows the four
  labels in order; picking `Low (older or built-in graphics)` survives a reload; a seeded unversioned
  `{ quality: 'lite' }` opens with Low checked.
- Desktop e2e as in §5.
- By eye, in the built-in browser at desktop and phone sizes: each preset on the farm in spring (grass, bushes,
  crop sway, blob shadow on Low only).

## 7. Risks and trade-offs

- A player on old High-by-Automatic now starts on Medium. Intended: the owner wants Medium as the default and
  High as an opt-in for stronger GPUs.
- Thinner grass on Low (0.35, was 0.5) changes Low's look slightly for no speed gain; accepted for a clearer
  Low / Medium / High progression.
- Settings written by this version, then opened by an older build, see a `quality` of `'medium'`. Older builds
  check keys, not values, so (inferred from the code, not run) the old `resolveTier` would return `'medium'` and
  `QUALITY['medium']` would be undefined. Not a real path: the web build is always the latest, and the desktop app
  bundles its own build. Recorded, not handled.
