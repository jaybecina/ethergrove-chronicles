# 0014 — Ship macOS and Windows apps with Electron; keep the web build and three.js

- **Status:** accepted · **Date:** 2026-10-31 · **Evidence:**
  `docs/superpowers/specs/2026-10-31-ethergrove-desktop-design.md` §2, the packaged arm64 app checked over CDP
  (title screen on ANGLE Metal, no console errors) and `codesign --verify --deep --strict`

## Context

The owner wants an installable game for macOS (down to an M1 MacBook Air) and Windows on low-end GPUs, and
brought a ChatGPT review proposing Electron or Tauri, a Godot comparison, Low/Medium/High presets and a path
tracer cut. Most of its browser advice was already built (WebGL 2 check and fallback, context loss, quality
tiers, frame profile), and the path tracer was never in gameplay ([[decisions/0013-baked-backdrops-in-the-browser]]).

## Decision

- **Electron 44 + electron-builder** wrap the unchanged `apps/web` build in `apps/desktop`: `.dmg` for arm64
  and x64, an NSIS `.exe` for x64. The game is served from `app://ethergrove/` with a strict CSP; no preload, no
  IPC; hardening fuses on.
- **Keep the web build and the Vercel deploy.** One codebase ships to both; the web build is the demo and the
  base for phones (roadmap Part 9).
- **A Lowest graphics tier** (`lite`): pixel ratio 1, no shadow map, no bloom, fewer particles, following the
  frame profile's biggest costs. Automatic picks it for software renderers and older Intel / phone GPUs.

## Alternatives rejected

- **Tauri:** the system web view (WKWebView on macOS, WebView2 on Windows) would run a different engine per OS
  from the Chromium we test. Smaller download (~10 MB vs ~130 MB), not worth the inconsistency.
- **Godot comparison or port:** already rejected in 0013; it throws away `packages/core` and its tests, and the
  profile shows the frame cost is our post-processing chain, not three.js.
- **WebGPU for play:** less available than WebGL 2 on low-end Windows drivers.
- **`--ignore-gpu-blocklist`:** would let blocklisted drivers try WebGL but can crash them; revisit only with
  player reports.
- **Telemetry:** needs a server, a privacy policy and consent; out of scope until early access.

## Consequences

- Unsigned builds warn on first open until the owner buys an Apple Developer ID and a Windows signing
  certificate; the config signs and notarises when those secrets are set.
- Saves made in the browser don't move to the desktop app by themselves; players use Export / Import.
- Not yet measured on a real low-end Windows laptop or an M1 Air; the Lowest tier's numbers come from the M4
  profile.
