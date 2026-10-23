import { migrate } from '@hearthvale/core';
import type {
  LoadResult,
  SaveFile,
  SaveRepository,
  SaveSlotSummary,
  SlotId,
} from '@hearthvale/core';
import { openDB, type IDBPDatabase } from 'idb';

const STORE = 'saves';
const SLOTS: SlotId[] = [1, 2, 3];
const key = (slot: SlotId) => `slot:${slot}`;
const backupKey = (slot: SlotId) => `slot:${slot}:backup`;

export interface IdbSaveRepository extends SaveRepository {
  loadBackup(slot: SlotId): Promise<LoadResult>;
}

function open(dbName: string): Promise<IDBPDatabase> {
  return openDB(dbName, 1, {
    upgrade(db) {
      db.createObjectStore(STORE);
    },
  });
}

function toResult(raw: unknown): LoadResult | null {
  if (raw === undefined) return { kind: 'missing' };
  const m = migrate(raw);
  return m.ok ? { kind: 'ok', file: m.file } : null;
}

export function createIdbRepository(dbName = 'hearthvale'): IdbSaveRepository {
  let dbPromise: Promise<IDBPDatabase> | null = null;
  const db = () => (dbPromise ??= open(dbName));
  const read = async (k: string): Promise<unknown> => (await db()).get(STORE, k);

  const repo: IdbSaveRepository = {
    async load(slot) {
      const result = toResult(await read(key(slot)));
      if (result) return result;
      const backup = toResult(await read(backupKey(slot)));
      return { kind: 'corrupt', backupAvailable: backup?.kind === 'ok' };
    },
    async loadBackup(slot) {
      return toResult(await read(backupKey(slot))) ?? { kind: 'corrupt', backupAvailable: false };
    },
    async save(slot, file: SaveFile) {
      const d = await db();
      const current: unknown = await d.get(STORE, key(slot));
      const tx = d.transaction(STORE, 'readwrite');
      if (current !== undefined && migrate(current).ok)
        await tx.store.put(current, backupKey(slot));
      await tx.store.put(file, key(slot));
      await tx.done;
    },
    async remove(slot) {
      const tx = (await db()).transaction(STORE, 'readwrite');
      await Promise.all([tx.store.delete(key(slot)), tx.store.delete(backupKey(slot)), tx.done]);
    },
    async list(): Promise<SaveSlotSummary[]> {
      return Promise.all(
        SLOTS.map(async (slot) => {
          const r = await repo.load(slot);
          if (r.kind === 'ok')
            return {
              slot,
              summary: r.file.summary,
              savedAt: r.file.savedAt,
              playTimeMs: r.file.playTimeMs,
              corrupt: false,
            };
          return {
            slot,
            summary: null,
            savedAt: null,
            playTimeMs: 0,
            corrupt: r.kind === 'corrupt',
          };
        }),
      );
    },
  };
  return repo;
}

export async function isStorageAvailable(dbName = 'hearthvale'): Promise<boolean> {
  try {
    const d = await open(dbName);
    await d.put(STORE, 1, '__probe');
    await d.delete(STORE, '__probe');
    d.close();
    return true;
  } catch {
    return false;
  }
}
