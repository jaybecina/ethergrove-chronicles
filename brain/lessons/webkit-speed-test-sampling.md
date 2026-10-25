# WebKit speed test read 40% high on Linux CI

- **Date:** 2026-10-24 · **Status:** verified · **Evidence:** `apps/web/e2e/movement.spec.ts`, commit `4974dad`

## Symptom

On CI WebKit, walking measured 3.64 tiles/s (expected 2.6) and running 5.52 (expected 4.6). It could not
be reproduced on macOS, even with 6× CPU throttling.

## Root cause

The test read `player.x` and the simulated play time in two separate `page.evaluate` calls. On CI's
software-rendered WebKit, a frame of about 250 ms could run between the two reads, so the measured time
window came out short.

## Fix

Read both values in one `evaluate` call (JavaScript is single-threaded, so no frame can run between them),
and start timing only once the farmer is moving.

## Rule

Values compared in a timing assertion must be read atomically. Measure against simulated time, never
wall-clock time.
