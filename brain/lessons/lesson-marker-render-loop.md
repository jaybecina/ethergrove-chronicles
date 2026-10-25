# Lesson marker crashed the canvas, then made a visual test flaky

- **Date:** 2026-10-25 · **Status:** verified · **Evidence:** `apps/web/src/scene/useLessonTarget.ts`,
  `apps/web/src/scene/useLessonTarget.test.tsx`, commit `3d7e358`

## Symptom

1. "The farm view stopped working": React reported _getSnapshot should be cached_ and _Maximum update depth
   exceeded_ inside R3F.
2. After that fix, the pause/cart visual test failed about 1 run in 3 on a cold start. The same test on
   `main` passed 3 of 3.

## Root cause

1. A Zustand selector returned a new object (`lessonTarget(s.game)`) on every read, so React re-rendered
   forever.
2. The component then selected all of `s.game` (which changes every 50 ms step) and the whole R3F store
   (`useThree()` with no selector). It re-rendered 20 times a second even when it drew nothing. Found by
   removing pieces one at a time against `main`.

## Fix

The selector returns a primitive string key (`location:x:y`) and parses it in `useMemo`.
`useThree((s) => s.camera)` and `useThree((s) => s.size)` are scoped.

## Rule

Selectors return primitives or stable references. Components inside the canvas never subscribe to the whole
game state or the whole R3F store. A "does not re-render when the game ticks" test pins this.
