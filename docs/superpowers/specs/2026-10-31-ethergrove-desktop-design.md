# Ethergrove Chronicles: Desktop App and Lowest Graphics Tier

**Status:** accepted by the owner's request · **Date:** 2026-10-31 · **Author:** Jay Becina (with Claude) ·
**Builds on:** Part 1, the frame-rate profile (`docs/perf/2026-10-31-frame-rate-profile.md`) and
[[decisions/0013-baked-backdrops-in-the-browser]] · **Branch:** `feat/desktop-app`

The owner wants a downloadable, installable game for macOS (Apple Silicon, including an M1 MacBook Air) and
Windows, playable on low-end GPUs. The owner brought a ChatGPT review and asked us to apply only what holds
up against the code. §2 checks every recommendation; §3–§5 are what this part builds.

---

## 1. Goal and success criteria

1. `pnpm desktop:mac` builds `Ethergrove-Chronicles-<version>-mac-arm64.dmg` and `…-mac-x64.dmg` on a Mac.
   The arm64 app opens on Apple Silicon, shows the title screen, and plays the same game as the browser.
2. `pnpm desktop:win` builds `Ethergrove-Chronicles-<version>-win-x64.exe`, an NSIS installer that installs
   per user, with Start-menu and desktop shortcuts. The GitHub workflow `desktop.yml` builds it on a Windows
   runner too.
3. Saves and settings persist across restarts of the desktop app, and the app runs fully offline.
4. A new **Lowest** graphics tier makes the game playable on weak GPUs (integrated Intel graphics, software
   renderers). Automatic quality picks it for software and old Intel GPUs, and steps down to it when the
   frame rate stays low.
5. The desktop app follows the Electron security checklist (§3.3).
6. Every change ships with tests; the desktop app has a Playwright smoke test that boots the real app.

## 2. The review, checked against the code

| ChatGPT recommendation | What the code says | Verdict |
| --- | --- | --- |
| "Chrome can't play WebGL, so few players will play" | WebGL 2 runs in every current Chrome, Edge, Firefox and Safari on hardware made in the last decade. The game already checks it (`render/webgl.ts` `hasWebGL2`) and shows `WebGLFallback`. | Wrong premise. Nothing to build. |
| Stop using the path tracer during gameplay | `three-gpu-pathtracer` is not a dependency. Decision 0013 plans it only for **offline** backdrop bakes; play uses `WebGLRenderer`. | Already true. |
| WebGL 2 check and a compatibility screen | Built: `hasWebGL2` + `WebGLFallback`. | Already built. The desktop app gets its own wording (§4.5). |
| Handle context loss and restore | Built: `installContextLoss` pauses behind "Restoring graphics" and remounts the canvas. | Already built. |
| Low / Medium / High presets | Built: Automatic, High, Battery saver, plus `PerformanceMonitor` drop to Low. Gap: Low still runs bloom, SMAA, a 1024 shadow map and pixel ratio 1.5, too heavy for weak GPUs. | **Build the Lowest tier (§4).** |
| Measure before optimising | Built: `perf:frames` and the 2026-10-31 profile. It shows post-processing is ~80% of a frame, pixel ratio 2→1 saves 65%, shadows ~20%, grass and particles ~0. | Already done; §4 follows its numbers. |
| Package with Electron or Tauri | Not built. | **Build with Electron (§3).** Tauri uses the system web view (WKWebView, WebView2), so the game would run on a different engine per OS from the Chromium we test. Electron bundles the same Chromium everywhere. Cost: a ~100 MB download instead of ~10 MB. |
| Build a Godot comparison before Part 4 | Decision 0013 already rejected Godot (a rewrite). `packages/core` (pure TypeScript rules, 79 test files) would be thrown away. The profile shows frame cost is our post-processing chain, not three.js. | **Rejected.** |
| Try WebGPU | Not needed for play; WebGPU on low-end Windows drivers is less available than WebGL 2. | Rejected for play (the offline bake already uses it). |
| Privacy-conscious telemetry (FPS, init failures) | Needs a server, a privacy policy and consent UI. | **Out of scope.** Revisit before early access. |
| Sell on Steam / itch.io; storefront handles payment | True: a premium single-player game needs no payment code. Steam Direct charges US$100 per game; itch.io lets the developer set its revenue share. | **No code.** Documented in §6. |
| Signing and notarisation for direct downloads | True. Unsigned builds work but warn (§3.5). | **Supported by config,** turned on by the owner's certificates. |

