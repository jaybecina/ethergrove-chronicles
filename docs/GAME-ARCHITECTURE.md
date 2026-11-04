# Ethergrove Chronicles: Visual Architecture

A picture-first tour of how the game is built. The diagrams are [Mermaid](https://mermaid.js.org/), so GitHub and
most Markdown viewers draw them. For the written rules of each layer see [ARCHITECTURE.md](ARCHITECTURE.md) (the
web game) and the [M1 Godot spec](superpowers/specs/2026-11-03-m1-vertical-slice-design.md).

> **Status (2026-11-03):** the owner chose **Godot as the main engine** and dropped phones
> ([decision 0019](../brain/decisions/0019-godot-main-no-phones.md)). The web game (React + three.js) stays
> playable until Godot reaches parity, then it is retired. So the repo holds **two games sharing one set of
> rules**, for now.

## 1. The big picture

Everything is one pnpm monorepo. The rules live in a pure core; each app is a different way to draw and play them.

```mermaid
flowchart TB
  subgraph repo["Monorepo: ethergrove-chronicles (pnpm, Node 24)"]
    direction TB

    subgraph rules["Rules (no graphics, no DOM)"]
      tscore["packages/core<br/>TypeScript rules engine<br/>REFERENCE until web retires"]
      gdcore["apps/game/core<br/>GDScript port of the rules<br/>+ save v3"]
    end

    subgraph clients["Clients (what players run)"]
      web["apps/web<br/>React 19 + three.js (R3F)<br/>browser game, saves v2"]
      desktop["apps/desktop<br/>Electron shell around web<br/>macOS + Windows installers"]
      godot["apps/game<br/>Godot 4.7 project<br/>MAIN ENGINE going forward"]
    end

    subgraph tooling["Tooling and memory"]
      scripts["scripts/<br/>checks, game.mjs, brain hooks"]
      brain["brain/<br/>decisions, lessons, sessions"]
      graphify["graphify-out/<br/>code knowledge graph"]
    end
  end

  tscore -->|"imported as @ethergrove/core"| web
  web -->|"built bundle loaded by"| desktop
  tscore -.->|"recorded fixtures prove parity"| gdcore
  gdcore --> godot
  scripts -.->|"runs lint, tests, builds"| repo
  brain -.-> graphify
```

| Piece           | Tech                                        | Ships as                        | Future                     |
| --------------- | ------------------------------------------- | ------------------------------- | -------------------------- |
| `packages/core` | TypeScript, zod, Vitest, fast-check         | library used by the web game    | retired with the web game  |
| `apps/web`      | React 19, three.js, R3F, Zustand, IndexedDB | website on Vercel               | retired at Godot parity    |
| `apps/desktop`  | Electron, electron-updater                  | Mac and Windows installers      | wraps the web game for now |
| `apps/game`     | Godot 4.7, GDScript (typed), GUT tests      | desktop, desktop browser, Steam | **the main game**          |

## 2. Web game: the data flow

One direction, one rule: input becomes commands, commands go through the pure core, and everything else only
reads the result.

```mermaid
flowchart LR
  subgraph in["Input"]
    kb["Keyboard"]
    pad["Gamepad"]
    touch["Touch"]
  end

  kb --> mapper
  pad --> mapper
  touch --> mapper
  mapper["InputMapper<br/>→ Intents"] --> cmds["intentsToCommands"]

  cmds -->|"every 50 ms fixed step"| core

  subgraph pure["@ethergrove/core (pure, deterministic)"]
    core["applyCommand(state, cmd)<br/>→ { state, events }"]
    rng[("seeded mulberry32<br/>in state.rng")]
    core --- rng
  end

  core -->|"new state"| store["Zustand store"]
  core -->|"events"| bus["Event bus"]

  store --> scene["R3F scene<br/>tiles, crops, sky, weather"]
  store --> hud["React HUD and menus<br/>(DOM over canvas)"]
  bus --> fx["Particles, float text, shake"]
  bus --> audio["Audio<br/>AAC loop player"]
  bus --> ui["UI bridge<br/>overlays, toasts, tips"]
  bus --> save["Autosave"]
  save --> idb[("IndexedDB<br/>3 slots + backup")]
```

**Why it is built this way:** the core never touches the DOM, React or three.js (ESLint enforces it), and all
randomness is seeded. The same seed plus the same commands always produce the same game, which is what makes
the rules testable and portable to Godot.

## 3. Web game: one frame in time

```mermaid
sequenceDiagram
  autonumber
  participant R as requestAnimationFrame
  participant L as GameLoop (accumulator)
  participant I as Input
  participant C as core.applyCommand
  participant S as Zustand store
  participant V as Scene + HUD
  participant B as Event bus

  R->>L: frame (dt, clamped to 250 ms)
  loop while accumulator >= 50 ms
    L->>I: read intents
    I-->>L: commands
    L->>C: applyCommand(state, cmd)
    C-->>L: new state + events
    L->>S: set state
    L->>B: publish events
  end
  S-->>V: render latest state
  B-->>V: particles, sound, toasts
```

Frames longer than 250 ms are clamped, so a locked device never fast-forwards the day. One game day is
10 game minutes per 7 real seconds.

## 4. Inside the rules engine

```mermaid
flowchart TB
  cmd["Command<br/>tick, sleep, shipItem, till, plant, water, harvest, ..."] --> apply

  subgraph apply["applyCommand: one entry point"]
    direction TB
    dispatch["dispatch to a rule"] --> post["fixed post-pass"]
    post --> p1["prune quick slots"]
    p1 --> p2["milestones"]
    p2 --> p3["tutorial / lessons"]
  end

  subgraph systems["systems/"]
    cal["calendar"]
    bag["bag"]
    mov["movement"]
    tools["tools + stamina"]
    crops["crops"]
    wx["weather"]
    eco["economy"]
    day["day (end of day)"]
    inter["interact"]
    ms["milestones"]
  end

  subgraph data["data/ (const tables)"]
    d1["balance"]
    d2["crops"]
    d3["items"]
    d4["layouts"]
    d5["weatherTable"]
  end

  dispatch --> systems
  systems --> data
  apply --> out["{ state, events }"]

  subgraph saves["save/"]
    schema["zod schema validates every load"]
    migrate["migrate(): upgrades step by step"]
    repo["SaveRepository interface"]
  end
  out -.-> saves
```

**Overnight order** (pinned by tests): sell bin → crops grow → date and season deaths → weather → water →
stamina and gold.

## 5. Rendering stack (web game)

```mermaid
flowchart LR
  state["GameState"] --> instanced["Instanced tiles, grass, trees"]
  state --> sun["Time-of-day sun and sky"]
  state --> weather["GPU rain and snow"]
  instanced --> post
  sun --> post
  weather --> post
  subgraph post["Post-processing"]
    ao["N8AO (High tier)"] --> bloom["Bloom"] --> tone["AgX tone map"] --> grade["Seasonal grade"]
  end
  post --> canvas["WebGL canvas"]
  tier["Quality tier<br/>Low / Medium / High<br/>drops automatically on low FPS"] -.-> post
  tier -.-> instanced
```

## 6. Godot game (the main engine going forward)

The Godot project mirrors the TypeScript core as pure GDScript, then adds scenes on top.

```mermaid
flowchart TB
  boot["boot/boot.tscn<br/>main scene"] --> game

  subgraph game["apps/game"]
    direction TB
    subgraph gcore["core/ (RefCounted, no Node, no OS/Time calls)"]
      ac["apply_command.gd"]
      st["state.gd, new_game.gd"]
      sys["calendar, day, crops, bag, tools,<br/>weather, economy, interact,<br/>milestones, tutorial, grid, rng"]
      norm["json_norm.gd"]
      ac --> sys
      ac --> st
    end
    subgraph gsave["game/save/"]
      slots["save_slots.gd<br/>slots + migration 2 → 3"]
    end
    scenes["scenes, CharacterBody3D controller,<br/>combat, areas (M1 in progress)"]
    scenes --> ac
    scenes --> slots
  end

  subgraph tests["Proof it matches"]
    fixtures[("test/fixtures<br/>23 recorded scenarios")]
    gut["GUT tests<br/>(test/core, game, smoke)"]
    fixtures --> gut
    gut --> ac
  end

  ts["packages/core<br/>parityFixtures.test.ts"] -->|"pnpm game:fixtures<br/>records"| fixtures
```

Key Godot choices (from the [M1 spec](superpowers/specs/2026-11-03-m1-vertical-slice-design.md)):

- **GDScript only, fully typed.** C# is rejected because Godot 4 C# does not export to the web.
- **Renderer:** Forward+ on desktop at every tier; Compatibility for the web export.
- **Web export:** single-threaded, so no cross-origin isolation headers are needed.
- **No self-update code** in the Godot build.
- **Save v3 lives only in Godot.** Web saves (v2) come in through "Export save file" and migrate 2 → 3.

## 7. Keeping two cores honest (parity)

```mermaid
flowchart LR
  rule["Rule change in TypeScript"] --> fresh{"freshness test<br/>still passes?"}
  fresh -- "no" --> rec["pnpm game:fixtures<br/>re-record scenarios"]
  rec --> port["fix the GDScript port"]
  port --> gut["pnpm game:test<br/>GUT replays fixtures"]
  fresh -- "yes" --> gut
  gut --> ok["states and events match"]
```

Until the web game is retired, every Part 1 rule change lands in **both** languages
([decision 0020](../brain/decisions/0020-godot-core-port-parity.md)).

## 8. Desktop app and release

```mermaid
flowchart LR
  web["apps/web build<br/>(dist)"] --> electron
  subgraph electron["apps/desktop (Electron)"]
    main["main.ts<br/>custom app:// scheme<br/>(stable origin for saves)"]
    policy["policy.ts<br/>permissions, menu, headers"]
    updater["updater.ts<br/>checks GitHub Releases once per launch"]
    main --- policy
    main --- updater
  end
  electron --> builder["electron-builder"]
  builder --> mac["macOS .dmg"]
  builder --> win["Windows installer"]
  mac --> gh["GitHub Releases"]
  win --> gh
  gh -.->|"update available"| updater
```

The Godot build will replace this path (desktop exports and Steam). It contains no self-update code.

## 9. Quality gates and delivery

```mermaid
flowchart LR
  dev["Edit code"] --> hook["pre-commit hook<br/>fast gate ~10 s<br/>lint-staged + test guard"]
  hook --> pr["Owner pushes a PR"]
  pr --> ci["GitHub CI (pnpm checks, ~3 min)"]
  subgraph ci_jobs["CI: five required jobs"]
    j1["checks: ESLint, tsc, scripts tests,<br/>coverage, build, bundle size"]
    j2["e2e Chromium (2 shards)<br/>Playwright + axe"]
    j3["e2e WebKit"]
    j4["game: Godot 4.7.2, GUT, smoke boot"]
  end
  ci --> ci_jobs
  ci_jobs --> main["main"]
  main --> vercel["Vercel: apps/web/dist"]
  main --> rel["Tag vX.Y.Z: desktop.yml builds<br/>and publishes installers"]
```

| Layer                                       | Tool                                           |
| ------------------------------------------- | ---------------------------------------------- |
| Rules, invariants, determinism, a full year | Vitest + fast-check (core coverage ≥ 90%)      |
| Store, loop, input, saves, HUD, menus       | Vitest + Testing Library + fake-indexeddb      |
| Real game in browsers                       | Playwright + axe                               |
| Load time on a throttled profile            | Playwright against the production build        |
| Godot rules and parity                      | GUT, headless (`pnpm game:test`, `game:smoke`) |

## 10. Project memory

```mermaid
flowchart LR
  work["Each agent session"] --> hooks["Claude hooks + Husky hooks"]
  hooks --> brain["brain/<br/>decisions · lessons · sessions · inbox"]
  hooks --> kg["graphify update .<br/>graphify-out/graph.json"]
  brain --> briefing["Live briefing on every prompt"]
  kg --> briefing
  briefing --> work
```

## 11. Where things live

| I want to...                  | Look here                                                               |
| ----------------------------- | ----------------------------------------------------------------------- |
| Change a game rule            | `packages/core/src/systems/` **and** `apps/game/core/`                  |
| Change a number (price, rate) | `packages/core/src/data/balance.ts` and its GDScript twin               |
| Change how the web game looks | `apps/web/src/scene/`, `render/`, `ui/`                                 |
| Change controls               | `apps/web/src/input/`                                                   |
| Change saves                  | `packages/core/src/save/`, `apps/web/src/save/`, `apps/game/game/save/` |
| Change music or sound         | `apps/web/src/audio/`, `docs/audio/SOUNDTRACK.md`                       |
| Change the desktop shell      | `apps/desktop/src/`                                                     |
| Read why a decision was made  | `brain/decisions/`                                                      |
| Read the full designs         | `docs/superpowers/specs/`                                               |
