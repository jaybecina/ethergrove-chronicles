/**
 * Parity scenarios: each one replays the `applyCommand` cases of a core test file as recorded steps, so the
 * GDScript port (apps/game/core) can be checked against the TypeScript rules. Teleports and test set-ups are
 * `patch` and `tile` steps; rules only ever run through `cmd` steps.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CROP_IDS, CROPS } from '../../src/data/crops';
import { ITEMS } from '../../src/data/items';
import { BALANCE, TOOL_ORDER } from '../../src/data/balance';
import { tileAt } from '../../src/grid';
import { createNewGame } from '../../src/newGame';
import { nextFloat } from '../../src/rng';
import { migrate } from '../../src/save/migrate';
import type {
  CropId,
  Facing,
  ItemStack,
  LessonId,
  NoteId,
  Season,
  Tile,
  ToolId,
} from '../../src/types';
import { blankFarm } from '../helpers';
import { type Fixture, type FixtureStart, type Recorder, record } from './recorder';

const START: FixtureStart = { seed: 1, farmName: 'Elm', playerName: 'Ari', lessons: false };
const LESSONS: FixtureStart = { ...START, lessons: true };

// ---------------------------------------------------------------- set-up helpers (all recorded as steps)

const cells = (stacks: (ItemStack | null)[]): (ItemStack | null)[] =>
  Array.from({ length: BALANCE.bagSlots }, (_, i) => stacks[i] ?? null);
const STONES: ItemStack[] = Array.from({ length: BALANCE.bagSlots }, () => ({
  id: 'stone',
  qty: 99,
}));
const tilled: Tile = { kind: 'tilled', watered: false };
const cropTile = (id: CropId, age: number, watered = false): Tile => ({
  kind: 'tilled',
  watered,
  crop: { id, age, regrowing: false },
});

/** `standAt` of the test helpers: on tile (x, y), facing the given way. */
function standAt(r: Recorder, x: number, y: number, facing: Facing): void {
  r.patch({ player: { x: x + 0.5, z: y + 0.5, facing } });
}

function goTo(r: Recorder, location: 'farm' | 'house'): void {
  r.patch({ player: { location } });
}

function fillBag(r: Recorder, stacks: (ItemStack | null)[]): void {
  r.patch({ bag: cells(stacks) });
}

function lessonAt(r: Recorder, lesson: LessonId, count = 0): void {
  r.patch({ tutorial: { lesson, count } });
}

function minute(r: Recorder, m: number): void {
  r.patch({ calendar: { minute: m } });
}

const select = (r: Recorder, tool: ToolId): void => {
  r.cmd({ type: 'selectHotbar', index: TOOL_ORDER.indexOf(tool) as 0 | 1 | 2 | 3 | 4 });
};

/** Sleep in the house (a teleport, then the `sleep` command), then step back out onto the farm. */
const sleepThenFarm = (r: Recorder): void => {
  goTo(r, 'house');
  r.cmd({ type: 'sleep' });
  goTo(r, 'farm');
};

interface ResetOptions {
  /** Clear weeds, rocks and stumps (`blankFarm(fresh())`); default true. */
  blank?: boolean;
  /** Keep the current `tutorial` (notes seen, the lesson) instead of the new game's. */
  keepTutorial?: boolean;
}

/**
 * Back to `fresh()` between cases: patch every field of the new game except the maps (and `harvested`,
 * which a merge cannot shrink), then put back each farm tile that differs. The player ends on the farm.
 */
function reset(r: Recorder, start: FixtureStart, opts: ResetOptions = {}): void {
  const base = createNewGame(start);
  const { maps: _maps, harvested: _harvested, tutorial, ...rest } = base;
  r.patch(opts.keepTutorial === true ? rest : { ...rest, tutorial });
  const blank = opts.blank ?? true;
  if (blank) r.blankFarm();
  const want = blank ? blankFarm(base).maps.farm : base.maps.farm;
  r.state.maps.farm.tiles.forEach((t, i) => {
    const w = want.tiles[i];
    if (w && JSON.stringify(t) !== JSON.stringify(w))
      r.tile(i % want.width, Math.floor(i / want.width), w);
  });
}

// ---------------------------------------------------------------- rng, new game, save

/** The first 1,000 `nextFloat` values and states for each seed. */
export function rng(): {
  seeds: Record<string, number[]>;
  states: Record<string, number[]>;
} {
  const seeds: Record<string, number[]> = {};
  const states: Record<string, number[]> = {};
  for (const seed of [1, 42, 2147483647]) {
    const values: number[] = [];
    const after: number[] = [];
    let r = seed;
    for (let i = 0; i < 1000; i++) {
      const [v, next] = nextFloat(r);
      values.push(v);
      after.push(next);
      r = next;
    }
    seeds[String(seed)] = values;
    states[String(seed)] = after;
  }
  return { seeds, states };
}

