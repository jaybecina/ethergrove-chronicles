// Unit tests for the check plans run by the Husky hooks: `pnpm test:scripts`.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PLANS } from './checks.mjs';

const cmds = (/** @type {keyof typeof PLANS} */ plan) => PLANS[plan].steps.map((s) => s.cmd);

test('the commit plan stays fast: no full lint, build or browser tests', () => {
  for (const cmd of cmds('commit')) assert.doesNotMatch(cmd, /lint|build|e2e|size/, cmd);
});

test('the push plan runs everything the commit plan runs (coverage covers the unit tests)', () => {
  const push = cmds('push').map((c) => c.replace('pnpm test:coverage', 'pnpm test'));
  for (const cmd of cmds('commit')) assert.ok(push.includes(cmd), `push plan is missing: ${cmd}`);
});

test('the push plan keeps the full gate: lint, coverage, build, debug-hook, size and e2e', () => {
  const push = cmds('push').join('\n');
  for (const needed of ['pnpm lint', 'test:coverage', 'pnpm build', 'check:build', 'size', 'e2e'])
    assert.ok(push.includes(needed), `push plan is missing: ${needed}`);
});
