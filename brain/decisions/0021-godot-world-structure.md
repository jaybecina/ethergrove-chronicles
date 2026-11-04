# 0021 — The Godot world is built in code from one live state

- **Status:** accepted (M1 Plan 2, built on `feat/m1-plan2-world`) · **Date:** 2026-11-04 · **Evidence:**
  `docs/superpowers/plans/2026-11-03-m1-plan2-world-playable.md`; `apps/game/game/world/world_root.gd`,
  `apps/game/game/autoload/game_session.gd`; `test/game/test_world_root.gd`, `test/smoke/smoke_playthrough.gd`

## Context

Plan 2 makes the GDScript core playable: farm, house, Lowmere, HUD, panels, saves and graphics tiers. The web game
keeps its state in a Zustand store and redraws from it; Godot needed an equivalent that stays testable headless and
cheap per frame.

## Decision

- **Views are built in code**, not authored as `.tscn` trees: `WorldRoot` composes `ZoneView`, the
  `CollisionBuilder` walls, `PlayerController` + `PlayerVisual`, `CameraRig`, `AtmosphereDriver`, `LessonMarker`,
  `Hud` and `PanelHost`. The only scenes are `boot/main.tscn` (the flow) and `boot/boot.tscn` (the boot smoke).
- **`GameSession` owns the live, mutable state.** Nothing caches `state` or a sub-dictionary or compares by
  reference; views re-read it. A dispatch replaces `state` and emits `state_changed` and `events`; the player body
  writes its pose in place every frame (`set_pose`, no signal).
- **Views sync on `state_changed`, never per frame.** A location different from the zone on screen rebuilds the
  zone (view, walls, teleport, camera snap, atmosphere) inside that signal, before the next physics frame.
- **One fixed 50 ms step**, driven by `GameSession._process` (poll intents, `IntentMapper`, dispatch, tick). The
  world never drives steps; it only feeds the body the held move/run input while the screen is `game`.
- **Graphics tiers are data** (`Tiers.TABLE`) applied by `RenderApplier`; a per-tier cost is a new column, not an
  `if tier == …`.
- **Every node takes injected `session` / `settings` / `save_service`**, so GUT, the playthrough smoke and
  `tools/shot.gd` run on their own instances and temporary `user://` folders.

## Alternatives rejected

- Authored scenes per zone: zones come from grids in the state; a scene per zone would duplicate the layouts.
- Per-frame diffing of the state: the farm grid is 768 tiles; comparing it every frame costs for nothing.
- A second step driver in the world: two drivers would double the clock.

## Consequences

- By-eye checks need a real window: `pnpm game:shot` (and `apps/game/tools/shot.sh`) renders PNGs to read.
- Tuned by eye in Task 17: `CameraMath.ORTHO_SIZE` 23 (house 10), High DoF from 38 m, volumetric fog 0.004,
  winter grass as vertex colours (not a material multiply), a grass apron around outdoor zones.
