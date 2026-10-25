# 0007 — Every source change ships with a test

- **Status:** accepted · **Date:** 2026-10-25 · **Evidence:** `scripts/testGuard.mjs`
  (+ `testGuard.test.mjs`), `.husky/pre-commit`, `.husky/commit-msg`, `scripts/brain/brainHooks.mjs`
  (`stopDecision`), `eslint.config.js` (focused-test rule)

## Context

The pre-commit checks only ran existing tests, so a change with no test passed green. The rock colour
fix (commit `6ce4c51`) shipped that way: nothing would catch rocks turning brown again. The owner asked
for new or updated tests to be required for every change, in the checks, ESLint and `AGENTS.md`.

## Decision

- **Commit guard (enforced):** `.husky/pre-commit` runs `scripts/testGuard.mjs` first. Each area with a
  staged source change must also have a staged test: core (`packages/core/src/**/*.ts` →
  `packages/core/{src,test}/**/*.test.ts`), web (`apps/web/src/**/*.ts(x)` → `apps/web/src/**/*.test.ts(x)`
  or `apps/web/e2e/*.spec.ts`), and scripts (`scripts/**/*.mjs` → `scripts/**/*.test.mjs`). Deletions,
  `.d.ts` files, CSS, docs and config are exempt.
- **Escape hatch:** `NO_TEST_REASON="…"` (at least 10 characters) lets the commit through, and
  `.husky/commit-msg` writes it into the message as a `No-Test:` trailer, so every exception is visible
  in `git log`.
- **Early warning:** the Claude Code Stop hook uses the same `checkTests` rule and asks the agent for the
  test before it finishes its turn, so the guard rarely has to reject a commit.
- **ESLint:** `.only` calls are errors in test and spec files, because a focused test skips the rest and
  still passes green.

## Alternatives rejected

- An ESLint rule for "has a test". ESLint sees one file at a time, not the commit, so it cannot know.
- Requiring a brand-new test file for every change. Tests live beside their module, so updating the
  existing test file is usually right. New files would scatter tests.
- Matching each source file to its own test file by name. Many tests cover several modules, such as
  the e2e flows and `fullYear.test.ts`, so per-area matching is the workable middle.
- A coverage threshold for the web app. It is worth considering later, but it measures lines run, not
  behaviour checked.

## Consequences

- The guard checks that a test was touched, not that it tests the change. Review and the
  "fails without the change" rule in `AGENTS.md` cover the rest.
- Pure-visual tweaks (a colour, a CSS value) still need either a small test or a written reason.
- `git commit --no-verify` still bypasses everything, as before.
