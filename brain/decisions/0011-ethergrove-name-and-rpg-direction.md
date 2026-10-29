# 0011 — Ethergrove Chronicles: new name, own story, real-time RPG

- **Status:** accepted · **Date:** 2026-10-29 · **Evidence:**
  `docs/superpowers/specs/2026-10-29-ethergrove-chronicles-design.md`

## Context

The owner found the Hearthvale name already in use and the old story bible (Part 1 spec Appendix A) too
close to Harvest Moon: dead grandpa's farm, helper spirits, a company buying the town, a three-year
deadline. They asked for an original story mixed with a real RPG, Outward-style combat, and better frame
rates on phones.

## Decision

- The game is **Ethergrove Chronicles**. Saves and settings carry over from the `hearthvale` storage keys
  (spec §3.4); the save version stays 2.
- The story is **the Rootwake**: Grandpa is missing in the Heartdeep, the Gloam is the nightmare of the
  sleeping Veyl Rootsinger Isel, and five Deeps with bosses lead to the ending choice (spec §4).
- **XP levels 1–50 and skill trees, real-time Outward-style combat, never turn-based** (spec §6).
- **2.5D:** fixed camera, baked backdrops with depth, 3D characters and things that change, built only after
  a frame-rate profile (spec §7).
- **No town building.** Audio is out of scope until its own part (spec §8, §9).

## Alternatives rejected

- Moonlit Meadows, Whispering Roots: existing itch.io games. Rune & Reaper: close to RUNE/REAP and _Rune
  Factory_. Aethergrove: crowded "Aether" prefix.
- Starfall Frontier story: needs town building, which the owner rejected.
- Keeping the Hearth Tree story with a blight: least original.
- Turn-based combat; Outward's no-level progression (the owner wants XP levels).

## Consequences

- Every later part follows the spec's roadmap: renderer, Lowmere, combat and Mossdeep, Deeps 2–5, farm life,
  audio, phone app.
- The Part 2A town spec on `docs/part2a-spec` must be updated to this story and to 2.5D before it is built.
- The orchestral-audio work on `feat/bgm-sound-effects` will conflict with the rename in a few files
  (`AGENTS.md`, `brain/MEMORY.md`, the audio import lines) when both land.
