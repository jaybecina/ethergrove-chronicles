import { lessonTarget, type LessonTarget } from '@hearthvale/core';
import { useMemo } from 'react';
import { useGame } from '../game/store';

/** The lesson marker's target, if it is on the map the player is on. */
export function useLessonTarget(): LessonTarget | null {
  // Select the game (a stable reference) and derive here: a selector that builds a new object
  // on every read makes React re-render forever.
  const game = useGame((s) => s.game);
  return useMemo(() => {
    const target = game ? lessonTarget(game) : null;
    return target !== null && target.location === game?.player.location ? target : null;
  }, [game]);
}
