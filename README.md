# Ethergrove Chronicles

A farm-life RPG: grow magic crops, delve the sunken Deeps, and find out where Grandpa went. It runs in the
browser, on desktop and on phones. Keep your missing grandpa's overgrown farm alive, clear the field, grow
eight crops through four seasons, ship your harvest, and keep the farm going through rain, storms and snow.

Ethergrove is an original game inspired by the classic farm-sim genre, mixed with a real-time RPG. Part 1
(this release) is the farm loop; the town, the Deeps, combat and the story follow in later parts (see
[the Ethergrove Chronicles spec](docs/superpowers/specs/2026-10-29-ethergrove-chronicles-design.md)).

| Spring                           | Summer                           |
| -------------------------------- | -------------------------------- |
| ![Spring](docs/media/spring.png) | ![Summer](docs/media/summer.png) |
| **Fall**                         | **Winter**                       |
| ![Fall](docs/media/fall.png)     | ![Winter](docs/media/winter.png) |

**Live:** _added after the first deploy_

## Play

| Action               | Keyboard                 | Gamepad                               | Touch                        |
| -------------------- | ------------------------ | ------------------------------------- | ---------------------------- |
| Walk                 | W A S D / arrows         | Left stick                            | Drag on the left side        |
| Run                  | Hold Shift while walking | Push the stick all the way, or hold B | Drag out to the glowing ring |
| Use tool             | Space                    | A                                     | ✦ button                     |
| Interact, plant, eat | F                        | X                                     | ✋ button                    |
| Pick a tool or item  | 1–8, mouse wheel         | LB / RB                               | ⇄ button, tap the hotbar     |
| Turn the camera      | Q / E                    | LT / RT                               | ⟲ ⟳ buttons                  |
| Zoom                 | + / −                    |                                       |                              |
| Menu                 | Esc / Tab                | Start                                 | ☰                           |

Sleep in your bed to end the day and save. Anything in the shipping bin sells overnight. Sol's cart on the
east road sells seeds from 9 AM to 5 PM, spring to fall.

New farms start with Grandpa's lessons. Reread them, skip them or start them again from the Journal
tab in the menu.

## Install and run the desktop app

The installers are already built on the developer's Mac, in the folder `apps/desktop/release/`:

| File                                        | Use it on                                         |
| ------------------------------------------- | ------------------------------------------------- |
| `Ethergrove-Chronicles-0.1.0-mac-arm64.dmg` | MacBook / Mac with Apple Silicon (M1, M2, M3, M4) |
| `Ethergrove-Chronicles-0.1.0-mac-x64.dmg`   | Older Intel Macs                                  |
| `Ethergrove-Chronicles-0.1.0-win-x64.exe`   | Windows 10 or 11 (64-bit)                         |

Not sure which Mac you have? Click the Apple menu → **About This Mac**. If it says "Chip: Apple M…", use the
`arm64` file.

### Mac, step by step

1. In Finder, open the project folder, then `apps/desktop/release/`.
2. Double-click `Ethergrove-Chronicles-0.1.0-mac-arm64.dmg`. A window opens with the game's icon and an
   **Applications** folder.
3. Drag the **Ethergrove Chronicles** icon onto the **Applications** folder. Wait for the copy to finish, then
   close the window and eject the disk image (right-click it on the desktop → Eject).
4. Open **Launchpad** or the **Applications** folder and double-click **Ethergrove Chronicles**.
5. First launch only: macOS says the app "cannot be verified" (the game isn't signed with a paid Apple
   certificate yet). Click **Done**, not "Move to Trash". Then:
   1. Open **System Settings → Privacy & Security**.
   2. Scroll down to the message about "Ethergrove Chronicles" and click **Open Anyway**.
   3. Enter your Mac password or Touch ID, then click **Open**.
6. The title screen appears. Click **New game**. From now on it opens normally, with no warning.

### Windows, step by step

The Windows installer was built on a Mac, so it has to be copied to the Windows PC first.

1. Copy `apps/desktop/release/Ethergrove-Chronicles-0.1.0-win-x64.exe` to the Windows PC (USB stick, Google
   Drive, OneDrive, AirDrop-to-cloud and so on). It's about 130 MB.
