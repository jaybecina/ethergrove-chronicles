# 0009 — Fast pre-commit, every check in GitHub CI on the pull request

- **Status:** accepted · **Date:** 2026-10-26 · **Evidence:** `.husky/pre-commit`,
  `.github/workflows/ci.yml`, `scripts/checks.mjs` (`PLANS.commit`, `PLANS.all`), `scripts/checks.test.mjs`
- **Supersedes:** [[decisions/0008-fast-commit-full-push]] (and, through it, [[decisions/0002-pre-commit-is-the-ci]])

## Context

0008 moved the slow checks to pre-push, which still blocked every `git push` for about 3 minutes. The
owner asked for only two stages, pre-commit and pull-request CI, which is the common production setup:
fast local feedback, and the full suite on a clean machine before anything merges.

## Decision

- **pre-commit (~10 s):** test guard ([[decisions/0007-every-change-ships-a-test]]), lint-staged, then
  `checks.mjs commit`: typecheck, `scripts/` tests and every unit test.
- **No pre-push hook.**
- **GitHub CI** (`.github/workflows/ci.yml`) on every pull request, on pushes to `main` and by hand:
  - job `Lint, types, tests, build`: lint, typecheck, `scripts/` tests, coverage, build, debug-hook
    check, bundle size;
  - jobs `E2E (chromium)` and `E2E (webkit)` in parallel on Linux, `fail-fast: false`, uploading the
    traces of failed tests for 7 days.
  - Read-only token, a 15/20 minute timeout per job, and a newer push cancels the older run.
  - Actions at their current major versions: checkout v7, setup-node v7 (Node 24, pnpm cache),
    pnpm/action-setup v6, upload-artifact v7.
- **Branch protection (owner, in GitHub settings):** pull request required for `main`, with the three
  jobs as required checks.
- `pnpm checks` (plan `all`) runs the same steps locally. `checks.test.mjs` fails when a step is in the
  plan but not in `ci.yml`.

## Alternatives rejected

- Keep pre-push (0008): blocks every push, and checks the working tree rather than what is pushed.
- Slim pre-push (lint + build, ~20 s) in front of CI: cheaper round trips, but the owner wanted two
  stages only. Lint and typecheck failures now show up in CI rather than before the push; run
  `pnpm checks` by hand before a PR for certainty.
- One CI job for everything: slower, and a lint failure hides the e2e result.

## Consequences

- Pushes are instant. A failure in lint, the build or e2e arrives on the PR, a few minutes after
  pushing: the round trip 0002 removed, now accepted for speed.
- Bugs that only show on Linux WebKit ([[lessons/webkit-speed-test-sampling]]) are caught again.
- The visual baseline tests skip under `CI=true` and still run only by hand on macOS.
- Code merged without a PR, or before branch protection is turned on, is not checked.
