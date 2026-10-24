import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { CROPS } from '../src/data/crops';
import { BALANCE } from '../src/data/balance';
import type { Command, CropId, GameEvent, GameState, NoteId, Result } from '../src/types';
import { blankFarm, fresh, lessonAt, standAt, withBag, withTile } from './helpers';

const types = (r: Result) => r.events.map((e) => e.type);
const done = (r: Result) => r.events.flatMap((e) => (e.type === 'lessonDone' ? [e.id] : []));
const run = (s: GameState, cmds: Parameters<typeof applyCommand>[1][]) =>
  cmds.reduce<{ state: GameState; events: GameEvent[] }>(
    (acc, c) => {
      const r = applyCommand(acc.state, c);
      return { state: r.state, events: [...acc.events, ...r.events] };
    },
    { state: s, events: [] },
  );
const crop = (id: CropId = 'turnip', age = 0) => ({
  kind: 'tilled' as const,
  crop: { id, age, regrowing: false },
});
/** Farm with plain grass, the player standing on (x, y). */
const farm = (x = 10, y = 10, facing: GameState['player']['facing'] = 'e') =>
  standAt(blankFarm(fresh()), x, y, facing);
const atMinute = (s: GameState, minute: number) => ({
  ...s,
  calendar: { ...s.calendar, minute },
});
const inHouse = (s: GameState) => ({ ...s, player: { ...s.player, location: 'house' as const } });

