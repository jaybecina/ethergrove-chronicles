---
name: second-brain
description: Read and maintain Hearthvale's project memory in brain/ (decisions, lessons, sessions, inbox) together with the Graphify code graph. Use when starting work that needs project history ("why is it like this", "what did we decide"), after finding a root cause or making a design decision worth keeping, when the user says capture, recall, remember, review the brain, audit, or close the session, and before ending a long session.
---

# Second brain

`brain/` is Hearthvale's durable, human-readable project memory, kept in git. Markdown is the source of
truth. `graphify-out/` is a generated map over code and notes. Code and tests are the final truth: check any
remembered fact against them before acting on it.

Start every use by reading `brain/MEMORY.md`. It is the index.

## What runs automatically

Hooks do the routine part ([[decisions/0006-automated-second-brain]]). Session start loads `MEMORY.md`.
Every prompt gets a briefing with related notes and `graphify query` hits, and the map refreshes itself.
When a turn changed files but not `brain/` or `AGENTS.md`, the Stop hook asks for a capture: answer with
the **capture** mode below. The modes here are still for anything that needs judgement.

## Modes

Use the mode the user names. With no mode named, pick the one that fits the moment.

### recall: answer from memory, then verify

1. Read `brain/MEMORY.md`, then the linked notes that bear on the question.
2. For code questions, run `graphify query "<question>"` (or `graphify explain "<symbol>"`,
   `graphify path "<A>" "<B>"`) before grepping. If the graph is missing or stale (the built-from commit in
   `graphify-out/GRAPH_REPORT.md` differs from `git rev-parse HEAD`), run `graphify update .` first. It takes
   about 4 s and uses no LLM.
3. Open the cited source lines and confirm. Say which parts you verified and which come only from notes.

### capture: save something worth keeping

Capture only what a future session could not cheaply rediscover from the code: a decision and why it was
made, a bug's root cause, a non-obvious constraint, or a rejected alternative. Never capture command output,
chat summaries, or facts that the code already states plainly.

1. Search first (`grep -ril "<topic>" brain/`). Update the existing canonical note instead of adding a
   near-duplicate.
2. New decision → `brain/decisions/NNNN-kebab-title.md` from `templates/decision.md` (next free number).
   New root cause → `brain/lessons/kebab-title.md` from `templates/lesson.md`. Unsure where it goes →
   `brain/inbox/YYYY-MM-DD-topic.md`.
3. Cite evidence (paths, commits, tests) and mark the note **verified** or **inferred**.
4. If the fact is critical for every session, add one line to `brain/MEMORY.md` linking to the note.
5. If it is a hard rule for all agents, add one line to `AGENTS.md` too. Keep the story in the note.

### close: end of a work session

Write or append `brain/sessions/YYYY-MM-DD.md` from `templates/session.md`: what changed (with commits),
what was deferred, and follow-ups. Capture any new decision or lesson first. Update **Open threads** in
`MEMORY.md`. Then run `graphify update .`.

### review: tidy the brain

Empty `brain/inbox/` into proper notes, or delete items. Merge duplicates. Mark anything contradicted by the
code as **superseded** with a link to what replaced it; don't silently rewrite history. Keep `MEMORY.md`
under about 60 lines.

### audit: quality and safety check

For every note, check:

- Its evidence paths and commits still exist (`git cat-file -e <commit>`, `ls <path>`).
- Every `[[link]]` resolves to a file.
- Each claim is tagged **verified** or **inferred**.
- It contains no secrets or personal data.

Report problems as a list. Fix only what the user approves.

## Rules

- Never invent memories. If something is unknown, write "unknown" and what would settle it.
- No secrets, tokens, credentials, or personal data in `brain/`, ever. Notes are committed.
- Prefer links (`[[decisions/0003-…]]`, file paths) over copying text. Don't duplicate `docs/` or `AGENTS.md`.
- Notes are project artifacts: the user reviews them like code. Show what you wrote.
- Claude Code's own auto-memory is for preferences about working with this user. Project facts go in `brain/`.
