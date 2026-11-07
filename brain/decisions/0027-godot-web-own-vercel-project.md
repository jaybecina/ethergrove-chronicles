# 0027 — The Godot web build deploys to its own Vercel project on every merge to main

- **Status:** accepted (owner chose "Auto-deploy on merge", 2026-11-07) · **Date:** 2026-11-07 · **Evidence:**
  `.github/workflows/godot-web.yml`, `scripts/exportGame.mjs` (`selectPresets`), `scripts/exportGame.test.mjs`

**Decision.** A GitHub Actions workflow (`godot-web.yml`) exports only the Godot Web preset
(`node scripts/exportGame.mjs Web`) on every push to `main` that touches the game, and deploys
`apps/game/build/web` to a **second** Vercel project with the Vercel CLI (pinned). The main site
(ethergrove-chronicles.vercel.app, the root `vercel.json`) stays the React web game until Godot reaches parity and
replaces it ([[decisions/0019-godot-main-no-phones]]). Decision number 0026 is kept for the AI-made character models'
licence exception named in `CREDITS.md`.

**Why.** The owner merged the new Godot villagers and expected them on the Vercel site, but Vercel builds only
`apps/web` and cannot run Godot. CI already downloads Godot 4.7.2 for the GUT tests, so the export can run there.
Rejected: committing the 71 MB export to git (bloats the repo on every change); a one-off manual deploy (goes stale);
pointing the main site at Godot now (the React game would disappear before Godot has its full farm loop).

**Consequences.**

- The owner creates the Vercel project once and adds `VERCEL_TOKEN`, `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as
  repository secrets; without them the workflow still exports (so a broken export shows) and skips the deploy.
- CI downloads the 4.7.2 export templates once (about 1 GB, cached) and keeps only the three web files.
- When Godot replaces the React game, the main domain moves to this project in Vercel's settings and `apps/web`,
  `apps/desktop` and the root `vercel.json` retire, with their own decision note.
