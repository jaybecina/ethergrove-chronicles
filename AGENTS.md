# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Copilot, Gemini and others) working in this
repository.

Ethergrove Chronicles is an original cozy farm-life RPG for the browser (desktop and phones) and as an installable
macOS and Windows app, inspired by the farm-sim genre. It must stay original: no names, characters, art, music or text copied from Harvest Moon
or other games. Third-party assets are CC0 only (see `CREDITS.md`); verify a pack's license before adding it.

## Direction: Godot, no phones

The owner chose **Godot as the main engine** and dropped phones and tablets on 2026-11-03
([[decisions/0019-godot-main-no-phones]]). New ARPG work targets Godot for a desktop or laptop browser, the Mac and
Windows apps and Steam, with no phone layout, touch control or phone test. The touch, 44 px, phone-size and phone
e2e rules below apply **only to the current web game** (React + three.js), which stays as it is until Godot reaches
parity and is then retired.

## Working standard

**Always follow best practices and standards.** This is a standing instruction from the owner: it applies
to every task, whether or not the prompt says so, and the owner should never have to repeat it.

Work as a senior team in one person. Each role is a check to apply before calling work done:

- **Full-stack engineer:** `packages/core` stays pure and deterministic. Types stay strict, with no `any`.
  Lint is suppressed only with a reason, like the few `exhaustive-deps` ones in `scene/`. Any change
  to the `GameState` shape ships with a save migration (see Saves).
- **Game developer:** the game must stay smooth on a mid-range phone. Per-frame code (`useFrame`, the
  50 ms step) does not allocate or re-render React. Movement and animation feel are checked in a real
  browser, not only in unit tests.
- **UI/UX designer:** every flow works with keyboard, gamepad and touch. Touch targets are at least
  44 × 44 px. Layouts work at text size 150% and with Reduced motion, using the existing `theme.css`
  tokens. Check by eye at phone and desktop sizes before finishing.
- **AI/LLM engineer:** specs and plans are precise enough for a less capable model to implement: exact
  names, values and text. When you learn a non-obvious lesson, add it to this file.
- **QA tester:** write the test first and watch it fail. **Every change to source ships with an added or
  updated test in the same area** (core, web or scripts), and a commit guard enforces it (see below).
  Player-visible flows get an e2e test. A test must fail without the change it covers: check that before
  calling it done. Try the awkward inputs: a save loaded mid-flow, an overlay already open, slow
  devices. Re-run a flaky test to find its cause; don't just retry it. Never commit `.only` (ESLint
  rejects it).
- **Business analyst:** confirm the player-facing goal and success criteria before building. Ask when
  the request is ambiguous. Keep to the spec's scope. When finishing, report trade-offs and what you
  did not verify.

## Git and GitHub: the owner pushes

- **Never push** to GitHub, and never open, merge or close pull requests. Don't commit either, unless the
  owner asks for a commit in that conversation. Never force-push or rewrite pushed history.
- When work is ready, stop and post a **ready-to-push handoff** as your last message, in this shape:

  ````markdown
  ✅ Ready to push: branch `<branch>` (<N> changed files, checks: <what ran and the result>)

  Commit:

  ```bash
  git add <paths>
  git commit -m "<type>(<scope>): <summary, imperative, ≤ 72 chars>" -m "<why, and what changed, in 1–3 short lines>"
  ```

  Push:

  ```bash
  git push -u origin <branch>
  ```

  PR title: <type>: <plain-language title>

  PR description:

  ```markdown
  ## What

  - <change a reviewer can see>

  ## Why

  <the problem this solves>

  ## How it was checked

  - <tests and checks run, with results; say plainly what was not verified>

  🤖 Generated with [Claude Code](https://claude.com/claude-code)
  ```
  ````

- Commit types: `feat`, `fix`, `docs`, `test`, `build`, `refactor`, `chore`. List every file in `git add`; never
  use `git add -A` in a handoff. On commit the hook runs the fast gate (~10 s); GitHub CI runs every check
  on the pull request.