export const NEW_GAME_SEEDS = [1, 42, 2147483647, -5, 4294967295] as const;

export const newGameName = (seed: number, lessons: boolean): string =>
  `new-game-${seed < 0 ? `neg${String(-seed)}` : String(seed)}-lessons-${lessons ? 'on' : 'off'}`;

/** `createNewGame` alone: no steps, the new game is the final state. */
export function newGame(seed: number, lessons: boolean): Fixture {
  return record(newGameName(seed, lessons), { ...START, seed, lessons }, () => undefined);
}

/** The real Part 1 save and what `migrate` makes of it. */
export function save(): { v1: unknown; v2: unknown } {
  const v1: unknown = JSON.parse(
    readFileSync(join(import.meta.dirname, '../fixtures/part1-save-v1.json'), 'utf8'),
  );
  const r = migrate(v1);
  if (!r.ok) throw new Error(`part1-save-v1.json no longer migrates: ${r.error}`);
  return { v1, v2: r.file };
}

// ---------------------------------------------------------------- tools.test.ts

export function tools(): Fixture {
  return record('tools', START, (r) => {
    /** Player on (10,10) facing east; target tile is (11,10). */
    const setup = (tool: ToolId, target: Tile = { kind: 'grass' }): void => {
      reset(r, START);
      standAt(r, 10, 10, 'e');
      select(r, tool);
      r.tile(11, 10, target);
    };
    const use = (): void => {
      r.cmd({ type: 'useTool' });
    };

    // hoe
    setup('hoe');
    use();
    setup('hoe', { kind: 'rock', hits: 0 });
    use();
    // watering can
    setup('can', tilled);
    use();
    setup('can', tilled);
    r.patch({ canCharges: 0 });
    use();
    setup('can');
    r.patch({ canCharges: 3 });
    standAt(r, 7, 19, 'w');
    use();
    // sickle, axe, hammer
    setup('sickle', { kind: 'weed' });
    use();
    setup('axe', { kind: 'stump', hits: 0 });
    use();
    r.snapshot();
    use();
    use();
    setup('hammer', { kind: 'rock', hits: 0 });
    use();
    use();
    setup('hammer', { kind: 'tilled', watered: true });
    use();
    setup('sickle', { kind: 'weed' });
    fillBag(r, STONES);
    use();
    // stamina
    setup('axe', { kind: 'stump', hits: 0 });
    r.patch({ player: { stamina: 1 } });
    use();
    setup('hoe');
    r.patch({ player: { stamina: 0 } });
    use();
    setup('hoe');
    r.patch({ player: { stamina: 21 } });
    use();
    r.tile(11, 10, { kind: 'grass' });
    use();
    // dispatcher (`move` is not recorded: the Godot port refuses it)
    reset(r, START, { blank: false });
    r.cmd({ type: 'tick', minutes: 15 });
    reset(r, START, { blank: false });
    r.cmd({ type: 'selectHotbar', index: 3 });
    reset(r, START, { blank: false });
    r.cmd({ type: 'cycleHotbar', dir: -1 });
    reset(r, START, { blank: false });
    r.cmd({ type: 'moveBagItem', from: 0, to: 2 });
    reset(r, START, { blank: false });
    r.cmd({ type: 'assignQuickSlot', slot: 1, bagIndex: 0 });
    reset(r, START, { blank: false });
    r.cmd({ type: 'selectHotbar', index: 5 });
    use();
  });
}

// ---------------------------------------------------------------- crops.test.ts

