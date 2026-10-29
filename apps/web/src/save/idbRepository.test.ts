import 'fake-indexeddb/auto';
import { createNewGame, makeSaveFile } from '@ethergrove/core';
import { openDB } from 'idb';
import { describe, expect, it } from 'vitest';
import { createIdbRepository, isStorageAvailable } from './idbRepository';

let n = 0;
const dbName = () => `test-${++n}`;
const file = (gold: number) =>
  makeSaveFile(
    { ...createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari' }), gold },
    1000,
    new Date(0),
  );

describe('IndexedDB save repository', () => {
  it('saves, lists, loads, and removes', async () => {
    const repo = createIdbRepository(dbName());
    expect(await repo.load(1)).toEqual({ kind: 'missing' });
    await repo.save(2, file(700));
    const list = await repo.list();
    expect(list).toHaveLength(3);
    expect(list[0]).toEqual({
      slot: 1,
      summary: null,
      savedAt: null,
      playTimeMs: 0,
      corrupt: false,
    });
    expect(list[1]).toMatchObject({
      slot: 2,
      summary: { farmName: 'Elm', gold: 700 },
      playTimeMs: 1000,
    });
    expect(await repo.load(2)).toEqual({ kind: 'ok', file: file(700) });
    await repo.remove(2);
    expect(await repo.load(2)).toEqual({ kind: 'missing' });
  });

  it('keeps the previous good save as a backup and recovers from corruption', async () => {
    const name = dbName();
    const repo = createIdbRepository(name);
    await repo.save(1, file(100));
    await repo.save(1, file(200));
    const db = await openDB(name);
    await db.put('saves', { garbage: true }, 'slot:1');
    db.close();
    expect(await repo.load(1)).toEqual({ kind: 'corrupt', backupAvailable: true });
    expect(await repo.loadBackup(1)).toEqual({ kind: 'ok', file: file(100) });
    expect((await repo.list())[0]).toMatchObject({ slot: 1, summary: null, corrupt: true });
  });

  it('a corrupt current save is not copied over the good backup', async () => {
    const name = dbName();
    const repo = createIdbRepository(name);
    await repo.save(1, file(100));
    await repo.save(1, file(200));
    const db = await openDB(name);
    await db.put('saves', 'junk', 'slot:1');
    db.close();
    await repo.save(1, file(300));
    expect(await repo.loadBackup(1)).toEqual({ kind: 'ok', file: file(100) });
  });

  it('reports storage availability', async () => {
    expect(await isStorageAvailable(dbName())).toBe(true);
  });

  it('stores saves in the ethergrove database by default', async () => {
    await createIdbRepository().save(1, file(10));
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).toContain('ethergrove');
    expect(names).not.toContain('hearthvale');
  });
});
