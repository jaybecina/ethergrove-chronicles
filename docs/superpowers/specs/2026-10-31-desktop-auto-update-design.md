# Ethergrove Chronicles: Desktop Auto-Update

**Status:** approved in conversation, awaiting written-spec review · **Date:** 2026-10-31 · **Author:** Jay Becina
(with Claude) · **Builds on:** the desktop spec (`2026-10-31-ethergrove-desktop-design.md`),
[[decisions/0014-desktop-electron]] · **Branch:** `feat/desktop-auto-update` (cut from `main` after
`feat/graphics-presets` merges)

The owner wants installed desktop apps to update themselves after a release, without reinstalling by hand. The
repository is public (checked 2026-10-31), so the app can read GitHub Releases with no token. The owner has no
Apple Developer ID yet and will buy one later; the design must switch the Mac to silent updates the day the
signing secrets are added, with no code change.

This is the second of the three specs split from the owner's graphics request: presets (built), this one, then
path-traced photo mode.

---

## 1. Goal and success criteria

1. Pushing a tag `v<version>` that matches `apps/desktop/package.json` publishes one public GitHub Release with
   the Mac `.dmg` and `.zip` (arm64 and x64), the Windows `.exe`, and the update manifests (`latest.yml`,
   `latest-mac.yml`). A tag that doesn't match, or that points at a commit not on `main`, publishes nothing.
2. An installed Windows app (0.2.0 or later) finds a newer release on launch, downloads it in the background,
   tells the player it will install on close, and opens on the new version after the next quit and relaunch.
3. An installed Mac app built **without** a Developer ID shows a "new version available" dialog whose Download
   button opens the release page. It downloads nothing.
4. A Mac app built **with** the Developer ID secrets behaves like Windows (2). No code change is needed.
5. The game never restarts by itself mid-play, and saves and settings survive every update.
6. Offline, or with GitHub unreachable, the game starts and plays exactly as today, with no error shown.
7. Every change ships with tests (§7).

## 2. Releasing (owner's steps)

1. In a PR, bump `version` in `apps/desktop/package.json` (for example `0.1.0` → `0.2.0`). Merge it.
2. `git tag v0.2.0 && git push origin v0.2.0`.
3. The Desktop workflow publishes the release (~20 min). Nothing else to do.

Version rules: semver, strictly increasing; the updater ignores a release whose version is not higher than the
installed one. The tag is the version with a leading `v`.

## 3. Workflow (`.github/workflows/desktop.yml`)

Triggers stay `workflow_dispatch` and `push: tags: ['v*']`. A manual run builds artifacts as today and never
publishes. Top-level `permissions: contents: read`; only the jobs below that need it get `contents: write`.

### 3.1 `release-guard` (tags only, `ubuntu-latest`, `contents: write`)

- `actions/checkout@v7` with `fetch-depth: 0`.
- `node scripts/releaseTag.mjs` (§6) fails unless `GITHUB_REF_NAME === 'v' + version`.
- `git merge-base --is-ancestor "$GITHUB_SHA" origin/main` fails the job when the tagged commit is not on `main`.
- Creates the draft once, so the two package jobs upload into one release (no duplicate-draft race):
  `gh release create "$GITHUB_REF_NAME" --draft --verify-tag --generate-notes --title "Ethergrove Chronicles ${GITHUB_REF_NAME#v}"`
  with `GH_TOKEN: ${{ github.token }}`.

### 3.2 `package` (matrix mac and win, as today)

- `needs: release-guard` on tag runs. On `workflow_dispatch` the guard is skipped
  (`if: startsWith(github.ref, 'refs/tags/v')` on the guard; `package` uses
  `if: ${{ !failure() && !cancelled() }}`).
- Steps unchanged up to the packaging step. Packaging runs `pnpm --filter desktop publish:<os>` on tags and
  `pnpm --filter desktop dist:<os>` otherwise, with the existing signing env plus
  `GH_TOKEN: ${{ github.token }}` on tags. Tag runs get `permissions: contents: write`.
- The artifact upload stays (14-day artifacts, useful for manual runs). The Mac artifact path adds
  `apps/desktop/release/*.zip`.

### 3.3 `publish` (tags only, `ubuntu-latest`, `contents: write`, `needs: package`)

`gh release edit "$GITHUB_REF_NAME" --draft=false --latest` with `GH_TOKEN: ${{ github.token }}`. It runs only
when both package jobs pass, so players never see a release with one OS missing. A failed run leaves a draft
the owner can delete by hand.

## 4. Packaging (`apps/desktop/electron-builder.config.mjs`, `package.json`)

- `publish: [{ provider: 'github', owner: 'jaybecina', repo: 'ethergrove-chronicles', releaseType: 'draft' }]`.
  electron-builder writes `app-update.yml` into the app from this.
