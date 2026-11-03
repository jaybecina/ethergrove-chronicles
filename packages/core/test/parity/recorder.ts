import { applyCommand } from '../../src/applyCommand';
import { setTile } from '../../src/grid';
import { createNewGame } from '../../src/newGame';
import type { Command, GameEvent, GameState, Tile } from '../../src/types';
import { blankFarm } from '../helpers';

/** Fixture start: the `createNewGame` options, with `lessons` always written out. */
export interface FixtureStart {
  seed: number;
  farmName: string;
  playerName: string;
  lessons: boolean;
}

/** A deep partial where arrays (and scalars) are replaced whole, matching the `patch` step semantics. */
export type Patch<T> = T extends readonly unknown[]
  ? T
  : T extends object
    ? { [K in keyof T]?: Patch<T[K]> }
    : T;

export type Step =
  | { cmd: Command }
  | { patch: Patch<GameState> }
  | { tile: { x: number; y: number; value: Tile } }
  | { blankFarm: true };

/** One scenario, replayed step by step by `apps/game/test/support/parity_replay.gd`. */
export interface Fixture {
  name: string;
  format: 1;
  start: FixtureStart;
  steps: Step[];
  expected: {
    /** `events[i]` is the event list of step `i` (`[]` for non-command steps). */
    events: GameEvent[][];
    /** The state after the step whose index is the key. */
    snapshots: Record<string, GameState>;
    final: GameState;
  };
}

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const isDict = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Dictionaries merge key by key; arrays, scalars and `null` replace. */
export function deepMerge(base: unknown, patch: unknown): unknown {
  if (!isDict(base) || !isDict(patch)) return patch;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) out[k] = deepMerge(base[k], v);
  return out;
}

export class Recorder {
  readonly #steps: Step[] = [];
  readonly #events: GameEvent[][] = [];
  readonly #snapshots: Record<string, GameState> = {};
  #state: GameState;

  constructor(state: GameState) {
    this.#state = state;
  }

  get state(): GameState {
    return this.#state;
  }

  /** `applyCommand(state, cmd)`; returns the step's events. */
  cmd(c: Command): GameEvent[] {
    const cmd = json(c);
    const r = applyCommand(this.#state, cmd);
    this.#state = r.state;
    this.#push({ cmd }, r.events);
    return r.events;
  }

  /** Deep merge into the state (see `deepMerge`). The patch is recorded after a JSON round trip. */
  patch(p: Patch<GameState>): void {
    const patch = json(p);
    this.#state = deepMerge(this.#state, patch) as GameState;
    this.#push({ patch }, []);
  }

  /** `setTile` on the map of `state.player.location`. */
  tile(x: number, y: number, value: Tile): void {
    const tile = { x, y, value: json(value) };
    const loc = this.#state.player.location;
    const grid = setTile(this.#state.maps[loc], x, y, tile.value);
    this.#state = { ...this.#state, maps: { ...this.#state.maps, [loc]: grid } };
    this.#push({ tile }, []);
  }

  /** The `blankFarm` test helper: weed, rock and stump become grass. */
  blankFarm(): void {
    this.#state = blankFarm(this.#state);
    this.#push({ blankFarm: true }, []);
  }

  /** Keeps the current state under the index of the last step. */
  snapshot(): void {
    const i = this.#steps.length - 1;
    if (i < 0) throw new RangeError('snapshot() needs at least one step');
    this.#snapshots[String(i)] = json(this.#state);
  }

  #push(step: Step, events: GameEvent[]): void {
    this.#steps.push(step);
    this.#events.push(json(events));
  }

  finish(name: string, start: FixtureStart): Fixture {
    return {
      name,
      format: 1,
      start,
      steps: this.#steps,
      expected: { events: this.#events, snapshots: this.#snapshots, final: json(this.#state) },
    };
  }
}

/** Runs `build` from `createNewGame(start)` and records every step, its events and the final state. */
export function record(name: string, start: FixtureStart, build: (r: Recorder) => void): Fixture {
  const r = new Recorder(createNewGame(start));
  build(r);
  return r.finish(name, start);
}