export function crops(): Fixture {
  return record('crops', START, (r) => {
    /** Player on (10,10) facing the tile (11,10), seeds in bag[0], quick slot 5 selected. */
    const field = (target: Tile = tilled, seed: CropId = 'turnip', qty = 5): void => {
      reset(r, START);
      standAt(r, 10, 10, 'e');
      r.tile(11, 10, target);
      fillBag(r, [{ id: `seed:${seed}`, qty }]);
      r.cmd({ type: 'selectHotbar', index: 5 });
    };
    const plant = (): void => {
      r.cmd({ type: 'useItem' });
    };
    /** Water (11,10) and sleep, n times (snapshot after each night when asked). Ends facing the tile. */
    const growWatered = (nights: number, snapshots = false): void => {
      for (let i = 0; i < nights; i++) {
        const t = tileAt(r.state.maps.farm, 11, 10);
        if (!t) throw new Error('missing tile');
        r.tile(11, 10, { ...t, watered: true });
        sleepThenFarm(r);
        if (snapshots) r.snapshot();
        standAt(r, 10, 10, 'e');
      }
    };

    // planting
    field();
    plant();
    field(tilled, 'tomato');
    plant();
    field({ kind: 'grass' });
    plant();
    field();
    plant();
    plant();
    // growth: seed → sprout → young → mature over 4 watered nights
    field();
    plant();
    growWatered(4, true);
    // an unwatered night does not grow
    field();
    plant();
    sleepThenFarm(r);
    // harvest with the sickle
    field();
    plant();
    growWatered(4);
    r.cmd({ type: 'selectHotbar', index: 2 });
    r.cmd({ type: 'useTool' });
    // the sickle on an immature crop is a miss; by hand it is noTarget
    field();
    plant();
    r.cmd({ type: 'selectHotbar', index: 2 });
    r.cmd({ type: 'useTool' });
    r.cmd({ type: 'interact' });
    // strawberry regrows: young after harvest, mature again after 4 watered nights
    field(tilled, 'strawberry');
    plant();
    growWatered(8);
    r.cmd({ type: 'interact' });
    r.snapshot();
    growWatered(3);
    r.snapshot();
    growWatered(1);
    r.cmd({ type: 'interact' });
    // tomato regrows in 3 nights (summer)
    field(tilled, 'tomato');
    r.patch({ calendar: { season: 'summer' } });
    plant();
    growWatered(9);
    r.cmd({ type: 'interact' });
    growWatered(3);
    r.cmd({ type: 'interact' });
    // a full bag blocks the harvest and keeps the crop
    field();
    plant();
    growWatered(4);
    fillBag(r, STONES);
    r.cmd({ type: 'interact' });
    // eating
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'melon', qty: 2 }]);
    r.patch({ player: { stamina: 90 } });
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'useItem' });
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'wood', qty: 2 }]);
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'useItem' });
    // an emptied quick slot fails with noItem
    field();
    fillBag(r, []);
    r.cmd({ type: 'useItem' });
    // the season change kills a turnip but keeps the soil
    field({ kind: 'tilled', watered: true });
    plant();
    r.patch({ calendar: { day: BALANCE.seasonDays } });
    sleepThenFarm(r);
    r.snapshot();
  });
}

// ---------------------------------------------------------------- bag.test.ts

export function bag(): Fixture {
  return record('bag', START, (r) => {
    // hotbar
    r.cmd({ type: 'selectHotbar', index: 4 });
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'selectHotbar', index: 7 });
    r.cmd({ type: 'selectHotbar', index: 1 });
    r.cmd({ type: 'cycleHotbar', dir: 1 });
    reset(r, START, { blank: false });
    r.cmd({ type: 'cycleHotbar', dir: -1 });
    r.cmd({ type: 'cycleHotbar', dir: 1 });
    r.cmd({ type: 'cycleHotbar', dir: -1 });
    r.cmd({ type: 'cycleHotbar', dir: -1 });
    // quick slots follow moved cells
    reset(r, START, { blank: false });
    r.cmd({ type: 'moveBagItem', from: 0, to: 3 });
    reset(r, START, { blank: false });
    fillBag(r, [
      { id: 'turnip', qty: 1 },
      { id: 'wood', qty: 1 },
    ]);
    r.cmd({ type: 'assignQuickSlot', slot: 0, bagIndex: 0 });
    r.cmd({ type: 'assignQuickSlot', slot: 1, bagIndex: 1 });
    r.cmd({ type: 'moveBagItem', from: 0, to: 1 });
    r.cmd({ type: 'assignQuickSlot', slot: 0, bagIndex: null });
    // addItem through unshipping: 150 turnips split 99 + 51
    reset(r, START, { blank: false });
    fillBag(r, []);
    r.patch({ bin: [{ id: 'turnip', qty: 150 }] });
    r.cmd({ type: 'unshipItem', binIndex: 0, qty: 150 });
    // tops up an existing stack before using empty slots
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'wood', qty: 98 }]);
    r.patch({ bin: [{ id: 'wood', qty: 3 }] });
    r.cmd({ type: 'unshipItem', binIndex: 0, qty: 3 });
    // a full bag overflows and stays unchanged
    reset(r, START, { blank: false });
    fillBag(r, STONES);
    r.patch({ bin: [{ id: 'turnip', qty: 5 }] });
    r.cmd({ type: 'unshipItem', binIndex: 0, qty: 5 });
  });
}

// ---------------------------------------------------------------- quickSlots.test.ts

export function quickSlots(): Fixture {
  return record('quick-slots', START, (r) => {
    // planting the last seed clears its pin; a later turnip in that cell is not eaten by mistake
    r.blankFarm();
    standAt(r, 10, 10, 'e');
    r.tile(11, 10, tilled);
    fillBag(r, [{ id: 'seed:turnip', qty: 1 }]);
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'useItem' });
    fillBag(r, [{ id: 'turnip', qty: 1 }]);
    r.cmd({ type: 'useItem' });
    // shipping a whole pinned stack clears the pin; part of it keeps the pin
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'turnip', qty: 2 }]);
    r.cmd({ type: 'shipItem', bagIndex: 0, qty: 2 });
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'turnip', qty: 2 }]);
    r.cmd({ type: 'shipItem', bagIndex: 0, qty: 1 });
    // eating at full stamina is refused
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'melon', qty: 1 }]);
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'useItem' });
  });
}