- Every source file in `git add` needs a test file beside it in the same list. When no test can cover a change
  (types only, copy text, assets), say why and prefix the commit line with it:
  `NO_TEST_REASON="<why, 10+ chars>" git commit …`. The reason lands in the message as a `No-Test:` trailer.

## Project memory and code graph

- **`brain/` is the project memory.** Start with `brain/MEMORY.md`. Decisions are in `brain/decisions/`,
  root causes in `brain/lessons/`, session logs in `brain/sessions/`, and unsorted captures in
  `brain/inbox/`. Notes cite evidence and are tagged **verified** or **inferred**. Code and tests win when
  they disagree with a note: fix the note.
- **Capture what can't be rediscovered from the code:** decisions, root causes, constraints, rejected
  options. Update the canonical note instead of adding a duplicate. Never put secrets or personal data in
  `brain/`. In Claude Code, the `second-brain` skill (`.claude/skills/second-brain/`) runs these
  workflows.
- **Graphify** (`graphify`, PyPI package `graphifyy`) builds a local code-and-notes graph in
  `graphify-out/`, which is gitignored and regenerated.
  - Before searching code, run `graphify query "<question>"`, `graphify explain "<symbol>"` or
    `graphify path "<A>" "<B>"`.
  - After changing code or notes, run `graphify update .` (about 2 s, local, no LLM).
  - The graph is a map: confirm what it says against the source before acting on it.
- **Both update themselves** ([[decisions/0006-automated-second-brain]], code in `scripts/brain/`).
  - In Claude Code, hooks in `.claude/settings.json` load `brain/MEMORY.md` at session start and add a
    live briefing to every prompt: branch, recent commits, uncommitted files, related brain notes and
    `graphify query` hits. Read the notes it lists when they bear on the request.
  - When a turn changed files but not `brain/` or `AGENTS.md`, the Stop hook asks once for a capture.
    Answer it properly: a decision, a lesson, a new rule for this file, or one session-log line. Never
    paste raw prompts, secrets or command output.
  - Husky `post-commit`, `post-merge` and `post-checkout` refresh the map in the background, for every
    agent. Other agents should still read `brain/MEMORY.md` first and capture lessons by hand.

## Commands

pnpm workspace, Node ≥ 24, pnpm 10. Run from the repo root unless noted.

```bash
pnpm install
pnpm dev              # game at http://localhost:5173
pnpm lint             # ESLint (strict, type-checked) over the whole repo
pnpm typecheck        # tsc in every package
pnpm test             # Vitest, core + web
pnpm test:scripts     # node:test for repo scripts (second-brain hooks)
pnpm test:coverage    # packages/core must stay ≥ 90%
pnpm game:models      # rebuild apps/game/assets/models from the web models (decoded for Godot)
pnpm game:import      # Godot headless import of apps/game (first run, or after adding assets)
pnpm game:test        # GUT tests for apps/game; prints only the totals unless one fails (GAME_VERBOSE=1 for all)
pnpm game:smoke       # headless: the boot smoke (SMOKE OK) and the playthrough (PLAYTHROUGH OK); fails if either fails
pnpm game:shot -- scene=farm tier=low season=winter out=/abs/x.png   # one 1280x720 screenshot in a real window
apps/game/tools/shot.sh   # every by-eye shot (zones × tiers × spring/winter, night, rain, title) → apps/game/shots/
pnpm build            # production build → apps/web/dist
pnpm checks:commit    # the fast gate with live progress (what pre-commit runs, ~10 s)
pnpm checks           # every check with live progress (what GitHub CI runs, ~3 min)
pnpm --filter web size   # bundle budget (size-limit)
pnpm --filter web perf   # load time on a throttled phone profile (not gating)
pnpm --filter web perf:frames   # frame-rate profile on the real GPU (not gating; report in docs/perf/)
pnpm desktop:dev      # build the game and open it in the Electron desktop app
pnpm desktop:mac      # .dmg for arm64 and x64 → apps/desktop/release/
pnpm desktop:win      # .exe NSIS installer for x64 (builds on macOS too, no Wine)
pnpm --filter desktop e2e   # Playwright boots the unpackaged desktop app (after `pnpm --filter desktop build`)
```

