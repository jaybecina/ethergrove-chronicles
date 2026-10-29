import type { ItemStack, SlotId } from '@ethergrove/core';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

export type SlotsMode = 'new' | 'load';

interface UiState {
  slotsMode: SlotsMode;
  pendingSlot: SlotId | null;
  report: { items: ItemStack[]; total: number } | null;
  settingsOpen: boolean;
  /** performance.now() when the intro camera flight began; null while reading the letter. */
  flightStart: number | null;
  setFlightStart(t: number | null): void;
  setSlotsMode(mode: SlotsMode): void;
  setPendingSlot(slot: SlotId | null): void;
  setReport(report: UiState['report']): void;
  setSettingsOpen(open: boolean): void;
}

/** Menu-only state that never belongs in a save file. */
export const uiStore = createStore<UiState>()((set) => ({
  slotsMode: 'load',
  pendingSlot: null,
  report: null,
  settingsOpen: false,
  flightStart: null,
  setFlightStart: (flightStart) => {
    set({ flightStart });
  },
  setSlotsMode: (slotsMode) => {
    set({ slotsMode });
  },
  setPendingSlot: (pendingSlot) => {
    set({ pendingSlot });
  },
  setReport: (report) => {
    set({ report });
  },
  setSettingsOpen: (settingsOpen) => {
    set({ settingsOpen });
  },
}));

export function useUi<T>(selector: (s: UiState) => T): T {
  return useStore(uiStore, selector);
}
