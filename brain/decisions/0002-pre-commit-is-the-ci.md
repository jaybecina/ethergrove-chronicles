# 0002 — The pre-commit hook replaces GitHub CI

- **Status:** accepted · **Date:** 2026-10-25 · **Evidence:** `.husky/pre-commit`, `scripts/checks.mjs`,
  commits `26152ff` (CI workflow removed) and `c2cd2ac` (all checks moved into pre-commit)

## Context

GitHub CI failures arrived after pushing, which cost round trips. The owner asked for every CI check to
run locally before code leaves the machine, and specifically in pre-commit, not pre-push.

## Decision

`.husky/pre-commit` runs lint-staged, then `node scripts/checks.mjs`: lint, typecheck, coverage, build,
the debug-hook check, the bundle size check, and e2e on Chromium and WebKit, with live progress.
`.github/workflows/ci.yml` was deleted.

## Consequences

- Every commit takes about 4 minutes and needs port 5199 free.
- Code merged on github.com, or committed with `--no-verify`, is not checked by anything.
- macOS is not Linux. The WebKit timing bug only showed on Linux CI
  ([[lessons/webkit-speed-test-sampling]]), so that class of bug can now go unseen.
