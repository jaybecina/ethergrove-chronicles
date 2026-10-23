import type { Calendar, GameState } from '../types';

export type SlotId = 1 | 2 | 3;

export interface SaveSummary {
  farmName: string;
  playerName: string;
  calendar: Calendar;
  gold: number;
}

export interface SaveFile {
  version: number;
  savedAt: string;
  playTimeMs: number;
  summary: SaveSummary;
  state: GameState;
}

export interface SaveSlotSummary {
  slot: SlotId;
  summary: SaveSummary | null;
  savedAt: string | null;
  playTimeMs: number;
}

export type LoadResult =
  | { kind: 'ok'; file: SaveFile }
  | { kind: 'missing' }
  | { kind: 'corrupt'; backupAvailable: boolean };

export interface SaveRepository {
  list(): Promise<SaveSlotSummary[]>;
  load(slot: SlotId): Promise<LoadResult>;
  save(slot: SlotId, file: SaveFile): Promise<void>;
  remove(slot: SlotId): Promise<void>;
}