Single tests:

```bash
pnpm --filter @ethergrove/core exec vitest run test/tutorial.test.ts -t "buySeeds"
pnpm --filter web exec vitest run src/ui/lessons/cards.test.tsx
cd apps/web && CI=true pnpm exec playwright test e2e/lessons.spec.ts --project=chromium -g "skipped" --reporter=line
pnpm game:test -- test/core/test_crops.gd test/game/test_hud.gd   # only these GUT scripts
```

`CI=true` gives GitHub CI's settings for Playwright: one retry and a fresh dev server (two workers either way). Without it,
an already-running server on port 5199 is reused. Projects: `chromium`, `webkit`, `pixel-7`, `iphone-14`.
The phone projects only run `devices` and `a11y` specs.

### Which checks to run while you work

Run the smallest check that proves the change; the hooks run the rest. This keeps runs (and tokens) small.

- **After each edit:** the single-test commands above for the file or flow you touched. Don't run
  `pnpm checks`, `pnpm test:coverage` or the whole e2e suite after every edit.
- **Before the handoff:** `pnpm checks:commit`, plus the e2e specs for any player-visible flow you changed
  (`--project=chromium`). Run the full `pnpm checks` too when the change is broad: a refactor, the
  `GameState` shape or saves, the loop, build or test config.
- **A shared module changed** (`game/store.ts`, `systems/day.ts`, `e2e/helpers.ts` and the like): run the
  whole suite of that package, not just the nearest test file.
- **Keep test output out of the context.** The runners print a short summary on a pass and everything on a
  failure; don't add `--verbose`, `GAME_VERBOSE=1` or a `list` reporter unless you are reading a failure. Run
  each check once per state of the code: a passing run that you, the hook or a subagent already did on
  unchanged files counts, so don't re-run it to double-check.
- **Writing the test:** read the nearby tests first and extend the existing file when one fits; don't
  repeat what another test already checks. Game rules (crops, day order, saves) get core unit tests;
  e2e is for what a player sees and does, not for logic the core can test in milliseconds.
- **Checking in a browser:** read the page as text (`read_page`, `get_page_text`) or query state through
  `window.__ethergrove`; take screenshots only for visual checks, and close the preview server after.
- **A test fails:** find out whether your change, an older bug or flakiness caused it before editing code.
  Never weaken, skip or delete a test to get green.
- **Report** which checks ran and their results, and name what did not run. Never say a check passed
  without running it.

## Checks: pre-commit, then GitHub CI on the pull request

The checks are split by cost ([[decisions/0009-pre-commit-and-pr-ci]]):

- **`.husky/pre-commit` (~10 s)** runs the **test guard** (`scripts/testGuard.mjs`, about 1 s), then
  lint-staged (ESLint and Prettier on staged files), then `node scripts/checks.mjs commit`: typecheck, the
  `scripts/` tests, every unit test (core + web) and the Godot tests (skipped with a notice if Godot is not installed).
- **GitHub CI** (`.github/workflows/ci.yml`) runs on every pull request and on `main`: a job for lint,
  typecheck, the `scripts/` tests, coverage, build, the no-debug-hook check and the bundle size check, and
  e2e jobs on Linux: Chromium in two shards and WebKit, one worker each
  ([[lessons/ci-e2e-one-worker]]), and a `game` job that downloads Godot 4.7.2 (cached) and runs the GUT
  tests and the smoke boot. These five jobs are the required checks for `main`.
  `pnpm checks` runs the same steps locally; `scripts/checks.test.mjs` fails if the two drift apart, so
  change both together. There is no pre-push hook.

