import { createNewGame, makeSaveFile } from '@hearthvale/core';
import { describe, expect, it, vi } from 'vitest';
import type { IdbSaveRepository } from './idbRepository';
import { createResilientRepository } from './resilient';

const broken: IdbSaveRepository = {
  list: () => Promise.reject(new Error('blocked')),
  load: () => Promise.reject(new Error('blocked')),
  loadBackup: () => Promise.reject(new Error('blocked')),
  save: () => Promise.reject(new Error('QuotaExceededError')),
  remove: () => Promise.reject(new Error('blocked')),
};
const file = makeSaveFile(
  createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari' }),
  0,
  new Date(0),
);

describe('resilient save repository (review finding 3)', () => {
  it('keeps the game playable in memory when IndexedDB fails', async () => {
    const onFallback = vi.fn();
    const repo = createResilientRepository(broken, onFallback);
    expect(await repo.list()).toHaveLength(3);
    await repo.save(2, file);
    expect(await repo.load(2)).toEqual({ kind: 'ok', file });
    expect((await repo.list())[1]?.summary?.farmName).toBe('Elm');
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it('uses IndexedDB while it works', async () => {
    const saved: unknown[] = [];
    const ok: IdbSaveRepository = {
      ...broken,
      save: (_slot, f) => {
        saved.push(f);
        return Promise.resolve();
      },
    };
    const onFallback = vi.fn();
    await createResilientRepository(ok, onFallback).save(1, file);
    expect(saved).toEqual([file]);
    expect(onFallback).not.toHaveBeenCalled();
  });
});
