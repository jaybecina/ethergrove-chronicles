// Unit tests for the commit test guard: `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkTests, parseNameStatus } from './testGuard.mjs';

/** @param {string[]} paths */
const modified = (...paths) => paths.map((path) => ({ status: 'M', path }));

test('passes when nothing testable changed', () => {
  const r = checkTests(modified('AGENTS.md', 'brain/MEMORY.md', 'apps/web/src/ui/theme.css'));
  assert.equal(r.ok, true);
  assert.deepEqual(r.missing, []);
});

test('fails a web source change with no web test', () => {
  const r = checkTests(modified('apps/web/src/scene/palette.ts'));
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, [{ area: 'web', files: ['apps/web/src/scene/palette.ts'] }]);
  assert.match(r.message, /apps\/web\/src\/scene\/palette\.ts/);
  assert.match(r.message, /NO_TEST_REASON/);
});

test('desktop main-process and packaging changes need a desktop test (desktop spec §5)', () => {
  const r = checkTests(
    modified('apps/desktop/src/main.ts', 'apps/desktop/electron-builder.config.mjs'),
  );
  assert.equal(r.ok, false);
  assert.deepEqual(r.missing, [
    {
      area: 'desktop',
      files: ['apps/desktop/src/main.ts', 'apps/desktop/electron-builder.config.mjs'],
    },
  ]);
  assert.equal(
    checkTests(modified('apps/desktop/src/policy.ts', 'apps/desktop/src/policy.test.ts')).ok,
    true,
  );
  assert.equal(
    checkTests(modified('apps/desktop/src/main.ts', 'apps/desktop/e2e/app.spec.ts')).ok,
    true,
  );
  // A web test does not cover a desktop change.
  assert.equal(
    checkTests(modified('apps/desktop/src/main.ts', 'apps/web/src/a.test.ts')).ok,
    false,
  );
});

test('a unit test or an e2e spec in the same area satisfies a web change', () => {
  assert.equal(
    checkTests(modified('apps/web/src/scene/palette.ts', 'apps/web/src/scene/models.test.ts')).ok,
    true,
  );
  assert.equal(
    checkTests(modified('apps/web/src/ui/Hud.tsx', 'apps/web/e2e/golden-path.spec.ts')).ok,
    true,
  );
});

test('a test in another area does not count', () => {
  const r = checkTests(modified('packages/core/src/systems/crops.ts', 'apps/web/src/a.test.ts'));
  assert.deepEqual(r.missing, [{ area: 'core', files: ['packages/core/src/systems/crops.ts'] }]);
});

test('core tests may live in test/ or beside the source', () => {
  assert.equal(
    checkTests(modified('packages/core/src/grid.ts', 'packages/core/test/grid.test.ts')).ok,
    true,
  );
});

test('repo scripts need a script test', () => {
  assert.equal(checkTests(modified('scripts/brain/hook.mjs')).ok, false);
  assert.equal(
    checkTests(modified('scripts/brain/hook.mjs', 'scripts/brain/brainHooks.test.mjs')).ok,
    true,
  );
});

test('deleting code or tests needs no new test, and deleted tests do not count', () => {
  assert.equal(checkTests([{ status: 'D', path: 'apps/web/src/old.ts' }]).ok, true);
  assert.equal(
    checkTests([
      { status: 'M', path: 'apps/web/src/a.ts' },
      { status: 'D', path: 'apps/web/src/a.test.ts' },
    ]).ok,
    false,
  );
});

test('type declarations are not code that needs a test', () => {
  assert.equal(checkTests(modified('apps/web/src/vite-env.d.ts')).ok, true);
});

test('a written reason lets the commit through but still reports what is untested', () => {
  const r = checkTests(modified('apps/web/src/ui/labels.ts'), 'copy text only, no logic');
  assert.equal(r.ok, true);
  assert.equal(r.missing.length, 1);
  assert.equal(r.usedReason, true);
});

test('a reason that is too short does not count', () => {
  assert.equal(checkTests(modified('apps/web/src/ui/labels.ts'), 'n/a').ok, false);
});

test('parseNameStatus reads `git diff --name-status -z`, keeping the new path of a rename', () => {
  const z =
    'M\0apps/web/src/a.ts\0R100\0src/old.ts\0src/new.ts\0D\0src/gone.ts\0A\0src/b.test.ts\0';
  assert.deepEqual(parseNameStatus(z), [
    { status: 'M', path: 'apps/web/src/a.ts' },
    { status: 'R', path: 'src/new.ts' },
    { status: 'D', path: 'src/gone.ts' },
    { status: 'A', path: 'src/b.test.ts' },
  ]);
  assert.deepEqual(parseNameStatus(''), []);
});
