# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

All shared guidance lives in [AGENTS.md](AGENTS.md), which other coding agents read too. Edit it there,
not here, so the two never drift apart.

@AGENTS.md

## Claude Code specifics

- Work follows the project's own `lean-sdd` skill (`.claude/skills/lean-sdd/`): classify T0–T3, then
  specify → implement → verify with only the ceremony that tier needs. T3 reviews use the read-only
  `spec-reviewer` agent once, then `/code-review`. The Superpowers plugin is retired
  ([[decisions/0022-lean-sdd-replaces-superpowers]]).
- The pre-commit hook takes about 10 seconds; pass the message with `-m` or `-F <file>`. The full
  suite runs in GitHub CI on the owner's pull request. When you run `pnpm checks` yourself, give it a timeout of
  at least 600000 ms or run it in the background.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:

- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.
