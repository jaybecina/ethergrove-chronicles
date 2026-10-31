# Plan: Desktop App and Lowest Graphics Tier

**Spec:** `docs/superpowers/specs/2026-10-31-ethergrove-desktop-design.md` · **Branch:** `feat/desktop-app`

Each task is test first: write or extend the test, watch it fail, implement, watch it pass.

## Task 1 — Lowest tier rules (`apps/web/src/render/quality.ts`)

1. `quality.test.ts`: the tier table of spec §4.1; `isWeakGpu` true for "ANGLE (Google, Vulkan 1.3.0
   (SwiftShader Device (Subzero)))", "llvmpipe (LLVM 15.0.7, 256 bits)", "ANGLE (Intel, Intel(R) UHD Graphics 620
   Direct3D11 vs_5_0 ps_5_0, D3D11)", "Microsoft Basic Render Driver"; false for "ANGLE (Apple, ANGLE Metal
   Renderer: Apple M1, Unspecified Version)", "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics …)", "ANGLE (NVIDIA,
   NVIDIA GeForce GTX 1650 …)"; `pickInitialTier` returns `'lite'` for a weak renderer on a desktop;
   `stepDown`: high → low → lite → lite.
2. Implement `QualityTier`, `TierSettings`, `QUALITY`, `isWeakGpu`, `stepDown`, `pickInitialTier({ renderer })`
   and `detectTier` reading `WEBGL_debug_renderer_info` (`UNMASKED_RENDERER_WEBGL`, falling back to
   `RENDERER`).

## Task 2 — Lowest tier rendering

1. `weatherVisuals.test.ts`: lite counts rain 1200, storm 1800, snow 600. Implement `COUNTS.*.lite`.
2. `PostFX.tsx` lite branch; `SunLight.tsx` `castShadow={QUALITY[tier].shadows}`; `GameCanvas.tsx` `onDecline`
   uses `stepDown(gameStore.getState().autoTier)` and `detectTier(gl)` gets the renderer.
3. `store.ts`: `Settings.quality: 'auto' | QualityTier`.

## Task 3 — Settings radio and desktop fallback wording

1. `menuIntents.test.tsx`: the "Lowest (older or built-in graphics)" radio sets `quality: 'lite'`.
2. `resilience.test.tsx`: `isDesktopApp`, and `WebGLFallback` with a desktop user agent shows spec §4.5 text.
3. Implement `Settings.tsx`, `render/webgl.ts` `isDesktopApp`, `WebGLFallback.tsx` (`desktop` prop defaulting
   to `isDesktopApp(navigator.userAgent)`).

## Task 4 — Desktop package skeleton

1. `apps/desktop/package.json`, `tsconfig.json`, `.gitignore` entries, ESLint globals and ignores for
   `apps/desktop` (Electron 44 downloads its binary on first run, so no pnpm build-script setting).
2. `policy.test.ts` first, then `policy.ts` (spec §3.3 rules).
3. `main.ts` wiring; `scripts/copy-web.mjs`; root scripts `desktop:dev`, `desktop:mac`, `desktop:win`.

## Task 5 — Smoke test and packaging

1. `e2e/app.spec.ts` with `_electron` (spec §5); run it against the unpackaged app (`electron .`).
2. `build/icon.svg` → `build/icon.png`; `electron-builder.config.mjs` (spec §3.4); `pnpm desktop:mac`; check the
   packaged arm64 app over CDP and with `codesign --verify --deep --strict`.
3. Try `pnpm desktop:win` on macOS; if it needs Wine, rely on `desktop.yml` and say so.

## Task 6 — Guard, CI, docs

1. `scripts/testGuard.mjs` desktop area + `scripts/testGuard.test.mjs`.
2. `.github/workflows/desktop.yml` (`ci.yml` is unchanged).
3. README "Desktop app", AGENTS.md commands and architecture, `brain/decisions/0014-desktop-electron.md`,
   `brain/MEMORY.md` open thread.
4. `pnpm checks:commit`, the touched e2e specs, `graphify update .`, final review.
