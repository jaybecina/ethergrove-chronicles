# 0018 — Steam is a release target

- **Status:** accepted; the Electron build is superseded by [[decisions/0019-godot-main-no-phones]] (Steam build is
  now the Godot export) · **Date:** 2026-11-03 · **Evidence:**
  `docs/superpowers/specs/2026-11-03-rootwake-arpg-story-design.md` §13.2

## Context

The owner wants Ethergrove on Steam, beside the web game (desktop and phones) and the Mac and Windows apps
([[decisions/0014-desktop-electron]]).

## Decision

- The Electron app in `apps/desktop` becomes the Steam build (Windows x64, macOS arm64 and x64). Steam Deck runs the
  Windows build through Proton; no native Linux build.
- A Steam build never updates itself: `updateMode` in `apps/desktop/src/policy.ts` must return `'off'` for it
  ([[decisions/0016-desktop-auto-update]] stays for the GitHub-released apps).
- Target Steam Deck Verified. Steam Cloud, achievements, the Steamworks binding and macOS signing are settled in the
  M6 Steam spec.

## Consequences

- The web build, Vercel and the phone app stay; Steam adds packaging and store work, not design.
- Saves live in IndexedDB, which Steam Cloud cannot sync well; the Steam spec must choose file saves or no Cloud at
  first.