- The test guard reads the staged files. Each area with a staged source change needs a staged test:
  core (`packages/core/src/**` → `packages/core/{src,test}/**/*.test.ts`), web (`apps/web/src/**` →
  `apps/web/src/**/*.test.ts(x)` or `apps/web/e2e/*.spec.ts`), desktop (`apps/desktop/src/**/*.ts` and
  `electron-builder.config.mjs` → `apps/desktop/src/**/*.test.ts` or `apps/desktop/e2e/*.spec.ts`), scripts
  (`scripts/**/*.mjs` → `scripts/**/*.test.mjs`), game (`apps/game/{core,game}/**/*.gd` →
  `apps/game/test/**/test_*.gd`, GUT; the vendored `addons/` need none). Deletions and `.d.ts` files are exempt.
  `.husky/commit-msg` records a `NO_TEST_REASON` as a `No-Test:` trailer ([[decisions/0007-every-change-ships-a-test]]).
- The Godot step (`pnpm game:test`) skips with a notice when Godot is not installed locally, but fails in CI
  (`CI=true`).
- The commit checks run on the working tree, so unstaged files count too.
- `pnpm checks` run locally needs port 5199 free.
- `git commit --no-verify` skips the hook. Don't use it unless the user asks. CI still runs on the PR.
- Pass commit messages with `-m` or `-F <file>`, never `-F -`: git waits on stdin after the hook and hangs.

Visual baseline tests (`e2e/visual.spec.ts`) are Chromium-only and macOS-only, and they skip under
`CI=true`, so `pnpm checks` and GitHub CI never run them. To regenerate:
`pnpm --filter web exec playwright test e2e/visual.spec.ts --project=chromium --update-snapshots=all`.
Use `=all`: small UI changes fall inside the 2% tolerance and would otherwise leave stale baselines.

## Architecture

```
packages/core   Pure TypeScript rules. applyCommand(state, cmd) → { state, events }. No DOM/React/three
                (ESLint enforces it). All randomness comes from a seeded RNG stored in state.rng.
apps/web        Vite + React 19 + React Three Fiber + Zustand. Draws the core state and turns input into commands.
apps/desktop    Electron 44 shell around the apps/web build, packaged by electron-builder (.dmg, .exe).
apps/game       Godot 4.7 game (M1 on). core/ = GDScript port of packages/core (the same keys as TypeScript v2, plus the v3 changes: energy replaces stamina, new M1 keys); game/ = nodes
                ([[decisions/0020-godot-core-port-parity]]).
```

### Godot game structure (apps/game)

Spec `docs/superpowers/specs/2026-11-03-m1-vertical-slice-design.md`, [[decisions/0021-godot-world-structure]].
Three autoloads: `Settings` (tier, UI scale), `GameSession` (owns the live state, the screen, the fixed 50 ms step
that reads input and dispatches commands) and `SaveService` (slots and autosave). `boot/main.tscn` (`GameMain`)
runs Title → New game / Load / Continue → `WorldRoot` → Save and quit → Title. `WorldRoot` builds everything in
code: `ZoneView` (tiles, crops, villagers), the walls, the player, `CameraRig`, `AtmosphereDriver`, `LessonMarker`,
`Hud` and `PanelHost`. Views follow the state on `GameSession.state_changed` (never per frame) and never cache it;
a location change rebuilds the zone. Graphics tiers are data (`game/render/tiers.gd`) applied by `RenderApplier`.
By-eye checks use `pnpm game:shot` and are read as images; node classes take injected `session` / `settings` /
`save_service` so tests and tools never touch the real autoloads or `user://` saves.

### Desktop app

Spec `docs/superpowers/specs/2026-10-31-ethergrove-desktop-design.md`, [[decisions/0014-desktop-electron]].

- `src/policy.ts` holds every rule (URL → file, MIME, CSP, navigation, permissions, menu) and is unit tested;
  `src/main.ts` only wires it to Electron. No preload and no IPC: the game needs no Node access.
