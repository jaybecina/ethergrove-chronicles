# Debugging: root cause before fix

1. **Reproduce.** Get a failing test, a `pnpm game:smoke`/`game:shot` run, an e2e, or exact steps. If you
   cannot reproduce it, say so and gather evidence; don't patch blind.
2. **Locate the subsystem.** `graphify query`/`explain` first, then read only the lines it points to.
3. **Trace the cause.** Follow the actual state and call path (core command → events → view). Check
   `brain/lessons/` and the AGENTS.md gotchas: many bugs here are known traps (Godot float JSON, `1` vs `1.0`,
   Zustand selectors, e2e input pacing).
4. **One hypothesis at a time.** Test it with the smallest experiment. After two failed fixes, stop and
   re-examine the assumptions instead of trying a third patch.
5. **Fix the cause, not the symptom,** with the smallest change. No unrelated refactor.
6. **Regression test** that fails without the fix (check it), then passes.
7. **Side effects.** Run the package suite when a shared module changed.
8. **Capture** a non-obvious root cause in `brain/lessons/`.

A flaky test is a bug too: find why it flakes; never retry, skip or weaken it to get green.
