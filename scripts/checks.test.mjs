// Unit tests for the check plans and their GitHub CI mirror: `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { PLANS } from './checks.mjs';

const cmds = (/** @type {keyof typeof PLANS} */ plan) => PLANS[plan].steps.map((s) => s.cmd);
const ci = readFileSync(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8');

test('the commit plan stays fast: no full lint, build or browser tests', () => {
  for (const cmd of cmds('commit')) assert.doesNotMatch(cmd, /lint|build|e2e|size/, cmd);
});

test('the all plan runs everything the commit plan runs (coverage covers the unit tests)', () => {
  const all = cmds('all').map((c) => c.replace('pnpm test:coverage', 'pnpm test'));
  for (const cmd of cmds('commit')) assert.ok(all.includes(cmd), `all plan is missing: ${cmd}`);
});

test('the all plan keeps the full gate: lint, coverage, build, debug-hook, size and e2e', () => {
  const all = cmds('all').join('\n');
  for (const needed of ['pnpm lint', 'test:coverage', 'pnpm build', 'check:build', 'size', 'e2e'])
    assert.ok(all.includes(needed), `all plan is missing: ${needed}`);
});

test('GitHub CI runs every step of the all plan', () => {
  for (const step of PLANS.all.steps.filter((s) => s.live !== true))
    assert.ok(ci.includes(`- run: ${step.cmd}\n`), `ci.yml is missing: ${step.cmd}`);
  assert.match(ci, /project: chromium, shard: 1\/2/);
  assert.match(ci, /project: chromium, shard: 2\/2/);
  assert.match(ci, /project: webkit, shard: 1\/1/);
  assert.match(
    ci,
    /- run: pnpm --filter web e2e --project=\$\{\{ matrix\.project \}\} --shard=\$\{\{ matrix\.shard \}\}\n/,
  );
});