// ---------------------------------------------------------------- economy.test.ts

export function economy(): Fixture {
  return record('economy', START, (r) => {
    const shop = (m: number, season: Season = 'spring'): void => {
      r.patch({ calendar: { minute: m, season } });
    };
    const buy = (itemId: `seed:${CropId}`, qty = 1): void => {
      r.cmd({ type: 'buyItem', itemId, qty });
    };

    // ships, unships, and sells the rest overnight
    fillBag(r, [{ id: 'turnip', qty: 12 }]);
    r.cmd({ type: 'shipItem', bagIndex: 0, qty: 10 });
    r.cmd({ type: 'unshipItem', binIndex: 0, qty: 4 });
    sleepThenFarm(r);
    // repeat shipments merge
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'wood', qty: 5 }]);
    r.cmd({ type: 'shipItem', bagIndex: 0, qty: 2 });
    r.cmd({ type: 'shipItem', bagIndex: 0, qty: 3 });
    // seeds are not sellable
    reset(r, START, { blank: false });
    r.cmd({ type: 'shipItem', bagIndex: 0, qty: 1 });
    // more than held, an empty slot, an empty bin
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'turnip', qty: 1 }]);
    r.cmd({ type: 'shipItem', bagIndex: 0, qty: 2 });
    r.cmd({ type: 'shipItem', bagIndex: 4, qty: 1 });
    r.cmd({ type: 'unshipItem', binIndex: 0, qty: 1 });
    // unshipping into a full bag fails and keeps the bin
    reset(r, START, { blank: false });
    fillBag(r, [{ id: 'turnip', qty: 3 }]);
    r.cmd({ type: 'shipItem', bagIndex: 0, qty: 3 });
    fillBag(r, STONES);
    r.cmd({ type: 'unshipItem', binIndex: 0, qty: 3 });
    // cart hours: 9:00 to before 17:00
    for (const m of [539, 540, 1019, 1020]) {
      reset(r, START, { blank: false });
      shop(m);
      buy('seed:turnip');
    }
    // closed in winter and in storms, open in rain; stocks only current-season seeds
    reset(r, START, { blank: false });
    shop(600, 'winter');
    buy('seed:turnip');
    reset(r, START, { blank: false });
    shop(600, 'summer');
    r.patch({ weather: { today: 'storm' } });
    buy('seed:tomato');
    r.patch({ weather: { today: 'rain' } });
    buy('seed:tomato');
    buy('seed:corn');
    buy('seed:melon');
    buy('seed:turnip');
    reset(r, START, { blank: false });
    shop(600, 'fall');
    buy('seed:pumpkin');
    buy('seed:eggplant');
    buy('seed:tomato');
    // exactly 250 gold buys 5 potato seeds; 249 is refused
    reset(r, START, { blank: false });
    shop(600);
    r.patch({ gold: 250 });
    buy('seed:potato', 5);
    reset(r, START, { blank: false });
    shop(600);
    r.patch({ gold: 249 });
    buy('seed:potato', 5);
    // closed hours, off-season seeds, a full bag
    reset(r, START, { blank: false });
    shop(400);
    buy('seed:turnip');
    shop(600);
    buy('seed:corn');
    fillBag(r, STONES);
    buy('seed:turnip');
  });
}

// ---------------------------------------------------------------- day.test.ts