## 3. Desktop app (`apps/desktop`)

### 3.1 Stack and versions (exact, `save-exact`)

- `electron` **44.10.1** (latest patch of the supported 44 line; 45.0.0 is 10 days old).
- `electron-builder` **26.17.0** (released 2026-09-26).
- `typescript`, `vitest`, `@playwright/test` and `@types/node` at the versions the repo already pins.
- Electron 44 has no install script: it downloads its binary the first time it runs (`node_modules/electron`
  `index.js`). So `pnpm install` stays fast and the web CI jobs never download it; no pnpm build-script
  setting is needed. (`pnpm install` warns that `electron-winstaller`'s script was ignored; that is the
  Squirrel tool, unused because we build NSIS.)

### 3.2 Layout

```
apps/desktop/
  package.json            name "desktop", productName "Ethergrove Chronicles", version = apps/web version
  tsconfig.json           NodeNext ESM, emits to dist/
  electron-builder.config.mjs   targets, fuses, signing (§3.4); `builderConfig(env)` is unit tested
  build/icon.svg          original icon source (CC0 rule: our own art)
  build/icon.png          1024 × 1024, rendered from icon.svg by scripts/render-icon.mjs
  scripts/copy-web.mjs    copies apps/web/dist → apps/desktop/web without *.map files
  src/policy.ts           pure rules: URL → file, MIME types, CSP, navigation and permission policy
  src/main.ts             Electron wiring only
  src/policy.test.ts      unit tests (Vitest)
  src/builderConfig.test.ts   packaging config tests (Vitest)
  e2e/app.spec.ts         Playwright `_electron` smoke test of the unpackaged app
  e2e/tsconfig.json       adds the DOM types for code that runs in the page
  playwright.config.ts
```

`apps/desktop/web/`, `dist/` and `release/` are gitignored.

### 3.3 Main process (exact behaviour)

- **Origin.** The game loads from `app://ethergrove/`. `app` is registered with
  `protocol.registerSchemesAsPrivileged` as `standard`, `secure`, `supportFetchAPI`, `corsEnabled` and
  `codeCache`, so IndexedDB and localStorage work and persist in Electron's `userData` folder. No `file://`.
- **Serving.** `protocol.handle('app')` maps `app://ethergrove/<path>` to `<appPath>/web/<path>` via
  `resolveAppPath`: `/` → `index.html`; the host must be `ethergrove`; the path is URL-decoded and normalised
  and must stay inside `web/` (else 404). Responses carry the MIME type from `mimeFor`, `X-Content-Type-Options:
  nosniff` and this CSP:

  ```
  default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self' data: blob:;
  font-src 'self' data:; worker-src 'self' blob:; object-src 'none'; base-uri 'none';
  form-action 'none'; frame-ancestors 'none'
  ```

  (`wasm-unsafe-eval` is for the meshopt glTF decoder; `unsafe-inline` styles only, never scripts.)
- **Window.** 1280 × 800, minimum 960 × 600, title "Ethergrove Chronicles", background `#1d2a1f`, shown on
  `ready-to-show`. `webPreferences`: `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`,
  `webSecurity: true`, `spellcheck: false`, `devTools: !app.isPackaged`. No preload, no IPC.
- **Navigation.** `will-navigate` and `will-redirect` are cancelled unless the target's origin is
  `app://ethergrove`. `setWindowOpenHandler` denies every window. `will-attach-webview` is cancelled.
- **Permissions.** Request and check handlers allow only `fullscreen`; everything else is denied.
- **Single instance.** `requestSingleInstanceLock()`; a second launch focuses the first window and exits.
- **Menu.** macOS: app menu (About, Hide, Quit), Edit (so Cmd+C/V work in the farm-name field), View
  (Toggle Full Screen), Window. Windows: one View menu with Toggle Full Screen (F11), hidden until Alt
  (`autoHideMenuBar`). Unpackaged runs add Reload and Toggle Developer Tools.
