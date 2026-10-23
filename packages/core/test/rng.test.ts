import { expect, it } from 'vitest';
import { nextFloat } from '../src/rng';

it('is deterministic and in [0,1)', () => {
  const [a, r1] = nextFloat(42);
  const [b] = nextFloat(42);
  expect(a).toBe(b);
  expect(a).toBeGreaterThanOrEqual(0);
  expect(a).toBeLessThan(1);
  expect(r1).not.toBe(42);
});

it('produces a spread of values over many draws', () => {
  let rng = 7;
  let sum = 0;
  for (let i = 0; i < 10_000; i++) {
    const [v, next] = nextFloat(rng);
    sum += v;
    rng = next;
  }
  expect(sum / 10_000).toBeGreaterThan(0.48);
  expect(sum / 10_000).toBeLessThan(0.52);
});
