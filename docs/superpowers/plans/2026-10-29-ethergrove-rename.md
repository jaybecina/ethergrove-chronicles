# Ethergrove Chronicles Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for
> tracking.

**Goal:** Rename Hearthvale to Ethergrove Chronicles everywhere, and carry existing players' saves and
settings over without any action on their part.

**Architecture:** Mostly mechanical renames, plus two small carry-over units: a legacy settings read in
`apps/web/src/game/store.ts`, and a one-time `importLegacySaves` in a new `apps/web/src/save/legacyImport.ts`
called by `createIdbRepository` before its first read. No `GameState` change; save version stays 2.

**Tech Stack:** pnpm 10 workspace, Node 24, TypeScript strict, React 19, Vitest (+ `fake-indexeddb`),
`idb`, Playwright, node:test for `scripts/`.

**Spec:** `docs/superpowers/specs/2026-10-29-ethergrove-chronicles-design.md` §3 (read it first; §3.2 and
§3.3 are the exact tables this plan implements).

## Global Constraints

- Work only in the worktree `.claude/worktrees/ethergrove-chronicles` on branch `feat/ethergrove-chronicles`.
  Never touch the main checkout (uncommitted audio work on `feat/bgm-sound-effects`).
- **No audio work.** The only audio change is the import line in `apps/web/src/audio/install.ts`, `sound.ts`
  and `soundMap.ts`.
- **Never push. Commit only if the owner asked for commits in this conversation** (`AGENTS.md`). Each task's
  commit step is the exact command for the final handoff; run it only with that permission.
- Every staged source file needs a test in the same area (commit guard, `scripts/testGuard.mjs`).
- Write each new test first and watch it fail. No `.only`. No `any`.
- Full title: `Ethergrove Chronicles`. Short form in prose after the first mention: `Ethergrove`.
- Save version stays **2**. No core migration.
- Dated history docs keep their names and contents (spec §3.5); only the one-line note is added.
- Stop any preview or dev server on port 5199 before `pnpm checks`.

## Review Focus

1. **The player deletes every slot after the import:** old Hearthvale saves must not come back. (Task 3,
   test `runs once`.)
2. **Two tabs open at once:** both import; neither may overwrite a save the other already wrote. (Task 3,
   test `never overwrites an existing slot`, run twice in parallel.)
3. **A damaged legacy save:** it is copied as-is and loads as `corrupt` with the backup offer, as today, with
   no crash. (Task 3, test `copies a damaged save as-is`.)
4. **Storage that throws** (private mode, quota): settings carry-over and the save import never crash the
   game. (Task 2 test `survives blocked storage`; Task 3 test `writes the marker after a failed read`.)
5. **Both settings keys present** (a player who opened a preview build): the new key wins, the old key is
   removed. (Task 2 test `prefers the new key`.)

---

### Task 1: Package name `@ethergrove/core`

**Files:**

- Modify: `package.json` (`name`), `packages/core/package.json` (`name`), `apps/web/package.json`
  (dependency), every `apps/web` file importing `@hearthvale/core` (source, tests, e2e), `pnpm-lock.yaml`
  (regenerated), `AGENTS.md` (filter command, line ~136), `docs/ARCHITECTURE.md` (diagram label, line 9)

**Interfaces:**

- Produces: the workspace package `@ethergrove/core`; later tasks import from it.

- [ ] **Step 1: Rename the names.** Root `name` → `ethergrove-chronicles`; core `name` → `@ethergrove/core`;
      web dependency → `"@ethergrove/core": "workspace:*"`.
- [ ] **Step 2: Rewrite imports and living references:**

```bash
git grep -l "@hearthvale/core" -- apps packages scripts AGENTS.md CLAUDE.md README.md docs/ARCHITECTURE.md docs/agent-workflow.md \
  | xargs sed -i '' 's#@hearthvale/core#@ethergrove/core#g'
```

- [ ] **Step 3: Regenerate the lockfile:** `pnpm install`. Expected: `pnpm-lock.yaml` shows
      `'@ethergrove/core'`; no other dependency changes (`git diff pnpm-lock.yaml` touches only that name).
- [ ] **Step 4: Verify:** `pnpm typecheck && pnpm test`. Expected: both pass;
      `git grep -n "@hearthvale/core" -- apps packages scripts` prints nothing.
- [ ] **Step 5: Commit (only with permission):**

