import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { CURRENT_SAVE_VERSION, makeSaveFile, migrate } from '../src/save/migrate';
import type { SaveFile } from '../src/save/repository';
import { saveFileSchema } from '../src/save/schema';
import { NOTE_IDS } from '../src/data/lessons';
import type { GameState } from '../src/types';
import { arbCommand } from './arbitraries';
import { fresh } from './helpers';

const now = new Date('2026-10-23T10:00:00Z');
const roundTrip = (file: unknown) => migrate(JSON.parse(JSON.stringify(file)));

function played(seed: number): GameState {
  const cmds =
    fc.sample(fc.array(arbCommand, { minLength: 50, maxLength: 50 }), { numRuns: 1, seed })[0] ??
    [];
  return cmds.reduce((s, c) => applyCommand(s, c).state, fresh(seed));
}

describe('save files', () => {
  it('makeSaveFile fills the summary', () => {
    const file = makeSaveFile(fresh(), 1234, now);
    expect(file).toMatchObject({
      version: CURRENT_SAVE_VERSION,
      savedAt: '2026-10-23T10:00:00.000Z',
      playTimeMs: 1234,
      summary: { farmName: 'Elm', playerName: 'Ari', gold: 500, calendar: fresh().calendar },
    });
  });

  it('round-trips through JSON after 50 random commands', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const file = makeSaveFile(played(seed), 99, now);
      const result = roundTrip(file);
      expect(result).toEqual({ ok: true, file });
    }
  });

  it('rejects a missing field, negative gold, and a short bag', () => {
    const file = makeSaveFile(fresh(), 0, now);
    const { gold: _g, ...noGold } = file.state;
    expect(roundTrip({ ...file, state: noGold })).toEqual({ ok: false, error: 'invalid' });
    expect(roundTrip({ ...file, state: { ...file.state, gold: -5 } })).toEqual({
      ok: false,
      error: 'invalid',
    });
    expect(roundTrip({ ...file, state: { ...file.state, bag: file.state.bag.slice(1) } })).toEqual({
      ok: false,
      error: 'invalid',
    });
  });

  it('rejects junk input', () => {
    for (const junk of [null, 42, 'save', [], {}, { version: 'one' }]) {
      expect(migrate(junk)).toEqual({ ok: false, error: 'invalid' });
    }
  });

  it('rejects versions from the future', () => {
    expect(roundTrip({ ...makeSaveFile(fresh(), 0, now), version: 999 })).toEqual({
      ok: false,
      error: 'unsupportedVersion',
    });
  });

  it('runs injected migrations step by step', () => {
    const current = makeSaveFile(fresh(), 0, now);
    const { tutorial: _t, ...oldState } = current.state;
    const prev = CURRENT_SAVE_VERSION - 1;
    const older = { ...current, version: prev, state: { ...oldState, version: prev } };
    const migrations = {
      [prev]: (f: unknown) => {
        const old = f as SaveFile;
        return {
          ...old,
          version: CURRENT_SAVE_VERSION,
          state: { ...old.state, version: CURRENT_SAVE_VERSION, tutorial: current.state.tutorial },
        };
      },
    };
    expect(migrate(older, migrations)).toEqual({ ok: true, file: current });
    expect(migrate(older, {})).toEqual({ ok: false, error: 'unsupportedVersion' });
  });

  it('migrates a real Part 1 save to v2 with lessons off', () => {
    const v1 = JSON.parse(
      readFileSync(join(import.meta.dirname, 'fixtures/part1-save-v1.json'), 'utf8'),
    ) as { state: Record<string, unknown> };
    const r = migrate(v1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file.version).toBe(2);
    expect(r.file.state.version).toBe(2);
    expect(r.file.state.tutorial).toEqual({
      lesson: 'off',
      count: 0,
      notesSeen: [...NOTE_IDS],
      gifted: false,
    });
    const { tutorial: _t, version: _v, ...rest } = r.file.state;
    const { version: _v1, ...restV1 } = v1.state;
    expect(rest).toEqual(restV1);
    expect(saveFileSchema.safeParse(r.file).success).toBe(true);
  });
});
