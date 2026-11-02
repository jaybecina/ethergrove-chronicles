# 0017 — Action RPG first: factions, the Rootblade and an open valley

- **Status:** accepted (spec approved, story locked 2026-11-03) · **Date:** 2026-11-03 · **Evidence:**
  `docs/superpowers/specs/2026-11-03-rootwake-arpg-story-design.md`

## Context

The owner wants Ethergrove to play as an Outward-style action RPG: monsters, bosses, a dark invasion, an
overpowered retired Grandpa and a mandatory light-or-dark faction choice (the principle of _Battle Realms_'
Kenji's Journey). They had ChatGPT analyse the Rootwake; this session filtered that analysis.

## Decision

- **Action RPG first**; the farm is the home base. Reverses the October spec §1.2 "life-sim is the heart".
- Mandatory faction choice: **the Rootwardens vs the Lantern Guild**, made by a deed in the Siege of Lowmere
  (Skyglass night), permanent.
- New antagonist **Guildmaster Maren Ashcombe**, Elias's old partner; boss at Frostvault floor 10 on both paths.
- Elias is **the Rootblade**; his journal pages teach five Rootblade forms; the Hollow Warden fights with them.
- A ~3-minute playable cold open as Elias the night he went down.
- A compact open valley of six zones; multi-day expeditions with camping.

## Alternatives rejected

- ChatGPT's Verdant Accord / Umbral Dominion: flat good-vs-evil, and leaves the existing Guild as a third wheel.
- ChatGPT's "Hollow King": a generic dark lord; clashes with the Hollow Warden and is close to _Hollow Knight_.
- "First Blade" as Elias's title: clashes with _Assassin's Creed Odyssey_'s "Legacy of the First Blade".
- Seven regions and kingdoms: too large for a solo developer with baked 2.5D backdrops.
- Day trips only: fights the open-world direction.

## Consequences

- The roadmap becomes the spec's §13 milestones M1–M6; the cold open lands in M2, the faction choice with
  Cinder Galleries in M4.
- The faction, `gloamStage` and Gloam burden fields go into the save in milestone M2 (with migrations), before
  their content in M4.
- Revision 2 (same day, after a second ChatGPT review) adds a vertical slice first (M1), Rootblade forms as
  context inputs outside skill slots, 30 skill points with respec, and the Long Surge: Elias chose the shrine
  while Anna died at the pier, which the Siege mirrors.
- Revision 3 adds the Rootstone rule: with all five Rootstones on the farm's shrine the binding holds from the farm
  (why Elias was trapped, and why the Bind ending keeps the game open); returned stones are sealed in the shrine's
  ward; on the Guild path the Rootwardens raise rootwalls, never patrols.