export function day(): Fixture {
  return record('day', START, (r) => {
    const sleepHere = (): void => {
      goTo(r, 'house');
      r.cmd({ type: 'sleep' });
    };

    // grows watered crops but not dry ones
    r.blankFarm();
    r.tile(10, 10, cropTile('turnip', 1, true));
    r.tile(11, 10, cropTile('turnip', 1, false));
    sleepHere();
    r.snapshot();
    // grows before the season change kills the crop
    reset(r, START);
    r.tile(10, 10, cropTile('turnip', 1, true));
    r.patch({ calendar: { day: 28 } });
    sleepHere();
    r.snapshot();
    // a rain day waters every tilled tile; a sunny day leaves them dry
    reset(r, START);
    r.tile(10, 10, tilled);
    r.patch({ weather: { tomorrow: 'rain' } });
    sleepHere();
    reset(r, START);
    r.tile(10, 10, cropTile('turnip', 1, true));
    r.patch({ weather: { tomorrow: 'sunny' } });
    sleepHere();
    // rolls a fresh forecast each night
    reset(r, START);
    r.patch({ rng: createNewGame({ ...START, seed: 3 }).rng });
    goTo(r, 'house');
    for (let i = 0; i < 20; i++) r.cmd({ type: 'sleep' });
    // pass-out costs 10% gold and half stamina the next day only
    reset(r, START, { blank: false });
    r.patch({ gold: 5000 });
    minute(r, BALANCE.passOutMinute - 1);
    r.cmd({ type: 'tick', minutes: 2 });
    r.cmd({ type: 'sleep' });
    // pass-out loses at most 1000 gold
    reset(r, START, { blank: false });
    r.patch({ gold: 20_000 });
    minute(r, BALANCE.passOutMinute - 1);
    r.cmd({ type: 'tick', minutes: 2 });
    // credits shipped goods the next morning with a report
    reset(r, START, { blank: false });
    r.patch({ bin: [{ id: 'turnip', qty: 6 }] });
    sleepHere();
    // Winter 28 rolls into Year 2 Spring 1
    reset(r, START, { blank: false });
    r.patch({ calendar: { year: 1, season: 'winter', day: 28, minute: 1300 } });
    sleepHere();
    // bare tilled soil may revert to grass, seeded
    reset(r, START);
    r.patch({ rng: createNewGame({ ...START, seed: 5 }).rng });
    for (let y = 6; y < 9; y++) for (let x = 3; x < 28; x++) r.tile(x, y, tilled);
    sleepHere();
    r.snapshot();
    // sleep works only inside the house
    reset(r, START, { blank: false });
    r.cmd({ type: 'sleep' });
    sleepHere();
    // ticking past 26:00 triggers pass-out
    reset(r, START, { blank: false });
    minute(r, 1550);
    r.cmd({ type: 'tick', minutes: 9 });
    minute(r, 1550);
    r.cmd({ type: 'tick', minutes: 10 });
  });
}

// ---------------------------------------------------------------- interact.test.ts

export function interact(): Fixture {
  return record('interact', START, (r) => {
    const poke = (): void => {
      r.cmd({ type: 'interact' });
    };
    const mature = cropTile('turnip', CROPS.turnip.days);

    // the house door takes the player inside; the exit door returns them below it
    standAt(r, 4, 5, 'n');
    poke();
    standAt(r, 3, 4, 's');
    poke();
    // the bin, the bed, the cart open and closed
    standAt(r, 7, 5, 'n');
    poke();
    goTo(r, 'house');
    standAt(r, 6, 2, 'n');
    poke();
    goTo(r, 'farm');
    standAt(r, 30, 17, 'e');
    minute(r, 600);
    poke();
    minute(r, 400);
    poke();
    // harvests a mature crop by hand
    reset(r, START);
    standAt(r, 10, 10, 'e');
    r.tile(11, 10, mature);
    poke();
    // refills the can at the pond
    reset(r, START, { blank: false });
    standAt(r, 7, 19, 'w');
    r.patch({ canCharges: 2 });
    poke();
    // nothing to interact with
    reset(r, START);
    standAt(r, 10, 10, 'e');
    poke();
  });
}

// ---------------------------------------------------------------- milestones.test.ts

export function milestones(): Fixture {
  return record('milestones', START, (r) => {
    // firstTill fires once
    r.blankFarm();
    standAt(r, 10, 10, 'e');
    r.cmd({ type: 'useTool' });
    r.tile(11, 10, { kind: 'grass' });
    r.cmd({ type: 'useTool' });
    // firstPlant
    r.tile(11, 10, tilled);
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'useItem' });
    // firstHarvest once across two harvests
    r.tile(11, 10, cropTile('turnip', CROPS.turnip.days));
    r.cmd({ type: 'interact' });
    r.tile(11, 10, cropTile('turnip', CROPS.turnip.days));
    r.cmd({ type: 'interact' });
    // firstShipment only when something sold
    goTo(r, 'house');
    r.patch({ bin: [] });
    r.cmd({ type: 'sleep' });
    r.patch({ bin: [{ id: 'turnip', qty: 1 }] });
    r.cmd({ type: 'sleep' });
    // gold1k, then gold10k
    r.patch({ gold: 990, bin: [{ id: 'turnip', qty: 1 }] });
    r.cmd({ type: 'sleep' });
    r.patch({ gold: 9990, bin: [{ id: 'turnip', qty: 1 }] });
    r.cmd({ type: 'sleep' });
    // allCrops and fullYear
    r.patch({
      harvested: Object.fromEntries(CROP_IDS.map((c) => [c, 1])),
    });
    r.cmd({ type: 'tick', minutes: 1 });
    r.patch({ calendar: { year: 2 } });
    r.cmd({ type: 'tick', minutes: 1 });
  });
}

// ---------------------------------------------------------------- weather.test.ts

