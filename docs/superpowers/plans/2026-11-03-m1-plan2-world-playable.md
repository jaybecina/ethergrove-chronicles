# M1 Plan 2 of 5: The World Playable in Godot, Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch the Godot game, start or load a save, and play the whole Part 1 farm loop (including Grandpa's
lessons) on the farm and in the house, walk to Lowmere through the farm gate and talk to its four villagers, at the
Low, Medium or High graphics tier, with autosave and the web-save import.

**Architecture:** The pure core from Plan 1 stays the single source of rules. A `GameSession` autoload owns the
state and applies commands from an intent mapper at a fixed 50 ms step; a `CharacterBody3D` moves the player and
writes the pose back into the state. Scene views are rebuilt in code from the state (a view syncs only changed
tiles), so they are testable headless. UI is Godot `Control` nodes built in code with keyboard and gamepad focus.
Graphics tiers are data (the approved board table F3) applied by one `RenderApplier`.

**Tech Stack:** Godot 4.7.2 (GDScript, Forward+ on desktop), GUT 9.7.1, the Plan 1 core, the CC0 `.glb` models
already committed in `apps/web/public/assets/models`.

**Spec:** `docs/superpowers/specs/2026-11-03-m1-vertical-slice-design.md` (§6.1–6.2, §7.3 controls, §8, §5).
Plan 1: `docs/superpowers/plans/2026-11-03-m1-plan1-godot-core-port.md` (committed as `376d9ae`).

**Out of this plan (stays in later plans):** combat and enemies (Plan 3), Lowmere Woods, Mossdeep, XP, gear,
cooking, the forge/clinic/cottage interiors, the clinic wake-up (Plan 4), exports, the phone message, audio and the
owner playtest (Plan 5). Also left out on purpose to keep the slice small: the web game's journal and calendar
panels, settings screens other than graphics, weather sounds. `move` stays unported: the body controller replaces
it.

## Global Constraints

- Godot **4.7.2**, GDScript only, typed everywhere (`project.godot` makes untyped declarations and unsafe calls
  errors). Desktop renderer **Forward+**; the Web build's Compatibility renderer is Plan 5.
- `apps/game/core/` stays pure (no nodes, files, `Time`, `OS`, signals). Nodes live in `apps/game/game/`.
- The state is the Plan 1 version-3 `Dictionary`; core never mutates arguments; new core rules ship with GUT tests
  and do not change the TypeScript fixtures (they replay version 2 and TS never has `lowmere`).
- Camera: orthographic, **50°** pitch, one fixed yaw, follows the player by panning only (October spec §7.2).
- Speeds (tiles = metres): walk **2.6**, run **4.6**, exhausted ×**0.6**, player radius **0.3** (`Balance`).
- Simulation step **50 ms**; clock **10 game minutes per 7 real seconds**; frames clamped to **250 ms**
  (`apps/web/src/game/config.ts`). Per-frame code does not allocate arrays or dictionaries.
- Graphics tiers are the approved board card F3: art, models, gameplay and hitboxes are identical on every tier;
  Low keeps full art and saves only hidden cost; Automatic never picks High.
- Only CC0 assets already in the repo; copied models are listed in `CREDITS.md`. No downloads in this plan.
- Every flow works with **keyboard and gamepad** (no touch, no phone layouts: decision 0019). Text sizes obey the
  existing 150% rule: UI uses a `Theme` with a base font size and scales with `Settings.ui_scale`.
- UI text is copied **verbatim** from the web game's files named in each task; a GUT test pins every string.
- Branch: create `feat/m1-plan2-world` from `feat/m1-godot-core-port`. The owner commits; nobody here commits,
  stages or pushes (`AGENTS.md`). Each task ends with a **handoff** command, not a commit.

## Review Focus

1. **A save made mid-flow** (menu open, player in Lowmere, lessons active) must reload to the same place with the
   same lesson card; pinned by `test_session_round_trip_in_lowmere` (Task 8) and `test_smoke_playthrough` (Task 17).
2. **Two actions in one frame** (primary and secondary held together, or a menu opening on the step a tool
   fires): at most one command per intent per step, and none while a modal is open; pinned by
   `test_menu_blocks_commands` (Task 8).
3. **Player on a blocked or out-of-range tile after a load or a door**: spawn tiles are validated, and a pose
   inside a blocked tile is pushed out; pinned by `test_pose_is_pushed_out_of_blocked_tile` (Task 5) and
   `test_player_spawns_on_free_tile_after_load` (Task 17).
4. **Tier change while playing** (Settings → Graphics) must apply live without a restart and persist; Automatic
   on a weak GPU must pick Low; pinned by `test_auto_tier_weak_gpu` and `test_apply_tier_is_idempotent` (Task 6)
   and `test_tier_change_reapplies_render_settings` (Task 17).
5. **Autosave failure** (disk full or a blocked folder) must show a toast, keep playing, and never overwrite the
   last good slot; pinned by `test_autosave_failure_keeps_playing` (Task 8).

---

### Task 1: Branch, newer-version slots and the game folder skeleton

**Files:**
- Modify: `apps/game/game/save/save_slots.gd`, `apps/game/test/game/test_save_slots.gd`
- Create: `apps/game/game/autoload/`, `game/input/`, `game/player/`, `game/render/`, `game/ui/`, `game/world/`,
  `apps/game/scenes/` (each with a one-line `README`-free placeholder `.gdkeep` file)

**Interfaces:**
- Produces: `SaveSlots.load_slot(slot) -> Dictionary` gains `{"kind": "newer"}` (file parses, has an integer
  `version` above `SaveMigrate.CURRENT_SAVE_VERSION`); `SaveSlots.list()` entries gain `newer: bool` (and
  `corrupt` stays false for them). `SaveSlots.import_text` is unchanged. `SaveSlots.save()` and `import_text` still
  never overwrite a `newer` or corrupt slot silently: `save(slot, file)` into a slot that holds a `newer` file
  returns `ERR_ALREADY_EXISTS` unless called as `save(slot, file, true)` (`force`).