- `mac.target`: `[{ target: 'dmg', arch: ['arm64', 'x64'] }, { target: 'zip', arch: ['arm64', 'x64'] }]`. The zip
  is what `latest-mac.yml` points at; the dmg stays the download for people.
- `extraMetadata: { ethergroveMacSigned: developerId }`: written into the packaged `package.json`, read at
  runtime (§5.1). `developerId` is the existing `Boolean(env.CSC_LINK)`.
- `apps/desktop/package.json` scripts:
  - `dist:mac`: `electron-builder --mac --config electron-builder.config.mjs --publish never`
  - `dist:win`: `electron-builder --win --config electron-builder.config.mjs --publish never`
  - `publish:mac`: same as `dist:mac` with `--publish always`
  - `publish:win`: same as `dist:win` with `--publish always`
- New runtime dependency (in `dependencies`, not `devDependencies`, so it is packaged):
  `"electron-updater": "6.8.10"` (exact; 6.8.11 and 6.8.12 are under two weeks old).
- Version stays `0.1.0` in this part; the owner bumps it to `0.2.0` for the first updater release.

## 5. The app (`apps/desktop/src`)

No preload and no IPC: everything runs in the main process, and the game in `apps/web` is untouched. No CSP
change (the renderer makes no new requests).

### 5.1 `policy.ts` additions

```ts
export type UpdateMode = 'install' | 'notify' | 'off';
export function updateMode(env: {
  platform: NodeJS.Platform;
  packaged: boolean;
  macSigned: boolean;
  disabled: boolean;
}): UpdateMode;
export const RELEASES_URL = 'https://github.com/jaybecina/ethergrove-chronicles/releases';
export function releasePageUrl(version: string): string; // `${RELEASES_URL}/tag/v${version}`
```

`updateMode`, in order: `!packaged || disabled` → `'off'`; `platform === 'win32'` → `'install'`;
`platform === 'darwin'` → `macSigned ? 'install' : 'notify'`; anything else → `'off'`.

`disabled` is `process.env.ETHERGROVE_NO_UPDATE === '1'` (a test and support escape hatch). `macSigned` is the
packaged `package.json`'s `ethergroveMacSigned === true` (missing or not a boolean → `false`).

### 5.2 `updater.ts` (new)

```ts
export interface UpdateDeps {
  mode: UpdateMode;
  currentVersion: string;
  updater: {
    autoDownload: boolean;
    autoInstallOnAppQuit: boolean;
    on(event: 'update-available' | 'update-downloaded', fn: (info: { version: string }) => void): unknown;
    on(event: 'error', fn: (err: Error) => void): unknown;
    checkForUpdates(): Promise<unknown>;
  };
  notify(title: string, body: string): void;
  ask(options: AskOptions): Promise<number>; // index of the clicked button
  openExternal(url: string): Promise<void>;
  log(message: string): void;
}
export function startUpdates(deps: UpdateDeps): void;
```

`AskOptions` is `{ type: 'info'; title: string; message: string; detail: string; buttons: string[]; defaultId: number; cancelId: number }`.

Behaviour of `startUpdates`:

- `'off'`: does nothing (no listener, no check).
- `'install'`: `autoDownload = true`, `autoInstallOnAppQuit = true`. On `update-downloaded`:
  `notify('Update ready', \`Ethergrove Chronicles ${version} installs when you close the game.\`)`, once per
  launch. It never calls `quitAndInstall`.
- `'notify'`: `autoDownload = false`, `autoInstallOnAppQuit = false`. A check only reads `latest-mac.yml`, so it
  should work on an ad-hoc-signed app (inferred from electron-updater's design, not yet run; §8 step 5 verifies
  it). On `update-available`, once per launch:
  `ask({ type: 'info', title: 'Update available', message: \`Ethergrove Chronicles ${version} is available.\`,
  detail: \`You have ${currentVersion}. Download the new version and drag it into Applications. Your saves and
  settings stay.\`, buttons: ['Download', 'Later'], defaultId: 0, cancelId: 1 })`. Button 0 →
  `openExternal(releasePageUrl(version))`; button 1 → nothing.
- Both live modes: `error` → `log(\`Update check failed: ${err.message}\`)` only, nothing shown. Then
  `checkForUpdates()` once, with its rejection caught and logged the same way.

### 5.3 `main.ts` wiring

- Before `app.whenReady()`: on `win32`, `app.setAppUserModelId('io.github.jaybecina.ethergrove')` (required for
  Windows toasts; equals `appId`).
- After the window's `ready-to-show`, wait 10 s (the game's first load comes first), then call `startUpdates`
  with: `mode` from `updateMode`, `currentVersion: app.getVersion()`, `updater: autoUpdater` from
  `electron-updater`, `notify` → `new Notification({ title, body }).show()` when `Notification.isSupported()`,
  `ask` → `dialog.showMessageBox(mainWindow ?? undefined, options).then((r) => r.response)`, `openExternal` →
  `shell.openExternal`, `log` → `console.warn`.
