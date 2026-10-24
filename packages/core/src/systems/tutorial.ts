import { CROP_IDS, CROPS } from '../data/crops';
import { FIELD_RECT } from '../data/layouts';
import { LESSON_GOAL, LESSON_ORDER, LESSONS_GIFT, NOTE_IDS } from '../data/lessons';
import { findFeature, tileAt } from '../grid';
import { targetTile } from './movement';
import type {
  GameEvent,
  GameState,
  Grid,
  HotbarIndex,
  LessonId,
  LocationId,
  NoteId,
  Result,
  Tile,
} from '../types';
import { isMature } from './crops';

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

const seasonSeeds = (s: GameState) => CROP_IDS.filter((c) => CROPS[c].season === s.calendar.season);
const hasSeasonSeed = (s: GameState) =>
  s.bag.some((c) => c !== null && seasonSeeds(s).some((crop) => c.id === `seed:${crop}`));

/** Spec §3.5: never trap the player on a lesson they can no longer finish. */
function adapt(s: GameState, events: GameEvent[]): GameState {
  const { lesson } = s.tutorial;
  const needsCrops =
    lesson === 'plant' || lesson === 'water' || lesson === 'waterDaily' || lesson === 'harvest';
  if (needsCrops && cropCount(s) === 0) {
    if (hasSeasonSeed(s)) return lesson === 'plant' ? s : startLesson(s, 'plant', events);
    s = startLesson(s, 'buySeeds', events);
  }
  if (s.tutorial.lesson !== 'buySeeds' || hasSeed(s) || cropCount(s) > 0) return s;
  const costs = seasonSeeds(s).map((c) => CROPS[c].seedCost);
  const broke = costs.length === 0 || s.gold < Math.min(...costs);
  return broke ? complete(s, events) : s;
}

const failed = (events: GameEvent[], reason: string) =>
  events.some((e) => e.type === 'actionFailed' && e.reason === reason);

/** Spec §3.7 triggers. */
function triggered(id: NoteId, next: GameState, events: GameEvent[]): boolean {
  switch (id) {
    case 'canEmpty':
    case 'wrongSeason':
    case 'bagFull':
    case 'cartClosed':
      return failed(events, id);
    case 'staminaLow':
    case 'exhausted':
    case 'passedOut':
      return count(events, id) > 0;
    case 'rain':
      return (
        count(events, 'dayStarted') > 0 &&
        (next.weather.today === 'rain' || next.weather.today === 'storm')
      );
    case 'newSeason':
      return count(events, 'seasonChanged') > 0;
    case 'obstacles': {
      const missed =
        events.some((e) => e.type === 'toolUsed' && !e.hit) || failed(events, 'noTarget');
      if (!missed) return false;
      const { x, y } = targetTile(next.player);
      const kind = tileAt(next.maps[next.player.location], x, y)?.kind;
      return kind === 'weed' || kind === 'rock' || kind === 'stump';
    }
  }
}

/** Shows at most one unseen note whose trigger fired in this command's `events`; appends to `out`. */
function note(s: GameState, events: GameEvent[], out: GameEvent[]): GameState {
  const id = NOTE_IDS.find((n) => !s.tutorial.notesSeen.includes(n) && triggered(n, s, events));
  if (!id) return s;
  out.push({ type: 'noteShown', id });
  return { ...s, tutorial: { ...s.tutorial, notesSeen: [...s.tutorial.notesSeen, id] } };
}

/** Runs after every command (spec §3.3). Pure; touches only `tutorial` and the gift's `gold`. */
export function advanceTutorial(prev: GameState, next: GameState, events: GameEvent[]): Result {
  const { lesson } = next.tutorial;
  if (lesson === 'off') return { state: next, events };
  const out = [...events];
  let s = next;
  if (lesson !== 'complete') {
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
    // 3. adaptive rules
    s = adapt(s, out);
  }
  // 4. notes (also after completion)
  s = note(s, events, out);
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

export interface LessonTarget {
  location: LocationId;
  x: number;
  y: number;
}

/** Nearest tile by Manhattan distance; row-major scan keeps the lower y, then lower x, on ties. */
function nearest(
  grid: Grid,
  from: { x: number; y: number },
  match: (t: Tile, x: number, y: number) => boolean,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  grid.tiles.forEach((t, i) => {
    const x = i % grid.width;
    const y = Math.floor(i / grid.width);
    if (!match(t, x, y)) return;
    const d = Math.abs(x - from.x) + Math.abs(y - from.y);
    if (d < bestD) {
      best = { x, y };
      bestD = d;
    }
  });
  return best;
}

const fieldGrass = (t: Tile, x: number, y: number) =>
  t.kind === 'grass' &&
  x >= FIELD_RECT.x0 &&
  x <= FIELD_RECT.x1 &&
  y >= FIELD_RECT.y0 &&
  y <= FIELD_RECT.y1;

/** Where the marker goes for the active lesson (spec §3.9). */
export function lessonTarget(state: GameState): LessonTarget | null {
  const { lesson } = state.tutorial;
  if (lesson === 'off' || lesson === 'complete') return null;
  const { farm, house } = state.maps;
  const from = { x: Math.floor(state.player.x), y: Math.floor(state.player.z) };
  // Positions measured from the player only make sense on the farm; in the house use the door.
  const onFarm = (match: (t: Tile, x: number, y: number) => boolean) =>
    nearest(farm, state.player.location === 'farm' ? from : findFeature(farm, 'houseDoor'), match);
  let target: LessonTarget | null = null;
  const put = (location: LocationId, p: { x: number; y: number } | null) => {
    target = p ? { location, ...p } : null;
  };
  switch (lesson) {
    case 'walkToField':
    case 'till':
      put('farm', onFarm(fieldGrass));
      break;
    case 'plant':
      put('farm', onFarm((t) => t.kind === 'tilled' && !t.crop) ?? onFarm(fieldGrass));
      break;
    case 'water':
    case 'waterDaily':
      put(
        'farm',
        onFarm((t) => t.crop !== undefined && t.watered !== true),
      );
      break;
    case 'harvest':
      put(
        'farm',
        onFarm((t) => t.crop !== undefined && isMature(t.crop)),
      );
      break;
    case 'sleep':
    case 'sellOvernight':
      put('house', findFeature(house, 'bed'));
      break;
    case 'ship':
      put('farm', findFeature(farm, 'bin'));
      break;
    case 'buySeeds':
      put('farm', findFeature(farm, 'cart'));
      break;
  }
  const t = target as LessonTarget | null;
  if (!t || t.location === state.player.location) return t;
  const here = state.player.location;
  return {
    location: here,
    ...findFeature(state.maps[here], here === 'farm' ? 'houseDoor' : 'exitDoor'),
  };
}

/** The hotbar slot the active lesson wants (spec §3.9). */
export function lessonSlot(state: GameState): HotbarIndex | null {
  switch (state.tutorial.lesson) {
    case 'till':
      return 0;
    case 'water':
    case 'waterDaily':
      return 1;
    case 'harvest':
      return 2;
    case 'plant': {
      const i = state.quickSlots.findIndex(
        (b) => b !== null && state.bag[b]?.id.startsWith('seed:') === true,
      );
      return i < 0 ? null : ((5 + i) as HotbarIndex);
    }
    default:
      return null;
  }
}
