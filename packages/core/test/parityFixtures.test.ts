import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from 'node:process';
import { describe, expect, it } from 'vitest';
import { CROP_IDS } from '../src/data/crops';
import type { Fixture } from './parity/recorder';
import { PARITY_FILES, fullYear } from './parity/scenarios';

/** The GDScript port replays these files (apps/game/test). `pnpm game:fixtures` rewrites them. */
const DIR = join(import.meta.dirname, '../../../apps/game/test/fixtures');
const UPDATE = env.UPDATE_PARITY === '1';

describe('parity fixtures', () => {
  it.each(PARITY_FILES.map((f) => [f.name, f] as const))('%s is fresh', (name, file) => {
    const body: unknown = file.build();
    const path = join(DIR, `${name}.json`);
    if (UPDATE) {
      mkdirSync(DIR, { recursive: true });
      writeFileSync(path, `${JSON.stringify(body, null, 1)}\n`);
      return;
    }
    expect(existsSync(path), `Fixture ${name} is stale: run pnpm game:fixtures`).toBe(true);
    const disk: unknown = JSON.parse(readFileSync(path, 'utf8'));
    expect(disk, `Fixture ${name} is stale: run pnpm game:fixtures`).toEqual(
      JSON.parse(JSON.stringify(body)),
    );
  });

  it('records one file per scenario, with unique names', () => {
    const names = PARITY_FILES.map((f) => f.name);
    expect(new Set(names).size).toBe(names.length);
    for (const name of ['rng', 'save', 'tools', 'tutorial', 'weather', 'full-year'])
      expect(names).toContain(name);
    expect(names.filter((n) => n.startsWith('new-game-'))).toHaveLength(10);
  });

  it('the recorded full year still reaches Year 2 Spring 1 with all 8 crops harvested', () => {
    const f: Fixture = fullYear();
    expect(f.expected.final.calendar).toEqual({ year: 2, season: 'spring', day: 1, minute: 360 });
    for (const c of CROP_IDS) expect(f.expected.final.harvested[c] ?? 0, c).toBeGreaterThan(0);
    expect(Object.keys(f.expected.snapshots)).toHaveLength(4);
    expect(f.expected.events).toHaveLength(f.steps.length);
  });
});
