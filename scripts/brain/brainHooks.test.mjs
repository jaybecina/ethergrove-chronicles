// Unit tests for the second-brain hook logic: `node --test scripts/brain/`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  emptyState,
  graphStale,
  matchNotes,
  newPaths,
  parsePorcelain,
  promptContext,
  promptKeywords,
  recordChanges,
  sessionContext,
  staleInbox,
  stopDecision,
} from './brainHooks.mjs';

test('recordChanges keeps work files pending and flags memory edits', () => {
  let s = recordChanges(emptyState(), ['apps/web/src/a.ts', 'brain/lessons/x.md']);
  assert.deepEqual(s.pending, ['apps/web/src/a.ts']);
  assert.equal(s.memoryTouched, true);
  s = recordChanges(s, ['apps/web/src/a.ts', 'AGENTS.md']);
  assert.deepEqual(s.pending, ['apps/web/src/a.ts']);
});

test('recordChanges ignores generated and local-state paths', () => {
  const s = recordChanges(emptyState(), [
    'graphify-out/graph.json',
    '.claude/.brain-state/abc.json',
    'apps/web/test-results/x.png',
    'node_modules/x/index.js',
  ]);
  assert.deepEqual(s.pending, []);
  assert.equal(s.memoryTouched, false);
});

test('stopDecision blocks once when work changed and memory did not', () => {
  const s = recordChanges(emptyState(), ['apps/web/src/a.ts']);
  const d = stopDecision(s, { stopHookActive: false, today: '2026-10-25' });
  assert.equal(d.block, true);
  assert.match(d.reason ?? '', /apps\/web\/src\/a\.ts/);
  assert.match(d.reason ?? '', /brain\/sessions\/2026-10-25\.md/);
  assert.deepEqual(d.next.pending, []);
  const again = stopDecision(d.next, { stopHookActive: false, today: '2026-10-25' });
  assert.equal(again.block, false);
});

test('stopDecision lets the turn end when memory and tests were updated', () => {
  const s = recordChanges(emptyState(), [
    'apps/web/src/a.ts',
    'apps/web/src/a.test.ts',
    'brain/sessions/2026-10-25.md',
  ]);
  const d = stopDecision(s, { stopHookActive: false, today: '2026-10-25' });
  assert.equal(d.block, false);
  assert.equal(d.next.memoryTouched, false);
});

test('stopDecision never blocks a continuation the hook itself caused', () => {
  const s = recordChanges(emptyState(), ['apps/web/src/a.ts']);
  assert.equal(stopDecision(s, { stopHookActive: true, today: '2026-10-25' }).block, false);
});

test('stopDecision refreshes the graph only after code changes', () => {
  const md = stopDecision(recordChanges(emptyState(), ['docs/x.md']), {
    stopHookActive: true,
    today: '2026-10-25',
  });
  assert.equal(md.refreshGraph, false);
  const ts = stopDecision(recordChanges(emptyState(), ['packages/core/src/x.ts']), {
    stopHookActive: true,
    today: '2026-10-25',
  });
  assert.equal(ts.refreshGraph, true);
});

test('stopDecision lists at most ten paths', () => {
  const paths = Array.from({ length: 14 }, (_, i) => `src/f${i}.ts`);
  const d = stopDecision(recordChanges(emptyState(), paths), {
    stopHookActive: false,
    today: '2026-10-25',
  });
  assert.match(d.reason ?? '', /and 4 more/);
  assert.doesNotMatch(d.reason ?? '', /f12\.ts/);
});

test('newPaths finds files that became dirty or were committed', () => {
  assert.deepEqual(newPaths(['a.ts', 'b.ts'], ['b.ts', 'c.ts'], ['d.ts']), ['c.ts', 'd.ts']);
});

test('graphStale compares the report commit with HEAD', () => {
  const report = '## Graph Freshness\n- Built from commit: `68b3e609`\n';
  assert.equal(graphStale(report, '68b3e609abcdef'), false);
  assert.equal(graphStale(report, '6ce4c515abcdef'), true);
  assert.equal(graphStale(null, '6ce4c515abcdef'), true);
});

