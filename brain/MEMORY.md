# Ethergrove memory

The entry point to the project brain. Keep this page short: facts every session needs, each linking to
the note (or file) that proves it. Details live in the linked notes; code and tests are the final truth.

Status tags: **verified** (checked against the cited source) · **inferred** (reasoned, not yet checked).

## Critical facts

- Rules live in `packages/core`, pure and deterministic; the web app only draws them. — verified,
  [[decisions/0001-pure-deterministic-core]]
- Husky pre-commit runs fast checks (~10 s); GitHub CI runs every check on each PR and on `main`.
  No pre-push hook. — verified, [[decisions/0009-pre-commit-and-pr-ci]]
- Saves are version 2. v2 added `GameState.tutorial`; every shape change needs a migration. — verified,
  [[decisions/0003-tutorial-in-core-save-v2]]
- The game must stay original, and assets are CC0 only. — verified, [[decisions/0004-original-ip-cc0-only]]
- Vercel deploys from the root `vercel.json`, and the project's Root Directory must be empty. — verified,
  [[decisions/0005-vercel-builds-from-repo-root]]
- The brain and the code map update themselves: Claude Code hooks brief every prompt and ask for a capture
  after changes; git hooks refresh the map. — verified, [[decisions/0006-automated-second-brain]]
- Every source change ships with a test in the same area; the pre-commit test guard rejects commits
  without one unless `NO_TEST_REASON` is given. — verified, [[decisions/0007-every-change-ships-a-test]]
- Work is sized T0–T3 by the project's `lean-sdd` skill; Superpowers is retired. — verified,
  [[decisions/0022-lean-sdd-replaces-superpowers]]
- Standing owner instruction: always follow best practices and standards (`AGENTS.md`, Working standard).
  — verified

## Where things are

- Architecture: `docs/ARCHITECTURE.md` (canonical, not repeated here)
- Specs and plans: `docs/superpowers/specs/`, `docs/superpowers/plans/`
- Agent rules and commands: `AGENTS.md`
- Code map: `graphify-out/GRAPH_REPORT.md` (generated; run `graphify update .`)

## Open threads

- The 2.5D renderer bakes backdrops in the browser with `three-gpu-pathtracer` (WebGPU only, Playwright's full
  Chromium), keeps three.js for play, and likely needs an orthographic follow camera. — verified,
  [[decisions/0013-baked-backdrops-in-the-browser]]
- Desktop apps: Electron 44 wraps the unchanged web build in `apps/desktop` (`.dmg` arm64/x64, NSIS `.exe` x64);
  the web build and Vercel stay. Graphics tiers Low / Medium / High ([[decisions/0015-low-medium-high-presets]]). Unsigned until the owner buys
  certificates; auto-update by `v*` tag, silent on Windows and a download prompt on unsigned Mac
  ([[decisions/0016-desktop-auto-update]]); not yet run on a real low-end Windows laptop or M1 Air. — verified,
  [[decisions/0014-desktop-electron]]
- First frame-rate profile (M4, desktop): post-processing is ~80% of the frame and N8AO alone ~50%; pixel ratio
  2 → 1 saves 65%; shadows ~20%; grass and particles nothing measurable. No real-phone run yet. — verified,
  `docs/perf/2026-10-31-frame-rate-profile.md`
- The game is being renamed **Ethergrove Chronicles**, with a new story (the Rootwake), XP levels,
  Outward-style real-time combat and a 2.5D look. The rename is built on `feat/ethergrove-chronicles`,
  awaiting the owner's push; the owner renames the GitHub repo, Vercel project and local folder. —
  verified, [[decisions/0011-ethergrove-name-and-rpg-direction]]
- The game is now **action RPG first** (farm as home base): Rootwardens vs Lantern Guild chosen at the Siege of
  Lowmere, Guildmaster Maren Ashcombe, Elias the Rootblade, a six-zone valley and camping. Spec approved and story
  locked on `docs/rootwake-arpg`. — verified, [[decisions/0017-arpg-first-rootwake]]
- **Steam is a release target** (the Steam build is the Godot export, never self-updating; the Electron plan was
  superseded). — verified, [[decisions/0018-steam-release-target]]
- **Godot is the main engine; phones and tablets are not supported** (a friendly message instead; three.js and
  Electron retire at Godot parity; `packages/core` must be ported). — verified,
  [[decisions/0019-godot-main-no-phones]]
- The core is ported to GDScript in `apps/game/core/`; TypeScript stays the reference until the web game retires,
  parity is proved by Vitest-recorded fixtures replayed in GUT, and a Part 1 rule change lands in both. Godot saves
  are version 3. — verified, [[decisions/0020-godot-core-port-parity]]; spec
  `docs/superpowers/specs/2026-11-03-m1-vertical-slice-design.md`, plan
  `docs/superpowers/plans/2026-11-03-m1-plan1-godot-core-port.md`
- **M1 Plan 2 makes the Godot world playable** (farm, house, Lowmere and its four villagers, HUD, panels, lessons,
  saves, tiers; Title → World flow in `boot/main.tscn`) on `feat/m1-plan2-world`: views built in code from
  `GameSession`'s live state, synced on `state_changed`; `pnpm game:smoke` also runs a headless playthrough. —
  verified, [[decisions/0021-godot-world-structure]]; plan `docs/superpowers/plans/2026-11-03-m1-plan2-world-playable.md`
- Part 2A (town and villagers) is specced on branch `docs/part2a-spec`. Building it moves saves to v3 and
  retargets the `buySeeds` lesson to the town store (tutorial spec §9). The unbuilt Part 2A spec's "saves v3" now clashes
  with the Godot v3: Part 2A must take a different version number or be built in Godot on top of v3. — verified
- Audio is built on `docs/ethergrove-audio`, awaiting the owner's listening and push: the Rootsong main theme,
  orchestral / lo-fi / synth by area, never hip-hop; 9 tracks, 7 jingles, 22 SFX rendered by the studio from
  CC0 VSCO 2 samples. The old uncommitted audio in the main checkout is superseded. Never copies of existing game
  music. — verified, [[decisions/0012-ethergrove-audio-direction]]
- Deferred review minors for the tutorial are listed in [[sessions/2026-10-25]].

## Lessons worth knowing before you touch…

- …e2e timing tests: [[lessons/webkit-speed-test-sampling]]
- …e2e boots and SwiftShader frame rate (lean by default): [[lessons/e2e-swiftshader-frame-rate]]
- …e2e parallelism on CI: [[lessons/ci-e2e-one-worker]]
- …R3F components and Zustand selectors: [[lessons/lesson-marker-render-loop]]
- …the e2e `boot()` helper: [[lessons/e2e-boot-aborted-textures]]
- …agent token cost of tests (measure printed bytes first): [[lessons/test-output-tokens]]
