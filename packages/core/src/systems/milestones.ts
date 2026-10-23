import { CROP_IDS } from '../data/crops';
import type { GameEvent, GameState, MilestoneId } from '../types';

export function checkMilestones(
  _prev: GameState,
  next: GameState,
  events: GameEvent[],
): { state: GameState; events: GameEvent[] } {
  const has = (type: GameEvent['type']) => events.some((e) => e.type === type);
  const earned: [MilestoneId, boolean][] = [
    ['firstTill', has('tileTilled')],
    ['firstPlant', has('cropPlanted')],
    ['firstHarvest', has('cropHarvested')],
    ['firstShipment', events.some((e) => e.type === 'shippingReport' && e.total > 0)],
    ['gold1k', next.gold >= 1000],
    ['gold10k', next.gold >= 10_000],
    ['allCrops', CROP_IDS.every((c) => (next.harvested[c] ?? 0) >= 1)],
    ['fullYear', next.calendar.year >= 2],
  ];
  const fresh = earned.filter(([id, ok]) => ok && !next.milestones.includes(id)).map(([id]) => id);
  if (fresh.length === 0) return { state: next, events };
  return {
    state: { ...next, milestones: [...next.milestones, ...fresh] },
    events: [...events, ...fresh.map((id): GameEvent => ({ type: 'milestoneReached', id }))],
  };
}
