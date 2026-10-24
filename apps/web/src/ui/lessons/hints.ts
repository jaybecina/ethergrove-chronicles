import { lessonSlot, type GameState, type LessonId } from '@hearthvale/core';
import type { Device } from '../../input/intents';

export type HintAction =
  | 'walk'
  | 'run'
  | 'camera'
  | 'pickHoe'
  | 'pickCan'
  | 'pickSickle'
  | 'pickSeeds'
  | 'useTool'
  | 'interact'
  | 'menu';

export interface Chip {
  keys: string[];
  label: string;
}

/** Spec §4.3, in table order. */
export const HINT_ACTIONS: readonly HintAction[] = [
  'walk',
  'run',
  'camera',
  'pickHoe',
  'pickCan',
  'pickSickle',
  'pickSeeds',
  'useTool',
  'interact',
  'menu',
];

const LABEL: Record<HintAction, string> = {
  walk: 'Walk',
  run: 'Run',
  camera: 'Turn camera',
  pickHoe: 'Hoe',
  pickCan: 'Can',
  pickSickle: 'Sickle',
  pickSeeds: 'Seeds',
  useTool: 'Use',
  interact: 'Interact',
  menu: 'Menu',
};

const KEYS: Record<HintAction, Record<Device, string[]>> = {
  walk: { keyboard: ['WASD'], gamepad: ['L-stick'], touch: ['Drag left side'] },
  run: { keyboard: ['Shift'], gamepad: ['B'], touch: ['Drag to ring'] },
  camera: { keyboard: ['Q', 'E'], gamepad: ['LT', 'RT'], touch: ['⟲', '⟳'] },
  pickHoe: { keyboard: ['1'], gamepad: ['LB', 'RB'], touch: ['⇄'] },
  pickCan: { keyboard: ['2'], gamepad: ['LB', 'RB'], touch: ['⇄'] },
  pickSickle: { keyboard: ['3'], gamepad: ['LB', 'RB'], touch: ['⇄'] },
  pickSeeds: { keyboard: ['6'], gamepad: ['LB', 'RB'], touch: ['⇄'] },
  useTool: { keyboard: ['Space'], gamepad: ['A'], touch: ['✦'] },
  interact: { keyboard: ['F'], gamepad: ['X'], touch: ['✋'] },
  menu: { keyboard: ['Esc'], gamepad: ['Start'], touch: ['☰'] },
};

const LESSON_CHIPS: Record<LessonId, HintAction[]> = {
  walkToField: ['walk', 'run', 'camera'],
  till: ['pickHoe', 'useTool'],
  plant: ['pickSeeds', 'interact'],
  water: ['pickCan', 'useTool'],
  waterDaily: ['pickCan', 'useTool'],
  sleep: ['interact'],
  sellOvernight: ['interact'],
  harvest: ['pickSickle', 'useTool', 'interact'],
  ship: ['interact'],
  buySeeds: ['interact'],
};

export function chipFor(action: HintAction, device: Device, state: GameState): Chip {
  if (action === 'pickSeeds') {
    const slot = lessonSlot({ ...state, tutorial: { ...state.tutorial, lesson: 'plant' } });
    if (slot === null) return { keys: KEYS.menu[device], label: 'Bag' };
    if (device === 'keyboard') return { keys: [String(slot + 1)], label: LABEL.pickSeeds };
  }
  return { keys: KEYS[action][device], label: LABEL[action] };
}

export function chipsFor(lesson: LessonId, device: Device, state: GameState): Chip[] {
  return LESSON_CHIPS[lesson].map((a) => chipFor(a, device, state));
}
