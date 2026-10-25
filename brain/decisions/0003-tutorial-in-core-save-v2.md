# 0003 — Tutorial state lives in the core (save v2)

- **Status:** accepted · **Date:** 2026-10-25 · **Evidence:**
  `docs/superpowers/specs/2026-10-25-hearthvale-tutorial-design.md` §1.2, `packages/core/src/systems/tutorial.ts`,
  `packages/core/src/save/migrate.ts`

## Context

New players were lost. A web-only tutorial (like the old tips) would be per device, not per save, and
hard to test across multi-day steps.

## Decision

`GameState.tutorial` (`lesson`, `count`, `notesSeen`, `gifted`) is advanced by the pure
`advanceTutorial(prev, next, events)` after every command. The web layer only draws it. Save version
2 adds the field, and the v1 → v2 migration turns lessons off for existing players.

## Consequences

- Every save slot has its own lesson progress, and the rules are unit- and property-tested.
- Part 2A must move to save v3 and keep `tutorial` unchanged.
- The completion gift is paid once per save (`gifted`), fixed after review: restarts could farm gold.
