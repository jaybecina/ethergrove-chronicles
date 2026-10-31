# 0015 — Low / Medium / High graphics presets, Automatic starts on Medium

- **Status:** accepted · **Date:** 2026-10-31 · **Evidence:**
  `docs/superpowers/specs/2026-10-31-graphics-presets-design.md`, `render/quality.test.ts`, `game/store.test.ts`

## Context

The owner wants a lower graphics setting, not a lower-quality game: Low for reach, Medium as the recommended
default, High for stronger GPUs. The game had `high`, `low` (Battery saver) and `lite` (Lowest), and Automatic
could start strong GPUs on High. The frame-rate profile showed grass and particles cost nothing measurable.

## Decision

- Tier ids become `low | medium | high` (Low = old `lite`, Medium = old `low`). Saved settings carry
  `settingsVersion: 2`, and `migrateSettings` maps the old ids once on load.
- Automatic picks Low for weak GPUs and Medium for everything else; High is only ever the player's choice.
- Vegetation (grass, bush scatter) and crop sway vary per preset as **look** choices, not speed savings. Low gets a
  blob shadow under the player because it has no shadow map. Models are identical on every preset.

## Alternatives rejected

- Relabel only, keep the old ids: no migration, but `'low'` would mean Medium forever.
- LOD meshes for crops and characters: new assets for no measured gain.

## Consequences

- Players whose GPUs used to start on High under Automatic now start on Medium (intended).
- Path-traced photo mode and desktop auto-update are separate specs.
