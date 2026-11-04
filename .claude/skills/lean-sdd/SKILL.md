---
name: lean-sdd
description: Ethergrove's own spec-driven workflow (specify → implement → verify), sized by risk from T0 to T3. Use when starting any feature, gameplay change, bug fix or refactor in this repo, or when the user says spec, plan, lean-sdd, T2 or T3. Replaces the Superpowers brainstorm/plan/subagent flow.
---

# Lean SDD

One flow: **specify → implement → verify**, with only as much ceremony as the risk needs. The rules in
`AGENTS.md` (Working standard, test guard, checks, handoff) always apply; this skill does not repeat them.

## 1. Classify first (say the tier in one line)

| Tier            | What it is                                                         | Examples                                                                                                            |
| --------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **T0** tiny     | one obvious change                                                 | typo, one-line fix, a constant, a config value                                                                      |
| **T1** small    | a few files, behaviour is clear                                    | small UI tweak, minor rule change, multi-file bug with a known cause                                                |
| **T2** medium   | a new mechanic or flow                                             | a new enemy ability, an inventory feature, a new panel                                                              |
| **T3** critical | architecture, or anything that can lose data or break many systems | combat or AI architecture, saves and migrations, the loop, `GameState` shape, core character or progression systems |

When unsure between two tiers, take the higher one. Anything touching saves, `GameState` shape or the
fixed step is T3. Ask the owner only when the request itself is ambiguous (AGENTS.md, business analyst).

## 2. Per tier

- **T0:** read the code, make the smallest correct change, run the one test that covers it. No spec, no plan,
  no subagent.
- **T1:** state 2–5 acceptance criteria in the chat, implement with TDD (AGENTS.md, QA tester), run the
  targeted tests. No files in `docs/`.
- **T2:** write **one** spec file from `references/spec-template.md` at
  `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md` (requirements, ACs and the task checklist in the same
  file; no separate plan). Get the owner's OK on the spec, then implement task by task, ticking the
  checklist. Verify every AC.
- **T3:** as T2, plus the template's Architecture and Risks sections filled in, and a separate plan in
  `docs/superpowers/plans/` only when the work spans several sessions. After implementing, run **one**
  independent review (section 4). Record the decision in `brain/decisions/`.

Never brainstorm in rounds, never write a plan for T0–T1, never spawn a subagent per task.

## 3. Implement

- Follow the spec; if the code shows the spec is wrong or conflicts with an approved spec or decision, stop
  and tell the owner. Never change an approved requirement silently, and never invent features.
- Test first for rules and logic: write the test, watch it fail for the right reason, make it pass, then
  refactor only if needed. Visual-only, copy and config changes need no artificial test-first, but still
  follow the test guard (or a `NO_TEST_REASON`).
- Reuse what exists (`graphify query` first). No speculative abstraction, no new dependency without need,
  no unrelated refactor. Gameplay rules stay in the core (`packages/core`, `apps/game/core/`), separate from
  nodes, animation and UI.
- Bugs: follow `references/debugging.md`. Reproduce before you fix; never guess-and-patch.

## 4. Verify, then hand off

- Run the checks AGENTS.md lists for the change ("Which checks to run while you work"). Say what ran, the
  result, and what did not run. Never claim a pass you did not see.
- For T2–T3, go through each AC and say how it was proved (test name, e2e, screenshot or `pnpm game:shot`).
- Review, risk-based, at most once per change set:
  - T0–T1: none beyond your own diff read.
  - T2: native `/code-review` on the diff.
  - T3: the `spec-reviewer` agent (`.claude/agents/spec-reviewer.md`) with the spec path, then `/code-review`.
  - Re-review only after new changes. Fix real defects; push back on style-only findings.
- End with the ready-to-push handoff from AGENTS.md.

## Token rules

- Read the spec sections you need, not whole specs; quote `REQ-`/`AC-` ids instead of restating them.
- Don't re-discover what `brain/MEMORY.md`, the live briefing or this conversation already settled.
- One primary agent does the work. Subagents only for a T3 review or a genuinely wide read-only search.
- Keep progress notes to a line; report findings and results, not narration.