- The game loads from `app://ethergrove/` (a privileged standard scheme), never `file://`, so IndexedDB and
  localStorage persist in Electron's `userData`. `scripts/copy-web.mjs` copies `apps/web/dist` (no source maps)
  into `apps/desktop/web/`, which the asar bundles.
- Any new network origin, worker or WASM use in the web game must be allowed in the CSP in `policy.ts`; the
  desktop e2e fails on console errors, which is how a CSP block shows up.
- The packaged app has the inspect fuse off, so Playwright's Electron driver can't drive it. Check a packaged
  build by starting its binary with `--remote-debugging-port=9333` and `chromium.connectOverCDP`.
- **Updates** (spec `docs/superpowers/specs/2026-10-31-desktop-auto-update-design.md`,
  [[decisions/0016-desktop-auto-update]]): `updateMode` in `policy.ts` picks `install` (Windows, signed Mac), `notify`
  (unsigned Mac: a dialog that opens the release page) or `off` (unpackaged, other OSes, `ETHERGROVE_NO_UPDATE=1`);
  `updater.ts` runs it with injected dependencies. Never call `quitAndInstall`: an update installs on quit so no save is
  lost (a test enforces it). The packaged `package.json` carries `ethergroveMacSigned`, written by
  `electron-builder.config.mjs` from `CSC_LINK`.
- **Releasing** is a `v<version>` tag that matches `apps/desktop/package.json` and sits on `main`: `desktop.yml`'s
  `release-guard` makes a draft release, both `package` jobs upload into it (`publish:<os>` scripts), and `publish`
  releases it only if both passed. A manual run only builds (`dist:<os>`). `scripts/releaseTag.mjs` checks the tag.
- Without a Developer ID the macOS app is ad-hoc signed with no hardened runtime
  (`electron-builder.config.mjs`); flipping fuses breaks Electron's own signature, and Apple Silicon refuses a
  broken seal.

### The loop

`scene/GameLoop.tsx` and `game/loop.ts` run a fixed 50 ms step (`STEP_MS`).

- Each step reads input intents, then `input/toCommands.ts` turns them into core commands.
- `game/store.ts`'s `dispatch` applies the commands, stores the new state and emits the events on `game/eventBus.ts`.
- The clock runs at 10 game minutes per 7 real seconds. Frames are clamped to 250 ms.
- Everything reactive listens to the bus: audio (`audio/soundMap.ts`), effects, autosave, and the UI bridge
  (`ui/uiBridge.ts`, which opens overlays and shows toasts).

### Core

- Each rule lives in `systems/`.
- `applyCommand` runs a fixed post-pass: dispatch → `prunePins` → `checkMilestones` → `advanceTutorial`.
- The overnight order is fixed in `systems/day.ts`, and tests pin it.

### Tutorial ("Grandpa's Lessons")

The tutorial state lives in the core as `GameState.tutorial`.

- The lesson and note rules are in `systems/tutorial.ts`. Lesson order and the note list are in `data/lessons.ts`.
- The web layer only draws it. `ui/lessons/` has the goal and note cards, the text (verbatim from the spec
  appendix) and the device-aware control chips. Transient UI state is in `ui/lessons/lessonStore.ts`.
- The 3D marker is `scene/LessonMarker.tsx`. The Journal tab is `ui/screens/JournalPanel.tsx`.
- Cards read the lesson from state, not events, so a loaded save is correct. Events only drive the
  expand/collapse animation and announcements.

### Audio