- [ ] **Step 0:** `git switch -c feat/m1-plan2-world` (local only).
- [ ] **Step 1: Write failing tests** in `test_save_slots.gd`: `test_newer_version_is_reported_as_newer` (a slot file
  with `version` 99 → `load_slot(1).kind == "newer"` and `list()[0].newer == true`, `corrupt == false`),
  `test_save_refuses_to_overwrite_newer_slot` (returns `ERR_ALREADY_EXISTS`, file bytes unchanged),
  `test_save_force_overwrites_newer_slot`, `test_import_skips_newer_slot_as_occupied`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** the interface above in `save_slots.gd`.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS (Plan 1's 288 tests plus the new ones).
- [ ] **Step 5:** create the folder skeleton; run `pnpm game:smoke` (SMOKE OK).
- [ ] **Step 6: Handoff commit** (`git add apps/game/game apps/game/test/game/test_save_slots.gd`; message
  `feat(game): report newer-version save slots and refuse to overwrite them`).

### Task 2: Zones, Lowmere and door transitions in the core

**Files:**
- Create: `apps/game/core/data/zones.gd`, `apps/game/test/core/test_zones.gd`
- Modify: `apps/game/core/state.gd`, `core/interact.gd`, `core/tutorial.gd`, `core/save/schema.gd`
  (feature id list), `test/core/test_interact.gd`, `test_tutorial_target.gd`, `test_save_schema.gd`

**Interfaces:**
- Produces: `class_name Zones` with `LOWMERE_LAYOUT: Array` (exact rows below), `LOWMERE_LEGEND: Dictionary`,
  `static func grid(zone: String) -> Dictionary` (`"lowmere"` → parsed once and cached in a static var;
  other ids → `{}`), `LOWMERE_SPAWN := Vector2(12.5, 1.5)`, `FARM_GATE_ARRIVAL := Vector2(16.5, 22.5)`.
- Modifies: `GameStateUtil.current_grid(state)` returns `Zones.grid("lowmere")` when
  `state.player.location == "lowmere"`; `with_grid` on `lowmere` is a no-op with `push_error` (the zone is static).
- Produces new feature ids (tile `kind: "feature"`): `toFarm`, `toWoods`, `forgeDoor`, `clinicDoor`, `cottageDoor`,
  `noticeBoard`. `Interact.interact`: `farmGate` → `{location: "lowmere", x: 12.5, z: 1.5, facing: "s"}` +
  event `locationChanged {location: "lowmere"}`; `toFarm` → `{location: "farm", x: 16.5, z: 22.5, facing: "n"}` +
  `locationChanged {location: "farm"}`; `toWoods`, `forgeDoor`, `clinicDoor`, `cottageDoor`, `noticeBoard`,
  `rootShrine`, `stove` → `actionFailed noTarget` (their actions come in Plans 3–4).
- `Tutorial.lesson_target(state)` when `location == "lowmere"`: the `toFarm` tile (same shape as the house-door
  redirect); `Tutorial.lesson_slot` unchanged.

Lowmere layout (24 × 16, rows y0–y15, exact):

```
############N###########
#___________S__________#
#_HHHHH___HHHHH___HHHHH#
#_HHHHH___HHHHH___HHHHH#
#_HHFHH___HHCHH___HHWHH#
#______________________#
#______________________#
#__.______B_______.____#
#______________________E
#______________________#
#______________________#
#......................#
#......................#
#......................#
#......................#
########################
```

Legend: `#` fence, `_` path, `.` grass, `H` building, `S` path (spawn), `N` feature `toFarm`, `E` feature `toWoods`,
`F` `forgeDoor`, `C` `clinicDoor`, `W` `cottageDoor`, `B` `noticeBoard`. (Row 0 has `N` at x 12; row 8 has `E` at
x 23.)

- [ ] **Step 1: Write failing tests:** `test_lowmere_layout_shape` (24 × 16, every row 24 chars, exactly one of each
  feature id at the coordinates above: N (12,0), E (23,8), F (4,4), C (12,4), W (20,4), B (10,7));
  `test_current_grid_in_lowmere` (state with `location "lowmere"`); `test_farm_gate_enters_lowmere` (stand at
  (16,22) facing `s` on a fresh game → pose and event as above); `test_to_farm_returns_to_farm_gate`;
  `test_other_features_are_noTarget` (all seven ids); `test_lesson_target_in_lowmere_points_at_to_farm`;
  `test_schema_accepts_new_feature_ids`; `test_zones_do_not_change_parity` (re-run of `test_parity` stays green).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** `zones.gd` (layout and legend as above; uses `Grid.parse_layout`) and the core changes.
  `Interact` additions must not touch the existing farm/house cases.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS, with all 23 TS fixtures still replaying.
- [ ] **Step 5: Handoff commit** (message `feat(game): Lowmere zone data and farm-gate door transitions`).

### Task 3: Villagers and the talk rule

**Files:**
- Create: `apps/game/core/data/villagers.gd`, `apps/game/test/core/test_villagers.gd`
- Modify: `core/interact.gd`, `test/core/test_interact.gd`

**Interfaces:**
- Produces: `class_name Villagers` with `ALL: Array` of `{id, name, x, y, facing, first, repeat}` in this order:
  `hilda` (4, 5, `n`), `aldous` (12, 5, `n`), `fern` (20, 5, `n`), `bram` (10, 8, `n`), with the **exact lines of
  spec §6.2** (`first`, `repeat`); `static func at(x: int, y: int) -> Dictionary` (`{}` if none).
- Modifies `Interact.interact`: when `location == "lowmere"` and the target tile holds a villager, return
  `{"state": s, "events": [{"type": "talked", "villager": id, "name": name, "text": first_or_repeat}]}` where
  `s.talked` gains `id` on the first conversation only (append, no duplicates). The villager check runs **before**
  the feature check. `Interact.resolve_secondary` returns `"interact"` for a tile with a villager.

- [ ] **Step 1: Write failing tests:** `test_villager_lines_match_spec` (all 8 strings exactly:
  Hilda "Elias's grandchild. Same stubborn chin. Bring me ore." / "Copper first. Five ore, one bar."; Aldous "If the
  woods knock you flat, they carry you here. Try not to make it a habit." / "Eat before you go down. Empty stomachs
  make poor fighters."; Fern "The old well in the woods has woken, dear. Elias would have gone down already. Bring
  its stone home to the shrine." / "The shrine remembers him, dear. Give it time to remember you."; Bram "Welcome to
  Lowmere. Stay out of the woods after dark. Please." / "Lock your gate at night. Everyone's doing it now.");
  `test_first_talk_adds_to_talked_and_uses_first_line`; `test_second_talk_uses_repeat_line_and_no_duplicate`;
  `test_villager_beats_feature_on_same_tile`; `test_secondary_is_interact_on_villager`;
  `test_talk_does_not_change_state_otherwise` (deep-equal except `talked`).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** `villagers.gd` and the `Interact` change.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): villagers and the talk rule`).

### Task 4: Model catalog and credited assets

**Files:**
- Create: `apps/game/assets/models/*.glb` (copied from `apps/web/public/assets/models/`), `apps/game/game/render/model_catalog.gd`,
  `apps/game/test/game/test_model_catalog.gd`
- Modify: `CREDITS.md` (one line saying the Godot game reuses the same models), `.gitattributes` (`*.glb binary`)

**Interfaces:**
- Produces: `class_name ModelCatalog` with `static func path(key: String) -> String` (`res://assets/models/<key>.glb`),
  `KEYS: Array[String]` (exactly the keys of `apps/web/src/scene/assets.ts` `ASSETS`: `player`, `tree-round-1..3`,
  `tree-dead-1..2`, `tree-pine-1..2`, `bush`, `bush-flowers`, `flowers-1..2`, `rock-1..3`, `weed-1..2`, `stump`,
  `fence`, `crop-sprout`, `crop-young`, `crop-turnip`, `crop-melon`, `crop-pumpkin`, `corn-a..d`, `bed`, `rug`,
  `potted-plant`, `table`, `chair`, `lamp`), `static func instantiate(key: String) -> Node3D` (loads and caches
  the `PackedScene`, returns a fresh instance; `push_error` and an empty `Node3D` if missing), and
  `static func fit(node: Node3D, width := 0.0, height := 0.0) -> void` (scales uniformly so the footprint width or
  height matches, then drops the base to y = 0 and centres x/z; mirrors `ModelInstances` `fit`).

- [ ] **Step 1:** copy the models (`cp apps/web/public/assets/models/*.glb apps/game/assets/models/`); run
  `pnpm game:import` once so Godot creates the `.import` data (git-ignored under `.godot/`).
- [ ] **Step 2: Write failing tests:** `test_every_key_has_a_file`, `test_every_model_instantiates_nodes`
  (each key's instance has at least one `MeshInstance3D` descendant, except none), `test_player_has_animations`
  (the `player` instance contains an `AnimationPlayer` with clips `Idle`, `Walking_A`, `Running_A`,
  `2H_Melee_Attack_Chop`, `1H_Melee_Attack_Slice_Horizontal`, `Use_Item`, `Interact`, `PickUp`, `Cheer`),
  `test_fit_width_scales_and_grounds` (a 2 m cube fitted to width 1 → size 1, min y 0), `test_missing_key_is_loud`.
- [ ] **Step 3: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 4: Implement** `model_catalog.gd`. If the `player` clip names differ in Godot's import (Godot may
  rename on import), record the actual names in the test and use them everywhere; say so in the report.
- [ ] **Step 5: Run** `pnpm game:test`. Expected: PASS; `du -sh apps/game/assets` stays under 5 MB.
- [ ] **Step 6: Handoff commit** (message `feat(game): import the CC0 models and add the model catalog`).

### Task 5: Player pose rules and clip choice

**Files:**
- Create: `apps/game/core/player_pose.gd`, `apps/game/game/player/player_clips.gd`,
  `apps/game/test/core/test_player_pose.gd`, `apps/game/test/game/test_player_clips.gd`

**Interfaces:**
- Produces: `class_name PlayerPose`: `with_pose(state: Dictionary, x: float, z: float, facing: String) ->
  Dictionary` (deep copy; sets `player.x`, `player.z`, `player.facing`; `push_error` if `facing` not in
  `n s e w`), `facing_of(dx: float, dz: float) -> String` (|dx| ≥ |dz| → `e`/`w` by sign of dx; else `s`/`n` by
  sign of dz, exactly `movement.ts` `facingOf`), `speed_for(state, run: bool) -> float` (walk 2.6; run 4.6 unless
  `player.energy <= 0`, then walk × 0.6 whether or not run is held), `push_out_of_blocked(state, x: float, z: float)
  -> Vector2` (if the circle of radius 0.3 at (x, z) overlaps a blocked tile of the current grid, return the
  nearest position on a free tile centre ±0.5 that does not; unchanged otherwise).
- Produces: `class_name PlayerClips` (port of `apps/web/src/scene/playerClips.ts`): `clip_for_event(e: Dictionary)
  -> String` (`""` for none), `locomotion_clip(speed: float, exhausted: bool) -> String`,
  `clip_rate(clip: String, speed: float) -> float` (same clamps as the TS file).

- [ ] **Step 1: Write failing tests:** pose: `test_with_pose_sets_fields_and_copies`, `test_facing_of_matches_ts`
  (the four axes and the diagonal tie → `e`/`w`), `test_speed_for` (walk, run, exhausted both ways),
  `test_pose_is_pushed_out_of_blocked_tile` (a position overlapping a fence tile ends on a free position),
  `test_pose_unchanged_when_free`; clips: one test per branch of the TS file (`toolUsed` sickle/can/other,
  `cropHarvested`, `cropPlanted`, `itemEaten`, `milestoneReached`, unknown → `""`; locomotion thresholds 0.3 and
  the mid-speed 3.6; `clip_rate` clamps).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** both classes (read `movement.ts` and `playerClips.ts` first).
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): player pose rules and animation clip choice`).

### Task 6: Graphics tiers, render applier and settings

**Files:**
- Create: `apps/game/game/render/tiers.gd`, `render_applier.gd`, `apps/game/game/autoload/settings.gd`,
  `apps/game/test/game/test_tiers.gd`, `test_settings.gd`
- Modify: `apps/game/project.godot` (autoload `Settings`)

**Interfaces:**
- Produces: `class_name Tiers`: `IDS: Array[String] = ["low", "medium", "high"]`, `TABLE: Dictionary` with exactly
  these values (from the approved F3 table / the proof's `TIERS`), keys per tier:

| key | low | medium | high |
|---|---|---|---|
| `msaa` | `Viewport.MSAA_DISABLED` | `MSAA_2X` | `MSAA_4X` |
| `fxaa` | true | false | false |
| `scale` (render scale; FSR upscaling when < 1) | 0.75 | 1.0 | 1.0 |
| `shadows` | false | true | true |
| `shadow_size` | 1024 | 2048 | 4096 |
| `splits` | `SHADOW_ORTHOGONAL` | `SHADOW_PARALLEL_2_SPLITS` | `SHADOW_PARALLEL_4_SPLITS` |
| `soft` | `SHADOW_QUALITY_HARD` | `SHADOW_QUALITY_SOFT_LOW` | `SHADOW_QUALITY_SOFT_HIGH` |
| `glow` | false | true | true |
| `ssao` | false | true | true |
| `ssil` | false | false | true |
| `dof` | false | false | true |
| `vfog` | false | false | true |
| `grass`, `scatter`, `particles` | 1.0, 1.0, 1.0 | 1.0, 1.0, 1.0 | 1.3, 1.5, 1.4 |
| `lights` | 2 | 4 | 8 |
| `light_shadows` | false | false | true |
| `blob_shadow` (character shadow) | true | false | false |

  plus `static func is_weak_gpu(renderer: String) -> bool` (case-insensitive regex copied verbatim from
  `apps/web/src/render/quality.ts` `WEAK_GPU`), `static func pick_initial(renderer: String) -> String` (`"low"` if
  weak, else `"medium"`; never `"high"`), `static func resolve(choice: String, renderer: String) -> String`
  (`"auto"` → `pick_initial`; a tier id → itself; unknown → `pick_initial`).
- Produces: `class_name RenderApplier` with `static func apply(tier: String, viewport: Viewport, env: Environment,
  sun: DirectionalLight3D) -> void` (sets MSAA/FXAA/scaling mode+scale/shadow atlas/soft quality/glow/ssao/ssil/dof/
  volumetric fog/sun shadow mode+size; idempotent) and `static func summarize(viewport, env, sun) -> Dictionary`
  (for tests).
- Produces: autoload `Settings` (`game/autoload/settings.gd`): `choice: String` (`"auto"` default),
  `tier() -> String`, `set_choice(c: String) -> void` (validates, saves, emits `tier_changed(tier)`),
  `ui_scale: float` (1.0, 1.25, 1.5; persisted), `renderer_name() -> String` (injectable for tests);
  persists to `user://settings.cfg` (`ConfigFile`, section `graphics`/`ui`); a corrupt or missing file yields
  defaults without error.

- [ ] **Step 1: Write failing tests:** `test_table_has_three_tiers_with_identical_key_sets`;
  `test_low_draws_no_more_than_medium_than_high` (every numeric and boolean key is monotone low ≤ medium ≤ high,
  treating `blob_shadow` as inverse); `test_values_match_f3` (spot-check each row above); `test_is_weak_gpu` (the
  strings `llvmpipe`, `SwiftShader`, `Intel(R) UHD Graphics 630`, `Mali-G52` are weak; `Apple M4`,
  `NVIDIA GeForce RTX 4060`, `Intel(R) Iris(R) Xe Graphics` are not); `test_auto_tier_weak_gpu` (→ low) and
  `test_auto_never_high`; `test_resolve_unknown_falls_back`; `test_apply_tier_is_idempotent` (apply twice,
  `summarize` equal) and `test_apply_sets_msaa_and_scale` for each tier on a fresh `SubViewport`/`Environment`;
  settings: `test_settings_round_trip` (set, reload a new instance from the same path → same), `test_settings_corrupt_file_defaults`,
  `test_set_choice_rejects_unknown`, `test_tier_changed_signal_fires_once`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.** `Settings` takes its file path from a `const` overridden by tests (a `_path` var).
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): graphics tiers, render applier and persisted settings`).

### Task 7: Camera math and rig

**Files:**
- Create: `apps/game/core/camera_math.gd`, `apps/game/game/world/camera_rig.gd`,
  `apps/game/test/core/test_camera_math.gd`, `apps/game/test/game/test_camera_rig.gd`

**Interfaces:**
- Produces: `class_name CameraMath`: `PITCH_DEG := 50.0`, `ORTHO_SIZE := 14.0` **(draft, tune by eye in Step 5)**,
  `static func offset(distance: float) -> Vector3` (yaw 0: `Vector3(0, distance * sin(pitch), distance *
  cos(pitch))`, port of `cameraMath.ts` `offsetAt(0, d)`), `static func tile_to_world(x: float, y: float) ->
  Vector3` (`(x + 0.5, 0, y + 0.5)`), `static func follow_target(px: float, pz: float) -> Vector3`,
  `static func screen_dir_to_world(dx: float, dz: float) -> Vector2` (yaw 0: identity, kept for the intent mapper).
- Produces: `class_name CameraRig extends Node3D` with `target: Node3D`, `_process` that sets its own
  `global_position` to `target.global_position` (no smoothing in M1; panning only) and a child `Camera3D`
  (`projection = ORTHOGONAL`, `size = ORTHO_SIZE`, `near/far` 0.1 / 80, offset by `CameraMath.offset(30.0)`, looking
  at the rig origin); `func snap() -> void`.

- [ ] **Step 1: Write failing tests:** `test_offset_matches_ts` (distance 12 gives `(0, 9.192, 7.713)` within 1e-3),
  `test_tile_to_world`, `test_rig_follows_target_on_process`, `test_camera_is_orthogonal_and_pitched`
  (`rotation_degrees.x == -50` within 1e-3; `size == ORTHO_SIZE`).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5 (by eye, after Task 10):** run the screenshot tool from Task 17 on the farm at Medium and compare with
  the F0 renders on the board; set `ORTHO_SIZE` so the 32 × 24 farm's field fills about 60% of the frame width at
  1280 × 720; record the final value in the report and in the spec's §8.
- [ ] **Step 6: Handoff commit** (message `feat(game): orthographic follow camera`).

### Task 8: GameSession, fixed-step clock, intents, commands and SaveService

**Files:**
- Create: `apps/game/core/clock.gd`, `apps/game/game/autoload/game_session.gd`,
  `apps/game/game/autoload/save_service.gd`,
  `apps/game/game/input/input_actions.gd`, `apps/game/game/input/intent_reader.gd`,
  `apps/game/game/input/intent_mapper.gd`, `apps/game/game/input/action_gate.gd`,
  tests under `apps/game/test/core/test_clock.gd`, `apps/game/test/game/test_game_session.gd`,
  `test_save_service.gd`, `test_intent_mapper.gd`, `test_action_gate.gd`
- Modify: `apps/game/project.godot` (autoloads `GameSession` and `SaveService`; input actions are registered at
  runtime by `InputActions.register()` so tests can rely on them)

**Interfaces:**
- Produces: `class_name Clock` (pure): `STEP_MS := 50`, `MAX_FRAME_MS := 250`, `MINUTES_PER_MS := 10.0 / 7000.0`;
  `static func advance(acc_ms: float, frame_ms: float) -> Dictionary` `{steps: int, acc_ms: float}` (port of
  `advanceAccumulator`); `static func minutes_for_step(minute_acc: float) -> Dictionary` `{whole: int, acc: float}`
  (adds `STEP_MS * MINUTES_PER_MS`, extracts whole minutes with the same `1e-9` epsilon as `loop.ts`).
- Produces: autoload `GameSession` (`extends Node`): `state: Dictionary`, `slot: int` (0 = none), `play_time_ms: int`,
  `screen: String` (`"title" | "game" | "paused" | "modal"`), signals `state_changed()`, `events(events: Array)`;
  `start(state, slot, play_time_ms)`, `dispatch(cmd: Dictionary) -> Array` (applies `ApplyCommand.apply`, stores,
  emits `events`, returns the events), `set_pose(x, z, facing)` (via `PlayerPose.with_pose`; emits no events),
  `clock_running() -> bool` (`screen == "game"`), `step(commands: Array, dt_ms: int)` (dispatches commands then the
  whole-minute `tick`, adds play time, only when `clock_running()`), `_process(delta)` driving `Clock.advance`.
- Produces: `InputActions.register()` creating InputMap actions with these defaults (spec §7.3 for movement and
  interact; tools follow Part 1): `move_left/right/up/down` (A/D/W/S + arrows; left stick), `run` (Shift; L3),
  `primary` (Space; gamepad A), `secondary` (F; gamepad X), `hotbar_1..8` (keys 1–8), `hotbar_next/prev` (mouse
  wheel; D-pad right/left), `menu` (Esc, Tab; Start), `confirm` (Enter, Space; A), `cancel` (Esc, Backspace; B).
- Produces: `IntentReader.read() -> Dictionary` (live `Input`; keys `move: Vector2, run, primary, secondary, hotbar:
  int (-1 none), cycle: int, menu`), `IntentMapper.to_commands(intents: Dictionary, state: Dictionary,
  gate: ActionGate, now_ms: int) -> Array` (port of `toCommands.ts` **minus** `move`: hotbar select, cycle, primary →
  `useTool` if `activeSlot <= 4` else `useItem` when `gate.allow`, secondary → `Interact.resolve_secondary`),
  `ActionGate` (`allow(pressed: bool, now_ms: int) -> bool`, 350 ms re-fire window; port `actionGate.ts`).
- Produces: autoload `SaveService`: `slots: SaveSlots`, `save_now() -> Error` (builds the file with
  `SaveMigrate.make_save_file(GameSession.state, GameSession.play_time_ms, <UTC ISO string from
  Time.get_datetime_string_from_system(true)>)`, writes to `GameSession.slot`, skips if the identical state was just
  saved), `install()` (connects `GameSession.events` `dayStarted` → `save_now`, and `NOTIFICATION_APPLICATION_FOCUS_OUT`
  / `WM_CLOSE_REQUEST` → `save_now`), `load_slot(slot) -> Dictionary` (the `SaveSlots.load_slot` result; on `ok`
  calls `GameSession.start`), `last_error: String`, signal `save_failed(message: String)`. On any save error it
  emits `save_failed("Couldn't save. Use Export save to keep your progress.")` (string from `Pause.tsx`), keeps
  playing, and never blocks or overwrites a `newer` slot (`force` is never passed).

- [ ] **Step 1: Write failing tests:** save: `test_autosave_on_day_started`, `test_save_skipped_when_state_identical`,
  `test_load_slot_starts_session`, `test_autosave_failure_keeps_playing` (slot folder blocked → `save_failed` emitted,
  `GameSession.screen` unchanged, old file intact), `test_newer_slot_is_not_overwritten_by_autosave`,
  `test_focus_out_saves`; clock: `test_advance_matches_ts` (cases from `loop.test.ts`: clamp at 250 ms,
  carries remainder), `test_minutes_accumulate_to_ten_per_seven_seconds` (140 steps → 10 minutes exactly);
  session: `test_dispatch_updates_state_and_emits_events`, `test_set_pose_changes_only_the_pose`,
  `test_step_ticks_the_calendar_while_game_screen`, `test_step_does_nothing_while_paused`,
  `test_menu_blocks_commands` (screen `modal` → `step` with a `useTool` command leaves state equal),
  `test_session_round_trip_in_lowmere` (state in Lowmere → `SaveMigrate.make_save_file`/`SaveSlots` → `start` →
  same location and lesson); mapper/gate: every branch of `toCommands.ts` (hotbar, cycle, primary for tool and item
  slots, secondary with and without an action, two intents in one step → at most the commands listed, order
  hotbar → cycle → primary → secondary), `test_gate_blocks_second_press_within_350ms`,
  `test_gate_releases_after_350ms`, `test_gate_needs_a_fresh_press`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.** `GameSession._process` must reuse one `Array` for commands (no per-frame allocation
  beyond what GDScript requires for command dictionaries).
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): game session, fixed-step clock, intents and autosave`).

### Task 9: Player controller, collision and player visual

**Files:**
- Create: `apps/game/game/world/collision_builder.gd`, `apps/game/game/player/player_controller.gd`,
  `apps/game/game/player/player_visual.gd`, `apps/game/test/game/test_collision_builder.gd`,
  `test_player_controller.gd`

**Interfaces:**
- Produces: `class_name CollisionBuilder`: `static func build(grid: Dictionary) -> StaticBody3D` (one `BoxShape3D`
  1 × 2 × 1 per blocked tile via `Grid.is_blocked`; adjacent blocked tiles in one row merge into one wider box;
  body on collision layer 1), `static func count_boxes(grid) -> int`.
- Produces: `class_name PlayerController extends CharacterBody3D`: radius 0.3 capsule, `move(intent: Vector2, run:
  bool, dt: float) -> void` using `PlayerPose.speed_for(GameSession.state, run)`; no gravity (y fixed 0); after each
  `move_and_slide` it calls `GameSession.set_pose(global_position.x, global_position.z, facing)` where `facing`
  comes from `PlayerPose.facing_of` only when moving; `teleport(x, z, facing)` (used on zone change and load, calls
  `PlayerPose.push_out_of_blocked`).
- Produces: `class_name PlayerVisual extends Node3D`: instances `ModelCatalog` `player`, plays `locomotion_clip`
  with `clip_rate` each frame, one-shot clips from `GameSession.events` via `PlayerClips.clip_for_event` (locomotion
  resumes after the one-shot), faces the facing direction (n = −z), and shows a blob shadow when
  `Tiers.TABLE[tier].blob_shadow` (a flat dark `QuadMesh` decal, radius 0.45).

- [ ] **Step 1: Write failing tests:** builder: `test_blocked_tiles_become_boxes` (house grid wall count),
  `test_adjacent_blocked_tiles_merge_per_row` (a 5-wide fence row → 1 box), `test_free_grid_has_no_boxes`;
  controller (physics frames via `await get_tree().physics_frame`): `test_walks_at_walk_speed` (2.6 m/s ±5%),
  `test_run_speed`, `test_exhausted_is_slower`, `test_blocked_by_fence` (cannot cross the farm fence),
  `test_slides_along_wall`, `test_pose_written_back_to_state`, `test_teleport_pushes_out_of_blocked_tile`,
  `test_pose_survives_save_load`; visual: `test_idle_when_still`, `test_walk_clip_when_moving`,
  `test_chop_clip_on_tool_used_event`, `test_blob_shadow_only_on_low`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): player controller, collision and animated farmer`).

### Task 10: Zone views: terrain, obstacles, features and the house

**Files:**
- Create: `apps/game/game/world/zone_view.gd`, `tile_visuals.gd`, `feature_visuals.gd`, `house_interior.gd`,
  `apps/game/test/game/test_zone_view.gd`, `test_house_interior.gd`

**Interfaces:**
- Produces: `class_name ZoneView extends Node3D`: `build(zone: String, state: Dictionary) -> void` (zones
  `"farm"`, `"house"`, `"lowmere"`: ground plane sized to the grid, one `Node3D` per non-grass tile in a dictionary
  keyed `Vector2i`), `sync(state: Dictionary) -> void` (compares each tile of the current grid with the last seen
  copy and updates **only changed** tiles; returns the number changed, for tests), `tile_node(x, y) -> Node3D`.
- Visual mapping (copy proportions from `TileModels.tsx`, `Features.tsx`, `HouseInterior.tsx`, `Furniture.tsx`):
  rock → `rock-1..3` and weed → `weed-1..2` by the same stable hash `floor(abs(sin(x*12.9 + z*78.2)) * 1000) % n`;
  stump → `stump`; fence → `fence` (fit width 1.02); `building` → the farmhouse as a box mass with roof (palette from
  `scene/palette.ts`); water → pond plane (flat blue, no shader in M1); bin, cart, bed, door, `farmGate`,
  `rootShrine` (stone plinth + 4 small boulders), `stove` (dark box with an emissive door), Lowmere buildings
  (`H`) as box facades with roofs and the doors `forgeDoor/clinicDoor/cottageDoor` as darker door boxes with a
  coloured lintel (forge red, clinic green, cottage yellow), `noticeBoard` (post + board); house walls as 0.7 m
  boxes (low so the camera sees inside) and the six furniture pieces at the positions of `Furniture.tsx`.
  `tilled` and `watered` soil is Task 11.
- Behavior: no tile node for plain `grass`/`path`; `sync` after `Tools.use_tool` clearing a weed frees exactly that
  node; zone change builds a new view and frees the old one.

- [ ] **Step 1: Write failing tests:** `test_build_farm_creates_nodes_for_obstacles_and_features` (counts equal the
  number of rock+weed+stump+fence+feature tiles of the state), `test_sync_updates_only_changed_tiles` (clear one weed
  → returns 1 and that node is freed, others untouched), `test_sync_is_noop_when_unchanged` (returns 0),
  `test_every_feature_has_a_visual` (each feature id in the three grids), `test_house_has_six_furniture_pieces`,
  `test_house_walls_are_low`, `test_lowmere_has_three_doors_and_a_board`, `test_stable_variant_hash` (same tile
  → same model across runs).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Use one `MultiMeshInstance3D` per model kind only if the draw-call budget in Task 17
  demands it; start with plain instances.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): zone views for the farm, house and Lowmere`).

### Task 11: Soil, crops and villagers in the world

**Files:**
- Create: `apps/game/game/world/crop_visuals.gd`, `villager_visuals.gd`, `apps/game/test/game/test_crop_visuals.gd`,
  `test_villager_visuals.gd`
- Modify: `game/world/zone_view.gd`

**Interfaces:**
- Produces: `class_name CropVisuals`: `static func model_for(crop: Dictionary) -> String` (port of
  `CropModels.tsx`: stage from `Crops.crop_stage` → `crop-sprout` / `crop-young` / the crop's mature model:
  turnip/potato/strawberry/eggplant → `crop-turnip` family as the TS file maps them, tomato → `crop-young` family
  as mapped, corn → `corn-a..d` by growth, melon → `crop-melon`, pumpkin → `crop-pumpkin`; read `CropModels.tsx`
  and copy its table exactly), `static func soil_color(tile: Dictionary) -> Color` (tilled dry = `#5a3d26`,
  watered darker `#4a3220`, from `kenneyColors.ts`), `static func scale_for(crop) -> float`.
- Produces: `class_name VillagerVisuals`: `static func spawn(parent: Node3D) -> void` (one `ModelCatalog` `player`
  instance per `Villagers.ALL` entry at `(x + 0.5, 0, y + 0.5)` facing its `facing`, each tinted to a distinct
  palette: Hilda red-brown, Aldous green, Fern yellow, Bram blue; idle clip; only in the `lowmere` view).
- `ZoneView.sync` handles tilled soil, watered tint and crop add/grow/die/harvest tile changes.

- [ ] **Step 1: Write failing tests:** `test_model_for_each_crop_and_stage` (a table pinned from the TS file: all
  8 crops × stages seed, sprout, young, mature), `test_soil_colors`, `test_sync_plants_and_grows_a_crop`
  (state with a planted turnip → one crop node; after `Crops.grow_crops` stage change the model key changes),
  `test_sync_removes_crop_on_harvest_or_death`, `test_watered_tile_is_darker`, `test_four_villagers_spawn_at_their_tiles`,
  `test_villagers_only_in_lowmere`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): soil, crops and villagers in the world views`).

### Task 12: Atmosphere: seasons, time of day and weather

**Files:**
- Create: `apps/game/core/atmosphere.gd`, `apps/game/game/world/atmosphere_driver.gd`,
  `apps/game/test/core/test_atmosphere.gd`, `apps/game/test/game/test_atmosphere_driver.gd`

**Interfaces:**
- Produces: `class_name Atmosphere` (pure): `SEASONS: Dictionary` with the proof's palette (`ground`, `foliage`,
  `sky`, `snow`) exactly as in `ethergrove-godot-proof/main.gd` `SEASONS`: spring ground `#5e7d3c` foliage (1,1,1)
  sky (0.55,0.75,0.92); summer `#6d7f3a` (1.05,1.0,0.82) (0.5,0.72,0.95); fall `#7d7434` (1.25,0.72,0.38)
  (0.75,0.72,0.65); winter (0.86,0.9,0.95) (0.75,0.8,0.82) (0.72,0.8,0.88) with `snow: true`;
  `static func night_factor(minute: int) -> float` (0 from 08:00 to 17:00, 1 from 21:00 to 05:00, linear between;
  minutes ≥ 1440 wrap), `static func sun_energy(minute, weather) -> float`, `static func rain_amount(weather) ->
  float` (rain 1.0, storm 1.6, else 0), `static func snow_amount(weather) -> float`.
- Produces: `class_name AtmosphereDriver extends Node3D` with child `WorldEnvironment`, `DirectionalLight3D`, two
  `GPUParticles3D` (rain, snow; amounts scaled by `Tiers.TABLE[tier].particles`), updated from `GameSession`
  `state_changed` (calendar season/minute, `weather.today`) and `Settings.tier_changed`; ground colour applied to the
  zone view's ground material through a `set_ground_color`; interiors (`house`) use a warm fixed light and no weather.

- [ ] **Step 1: Write failing tests:** pure: `test_night_factor_curve` (08:00 0, 12:00 0, 17:00 0, 19:00 ≈ 0.5, 21:00 1,
  02:00 1, 05:00 1, 06:30 ≈ 0.5, wraps at 1560), `test_season_table_values`, `test_rain_and_snow_amounts`;
  driver: `test_winter_enables_snow`, `test_rain_enables_rain_particles`, `test_tier_scales_particle_amount`
  (high amount > low amount), `test_house_has_no_weather`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): season palette, time of day and weather`).

### Task 13: Always-on HUD and toasts

**Files:**
- Create: `apps/game/game/ui/theme_factory.gd`, `hud.gd`, `clock_label.gd`, `gold_label.gd`, `energy_bar.gd`,
  `hotbar.gd`, `prompt.gd`, `toasts.gd`, `apps/game/test/game/test_hud.gd`

**Interfaces:**
- Produces: `class_name ThemeFactory`: `static func make(ui_scale: float) -> Theme` (base font size 18 × scale,
  button/panel styleboxes using the colours from `apps/web/src/ui/theme.css` tokens; focus outline always visible).
- Produces: `class_name Hud extends CanvasLayer` built in code: top-left clock (`Calendar.format_clock` plus
  `Calendar.weekday`, season and day, text format copied from `apps/web/src/ui/hud/Clock.tsx`), gold
  (`Gold.tsx`), energy bar (`Stamina.tsx`; label "Energy"), the eight-slot hotbar (`Hotbar.tsx`: five tool slots in
  `Balance.TOOL_ORDER`, three quick slots showing the pinned bag item and count; active slot highlighted), a prompt
  line (`Prompt.tsx`: uses `Interact.resolve_secondary` and the tile in front to show "F  <verb>" text copied from
  `Prompt.tsx`), and `Toasts` (stack of at most 3, 3 s each, `push(text, kind)`; `kind` ∈ `info/warn`). Reads state
  from `GameSession.state_changed`; never polls per frame. `Hud.refresh(state)` is public for tests.
- Event → toast mapping copied from `apps/web/src/ui/uiBridge.ts` (e.g. `actionFailed` reasons → the same strings).

- [ ] **Step 1: Write failing tests:** `test_clock_text_for_known_states` (three states incl. 26:00 pass-out hour),
  `test_gold_text`, `test_energy_bar_fraction_and_low_state` (≤ 20 → low style), `test_hotbar_marks_active_slot_and_counts`,
  `test_prompt_for_door_bin_bed_water_crop_and_none`, `test_toast_text_for_each_failed_reason` (all 11 `FailReason`s,
  strings pinned from `uiBridge.ts`), `test_toast_stack_limit_and_expiry`, `test_hud_does_not_rebuild_nodes_on_refresh`
  (node count unchanged across 50 refreshes), `test_theme_scales_font_with_ui_scale` (1.5 → 27).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.** Read each named web file first and copy its strings exactly.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): the heads-up display and toasts`).

### Task 14: Modal panels: bag, bin, cart, sleep, morning report, dialogue, pause

**Files:**
- Create: `apps/game/game/ui/panels/bag_panel.gd`, `bin_panel.gd`, `cart_panel.gd`, `sleep_confirm.gd`,
  `morning_report.gd`, `dialogue_box.gd`, `pause_menu.gd`, `panel_host.gd`,
  `apps/game/test/game/test_panels.gd`

**Interfaces:**
- Produces: `class_name PanelHost extends CanvasLayer`: `open(panel_id: String) -> void`, `close() -> void`,
  `is_open() -> bool`; opening sets `GameSession.screen = "modal"` (or `"paused"` for the pause menu) and closing
  restores `"game"`; `cancel` closes; focus goes to the first focusable control and wraps with keyboard/gamepad.
  It listens to `GameSession.events`: `openUi {ui: bin|cart|sleep}` opens the matching panel, `talked` opens the
  dialogue box with `text` and the villager `name`, `dayStarted` after a sleep opens the morning report from the
  preceding `shippingReport` event, `lessonsComplete` shows the completion toast (Task 15).
- Each panel emits commands only through `GameSession.dispatch`: bag → `moveBagItem`, `assignQuickSlot`; bin →
  `shipItem`, `unshipItem` (qty stepper 1..stack); cart → `buyItem` (lists `Economy.cart_stock`, price from
  `CropData.CROPS[..].seedCost`, disabled with the exact failure reason strings from `MerchantCart.tsx`); sleep →
  `sleep`; morning report → read-only; dialogue → none; pause → Resume, Graphics (Automatic/High/Medium/Low radios
  bound to `Settings.set_choice`), UI size (100/125/150%), Skip lessons / Restart lessons (`skipLessons` /
  `restartLessons`), Save now (`SaveService.save_now()`, Task 8), Export save (writes the current slot's
  `*.ethergrove.json`-shaped file to `user://exports/<name>.ethergrove.json` and toasts the path), Quit to title.
  All labels and messages are copied from `BagPanel.tsx`, `ShippingBin.tsx`, `MerchantCart.tsx`, `SleepConfirm.tsx`,
  `MorningReport.tsx`, `Pause.tsx`, `Settings.tsx`.

- [ ] **Step 1: Write failing tests** (panels instantiated under a `PanelHost`, `GameSession` started with
  `NewGame.create`): `test_open_sets_modal_and_close_restores_game`, `test_cancel_closes`, `test_pause_sets_paused`,
  `test_bag_move_dispatches_move_bag_item`, `test_bin_ship_and_unship`, `test_cart_buys_when_open_and_shows_reason_when_closed`
  (closed cart at 08:00, winter, storm; not enough gold; bag full), `test_sleep_confirm_dispatches_sleep_and_opens_morning_report`
  (report shows the shipped total), `test_dialogue_shows_name_and_text_then_closes_on_confirm`,
  `test_pause_graphics_radio_updates_settings`, `test_pause_skip_lessons`, `test_panel_open_blocks_commands`,
  `test_panels_are_keyboard_navigable` (focus moves with `ui_down` and activates with `ui_accept`),
  `test_panel_text_matches_web_strings` (every fixed label and message pinned).
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): modal panels and the pause menu`).

### Task 15: Tutorial UI

**Files:**
- Create: `apps/game/game/ui/lessons/lesson_text.gd`, `goal_card.gd`, `note_card.gd`, `lesson_marker.gd`,
  `apps/game/test/game/test_lesson_ui.gd`
- Modify: `game/ui/hud.gd` (mounts the cards)

**Interfaces:**
- Produces: `class_name LessonText` with `GOAL: Dictionary` (lesson id → text, plus the counted-lesson format) and
  `NOTE: Dictionary` (note id → text) copied **verbatim** from `apps/web/src/ui/lessons/lessonText.ts` and
  `hints.ts`; `GoalCard` (current lesson from `state.tutorial`, count/goal for `till`/`plant`, collapses/expands on
  `lessonStarted`/`lessonDone` events), `NoteCard` (shows on `noteShown`, dismiss with `confirm`/`cancel`, 8 s auto
  hide), `LessonMarker` (a pulsing ring `MeshInstance3D` at `Tutorial.lesson_target(state)` in world coordinates plus
  an off-screen arrow in the HUD when the target is outside the camera frame), completion toast "from
  `LessonsComplete.tsx`" with the gift. `Hud` shows a toast on `SaveService.save_failed` (autosave lives in Task 8).

- [ ] **Step 1: Write failing tests:** `test_goal_text_for_every_lesson` and `test_note_text_for_every_note` (all
  10 + 10 strings pinned), `test_goal_card_shows_count_for_till_and_plant`, `test_goal_card_hidden_when_lessons_off`,
  `test_note_card_shows_once_per_note`, `test_marker_follows_lesson_target`, `test_marker_hidden_when_no_target`,
  `test_save_failed_shows_toast`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): tutorial cards and lesson markers`).

### Task 16: Title, new game, slot picker and import

**Files:**
- Create: `apps/game/game/ui/screens/title_screen.gd`, `new_game_screen.gd`, `slot_screen.gd`, `import_dialog.gd`,
  `apps/game/test/game/test_screens.gd`

**Interfaces:**
- Produces: `TitleScreen` (buttons "Continue" (most recent non-corrupt slot), "New game", "Load game", "Import a
  save from the web game", "Quit"; text from `Title.tsx`; Continue disabled with no saves), `NewGameScreen` (farm
  name and player name `LineEdit`s with the defaults and limits from `NewGame.tsx`, "Grandpa's lessons" checkbox
  default on, "Start" → `NewGame.create({seed: randi(), farmName, playerName, lessons})`, picks the first free slot
  or asks which slot to overwrite), `SlotScreen` (three rows from `SaveSlots.list()`: summary, date, play time;
  states empty / ok / corrupt / **newer** ("Saved by a newer version of the game", no Load or overwrite action);
  Load, Delete (with confirm) per slot), `ImportDialog` (`FileDialog` filter `*.json`, reads the file text, calls
  `SaveSlots.import_text`; failures show `SaveSlots.IMPORT_FAILED_TEXT`, a full set of slots shows "All three save
  slots are full.", write failures show "Couldn't save the imported game."). Screens emit `start_game(slot)`.

- [ ] **Step 1: Write failing tests:** `test_continue_disabled_without_saves`, `test_continue_picks_latest_ok_slot`,
  `test_new_game_creates_state_with_names_and_lessons`, `test_new_game_rejects_empty_names` (default names applied),
  `test_slot_screen_states` (empty, ok, corrupt, newer: the newer row has no Load/overwrite button),
  `test_delete_needs_confirm`, `test_import_success_goes_to_slot_and_lists_it`,
  `test_import_invalid_shows_exact_text`, `test_import_full_slots_text`, `test_screens_are_keyboard_navigable`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement.** The import dialog uses the OS file dialog on desktop and is hidden on the Web build until
  Plan 5 wires the browser file input.
- [ ] **Step 4: Run** `pnpm game:test`. Expected: PASS.
- [ ] **Step 5: Handoff commit** (message `feat(game): title, new game, slot picker and web-save import`).

### Task 17: Main flow, zone switching and the playthrough check

**Files:**
- Create: `apps/game/boot/main.tscn` (replaces `boot.tscn` as the main scene; keep `boot.tscn` for the smoke
  script), `apps/game/game/world/world_root.gd`, `apps/game/tools/shot.gd`, `apps/game/tools/shot.sh`,
  `apps/game/test/smoke/smoke_playthrough.gd`, `apps/game/test/game/test_world_root.gd`
- Modify: `apps/game/project.godot` (main scene `res://boot/main.tscn`), `scripts/game.mjs` (a `playthrough` task
  running the new script, added to `pnpm game:smoke`), `scripts/game.test.mjs`, `package.json` (`game:shot`)

**Interfaces:**
- Produces: `class_name WorldRoot extends Node3D`: owns a `ZoneView`, `PlayerController`, `PlayerVisual`,
  `CameraRig`, `AtmosphereDriver`, `Hud`, `PanelHost`; on `GameSession.events` `locationChanged` it swaps the
  `ZoneView`, teleports the player to `state.player` and snaps the camera; applies `RenderApplier.apply` on start
  and on `Settings.tier_changed`; feeds `IntentReader` → `IntentMapper` → `GameSession.step` each fixed step and
  moves the player each physics frame; `Menu` intent toggles the pause menu.
- Produces: `main.tscn` flow: `Boot` → `TitleScreen` → (start) → `WorldRoot` → (quit to title) → `TitleScreen`.
- Produces: `tools/shot.gd` + `shot.sh` (non-headless, like the proof's `render.sh`): `pnpm game:shot -- scene=<farm|house|lowmere>
  tier=<low|medium|high> season=<spring|summer|fall|winter> out=<png>` loads a fresh game in that zone/season,
  renders a few frames and saves a 1280 × 720 PNG; used for the by-eye checks below.
- `smoke_playthrough.gd` (headless `SceneTree` script): `NewGame.create` (lessons on) → starts `WorldRoot` → drives
  `GameSession.dispatch` through the first lessons exactly like `fullYear` does (hoe, till 3, buy seeds, plant, water,
  sleep, harvest after growth days, ship, sell) → walks through the farm gate to Lowmere and talks to Hilda →
  saves to a temp slot → loads it → compares with `JsonNorm.first_diff` → prints `PLAYTHROUGH OK`, exit 0, 1 on any
  failure.

- [ ] **Step 1: Write failing tests:** `test_world_root_builds_farm_for_new_game`, `test_location_changed_swaps_zone`,
  `test_tier_change_reapplies_render_settings`, `test_menu_intent_opens_pause`, `test_player_spawns_on_free_tile_after_load`
  (a save with the player on a fence tile is pushed out), `test_smoke_playthrough` (runs the script's function and
  asserts `PLAYTHROUGH OK`); node: `scripts/game.test.mjs` gets `playthrough args` and `smoke runs both`.
- [ ] **Step 2: Run** `pnpm game:test`. Expected: FAIL.
- [ ] **Step 3: Implement** everything above.
- [ ] **Step 4: Run** `pnpm game:test`, `pnpm game:smoke`. Expected: PASS and `SMOKE OK` + `PLAYTHROUGH OK`.
- [ ] **Step 5 (by eye, required):** run `pnpm game:shot` for farm, house and lowmere × low, medium, high × spring
  and winter (12 PNGs into `apps/game/shots/`, git-ignored) and read them: the camera framing, the field, crops,
  fence, house, pond, Lowmere buildings, the four villagers, season colours, blob shadow only on Low; fix defects.
  Then play it for five minutes in a real window: run `/Applications/Godot.app/Contents/MacOS/Godot --path apps/game`,
  start a new game, do the first lessons, walk to Lowmere, talk to all four villagers, open every panel, change the
  graphics tier from the pause menu, sleep, quit to title, Continue. Report anything that feels wrong.
- [ ] **Step 6 (measure):** with the Godot profiler or `Performance` monitors report draw calls and FPS on the farm
  at Low, Medium and High (target: 60 fps at Low on this Mac; at most 2,000 draw calls). If over budget, switch the
  heavy tile kinds to `MultiMeshInstance3D` per model (the Task 10 note) and re-measure.
- [ ] **Step 7: Docs and handoff.** Update `AGENTS.md` (new commands `game:shot`, the world/session structure in one
  paragraph), `brain/MEMORY.md` (Plan 2 line), and the spec §8 (final `ORTHO_SIZE`); run `graphify update .`,
  `pnpm checks:commit` and the full `pnpm checks` (timeout ≥ 900000 ms). Post the AGENTS.md ready-to-push handoff
  for branch `feat/m1-plan2-world` with one `git add` listing every file of Tasks 1–17.
