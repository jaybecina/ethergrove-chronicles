import type { LoadResult, SaveFile, SaveSlotSummary, SlotId } from '@ethergrove/core';
import type { IdbSaveRepository } from './idbRepository';

const SLOTS: SlotId[] = [1, 2, 3];

/** Saves that live only for this page session (used when IndexedDB is unavailable). */
export function createMemoryRepository(): IdbSaveRepository {
  const slots = new Map<SlotId, SaveFile>();
  const backups = new Map<SlotId, SaveFile>();
  const load = (slot: SlotId): LoadResult => {
    const f = slots.get(slot);
    return f ? { kind: 'ok', file: f } : { kind: 'missing' };
  };
  return {
    list: () =>
      Promise.resolve(
        SLOTS.map((slot): SaveSlotSummary => {
          const f = slots.get(slot);
          return f
            ? {
                slot,
                summary: f.summary,
                savedAt: f.savedAt,
                playTimeMs: f.playTimeMs,
                corrupt: false,
              }
            : { slot, summary: null, savedAt: null, playTimeMs: 0, corrupt: false };
        }),
      ),
    load: (slot) => Promise.resolve(load(slot)),
    loadBackup: (slot) => {
      const b = backups.get(slot);
      return Promise.resolve(
        b ? { kind: 'ok', file: b } : { kind: 'corrupt', backupAvailable: false },
      );
    },
    save: (slot, file) => {
      const cur = slots.get(slot);
      if (cur) backups.set(slot, cur);
      slots.set(slot, file);
      return Promise.resolve();
    },
    remove: (slot) => {
      slots.delete(slot);
      backups.delete(slot);
      return Promise.resolve();
    },
  };
}
