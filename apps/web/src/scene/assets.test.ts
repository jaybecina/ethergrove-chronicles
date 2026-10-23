// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { soundUrls } from '../audio/soundMap';
import { ASSETS, SOUND_FILES } from './assets';

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

  it('every shipped sound exists in both formats and is credited', () => {
    for (const id of SOUND_FILES) {
      for (const url of soundUrls(id)) expect(existsSync(join(pub, url)), url).toBe(true);
    }
    expect(credits).toContain('Kenney Impact Sounds');
  });
});
