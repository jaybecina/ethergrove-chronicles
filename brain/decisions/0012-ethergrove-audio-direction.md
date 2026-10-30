# 0012 — Ethergrove audio: Rootsong, a style per area, lo-fi for cozy moments

- **Status:** accepted · **Date:** 2026-10-30 · **Evidence:**
  `docs/superpowers/specs/2026-10-30-ethergrove-audio-design.md`

## Context

After the rename to Ethergrove Chronicles, the unfinished orchestral soundtrack (uncommitted on
`feat/bgm-sound-effects`) was built around the old Hearth motif and covered only the farm. The owner asked for
orchestral, synth, bass or lo-fi music suited to a farm-life RPG, never hip-hop.

## Decision

- An audio bible sets the main theme, leitmotifs and a style for every area; later parts spec their tracks
  against it. Only the farm soundtrack is built now.
- The main theme is **the Rootsong** (wonder and mystery). The Hearth motif is retired and tests forbid it.
- **Each style has its place:** orchestral for title, seasons and story; lo-fi for home, night and rain; synth and
  bass for magic and the Gloam. Lo-fi rules (tempo, soft kit, no backbeat) are enforced by tests.
- The old studio engine, 4 season tracks, shop, 3 jingles and 22 SFX are kept and ported to a branch cut from the
  renamed `main`; title, home and night are rewritten and a rain track added.

## Alternatives rejected

- Composing every future area now: features don't exist yet, so tracks would likely be redone.
- A Settings choice between orchestral and lo-fi versions: double the music and the download.
- Lo-fi beats under every track: cozy and epic moments would sound alike.
- Committing the old work and merging `main` into it: would commit half-finished work first.

## Consequences

- Rain becomes its own track; the player's rain filter goes.
- The old uncommitted checkout stays as a backup until this lands; the owner decides when to discard it.
- Supersedes the chiptune choice (decision 0010, on the old branch).