All music and SFX are original scores rendered offline by the dev-only studio and shipped as AAC `.m4a` (web). The
style is **Outward-style folk fantasy** ([[decisions/0023-outward-style-folk-soundtrack]], spec
`docs/superpowers/specs/2026-11-05-outward-style-soundtrack-design.md`): small ensembles (fiddle, recorder,
strumstick, folk harp, psaltery, cello drones, hand drums), folk modes, rests, a day / night / fight set per place.
It is being revised toward **cinematic folk** (medieval, gypsy, bard, a little cinematic;
[[decisions/0024-cinematic-folk-revision]], spec `docs/superpowers/specs/2026-11-05-soundtrack-cinematic-folk-design.md`):
audible low end, strummed chords, string swells, Phrygian-dominant fights, human timing. Pilot: `title`, `woods`,
`woodsFight`, `lowmere`; the rest follows after the owner listens. Nothing is copied from any game's music.

- **Render:** start the e2e dev server on port 5199 (it must serve this checkout), then
  `VSCO_DIR=<VSCO-2-CE> VCSL_DIR=<VCSL> pnpm --filter web studio [--only <id>]`. VCSL (CC0, github.com/sgossner/VCSL)
  can be a sparse checkout of the 8 instrument folders in `src/studio/samples.ts`. It needs macOS `afconvert`, writes
  `public/assets/{music,sfx}/*.m4a` plus the generated `src/audio/manifest.ts`; commit both, never samples. A
  single-track `--only` run needs `apps/web/studio-out/manifest.json` from one full run (it refuses without it).
- **Pieces** are built with `pieces/folk.ts` (`folkPiece`: chord names and phrases in, parts out). Godot-only tracks
  are in `pieces/godot.ts` and are not web `TrackId`s.
- **Rules tests enforce** (`pieces/folk.test.ts`): no `pad`, `choir`, `ePiano`, `arp`, `glock`, `subBass`, bell
  sounds or lo-fi anywhere; at most 4 melodic voices at once (3 in night tracks); a 4-bar melodic rest in every
  exploration track; the Rootsong in the title, seasons, night, rain, Lowmere and season fanfares; Grandpa's theme at
  home; the Gloam in Mossdeep and the Bramble Matron; night variants at 0.65–0.8 of the day tempo; the retired Hearth
  motif nowhere; budgets (track ≤ 1 MB, jingle ≤ 120 KB, SFX ≤ 40 KB, total ≤ 9 MB); seamless loops.
- **Revision rules** (`pieces/folk.test.ts`, on the `REVISED` list until the rollout): a low note (≤ C3, gain ≥ 0.15)
  in 60 % of bars (every bar in fights); `strings…` parts are beds with `attack` ≥ 0.4 s that rest in 25 % of bars;
  ≤ 4 tambourine or shaker hits a bar; an augmented second in fights, the boss and Lowmere; a pitched layer in every
  8th of a fight; every piece sets `humanize` (`HUMANIZE_TRACK` / `HUMANIZE_JINGLE`). `strum` (ms) and `attack` (s)
  are part options in `score.ts`; `strumBar` and `voicing` in `pieces/folk.ts` make guitar-like strummed chords.
- **Measure, don't guess:** a score can satisfy a rule and still sound wrong (pp drones were "low end" on paper and
  2–5 % in the audio). Check a render with the Web Audio analyser recipe in the cinematic folk spec (low-end share,
  largest pitch class, onsets per second, loudness percentiles) against its reference numbers.
- **VSCO pitch:** check a sample's octave by the energy at each candidate pitch (Goertzel), not by autocorrelation
  alone: autocorrelation called the contrabass an octave low. Cello spiccato, contrabass pizzicato and solo-violin
  spiccato all sound an octave above their names; the solo violin's arco files do not.
- **Loop seams:** rendered loops are exact; AAC noise lowers the decoded seam correlation to 0.98–0.99, while a
  broken wrap measures about 0.6. The e2e bar is 0.95, so don't "fix" a 0.98 seam.
- **Godot** plays music and sounds through `apps/game/game/audio/`: `MusicDirector` (pure cue rules),
  `MusicConductor` (fades, 4 s fight hold), `MusicPlayer`, `SfxPlayer`, volumes in `Settings`.
