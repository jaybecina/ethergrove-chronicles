// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ASSETS } from './assets';

const pub = join(import.meta.dirname, '../../public');
const credits = readFileSync(join(import.meta.dirname, '../../../../CREDITS.md'), 'utf8');

describe('asset manifest', () => {
  it('every model file exists and its pack is credited', () => {
    expect(Object.keys(ASSETS).length).toBeGreaterThan(20);
    for (const [key, a] of Object.entries(ASSETS)) {
      expect(existsSync(join(pub, a.url)), `${key} → ${a.url}`).toBe(true);
      expect(a.credit.length, key).toBeGreaterThan(0);
      expect(credits, `${key} credit "${a.credit}" in CREDITS.md`).toContain(a.credit);
    }
  });

  it('ships no third-party sound files: all music and sound is original (audio spec §2.4)', () => {
    expect(existsSync(join(pub, 'assets/audio'))).toBe(false);
    expect(credits).toContain('All music and sound effects are original to Ethergrove');
    expect(credits).toContain('VSCO 2 Community Edition');
  });
});
