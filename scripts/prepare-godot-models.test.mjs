// Unit tests for the Godot model preparation script: `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { modelJobs, transformSteps } from './prepare-godot-models.mjs';

test('modelJobs makes one job per .glb and ignores other files', () => {
  const jobs = modelJobs('/src', '/out', ['rock-1.glb', 'notes.txt', 'bed.glb']);
  assert.equal(jobs.length, 2);
});

test('modelJobs keeps each file name and sorts them', () => {
  const jobs = modelJobs('/src', '/out', ['rock-1.glb', 'bed.glb']);
  assert.deepEqual(jobs, [
    { src: '/src/bed.glb', out: '/out/bed.glb' },
    { src: '/src/rock-1.glb', out: '/out/rock-1.glb' },
  ]);
});

test('transformSteps run copy, dequantize, prune, weld in order', () => {
  const steps = transformSteps('/src/a.glb', '/out/a.glb');
  assert.deepEqual(
    steps.map((s) => s[0]),
    ['copy', 'dequantize', 'prune', 'weld'],
  );
  assert.deepEqual(steps[0], ['copy', '/src/a.glb', '/out/a.glb']);
  for (const s of steps.slice(1)) assert.deepEqual(s.slice(1), ['/out/a.glb', '/out/a.glb']);
});

test('transformSteps are argument arrays, not shell strings', () => {
  for (const s of transformSteps('/src/a b.glb', '/out/a b.glb')) {
    assert.ok(Array.isArray(s));
    assert.ok(s.every((x) => typeof x === 'string'));
  }
});