- Nobody can hear tests: the owner listens to every changed `.m4a` before merging.
- **AI music briefs (ACE-Step 1.5):** its DiT text encoder keeps only 256 tokens of `instruction + caption + metas`
  (~200 for the caption), so write a caption of ≤ ~190 tokens, put the arc in the `lyrics` section tags and the "no …"
  words in `lm_negative_prompt` ([[lessons/ace-step-caption-256-tokens]]). Briefs, renders and the loop and measure
  tools live outside the repo in `../ai-audio/`; takes go to the git-excluded `audio-pilot/`.

### Saves

`packages/core/src/save/` holds a zod schema and step-by-step `migrate()`. Keyed `MIGRATIONS` upgrade from
each version. `CURRENT_SAVE_VERSION` is 2 (v2 added `tutorial`).

- Godot saves are version 3; the web game stays on 2 ([[decisions/0020-godot-core-port-parity]]).
- Version 3 lives only in Godot (`apps/game/core/save/`, M1 spec §5): `player.stamina` is `player.energy`, plus the
  M1 keys. Event names and fields keep the old words (`staminaLow`, `itemEaten.stamina`). The TypeScript parity
  fixtures stay at version 2: `test_parity.gd` migrates each expected state with `SaveMigrate.state_2_to_3` and
  translates `patch` steps, and `test_new_game.gd` checks a new game equals the migrated TypeScript one.

- Any `GameState` shape change needs a version bump, a migration, and a test against a real older fixture
  (`packages/core/test/fixtures/`).
