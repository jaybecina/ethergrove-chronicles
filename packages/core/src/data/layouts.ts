import type { Tile } from '../types';

/** 32 x 24. '.' cells get seeded obstacles in createNewGame. */
export const FARM_LAYOUT: string[] = [
  '################################',
  '#______________________________#',
  '#_HHHHH________________________#',
  '#_HHHHH________________________#',
  '#_HHDHHB_______________________#',
  '#______________________________#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#__.........................___#',
  '#______________________________C',
  '#_~~~~_________________________#',
  '#_~~~~~________________________#',
  '#_~~~~_________________________#',
  '#______________________________#',
  '#______________P_______________#',
  '################################',
];

export const HOUSE_LAYOUT: string[] = [
  'WWWWWWWW',
  'WFFFFFZW',
  'WFFFFFFW',
  'WFFSFFFW',
  'WFFFFFFW',
  'WWWXWWWW',
];

export const FARM_LEGEND: Record<string, Tile> = {
  '#': { kind: 'fence' },
  H: { kind: 'building' },
  D: { kind: 'feature', feature: 'houseDoor' },
  B: { kind: 'feature', feature: 'bin' },
  C: { kind: 'feature', feature: 'cart' },
  '~': { kind: 'water' },
  _: { kind: 'path' },
  '.': { kind: 'grass' },
  P: { kind: 'path' },
};

export const HOUSE_LEGEND: Record<string, Tile> = {
  W: { kind: 'wall' },
  F: { kind: 'floor' },
  Z: { kind: 'feature', feature: 'bed' },
  X: { kind: 'feature', feature: 'exitDoor' },
  S: { kind: 'floor' },
};

export const FARM_SPAWN_CHAR = 'P';
export const HOUSE_SPAWN_CHAR = 'S';
