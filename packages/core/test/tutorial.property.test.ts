import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { LESSON_ORDER } from '../src/data/lessons';
import { createNewGame } from '../src/newGame';
import { gameStateSchema } from '../src/save/schema';
import type { TutorialState } from '../src/types';
import { arbCommand } from './arbitraries';

const order = (l: TutorialState['lesson']) =>
  l === 'off' ? -1 : l === 'complete' ? LESSON_ORDER.length : LESSON_ORDER.indexOf(l);

describe('tutorial invariants', () => {
  it('never throws, stays schema-valid, and only moves back via the adaptive rules', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        fc.array(arbCommand, { maxLength: 300 }),
        (seed, cmds) => {
          let s = createNewGame({ seed, farmName: 'A', playerName: 'B', lessons: true });
          for (const c of cmds) {
            const before = order(s.tutorial.lesson);
            s = applyCommand(s, c).state;
            if (order(s.tutorial.lesson) < before)
              expect(['plant', 'buySeeds']).toContain(s.tutorial.lesson);
          }
          expect(gameStateSchema.safeParse(s).success).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});
