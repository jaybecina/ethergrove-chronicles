# Test output, not tests, was the agent token cost

- **Status:** verified · **Date:** 2026-11-04 · **Evidence:** `scripts/game.mjs` (`passSummary`, `gutSelection`),
  `scripts/game.test.mjs`, `package.json` (`test:scripts`)

## Symptom

Agent sessions felt expensive every time they ran tests, and the owner suspected the every-change-ships-a-test
rule ([[decisions/0007-every-change-ships-a-test]]).

## Cause

Running a test costs no tokens; only its printed output lands in the agent's context. Measured on a passing
tree: `pnpm game:test` printed 57,667 bytes (1,459 lines, ~15k tokens: Godot's import progress, every test
name, and the expected `push_error` backtraces of the "error is loud" tests). `pnpm test:scripts` printed
4,646 bytes. Vitest (1,917) and `pnpm checks:commit` (386) were already small. There was also no way to run
one GUT script, so every Godot check ran all 930 tests. The test guard itself runs on the owner's commit and
costs agents nothing.

## Fix

- A passing Godot run prints only GUT's totals or the smoke OK line (166 and 24 bytes); a failure prints the
  full log and the reason. `GAME_VERBOSE=1` restores the full log.
- `pnpm game:test -- test/core/test_crops.gd …` runs only those scripts and expects exactly that many.
- `test:scripts` uses the dot reporter (70 bytes on a pass; failures still print in full).
- `AGENTS.md`: keep quiet reporters, use `--reporter=line` for Playwright, and run each check once per state
  of the code (no re-runs of a pass a subagent or hook already did).

## Rule

Before blaming a safety rule for token cost, measure the bytes each command prints. Make passing runs print
a summary and failing runs print everything; that saves tokens without weakening any check.
