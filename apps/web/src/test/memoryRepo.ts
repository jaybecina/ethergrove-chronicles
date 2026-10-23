import type { LoadResult, SaveFile, SlotId } from '@hearthvale/core';
import type { IdbSaveRepository } from '../save/idbRepository';

/** In-memory stand-in for the IndexedDB repository. */
export function memoryRepo(
  initial: Partial<Record<SlotId, SaveFile | 'corrupt'>> = {},
): IdbSaveRepository & {
  saved: { slot: SlotId; file: SaveFile }[];
} {
  const slots = new Map<SlotId, SaveFile | 'corrupt'>(
    Object.entries(initial).map(([k, v]) => [Number(k) as SlotId, v]),
  );
  const backups = new Map<SlotId, SaveFile>();
  const saved: { slot: SlotId; file: SaveFile }[] = [];
  const load = (slot: SlotId): LoadResult => {
    const v = slots.get(slot);
    if (v === undefined) return { kind: 'missing' };
    if (v === 'corrupt') return { kind: 'corrupt', backupAvailable: backups.has(slot) };
    return { kind: 'ok', file: v };
  };
  return {
    saved,
    list: () =>
      Promise.resolve(
        ([1, 2, 3] as SlotId[]).map((slot) => {
          const r = load(slot);
          return r.kind === 'ok'
            ? {
                slot,
                summary: r.file.summary,
                savedAt: r.file.savedAt,
                playTimeMs: r.file.playTimeMs,
                corrupt: false,
              }
            : { slot, summary: null, savedAt: null, playTimeMs: 0, corrupt: r.kind === 'corrupt' };
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
      if (cur && cur !== 'corrupt') backups.set(slot, cur);
      slots.set(slot, file);
      saved.push({ slot, file });
      return Promise.resolve();
    },
    remove: (slot) => {
      slots.delete(slot);
      backups.delete(slot);
      return Promise.resolve();
    },
    setBackup(slot: SlotId, file: SaveFile) {
      backups.set(slot, file);
    },
  } as IdbSaveRepository & {
    saved: { slot: SlotId; file: SaveFile }[];
    setBackup(slot: SlotId, file: SaveFile): void;
  };
}
