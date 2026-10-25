import { describe, expect, it } from 'vitest';
import { FARM_LAYOUT, FIELD_RECT } from '../src/data/layouts';
import { LESSON_GOAL, LESSON_ORDER, LESSONS_GIFT, NOTE_IDS } from '../src/data/lessons';

describe('lesson data', () => {
  it('FIELD_RECT covers exactly the field cells of FARM_LAYOUT', () => {
    FARM_LAYOUT.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const inside =
          x >= FIELD_RECT.x0 && x <= FIELD_RECT.x1 && y >= FIELD_RECT.y0 && y <= FIELD_RECT.y1;
        expect(row[x] === '.').toBe(inside);
      }
    });
  });

  it('lists 10 lessons and 10 notes', () => {
    expect(LESSON_ORDER).toHaveLength(10);
    expect(new Set(LESSON_ORDER).size).toBe(10);
    expect(new Set(NOTE_IDS).size).toBe(10);
    expect(LESSON_GOAL).toEqual({ till: 3, plant: 3 });
    expect(LESSONS_GIFT).toBe(100);
  });
});
