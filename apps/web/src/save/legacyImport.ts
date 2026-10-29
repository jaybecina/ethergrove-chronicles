import { openDB, type IDBPDatabase } from 'idb';
import { SLOT_KEYS, STORE } from './idbKeys';

/** The game was called Hearthvale before; its saves live in this database (spec §3.4). */
export const LEGACY_DB_NAME = 'hearthvale';
/** Written once the import has run, whether or not anything was copied, so it never runs again. */
export const LEGACY_MARKER = 'meta:legacyImport';

/** Opens the legacy database without creating it: resolves null when it never existed. */
async function openLegacy(name: string): Promise<IDBPDatabase | null> {
  try {
    return await openDB(name, 1, {
      upgrade(_db, oldVersion, _newVersion, tx) {
        // oldVersion 0 means this open would create the database; aborting leaves nothing behind.
        if (oldVersion === 0) {
          tx.done.catch(() => undefined); // the abort rejects it; openDB's own rejection is handled below
          tx.abort();
        }
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return null;
    throw error;
  }
}

/**
 * Copies Hearthvale slots and backups into `db` once. Never overwrites a key `db` already has and never
 * changes the legacy database. Never rejects: a failed read is logged and the import is marked done.
 */
export async function importLegacySaves(
  db: IDBPDatabase,
  legacyName = LEGACY_DB_NAME,
): Promise<void> {
  let legacy: IDBPDatabase | null = null;
  try {
    if ((await db.get(STORE, LEGACY_MARKER)) !== undefined) return;
    legacy = await openLegacy(legacyName);
    if (legacy) {
      const source = legacy;
      const values = await Promise.all(SLOT_KEYS.map((k) => source.get(STORE, k)));
      const tx = db.transaction(STORE, 'readwrite');
      await Promise.all([
        ...SLOT_KEYS.map(async (k, i) => {
          const value: unknown = values[i];
          if (value !== undefined && (await tx.store.get(k)) === undefined)
            await tx.store.put(value, k);
        }),
        tx.done,
      ]);
    }
  } catch (error) {
    console.warn('Ethergrove: could not import Hearthvale saves', error);
  } finally {
    legacy?.close();
  }
  try {
    await db.put(STORE, { from: 'hearthvale', at: new Date().toISOString() }, LEGACY_MARKER);
  } catch (error) {
    // Storage full: the saves already here must stay readable. The import retries next launch.
    console.warn('Ethergrove: could not import Hearthvale saves', error);
  }
}
