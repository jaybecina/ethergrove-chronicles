#!/usr/bin/env node
// Commit test guard (decision 0007): staged source changes need an added or updated test in the same area.
//   node scripts/testGuard.mjs                 pre-commit: exit 1 when a change has no test
//   node scripts/testGuard.mjs --trailer FILE  commit-msg: record NO_TEST_REASON as a `No-Test:` trailer
// Escape hatch for changes a test cannot cover: NO_TEST_REASON="why, 10+ chars" git commit …
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @typedef {{ status: string, path: string }} Change */

const AREAS = [
  {
    name: 'core',
    code: /^packages\/core\/src\/.+\.ts$/,
    test: /^packages\/core\/(src|test)\/.+\.test\.ts$/,
    where: 'packages/core/test/*.test.ts',
  },
  {
    name: 'web',
    code: /^apps\/web\/src\/.+\.tsx?$/,
    test: /^apps\/web\/(src\/.+\.test\.tsx?|e2e\/.+\.spec\.ts)$/,
    where:
      'apps/web/src/**/*.test.ts(x) beside the file, or apps/web/e2e/*.spec.ts for player flows',
  },
  {
    name: 'scripts',
    code: /^scripts\/.+\.mjs$/,
    test: /^scripts\/.+\.test\.mjs$/,
    where: 'scripts/**/*.test.mjs (node:test)',
  },
];
const NOT_CODE = /(\.test\.|\.spec\.|\.d\.ts$)/;
const MIN_REASON = 10;

/**
 * Parses `git diff --cached --name-status -z`. Renames and copies keep their new path.
 * @param {string} z
 * @returns {Change[]}
 */
export function parseNameStatus(z) {
  const parts = z.split('\0').filter((p) => p !== '');
  /** @type {Change[]} */
  const out = [];
  for (let i = 0; i < parts.length;) {
    const status = (parts[i] ?? '').charAt(0);
    const twoPaths = status === 'R' || status === 'C';
    const path = parts[i + (twoPaths ? 2 : 1)];
    if (path !== undefined) out.push({ status, path });
    i += twoPaths ? 3 : 2;
  }
  return out;
}

/**
 * @param {readonly Change[]} changes staged changes
 * @param {string} [reason] NO_TEST_REASON, when the owner says a test does not fit
 */
export function checkTests(changes, reason = '') {
  const live = changes.filter((c) => c.status !== 'D');
  const missing = AREAS.flatMap((area) => {
    const files = live.map((c) => c.path).filter((p) => area.code.test(p) && !NOT_CODE.test(p));
    if (files.length === 0 || live.some((c) => area.test.test(c.path))) return [];
    return [{ area: area.name, files }];
  });
  const usedReason = missing.length > 0 && reason.trim().length >= MIN_REASON;
  const ok = missing.length === 0 || usedReason;
  const lines = missing.map((m) => {
    const where = AREAS.find((a) => a.name === m.area)?.where ?? '';
    return `  ${m.area}: ${m.files.join(', ')}\n    → add or update a test in ${where}`;
  });
  const message =
    missing.length === 0
      ? ''
      : [
          usedReason
            ? `Test guard: committing without a test, reason recorded as a No-Test: trailer: ${reason.trim()}`
            : 'Test guard: these staged changes have no added or updated test in the same area:',
          ...lines,
          ...(usedReason
            ? []
            : [
                'Stage the test and commit again. If a test truly cannot cover it (types only, copy text,',
                `assets), commit with a reason of ${MIN_REASON}+ characters; it is added to the message:`,
                '  NO_TEST_REASON="why no test fits" git commit …',
              ]),
        ].join('\n');
  return { ok, missing, usedReason, message };
}

function staged() {
  return parseNameStatus(
    execFileSync('git', ['diff', '--cached', '--name-status', '-z', '-M'], { encoding: 'utf8' }),
  );
}

function main() {
  const reason = process.env.NO_TEST_REASON ?? '';
  const result = checkTests(staged(), reason);
  if (process.argv[2] === '--trailer') {
    const file = process.argv[3];
    if (result.usedReason && file)
      execFileSync('git', [
        'interpret-trailers',
        '--in-place',
        '--trailer',
        `No-Test: ${reason.trim().replace(/\s+/g, ' ')}`,
        file,
      ]);
    return;
  }
  if (result.message) console.log(result.message);
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
