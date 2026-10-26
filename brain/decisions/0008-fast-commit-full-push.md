# 0008 — Fast checks on commit, every check on push

- **Status:** accepted · **Date:** 2026-10-26 · **Evidence:** `.husky/pre-commit`, `.husky/pre-push`,
  `scripts/checks.mjs` (`PLANS.commit`, `PLANS.push`, tested in `scripts/checks.test.mjs`)
- **Supersedes:** [[decisions/0002-pre-commit-is-the-ci]]

## Context

Running every check in pre-commit (0002) made each commit wait about 4 minutes, mostly for coverage,
the production build and e2e. The owner asked for the standard practice instead: a fast commit gate and
the full suite later. Measured on 2026-10-26: typecheck 3 s, every unit test 6 s, the `scripts/` tests
under 1 s, full lint 8 s; build and e2e make up the rest.

## Decision

- **pre-commit (~15 s):** test guard ([[decisions/0007-every-change-ships-a-test]]), lint-staged (ESLint
  and Prettier on staged files), then `checks.mjs commit`: typecheck, `scripts/` tests and every unit
  test. The whole unit suite runs, not just "related" tests, because it is only 6 s and picking tests
  by changed file misses dependents of shared modules.
- **pre-push (~3 min):** refuses a dirty tree, then `checks.mjs push`: lint, typecheck, `scripts/` tests,
  coverage, build, debug-hook check, bundle size, e2e on Chromium and WebKit. Code still never leaves
  the machine unchecked, which was the goal of 0002.
- **e2e runs with 2 workers** (`apps/web/playwright.config.ts`, also under `CI=true`). Measured
  2026-10-26 on a 10-core Mac: 1 worker took 3m 47s; 2 workers took 2m 29s, 2m 24s and 2m 31s, all 22
  tests passing, with no flakes or retries. Timing tests read simulated time
  ([[lessons/webkit-speed-test-sampling]]), so CPU contention does not skew them.
- Agents run targeted tests while working and `pnpm checks:commit` before the handoff (AGENTS.md,
  "Which checks to run while you work"), so they don't spend minutes and tokens on the full suite
  after each edit.

## Alternatives rejected

- Keep everything in pre-commit (0002): too slow for small commits.
- `vitest related` on staged files: saves under 6 s and can skip tests that depend on a shared module.
- Bring back GitHub CI as the full gate: CI failures after pushing were the round trips 0002 removed.
  It could return later as a second net (Linux WebKit, merges on github.com) without replacing pre-push.

## Consequences

- A commit can contain lint errors outside the staged files, a broken build or a failing e2e test;
  pre-push catches them before they leave the machine.
- Pre-push needs a clean tree (`git stash -u` first) and port 5199 free.
- Still no check for merges on github.com or `--no-verify`, and Linux-only bugs can go unseen
  ([[lessons/webkit-speed-test-sampling]]).
