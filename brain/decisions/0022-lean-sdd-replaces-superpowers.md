# 0022 — Lean SDD replaces the Superpowers plugin

- **Status:** accepted · **Date:** 2026-11-04 · **Evidence:** `.claude/skills/lean-sdd/SKILL.md`,
  `.claude/agents/spec-reviewer.md`, `CLAUDE.md`

**Decision.** The project-owned `lean-sdd` skill (`.claude/skills/lean-sdd/`) and one read-only agent
(`.claude/agents/spec-reviewer.md`) replace the Superpowers plugin, which the owner asked to uninstall. Work is
classified T0–T3; only T2–T3 write a spec, only T3 gets an independent agent review. — verified (files exist;
`claude plugin list` after removal)

**Why.** Superpowers injected its `using-superpowers` skill at every session start and told the agent to invoke
a skill on "a 1% chance", so even small changes went through brainstorming, a written plan and
subagent-driven development (an implementer plus spec and quality reviewer subagents per task). That cost far
more tokens than the risk of most changes. — inferred (from the plugin's skill text; no token measurement was made)

**Kept from Superpowers:** test first for logic, root cause before fix, evidence before claiming done, spec
before T2+ code, one review before handoff. Most of these were already in `AGENTS.md`; the skill points there
instead of repeating them.

**Rejected** (from a ChatGPT proposal, 2026-11-04):

- Always-loaded `.claude/rules/*.md` files and invented per-system gameplay rules: they would load every
  session and duplicate `AGENTS.md` and the specs.
- A master game spec and a `docs/features/` tree: duplicate the existing specs and break their links. The
  `docs/superpowers/` folder name stays.
- Three overlapping review agents: native `/code-review` covers code; one spec reviewer covers traceability.
- A metrics "validation framework": no baseline exists, so any claimed improvement would be made up.
- Ponytail integration: the plugin is not installed.

**Revisit** if T2–T3 work starts missing requirements or regressing; compare against the M1 plans.
