# 0024 — Cinematic folk revision: low end, strums, swells, gypsy fights, human timing

- **Status:** accepted for a pilot (owner's listening pass pending) · **Date:** 2026-11-05 · **Evidence:**
  `docs/superpowers/specs/2026-11-05-soundtrack-cinematic-folk-design.md`

**Decision.** Keep the folk soundtrack of [[decisions/0023-outward-style-folk-soundtrack]] (place sets, leitmotifs,
Godot playback, retired church timbres) but change how it is voiced and played: an audible low register (contrabass,
cellos, big bass drum, timpani), strummed strumstick chords instead of constant 8th-note picking, string sections
that swell in and out for cinematic moments, Phrygian-dominant and Hungarian-minor colour in fights and towns, a
tavern boom-chuck for Lowmere, and humanised timing on every note. Built first as a pilot (`title`, `woods`,
`woodsFight`, `lowmere`, three UI sounds); the rest follows only after the owner listens.

**Why.** The owner said the restyle was "kinda far from Outward", which they hear as medieval, gypsy, bard and a little
cinematic. A like-for-like measurement (**verified**, same Web Audio analyser on 13 Outward tracks and 9 of ours)
found the gaps: Outward puts 10–52 % of its energy below 150 Hz, ours 2–5 %; one pitch class held 60–67 % of our
title and spring (an exposed lead over thin harmony); our towns were tambourine-dominated (73 % high-frequency
onsets); our fights were hits with gaps (18 dB loudness spread, Outward 7–8 dB); and Outward's fights and desert use
a flat-second semitone colour we never used. After the pilot: low end 15–19 % (title, Woods), 11.7 % (Lowmere, a
town; Outward's towns 10 %), fight spread 7 dB.

**Rejected.** Listening by ear alone (it missed once already); copying any Outward melody, rhythm or arrangement
(copyright, REQ-07); bringing back held string pads (the "church" cause) instead of swells that rest; downloading new
CC0 instruments (a hurdy-gurdy or lute would help, but no local, licence-verified pack exists; the fiddle's open
fifth stands in for the hurdy-gurdy drone).
