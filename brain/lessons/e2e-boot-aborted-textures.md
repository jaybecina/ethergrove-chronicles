# "GLTFLoader: Couldn't load texture" in e2e runs

- **Date:** 2026-10-25 · **Status:** verified (by timing correlation and the fix removing it) ·
  **Evidence:** `apps/web/e2e/helpers.ts` `boot()`, commit `778024a`

## Symptom

In 3 of 4 full runs, Chromium logged 26–31 texture-load errors. Isolated runs, early-close probes,
reload probes and CPU throttling all showed 0.

## Root cause

`boot()` opened the real game only to clear storage, then reloaded. When that reload landed while the
throwaway page was still fetching model textures, the browser aborted the fetches, and GLTFLoader logged
each one. Every error burst came less than 2 s before the next page's canvas started.

## Fix

Clear storage on a blank same-origin page that Playwright serves (`page.route`), then load the game once.
Each test also boots about 20 s faster.

## Rule

Test setup must not load the app and then throw it away. Prefer a blank page for storage resets.
