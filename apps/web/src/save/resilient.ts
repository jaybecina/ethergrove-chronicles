import type { IdbSaveRepository } from './idbRepository';
import { createMemoryRepository } from './memoryRepository';

/**
 * IndexedDB first; on the first failure (private mode, blocked site data, full quota) switch to
 * in-memory saves for the rest of the session so the game stays playable (spec §2.5).
 */
export function createResilientRepository(
  primary: IdbSaveRepository,
  onFallback: () => void,
): IdbSaveRepository {
  const memory = createMemoryRepository();
  let usingMemory = false;
  const guard = async <T>(
    fromPrimary: () => Promise<T>,
    fromMemory: () => Promise<T>,
  ): Promise<T> => {
    if (!usingMemory) {
      try {
        return await fromPrimary();
      } catch {
        usingMemory = true;
        onFallback();
      }
    }
    return fromMemory();
  };
  return {
    list: () =>
      guard(
        () => primary.list(),
        () => memory.list(),
      ),
    load: (slot) =>
      guard(
        () => primary.load(slot),
        () => memory.load(slot),
      ),
    loadBackup: (slot) =>
      guard(
        () => primary.loadBackup(slot),
        () => memory.loadBackup(slot),
      ),
    save: (slot, file) =>
      guard(
        () => primary.save(slot, file),
        () => memory.save(slot, file),
      ),
    remove: (slot) =>
      guard(
        () => primary.remove(slot),
        () => memory.remove(slot),
      ),
  };
}
