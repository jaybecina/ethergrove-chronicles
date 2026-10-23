# Architecture

Hearthvale is split into a pure rules engine and a web app that draws it.

```mermaid
flowchart LR
  input["Keyboard · Gamepad · Touch"] --> mapper["InputMapper → Intents"]
  mapper --> cmds["intentsToCommands"]
  cmds -->|"every 50 ms step"| core["@hearthvale/core<br/>applyCommand(state, cmd)"]
  core -->|"new state"| store["Zustand store"]
  core -->|"events"| bus["Event bus"]
  store --> scene["R3F scene"]
  store --> hud["React HUD & menus"]
  bus --> fx["Particles · float text · shake"]
  bus --> audio["Howler / synth audio"]
  bus --> ui["UI bridge: overlays, toasts, tips"]
  bus --> save["Autosave → IndexedDB"]
```

## `packages/core` — the rules

- **Deterministic and pure.** `applyCommand(state, cmd) → { state, events }`. No DOM, React or three.js
  (enforced by ESLint). All randomness comes from a seeded mulberry32 stored in `state.rng`, so the same seed
  and commands always produce the same game.
- **Systems** (`src/systems/`): calendar, bag, movement (circle-vs-tile collision with substeps), tools and
  stamina, crops, weather, economy, end of day, interaction, milestones.
- **Overnight order** is fixed in `systems/day.ts` (sell bin → grow → date and season deaths → weather → water
  → stamina and gold). Tests pin it.
- **Saves** (`src/save/`): a zod schema validates every loaded file; `migrate()` upgrades old versions step by
  step; `SaveRepository` is the storage interface.

## `apps/web` — the game you see

- **Fixed-step loop** (`scene/GameLoop.tsx`, `game/loop.ts`): frames feed an accumulator; each 50 ms step reads
  input, dispatches commands and ticks the clock (10 game minutes per 7 real seconds). Frames longer than
  250 ms are clamped so a locked phone never fast-forwards the day.
- **Rendering** (`scene/`, `render/`): instanced tiles, grass and trees; shader patches for wind and snow; a
  time-of-day sun and sky; GPU rain and snow; post-processing (N8AO on the high tier, bloom, AgX, a seasonal
  grade). Quality tiers start from the device and drop automatically when the frame rate falls.
- **UI** (`ui/`): DOM over the canvas so text stays sharp and accessible. Menus share one parchment `Panel`
  with arrow-key and gamepad focus navigation.
- **Saves** (`save/`): IndexedDB with three slots and a backup of the previous good save per slot; autosave on
  each new morning and when the page is hidden; export and import as `.hearthvale.json`.
- **Resilience**: a WebGL fallback screen, GPU context-loss recovery, error boundaries, and a banner when
  storage is unavailable.

## Testing

| Layer                                                               | Tool                                                               |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Rules, invariants, determinism, a scripted full year                | Vitest + fast-check (`packages/core`, ≥ 90% coverage)              |
| Store, loop, input, saves, HUD, menus                               | Vitest + Testing Library + fake-indexeddb                          |
| Real game in browsers (golden path, phones, a11y, visuals, seasons) | Playwright + axe                                                   |
| Load time on a throttled phone profile                              | Playwright against the production build (`pnpm --filter web perf`) |