describe('lesson progression', () => {
  it('walkToField completes on entering the field and starts till', () => {
    const s = lessonAt(farm(10, 17, 'n'), 'walkToField');
    const r = run(s, [{ type: 'move', dx: 0, dz: -1, dtMs: 500 }]);
    expect(done(r)).toEqual(['walkToField']);
    expect(r.state.tutorial).toMatchObject({ lesson: 'till', count: 0 });
    expect(r.events).toContainEqual({ type: 'lessonStarted', id: 'till' });
  });

  it('till counts tileTilled events and completes at 3', () => {
    let s = lessonAt(farm(10, 10, 'e'), 'till');
    const till = (x: number) => applyCommand(standAt(s, x, 10, 'e'), { type: 'useTool' });
    let r = till(10);
    expect(r.state.tutorial).toMatchObject({ lesson: 'till', count: 1 });
    s = r.state;
    r = till(11);
    s = r.state;
    expect(s.tutorial.count).toBe(2);
    r = till(12);
    expect(done(r)).toEqual(['till']);
    expect(r.state.tutorial).toMatchObject({ lesson: 'plant', count: 0 });
  });

  it('plant completes at 3, or after 1 when no seeds are left', () => {
    const base = withTile(lessonAt(farm(10, 10, 'e'), 'plant'), 11, 10, { kind: 'tilled' });
    const one = withBag(base, [{ id: 'seed:turnip', qty: 1 }]);
    const r = run(one, [{ type: 'selectHotbar', index: 5 }, { type: 'useItem' }]);
    expect(done(r)).toEqual(['plant']);
    expect(r.state.tutorial.lesson).toBe('water');

    const many = run(base, [{ type: 'selectHotbar', index: 5 }, { type: 'useItem' }]);
    expect(many.state.tutorial).toMatchObject({ lesson: 'plant', count: 1 });
  });

  it('water completes when every farm crop is watered', () => {
    let s = lessonAt(farm(10, 10, 'e'), 'water');
    s = withTile(withTile(s, 11, 10, crop()), 12, 10, crop());
    const first = run(s, [{ type: 'selectHotbar', index: 1 }, { type: 'useTool' }]);
    expect(first.state.tutorial.lesson).toBe('water');
    const second = run(standAt(first.state, 11, 10, 'e'), [{ type: 'useTool' }]);
    expect(done(second)).toEqual(['water']);
    expect(second.state.tutorial.lesson).toBe('sleep');
  });

  it('sleep completes on dayStarted, by bed or by passing out', () => {
    const s = lessonAt(withTile(farm(), 11, 10, crop()), 'sleep');
    const bed = applyCommand(inHouse(s), { type: 'sleep' });
    expect(done(bed)).toContain('sleep');
    expect(bed.state.tutorial.lesson).toBe('waterDaily');
    const late = applyCommand(atMinute(s, 1559), { type: 'tick', minutes: 2 });
    expect(done(late)).toContain('sleep');
  });

  it('waterDaily completes at once on a rainy morning', () => {
    let s = lessonAt(inHouse(withTile(farm(), 11, 10, crop())), 'sleep');
    s = { ...s, weather: { today: 'sunny', tomorrow: 'rain' } };
    const r = applyCommand(s, { type: 'sleep' });
    expect(done(r)).toEqual(['sleep', 'waterDaily']);
    expect(r.state.tutorial.lesson).toBe('harvest');
  });

  it('harvest completes by hand or by sickle', () => {
    const ripe = withTile(
      lessonAt(farm(10, 10, 'e'), 'harvest'),
      11,
      10,
      crop('turnip', CROPS.turnip.days),
    );
    const hand = applyCommand(ripe, { type: 'interact' });
    expect(done(hand)).toContain('harvest');
    const sickle = run(ripe, [{ type: 'selectHotbar', index: 2 }, { type: 'useTool' }]);
    expect(done(sickle)).toContain('harvest');
  });

  it('ship completes when the bin gains items', () => {
    const s = withBag(lessonAt(farm(), 'ship'), [{ id: 'turnip', qty: 2 }]);
    const r = applyCommand(s, { type: 'shipItem', bagIndex: 0, qty: 1 });
    expect(done(r)).toEqual(['ship']);
    expect(r.state.tutorial.lesson).toBe('sellOvernight');
  });

  it('sellOvernight completes on a shipping report with money', () => {
    const s = inHouse(lessonAt(farm(), 'sellOvernight'));
    const empty = applyCommand(s, { type: 'sleep' });
    expect(empty.state.tutorial.lesson).toBe('sellOvernight');
    const r = applyCommand({ ...s, bin: [{ id: 'turnip', qty: 1 }] }, { type: 'sleep' });
    expect(done(r)).toContain('sellOvernight');
    expect(r.state.tutorial.lesson).toBe('buySeeds');
  });

  it('buySeeds completes the path and gives 100 gold once', () => {
    const sold = { ...farm(30, 17, 'e'), milestones: ['firstShipment' as const] };
    const s = atMinute(lessonAt(sold, 'buySeeds'), 600);
    const r = applyCommand(s, { type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
    expect(r.state.tutorial.lesson).toBe('complete');
    expect(r.state.gold).toBe(s.gold - CROPS.turnip.seedCost + 100);
    expect(r.events).toContainEqual({ type: 'lessonsComplete', gift: 100 });
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'goldChanged', delta: 100 }));
    const again = applyCommand(r.state, { type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
    expect(types(again)).not.toContain('lessonsComplete');
  });

  it('restartLessons passes through lessons the farm already satisfies', () => {
    let s: GameState = {
      ...farm(10, 10, 'e'),
      tutorial: { lesson: 'off', count: 0, notesSeen: [], gifted: false },
    };
    for (const x of [11, 12, 13]) s = withTile(s, x, 10, { ...crop(), watered: true });
    const r = applyCommand(s, { type: 'restartLessons' });
    expect(done(r)).toEqual(['walkToField', 'till', 'plant', 'water']);
    expect(r.state.tutorial).toMatchObject({ lesson: 'sleep', count: 0 });
  });

  it('skipLessons turns lessons off and keeps notesSeen', () => {
    const s = lessonAt(farm(), 'plant', 2);
    const seen = { ...s, tutorial: { ...s.tutorial, notesSeen: ['rain' as const] } };
    const r = applyCommand(seen, { type: 'skipLessons' });
    expect(r.state.tutorial).toEqual({
      lesson: 'off',
      count: 0,
      notesSeen: ['rain'],
      gifted: false,
    });
    expect(r.events).toEqual([]);
  });

  it('emits no lesson events while lessons are off', () => {
    let s = inHouse(fresh());
    const events: GameEvent[] = [];
    for (let night = 0; night < 7; night++) {
      const r = applyCommand(s, { type: 'sleep' });
      events.push(...r.events);
      s = inHouse(r.state);
    }
    expect(events.some((e) => e.type.startsWith('lesson'))).toBe(false);
  });
});

const notes = (r: Result) => r.events.flatMap((e) => (e.type === 'noteShown' ? [e.id] : []));
const noCrops = (s: GameState) => blankFarm(s);

describe('adaptive rules', () => {
  it('all crops gone with seeds in bag → back to plant', () => {
    const s = lessonAt(noCrops(farm()), 'waterDaily');
    const r = applyCommand(s, { type: 'tick', minutes: 1 });
    expect(r.state.tutorial.lesson).toBe('plant');
    expect(r.events).toContainEqual({ type: 'lessonStarted', id: 'plant' });
  });

  it('all crops gone and no seeds → buySeeds', () => {
    const s = withBag(lessonAt(noCrops(farm()), 'harvest'), []);
    expect(applyCommand(s, { type: 'tick', minutes: 1 }).state.tutorial.lesson).toBe('buySeeds');
  });

  it('out-of-season seeds only → buySeeds', () => {
    const s = withBag(lessonAt(noCrops(farm()), 'water'), [{ id: 'seed:tomato', qty: 3 }]);
    expect(applyCommand(s, { type: 'tick', minutes: 1 }).state.tutorial.lesson).toBe('buySeeds');
  });

  it('nothing left to learn with → complete with gift', () => {
    const s = { ...withBag(lessonAt(noCrops(farm()), 'buySeeds'), []), gold: 10 };
    const r = applyCommand(s, { type: 'tick', minutes: 1 });
    expect(r.state.tutorial.lesson).toBe('complete');
    expect(r.state.gold).toBe(110);
    expect(r.events).toContainEqual({ type: 'lessonsComplete', gift: 100 });
  });

  it('winter with no seeds and no crops → complete with gift', () => {
    const s = withBag(lessonAt(noCrops(farm()), 'buySeeds'), []);
    const winter = { ...s, calendar: { ...s.calendar, season: 'winter' as const } };
    expect(applyCommand(winter, { type: 'tick', minutes: 1 }).state.tutorial.lesson).toBe(
      'complete',
    );
  });

  it('buySeeds waits while the player can still afford seeds', () => {
    const s = withBag(lessonAt(noCrops(farm()), 'buySeeds'), []);
    expect(applyCommand(s, { type: 'tick', minutes: 1 }).state.tutorial.lesson).toBe('buySeeds');
  });

  it('crops dying while others remain does not move the lesson', () => {
    const s = withTile(lessonAt(farm(), 'waterDaily'), 11, 10, crop());
    expect(applyCommand(s, { type: 'tick', minutes: 1 }).state.tutorial.lesson).toBe('waterDaily');
  });
});

/** A state and command that trigger each note once (lesson 'harvest', which nothing here completes). */
const TRIGGERS: [NoteId, () => GameState, Command][] = [
  [
    'canEmpty',
    () => ({ ...lessonAt(farm(), 'harvest'), activeSlot: 1, canCharges: 0 }),
    { type: 'useTool' },
  ],
  [
    'staminaLow',
    () => ({
      ...lessonAt(farm(), 'harvest'),
      player: { ...farm().player, stamina: BALANCE.staminaLowAt + 1 },
    }),
    { type: 'useTool' },
  ],
  [
    'exhausted',
    () => ({ ...lessonAt(farm(), 'harvest'), player: { ...farm().player, stamina: 1 } }),
    { type: 'useTool' },
  ],
  [
    'passedOut',
    () => atMinute(lessonAt(farm(), 'harvest'), BALANCE.passOutMinute - 1),
    { type: 'tick', minutes: 2 },
  ],
  [
    'rain',
    () => ({
      ...inHouse(lessonAt(farm(), 'harvest')),
      weather: { today: 'sunny', tomorrow: 'rain' },
    }),
    { type: 'sleep' },
  ],
  [
    'obstacles',
    () => withTile(lessonAt(farm(10, 10, 'e'), 'harvest'), 11, 10, { kind: 'weed' }),
    { type: 'useTool' },
  ],
  [
    'wrongSeason',
    () => atMinute(lessonAt(farm(), 'harvest'), 600),
    { type: 'buyItem', itemId: 'seed:tomato', qty: 1 },
  ],
  [
    'newSeason',
    () => {
      const s = inHouse(lessonAt(farm(), 'harvest'));
      return { ...s, calendar: { ...s.calendar, day: BALANCE.seasonDays } };
    },
    { type: 'sleep' },
  ],
  [
    'bagFull',
    () =>
      atMinute(
        withBag(
          lessonAt(farm(), 'harvest'),
          Array.from({ length: 12 }, () => ({ id: 'stone' as const, qty: 99 })),
        ),
        600,
      ),
    { type: 'buyItem', itemId: 'seed:turnip', qty: 1 },
  ],
  [
    'cartClosed',
    () => atMinute(lessonAt(farm(), 'harvest'), 400),
    { type: 'buyItem', itemId: 'seed:turnip', qty: 1 },
  ],
];

describe('notes', () => {
  it.each(TRIGGERS)('note %s shows once', (id, make, cmd) => {
    const r1 = applyCommand(make(), cmd);
    expect(notes(r1)).toEqual([id]);
    expect(r1.state.tutorial.notesSeen).toContain(id);
    const again = { ...make(), tutorial: r1.state.tutorial };
    expect(notes(applyCommand(again, cmd))).toEqual([]);
  });

  it('shows at most one note per command, first in NOTE_IDS order', () => {
    // Passing out the night before rain: passedOut and rain fire in the same command.
    const base = atMinute(lessonAt(farm(), 'harvest'), BALANCE.passOutMinute - 1);
    const s = { ...base, weather: { today: 'sunny' as const, tomorrow: 'rain' as const } };
    const r = applyCommand(s, { type: 'tick', minutes: 2 });
    expect(types(r)).toEqual(expect.arrayContaining(['passedOut', 'dayStarted']));
    expect(r.state.weather.today).toBe('rain');
    expect(notes(r)).toEqual(['passedOut']);
  });

  it('shows no notes when lessons are off, but still after completion', () => {
    const [, make, cmd] = TRIGGERS[0] as (typeof TRIGGERS)[number];
    const off = make();
    expect(
      notes(applyCommand({ ...off, tutorial: { ...off.tutorial, lesson: 'off' } }, cmd)),
    ).toEqual([]);
    expect(
      notes(applyCommand({ ...off, tutorial: { ...off.tutorial, lesson: 'complete' } }, cmd)),
    ).toEqual(['canEmpty']);
  });
});

describe('review fixes', () => {
  it('gives the gift once per save, however often lessons restart', () => {
    // Winter, no seeds, no crops, standing in the field with bare soil: a restart completes at once.
    let s: GameState = withBag(farm(10, 10, 'e'), []);
    for (const x of [11, 12, 13]) s = withTile(s, x, 10, { kind: 'tilled' });
    s = { ...s, calendar: { ...s.calendar, season: 'winter' } };
    const gold = s.gold;
    for (let i = 0; i < 5; i++) s = applyCommand(s, { type: 'restartLessons' }).state;
    expect(s.tutorial.lesson).toBe('complete');
    expect(s.gold).toBe(gold + 100);
    const again = applyCommand(s, { type: 'restartLessons' });
    expect(again.events).toContainEqual({ type: 'lessonsComplete', gift: 0 });
    expect(again.events.some((e) => e.type === 'goldChanged')).toBe(false);
  });

  it('after crops die mid-path, buying seeds goes back to planting until the first sale', () => {
    const s = atMinute(lessonAt(farm(30, 17, 'e'), 'buySeeds'), 600);
    const r = applyCommand(s, { type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
    expect(done(r)).toEqual(['buySeeds']);
    expect(r.state.tutorial.lesson).toBe('plant');
    expect(r.events.some((e) => e.type === 'lessonsComplete')).toBe(false);
  });
});