- The web side stores saves in IndexedDB (`apps/web/src/save/`): three slots plus a backup per slot, in the
  `ethergrove` database. Saves from the `hearthvale` database (the game's old name) are copied in once by
  `save/legacyImport.ts`; settings move from `hearthvale:settings` to `ethergrove:settings` the same way.
  Never delete those legacy reads without a decision note.
- Aborting an `idb` upgrade transaction (to open a database without creating it) rejects its `tx.done`
  promise; catch it, or Vitest reports unhandled `AbortError`s (see `save/legacyImport.ts`).

### E2E debug hook

`window.__ethergrove` exists only when built with `VITE_E2E=true`, i.e. `pnpm --filter web dev:e2e`, the
server Playwright starts on port 5199. `check:build` fails the production build if the hook leaks into it.

- e2e helpers are in `apps/web/e2e/helpers.ts`.
- `boot()` clears storage on a blank page, then loads the game at the Medium quality tier.
- `newGame(page, seed, { lessons })` has lessons off by default.
- `boot()` and `newGame()` boot **lean** by default: render costs off (`?perf-off=all`). Under SwiftShader the full
  farm draws about 1.5 frames a second and every click waits for frames, so tests ran out of CI's 90 s budget.
  README media (`SAVE_MEDIA`) boots with full rendering; pass `{ lean: false }` for any new spec that judges how the
  3D scene looks ([[lessons/e2e-swiftshader-frame-rate]]).

## Gotchas learned the hard way

- **Autoload names are not identifiers in a `-s` SceneTree script** (the playthrough smoke, `tools/shot.gd`):
  they are compiled before the autoloads exist. Node code looks them up with `get_node_or_null("/root/<Name>")`.
- **Godot exports** (`pnpm game:export`) need the 4.7.2 export templates installed once, a universal macOS build needs
  `textures/vram_compression/import_etc2_astc=true` in `project.godot`, and the Web shell must have `detectUnsupported`
  inlined by `scripts/exportGame.mjs` because the export copies only the shell file.
- **Godot imports anything under `apps/game/`,** so a folder of generated files (like `shots/`) needs a `.gdignore`.
- **Godot 4.7.2 silently fails to import glTF using EXT_meshopt_compression / KHR_mesh_quantization** (`valid=false`, no scene). apps/game models are produced by `pnpm game:models`, never copied raw.
- **Zustand selectors must return stable values** ([story](brain/lessons/lesson-marker-render-loop.md)).
  A selector that builds a new object every call causes
  "getSnapshot should be cached" and a render loop. Inside R3F that crashes the canvas.
- **Keep per-frame components cheap.** A selector on the whole `s.game` re-renders on every 50 ms step.
  Select a primitive or key instead. Give `useThree` a selector too.
- **e2e input pacing.** The action gate drops a second tool press within 350 ms. A key pressed in the
  same frame as a slot switch can apply before it. Use real keys for the first action, then `act()` from
  the helpers, and poll `activeSlot` after a slot key.
- **Farm layout.** The farm is 32×24. The field is `FIELD_RECT` (x 3–27, y 6–16) with seeded weeds, rocks
  and stumps. The pond is at x 2–6, y 18–20, and the cart tile is (31, 17). Don't teleport test players
  into the pond.
- **Measuring frame rate.** The e2e configs render with SwiftShader (software), so their frame times mean
  nothing. `perf:frames` uses Playwright's full Chromium (`channel: 'chromium'`) on the real GPU with vsync off;
  `?perf-off=dpr,ao,shadows,grass,particles,post` (or `all`) turns costs off in E2E builds only
  (`render/profileSwitches.ts`). CPU throttling does not slow the GPU, and on ANGLE Metal the WebGL timer-query
  readings are 2–3× the frame time, so don't trust them there.
- **Kenney models render as metal.** Their glTFs omit `metallicFactor`, which three.js reads as 1.0.
  With no environment map that hides the base colour: tinted grey rocks came out dark brown, like the
  stumps. Pass `matte` to `ModelInstances` when a model's tint must read true (rocks do).
- **Quality tiers.** `low`, `medium` and `high` live in `render/quality.ts`. Automatic starts weak GPUs (by the
  WebGL renderer string, read locally only) on `low` and every other device on `medium`; it never picks `high`.
  `PerformanceMonitor` steps the auto tier down one at a time. A new per-tier cost goes in `TierSettings`, not in
  an `if (tier === …)`. Saved settings carry `settingsVersion`; `migrateSettings` in `game/store.ts` maps the
  pre-2 ids once (`low`→`medium`, `lite`→`low`). Seed e2e settings as `{ settingsVersion: 2, quality: … }`, or
  the game rewrites the stored string on load.
- **Godot `==` on nested containers treats `1` and `1.0` as different;** compare game states with
  `JsonNorm.first_diff`.
- **GUT silently skips a test script that fails to parse;** `scripts/game.mjs` fails the run on script errors and on
  fewer scripts run than `test_*.gd` files. Never name a support file `test_*.gd`.
- **Godot JSON parses every number as float;** `SaveMigrate.migrate` normalises whole floats to ints.
- **Stacking.** `.hud` is `position: fixed`, so it is its own stacking context. Anything that must sit
  above the touch joystick zone (`z-index: 1`) has to be mounted outside `.hud`; see `ui/lessons/LessonColumn.tsx`.

## Docs and process

- Work is sized by risk with Lean SDD (`.claude/skills/lean-sdd/SKILL.md`, readable by any agent): T0 tiny and
  T1 small need no docs; T2 gets one spec with requirements, acceptance criteria and tasks together
  (`references/spec-template.md`); T3 (saves, `GameState` shape, the loop, combat/AI/progression architecture) adds
  architecture, risks and one independent review. The `docs/superpowers/` folder name is historical; keep it.
- Design specs are in `docs/superpowers/specs/` and implementation plans in `docs/superpowers/plans/`.
  Specs carry exact names, numbers and player-facing text. Follow them, and record any deviation.
- Part 2A (town and villagers) is specced on the local branch `docs/part2a-spec`. When it is built, it
  moves saves to v3 and retargets the tutorial's `buySeeds` lesson from Sol's cart to the town store
  (tutorial spec §9).
- Deploy is on Vercel via the root `vercel.json` (it builds `pnpm --filter web build` into
  `apps/web/dist`). The Vercel project's Root Directory must be empty, or `vercel.json` is ignored.
