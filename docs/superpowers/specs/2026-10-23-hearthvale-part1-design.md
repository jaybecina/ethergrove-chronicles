# Hearthvale — Part 1 Design: The Farm Loop

- **Date:** 2026-10-23
- **Author:** Jay Becina (with Claude)
- **Status:** Draft, awaiting review
- **Scope:** Part 1 of 5. Appendix A holds the story bible for the whole game.

---

## 0. Intent

**What we are building.** Hearthvale is an original 3D farming-life game for the browser that also plays well on phones. It is inspired by Harvest Moon (inherit grandpa's farm, live through seasons, grow crops, and later befriend a town, marry, and save the valley). It uses its own name, characters, and story. No Harvest Moon / Story of Seasons names, characters, or assets are used.

**Who it is for.** A portfolio showcase for a fullstack developer. It is not for sale for now.

**What success looks like.**
1. It wows someone within 10 seconds of opening the link: lighting, motion, and polish.
2. A reviewer who opens the repo sees clean architecture, strict TypeScript, and real tests.
3. It plays smoothly on desktop and on a mid-range phone, from one link, with no install.

**What the user said vs. what we assumed.**

| Decided by the user | Assumed (change if wrong) |
|---|---|
| Portfolio piece, no sale | Game name "Hearthvale" |
| 3D stylized, "PS3 feel", not pixel art | CC0 3D asset packs (KayKit, Quaternius, Kenney) |
| Angled follow camera that rotates in 90° steps | Vercel for hosting |
| Full farm loop in Part 1 | Time scale of 7 real seconds per 10 game minutes |
| Joystick + buttons on phone, WASD + Space/E on desktop, gamepad | Balance numbers in §3 |
| Web stack: Vite + React Three Fiber + pure TS core | |
| Phones later via an Expo shell hosting the web game | |
| Local save slots now, cloud saves later | |
| Full story bible written now (Appendix A) | |

## 1. Roadmap (whole game)

| Part | Content | Spec |
|---|---|---|
| **1 — Farm Loop** | Farm, tools, 8 crops, 4 seasons, weather, stamina, shipping, merchant cart, saves | this document |
| 2 — Town | Town map, 12+ NPCs, dialogue, friendship, shops, cloud saves (Supabase) | later |
| 3 — Story | Hearthstones, Kindlings, festivals, heart events, romance, marriage, journal pages, endings | later |
| 4 — More Life | Animals, mine, fishing, tool upgrades, house upgrades, greenhouse | later |
| 5 — Mobile | Expo app shell (iOS/Android) hosting the web build; haptics, notifications, EAS builds | later |

Each part gets its own spec, plan, and implementation cycle.

## 2. Architecture

### 2.1 Repository layout (pnpm workspace)

```
hearthvale/
  packages/
    core/                 # Pure TypeScript game rules. No DOM, no React, no three.js.
      src/
        state/            # GameState types, initial state factory
        commands/         # Command types + handlers (applyCommand)
        systems/          # time, calendar, farm, crops, weather, stamina, economy, movement
        data/             # crop table, item table, prices, weather tables (plain TS data)
        save/             # zod schema, migrations, SaveRepository interface
        rng.ts            # seeded PRNG (mulberry32)
        index.ts
      test/
  apps/
    web/                  # Vite + React 19 + React Three Fiber
      src/
        game/             # loop, store (Zustand), event bus, debug hook
        scene/            # R3F components: World, Terrain, Grass, Crops, Player, Sky, Weather, Water
        render/           # postprocessing, quality tiers, shaders
        input/            # keyboard, gamepad, touch joystick → Intents
        ui/               # HUD, menus, screens (React DOM overlay)
        audio/            # Howler wrapper, sound map
        save/             # IndexedDB SaveRepository adapter
      public/assets/      # compressed .glb, KTX2 textures, audio
      e2e/                # Playwright specs
  docs/
    superpowers/specs/
    ARCHITECTURE.md
  CREDITS.md
```

`apps/mobile` (Expo) is added in Part 5. It is not created in Part 1.

### 2.2 Core API

The core is deterministic. Given the same state, the same command sequence, and the same seed, it always produces the same result.

```ts
type Result = { state: GameState; events: GameEvent[] };

function createNewGame(opts: { seed: number; farmName: string; playerName: string }): GameState;
function applyCommand(state: GameState, cmd: Command): Result;
```

State is treated as immutable. Handlers return new objects (structural sharing via plain spreads; no Immer in core).

**Commands (Part 1):**

| Command | Payload | Effect |
|---|---|---|
| `tick` | `minutes: number` | Advance the clock; triggers pass-out at 26:00 (2 AM) |
| `move` | `dx, dz` (−1..1), `dtMs` | Move the player with tile collision; updates facing |
| `selectTool` | `tool` | Change the active tool |
| `selectQuickSlot` | `index` | Change the active quick item |
| `useTool` | — | Apply the active tool to the target tile |
| `useItem` | — | Plant seeds, or eat the active item |
| `interact` | — | Contextual: bin, bed, pond, cart, door |
| `shipItem` | `itemId, qty` | Move items from the bag into the shipping bin |
| `buyItem` | `itemId, qty` | Buy from the merchant cart |
| `sleep` | — | End the day → overnight processing |
| `moveBagItem` | `from, to` | Reorder the bag |
| `assignQuickSlot` | `slot, bagIndex` | Pin a bag item to the hotbar |

**Events (examples):** `toolUsed`, `tileTilled`, `cropPlanted`, `cropWatered`, `cropHarvested`, `cropDied`, `itemGained`, `staminaLow`, `exhausted`, `passedOut`, `dayStarted`, `seasonChanged`, `weatherChanged`, `goldChanged`, `shippingReport`, `milestoneReached`, `actionFailed` (with a reason such as `noStamina`, `canEmpty`, `bagFull`, `notEnoughGold`, `wrongSeason`, `cartClosed`).

Events drive sound, particles, haptics, and popups in the web layer. The core never knows about them.

### 2.3 Web data flow

```
Input devices → InputMapper → Intents → Command(s)
                                          ↓
                         Zustand store: dispatch(cmd) → core.applyCommand
                                          ↓
                         state  → R3F scene + React HUD (selectors)
                         events → EventBus → audio / FX / popups
```

- **Game loop:** an R3F `useFrame` accumulator runs a fixed 50 ms step. Each step sends a `move` with the current stick vector and a `tick` with the scaled game minutes. Rendering interpolates the player position between steps for smoothness.
- **Time scale:** 10 game minutes per 7 real seconds (configurable). The normal day runs 6:00–24:00 (about 12.6 real minutes); the player may stay up until 26:00 (2 AM) before passing out (§3.1). The clock freezes while a menu, shop, or dialog is open, and when the tab or app is hidden.
- **Store:** Zustand with slices: `game` (core state), `ui` (screen, open menu, settings), `session` (slot, dirty flag). The HUD uses fine-grained selectors so it re-renders only what changed.

### 2.4 Saving

```ts
interface SaveRepository {
  list(): Promise<SaveSlotSummary[]>;
  load(slot: SlotId): Promise<LoadResult>;   // ok | missing | corrupt(backupAvailable)
  save(slot: SlotId, data: SaveFile): Promise<void>;
  remove(slot: SlotId): Promise<void>;
}
```

- **Part 1 adapter:** IndexedDB (via the `idb` package) with 3 slots. Every write first copies the previous good save to `slot:backup`.
- **SaveFile** = `{ version, savedAt, playTimeMs, summary, state }`. It is validated with a zod schema on load. `migrations[version]` upgrades old saves step by step.
- **When it saves:** on `sleep` (the main save point), and an autosave when the page or app becomes hidden (`visibilitychange`). On an autosave the game resumes at the same time on load.
- **Export/import:** download and upload the save as a `.hearthvale.json` file (validated by the same schema).
- **Cloud (Part 2):** a `SupabaseSaveRepository` implements the same interface. No game code changes.

### 2.5 Error handling

| Failure | Behavior |
|---|---|
| WebGL unavailable | Friendly fallback screen with browser tips; no crash |
| WebGL context lost | Pause, show "Restoring graphics…", rebuild on `webglcontextrestored` |
| Save fails zod or migration | Offer to load the backup; never silently overwrite the corrupt slot |
| IndexedDB unavailable (private mode, quota) | Banner: "Progress can't be saved here." Game runs in memory; export still works |
| Asset fails to load | Retry ×2, then an error screen with a Reload button |
| Render or UI exception | Error boundaries around `<Canvas>` and each menu; the game state in the store survives |

## 3. Game Rules (Part 1)

All numbers live in `packages/core/src/data/` and are tuned there.

### 3.1 Calendar and time
- 4 seasons (Spring, Summer, Fall, Winter) × 28 days. The game starts on Year 1, Spring 1, 6:00.
- Weekday names cycle Mon–Sun (they feed shop hours later).
- **Sleep:** the bed in the farmhouse can be used at any time. Sleeping ends the day → overnight processing → 6:00 the next day.
- **Pass out:** reaching 26:00 (2 AM) while awake → you wake at home, lose 10% of gold (rounded down, capped at 1,000), and start the next day at half stamina.

### 3.2 Overnight processing (order matters; tested)
1. Sell the shipping bin contents → pending gold + `shippingReport`.
2. For each crop tile: if watered today (or it rained today) → grow one day; if not watered → no growth.
3. Advance the date. On a season change, kill crops not valid for the new season (`cropDied`).
4. Roll the weather for the new day (and tomorrow's forecast).
5. Dry all tiles; if the new day's weather is rain or storm, mark all tilled tiles as watered.
6. Restore stamina (full, or half after passing out). Credit the pending gold.
7. Untouched tilled soil without a crop has a 10% chance to revert to grass each night (keeps the farm alive).

### 3.3 Farm map
- 32 × 24 tile grid with fixed features: farmhouse (door + bed inside, entered as a separate small interior scene), shipping bin by the house, pond (refill point), merchant road at the east edge (cart spot), and fences on the boundary.
- The field area starts with seeded random obstacles: weeds ~30%, small rocks ~10%, stumps ~5%.
- **Tile kinds:** `grass`, `weed`, `rock`, `stump`, `tilled`, plus `water`, `building`, `fence` (blocked).
- Tilled tiles carry `{ watered: boolean, crop?: { id, day, stage, regrowing } }`.

### 3.4 Tools (always owned, on a tool belt)

| Tool | Stamina | Target | Effect |
|---|---|---|---|
| Hoe | 2 | grass | → tilled |
| Watering can | 2 | tilled tile | → watered; uses 1 of 20 charges. Used on the pond: refill (free) |
| Sickle | 1 | weed / mature crop | weed → grass + 1 Fiber; harvests a mature crop |
| Axe | 4 | stump | 3 hits → grass + 4 Wood |
| Hammer | 4 | rock / tilled | rock 2 hits → grass + 2 Stone; tilled → grass (undo) |

- The target tile is the tile in front of the player along the dominant facing axis.
- A harvest also works by hand: `interact` on a mature crop.
- Using a tool with no valid target still costs stamina (a swing in the air), like the genre does. This is a tunable flag.

### 3.5 Stamina
- Max 100, range clamped to 0–100.
- At ≤ 20: `staminaLow` (the HUD bar shakes). At 0: `exhausted`. Movement drops to 60% speed and tool use fails with `actionFailed(noStamina)`.
- Eating a crop restores stamina (see the table). Eating costs one item.

### 3.6 Crops

| Crop | Season | Seed cost | Days to mature | Regrow (days) | Sell | Eat (+stamina) |
|---|---|---|---|---|---|---|
| Turnip | Spring | 20 | 4 | — | 35 | 8 |
| Potato | Spring | 50 | 7 | — | 80 | 12 |
| Strawberry | Spring | 100 | 8 | 4 | 60 | 10 |
| Tomato | Summer | 50 | 9 | 3 | 60 | 10 |
| Corn | Summer | 150 | 12 | 4 | 50 | 12 |
| Melon | Summer | 80 | 11 | — | 250 | 20 |
| Pumpkin | Fall | 100 | 13 | — | 320 | 20 |
| Eggplant | Fall | 20 | 9 | 4 | 60 | 10 |

- One seed packet plants one tile.
- Visual stages: seed → sprout → young → mature (stages are mapped from the day count). Regrowing crops return to the "young" stage after harvest.
- Planting seeds out of season fails with `actionFailed(wrongSeason)`.
- Winter: no outdoor crops. Snow covers the field; the player clears obstacles for spring.

### 3.7 Items and bag
- **Bag:** 12 slots, stacks up to 99. Items: 8 seed packets, 8 crops, Fiber, Wood, Stone.
- **Hotbar (8 slots):** slots 1–5 are the tools; slots 6–8 are quick slots pinned to bag items.
- Material sell prices: Fiber 1, Wood 2, Stone 2. Materials are kept for building in Part 4.
- A full bag → harvesting or gathering fails with `actionFailed(bagFull)`, and the item stays on the tile.

### 3.8 Economy
- Starting gold 500, plus 6 Turnip seeds.
- **Shipping bin:** `interact` opens it; add any sellable item. Its contents are sold overnight (§3.2). Items can be taken back out until you sleep.
- **Merchant cart:** run by Sol (see Appendix A). Open 9:00–17:00, Spring–Fall, closed in storms and all of Winter. It sells the current season's seeds.
- Gold is never negative (tested).

### 3.9 Weather (seeded per day)

| Season | Sunny | Cloudy | Rain | Storm | Snow |
|---|---|---|---|---|---|
| Spring | 50% | 20% | 30% | — | — |
| Summer | 55% | 15% | 15% | 15% | — |
| Fall | 50% | 25% | 25% | — | — |
| Winter | 35% | 25% | — | — | 40% |

- Day 1 of every season is always sunny.
- Tomorrow's forecast is rolled one day ahead and shown in the HUD (always accurate in Part 1).

### 3.10 Milestones (Part 1)
- First tile tilled, first crop planted, first harvest, first shipment, 1,000 gold, 10,000 gold, all 8 crops harvested, survived a full year.
- On the **first harvest** a single Kindling (a small glowing spirit) appears briefly and floats toward the hills. It foreshadows the Part 3 story.

### 3.11 Intro
1. Black screen, a letter on parchment, typed text: grandpa's farewell letter (Appendix A).
2. The camera flies down from the hills over the overgrown farm at dawn and lands behind the player at the gate.
3. A one-line prompt teaches movement, then each tool the first time it is selected (contextual tips, dismissible, never repeated).
4. Skippable after the first view.

## 4. Look and Rendering

### 4.1 Art direction
"Warm painted 3D": stylized forms, soft saturated colors, Ghibli warmth, console-grade lighting. No pixel art, no photoreal faces.

### 4.2 Camera
- Perspective camera at ~50° pitch, follows the player with critically damped smoothing.
- Rotates in 90° steps, eased over 300 ms. Movement input is mapped relative to the camera yaw.
- Zoom: three steps on desktop (wheel with modifier / +/-); portrait phones use the farthest step by default.
- A gentle drift on the title screen.

### 4.3 Lighting and post
- Directional sun whose angle and color follow the game clock (keyframed ramps: dawn pink → noon white → sunset gold → night blue moonlight), plus a hemisphere sky light.
- Shadows: one directional shadow map that follows the camera target (2048 on High, 1024 on Low), with soft PCF.
- `@react-three/postprocessing`: SMAA, N8AO (High only), Bloom (emissive windows, lanterns, Kindling, sparkles), AgX tone mapping, a per-season and per-time color grade (LUT or curves), and a subtle vignette.
- Night: emissive windows and porch lanterns, and fireflies in summer.

### 4.4 World effects

| Effect | Approach |
|---|---|
| Grass | Instanced blades with a vertex-shader wind sway, tinted per season; trampled near the player |
| Trees | Vertex wind sway; seasonal leaf color; falling-leaf particles in fall; bare in winter |
| Rain / storm | GPU particle rain, wetter materials (lower roughness), puddle decals, lightning flashes + thunder in storms |
| Snow | Snowfall particles + a world-up snow mask in the shared material (`onBeforeCompile`), animated over 1 day at the start of winter |
| Water | Pond shader: fresnel, sky reflection, gentle normal-map ripples |
| Crops | Per-stage meshes; scale "pop" on stage change; harvest sparkle + floating "+1 Turnip" |
| Tool feedback | Dust on hoe, splash on water, chips on axe/hammer, camera micro-shake on hits |

### 4.5 Seasons at a glance

| Season | Palette | Signature |
|---|---|---|
| Spring | fresh greens, pink blossoms | petals drifting, blossom trees |
| Summer | deep greens, saturated sky | heat shimmer at noon, fireflies at night, storms |
| Fall | amber, red, gold | falling leaves, low golden light |
| Winter | blue-white, warm windows | snow cover, breath puffs, snowfall |

### 4.6 Assets
- CC0 sources: KayKit (Kay Lousberg), Quaternius, Kenney. Every asset is recorded in `CREDITS.md` with its source URL and license.
- Player: a rigged CC0 character with idle, walk, run, hoe, water, swing, and eat clips. Only the pack's own CC0 animation clips are used (no Mixamo); missing tool motions reuse the closest generic clip (e.g., "swing").
- Pipeline: `gltf-transform` → Meshopt geometry + KTX2 (UASTC/ETC1S) textures. Loaded with drei `useGLTF` + `KTX2Loader`, and preloaded behind the title screen.

### 4.7 Quality tiers
- **High** (default on desktop): all effects, 2048 shadows, DPR up to 2.
- **Low** (default on touch devices / low GPU): no N8AO, 1024 shadows, half grass density, DPR capped at 1.5.
- drei `PerformanceMonitor` steps down automatically when fps stays below 45 (High) or 28 (Low). A manual override is in Settings.
- Targets: 60 fps on desktop, 30–60 fps on a mid-range phone (e.g., an iPhone 12 or Pixel 6 class).

### 4.8 Audio
- Howler.js: a music loop per season (CC0), ambient beds (birds, cicadas, wind, rain), footsteps by surface (grass, dirt, wood, snow), and tool SFX.
- Audio unlocks on the first user gesture (mobile policy). Separate Music / SFX volume sliders.

## 5. UI and Controls

### 5.1 Screens
Title → Save Slots → (New: name your farmer + farm) → Intro → Game. In-game overlays: Pause (Bag, Calendar, Settings, Save & Quit), Shipping Bin, Merchant Cart, Morning Report, Sleep confirm, Milestone toast, Tutorial tip.

### 5.2 HUD (React DOM over the canvas)
- Top left: clock, date (Spring 3, Mon), season icon, weather icon, tomorrow's forecast.
- Top right: gold, with a count-up animation on change.
- Bottom left: stamina bar (shakes at ≤ 20, desaturates at 0).
- Bottom center: 8-slot hotbar; the watering can shows its charge ring.
- World-space: a glowing target-tile highlight + a contextual verb prompt ("Till", "Water", "Harvest", "Ship", "Sleep").

### 5.3 Input

| Intent | Touch | Keyboard / mouse | Gamepad |
|---|---|---|---|
| Move | virtual stick (left) | WASD / arrows | left stick |
| Use tool | big action button (icon follows the context) | Space | A |
| Interact / eat / plant | secondary button | F | X |
| Cycle tool / slot | tool button; swipe on the hotbar | 1–8, mouse wheel | LB / RB |
| Rotate camera | ⟲ ⟳ buttons; two-finger twist | Q / E | LT / RT |
| Menu / back | ☰ | Esc / Tab | Start / B |

- The secondary button resolves in this order: target is a bin / bed / cart / door / pond / mature crop → `interact`; else the active quick item is a seed and the target is tilled and empty → `useItem` (plant); else the active quick item is edible → `useItem` (eat).
- `InputMapper` merges all devices into one `Intents` snapshot per step. The most recently used device decides which button glyphs are shown.
- Touch: the joystick is custom-built on Pointer Events (no dependency), floating within the left 40% of the screen. Buttons are ≥ 56 px. Layout uses `env(safe-area-inset-*)`. Works in landscape and portrait. Haptics through `navigator.vibrate` where supported (Expo haptics in Part 5).
- Gamepad: Gamepad API polled each step, standard mapping.

### 5.4 Visual style of the UI
- Warm wood and parchment panels, thin gold edges, soft shadows. Fraunces (display) + Nunito (UI), self-hosted.
- Motion via Framer Motion: panels spring in, the hotbar selection glides, numbers count up.
- Detailed visual design is done with the frontend-design skill during implementation.

### 5.5 Accessibility
- Reduced-motion setting (also follows `prefers-reduced-motion`): no camera shake, softer transitions.
- Information never relies on color alone (icons + text).
- Text size setting (100 / 125 / 150%).
- All menus can be used with only the keyboard or gamepad; focus is visible; ARIA roles and labels are set on menus and HUD values.

## 6. Quality, Tests, and Standards

### 6.1 Tooling
- pnpm workspaces; Node 24; TypeScript 5.x with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- ESLint flat config: `typescript-eslint` (strict-type-checked), `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`. A boundaries rule: `packages/core` may not import DOM, React, or three.
- Prettier. Husky + lint-staged on pre-commit. Conventional Commits.
- Exact versions are pinned at scaffold time from the current stable releases.

### 6.2 Test strategy (TDD: test first)

| Layer | Tool | Coverage |
|---|---|---|
| Core rules | Vitest | every system in §3, including overnight ordering, season death, pass-out, cart hours |
| Invariants | fast-check | random command sequences: gold ≥ 0, stamina ∈ [0,100], bag stacks ≤ 99, grid size constant, determinism (same seed + commands ⇒ same state) |
| Save | Vitest + zod | round-trip equality, corrupt input → `corrupt`, migration fixtures per version |
| Web units | Vitest + Testing Library (jsdom) | HUD values, menus, shop flow, InputMapper (keys/pad/touch → intents) |
| E2E | Playwright | Golden path: new game → till → plant → water → sleep ×4 → harvest → ship → sleep → gold increased → reload → continue matches |
| Devices | Playwright projects | Chromium, WebKit, Pixel 7 + iPhone 14 emulation |
| Accessibility | `@axe-core/playwright` | Title, slots, pause, shop, bin: zero serious/critical violations |
| UI visuals | Playwright screenshots | menus and HUD only (canvas masked) |

- **Coverage gate:** `packages/core` ≥ 90% lines and branches, or CI fails.
- **Debug hook:** when `import.meta.env.VITE_E2E === 'true'`, the app exposes `window.__hearthvale` with `setSeed`, `skipMinutes`, `getState`, `dispatch`. It is excluded from production bundles (checked by a build test).

### 6.3 Performance budgets
- Initial JS ≤ 500 KB gzipped (three.js included); asset loading starts after the title screen renders. Enforced with `size-limit` in CI.
- Playable within 5 s on a throttled mid-range phone profile (Playwright + CPU/network throttling, Chromium only; reported, not gating, in Part 1).

### 6.4 CI and deployment
- GitHub Actions: install → lint → typecheck → unit (with coverage) → build → size-limit → e2e (Chromium + WebKit).
- Deploy to Vercel: production on `main`, preview per PR.

### 6.5 Documentation
- `README.md`: pitch, GIF, live link, controls, scripts, architecture diagram.
- `docs/ARCHITECTURE.md`: core/web boundary, command flow, save design.
- `CREDITS.md`: every third-party asset and its license.

## 7. Definition of Done (Part 1)

1. A player can play through a full year (Spring 1 → Winter 28) on desktop and on a phone.
2. They can clear land, use all 5 tools, grow and harvest all 8 crops, ship goods, earn gold, and buy seeds from the cart.
3. Every weather type and all 4 season looks are visible in play.
4. Saving on sleep, autosave on hide, 3 slots, backup recovery, and export/import all work.
5. Keyboard, gamepad, and touch all work; the a11y checks pass.
6. All CI stages are green; core coverage ≥ 90%; bundle within budget.
7. It is deployed to a public Vercel URL.

## 8. Out of Scope (Part 1)

Town and NPCs, dialogue, friendship, festivals, romance, animals, mining, fishing, tool and house upgrades, cloud saves and login, the Expo app, localization, key rebinding, multiplayer.

---

## Appendix A — Story Bible (whole game)

### A.1 Logline
A burned-out city worker inherits grandpa's overgrown farm in a fading valley, wakes the spirits of a dying ancient tree, and has three years to rekindle it before a resort company buys the valley.

### A.2 Premise
- **The player** (named by the player, any gender) works an exhausting city job. A letter arrives: grandpa has died and left them the farm in Hearthvale.
- **Grandpa's letter (intro text, draft):** "If you're reading this, the farm is yours. It's gone wild, I know. So did I, for a while. Plant something. Then plant something else. The valley remembers people who stay. — Grandpa Elias"
- **Hearthvale** is a small valley town with fields, a forest, a mine, and an old pier. At its heart stands the **Hearth Tree**, which is slowly dying. Since it began to fade, the winters have grown harsher, harvests poorer, and young people have left.
- **Grayline Holdings** wants to buy the whole valley and build a luxury resort. The mayor gives the town three years to prove it can survive on its own.

### A.3 The Kindlings
Small glowing spirits that live in the Hearth Tree. They have been asleep for years. As the player restores life to the valley, Kindlings wake (one per milestone) and help: watering a few crops on sick days, pointing to journal pages, or guiding the player to festivals. Each has a name and a tiny personality (Ember, Sprig, Tumble, Hush, Glim, ...).

### A.4 The goal: five Hearthstones (3 years)
Five stones around the Hearth Tree, each dark. Each one relights when its condition is met:

| Stone | Theme | Condition (draft) |
|---|---|---|
| Field | farming | Ship every crop type; reach a farm rating |
| Herd | animals | Raise 4+ animals to max happiness |
| Forge | mining | Reach the mine's bottom floor; help Hilda reforge the town bell |
| Tide | fishing | Catch 20 fish species; rebuild the old pier with June |
| Heart | community | Reach 5 friendship hearts with 10 townsfolk; attend every festival in a year |

### A.5 Grandpa's journal (the twist)
Twelve torn journal pages are hidden across the valley (in the mine, under the pier, at festival prizes, in heart events). Together they reveal:
- Decades ago, Elias made a pact with the Hearth Tree: he would tend the valley for life, and the Tree would keep the seasons gentle.
- His son, **Victor Hale**, hated the farm, left for the city, and never came back.
- The final page shows that Victor is now the CEO of Grayline Holdings, and the player's uncle. He wants the valley gone because it took his father from him.
- The last confrontation is not a fight. With enough stones lit, the player can bring Victor to the Hearth Tree during Star Night, where the Kindlings show him his father's memories.

### A.6 Main cast

**Marriage candidates (any player may marry any of them):**

| Name | Role | Tie to the stones | Arc in one line |
|---|---|---|---|
| Mira | herbalist, the clinic's apprentice | Field | Learns to trust her own remedies over old books |
| Theo | blacksmith's son | Forge | Wants to leave the valley; finds a reason to stay |
| June | fisher who runs the old pier | Tide | Fights to save the pier her mother built |
| Rowan | rancher, gruff but gentle | Herd | Lets people back in after losing his family's herd |
| Celeste | Grayline surveyor sent to appraise the valley | Heart | Torn between her job and the town she starts to love |
| Sol | traveling merchant (runs the cart in Part 1) | Heart | A wanderer who has never had a home |

**Townsfolk (non-romance, examples):** Mayor Bram (worried and kind), Granny Fern (keeper of Kindling lore and grandpa's old friend), Hilda (blacksmith, Theo's mother), Doc Aldous (clinic), Pip and Wren (kids who believe in Kindlings), Old Marlow (retired fisherman).

### A.7 Romance flow
Gifts and daily talks build hearts (0–10). Heart events trigger at 2 / 4 / 6 / 8 / 10. A blue Kindling feather (found after relighting 2 stones) lets you propose at 10 hearts. The wedding takes place under the Hearth Tree. A child is born in the following year, and the spouse gets new daily routines.

### A.8 Festivals (2 per season)

| Season | Day | Festival |
|---|---|---|
| Spring | 1 | Seed Blessing: the town blesses the first seeds |
| Spring | 23 | Flower Dance: ask someone to dance |
| Summer | 8 | Sun Day at the lake: swimming race |
| Summer | 24 | Fireworks over the pier |
| Fall | 16 | Harvest Fair: crop judging contest |
| Fall | 27 | Lantern Night: lanterns for those who passed (grandpa scene) |
| Winter | 24 | Star Night: gifts, the Kindlings glow brightest |
| Winter | 28 | Year's End bonfire |

### A.9 Endings (end of Year 3; play continues after)
- **Rekindled** (5 stones): the Tree blooms, winters soften, Victor reconciles and cancels the deal, the town grows again.
- **Holding On** (3–4 stones): Grayline backs off for now; the Tree lives but is weak; a bittersweet epilogue.
- **Sold** (0–2 stones): the resort is approved, but the farm is protected by grandpa's deed; the player can still relight the stones in later years for a late Rekindled ending.
- Each ending adds an epilogue for the spouse (if married) and for each candidate.

### A.10 What Part 1 uses from this bible
The intro letter, the overgrown farm, Sol as the merchant, and a single Kindling glimpse on the first harvest. Everything else is built in Parts 2–4.
