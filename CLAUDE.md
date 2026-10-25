# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Hearthvale is an original cozy 3D farming game for the browser (desktop and phones), inspired by the
farm-sim genre. It must stay original: no names, characters, art, music or text copied from Harvest Moon
or other games. Third-party assets are CC0 only (see `CREDITS.md`); verify a pack's license before adding it.

## Commands

pnpm workspace, Node ≥ 24, pnpm 10. Run from the repo root unless noted.

```bash
pnpm install
pnpm dev              # game at http://localhost:5173
pnpm lint             # ESLint (strict, type-checked) over the whole repo
pnpm typecheck        # tsc in every package
pnpm test             # Vitest, core + web
pnpm test:coverage    # packages/core must stay ≥ 90%
pnpm build            # production build → apps/web/dist
pnpm checks           # every check with live progress (what the pre-commit hook runs)
pnpm --filter web size   # bundle budget (size-limit)
pnpm --filter web perf   # load time on a throttled phone profile (not gating)
```

Single tests:

```bash
pnpm --filter @hearthvale/core exec vitest run test/tutorial.test.ts -t "buySeeds"
pnpm --filter web exec vitest run src/ui/lessons/cards.test.tsx
cd apps/web && CI=true pnpm exec playwright test e2e/lessons.spec.ts --project=chromium -g "skipped"
```

`CI=true` gives the hook's settings for Playwright: one worker, one retry, a fresh dev server. Without it,
an already-running server on port 5199 is reused. Projects: `chromium`, `webkit`, `pixel-7`, `iphone-14`.
The phone projects only run `devices` and `a11y` specs.

## No GitHub CI: the pre-commit hook is the gate

There is no GitHub Actions workflow. `.husky/pre-commit` runs lint-staged, then `node scripts/checks.mjs`.
That script runs lint, typecheck, coverage, build, the no-debug-hook check, the bundle size check, and e2e
on Chromium and WebKit. Every commit therefore takes about 4 minutes.

- The checks run on the working tree, so unstaged files count too.
- Port 5199 must be free.
- `git commit --no-verify` skips the hook. Don't use it unless the user asks.
- Pass commit messages with `-m` or `-F <file>`, never `-F -`: git waits on stdin after the hook and hangs.

Visual baseline tests (`e2e/visual.spec.ts`) are Chromium-only and macOS-only, and they skip under
`CI=true`, so the hook never runs them. To regenerate:
`pnpm --filter web exec playwright test e2e/visual.spec.ts --project=chromium --update-snapshots=all`.
Use `=all`: small UI changes fall inside the 2% tolerance and would otherwise leave stale baselines.

## Architecture

```
packages/core   Pure TypeScript rules. applyCommand(state, cmd) → { state, events }. No DOM/React/three
                (ESLint enforces it). All randomness comes from a seeded RNG stored in state.rng.
apps/web        Vite + React 19 + React Three Fiber + Zustand. Draws the core state and turns input into commands.
```

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

### Saves

`packages/core/src/save/` holds a zod schema and step-by-step `migrate()`. Keyed `MIGRATIONS` upgrade from
each version. `CURRENT_SAVE_VERSION` is 2 (v2 added `tutorial`).

- Any `GameState` shape change needs a version bump, a migration, and a test against a real older fixture
  (`packages/core/test/fixtures/`).
- The web side stores saves in IndexedDB (`apps/web/src/save/`): three slots plus a backup per slot.

### E2E debug hook

`window.__hearthvale` exists only when built with `VITE_E2E=true`, i.e. `pnpm --filter web dev:e2e`, the
server Playwright starts on port 5199. `check:build` fails the production build if the hook leaks into it.

- e2e helpers are in `apps/web/e2e/helpers.ts`.
- `boot()` clears storage on a blank page, then loads the game at the Low quality tier.
- `newGame(page, seed, { lessons })` has lessons off by default.

## Gotchas learned the hard way

- **Zustand selectors must return stable values.** A selector that builds a new object every call causes
  "getSnapshot should be cached" and a render loop. Inside R3F that crashes the canvas.
- **Keep per-frame components cheap.** A selector on the whole `s.game` re-renders on every 50 ms step.
  Select a primitive or key instead. Give `useThree` a selector too.
- **e2e input pacing.** The action gate drops a second tool press within 350 ms. A key pressed in the
  same frame as a slot switch can apply before it. Use real keys for the first action, then `act()` from
  the helpers, and poll `activeSlot` after a slot key.
- **Farm layout.** The farm is 32×24. The field is `FIELD_RECT` (x 3–27, y 6–16) with seeded weeds, rocks
  and stumps. The pond is at x 2–6, y 18–20, and the cart tile is (31, 17). Don't teleport test players
  into the pond.
- **Stacking.** `.hud` is `position: fixed`, so it is its own stacking context. Anything that must sit
  above the touch joystick zone (`z-index: 1`) has to be mounted outside `.hud`; see `ui/lessons/LessonColumn.tsx`.

## Docs and process

- Design specs are in `docs/superpowers/specs/` and implementation plans in `docs/superpowers/plans/`.
  Specs carry exact names, numbers and player-facing text. Follow them, and record any deviation.
- Part 2A (town and villagers) is specced on the local branch `docs/part2a-spec`. When it is built, it
  moves saves to v3 and retargets the tutorial's `buySeeds` lesson from Sol's cart to the town store
  (tutorial spec §9).
- Deploy is on Vercel via the root `vercel.json` (it builds `pnpm --filter web build` into
  `apps/web/dist`). The Vercel project's Root Directory must be empty, or `vercel.json` is ignored.
