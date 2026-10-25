import type { LessonId, NoteId } from '../types';

/** Grandpa's lessons, in the order they are taught (spec §3.2). */
export const LESSON_ORDER: readonly LessonId[] = [
  'walkToField',
  'till',
  'plant',
  'water',
  'sleep',
  'waterDaily',
  'harvest',
  'ship',
  'sellOvernight',
  'buySeeds',
];

/** Lessons whose card shows "count / goal". */
export const LESSON_GOAL: Partial<Record<LessonId, number>> = { till: 3, plant: 3 };

/** One-time notes, in priority order when several trigger at once (spec §3.7). */
export const NOTE_IDS: readonly NoteId[] = [
  'canEmpty',
  'staminaLow',
  'exhausted',
  'passedOut',
  'rain',
  'obstacles',
  'wrongSeason',
  'newSeason',
  'bagFull',
  'cartClosed',
];

/** Gold given when the last lesson is done. */
export const LESSONS_GIFT = 100;
