# CI a11y e2e timed out: the farm draws about 1.5 frames a second on SwiftShader

- **Date:** 2026-10-31 · **Status:** inferred (fix reproduced locally, not yet confirmed by a CI run) ·
  **Evidence:** CI runs `40931906444` (flaky), `41099646537` and `41099690144` (failed, with retry);
  `apps/web/e2e/a11y.spec.ts`, `apps/web/e2e/helpers.ts`

## Symptom

`a11y.spec.ts` › "pause, cart and bin" ran past CI's 90 s test timeout on Chromium shard 1/2: the first
attempt while waiting for the cart's Close button, the retry inside axe's `page.evaluate`. It was already flaky on
2026-10-29, before the audio PR, and failed both attempts after it.

## Root cause

The e2e configs render WebGL with SwiftShader. Measured on an M4 with CI settings, the farm draws about 1.5 frames a
second (about 7 with every render cost off via `?perf-off=all`). Playwright waits for frames before each click (the
"stable" check), so every action in a long UI test costs over a second. The 4-vCPU CI runner is several times
slower, so an action- and axe-heavy test sat near the 90 s budget, and extra CPU load tipped it over.

Reproduced locally by scaling the budget to the Mac's speed: `--timeout=20000` failed this test (21–28 s), as on CI.

## Fix

`boot()` and `newGame()` take `{ lean: true }`, which loads `/?perf-off=all`. The a11y specs use it, since axe
excludes the canvas anyway. The test now takes 7–10 s and passed 3/3 under the 20 s budget; the full e2e suite
passed on every project.

## Rule

UI-only e2e specs should boot `lean`. Specs that judge the 3D scene (visual baselines, rendering) must not.
