# CI Chromium e2e timed out with 2 workers

- **Date:** 2026-10-26 · **Status:** inferred (fix not yet confirmed by a CI run) · **Evidence:** CI run
  `40274395118` (commit `e0ace98`), last green run `40104876187` (`4974dad`), `apps/web/playwright.config.ts`

## Symptom

The first PR run of the new CI: `E2E (chromium)` took 14 min with 3 failed and 2 flaky tests, all of them
timeouts (test budget exceeded, context setup or teardown over 90 s, goal cards missing after 15 s).
`E2E (webkit)` passed the same suite in 2m 45s. `pause, cart and bin` had passed on CI on 2026-10-24.
Locally, even 5 Chromium workers on a 10-core Mac passed every test.

## Root cause (inferred)

`workers: 2` (decision 0008) also applied on CI. Chromium renders WebGL in software (SwiftShader) there,
and two such browsers plus the Vite dev server overloaded the 4-vCPU runner. Every test ran 3–5× slower
than on the last green run, which used 1 worker, so tests ran out of time wherever they happened to be.
Not proven: GitHub job logs need admin rights, and the Mac is too fast to reproduce it.

## Fix

On GitHub Actions: 1 worker per job (Playwright's own CI advice), with Chromium split into two shards
(`--shard`, and `fullyParallel` on CI so shards split by test). Locally: still 2 workers.

## Rule

Measure parallelism on the CI runner, not on the dev machine. Software WebGL is CPU-bound, and a fast Mac
hides contention that a 4-vCPU runner cannot absorb.
