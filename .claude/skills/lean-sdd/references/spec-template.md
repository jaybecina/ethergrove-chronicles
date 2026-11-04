# <Feature name> — design

Date: YYYY-MM-DD · Tier: T2 | T3 · Status: draft | approved | built

## Purpose

<One paragraph: the player-facing goal and why it matters now.>

## Sources of truth

- <Spec section or decision this must follow, e.g. `2026-11-03-m1-vertical-slice-design.md` §5, [[decisions/0020-godot-core-port-parity]]>

## Requirements

- **REQ-01** <What the game must do, with exact names, numbers and player-facing text.>
- **REQ-02** …
- **NFR-01** <Performance, accessibility, save compatibility — only those that apply.>

## Non-goals

- <What this feature deliberately does not do.>

## Acceptance criteria

Each REQ maps to at least one AC. Write them so a test can check them.

- **AC-01** (REQ-01) Given <state>, when <action>, then <observable result>.
- **AC-02** (REQ-02) …

## Architecture (T3; one line for T2)

- Where the rules live (core vs nodes/UI), new or changed types and save keys, events.
- Boundaries kept: <e.g. combat does not read inventory directly; animation reads state, never writes it>.
- Save impact: none | version bump N → N+1 with migration and an old fixture.

## Risks and dependencies (T3)

- <Risk → mitigation.>

## Tasks

- [ ] **T1** <Test for AC-01, then the change> — files: `<path>`
- [ ] **T2** …
- [ ] **T3** Verify: <the checks and by-eye shots that prove every AC>

## Deviations

<Filled in during implementation: anything built differently from above, and why.>
