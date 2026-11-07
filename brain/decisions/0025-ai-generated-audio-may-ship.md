# 0025 — AI-generated music may ship; the soundtrack becomes cinematic orchestral with folk colour

- **Status:** accepted (pilot first; no take ships before the owner picks it) · **Date:** 2026-11-06 · **Evidence:**
  `docs/superpowers/specs/2026-11-06-soundtrack-cinematic-orchestral-design.md`, `docs/audio/soundtrack-prompts.md`

**Decision.** (1) Music made with an openly licensed text-to-music model (ACE-Step 1.5, MIT) may ship in the Godot game
as original game audio, with Steam's "pre-generated AI content" disclosure and a `CREDITS.md` line naming the model and
its licence. This amends [[decisions/0004-original-ip-cc0-only]], which covered third-party assets: the CC0-only rule
still holds for those. (2) The soundtrack direction changes from cinematic folk (a bard band with strings) to
**cinematic orchestral fantasy with folk instruments as colour** (about 65 / 25 / 10 orchestral, folk, ambient for
exploration), 2–3 minute exploration loops that develop their themes, and an intro-plus-loop-body cut. Supersedes the
bard and tavern parts of [[decisions/0024-cinematic-folk-revision]]; the low end, Phrygian-dominant fights, leitmotifs
and retired church timbres of [[decisions/0023-outward-style-folk-soundtrack]] stay. (3) The web game's audio stays as
it is until the web game retires ([[decisions/0019-godot-main-no-phones]]).

**Why.** The owner heard the folk renders and the AI pilot takes as a cheerful medieval bard band. Cause
(**inferred**, from the briefs, not yet re-measured): every prompt made folk the genre ("small live acoustic ensemble",
Lowmere's "bardic tavern lilt, boom-chuck"), and generators answer that with short repeated tunes over a busy rhythm.
Owner-supplied guidance asks for phrasing, instrument roles and dynamics instead of the words "cinematic orchestral"
alone, which many generators turn into trailer music. The owner approved this spec with the recommended answers on
2026-11-06.

**Consequences.**

- Shipping an AI take needs the owner's listening pick, `CREDITS.md`, the Steam disclosure and a re-read of the model's
  LICENSE at that time. Purely AI-generated audio may have weaker copyright protection than human-composed music
  (**inferred**, not legal advice); the owner accepted this.
- Prompts never name a game, composer, band, film or song; a script test enforces it (`scripts/audio/promptSheet.test.mjs`).
- The sampled studio (`apps/web/src/studio/`) is not removed, but it no longer produces the Godot soundtrack.

**Rejected.** Keeping folk as the foundation and only tuning it (the cause is the genre in the brief); pilot-only with
shipping blocked (the owner chose to ship if the takes pass); also shipping to the web now (the web budget is 1 MB a
track and the web game is retiring).
