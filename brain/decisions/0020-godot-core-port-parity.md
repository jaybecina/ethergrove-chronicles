# 0020 — The core is ported to GDScript; parity is proved by recorded fixtures

- **Status:** accepted (M1 Plan 1, built on `feat/m1-godot-core-port`) · **Date:** 2026-11-03 · **Evidence:**
  `docs/superpowers/specs/2026-11-03-m1-vertical-slice-design.md` §4, §5;
  `docs/superpowers/plans/2026-11-03-m1-plan1-godot-core-port.md`

## Context

[[decisions/0019-godot-main-no-phones]] made Godot the main engine, so `packages/core` cannot run as it is. The
web game stays playable until Godot reaches parity, and its rules are tested and trusted. The port must not
silently drift from them.

## Decision

- **The core is ported to GDScript** in `apps/game/core/`, with the same keys as TypeScript v2, plus the v3 changes (energy replaces stamina; new M1 keys).
- **TypeScript stays the reference** until the web game retires.
- **Parity is proved by fixtures.** A Vitest file (`packages/core/test/parity`, run by `parityFixtures.test.ts`,
  `pnpm game:fixtures`) records scenarios from the TypeScript core into `apps/game/test/fixtures/` (23 files).
  GUT replays them through the GDScript core and compares states and events.
- **Until retirement, any Part 1 rule change lands in both.** A TypeScript rule change that the recorded
  scenarios exercise fails the freshness test; re-record with `pnpm game:fixtures` and fix the port.
- **Save version 3 lives only in Godot.** Web saves stay version 2 and reach Godot through the web game's
  "Export save file" (import migrates 2 to 3). The parity fixtures stay at version 2 and are migrated in the test.
- **Godot's JSON parser reads some doubles about 1 ulp off**, so `rng.json` is checked through the integer
  numerator, not the float. Other numbers are compared with `JsonNorm.first_diff`, which treats `1` and `1.0` alike.

## Alternatives rejected

- Run the TypeScript core inside Godot (a JS engine or web export bridge): extra runtime, no native saves.
- Port without recorded fixtures (hand-written expected values): drift would go unnoticed.

## Consequences

- Two implementations of the Part 1 rules exist until the web game is retired; every rule change costs twice.
- Fixtures are committed and are regenerated with `pnpm game:fixtures`; never edit one by hand.
- Windows rename-over atomicity for save slots is unverified (check before the Windows export ships).
