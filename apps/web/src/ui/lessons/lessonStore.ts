import type { LessonId, NoteId } from '@hearthvale/core';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { EventBus } from '../../game/eventBus';
import type { GameStore } from '../../game/store';
import { LESSON_TEXT, NOTE_TEXT } from './lessonText';

const COLLAPSE_MS = 8000;
const DONE_FLASH_MS = 1200;

interface LessonUi {
  /** Goal card shows its body and chips. */
  expanded: boolean;
  /** The lesson just finished, shown ticked for a moment. */
  doneFlash: LessonId | null;
  noteQueue: NoteId[];
  /** Set when the path completes; the panel opens once no other overlay is open. */
  completeGift: number | null;
  /** Text for the screen-reader live region; changes only on lesson and note events. */
  announce: string;
  setExpanded(expanded: boolean): void;
  dismissNote(): void;
  clearComplete(): void;
}

/** Transient lesson UI state; never saved. */
export const lessonStore = createStore<LessonUi>()((set) => ({
  expanded: false,
  doneFlash: null,
  noteQueue: [],
  completeGift: null,
  announce: '',
  setExpanded: (expanded) => {
    set({ expanded });
  },
  dismissNote: () => {
    set((s) => ({ noteQueue: s.noteQueue.slice(1) }));
  },
  clearComplete: () => {
    set({ completeGift: null });
  },
}));

export function useLessons<T>(selector: (s: LessonUi) => T): T {
  return useStore(lessonStore, selector);
}

/** Routes core lesson events into the lesson UI (spec §4.7). */
export function installLessonBridge(store: StoreApi<GameStore>, bus: EventBus): () => void {
  let collapse: ReturnType<typeof setTimeout> | undefined;
  let flash: ReturnType<typeof setTimeout> | undefined;
  const openComplete = () => {
    if (lessonStore.getState().completeGift !== null && store.getState().overlay === null)
      store.getState().setOverlay('lessons');
  };
  const offs = [
    bus.on('lessonStarted', (e) => {
      const t = LESSON_TEXT[e.id];
      lessonStore.setState({ expanded: true, announce: `New goal: ${t.title}. ${t.body}` });
      clearTimeout(collapse);
      collapse = setTimeout(() => {
        lessonStore.setState({ expanded: false });
      }, COLLAPSE_MS);
    }),
    bus.on('lessonDone', (e) => {
      lessonStore.setState({ doneFlash: e.id, announce: `Done: ${LESSON_TEXT[e.id].title}` });
      clearTimeout(flash);
      flash = setTimeout(() => {
        lessonStore.setState({ doneFlash: null });
      }, DONE_FLASH_MS);
    }),
    bus.on('noteShown', (e) => {
      const t = NOTE_TEXT[e.id];
      lessonStore.setState((s) => ({
        noteQueue: [...s.noteQueue, e.id],
        announce: `Note: ${t.title}. ${t.body}`,
      }));
    }),
    bus.on('lessonsComplete', (e) => {
      lessonStore.setState({ completeGift: e.gift });
      openComplete();
    }),
    store.subscribe((s, p) => {
      if (s.overlay === null && p.overlay !== null) openComplete();
    }),
  ];
  return () => {
    clearTimeout(collapse);
    clearTimeout(flash);
    offs.forEach((off) => {
      off();
    });
  };
}
