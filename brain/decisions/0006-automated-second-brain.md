# 0006 — The second brain and code map update themselves

- **Status:** accepted · **Date:** 2026-10-25 · **Evidence:** `scripts/brain/hook.mjs`,
  `scripts/brain/brainHooks.mjs` (+ `brainHooks.test.mjs`), `scripts/brain/refreshGraph.mjs`,
  `.claude/settings.json`, `.husky/post-commit`, `.husky/post-merge`, `.husky/post-checkout`

## Context

The brain only grew when an agent remembered to run the second-brain skill, and the Graphify map only
refreshed when someone ran `graphify update .`. The owner asked for both to happen on every prompt and
every change, so answers always know the latest state, and for a standing "always follow best practices
and standards" instruction that never needs repeating.

## Decision

Claude Code hooks in `.claude/settings.json` call `node scripts/brain/hook.mjs <event>`:

- **SessionStart:** adds the standing rule, `brain/MEMORY.md` and inbox items older than 7 days to
  context, and refreshes the map if `GRAPH_REPORT.md` was built from a different commit than HEAD.
- **UserPromptSubmit (every prompt):** adds a live briefing: branch, last 5 commits, up to 8 uncommitted
  files, up to 5 brain notes that share the prompt's keywords, and the first 12 nodes of a 350-token
  `graphify query`. Takes about 0.35 s.
- **PostToolUse (Edit, Write, MultiEdit, NotebookEdit):** records the changed path in
  `.claude/.brain-state/<session>.json` (gitignored).
- **Stop:** also finds shell-made changes and commits through `git status` and `git diff`. If work files
  changed but nothing in `brain/` or `AGENTS.md` did, it blocks the stop once and asks the agent to
  capture a decision, a lesson or a new rule, or at least one session-log line. It refreshes the map
  after code changes.
- **SessionEnd:** deletes the session state and refreshes a stale map.

Husky `post-commit`, `post-merge` and `post-checkout` run `scripts/brain/refreshGraph.mjs`, so the map
follows HEAD for every agent and for the owner's own commits. Refreshes run detached with a 60 s lock
and do nothing if `graphify` is missing. Every hook exits 0 on error.

## Alternatives rejected

- Logging raw prompts and answers into `brain/`. Notes are committed, so this risks personal data, and
  the skill forbids chat summaries. The agent distils lessons instead.
- An LLM-judged (`type: "prompt"`) Stop hook. It costs tokens on every turn, and a file-change check
  is enough to know when a capture is due.
- `graphify hook install`. It writes to `.git/hooks`, which Husky's `core.hooksPath` bypasses.
- Running `graphify update` synchronously in hooks. It would add about 2 s to every turn.

## Consequences

- Turns that change files end with one extra capture pass, so session logs grow every working day.
  Prune them with `/second-brain review`.
- Changes to a file that was already dirty when the turn began, made only through the shell, are not
  seen. The next Edit-tool change or commit catches up.
- The briefing's note matching is plain keyword overlap. It can miss synonyms or list a loosely related
  note, so agents still read and verify.
- Other agents (Codex, Cursor) get the git-hook map refresh and the `AGENTS.md` rules, but not the
  Claude Code prompt briefing or the stop-time capture.
