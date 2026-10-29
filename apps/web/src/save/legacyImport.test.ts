import 'fake-indexeddb/auto';
import { createNewGame, makeSaveFile } from '@ethergrove/core';
import { openDB } from 'idb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createIdbRepository } from './idbRepository';
import { LEGACY_MARKER, importLegacySaves } from './legacyImport';

let n = 0;
const names = () => {
  n++;
  return { current: `import-${n}`, legacy: `import-${n}-legacy` };
};
const file = (gold: number) =>
  makeSaveFile(
    { ...createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari' }), gold },
    1000,
    new Date(0),
  );

async function seed(name: string, values: Record<string, unknown>): Promise<void> {
  const db = await openDB(name, 1, {
    upgrade(d) {
      d.createObjectStore('saves');
    },
  });
  for (const [k, v] of Object.entries(values)) await db.put('saves', v, k);
  db.close();
}

async function readStore(name: string, key: string): Promise<unknown> {
  const db = await openDB(name, 1);
  const value: unknown = await db.get('saves', key);
  db.close();
  return value;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('importing Hearthvale saves', () => {
  it('copies slots and backups', async () => {
    const { current, legacy } = names();
    await seed(legacy, { 'slot:1': file(100), 'slot:1:backup': file(50), 'slot:3': file(300) });
    const repo = createIdbRepository(current, legacy);
    expect(await repo.load(1)).toEqual({ kind: 'ok', file: file(100) });
    expect(await repo.loadBackup(1)).toEqual({ kind: 'ok', file: file(50) });
    expect(await repo.load(3)).toEqual({ kind: 'ok', file: file(300) });
    expect(await repo.load(2)).toEqual({ kind: 'missing' });
  });

  it('never overwrites an existing slot', async () => {
    const { current, legacy } = names();
    await seed(legacy, { 'slot:1': file(100) });
    await seed(current, { 'slot:1': file(900) });
    const db = await openDB(current, 1);
    await Promise.all([importLegacySaves(db, legacy), importLegacySaves(db, legacy)]);
    db.close();
    const repo = createIdbRepository(current, legacy);
    expect(await repo.load(1)).toEqual({ kind: 'ok', file: file(900) });
  });

  it('runs once', async () => {
    const { current, legacy } = names();
    await seed(legacy, { 'slot:1': file(100) });
    const repo = createIdbRepository(current, legacy);
    expect(await repo.load(1)).toMatchObject({ kind: 'ok' });
    await repo.remove(1);
    expect(await createIdbRepository(current, legacy).load(1)).toEqual({ kind: 'missing' });
    expect(await readStore(current, LEGACY_MARKER)).toEqual({
      from: 'hearthvale',
      at: expect.any(String) as string,
    });
  });

  it('leaves no legacy database when none existed', async () => {
    const { current, legacy } = names();
    const repo = createIdbRepository(current, legacy);
    expect(await repo.load(1)).toEqual({ kind: 'missing' });
    const dbs = await indexedDB.databases();
    expect(dbs.map((d) => d.name)).not.toContain(legacy);
    expect(await readStore(current, LEGACY_MARKER)).toMatchObject({ from: 'hearthvale' });
  });

  it('copies a damaged save as-is', async () => {
    const { current, legacy } = names();
    await seed(legacy, { 'slot:2': { junk: true } });
    const repo = createIdbRepository(current, legacy);
    expect(await repo.load(2)).toEqual({ kind: 'corrupt', backupAvailable: false });
  });

  it('writes the marker after a failed read', async () => {
    const { current, legacy } = names();
    (await openDB(legacy, 1)).close(); // a database with no saves store
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const repo = createIdbRepository(current, legacy);
    expect(await repo.load(1)).toEqual({ kind: 'missing' });
    expect(warn).toHaveBeenCalledWith(
      'Ethergrove: could not import Hearthvale saves',
      expect.anything(),
    );
    expect(await readStore(current, LEGACY_MARKER)).toMatchObject({ from: 'hearthvale' });
  });

  it('still loads existing saves when storage is full on the first launch', async () => {
    const { current, legacy } = names();
    await seed(current, { 'slot:1': file(400) });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('Storage is full', 'QuotaExceededError');
    });
    const repo = createIdbRepository(current, legacy);
    expect(await repo.load(1)).toEqual({ kind: 'ok', file: file(400) });
  });

  it('list() ignores the marker', async () => {
    const { current, legacy } = names();
    await seed(legacy, { 'slot:1': file(100) });
    const list = await createIdbRepository(current, legacy).list();
    expect(list).toHaveLength(3);
    expect(list[0]).toMatchObject({ slot: 1, summary: { gold: 100 } });
  });
});
