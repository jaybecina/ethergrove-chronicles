// Unit tests for the release tag check and the Desktop workflow's publishing rules: `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkReleaseTag } from './releaseTag.mjs';

test('a tag that is v plus the app version passes', () => {
  assert.equal(checkReleaseTag({ tag: 'v0.2.0', version: '0.2.0' }), null);
});

test('a tag for another version names both values', () => {
  assert.equal(
    checkReleaseTag({ tag: 'v0.2.1', version: '0.2.0' }),
    'Tag v0.2.1 does not match apps/desktop/package.json version 0.2.0.',
  );
});

test('a tag without the v, and pre-release versions, are refused', () => {
  assert.notEqual(checkReleaseTag({ tag: '0.2.0', version: '0.2.0' }), null);
  assert.notEqual(checkReleaseTag({ tag: 'v0.2.0-beta', version: '0.2.0-beta' }), null);
});

test('the Desktop workflow publishes only tagged, guarded, complete releases', () => {
  const yml = readFileSync(new URL('../.github/workflows/desktop.yml', import.meta.url), 'utf8');
  const has = (text) => assert.ok(yml.includes(text), `desktop.yml is missing: ${text}`);
  has('release-guard:');
  has("if: startsWith(github.ref, 'refs/tags/v')");
  has('node scripts/releaseTag.mjs');
  has('git merge-base --is-ancestor "$GITHUB_SHA" origin/main');
  has('gh release create "$GITHUB_REF_NAME" --draft');
  has('needs: release-guard');
  has('needs: package');
  has('gh release edit "$GITHUB_REF_NAME" --draft=false --latest');
  has('publish:${{ matrix.os }}');
  has('dist:${{ matrix.os }}');
  // Publishing is only ever done by the publish:* scripts, never an inline flag in the workflow.
  assert.ok(!yml.includes('--publish always'), 'workflow must not pass --publish always itself');
  // The two packaging steps are exclusive: tag runs publish, manual runs only build.
  const publishStep = yml.indexOf('publish:${{ matrix.os }}');
  const buildStep = yml.indexOf('dist:${{ matrix.os }}');
  assert.ok(
    yml.lastIndexOf("if: startsWith(github.ref, 'refs/tags/v')", publishStep) >
      yml.indexOf('package:'),
    'the publish script must sit under a tag condition',
  );
  assert.ok(
    yml.lastIndexOf("if: ${{ !startsWith(github.ref, 'refs/tags/v') }}", buildStep) >
      yml.indexOf('package:'),
    'the build-only script must sit under the not-a-tag condition',
  );
});
