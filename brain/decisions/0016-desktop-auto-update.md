# 0016 — Desktop auto-update from tag-triggered GitHub Releases

- **Status:** accepted · **Date:** 2026-10-31 · **Evidence:**
  `docs/superpowers/specs/2026-10-31-desktop-auto-update-design.md`, `apps/desktop/src/updater.test.ts`,
  `scripts/releaseTag.test.mjs`. No real update has run yet; the spec's first-release checklist verifies it.

## Context

The owner wants installed desktop apps to update themselves. The repository is public. The owner has no Apple
Developer ID yet and will buy one once the app is further along.

## Decision

- Pushing a tag `v<version>` that matches `apps/desktop/package.json` and sits on `main` publishes a GitHub Release
  (draft first, published only when both OS builds pass). The app reads it with `electron-updater` 6.8.10.
- Windows and a Developer ID signed Mac install in the background and finish on quit. An unsigned Mac shows a
  dialog that opens the release page, because macOS refuses to replace an unsigned app. The build records which
  case it is in `ethergroveMacSigned`, so adding the signing secrets later needs no code change.
- The game is never restarted to install, so no save is lost.

## Alternatives rejected

- A release on every merge to `main`: half-finished work would reach players, and every small merge bumps the version.
- A pull request as the update feed: it holds no downloadable installers.
- A private feed: it needs a token inside the shipped app.

## Consequences

- Copies of 0.1.0 have no updater; the first updater version is installed by hand once.
- The update check is the app's first network request. It goes only to GitHub and fails silently offline.
- Windows installers stay unsigned, so SmartScreen warns on the first manual install only.