- **Quit** when the last window closes, on every OS (a game, not a document app).
- **Test seam.** Only when `!app.isPackaged`, `ETHERGROVE_USER_DATA` overrides the `userData` path, so the
  smoke test never touches real saves.

### 3.4 Packaging (`electron-builder.config.mjs`)

- `appId: io.github.jaybecina.ethergrove`, `productName: Ethergrove Chronicles`,
  `artifactName: Ethergrove-Chronicles-${version}-${os}-${arch}.${ext}`, output `release/`.
- `files`: `dist/**/*.js`, `web/**/*`, `package.json`. `asar: true`.
- **macOS:** `dmg` for `arm64` and `x64`, category `public.app-category.games`,
  `minimumSystemVersion: "12.0"`. With `CSC_LINK` (a Developer ID Application certificate) the app is signed
  with the hardened runtime, and notarised when `APPLE_ID` and `APPLE_TEAM_ID` are set too (with
  `APPLE_APP_SPECIFIC_PASSWORD`). Without a certificate it is ad-hoc signed (`identity: '-'`) and the hardened
  runtime is off: the fuses rewrite the Electron binary, which breaks Electron's own signature, and Apple
  Silicon will not run a bundle whose seal is broken; the hardened runtime's library validation rejects ad-hoc
  frameworks, so it only makes sense with a real certificate.
- **Windows:** `nsis` for `x64`: `oneClick: false`, `perMachine: false`,
  `allowToChangeInstallationDirectory: true`, desktop and Start-menu shortcuts,
  `deleteAppDataOnUninstall: false` (uninstalling keeps saves). Signing turns on with `WIN_CSC_LINK`.
- **Fuses:** `runAsNode: false`, `enableCookieEncryption: true`, `enableNodeOptionsEnvironmentVariable: false`,
  `enableNodeCliInspectArguments: false`, `enableEmbeddedAsarIntegrityValidation: true`,
  `onlyLoadAppFromAsar: true`, `grantFileProtocolExtraPrivileges: false`.

### 3.5 Scripts

Root `package.json`:

| Script | Does |
| --- | --- |
| `pnpm desktop:dev` | builds the web game and the main process, then runs Electron on it |
| `pnpm desktop:mac` | the same, then `electron-builder --mac` |
| `pnpm desktop:win` | the same, then `electron-builder --win` |

Unsigned macOS downloads show "Apple could not verify…"; the player opens it once from System Settings →
Privacy & Security → Open Anyway. Unsigned Windows installers show SmartScreen's "More info → Run anyway".
Signing removes both; it needs an Apple Developer Program membership and a Windows code-signing certificate.

### 3.6 CI (`.github/workflows/desktop.yml`)

Runs on `workflow_dispatch` and on tags `v*`. A matrix of `macos-latest` (`pnpm desktop:mac`) and
`windows-latest` (`pnpm desktop:win`). Each job installs, runs the desktop unit tests and the Electron smoke
test, packages, and uploads `apps/desktop/release/*.{dmg,exe}` as artifacts for 14 days. It is not a required
check and does not run on pull requests (the web CI already gates every change to the game).

## 4. Lowest graphics tier (`apps/web`)

### 4.1 Tiers (exact)

`QualityTier = 'high' | 'low' | 'lite'`. `TierSettings` gains `shadows: boolean` and `bloom: boolean`.

| Tier | shadowMapSize | dprMax | ao | grassDensity | shadows | bloom |
| --- | ---: | ---: | --- | ---: | --- | --- |
| high | 2048 | 2 | true | 1 | true | true |
| low | 1024 | 1.5 | false | 0.5 | true | true |
| lite | 1024 | 1 | false | 0.5 | false | false |

Why these values (profile §"What it shows"): the pixel ratio is the biggest lever after the post chain;
bloom's mip blur is the heaviest effect left after AO; the shadow pass redraws the scene (~20%). Tone mapping,
the colour grade, vignette and SMAA stay, so Lowest keeps the game's colours and edges; they merge into one
effect pass plus SMAA's.

