import { lessonTarget, type LessonTarget, type LocationId } from '@ethergrove/core';
import { useMemo } from 'react';
import { useGame } from '../game/store';

/**
 * The lesson marker's target, if it is on the map the player is on. The store selector returns a
 * string key, so this re-renders only when the target moves, not on every simulation step.
 */
export function useLessonTarget(): LessonTarget | null {
  const key = useGame((s) => {
    const t = s.game ? lessonTarget(s.game) : null;
    return t && t.location === s.game?.player.location ? `${t.location}:${t.x}:${t.y}` : null;
  });
  return useMemo(() => {
    if (key === null) return null;
    const [location, x, y] = key.split(':');
    return { location: location as LocationId, x: Number(x), y: Number(y) };
  }, [key]);
}
