// @vitest-environment node
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findDebugHook } from '../../scripts/check-no-debug-hook.mjs';

function fakeDist(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'hv-dist-'));
  mkdirSync(join(dir, 'assets'));
  for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body);
  return dir;
}

describe('debug hook build check (review finding 10)', () => {
  it('flags a bundle that contains the test hook', () => {
    const dir = fakeDist({
      'assets/index.js': 'window.__hearthvale={getState(){}}',
      'index.html': '<html>',
    });
    expect(findDebugHook(dir)).toEqual(['assets/index.js']);
  });

  it('passes a clean bundle and ignores source maps', () => {
    const dir = fakeDist({
      'assets/index.js': 'console.log(1)',
      'assets/index.js.map': '__hearthvale',
    });
    expect(findDebugHook(dir)).toEqual([]);
  });
});