/** 30 nights from a new game, a snapshot after each. */
export function weather(): Fixture {
  return record('weather', START, (r) => {
    goTo(r, 'house');
    for (let i = 0; i < 30; i++) {
      r.cmd({ type: 'sleep' });
      r.snapshot();
    }
  });
}

// ---------------------------------------------------------------- tutorial.test.ts

/** The note triggers of tutorial.test.ts, each a set-up then one command. Lesson 'harvest' throughout. */
const NOTE_TRIGGERS: [NoteId, (r: Recorder) => void][] = [
  [
    'canEmpty',
    (r) => {
      r.patch({ activeSlot: 1, canCharges: 0 });
      r.cmd({ type: 'useTool' });
    },
  ],
  [
    'staminaLow',
    (r) => {
      r.patch({ player: { stamina: BALANCE.staminaLowAt + 1 } });
      r.cmd({ type: 'useTool' });
    },
  ],
  [
    'exhausted',
    (r) => {
      r.patch({ player: { stamina: 1 } });
      r.cmd({ type: 'useTool' });
    },
  ],
  [
    'passedOut',
    (r) => {
      minute(r, BALANCE.passOutMinute - 1);
      r.cmd({ type: 'tick', minutes: 2 });
    },
  ],
  [
    'rain',
    (r) => {
      goTo(r, 'house');
      r.patch({ weather: { today: 'sunny', tomorrow: 'rain' } });
      r.cmd({ type: 'sleep' });
    },
  ],
  [
    'obstacles',
    (r) => {
      r.tile(11, 10, { kind: 'weed' });
      r.cmd({ type: 'useTool' });
    },
  ],
  [
    'wrongSeason',
    (r) => {
      minute(r, 600);
      r.cmd({ type: 'buyItem', itemId: 'seed:tomato', qty: 1 });
    },
  ],
  [
    'newSeason',
    (r) => {
      goTo(r, 'house');
      r.patch({ calendar: { day: BALANCE.seasonDays } });
      r.cmd({ type: 'sleep' });
    },
  ],
  [
    'bagFull',
    (r) => {
      fillBag(r, STONES);
      minute(r, 600);
      r.cmd({ type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
    },
  ],
  [
    'cartClosed',
    (r) => {
      minute(r, 400);
      r.cmd({ type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
    },
  ],
];

/** The whole lesson path from a new game with lessons on, to `complete` and the gift. */
function playLessons(r: Recorder): void {
  const PLOT = [11, 12, 13];
  const faceX = (x: number): void => {
    goTo(r, 'farm');
    standAt(r, x - 1, 10, 'e');
  };
  // walkToField: step into the field (a teleport, then any command)
  standAt(r, 10, 17, 'n');
  r.cmd({ type: 'tick', minutes: 1 });
  standAt(r, 10, 16, 'n');
  r.cmd({ type: 'tick', minutes: 1 });
  // till 3
  select(r, 'hoe');
  for (const x of PLOT) {
    faceX(x);
    r.cmd({ type: 'useTool' });
  }
  // plant 3
  r.cmd({ type: 'selectHotbar', index: 5 });
  for (const x of PLOT) {
    faceX(x);
    r.cmd({ type: 'useItem' });
  }
  // water, sleep, waterDaily, … until the turnips are ripe
  for (let night = 0; night < 10; night++) {
    const ripe = PLOT.every((x) => {
      const c = tileAt(r.state.maps.farm, x, 10)?.crop;
      return c !== undefined && c.age >= CROPS[c.id].days;
    });
    if (ripe) break;
    select(r, 'can');
    for (const x of PLOT) {
      faceX(x);
      if (tileAt(r.state.maps.farm, x, 10)?.watered !== true) r.cmd({ type: 'useTool' });
    }
    goTo(r, 'house');
    r.cmd({ type: 'sleep' });
    r.snapshot();
  }
  // harvest by hand, ship, sell overnight
  for (const x of PLOT) {
    faceX(x);
    r.cmd({ type: 'interact' });
  }
  const turnips = r.state.bag.findIndex((c) => c?.id === 'turnip');
  r.cmd({ type: 'shipItem', bagIndex: turnips, qty: 1 });
  goTo(r, 'house');
  r.cmd({ type: 'sleep' });
  // buySeeds at the cart completes the path with the gift
  goTo(r, 'farm');
  standAt(r, 30, 17, 'e');
  minute(r, 600);
  r.cmd({ type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
  r.snapshot();
  r.cmd({ type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
}

export function tutorial(): Fixture {
  return record('tutorial', LESSONS, (r) => {
    /** `farm()` of tutorial.test.ts: plain grass, the player on (x, y); lessons on. */
    const farm = (x = 10, y = 10, facing: Facing = 'e', keepTutorial = false): void => {
      reset(r, LESSONS, { keepTutorial });
      standAt(r, x, y, facing);
    };
    const crop = (x: number, watered = false): void => {
      r.tile(x, 10, cropTile('turnip', 0, watered));
    };

    // 1. The whole path, from a new game to `complete` with the gift.
    r.blankFarm();
    playLessons(r);

    // 2. Every note, once each, then never again (lesson 'harvest'; a reset clears the notes seen).
    farm();
    for (const [, trigger] of NOTE_TRIGGERS) {
      farm(10, 10, 'e', true);
      lessonAt(r, 'harvest');
      trigger(r);
    }
    for (const [, trigger] of NOTE_TRIGGERS) {
      farm(10, 10, 'e', true);
      lessonAt(r, 'harvest');
      trigger(r);
    }
    // at most one note per command: passing out before rain shows passedOut only
    farm();
    lessonAt(r, 'harvest');
    minute(r, BALANCE.passOutMinute - 1);
    r.patch({ weather: { today: 'sunny', tomorrow: 'rain' } });
    r.cmd({ type: 'tick', minutes: 2 });
    // no notes while lessons are off, but still after completion
    for (const lesson of ['off', 'complete'] as const) {
      farm();
      r.patch({ tutorial: { lesson }, activeSlot: 1, canCharges: 0 });
      r.cmd({ type: 'useTool' });
    }

    // 3. Lesson progression cases.
    // plant completes after 1 when no seeds are left, else counts
    farm();
    lessonAt(r, 'plant');
    r.tile(11, 10, { kind: 'tilled' });
    fillBag(r, [{ id: 'seed:turnip', qty: 1 }]);
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'useItem' });
    farm();
    lessonAt(r, 'plant');
    r.tile(11, 10, { kind: 'tilled' });
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'useItem' });
    // water completes when every farm crop is watered
    farm();
    lessonAt(r, 'water');
    crop(11);
    crop(12);
    r.cmd({ type: 'selectHotbar', index: 1 });
    r.cmd({ type: 'useTool' });
    standAt(r, 11, 10, 'e');
    r.cmd({ type: 'useTool' });
    // sleep completes by passing out too
    farm();
    crop(11);
    lessonAt(r, 'sleep');
    minute(r, 1559);
    r.cmd({ type: 'tick', minutes: 2 });
    // waterDaily completes at once on a rainy morning
    farm();
    crop(11);
    lessonAt(r, 'sleep');
    goTo(r, 'house');
    r.patch({ weather: { today: 'sunny', tomorrow: 'rain' } });
    r.cmd({ type: 'sleep' });
    // harvest by sickle
    farm();
    lessonAt(r, 'harvest');
    r.tile(11, 10, cropTile('turnip', CROPS.turnip.days));
    r.cmd({ type: 'selectHotbar', index: 2 });
    r.cmd({ type: 'useTool' });
    // sellOvernight waits on an empty bin
    farm();
    lessonAt(r, 'sellOvernight');
    goTo(r, 'house');
    r.cmd({ type: 'sleep' });
    r.patch({ bin: [{ id: 'turnip', qty: 1 }] });
    r.cmd({ type: 'sleep' });
    // restartLessons passes through lessons the farm already satisfies
    farm();
    r.patch({ tutorial: { lesson: 'off', count: 0, notesSeen: [], gifted: false } });
    for (const x of [11, 12, 13]) crop(x, true);
    r.cmd({ type: 'restartLessons' });
    // skipLessons turns lessons off and keeps notesSeen; skipping again does nothing
    farm();
    r.patch({ tutorial: { lesson: 'plant', count: 2, notesSeen: ['rain'] } });
    r.cmd({ type: 'skipLessons' });
    r.cmd({ type: 'skipLessons' });
    // no lesson events while lessons are off
    reset(r, START);
    goTo(r, 'house');
    for (let night = 0; night < 7; night++) r.cmd({ type: 'sleep' });

    // 4. Adaptive rules.
    const adaptive = (lesson: LessonId, set: () => void): void => {
      farm();
      lessonAt(r, lesson);
      set();
      r.cmd({ type: 'tick', minutes: 1 });
    };
    adaptive('waterDaily', () => undefined);
    adaptive('harvest', () => {
      fillBag(r, []);
    });
    adaptive('water', () => {
      fillBag(r, [{ id: 'seed:tomato', qty: 3 }]);
    });
    adaptive('buySeeds', () => {
      fillBag(r, []);
      r.patch({ gold: 10 });
    });
    adaptive('buySeeds', () => {
      fillBag(r, []);
      r.patch({ calendar: { season: 'winter' } });
    });
    adaptive('buySeeds', () => {
      fillBag(r, []);
    });
    adaptive('waterDaily', () => {
      crop(11);
    });

    // 5. Review fixes.
    // the gift is given once per save, however often lessons restart
    farm();
    fillBag(r, []);
    for (const x of [11, 12, 13]) r.tile(x, 10, { kind: 'tilled' });
    r.patch({ calendar: { season: 'winter' } });
    for (let i = 0; i < 6; i++) r.cmd({ type: 'restartLessons' });
    // after crops die mid-path, buying seeds goes back to planting until the first sale
    farm(30, 17, 'e');
    lessonAt(r, 'buySeeds');
    minute(r, 600);
    r.cmd({ type: 'buyItem', itemId: 'seed:turnip', qty: 1 });
  });
}

// ---------------------------------------------------------------- fullYear.test.ts

const PLOT = Array.from({ length: 16 }, (_, i) => ({ x: 10 + (i % 4), y: 10 + Math.floor(i / 4) }));

/** The `botDay` of fullYear.test.ts, with each teleport as a patch and every rule as a command. */
function botDay(r: Recorder, plan: CropId[]): void {
  const useTool = (tool: ToolId): void => {
    select(r, tool);
    r.cmd({ type: 'useTool' });
  };
  const plantSeed = (crop: CropId): boolean => {
    const bagIndex = r.state.bag.findIndex((c) => c?.id === `seed:${crop}`);
    if (bagIndex < 0) return false;
    r.cmd({ type: 'assignQuickSlot', slot: 0, bagIndex });
    r.cmd({ type: 'selectHotbar', index: 5 });
    r.cmd({ type: 'useItem' });
    return true;
  };

  goTo(r, 'farm');
  standAt(r, 7, 19, 'w');
  r.cmd({ type: 'interact' });
  r.cmd({ type: 'tick', minutes: 540 - r.state.calendar.minute });
  PLOT.forEach(({ x, y }, i) => {
    standAt(r, x, y + 1, 'n');
    const crop = plan[i % plan.length];
    for (let guard = 0; guard < 6; guard++) {
      const t = tileAt(r.state.maps.farm, x, y);
      if (!t || r.state.player.stamina < 6) break;
      if (t.kind === 'weed') useTool('sickle');
      else if (t.kind === 'rock') useTool('hammer');
      else if (t.kind === 'stump') useTool('axe');
      else if (t.kind === 'grass') useTool('hoe');
      else if (t.kind === 'tilled' && t.crop && t.crop.age >= CROPS[t.crop.id].days)
        r.cmd({ type: 'interact' });
      else if (t.kind === 'tilled' && !t.crop && crop) {
        const cost = CROPS[crop].seedCost;
        if (!r.state.bag.some((c) => c?.id === `seed:${crop}`) && r.state.gold >= cost)
          r.cmd({ type: 'buyItem', itemId: `seed:${crop}`, qty: 1 });
        if (!plantSeed(crop)) break;
      } else if (t.kind === 'tilled' && t.crop && !t.watered) {
        if (r.state.canCharges === 0) {
          standAt(r, 7, 19, 'w');
          r.cmd({ type: 'interact' });
        }
        standAt(r, x, y + 1, 'n');
        useTool('can');
      } else break;
    }
  });
  r.state.bag.forEach((cell, bagIndex) => {
    if (cell && ITEMS[cell.id].kind === 'crop')
      r.cmd({ type: 'shipItem', bagIndex, qty: cell.qty });
  });
  r.patch({ player: { location: 'house', x: 3.5, z: 3.5 } });
  r.cmd({ type: 'sleep' });
}

/** fullYear.test.ts: seed 11, Spring 1 to Year 2 Spring 1; a snapshot on day 1 of each season. */
export function fullYear(): Fixture {
  return record('full-year', { ...START, seed: 11 }, (r) => {
    const bySeason = (season: Season) => CROP_IDS.filter((c) => CROPS[c].season === season);
    while (r.state.calendar.year === 1) {
      botDay(r, bySeason(r.state.calendar.season));
      if (r.state.calendar.day === 1) r.snapshot();
    }
  });
}

// ---------------------------------------------------------------- the file list

export interface ParityFile {
  name: string;
  build: () => unknown;
}

export const PARITY_FILES: readonly ParityFile[] = [
  { name: 'rng', build: rng },
  ...NEW_GAME_SEEDS.flatMap((seed) =>
    [false, true].map((lessons) => ({
      name: newGameName(seed, lessons),
      build: () => newGame(seed, lessons),
    })),
  ),
  { name: 'tools', build: tools },
  { name: 'crops', build: crops },
  { name: 'bag', build: bag },
  { name: 'quick-slots', build: quickSlots },
  { name: 'economy', build: economy },
  { name: 'day', build: day },
  { name: 'interact', build: interact },
  { name: 'milestones', build: milestones },
  { name: 'weather', build: weather },
  { name: 'tutorial', build: tutorial },
  { name: 'full-year', build: fullYear },
  { name: 'save', build: save },
];
