import { FIELD_RECT } from '../data/layouts';
import { LESSON_GOAL, LESSON_ORDER, LESSONS_GIFT } from '../data/lessons';
import type { GameEvent, GameState, LessonId, Result, Tile } from '../types';

const farmTiles = (s: GameState): Tile[] => s.maps.farm.tiles;
const cropCount = (s: GameState) => farmTiles(s).filter((t) => t.crop).length;
const allWatered = (s: GameState) => {
  const crops = farmTiles(s).filter((t) => t.crop);
  return crops.length > 0 && crops.every((t) => t.watered === true);
};
const hasSeed = (s: GameState) => s.bag.some((c) => c?.id.startsWith('seed:'));
const binTotal = (s: GameState) => s.bin.reduce((n, c) => n + c.qty, 0);
const inField = (s: GameState) => {
  const x = Math.floor(s.player.x);
  const y = Math.floor(s.player.z);
  const { x0, y0, x1, y1 } = FIELD_RECT;
  return s.player.location === 'farm' && x >= x0 && x <= x1 && y >= y0 && y <= y1;
};
const count = (events: GameEvent[], type: GameEvent['type']) =>
  events.filter((e) => e.type === type).length;

/** Spec §3.2, "Done when". */
function isDone(id: LessonId, prev: GameState, next: GameState, events: GameEvent[]): boolean {
  const goal = LESSON_GOAL[id] ?? 0;
  switch (id) {
    case 'walkToField':
      return inField(next);
    case 'till':
      return next.tutorial.count >= goal;
    case 'plant':
      return next.tutorial.count >= goal || (next.tutorial.count >= 1 && !hasSeed(next));
    case 'water':
    case 'waterDaily':
      return allWatered(next);
    case 'sleep':
      return count(events, 'dayStarted') > 0;
    case 'harvest':
      return count(events, 'cropHarvested') > 0;
    case 'ship':
      return binTotal(next) > binTotal(prev);
    case 'sellOvernight':
      return events.some((e) => e.type === 'shippingReport' && e.total > 0);
    case 'buySeeds':
      return (
        events.some((e) => e.type === 'itemGained' && e.item.startsWith('seed:')) &&
        events.some((e) => e.type === 'goldChanged' && e.delta < 0)
      );
  }
}

/** Spec §3.2, "Already done when it starts". */
function doneAtStart(id: LessonId, s: GameState): boolean {
  switch (id) {
    case 'walkToField':
      return inField(s);
    case 'till':
      return (
        farmTiles(s).filter((t) => t.kind === 'tilled' && !t.crop).length >= 3 || cropCount(s) >= 3
      );
    case 'plant':
      return cropCount(s) >= 3;
    case 'water':
    case 'waterDaily':
      return allWatered(s);
    case 'ship':
      return s.bin.length > 0;
    default:
      return false;
  }
}

function complete(state: GameState, events: GameEvent[]): GameState {
  const gold = state.gold + LESSONS_GIFT;
  events.push(
    { type: 'goldChanged', gold, delta: LESSONS_GIFT },
    { type: 'lessonsComplete', gift: LESSONS_GIFT },
  );
  return { ...state, gold, tutorial: { ...state.tutorial, lesson: 'complete', count: 0 } };
}

/** Start a lesson, passing straight through any the farm already satisfies (spec §3.4). */
export function startLesson(state: GameState, id: LessonId, events: GameEvent[]): GameState {
  let lesson: LessonId | undefined = id;
  let s = state;
  while (lesson) {
    s = { ...s, tutorial: { ...s.tutorial, lesson, count: 0 } };
    events.push({ type: 'lessonStarted', id: lesson });
    if (!doneAtStart(lesson, s)) return s;
    events.push({ type: 'lessonDone', id: lesson });
    lesson = LESSON_ORDER[LESSON_ORDER.indexOf(lesson) + 1];
  }
  return complete(s, events);
}

/** Runs after every command (spec §3.3). Pure; touches only `tutorial` and the gift's `gold`. */
export function advanceTutorial(prev: GameState, next: GameState, events: GameEvent[]): Result {
  const { lesson } = next.tutorial;
  if (lesson === 'off' || lesson === 'complete') return { state: next, events };
  const out = [...events];
  let s = next;
  // 1. count
  if (lesson === 'till' || lesson === 'plant') {
    const add = count(events, lesson === 'till' ? 'tileTilled' : 'cropPlanted');
    if (add > 0) s = { ...s, tutorial: { ...s.tutorial, count: s.tutorial.count + add } };
  }
  // 2. done → next lesson (or complete past the last one)
  if (isDone(lesson, prev, s, events)) {
    out.push({ type: 'lessonDone', id: lesson });
    const following = LESSON_ORDER[LESSON_ORDER.indexOf(lesson) + 1];
    s = following ? startLesson(s, following, out) : complete(s, out);
  }
  // 3. adaptive rules (Task 3)
  // 4. notes (Task 3)
  return { state: s, events: out };
}

export function skipLessons(state: GameState): Result {
  if (state.tutorial.lesson === 'off') return { state, events: [] };
  return {
    state: { ...state, tutorial: { ...state.tutorial, lesson: 'off', count: 0 } },
    events: [],
  };
}

export function restartLessons(state: GameState): Result {
  const events: GameEvent[] = [];
  return { state: startLesson(state, 'walkToField', events), events };
}