### 4.2 Rendering changes

- `PostFX`: a `lite` branch with `ToneMapping`, `Grade`, `Vignette` and `SMAA` (no `Bloom`, no `N8AO`).
- `SunLight`: `castShadow={QUALITY[tier].shadows}`.
- `weatherVisuals`: particle counts for `lite` are rain 1200, storm 1800, snow 600.

### 4.3 Automatic tier

- `pickInitialTier` takes an optional `renderer` string (from `WEBGL_debug_renderer_info`, read on the
  device and never sent anywhere). It returns `'lite'` when `isWeakGpu(renderer)`:
  `/swiftshader|llvmpipe|softpipe|basic render driver|intel\(r\) (hd|uhd) graphics|intel hd graphics|mali-[gt]?[0-9]{2}\b|adreno \(tm\) [3-5][0-9]{2}\b/i`.
  The other rules are unchanged and come first for touch and low memory (they return `'low'`).
- `PerformanceMonitor`'s `onDecline` sets the auto tier to `stepDown(current auto tier)`: high → low → lite →
  lite.

### 4.4 Settings

The Graphics radios become, in order: **Automatic**, **High**, **Battery saver**, **Lowest (older or
built-in graphics)**. Old saved settings (`'auto' | 'high' | 'low'`) stay valid.

### 4.5 Fallback wording in the desktop app

`isDesktopApp(userAgent)` is true when the user agent contains `Electron/`. There, `WebGLFallback` shows:

- Heading: "Your graphics can't show 3D right now"
- Lead: "Ethergrove Chronicles needs WebGL 2. Try these, then reopen the game:"
- Items: "Update your graphics drivers." · "On a laptop with two GPUs, plug in the charger." · "Restart your
  computer."

The browser wording is unchanged.

## 5. Tests

- `apps/web`: `quality.test.ts` (tier table, `isWeakGpu`, `pickInitialTier` with renderers, `stepDown`),
  `weatherVisuals.test.ts` (lite counts), `menuIntents.test.tsx` (the Lowest radio sets `'lite'`),
  `resilience.test.tsx` (desktop fallback wording).
- `apps/desktop`: `policy.test.ts` (path mapping and traversal, MIME types, CSP, navigation, permissions and
  the menu); `builderConfig.test.ts` (targets, fuses, signing with and without certificates); `e2e/app.spec.ts` boots the built unpackaged app with Playwright's `_electron` and checks the
  title screen, WebGL 2, no CSP or console errors, that a new window is denied, and that a setting survives a
  restart.
- `scripts/testGuard.mjs` gains a `desktop` area: `apps/desktop/src/**/*.ts` and
  `apps/desktop/electron-builder.config.mjs` need `apps/desktop/src/**/*.test.ts` or
  `apps/desktop/e2e/*.spec.ts`.
- The packaged app can't be driven by Playwright's Electron driver (the `enableNodeCliInspectArguments` fuse is
  off by design). Check it by starting the binary with `--remote-debugging-port=9333` and connecting with
  `chromium.connectOverCDP`, and by `codesign --verify --deep --strict`.

## 6. Selling the game (no code in this part)

- A premium single-player game needs no payment code: Steam, itch.io and the Epic Games Store run checkout,
  refunds and downloads. Upload the `.dmg`/`.app` and `.exe` builds (Steam takes a folder per OS through
  SteamPipe).
- Steam Direct costs US$100 per game. Steam needs a public "Coming Soon" page before a first release.
- itch.io is a good place for a free early demo; the developer sets itch.io's share.
- Steamworks features (achievements, cloud saves) are a later part; they would add `steamworks.js` to the
  main process.
- Check each store's current terms before launch; this spec does not quote revenue splits.

## 7. Out of scope

Linux builds, Windows on ARM builds, auto-update, Steam integration, telemetry, mobile apps (roadmap Part 9),
the 2.5D renderer (Part 3) and `--ignore-gpu-blocklist` (it can crash old drivers; revisit only with player
reports).
