# 0001 — Pure, deterministic rules core

- **Status:** accepted · **Date:** 2026-10-23 · **Evidence:** `packages/core/src/applyCommand.ts`,
  `eslint.config.js` (no-restricted-imports/globals for `packages/core/src/**`), `docs/ARCHITECTURE.md`

## Context

The game needs reproducible rules for tests (property tests, a scripted full-year bot) and a future
React Native/Expo shell that can reuse them.

## Decision

All game rules are `applyCommand(state, cmd) → { state, events }` in `packages/core`, with no DOM, React or
three.js (ESLint enforces it). Randomness comes only from the seeded RNG in `state.rng`. Post-passes run
in a fixed order: dispatch → `prunePins` → `checkMilestones` → `advanceTutorial`.

## Consequences

- The same seed and commands always give the same game, so bugs replay from a command list.
- The web app must never mutate game state directly; it dispatches commands (the e2e debug hook's
  `replaceGame` is the only test-only exception).
