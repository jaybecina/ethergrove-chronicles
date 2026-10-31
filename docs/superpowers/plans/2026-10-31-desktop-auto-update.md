# Desktop Auto-Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Installed desktop apps update from tag-triggered GitHub Releases: silently on Windows (and on a signed
Mac), with a download prompt on an unsigned Mac.

**Architecture:** Pure rules (`updateMode`, `releasePageUrl`, `readMacSigned`) live in `apps/desktop/src/policy.ts`;
`apps/desktop/src/updater.ts` drives an injected updater, so both are unit tested without Electron. `main.ts` only
wires them to `electron-updater`, `Notification`, `dialog` and `shell`. The Desktop workflow gains a guard job
that creates a draft release, and a publish job that releases it once both OS builds pass.

**Tech Stack:** Electron 44, electron-builder 26.17.0, electron-updater 6.8.10, TypeScript (NodeNext ESM),
Vitest, node:test, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-31-desktop-auto-update-design.md`

## Global Constraints

- Branch `feat/desktop-auto-update`, cut from `main` after `feat/graphics-presets` merges. Don't commit or push
  (AGENTS.md); end with a ready-to-push handoff.
- `electron-updater` exactly `6.8.10`, in `apps/desktop` `dependencies`.
- Never call `quitAndInstall` anywhere. No preload, no IPC, no CSP change, no change to `apps/web`.
- Player-facing text exactly as spec §5.2 (`Update ready`, `Ethergrove Chronicles ${version} installs when you
  close the game.`, `Update available`, `Ethergrove Chronicles ${version} is available.`, the detail line,
  `Download` / `Later`).
- `RELEASES_URL = 'https://github.com/jaybecina/ethergrove-chronicles/releases'`; app user model id
  `io.github.jaybecina.ethergrove`.
- `electron-updater` is CommonJS: in NodeNext ESM import it as
  `import electronUpdater from 'electron-updater'; const { autoUpdater } = electronUpdater;`.
- Single tests: `pnpm --filter desktop exec vitest run src/<file>`; scripts: `node --test scripts/<file>`.

## Review Focus

1. A manual (`workflow_dispatch`) run of the Desktop workflow → builds artifacts but creates or publishes no release.
   Structure test in Task 5.
2. A tag on a commit that is not on `main` → the guard fails and nothing is uploaded. Structure test in Task 5.
3. A packaged `package.json` whose `ethergroveMacSigned` is missing, `"true"` (a string) or not an object → Mac is
   `notify`, never `install` (an unsigned app must never try Squirrel). Test in Task 1.
4. Mid-play update → nothing restarts the game; install happens on quit only. A source test that no desktop source
   file contains `quitAndInstall`, in Task 2.
5. Repeated `update-available` / `update-downloaded` events in one launch → one dialog / one notification. Test in
   Task 2.

---

### Task 1: Update rules in `policy.ts`

**Files:**
- Modify: `apps/desktop/src/policy.ts`
- Test: `apps/desktop/src/policy.test.ts`

**Interfaces:**
- Produces: `type UpdateMode = 'install' | 'notify' | 'off'`;
  `updateMode(env: { platform: NodeJS.Platform; packaged: boolean; macSigned: boolean; disabled: boolean }): UpdateMode`;
  `RELEASES_URL: string`; `releasePageUrl(version: string): string`;
  `readMacSigned(pkg: unknown): boolean` (true only when `pkg` is an object whose `ethergroveMacSigned === true`).

- [ ] **Step 1: Write the failing tests** — new `describe('updates (auto-update spec §5.1)')`:
  - `it.each` over rows `[platform, packaged, macSigned, disabled, expected]`:
    `['win32', false, false, false, 'off']`, `['win32', true, false, true, 'off']`, `['win32', true, false, false, 'install']`,
    `['darwin', true, true, false, 'install']`, `['darwin', true, false, false, 'notify']`, `['linux', true, false, false, 'off']`.
  - `releasePageUrl('0.2.0')` equals `'https://github.com/jaybecina/ethergrove-chronicles/releases/tag/v0.2.0'`.
  - `readMacSigned`: `{ ethergroveMacSigned: true }` → true; `{}`, `{ ethergroveMacSigned: 'true' }`, `null`, `'x'` → false.
- [ ] **Step 2: Run** `pnpm --filter desktop exec vitest run src/policy.test.ts` — Expected: FAIL (exports missing).
- [ ] **Step 3: Implement** per spec §5.1 order of rules.
- [ ] **Step 4: Run** the Step 2 command — Expected: PASS.

---

### Task 2: `updater.ts`

**Files:**
- Create: `apps/desktop/src/updater.ts`, `apps/desktop/src/updater.test.ts`

**Interfaces:**
- Consumes: `UpdateMode`, `releasePageUrl` (Task 1).
- Produces: `UpdateDeps`, `AskOptions` and `startUpdates(deps: UpdateDeps): void`, exactly as spec §5.2.

- [ ] **Step 1: Write the failing tests** — a `fakeUpdater()` that stores listeners by event, records
  `checkForUpdates` calls, and exposes `emit(event, payload)`; `deps()` builds `UpdateDeps` with `vi.fn()` for
  `notify`, `ask` (resolving a configurable index), `openExternal`, `log`, `currentVersion: '0.2.0'`.
  - `it('off never checks')`: no listeners, no `checkForUpdates`.
  - `it('install downloads quietly and says it installs on close')`: `autoDownload` and `autoInstallOnAppQuit`
    true; `checkForUpdates` called once; emit `update-downloaded` `{ version: '0.2.1' }` twice → `notify` called
    once with `('Update ready', 'Ethergrove Chronicles 0.2.1 installs when you close the game.')`; `ask` and
    `openExternal` not called.
  - `it('notify asks once and opens the release page on Download')`: flags false/false; emit `update-available`
    `{ version: '0.2.1' }` twice; `ask` called once with the exact spec §5.2 options (detail
    `'You have 0.2.0. Download the new version and drag it into Applications. Your saves and settings stay.'`);
    after the promise settles, `openExternal` called with `releasePageUrl('0.2.1')`.
  - `it('Later opens nothing')`: `ask` resolves 1 → `openExternal` not called.
  - `it('errors are logged, never shown')`: emit `error` `new Error('offline')` and make `checkForUpdates` reject
    with `new Error('dns')` → `log` called with `'Update check failed: offline'` and `'Update check failed: dns'`;
    no throw, no unhandled rejection, `notify` and `ask` not called.
  - `it('no desktop source restarts the game to install')`: read every `src/*.ts` that is not a test with
    `node:fs`; none contains `quitAndInstall`.
- [ ] **Step 2: Run** `pnpm --filter desktop exec vitest run src/updater.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `startUpdates` per spec §5.2. Use one boolean per launch for "already notified" and
  "already asked". Catch the `ask(...).then(...)` chain and log its errors the same way.
- [ ] **Step 4: Run** the Step 2 command — Expected: PASS.

---

### Task 3: Packaging and dependency

**Files:**
- Modify: `apps/desktop/electron-builder.config.mjs`, `apps/desktop/package.json`, `pnpm-lock.yaml`
- Test: `apps/desktop/src/builderConfig.test.ts`

**Interfaces:**
- Produces: packaged `package.json` field `ethergroveMacSigned: boolean`; scripts `dist:mac`, `dist:win`
  (`--publish never`), `publish:mac`, `publish:win` (`--publish always`).

- [ ] **Step 1: Write the failing tests**
  - In the first test, `c.mac?.target` equals
    `[{ target: 'dmg', arch: ['arm64', 'x64'] }, { target: 'zip', arch: ['arm64', 'x64'] }]`.
  - `it('publishes drafts to the GitHub repository')`: `c.publish` equals
    `[{ provider: 'github', owner: 'jaybecina', repo: 'ethergrove-chronicles', releaseType: 'draft' }]`.
  - `it('tells the app whether the Mac build is Developer ID signed')`:
    `builderConfig({}).extraMetadata` equals `{ ethergroveMacSigned: false }`;
    `builderConfig({ CSC_LINK: 'x' }).extraMetadata` equals `{ ethergroveMacSigned: true }`.
- [ ] **Step 2: Run** `pnpm --filter desktop exec vitest run src/builderConfig.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** spec §4 in the config. In `package.json`, set the four scripts and add
  `"dependencies": { "electron-updater": "6.8.10" }`; run `pnpm install` (lockfile updates).
- [ ] **Step 4: Run** the Step 2 command and `pnpm --filter desktop typecheck` — Expected: PASS.

---

### Task 4: Wire it into `main.ts`

**Files:**
- Modify: `apps/desktop/src/main.ts`
- Test: covered by Tasks 1–2 and the existing desktop e2e (unpackaged → `off`)

**Interfaces:**
- Consumes: `updateMode`, `readMacSigned` (Task 1); `startUpdates` (Task 2).

- [ ] **Step 1: Implement** per spec §5.3:
  - On `process.platform === 'win32'`, `app.setAppUserModelId('io.github.jaybecina.ethergrove')` at module top,
    after the `userData` test seam.
  - `readMacSigned` gets `JSON.parse(await readFile(path.join(app.getAppPath(), 'package.json'), 'utf8'))`,
    wrapped so a read or parse failure means `false`.
  - In `createWindow`'s `ready-to-show` handler, `setTimeout(() => { void beginUpdates(); }, 10_000)`, where
    `beginUpdates` builds `UpdateDeps` as spec §5.3 lists. `notify` checks `Notification.isSupported()` first.
    `autoUpdater.logger = null`. `disabled` is `process.env.ETHERGROVE_NO_UPDATE === '1'`.
  - Guard so `beginUpdates` runs once per process, even if a second window is ever created.
- [ ] **Step 2: Verify** `pnpm --filter desktop typecheck && pnpm --filter desktop test`, then
  `pnpm --filter desktop build && pnpm --filter desktop e2e` — Expected: all PASS; the e2e still reports no console
  errors.

---

### Task 5: Release tag check and workflow

**Files:**
- Create: `scripts/releaseTag.mjs`, `scripts/releaseTag.test.mjs`
- Modify: `.github/workflows/desktop.yml`

**Interfaces:**
- Produces: `checkReleaseTag({ tag, version }: { tag: string; version: string }): string | null`; CLI
  `node scripts/releaseTag.mjs` (reads `GITHUB_REF_NAME`, exits 1 with the message on stderr).

- [ ] **Step 1: Write the failing tests** (node:test, style of `scripts/testGuard.test.mjs`):
  - `checkReleaseTag({ tag: 'v0.2.0', version: '0.2.0' })` is `null`.
  - `{ tag: 'v0.2.1', version: '0.2.0' }` → exactly
    `'Tag v0.2.1 does not match apps/desktop/package.json version 0.2.0.'`.
  - `{ tag: '0.2.0', version: '0.2.0' }` and `{ tag: 'v0.2.0-beta', version: '0.2.0-beta' }` → non-null.
  - `test('the Desktop workflow publishes only tagged, guarded, complete releases')` reads
    `.github/workflows/desktop.yml` as text and asserts it contains: a `release-guard:` job with
    `if: startsWith(github.ref, 'refs/tags/v')`, `node scripts/releaseTag.mjs`,
    `git merge-base --is-ancestor "$GITHUB_SHA" origin/main`, `gh release create "$GITHUB_REF_NAME" --draft`;
    a `publish:` job with `needs: package` and `gh release edit "$GITHUB_REF_NAME" --draft=false --latest`; the
    `publish:${{ matrix.os }}` script used only under a tag condition; and no `--publish always` outside the
    `publish:*` scripts.
- [ ] **Step 2: Run** `node --test scripts/releaseTag.test.mjs` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the script per spec §6 and the workflow per spec §3:
  - `release-guard` (tags only, `fetch-depth: 0`, `contents: write`).
  - `package` with `needs: release-guard` and `if: ${{ !failure() && !cancelled() }}`. Two packaging steps, one with
    `if: startsWith(github.ref, 'refs/tags/v')` running `publish:<os>` with `GH_TOKEN`, one with the negation
    running `dist:<os>`. Job-level `permissions: contents: write`. The Mac artifact glob adds
    `apps/desktop/release/*.zip`.
  - `publish` (tags only, `needs: package`, `contents: write`).
- [ ] **Step 4: Run** `pnpm test:scripts` — Expected: PASS (all script tests).

---

### Task 6: Docs, full checks, local packaging dry run

**Files:**
- Modify: `README.md` (Desktop app: Updates and Releasing), `AGENTS.md` (Desktop app bullets per spec §9),
  `brain/MEMORY.md` (desktop line: link 0016)
- Create: `brain/decisions/0016-desktop-auto-update.md`

- [ ] **Step 1: Docs** — exact content per spec §9. The README Releasing section is spec §2's three steps
  verbatim. AGENTS.md also adds `ETHERGROVE_NO_UPDATE=1` and "never call `quitAndInstall` (saves)".
- [ ] **Step 2: Gate** — `pnpm lint`, `pnpm checks:commit`, `graphify update .` — Expected: PASS.
- [ ] **Step 3: Local dry run** — `pnpm desktop:mac`. Expected: `apps/desktop/release/` has two `.dmg`, two
  `.zip`, `latest-mac.yml` naming the zips with the current version, and nothing published (`--publish never`).
  In the arm64 `.app` under `apps/desktop/release/mac-arm64/`, `Contents/Resources/app-update.yml` exists, and
  `npx @electron/asar extract-file Contents/Resources/app.asar package.json` writes a `package.json` holding
  `"ethergroveMacSigned": false` (run it in the scratchpad, not the repo). `release/` is build output; leave it.
- [ ] **Step 4: Handoff** — the ready-to-push handoff, plus the spec §8 first-release checklist for the owner.
  Say plainly that no real update ran.
