import type { SlotId } from '@ethergrove/core';

/** The IndexedDB object store and keys shared by the save repository and the legacy import. */
export const STORE = 'saves';
export const SLOTS: SlotId[] = [1, 2, 3];
export const key = (slot: SlotId) => `slot:${slot}`;
export const backupKey = (slot: SlotId) => `slot:${slot}:backup`;
/** Every key a save slot can use, slots and their backups. */
export const SLOT_KEYS: readonly string[] = SLOTS.flatMap((slot) => [key(slot), backupKey(slot)]);
