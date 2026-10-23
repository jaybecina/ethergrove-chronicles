import { expect, it } from 'vitest';
import { CORE_VERSION } from '../src/index';

it('exposes the core version', () => {
  expect(CORE_VERSION).toBe(1);
});
