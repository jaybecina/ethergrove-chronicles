import { NOTE_IDS } from '../data/lessons';
import type { GameState } from '../types';
import type { SaveFile } from './repository';
import { saveFileSchema } from './schema';

export const CURRENT_SAVE_VERSION = 2;

export type Migration = (file: unknown) => unknown;
export type MigrateResult =
  { ok: true; file: SaveFile } | { ok: false; error: 'invalid' | 'unsupportedVersion' };

/** Migrations keyed by the version they upgrade FROM. */
export const MIGRATIONS: Record<number, Migration> = {
  // v2 adds Grandpa's lessons. Existing players know the basics: lessons and notes start off.
  1: (file) => {
    const f = file as { state: Record<string, unknown> };
    return {
      ...f,
      version: 2,
      state: {
        ...f.state,
        version: 2,
        tutorial: { lesson: 'off', count: 0, notesSeen: [...NOTE_IDS], gifted: false },
      },
    };
  },
};

const versionOf = (raw: unknown): number | null => {
  if (typeof raw !== 'object' || raw === null || !('version' in raw)) return null;
  return typeof raw.version === 'number' && Number.isInteger(raw.version) ? raw.version : null;
};

export function migrate(
  raw: unknown,
  migrations: Record<number, Migration> = MIGRATIONS,
): MigrateResult {
  let current = raw;
  let version = versionOf(current);
  if (version === null) return { ok: false, error: 'invalid' };
  if (version > CURRENT_SAVE_VERSION) return { ok: false, error: 'unsupportedVersion' };
  while (version < CURRENT_SAVE_VERSION) {
    const step = migrations[version];
    if (!step) return { ok: false, error: 'unsupportedVersion' };
    current = step(current);
    const next = versionOf(current);
    if (next === null || next <= version) return { ok: false, error: 'invalid' };
    version = next;
  }
  const parsed = saveFileSchema.safeParse(current);
  return parsed.success ? { ok: true, file: parsed.data } : { ok: false, error: 'invalid' };
}

export function makeSaveFile(state: GameState, playTimeMs: number, now: Date): SaveFile {
  return {
    version: CURRENT_SAVE_VERSION,
    savedAt: now.toISOString(),
    playTimeMs,
    summary: {
      farmName: state.farmName,
      playerName: state.playerName,
      calendar: state.calendar,
      gold: state.gold,
    },
    state,
  };
}