test('staleInbox lists dated captures older than a week', () => {
  const now = new Date('2026-10-25T12:00:00Z');
  assert.deepEqual(
    staleInbox(['README.md', '2026-10-10-music.md', '2026-10-24-fresh.md', 'notes.md'], now),
    ['2026-10-10-music.md'],
  );
});

test('sessionContext carries the standing rule, the index and stale inbox items', () => {
  const ctx = sessionContext({
    memory: '# Ethergrove memory',
    staleInbox: ['2026-10-10-music.md'],
  });
  assert.match(ctx, /Always follow best practices and standards/);
  assert.match(ctx, /# Ethergrove memory/);
  assert.match(ctx, /2026-10-10-music\.md/);
  assert.doesNotMatch(sessionContext({ memory: null, staleInbox: [] }), /inbox/i);
});

test('promptKeywords keeps distinctive words and drops filler', () => {
  assert.deepEqual(promptKeywords('Can you update the boulder rock colour, please? The rock!'), [
    'update',
    'boulder',
    'rock',
    'colour',
  ]);
});

test('matchNotes ranks brain notes by keyword hits and skips misses', () => {
  const notes = [
    { path: 'brain/lessons/a.md', text: '# Render loop\nzustand selector render loop' },
    { path: 'brain/decisions/b.md', text: '# Saves v2\nsave migration' },
    { path: 'brain/lessons/c.md', text: '# Selector\nzustand selector' },
  ];
  assert.deepEqual(matchNotes(notes, ['zustand', 'render']), [
    { path: 'brain/lessons/a.md', title: 'Render loop' },
    { path: 'brain/lessons/c.md', title: 'Selector' },
  ]);
  assert.deepEqual(matchNotes(notes, []), []);
});

test('promptContext summarises where the work stands', () => {
  const ctx = promptContext({
    branch: 'feat/x',
    commits: ['6ce4c51 fix(scene): grey rocks'],
    dirty: Array.from({ length: 12 }, (_, i) => `f${i}.ts`),
    notes: [{ path: 'brain/lessons/a.md', title: 'Render loop' }],
    graph: 'NODE ROCK_TINT [src=apps/web/src/scene/kenneyColors.ts]',
  });
  assert.match(ctx, /Branch feat\/x/);
  assert.match(ctx, /6ce4c51 fix\(scene\): grey rocks/);
  assert.match(ctx, /12 uncommitted/);
  assert.match(ctx, /and 4 more/);
  assert.match(ctx, /brain\/lessons\/a\.md: Render loop/);
  assert.match(ctx, /NODE ROCK_TINT/);
  assert.doesNotMatch(
    promptContext({ branch: 'main', commits: [], dirty: [], notes: [], graph: null }),
    /graphify query/,
  );
});

test('parsePorcelain reads paths from `git status -z`, skipping rename sources', () => {
  const z = ' M src/a.ts\0R  src/new.ts\0src/old.ts\0?? brain/x.md\0';
  assert.deepEqual(parsePorcelain(z), ['src/a.ts', 'src/new.ts', 'brain/x.md']);
  assert.deepEqual(parsePorcelain(''), []);
});

test('stopDecision asks for a test when source changed without one, even after a capture', () => {
  const s = recordChanges(emptyState(), ['packages/core/src/grid.ts', 'brain/lessons/x.md']);
  const d = stopDecision(s, { stopHookActive: false, today: '2026-10-25' });
  assert.equal(d.block, true);
  assert.match(d.reason ?? '', /no added or updated test/);
  assert.match(d.reason ?? '', /packages\/core\/src\/grid\.ts/);
  assert.doesNotMatch(d.reason ?? '', /nothing in brain/);
});

test('stopDecision asks for both a capture and a test when both are missing', () => {
  const d = stopDecision(recordChanges(emptyState(), ['apps/web/src/a.ts']), {
    stopHookActive: false,
    today: '2026-10-25',
  });
  assert.match(d.reason ?? '', /nothing in brain/);
  assert.match(d.reason ?? '', /no added or updated test/);
});