- `autoUpdater.logger = null` (no log file; nothing is sent anywhere but the GitHub request itself).
- `openExternal` is only ever called with `releasePageUrl(...)`; the existing navigation and window-open rules are
  unchanged.

## 6. Release tag check (`scripts/releaseTag.mjs`)

- `export function checkReleaseTag({ tag, version }): string | null` returns `null` when `tag === \`v${version}\``
  and `version` is semver `MAJOR.MINOR.PATCH` (digits only); otherwise an error message naming both values,
  e.g. `Tag v0.2.1 does not match apps/desktop/package.json version 0.2.0.`
- Run as a script, it reads `GITHUB_REF_NAME` and `apps/desktop/package.json`, prints the error to stderr and
  exits 1, or exits 0 silently.

## 7. Tests (write each first and watch it fail)

- `apps/desktop/src/policy.test.ts`: every `updateMode` row (unpackaged → off; disabled → off; win32 → install;
  darwin signed → install; darwin unsigned → notify; linux → off); `releasePageUrl('0.2.0')` exact URL.
- `apps/desktop/src/updater.test.ts` (new), with fakes recording calls:
  - off: no `on`, no `checkForUpdates`.
  - install: flags true/true; firing `update-downloaded` with `0.2.0` calls `notify` with the exact text; firing
    it twice notifies once; `ask` and `openExternal` never called.
  - notify: flags false/false; `update-available` → `ask` with the exact options; response 0 →
    `openExternal(releasePageUrl('0.2.0'))`; response 1 → no `openExternal`; a second event → no second `ask`.
  - error event and a rejected `checkForUpdates` → `log` called, nothing thrown, no `notify`/`ask`.
- `apps/desktop/src/builderConfig.test.ts`: the GitHub publish entry; mac targets dmg + zip;
  `extraMetadata.ethergroveMacSigned` false with `{}` and true with `{ CSC_LINK: 'x' }`. Update the existing
  first test's `mac.target` expectation.
- `scripts/releaseTag.test.mjs` (node:test): match → null; `v0.2.1` vs `0.2.0` → the message; `0.2.0` without
  `v` → error; `v0.2.0-beta` vs `0.2.0-beta` → error (pre-releases are out of scope).
- Desktop e2e (unpackaged, so `off`): unchanged and still passes with no network calls added.
- Not automatable here: a real update. §8 is the manual check for the first release.

## 8. First release checklist (manual, owner)

1. Merge this part. Bump to `0.2.0`, merge, tag `v0.2.0`. Check the release has 2 dmg, 2 zip, 1 exe, `latest.yml`,
   `latest-mac.yml` and `*.blockmap` files, and is not a draft.
2. Install `0.2.0` by hand on Windows and on the Mac (copies of `0.1.0` have no updater and never update).
3. Bump to `0.2.1`, merge, tag `v0.2.1`.
4. Windows: launch `0.2.0`, wait ~1 min, see "Update ready"; quit; launch. Windows Settings → Apps → Installed
   apps lists Ethergrove Chronicles `0.2.1`, and the farm from step 2 loads.
5. Mac: launch `0.2.0`, see "Ethergrove Chronicles 0.2.1 is available."; Download opens the `v0.2.1` page.

## 9. Docs

- README "Desktop app": a **Updates** paragraph (Windows updates on close; Mac shows a download prompt until the
  app is signed; the app asks GitHub for the latest version on launch, nothing else is sent) and a **Releasing**
  section with §2's steps.
- AGENTS.md "Desktop app": release by tag (§2); `updateMode` in `policy.ts`; draft → publish jobs; never call
  `quitAndInstall` (saves); `ETHERGROVE_NO_UPDATE=1`.
- `brain/decisions/0016-desktop-auto-update.md`: tag-triggered GitHub Releases; notify-only Mac until a
  Developer ID; rejected: every-merge releases (half-finished work ships), a PR as the feed (no downloadable
  files), a private feed (token in the app).

## 10. Risks and trade-offs

- Windows installers are unsigned: SmartScreen warns on the first manual install. Updates install without the
  prompt. Signing later needs only the existing `WIN_CSC_*` secrets.
- Unsigned Mac players reinstall by hand for each update. Accepted until the owner buys a Developer ID.
- Releases are public: anyone with the link can download the game. The repo is already public.
- A broken release reaches players on their next launch. The guard (tag on `main`) and the package jobs' tests and
  e2e reduce this; rollback is publishing a higher version with the fix (the updater never downgrades).
- The update check is the app's first network request. It goes only to GitHub, carries no player data, and fails
  silently offline.