```bash
git add package.json packages/core/package.json apps/web/package.json pnpm-lock.yaml AGENTS.md docs/ARCHITECTURE.md $(git diff --name-only -- apps)
git commit -m "refactor(core): rename the package to @ethergrove/core" -m "First step of the Ethergrove Chronicles rename (spec §3.2)."
```

### Task 2: Settings key with carry-over

**Files:**

- Modify: `apps/web/src/game/store.ts:32-47` (`SETTINGS_KEY`, `loadSettings`)
- Test: `apps/web/src/game/store.test.ts`

**Interfaces:**

- Produces: `SETTINGS_KEY = 'ethergrove:settings'` and `LEGACY_SETTINGS_KEY = 'hearthvale:settings'`
  (module constants in `store.ts`, exported for tests).

- [ ] **Step 1: Write the failing tests** in `store.test.ts` (and change the two existing tests' key to
      `'ethergrove:settings'`):

```ts
describe('settings carry-over from Hearthvale', () => {
  beforeEach(() => localStorage.clear());

  it('moves old settings to the new key', () => {
    localStorage.setItem('hearthvale:settings', JSON.stringify({ musicVolume: 0.2 }));
    expect(createGameStore().getState().settings.musicVolume).toBe(0.2);
    expect(JSON.parse(localStorage.getItem('ethergrove:settings') ?? '{}')).toMatchObject({ musicVolume: 0.2 });
    expect(localStorage.getItem('hearthvale:settings')).toBeNull();
  });

  it('drops broken old settings and removes the old key', () => {
    localStorage.setItem('hearthvale:settings', '{not json');
    expect(createGameStore().getState().settings).toEqual(DEFAULT_SETTINGS);
    expect(localStorage.getItem('hearthvale:settings')).toBeNull();
  });

  it('prefers the new key', () => {
    localStorage.setItem('ethergrove:settings', JSON.stringify({ musicVolume: 0.9 }));
    localStorage.setItem('hearthvale:settings', JSON.stringify({ musicVolume: 0.1 }));
    expect(createGameStore().getState().settings.musicVolume).toBe(0.9);
    expect(localStorage.getItem('hearthvale:settings')).toBeNull();
  });

  it('survives blocked storage', () => {
    localStorage.setItem('hearthvale:settings', JSON.stringify({ musicVolume: 0.2 }));
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(createGameStore().getState().settings.musicVolume).toBe(0.2);
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run, expect FAIL:** `pnpm --filter web exec vitest run src/game/store.test.ts`
- [ ] **Step 3: Implement** in `store.ts`: `loadSettings()` reads `SETTINGS_KEY`; when it is missing, reads
      `LEGACY_SETTINGS_KEY` instead. Whenever the legacy key exists, remove it (inside `try`). When legacy
      settings parse, write them with the existing `saveSettings()`. Keep the known-keys filter and the
      `DEFAULT_SETTINGS` fallback as they are.
- [ ] **Step 4: Run, expect PASS** (same command).
- [ ] **Step 5: Commit (only with permission):**

```bash
git add apps/web/src/game/store.ts apps/web/src/game/store.test.ts
git commit -m "feat(web): move settings to ethergrove:settings, keep old ones" -m "Players keep their settings after the rename (spec §3.4)."
```

### Task 3: One-time import of Hearthvale saves

**Files:**

- Create: `apps/web/src/save/idbKeys.ts` (moved out of `idbRepository.ts` so the two save modules don't
  import each other), `apps/web/src/save/legacyImport.ts`
- Modify: `apps/web/src/save/idbRepository.ts:11-14,34,88` (import the keys, default names, call the import)
- Test: `apps/web/src/save/legacyImport.test.ts`

**Interfaces:**

- Produces in `idbKeys.ts` (moved verbatim from `idbRepository.ts`, plus one list): `STORE = 'saves'`,
  `SLOTS: SlotId[]`, `key(slot)`, `backupKey(slot)`, and
  `SLOT_KEYS: readonly string[]` = `['slot:1', 'slot:1:backup', 'slot:2', 'slot:2:backup', 'slot:3', 'slot:3:backup']`.
- Produces in `legacyImport.ts`:
  - `export const LEGACY_DB_NAME = 'hearthvale'`
  - `export const LEGACY_MARKER = 'meta:legacyImport'`
  - `export async function importLegacySaves(db: IDBPDatabase, legacyName = LEGACY_DB_NAME): Promise<void>`
    (never rejects)
  - `createIdbRepository(dbName = 'ethergrove', legacyName = LEGACY_DB_NAME)` and
    `isStorageAvailable(dbName = 'ethergrove')`

- [ ] **Step 1: Write the failing tests** in `legacyImport.test.ts` (`import 'fake-indexeddb/auto'`, unique
      database names per test like `idbRepository.test.ts`). Seed a legacy database with
      `openDB(name, 1, { upgrade: (d) => d.createObjectStore('saves') })` and `makeSaveFile(...)` files.
  - `copies slots and backups`: legacy has `slot:1`, `slot:1:backup`, `slot:3` → after
    `createIdbRepository(newName, legacyName).load(1)` is `ok` with the same file; `loadBackup(1)` is `ok`;
    `load(3)` is `ok`; `load(2)` is `missing`.
  - `never overwrites an existing slot`: new DB already has `slot:1` (gold 900), legacy `slot:1` has gold
    100 → `load(1)` gives gold 900. Run `importLegacySaves` twice with `Promise.all` first; the result is the
    same.
  - `runs once`: import, then `remove(1)` → a new `createIdbRepository(sameNewName, legacyName).load(1)` is
    `missing`; the store holds `LEGACY_MARKER` with `{ from: 'hearthvale', at: <string> }`.
  - `leaves no legacy database when none existed`: import with a legacy name never created →
    `(await indexedDB.databases()).map((d) => d.name)` does not contain it; the marker is written.
  - `copies a damaged save as-is`: legacy `slot:2` = `{ junk: true }` → `load(2)` is
    `{ kind: 'corrupt', backupAvailable: false }`.
  - `writes the marker after a failed read`: pass a legacy name whose database has no `saves` store (create
    it at version 1 with no stores) → the promise resolves, the marker is written, `console.warn` was called
    with `'Ethergrove: could not import Hearthvale saves'`.
  - `list() ignores the marker`: after import, `list()` has length 3.
- [ ] **Step 2: Run, expect FAIL:** `pnpm --filter web exec vitest run src/save/legacyImport.test.ts`
- [ ] **Step 3: Implement `importLegacySaves`** following spec §3.4 steps 1–6. Open the legacy database with
      `openDB(legacyName, 1, { upgrade(_db, oldVersion, _new, tx) { if (oldVersion === 0) tx.abort(); } })`;
      an `AbortError` means "no legacy saves". Copy each of `SLOT_KEYS` inside one `readwrite` transaction on
      the new store, putting only where `get` returns `undefined`. Close the legacy database in `finally`.
- [ ] **Step 4: Wire it in:** in `createIdbRepository`, the lazy `db()` becomes
      `open(dbName).then(async (d) => { await importLegacySaves(d, legacyName); return d; })`. Change both
      default database names to `'ethergrove'`. Existing `idbRepository.test.ts` tests pass unique names, so
      give them a unique `legacyName` too (`dbName() + '-legacy'`) so no test reads another's data.
- [ ] **Step 5: Run, expect PASS:** `pnpm --filter web exec vitest run src/save`
- [ ] **Step 6: Commit (only with permission):**

```bash
git add apps/web/src/save/idbKeys.ts apps/web/src/save/legacyImport.ts apps/web/src/save/legacyImport.test.ts apps/web/src/save/idbRepository.ts apps/web/src/save/idbRepository.test.ts
git commit -m "feat(web): import Hearthvale saves once into the ethergrove database" -m "Copies slots and backups without overwriting, never re-imports, never deletes the old database (spec §3.4)."
```

### Task 4: Debug hook `window.__ethergrove`

**Files:**

- Modify: `apps/web/src/game/debugHook.ts:22,37`, `apps/web/scripts/check-no-debug-hook.mjs:2,14`,
  `apps/web/e2e/helpers.ts:21-33`, every `apps/web/e2e/*.spec.ts` using `__hearthvale`
- Test: `apps/web/src/game/debugHook.test.ts`, `apps/web/src/build/debugHookCheck.test.ts`

**Interfaces:**

- Produces: `window.__ethergrove?: DebugHook` (same `DebugHook` type).

- [ ] **Step 1: Update the tests first.** In `debugHook.test.ts` replace `__hearthvale` with `__ethergrove`.
      In `debugHookCheck.test.ts` change the bundle fixture to `'window.__ethergrove={getState(){}}'` and add:

```ts
it('still flags the old Hearthvale hook name', () => {
  const dir = fakeDist({ 'assets/index.js': 'window.__hearthvale={}', 'index.html': '<html>' });
  expect(findDebugHook(dir)).toEqual(['assets/index.js']);
});
```

- [ ] **Step 2: Run, expect FAIL:**
      `pnpm --filter web exec vitest run src/game/debugHook.test.ts src/build/debugHookCheck.test.ts`
- [ ] **Step 3: Implement:** rename the global in `debugHook.ts`. In `check-no-debug-hook.mjs` match
      `/__ethergrove|__hearthvale/` and update the comment to `window.__ethergrove`.
- [ ] **Step 4: Update e2e:** `sed -i '' 's/__hearthvale/__ethergrove/g' apps/web/e2e/*.ts`. In
      `helpers.ts` set `'ethergrove:settings'` and delete both databases, `'ethergrove'` then `'hearthvale'`,
      each with the existing resolve-on-any-outcome pattern.
- [ ] **Step 5: Run, expect PASS:** the Step 2 command, then
      `cd apps/web && CI=true pnpm exec playwright test e2e/movement.spec.ts --project=chromium`.
- [ ] **Step 6: Commit (only with permission):**

```bash
git add apps/web/src/game/debugHook.ts apps/web/src/game/debugHook.test.ts apps/web/scripts/check-no-debug-hook.mjs apps/web/src/build/debugHookCheck.test.ts apps/web/e2e
git commit -m "refactor(web): rename the debug hook to window.__ethergrove" -m "The build check now rejects both the new and the old hook name."
```

### Task 5: Export file name

**Files:**

- Modify: `apps/web/src/save/fileIO.ts:13`
- Test: `apps/web/src/save/fileIO.test.ts`

- [ ] **Step 1: Write the failing tests:** change the expected name to
      `'ethergrove-elm-hollow-y1-spring1.ethergrove.json'`, and add `imports a file exported by Hearthvale`:
      the text of `exportSave(file)` imports to `{ ok: true, file }` (pins that import ignores the file name).
- [ ] **Step 2: Run, expect FAIL:** `pnpm --filter web exec vitest run src/save/fileIO.test.ts`
- [ ] **Step 3: Implement:** the template becomes
      `` `ethergrove-${farm || 'farm'}-y${year}-${season}${day}.ethergrove.json` ``.
- [ ] **Step 4: Run, expect PASS** (same command).
- [ ] **Step 5: Commit (only with permission):**

```bash
git add apps/web/src/save/fileIO.ts apps/web/src/save/fileIO.test.ts
git commit -m "feat(web): export saves as .ethergrove.json"
```

### Task 6: Player-facing text and the new letter

**Files:**

- Modify: `apps/web/index.html:7-8`, `apps/web/src/ui/screens/Title.tsx:34`,
  `apps/web/src/ui/screens/WebGLFallback.tsx:6`, `apps/web/src/ui/screens/SaveSlots.tsx:205`,
  `apps/web/src/ui/ErrorBoundary.tsx:18`, `apps/web/src/ui/screens/Intro.tsx:8`,
  `apps/web/src/scene/kenneyColors.ts:3`, `apps/web/e2e/a11y.spec.ts:22`, `apps/web/e2e/visual.spec.ts:32`,
  `apps/web/e2e/visual.spec.ts-snapshots/title-chromium-darwin.png`
- Test: `apps/web/src/ui/screens/Intro.test.tsx`, `apps/web/src/ui/screens/screens.test.tsx`

- [ ] **Step 1: Write the failing tests.** In `Intro.test.tsx` the expected `INTRO_LETTER` becomes the spec
      §3.3 letter, verbatim:
      `"If you're reading this, I've gone down into the Heartdeep and haven't come back up yet. Keep the farm alive until I do. It's gone wild, I know. So did I, for a while. Plant something. Then plant something else. The roots remember people who stay. — Grandpa Elias"`.
      In `screens.test.tsx` add `Title shows the game name` (heading `Ethergrove Chronicles`, text
      `Grandpa's farm is waiting.`) and `WebGLFallback names the game` (text
      `Ethergrove Chronicles needs WebGL 2. Try one of these, then reload the page:`). In both e2e specs the
      heading name becomes `'Ethergrove Chronicles'`.
- [ ] **Step 2: Run, expect FAIL:**
      `pnpm --filter web exec vitest run src/ui/screens/Intro.test.tsx src/ui/screens/screens.test.tsx`
- [ ] **Step 3: Implement:** every row of spec §3.3, exactly.
- [ ] **Step 4: Run, expect PASS** (same command), then update only the title baseline:
      `pnpm --filter web exec playwright test e2e/visual.spec.ts --project=chromium --update-snapshots=all`.
      Expected: `git status` shows only `title-chromium-darwin.png` changed among the snapshots; if `pause` or
      `cart` changed, find out why before going on.
- [ ] **Step 5: Look at it:** start the preview, check the title screen and intro letter at desktop and the
      `mobile` preset, and at text size 150%. Stop the preview.
- [ ] **Step 6: Commit (only with permission):**

```bash
git add apps/web/index.html apps/web/src/ui apps/web/src/scene/kenneyColors.ts apps/web/e2e/a11y.spec.ts apps/web/e2e/visual.spec.ts apps/web/e2e/visual.spec.ts-snapshots/title-chromium-darwin.png
git commit -m "feat(web): show Ethergrove Chronicles and Grandpa's new letter" -m "Title, page title, WebGL fallback, import error and the intro letter (spec §3.3)."
```

### Task 7: Docs and project memory

**Files:**

- Modify: `README.md`, `AGENTS.md`, `CLAUDE.md`, `CREDITS.md`, `docs/ARCHITECTURE.md`,
  `docs/agent-workflow.md`, `brain/MEMORY.md` (heading and the open-thread line), `brain/decisions/*.md`,
  `.claude/skills/second-brain/SKILL.md`, `scripts/brain/brainHooks.test.mjs:108,112`, every dated file in
  `docs/superpowers/specs/2026-10-2*` and `docs/superpowers/plans/2026-10-2*` (one note line each)
- Test: `scripts/brain/brainHooks.test.mjs`

- [ ] **Step 1: Living docs.** Read each `git grep -n -i hearthvale` hit in the files above and rewrite it:
      `Ethergrove Chronicles` in headings and first mentions, `Ethergrove` after. `AGENTS.md`'s originality
      line keeps its meaning ("must stay original: no names, characters, art, music or text copied from
      Harvest Moon or other games"). Do not blind-`sed` prose.
- [ ] **Step 2: README:** the intro uses the spec §2 pitch; the Roadmap section becomes the spec §9 table's
      nine parts in one line each.
- [ ] **Step 3: History notes:** add the spec §3.5 note line under the title of each dated spec and plan
      (plans use the `../specs/` link), and the "Superseded" line under the Part 1 spec's Appendix A heading.
- [ ] **Step 4: Brain:** `brain/MEMORY.md` heading → `# Ethergrove memory`; its open-thread line about the
      rename changes from "awaiting review" to "built on `feat/ethergrove-chronicles`; awaiting the owner's
      push". Decision 0011 status → `accepted`. In `brainHooks.test.mjs` the fixture and assertion become
      `# Ethergrove memory`.
- [ ] **Step 5: Verify:** `pnpm test:scripts` passes; `pnpm exec prettier --check README.md AGENTS.md CLAUDE.md CREDITS.md brain docs/ARCHITECTURE.md docs/agent-workflow.md`
      passes.
- [ ] **Step 6: Commit (only with permission):**

```bash
git add README.md AGENTS.md CLAUDE.md CREDITS.md docs brain .claude/skills/second-brain/SKILL.md scripts/brain/brainHooks.test.mjs
git commit -m "docs: rename the project to Ethergrove Chronicles" -m "Living docs, project memory and the new story spec; dated history keeps its text with a note."
```

### Task 8: Acceptance and handoff

- [ ] **Step 1: Leftovers:** `git grep -il hearthvale`. Expected: exactly the list in spec §3.6
      "Acceptance". Fix anything else.
- [ ] **Step 2: Full gate:** stop any server on port 5199, then `pnpm checks`. Expected: every step passes.
- [ ] **Step 3: Map:** `graphify update .`
- [ ] **Step 4: Handoff:** post the `AGENTS.md` ready-to-push handoff with every commit from Tasks 1–7 that
      was not already made, branch `feat/ethergrove-chronicles`, and PR title
      `feat: rename Hearthvale to Ethergrove Chronicles`. Say what was not verified (real phones; WebKit
      visual baselines do not exist). Remind the owner to rename the GitHub repo, the Vercel project and the
      local folder.
