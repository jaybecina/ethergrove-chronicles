import { createNewGame, LESSON_ORDER, NOTE_IDS, type GameState } from '@ethergrove/core';
import { describe, expect, it } from 'vitest';
import { chipFor, chipsFor, HINT_ACTIONS } from './hints';
import { COMPLETE_TEXT, JOURNAL_TEXT, LESSON_TEXT, NOTE_TEXT } from './lessonText';

const g: GameState = createNewGame({ seed: 1, farmName: 'A', playerName: 'B', lessons: true });
const noPin: GameState = { ...g, quickSlots: [null, null, null] };
const words = (s: string) => s.trim().split(/\s+/).length;

describe('lesson text', () => {
  it('has text for every lesson and note', () => {
    expect(Object.keys(LESSON_TEXT).sort()).toEqual([...LESSON_ORDER].sort());
    expect(Object.keys(NOTE_TEXT).sort()).toEqual([...NOTE_IDS].sort());
  });

  it('every lesson and note body is at most 20 words, titles at most 5', () => {
    for (const t of [...Object.values(LESSON_TEXT), ...Object.values(NOTE_TEXT)]) {
      expect(words(t.body)).toBeLessThanOrEqual(20);
      expect(words(t.title)).toBeLessThanOrEqual(5);
    }
  });

  it('uses the spec text verbatim', () => {
    expect(LESSON_TEXT.till).toEqual({
      title: 'Break some ground',
      body: "Grass won't take seeds. Pick the hoe and turn three patches of grass into soil.",
    });
    expect(NOTE_TEXT.canEmpty.title).toBe('Out of water');
    expect(COMPLETE_TEXT.gift(100)).toBe('Tucked in the last page: 100 gold.');
    expect(COMPLETE_TEXT.button).toBe('Thanks, Grandpa');
    expect(JOURNAL_TEXT.skipTitle).toBe("Skip Grandpa's lessons?");
  });
});

describe('control chips', () => {
  it('till on keyboard shows 1 Hoe and Space Use', () => {
    expect(chipsFor('till', 'keyboard', g)).toEqual([
      { keys: ['1'], label: 'Hoe' },
      { keys: ['Space'], label: 'Use' },
    ]);
  });

  it('the same lesson on touch and gamepad', () => {
    expect(chipsFor('till', 'touch', g)).toEqual([
      { keys: ['⇄'], label: 'Hoe' },
      { keys: ['✦'], label: 'Use' },
    ]);
    expect(chipsFor('till', 'gamepad', g)).toEqual([
      { keys: ['LB', 'RB'], label: 'Hoe' },
      { keys: ['A'], label: 'Use' },
    ]);
  });

  it('pickSeeds uses the real seed slot, or Bag when none is pinned', () => {
    expect(chipsFor('plant', 'keyboard', g)[0]).toEqual({ keys: ['6'], label: 'Seeds' });
    expect(chipsFor('plant', 'keyboard', { ...g, quickSlots: [null, 0, null] })[0]).toEqual({
      keys: ['7'],
      label: 'Seeds',
    });
    expect(chipsFor('plant', 'keyboard', noPin)[0]).toEqual({ keys: ['Esc'], label: 'Bag' });
  });

  it.each(['keyboard', 'gamepad', 'touch'] as const)('every lesson has chips on %s', (d) => {
    for (const id of LESSON_ORDER) expect(chipsFor(id, d, g).length).toBeGreaterThan(0);
  });

  it('chipFor covers every action for the Controls table', () => {
    expect(HINT_ACTIONS).toHaveLength(10);
    expect(chipFor('camera', 'keyboard', g)).toEqual({ keys: ['Q', 'E'], label: 'Turn camera' });
    expect(chipFor('menu', 'gamepad', g)).toEqual({ keys: ['Start'], label: 'Menu' });
  });
});