2. On the PC, double-click the `.exe`.
3. If a blue **Windows protected your PC** screen appears (the game isn't signed with a paid certificate yet),
   click **More info**, then **Run anyway**.
4. In the installer, click **Next**, keep or change the install folder, and click **Install**, then **Finish**.
5. Start the game from the **desktop shortcut** or the **Start menu** ("Ethergrove Chronicles"), and click
   **New game**.
6. To remove it later: **Settings → Apps → Installed apps → Ethergrove Chronicles → Uninstall**. Your saves stay
   in your user folder.

### Run it without installing (developers, on a Mac)

```bash
pnpm install
pnpm desktop:dev
```

This builds the game and opens it in a desktop window straight from the code.

### Rebuild the installers

```bash
pnpm desktop:mac   # makes both .dmg files
pnpm desktop:win   # makes the Windows .exe (works on a Mac, nothing extra to install)
```

The new files appear in `apps/desktop/release/`. Rebuild after any change to the game.

### If the game is slow, or says it can't show 3D

- **Slow:** in the game, open **Settings → Graphics** and choose **Lowest (older or built-in graphics)**.
  **Automatic** also picks it for weak graphics.
- **"Your graphics can't show 3D right now":** update your graphics drivers, plug in the charger on a laptop
  with two GPUs, then restart the computer.
- **Saves from the browser version** don't move over by themselves: use **Export save** in the browser's pause
  menu, then **Import a save file** on the app's Load game screen.

## Develop

Requires Node 24 and pnpm 10.

```bash
pnpm install
pnpm dev          # http://localhost:5173
pnpm test         # unit tests (core, web, desktop)
pnpm e2e          # Playwright: Chromium, WebKit, Pixel 7, iPhone 14
```

| Script                         | What it does                                                |
| ------------------------------ | ----------------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` | ESLint (strict, type-checked) and TypeScript                |
| `pnpm test:coverage`           | Unit tests; `packages/core` must stay at ≥ 90% coverage     |
| `pnpm build`                   | Production build into `apps/web/dist`                       |
| `pnpm --filter web size`       | Bundle budget: initial JS ≤ 500 KB gzipped                  |
| `pnpm --filter web perf`       | Load time on a throttled phone profile (production build)   |
| `pnpm checks:commit`           | Typecheck and every unit test, ~10 s (pre-commit runs it)   |
| `pnpm checks`                  | All the checks above with live progress (same as GitHub CI) |

The checks are split by cost:

- **pre-commit (~10 s):** checks that staged code changes come with a test, fixes and lints the staged
  files, then runs `pnpm checks:commit`: typecheck and every unit test. Skip once with
  `git commit --no-verify`.
- **GitHub CI on each pull request and on `main`:** lint, typecheck, unit tests with coverage,
  production build, debug-hook check and bundle size in one job, plus e2e on Chromium and WebKit
  (Linux) in parallel jobs, Chromium split in two shards. Failed tests upload their Playwright
  traces. Make all four jobs
  required checks for `main` in branch protection.

`pnpm checks` runs everything CI runs on your machine. It needs a free port 5199 (stop any
`pnpm dev:e2e` first).

Each step shows a spinner and its time, and prints its output only if it fails; e2e prints one live
line per test.

## Desktop app (macOS and Windows)

The same game ships as an installable app, built with [Electron](https://www.electronjs.org/) and
electron-builder (`apps/desktop`, spec `docs/superpowers/specs/2026-10-31-ethergrove-desktop-design.md`). It runs
offline, and saves live in the app's own folder.

```bash
pnpm desktop:dev   # build the game and open it in the desktop app
pnpm desktop:mac   # → apps/desktop/release/Ethergrove-Chronicles-<version>-mac-{arm64,x64}.dmg
pnpm desktop:win   # → apps/desktop/release/Ethergrove-Chronicles-<version>-win-x64.exe (builds on a Mac too)
pnpm --filter desktop e2e   # boots the real app (run `pnpm --filter desktop build` first)
```

The **Desktop** GitHub workflow builds both installers on macOS and Windows runners when run by hand or on a
`v*` tag, and attaches them to the run.

- **Unsigned builds** work, but warn on first open. macOS: System Settings → Privacy & Security → Open Anyway.
  Windows SmartScreen: More info → Run anyway.
- **Signing** removes the warnings. Set `CSC_LINK` and `CSC_KEY_PASSWORD` (an Apple Developer ID Application
  certificate), plus `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` to notarise. For Windows, set
  `WIN_CSC_LINK` and `WIN_CSC_KEY_PASSWORD`. Add them as repository secrets for the workflow.
- **Weak GPUs:** Settings → Graphics → **Lowest (older or built-in graphics)** turns off shadows and bloom and
  draws at 1× pixels. Automatic picks it for software renderers and older Intel graphics, and steps down to
  it when the frame rate stays low.

## How it's built

```
packages/core   Pure TypeScript rules: applyCommand(state, cmd) → { state, events }. Deterministic, no DOM.
apps/web        Vite + React 19 + React Three Fiber. Fixed 50 ms simulation step, DOM HUD over the canvas.
```

- **Rendering:** instanced tiles, wind-swayed grass and trees, a time-of-day sun and sky, shader snow cover,
  GPU rain and snow, a pond shader, and post-processing (ambient occlusion, bloom, AgX tone mapping, a
  seasonal colour grade). Quality adapts to the device and frame rate.
- **Saves:** IndexedDB with three slots and an automatic backup per slot, validated with zod and versioned for
  migrations. Export and import as a file.
- **Tested:** property-based invariants, a scripted bot that plays a full year, component tests, and
  Playwright end-to-end tests with axe accessibility checks.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). How AI agents work in this repo (rules, project memory, code map): [docs/agent-workflow.md](docs/agent-workflow.md). Asset credits: [CREDITS.md](CREDITS.md).

## Roadmap

1. **Farm loop** and Grandpa's lessons — this release
2. Rename to Ethergrove Chronicles, and the new story bible
3. 2.5D renderer: fixed camera, baked backdrops, 3D characters
4. Lowmere: town, villagers, friendship, shops
5. Combat core (real time), XP and skills, gear, mining, Mossdeep and its boss, first magic crops
6. Deeps 2–5, story chapters, journal pages, endings
7. Farm life: animals, fishing, house and tool upgrades, romance, festivals
8. Music, sound effects and BGM
9. Phone app (Expo shell around the web game)
