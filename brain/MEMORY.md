# Hearthvale memory

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
- Standing owner instruction: always follow best practices and standards (`AGENTS.md`, Working standard).
  — verified

## Where things are

- Architecture: `docs/ARCHITECTURE.md` (canonical, not repeated here)
- Specs and plans: `docs/superpowers/specs/`, `docs/superpowers/plans/`
- Agent rules and commands: `AGENTS.md`
- Code map: `graphify-out/GRAPH_REPORT.md` (generated; run `graphify update .`)

## Open threads

- Part 2A (town and villagers) is specced on branch `docs/part2a-spec`. Building it moves saves to v3 and
  retargets the `buySeeds` lesson to the town store (tutorial spec §9). — verified
- Background music choice is still open: CC0 tracks, generated original music, or licensed music. Never
  copies of existing game music. — verified (decision pending with the user)
- Deferred review minors for the tutorial are listed in [[sessions/2026-10-25]].

## Lessons worth knowing before you touch…

- …e2e timing tests: [[lessons/webkit-speed-test-sampling]]
- …R3F components and Zustand selectors: [[lessons/lesson-marker-render-loop]]
- …the e2e `boot()` helper: [[lessons/e2e-boot-aborted-textures]]
