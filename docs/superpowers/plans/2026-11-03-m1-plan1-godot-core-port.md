# M1 Plan 1 of 5: Godot Project, Core Port and Saves, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A headless-tested Godot 4.7 project at `apps/game` whose `core/` reproduces every Part 1 rule of
`packages/core` exactly (proved by replaying TypeScript-recorded fixtures), with save version 3, its migrations,
and `user://` save slots that import a web-game export.

**Architecture:** `apps/game/core/*.gd` are static-function classes over one plain `Dictionary` game state whose
keys and JSON form match TypeScript's `GameState`. A Vitest file in `packages/core` records scenarios into JSON
fixtures; a GUT harness replays them through the GDScript port and compares states and events after number
normalisation. Version 3 is added last, and the harness then migrates the TypeScript side to version 3 before it
compares.

**Tech Stack:** Godot 4.7.2 (GDScript, static typing), GUT 9.7.0, Vitest 5 (fixture recorder), node:test (repo
scripts), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-03-m1-vertical-slice-design.md` (M1 spec); read with
`docs/superpowers/specs/2026-11-03-rootwake-arpg-story-design.md` §13.

**The five M1 plans:** 1 this plan (spec build steps 1–4) · 2 farm, house, Lowmere, player controller, camera and
tiers (steps 5–6) · 3 combat and the three Gloamed enemies (steps 7–8) · 4 Mossdeep, the boss, Rootstone and
Kindling, XP, gear, cooking (steps 9–11) · 5 exports, the phone message and the owner gate (steps 12–13). Each is
written when the one before it has landed, from the real interfaces it produced.

## Global Constraints

- Godot **4.7.2 stable**; `config/features=PackedStringArray("4.7", "Forward Plus")`. GDScript only, typed
  everywhere. No C#.
- `core/` never touches nodes, signals, the scene tree, files, `Time` or `OS`; randomness only through `Rng`.
- Core functions never mutate their arguments: deep-copy (`duplicate(true)`) before changing anything.
- State keys, command names, event names and event fields are **exactly** the TypeScript ones (camelCase), so
  fixtures compare. GDScript identifiers are snake_case.
- `packages/core` source is not edited. Only a new test file and its helper are added there (Task 3).
- `apps/web` and `apps/desktop` are not touched.
- No download without the owner's OK in chat at the step that needs it (GUT, Godot for CI). Spec §11.1.
- The Godot build contains no self-update code (ARPG §13.2).
- Every source change ships with a test in the same area (`AGENTS.md`); Task 2 adds the `game` area.
- Commit only when the owner asks in chat. Each task's last step is a **handoff** commit command, not a commit
  you run (`AGENTS.md`, owner memory). Never push.
- `GODOT_BIN` env var selects the binary; default `/Applications/Godot.app/Contents/MacOS/Godot` on macOS, else
  `godot`.

## Review Focus

1. **A save JSON with whole numbers as floats** (`"gold": 500.0`, or Godot's own parse giving `500.0`): loading
   it must not break integer maths (indexing, `%`). Pinned by `test_loaded_numbers_index_tiles` in Task 10.
2. **Negative or >2³¹ seeds** (`createNewGame` uses `seed >>> 0`): the Godot new game must match. Pinned by the
   `new-game` fixture seeds `-5` and `4294967295` in Task 3.
3. **A fixture replay that fails half-way** must name the first differing step and key path, not just "false".
   Pinned by `test_replay_reports_first_mismatch` in Task 3.
4. **Interrupted save** (the game quits between the temp write and the rename): the old slot must still load.
   Pinned by `test_leftover_tmp_is_ignored` in Task 12.
5. **A `move` command** (TypeScript-only; Godot uses a body controller): it must be refused loudly, not silently
   ignored. Pinned by `test_move_command_is_refused` in Task 9.

---

### Task 1: Godot project, runner script and smoke boot

**Files:**
- Create: `apps/game/project.godot`, `apps/game/.gitignore`, `apps/game/boot/boot.tscn`, `apps/game/boot/boot.gd`
- Create: `apps/game/test/smoke/smoke_boot.gd`, `apps/game/test/core/test_sanity.gd`
- Create: `apps/game/addons/gut/` (vendored GUT 9.7.0; all options are passed on the command line, so no
  `.gutconfig.json`)
- Create: `scripts/game.mjs`, `scripts/game.test.mjs`
- Modify: `package.json` (scripts), `.prettierignore` (add `apps/game/addons/`), `eslint.config.js` only if it
  lints `apps/game` (it should ignore `apps/game/addons/**`)

**Interfaces:**
- Produces: `pnpm game:test`, `pnpm game:smoke`, `pnpm game:import`; `scripts/game.mjs` exports
  `resolveGodotBin(env: NodeJS.ProcessEnv, platform: string, exists: (p: string) => boolean): string | null` and
  `godotArgs(task: 'import' | 'test' | 'smoke'): string[]`.

- [ ] **Step 0: Branch.** `git switch -c feat/m1-godot-core-port` (local only). The uncommitted M1 spec and this
  plan come along and go in the final handoff.
- [ ] **Step 1: Ask the owner to approve downloading GUT 9.7.0** (MIT) from
  `https://github.com/bitwes/Gut/releases`. Confirm on that page that 9.7.0 lists Godot 4.7. Stop until they say yes.
- [ ] **Step 2: Write the failing node tests** in `scripts/game.test.mjs`:

```js
test('GODOT_BIN wins when it exists', () => {
  assert.equal(resolveGodotBin({ GODOT_BIN: '/x/godot' }, 'linux', (p) => p === '/x/godot'), '/x/godot');
});
test('macOS falls back to the app bundle', () => {
  assert.equal(resolveGodotBin({}, 'darwin', (p) => p === MAC_BIN), MAC_BIN);
});
test('null when nothing is found', () => {
  assert.equal(resolveGodotBin({}, 'linux', () => false), null);
});
test('test args run GUT over res://test and exit', () => {
  assert.deepEqual(godotArgs('test'), ['--headless', '--path', 'apps/game', '-s',
    'res://addons/gut/gut_cmdln.gd', '-gdir=res://test', '-ginclude_subdirs', '-gexit']);
});
test('import and smoke args', () => {
  assert.deepEqual(godotArgs('import'), ['--headless', '--path', 'apps/game', '--import']);
  assert.deepEqual(godotArgs('smoke'), ['--headless', '--path', 'apps/game', '-s', 'res://test/smoke/smoke_boot.gd']);
});
```

`MAC_BIN` is `/Applications/Godot.app/Contents/MacOS/Godot`. On `linux`/`win32` the fallback is the bare
`godot` on `PATH` (pass `exists` the result of a `which`-style lookup the script does itself).

- [ ] **Step 3: Run** `node --test scripts/game.test.mjs`. Expected: FAIL, module not found.
- [ ] **Step 4: Implement `scripts/game.mjs`.** CLI: `node scripts/game.mjs <import|test|smoke>`. For
  `test` and `smoke` it runs `import` first. When no binary is found: print
  `Godot not found: set GODOT_BIN to run the Godot checks. Skipped.` and exit 0, **unless** `CI=true`, then exit 1.
  Exit with Godot's exit code otherwise. Add root scripts `game:import`, `game:test`, `game:smoke`.
- [ ] **Step 5: Run** `node --test scripts/game.test.mjs`. Expected: PASS.
- [ ] **Step 6: Create the project.** `project.godot`: name `Ethergrove Chronicles`, main scene
  `res://boot/boot.tscn`, features `4.7` + `Forward Plus`, and these warnings (2 = error, 1 = warn):
  `untyped_declaration=2`, `unsafe_property_access=2`, `unsafe_method_access=2`, `unsafe_call_argument=2`,
  `unused_variable=2`, `unused_local_constant=2`, `shadowed_variable=2`, `unsafe_cast=1`, `exclude_addons=true`.
  `boot.tscn` is a `Control` with one `Label` reading `Ethergrove Chronicles`. `.gitignore`: `.godot/`, `build/`,
  `*.tmp`. Unzip GUT's `addons/gut` into `apps/game/addons/gut` and enable it in `[editor_plugins]`.
- [ ] **Step 7: Write** `test/core/test_sanity.gd` (`extends GutTest`, one test asserting `1 + 1 == 2`) and
  `test/smoke/smoke_boot.gd` (`extends SceneTree`; `_init` loads `res://boot/boot.tscn`, instantiates it, frees it,
  prints `SMOKE OK`, `quit(0)`; any load failure prints the path and `quit(1)`).
- [ ] **Step 8: Run** `pnpm game:test` then `pnpm game:smoke`. Expected: GUT `1 passed`, exit 0; `SMOKE OK`,
  exit 0. Run `GODOT_BIN=/nope pnpm game:test`: prints the skip notice, exit 0; with `CI=true`: exit 1.
- [ ] **Step 9: Handoff commit**

```bash
git add apps/game/project.godot apps/game/.gitignore apps/game/boot apps/game/test apps/game/addons/gut scripts/game.mjs scripts/game.test.mjs package.json .prettierignore
git commit -m "build(game): add the Godot 4.7 project with GUT and a smoke boot" -m "Starts M1 (spec 2026-11-03-m1-vertical-slice-design). pnpm game:test and game:smoke run headless."
```

### Task 2: Test guard area, pre-commit and CI

**Files:**
- Modify: `scripts/testGuard.mjs` (`AREAS`), `scripts/testGuard.test.mjs`
- Modify: `scripts/checks.mjs` (`PLANS`), `scripts/checks.test.mjs`
- Modify: `.github/workflows/ci.yml` (new `game` job), `AGENTS.md` (Commands, Checks, test guard paragraph)

**Interfaces:**
- Consumes: `pnpm game:test`, `pnpm game:smoke` (Task 1).

- [ ] **Step 1: Write the failing guard tests** in `scripts/testGuard.test.mjs`, following its existing style:
  a staged `apps/game/core/rng.gd` with no test fails and names `apps/game/test/{core,game}/test_*.gd`; with
  `apps/game/test/core/test_rng.gd` staged it passes; `apps/game/addons/gut/gut.gd` alone needs no test;
  `apps/game/test/core/test_rng.gd` alone needs nothing.
- [ ] **Step 2: Run** `node --test scripts/testGuard.test.mjs`. Expected: the new cases FAIL.
- [ ] **Step 3: Add the area** to `AREAS`:
  `{ name: 'game', code: /^apps\/game\/(core|game)\/.+\.gd$/, test: /^apps\/game\/test\/.+\/test_.+\.gd$/, where: 'apps/game/test/{core,game}/test_*.gd (GUT)' }`.
- [ ] **Step 4: Run** the guard tests. Expected: PASS.
- [ ] **Step 5: Add** `{ name: 'Godot tests', cmd: 'pnpm game:test' }` to `PLANS.commit` and to `PLANS.all`
  (after `Unit tests + coverage`), plus `{ name: 'Godot smoke', cmd: 'pnpm game:smoke' }` to `PLANS.all`. Update
  `scripts/checks.test.mjs` so its CI-drift check knows the new `game` job: read the test first and extend the
  comparison it already makes.
- [ ] **Step 6: Ask the owner to approve CI downloading Godot 4.7.2** (official Linux headless binary,
  `https://github.com/godotengine/godot/releases/download/4.7.2-stable/Godot_v4.7.2-stable_linux.x86_64.zip`, about
  60 MB, cached). Stop until they say yes.
- [ ] **Step 7: Add the `game` job** to `ci.yml`: `ubuntu-latest`; checkout, pnpm and Node as the `checks` job
  does; `actions/cache` keyed `godot-4.7.2-linux` for `~/godot`; download and unzip on a cache miss; set
  `GODOT_BIN=$HOME/godot/Godot_v4.7.2-stable_linux.x86_64`; `pnpm install --frozen-lockfile`; `pnpm game:test`;
  `pnpm game:smoke`. `CI=true` is already set by Actions.
- [ ] **Step 8: Run** `node --test scripts/checks.test.mjs scripts/testGuard.test.mjs` and `pnpm checks:commit`.
  Expected: PASS, with the `Godot tests` step green.
- [ ] **Step 9: Document** in `AGENTS.md`: the three `game:*` commands under Commands; the `game` area in the test
  guard paragraph; one line under Checks that the Godot step skips locally without Godot but fails in CI.
- [ ] **Step 10: Handoff commit**

```bash
git add scripts/testGuard.mjs scripts/testGuard.test.mjs scripts/checks.mjs scripts/checks.test.mjs .github/workflows/ci.yml AGENTS.md
git commit -m "build(game): run Godot tests in pre-commit and CI with a test-guard area" -m "GUT runs headless; the game job downloads and caches Godot 4.7.2."
```

### Task 3: Parity fixtures recorder and the replay harness

**Files:**
- Create: `packages/core/test/parity/recorder.ts`, `packages/core/test/parity/scenarios.ts`
- Create: `packages/core/test/parityFixtures.test.ts`
- Create: `apps/game/test/fixtures/*.json` (generated, committed)
- Create: `apps/game/test/support/json_norm.gd`, `apps/game/test/support/parity_replay.gd`
- Create: `apps/game/test/core/test_parity_harness.gd`
- Modify: `package.json` (`game:fixtures`)

**Deviation from spec §4.4, recorded:** the recorder is a Vitest file inside `packages/core`, not
`scripts/export-core-fixtures.mjs`. Node cannot import the core's extensionless TypeScript, while Vitest can; and
as a normal core test its freshness check runs in every pre-commit with no new script. `pnpm game:fixtures` is
`UPDATE_PARITY=1 pnpm --filter @ethergrove/core exec vitest run test/parityFixtures.test.ts`.

**Interfaces:**
- Produces, fixture file format (one scenario per file, `apps/game/test/fixtures/<name>.json`):

```json
{ "name": "tools", "format": 1,
  "start": { "seed": 1, "farmName": "Elm", "playerName": "Ari", "lessons": false },
  "steps": [ { "cmd": { "type": "useTool" } }, { "patch": { "player": { "x": 10.5 } } },
             { "tile": { "x": 10, "y": 10, "value": { "kind": "rock", "hits": 0 } } }, { "blankFarm": true } ],
  "expected": { "events": [[...], ...], "snapshots": { "12": { ...GameState } }, "final": { ...GameState } } }
```

  `events[i]` is the event list of step `i` (`[]` for non-command steps). `snapshots` holds the state after the
  step index given as key. Special files: `rng.json` `{ "seeds": { "1": [1000 floats], ... }, "states": {...} }`
  and `save.json` `{ "v1": <part1-save-v1.json>, "v2": <migrate(v1).file> }`.
- Produces, step semantics (both sides implement them identically):
  - `cmd`: `applyCommand(state, cmd)`.
  - `patch`: deep merge into the state. Dictionaries merge key by key; arrays, scalars and `null` replace.
  - `tile`: `setTile` on the map of `state.player.location`.
  - `blankFarm`: the `blankFarm` helper of `packages/core/test/helpers.ts` (weed, rock, stump → grass).
- Produces: `class_name JsonNorm` with `static func floats(v: Variant) -> Variant` (every int becomes float,
  recursively) and `static func ints(v: Variant) -> Variant` (every float with no fraction becomes int,
  recursively); `static func first_diff(a: Variant, b: Variant, path := "") -> String` returning `""` when equal
  after `floats()`, else the first key path and both values, e.g. `player.x: 10.5 != 11.5`.
- Produces: `class_name ParityReplay` with
  `static func run(fixture: Dictionary, upgrade: Callable = Callable()) -> String` returning `""` on success or
  `step 12 (cmd useTool): events[0].hit: true != false`. The start is `start.state` when the fixture has one
  (hand-made test fixtures), else `NewGame.create(start)`. `upgrade`, when valid, is applied to every expected state
  and to the starting state before comparing (Task 11 passes the `2 → 3` migration).

- [ ] **Step 1: Write `recorder.ts`.** `record(name, start, build: (r: Recorder) => void): Fixture`, where
  `Recorder` has `cmd(c: Command)`, `patch(p: object)`, `tile(x, y, value: Tile)`, `blankFarm()`, `snapshot()`
  (keeps the current state under the current step index) and a `state` getter. It starts from
  `createNewGame(start)` and records `final` at the end. It only calls exported core functions and the helpers
  in `test/helpers.ts`.
- [ ] **Step 2: Write `scenarios.ts`** with these exports, each covering its test file's rules through commands,
  patches and tiles (read the matching `packages/core/test/*.test.ts` and cover each `it` that goes through
  `applyCommand`; teleports become `patch` steps):
  `rng` (seeds 1, 42, 2147483647: the first 1,000 `nextFloat` values and states), `new-game` (seeds 1, 42,
  2147483647, -5, 4294967295; lessons on and off; one fixture with `start` per case, `steps: []`), `tools`,
  `crops`, `bag`, `quick-slots`, `economy`, `day`, `interact`, `milestones`, `weather` (30 sleeps from a new game,
  snapshot after each), `tutorial` (lessons on, every lesson to `complete` with the gift; every note; skip and
  restart), `full-year` (the `botDay` bot of `fullYear.test.ts` rebuilt with recorder steps, 112 days, a snapshot
  on day 1 of each season), and `save`.
- [ ] **Step 3: Write `parityFixtures.test.ts`.** For each scenario: when `process.env.UPDATE_PARITY === '1'`,
  write `apps/game/test/fixtures/<name>.json` (`JSON.stringify(f, null, 1)`); otherwise read the file and
  `expect(JSON.parse(disk)).toEqual(JSON.parse(JSON.stringify(f)))`, with the message
  `Fixture <name> is stale: run pnpm game:fixtures`. Compare parsed JSON, not bytes, because Prettier reformats
  committed `.json`.
- [ ] **Step 4: Run** `pnpm --filter @ethergrove/core exec vitest run test/parityFixtures.test.ts`. Expected: FAIL,
  files missing. Run `pnpm game:fixtures`, then the test again. Expected: PASS. Check that the largest file
  (`full-year.json`) is under 4 MB; if not, drop snapshots to the first day of summer and winter only.
- [ ] **Step 5: Write the failing GUT tests** in `test_parity_harness.gd`:
  `test_floats_normalises_nested_ints` (`JsonNorm.floats({"a": [1, {"b": 2}]}) == {"a": [1.0, {"b": 2.0}]}`),
  `test_ints_keeps_fractions` (`JsonNorm.ints({"x": 2.0, "y": 2.5}) == {"x": 2, "y": 2.5}`),
  `test_first_diff_names_the_path` (`first_diff({"p": {"x": 1}}, {"p": {"x": 2}})` contains `p.x`),
  `test_first_diff_empty_when_equal_after_norm` (`{"a": 1}` vs `{"a": 1.0}` gives `""`), and
  `test_replay_reports_first_mismatch`: a hand-made fixture whose step 1 expects `{"type": "canRefilled"}` where
  the real event differs returns a string starting `step 1`.
- [ ] **Step 6: Run** `pnpm game:test`. Expected: FAIL, `JsonNorm` not found.
- [ ] **Step 7: Implement** `json_norm.gd` and `parity_replay.gd`. `ParityReplay.run` loads nothing itself: the
  caller passes the parsed fixture. It builds the start with `NewGame.create(start)` (Task 7) and dispatches steps
  with `ApplyCommand.apply` (Task 9); until those exist, `test_replay_reports_first_mismatch` uses a fixture with
  a literal `start.state`, only `patch` steps and a `final`, so it runs now.
- [ ] **Step 8: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 9: Handoff commit**

```bash
git add packages/core/test/parity packages/core/test/parityFixtures.test.ts apps/game/test/fixtures apps/game/test/support apps/game/test/core/test_parity_harness.gd package.json
git commit -m "test(game): record TypeScript parity fixtures and add the GUT replay harness" -m "Vitest writes scenario fixtures; GUT replays them against the GDScript port."
```

### Task 4: `Rng` and the data modules

**Files:**
- Create: `apps/game/core/rng.gd`, `apps/game/core/data/balance.gd`, `crops.gd`, `items.gd`, `layouts.gd`,
  `lessons.gd`, `weather_table.gd`
- Test: `apps/game/test/core/test_rng.gd`, `apps/game/test/core/test_data.gd`

**Interfaces:**
- Produces: `class_name Rng` with `static func next_float(rng: int) -> Array` returning `[value: float, next: int]`,
  `next` a signed 32-bit int exactly like TypeScript's `| 0`.
- Produces: `class_name Balance` (constants, snake_case of `BALANCE`: `START_GOLD = 500`, `BAG_SLOTS = 12`,
  `PASS_OUT_MINUTE = 1560`, … every key; `TOOL_ORDER = ["hoe", "can", "sickle", "axe", "hammer"]`,
  `TOOL_COST = {"hoe": 2, "can": 2, "sickle": 1, "axe": 4, "hammer": 4}`); `class_name CropData` (`CROP_IDS`,
  `CROPS` with keys `season, seedCost, days, regrow, sell, eat`, `regrow` `null` where TypeScript has `null`);
  `class_name ItemData` (`ITEMS`, `static func seed_of(crop: String) -> String`,
  `static func crop_of_seed(id: String) -> String` returning `""` for a non-seed); `class_name Layouts`
  (`FARM_LAYOUT`, `HOUSE_LAYOUT`, `FARM_LEGEND`, `HOUSE_LEGEND`, `FIELD_RECT`, `FARM_SPAWN_CHAR`,
  `HOUSE_SPAWN_CHAR`, verbatim); `class_name Lessons` (`LESSON_ORDER`, `LESSON_GOAL`, `NOTE_IDS`,
  `LESSONS_GIFT = 100`); `class_name WeatherTable` (`TABLE`).

- [ ] **Step 1: Write the failing tests.** `test_rng.gd`: for each seed in `rng.json`, 1,000 calls of
  `next_float` chained from the seed give exactly the recorded values and states
  (`assert_eq(JsonNorm.first_diff(...), "")`). `test_data.gd`: `CropData.CROPS.turnip.days == 4`,
  `strawberry.regrow == 4`, `potato.regrow == null`; `ItemData.ITEMS["seed:melon"].kind == "seed"`;
  `Layouts.FARM_LAYOUT.size() == 24` and every row is 32 characters; `Lessons.LESSON_ORDER[9] == "buySeeds"`;
  each `WeatherTable.TABLE` season's weights sum to 1.0 within 1e-9.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement `rng.gd`.** mulberry32 with 32-bit maths emulated in 64-bit ints:

```gdscript
static func _i32(x: int) -> int:
	x &= 0xFFFFFFFF
	return x - 0x100000000 if x >= 0x80000000 else x

static func _imul(a: int, b: int) -> int:  # Math.imul
	var al := a & 0xFFFF
	var ah := (a >> 16) & 0xFFFF
	var bl := b & 0xFFFF
	var bh := (b >> 16) & 0xFFFF
	return _i32(al * bl + (((ah * bl + al * bh) << 16) & 0xFFFFFFFF))

static func next_float(rng: int) -> Array:
	var next := _i32(rng + 0x6D2B79F5)
	var t := next
	t = _imul(t ^ ((t & 0xFFFFFFFF) >> 15), t | 1)
	t = _i32(t ^ (t + _imul(t ^ ((t & 0xFFFFFFFF) >> 7), t | 61)))
	return [float(((t ^ ((t & 0xFFFFFFFF) >> 14)) & 0xFFFFFFFF)) / 4294967296.0, next]
```

  Then the data modules as `const` dictionaries and arrays, copied from `packages/core/src/data/*.ts`.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (`git add apps/game/core/rng.gd apps/game/core/data apps/game/test/core/test_rng.gd apps/game/test/core/test_data.gd`;
  message `feat(game): port the seeded RNG and game data to GDScript`).

### Task 5: `Grid`, `Calendar`, `Weather`

**Files:**
- Create: `apps/game/core/grid.gd`, `calendar.gd`, `weather.gd`
- Test: `apps/game/test/core/test_grid.gd`, `test_calendar.gd`, `test_weather.gd`

**Interfaces:**
- Produces: `class_name Grid`: `parse_layout(rows: Array, legend: Dictionary) -> Dictionary`,
  `tile_at(grid: Dictionary, x: int, y: int) -> Variant` (`null` out of bounds), `set_tile(grid, x, y, tile) ->
  Dictionary` (new grid; `push_error` and return the grid unchanged out of bounds), `is_blocked(tile: Variant) ->
  bool`, `find_feature(grid, feature: String) -> Vector2i`, `find_char(rows: Array, ch: String) -> Vector2i`, and
  `target_tile(player: Dictionary) -> Vector2i` (TypeScript `targetTile`; placed here so crops, tools and interact
  share it; **deviation** from spec §4.1, which put it in `interact.gd`).
- Produces: `class_name Calendar`: `SEASONS`, `advance_minutes(cal, minutes: int) -> Dictionary`,
  `next_day(cal) -> Dictionary`, `weekday(cal) -> String`, `format_clock(minute: int) -> String`,
  `should_pass_out(cal) -> bool`.
- Produces: `class_name Weather`: `roll(season: String, day: int, rng: int) -> Array` `[weather: String, rng: int]`.
- Rule for every later task: TypeScript `undefined`/absent keys stay absent in GDScript (use `erase`, never store
  `null`) except where TypeScript stores `null` (bag cells, quick slots, `regrow`).

- [ ] **Step 1: Write the failing tests.** Port every `it` in `packages/core/test/grid.test.ts`,
  `calendar.test.ts` and `weather.test.ts` as `test_<snake_case_of_title>` with the same inputs and assertions
  (throws become `push_error` + unchanged return; assert with `assert_push_error` where GUT supports it, else
  assert the unchanged value). Add `test_target_tile_faces` for n, s, e, w from `(10.5, 10.5)`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** the three classes from `grid.ts`, `systems/calendar.ts`, `systems/weather.ts`.
  `parse_layout` copies each legend tile with `duplicate(true)`.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): port grid, calendar and weather rules`).

### Task 6: `Bag`, `Crops`, `Economy`, `Tools`

**Files:**
- Create: `apps/game/core/bag.gd`, `crops.gd`, `economy.gd`, `tools.gd`, `apps/game/core/state.gd`
- Test: `apps/game/test/core/test_bag.gd`, `test_crops.gd`, `test_economy.gd`, `test_tools.gd`, `test_quick_slots.gd`

**Interfaces:**
- Produces: `class_name GameStateUtil` (`state.gd`): `current_grid(state) -> Dictionary`,
  `with_grid(state, grid) -> Dictionary`, `result(state, events: Array = []) -> Dictionary` (`{"state", "events"}`),
  `fail(state, reason: String) -> Dictionary` (one `actionFailed` event).
- Produces: `class_name Bag`: `add_item(bag: Array, id: String, qty: int) -> Dictionary` `{bag, added, overflow}`,
  `remove_at(bag, index, qty) -> Array`, `count_of(bag, id) -> int`, `quick_item(state) -> Dictionary` (`{}` when
  none, else `{bagIndex, stack}`), `active_tool(state) -> String` (`""` for slots 5–7), `select_hotbar(state,
  index: int)`, `cycle_hotbar(state, dir: int)`, `move_bag_item(state, from, to)`, `assign_quick_slot(state, slot,
  bag_index: Variant)`, `prune_pins(state)`, each returning the new state `Dictionary`.
- Produces: `class_name Crops`: `is_mature(crop) -> bool`, `crop_stage(crop) -> String`,
  `plant_at(state, x, y, seed) -> Dictionary` (result), `harvest_at(state, x, y)`, `grow_crops(grid) -> Dictionary`
  `{grid, events}`, `kill_out_of_season(grid, season)`, `use_item(state)`.
- Produces: `class_name Economy`: `sell_price(id) -> Variant`, `ship_item`, `unship_item`, `sell_bin(state) ->
  Dictionary` `{state, total, items}`, `is_cart_open(state) -> bool`, `cart_stock(state) -> Array`, `buy_item`.
- Produces: `class_name Tools`: `spend_stamina(state, cost: int) -> Dictionary` (result), `use_tool(state)`.

- [ ] **Step 1: Write the failing tests.** Port every `it` of `bag.test.ts`, `crops.test.ts`, `economy.test.ts`,
  `tools.test.ts`, `quickSlots.test.ts` that does not go through `applyCommand` as GUT tests with the same values
  (the parity fixtures cover the `applyCommand` ones in Task 9). Add `test_core_does_not_mutate_input` per class:
  call each public function on a `duplicate(true)` copy and assert the original is unchanged.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** from `systems/bag.ts`, `crops.ts`, `economy.ts`, `tools.ts` and `state.ts`. The
  destructuring `const { crop: _gone, ...soil } = tile` becomes `var soil := tile.duplicate(true); soil.erase("crop")`.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): port bag, crops, economy and tool rules`).

### Task 7: `Interact`, `Milestones`, `Day`, `NewGame`

**Files:**
- Create: `apps/game/core/interact.gd`, `milestones.gd`, `day.gd`, `new_game.gd`
- Test: `apps/game/test/core/test_interact.gd`, `test_milestones.gd`, `test_day.gd`, `test_new_game.gd`

**Interfaces:**
- Produces: `class_name Interact`: `interact(state) -> Dictionary` (result), `resolve_secondary(state) -> String`
  (`"interact"`, `"useItem"` or `""`).
- Produces: `class_name Milestones`: `check(prev, next, events: Array) -> Dictionary` `{state, events}`.
- Produces: `class_name Day`: `end_day(state, reason: String) -> Dictionary` (`"sleep"` or `"passOut"`),
  `sleep(state) -> Dictionary`. The overnight order is exactly `day.ts`'s (sell, grow, date, weather, revert,
  dry/rain, restore).
- Produces: `class_name NewGame`: `create(opts: Dictionary) -> Dictionary` with keys `seed, farmName, playerName,
  lessons` (`lessons` optional, default false). `seed >>> 0` is `seed & 0xFFFFFFFF`, then the obstacle roll uses it
  as the starting RNG state, then `Rng`'s 32-bit conversion applies as in TypeScript.

- [ ] **Step 1: Write the failing tests.** Port the non-`applyCommand` `it`s of `interact.test.ts`,
  `milestones.test.ts`, `day.test.ts`, `newGame.test.ts`. Add `test_new_game_matches_fixtures`: for every
  `new-game*.json`, `JsonNorm.first_diff(NewGame.create(f.start), f.expected.final) == ""`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** from `systems/interact.ts`, `milestones.ts`, `day.ts`, `newGame.ts`.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS, including seeds `-5` and `4294967295`.
- [ ] **Step 5: Handoff commit** (message `feat(game): port interact, milestones, overnight day and new game`).

### Task 8: `Tutorial`

**Files:**
- Create: `apps/game/core/tutorial.gd`
- Test: `apps/game/test/core/test_tutorial.gd`, `test_tutorial_target.gd`, `test_lessons_data.gd`

**Interfaces:**
- Produces: `class_name Tutorial`: `advance(prev, next, events: Array) -> Dictionary` (result),
  `start_lesson(state, id: String, events: Array) -> Dictionary`, `skip_lessons(state)`, `restart_lessons(state)`
  (results), `lesson_target(state) -> Dictionary` (`{}` for null, else TypeScript's `LessonTarget` keys),
  `lesson_slot(state) -> int` (`-1` for null).

- [ ] **Step 1: Write the failing tests.** Port every non-`applyCommand` `it` of `tutorial.test.ts`,
  `tutorialTarget.test.ts`, `lessonsData.test.ts`. `tutorial.property.test.ts` is not ported here: Task 9 checks its
  invariants over the full-year and tutorial fixtures.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** from `systems/tutorial.ts`, keeping its helper names in snake_case
  (`is_done`, `done_at_start`, `adapt`, `triggered`, `note`) as private `_` functions.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): port Grandpa's lessons tutorial rules`).

### Task 9: `ApplyCommand` and full parity

**Files:**
- Create: `apps/game/core/apply_command.gd`
- Test: `apps/game/test/core/test_parity.gd`, `apps/game/test/core/test_apply_command.gd`,
  `apps/game/test/core/test_invariants.gd`

**Interfaces:**
- Produces: `class_name ApplyCommand`: `apply(state: Dictionary, cmd: Dictionary) -> Dictionary` (result). Same
  dispatch and post-pass as `applyCommand.ts`: dispatch → `prune_pins` when the bag changed → `Milestones.check`
  → `Tutorial.advance`. "The bag changed" is `result.state.bag != state.bag` (value comparison; GDScript has no
  reference identity on copied arrays).
- Rule: `{"type": "move"}` and any unknown type call `push_error("Unsupported command: <type>")` and return the
  state unchanged with no events.

- [ ] **Step 1: Write the failing tests.** `test_parity.gd`: one test per fixture file except `rng`, `save` and
  `new-game*` (`test_parity_tools`, …, `test_parity_full_year`), each
  `assert_eq(ParityReplay.run(load_fixture("<name>")), "")`. `test_apply_command.gd`:
  `test_move_command_is_refused` (state unchanged, no events, push error), `test_unknown_command_is_refused`.
  `test_invariants.gd`, over every snapshot and final state in `full-year.json` and `tutorial.json`: bag length 12;
  every stack qty 1–99; gold and pendingGold ≥ 0; each quick slot `null` or pointing at a non-empty cell;
  `tutorial.count` ≥ 0; `notesSeen` has no duplicates.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement `apply_command.gd`** from `applyCommand.ts`.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS. If a fixture fails, fix the GDScript, never the fixture;
  a real TypeScript bug is reported to the owner, not copied or silently fixed.
- [ ] **Step 5: Handoff commit** (message `feat(game): port applyCommand; every parity fixture replays exactly`).

### Task 10: Save schema and the `1 → 2` migration

**Files:**
- Create: `apps/game/core/save/schema.gd`, `apps/game/core/save/migrate.gd`
- Test: `apps/game/test/core/test_save_schema.gd`, `apps/game/test/core/test_migrate.gd`

**Interfaces:**
- Produces: `class_name SaveSchema`: `validate_state(state: Variant) -> String` and `validate_file(file: Variant)
  -> String`, `""` when valid, else the first failing path (e.g. `state.bag[3].qty`). Same rules as `schema.ts`
  (enums, ranges, bag length 12, stack qty 1–99, grid tile count, optional tile keys).
- Produces: `class_name SaveMigrate`: `CURRENT_SAVE_VERSION := 2` (becomes 3 in Task 11),
  `MIGRATIONS: Dictionary` of `int → Callable`, `migrate(raw: Variant) -> Dictionary` `{ok: true, file}` or
  `{ok: false, error: "invalid" | "unsupportedVersion"}`, `make_save_file(state, play_time_ms: int, saved_at:
  String) -> Dictionary`. `migrate` runs `JsonNorm.ints` on its input first (Review Focus 1) — move `JsonNorm`
  from `test/support/` to `core/json_norm.gd` in this task, since core now uses it.

- [ ] **Step 1: Write the failing tests.** Port every `it` of `save.test.ts`. Add: `test_v1_fixture_migrates` (the
  `save.json` `v1` migrates to `{ok: true}` and equals `v2` by `first_diff`); `test_version_above_current_rejected`
  (`unsupportedVersion`); `test_malformed_rejected` (`"x"`, `{}`, `{"version": "2"}`, a bag of 11 → `invalid`);
  `test_loaded_numbers_index_tiles` (parse a v2 file with `JSON.parse_string`, migrate, then
  `Grid.tile_at(file.state.maps.farm, 3, 6)` returns a tile and `Interact.interact` runs without error).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** `schema.gd` and `migrate.gd` from `save/schema.ts` and `save/migrate.ts`.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): port the save schema and v1 to v2 migration`).

### Task 11: Save version 3

**Files:**
- Modify: every `apps/game/core/*.gd` that reads `player.stamina` (`tools.gd`, `crops.gd`, `day.gd`,
  `new_game.gd`, `tutorial.gd`, and any other the compiler or a search finds), `core/data/balance.gd`,
  `core/data/layouts.gd`, `core/save/schema.gd`, `core/save/migrate.gd`
- Test: `apps/game/test/core/test_migrate.gd`, `test_save_schema.gd`, `test_parity.gd`, `test_new_game.gd`

**Interfaces:**
- Produces: `SaveMigrate.CURRENT_SAVE_VERSION == 3`; `SaveMigrate.MIGRATIONS[2]` is `migrate_2_to_3(file:
  Dictionary) -> Dictionary`, also callable on a bare state as `state_2_to_3(state: Dictionary) -> Dictionary`.
- Produces, the version 3 state (spec §5.1), new-game values in brackets: `version` 3; `player.energy` (renamed
  from `player.stamina`); `player.floor` [0]; `player.location` enum adds `lowmere, woods, mossdeep, clinic`;
  `hp` [100]; `xp` [0]; `level` [1]; `gear` [`{weapon, offHand, head, body, feet, trinket1, trinket2}` all
  `null`]; `buff` [`null`]; `deeps` [`{"mossdeep": {"open": false, "cleared": false, "checkpoints": []}}`];
  `lootSinceSleep` [`[]`]; `elites` [`{"mossmaw": {"defeatedSeason": null}}`]; `rootstones` [`[]`];
  `kindlings` [0]; `talked` [`[]`].
- Produces, layouts: `FARM_LAYOUT` row 2 gets `R` at x 28; row 23 gets `G` at x 16; `HOUSE_LAYOUT` row 1 gets `K`
  at x 1. Legends: `R → {kind: "feature", feature: "rootShrine"}`, `G → {kind: "feature", feature: "farmGate"}`,
  `K → {kind: "feature", feature: "stove"}`. `Interact.interact` on the three new features returns
  `actionFailed` `noTarget` in this plan (Plans 2 and 4 give them their actions).
- Rule: `Balance.MAX_STAMINA` becomes `MAX_ENERGY = 100`; `Tools.spend_stamina` becomes `spend_energy`. Event
  names and fields are **not** renamed (`staminaLow`, `exhausted`, `itemEaten.stamina` stay), so the web game's
  events and the fixtures keep their meaning.
- Rule, the migration: rename the key; add every key above with its new-game value, except
  `deeps.mossdeep.open = "firstShipment" in milestones and not (year == 1 and season == "spring" and day < 8)`
  (spec §6.3); set the three new feature tiles. These tiles are path (28, 2), fence (16, 23) and floor (1, 1) in
  every version 2 save, because the hoe tills only grass, so no crop can be on them; the migration asserts the
  old kind and `push_error`s (keeping the save) if it is anything else. **Deviation** from spec §5.2's "move the
  feature to the nearest free path tile": that case cannot happen in a valid save.
- Rule, `Day.end_day` rebuilds `player` with `floor` 0 and keeps every other new key.

- [ ] **Step 1: Write the failing tests.** `test_migrate.gd`: `test_v1_to_v3` (the `v1` fixture reaches version
  3 and passes `validate_file`); `test_v2_to_v3_keys` (every new key with its value; `player.stamina` absent and
  `player.energy` equal to the old value); `test_mossdeep_open_rule` (spring 7 Y1 with `firstShipment` → closed;
  spring 8 with it → open; spring 20 without it → closed; summer 1 Y1 with it → open);
  `test_feature_tiles_placed`; `test_unexpected_tile_kind_keeps_save` (tilled at (28, 2) → still migrates, push
  error). `test_new_game.gd`: `test_new_game_is_v3_of_ts` — for every `new-game*.json`,
  `first_diff(NewGame.create(start), SaveMigrate.state_2_to_3(expected.final)) == ""`. `test_parity.gd`: pass
  `SaveMigrate.state_2_to_3` as `ParityReplay.run`'s `upgrade`. `test_save_schema.gd`: a v3 new game validates;
  removing `hp`, `gear.weapon` set to `5`, or `player.floor` 9 each fail with that path.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** the version 3 changes listed in Interfaces.
- [ ] **Step 4: Run** `pnpm game:test` and `pnpm --filter @ethergrove/core exec vitest run test/parityFixtures.test.ts`.
  Expected: both PASS (the TypeScript fixtures are unchanged: version 3 lives only in Godot).
- [ ] **Step 5: Handoff commit** (message `feat(game): save version 3 with the M1 fields and a 2 to 3 migration`).

### Task 12: Save slots and the web-save import

**Files:**
- Create: `apps/game/game/save/save_slots.gd`
- Test: `apps/game/test/game/test_save_slots.gd`
- Modify: `apps/game/test/smoke/smoke_boot.gd`

**Interfaces:**
- Consumes: `SaveMigrate.migrate`, `SaveMigrate.make_save_file`, `SaveSchema.validate_file` (Tasks 10–11).
- Produces: `class_name SaveSlots extends RefCounted`, `func _init(base_dir: String = "user://saves")`;
  `save(slot: int, file: Dictionary) -> Error`; `load_slot(slot: int) -> Dictionary` with
  `{"kind": "ok", "file"}`, `{"kind": "missing"}` or `{"kind": "corrupt"}`; `list() -> Array` of
  `{slot, summary (or null), savedAt (or null), playTimeMs, corrupt}` for slots 1–3;
  `import_text(text: String) -> Dictionary` `{ok: true, slot}` (first empty slot) or
  `{ok: false, error: "invalid" | "unsupportedVersion" | "noFreeSlot"}`;
  `const IMPORT_FAILED_TEXT := "This save can't be opened."` (shown by Plan 2's title screen).
- Rule: files are `<base_dir>/slot-<n>.json`. `save` writes `slot-<n>.json.tmp`, then `DirAccess.rename_absolute`
  over the slot file. `load_slot` ignores `.tmp` files. Saved files are `JSON.stringify(file, "\t")`; loading
  migrates (so a version 2 file in a slot upgrades on load) and validates.

- [ ] **Step 1: Write the failing tests** (each uses a fresh `user://test-saves-<random>` base and removes it in
  `after_each`): `test_save_then_load_round_trips` (`first_diff` of the state is `""`); `test_missing_slot`;
  `test_corrupt_slot` (write `{"version": 3` to a slot file → `corrupt`, and `list()` marks it);
  `test_leftover_tmp_is_ignored` (a valid slot plus a garbage `slot-1.json.tmp` still loads the valid one);
  `test_import_web_export` (the text of `packages/core/test/fixtures/part1-save-v1.json`, copied into
  `apps/game/test/fixtures/web-export-v1.json` in this task → `{ok: true, slot: 1}`, then `load_slot(1)` is version
  3); `test_import_rejects_newer` (`version` 99 → `unsupportedVersion`, no file written);
  `test_import_full_slots` (three saved slots → `noFreeSlot`).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement `save_slots.gd`.**
- [ ] **Step 4: Extend the smoke boot:** after the scene check, `NewGame.create({"seed": 7, "farmName": "Smoke",
  "playerName": "Test"})`, save it to slot 1 in `user://smoke-saves`, load it, `first_diff` must be `""`, delete
  the folder, then print `SMOKE OK`.
- [ ] **Step 5: Run** `pnpm game:test` and `pnpm game:smoke`. Expected: PASS and `SMOKE OK`.
- [ ] **Step 6: Handoff commit** (message `feat(game): user:// save slots with atomic writes and web-save import`).

### Task 13: Project memory and the handoff

**Files:**
- Create: `brain/decisions/0020-godot-core-port-parity.md`
- Modify: `AGENTS.md` (a short `apps/game` paragraph under Architecture; the parity rule), `brain/MEMORY.md` (one
  Open threads line), `docs/superpowers/specs/2026-11-03-m1-vertical-slice-design.md` (§4.1, §4.4, §5.2:
  the three recorded deviations)

- [ ] **Step 1: Write the decision note** in the format of `brain/decisions/0019-godot-main-no-phones.md`:
  the core is ported to GDScript; TypeScript stays the reference until the web game retires; parity is proved by
  Vitest-recorded fixtures replayed in GUT; until retirement any Part 1 rule change lands in both, and the
  freshness test makes a TypeScript-only change fail.
- [ ] **Step 2: Update `AGENTS.md`:** under Architecture, `apps/game  Godot 4.7 game (M1 on). core/ = GDScript
  port of packages/core, same state keys; game/ = nodes.` and under Saves, that Godot saves are version 3 and the
  web game stays on 2. Add the lesson: "Godot `==` on nested containers treats `1` and `1.0` as different; compare
  game states with `JsonNorm.first_diff`."
- [ ] **Step 3: Record the deviations** in the M1 spec: `target_tile` lives in `grid.gd`; the fixture recorder is a
  Vitest file; the version 3 feature tiles cannot hold crops, so there is no "nearest free tile" rule; slots live
  in `game/save/save_slots.gd`, and the `save_service.gd` autoload that wraps it comes in Plan 2.
- [ ] **Step 4: Run** `graphify update .`, `pnpm checks:commit` (timeout 600000 ms), `pnpm game:smoke`.
  Expected: all green. Then the full `pnpm checks` in the background, because the plan touched build and test
  config; report its result.
- [ ] **Step 5: Post the `AGENTS.md` ready-to-push handoff** for branch `feat/m1-godot-core-port`, with one
  `git add` listing every file from Tasks 1–13 and the message
  `feat(game): Godot project, GDScript core port with TypeScript parity, save v3`.
