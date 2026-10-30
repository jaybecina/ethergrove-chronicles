# 0013 — Bake 2.5D backdrops in the browser with three-gpu-pathtracer

- **Status:** accepted · **Date:** 2026-10-31 · **Evidence:**
  `docs/superpowers/specs/2026-10-29-ethergrove-chronicles-design.md` §7, and a throwaway proof bake of the farm
  (noon and golden hour) shared with the owner

## Context

Spec §7 plans baked backdrops for the 2.5D look but named no tool. The owner found a hand-drawn mockup ugly and
asked which free tool makes beautiful 2.5D environments. Blender, Godot, Tiled, Higgsfield and other AI image
tools were raised.

## Decision

- Keep three.js `WebGLRenderer` for play. Bake backdrops offline with `three-gpu-pathtracer`'s
  `WebGPUPathTracer`, from the game's own CC0 models and camera, in a dev-only page driven by Playwright.
- The bake tool needs WebGPU and Playwright's full Chromium (`channel: 'chromium'`). Verified on an Apple M4:
  `WebGLPathTracer` fails shader validation on ANGLE Metal and loses every WebGL context, and the headless
  shell hangs on GPU readbacks.
- A camera that pans to follow the player needs an orthographic projection for one bake per area to stay
  correct (draft, confirmed by the renderer spec).

## Alternatives rejected

- Blender: a second tool and a GUI workflow, with no quality gain over baking the same models in the browser.
- Godot: a 5–9 MB web export limited to WebGL 2, and a full rewrite.
- Tiled and 2D tile editors: made for 2D sprite maps; the game is 3D.
- Higgsfield and other AI image tools: no matching depth image, inconsistent across areas and seasons, and
  outside the CC0-only rule ([[decisions/0004-original-ip-cc0-only]]). Fine for mood boards only.

## Consequences

- The renderer part (roadmap Part 3) builds the bake tool and the backdrop layer, after the frame-rate profile
  (spec §7.3).
- The proof's scene (box house, trees only outside the fence, flat tiles) limits the look more than the
  renderer does; the renderer spec covers scene dressing.
