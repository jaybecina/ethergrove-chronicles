# 0019 — Godot is the main engine; no phones or tablets

- **Status:** accepted (owner, 2026-11-03) · **Date:** 2026-11-03 · **Evidence:**
  `docs/superpowers/specs/2026-11-03-rootwake-arpg-story-design.md` §11.7, §13.3, §13.4

## Context

The ARPG spec (revision 3.1) left the engine open: the web game is React + three.js, with a throwaway Godot proof
for the asset board (F0 look kit). The owner then chose Godot, and asked to drop phones and tablets in favour of a
friendly message, since the game is built for keyboard and mouse or a gamepad.

## Decision

- **Godot is the main engine.** Three.js, react-three-fiber (35 files in `apps/web/src`) and the Electron app are
  retired once Godot reaches parity. Until then the current web game stays playable and gets no new ARPG features.
- **Phones and tablets are not supported.** They get a friendly message with "Copy link for my computer" and
  "Play anyway", with no data collected. Detection uses the input type (coarse pointer, no hover, small screen; an
  iPad reporting itself as a Mac), never screen size alone, so touch laptops, Chromebooks and Steam Deck are not
  blocked. A mobile app is a later, separate project. No phone layout, touch control or phone test is built.
- **Steam build:** the Godot desktop export, not Electron. It contains no self-update code.

## Alternatives rejected

- Stay on three.js and Electron (ChatGPT's recommendation): one working codebase, but the owner wants Godot's
  rendering for the F0 look.
- Keep phones with a Godot web build: iOS Safari memory limits and the Compatibility renderer make it a poor fit.

## Consequences

- **Reverses** [[decisions/0013-baked-backdrops-in-the-browser]] and [[decisions/0014-desktop-electron]] on the
  Godot port (they rejected it for losing `packages/core` and its tests, and for the web size). Those costs are now
  accepted. **Supersedes** the Electron part of [[decisions/0018-steam-release-target]].
- `packages/core` cannot run in Godot. The M1 spec must settle the port (GDScript, with the TypeScript tests and
  save fixtures kept as the reference) before any rule is rebuilt.
- The web build is Godot's web export on Vercel: cross-origin isolation headers (or the single-threaded export),
  the Compatibility renderer instead of Forward+, built in CI or locally. Audio `.m4a` needs a Godot-importable
  format; GDScript over C# for web. All checked in the M1 spec.
- The `AGENTS.md` touch and phone rules stay for the current web game only, until it is retired.
