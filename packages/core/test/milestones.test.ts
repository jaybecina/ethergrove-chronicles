import { describe, expect, it } from 'vitest';
import { applyCommand } from '../src/applyCommand';
import { CROP_IDS } from '../src/data/crops';
import { checkMilestones } from '../src/systems/milestones';
import type { GameEvent } from '../src/types';
import { blankFarm, fresh, standAt, withTile } from './helpers';

const reached = (events: GameEvent[]) =>
  events.flatMap((e) => (e.type === 'milestoneReached' ? [e.id] : []));

describe('milestones', () => {
  it('firstTill fires once through applyCommand', () => {
    let s = standAt(blankFarm(fresh()), 10, 10, 'e');
    const first = applyCommand(s, { type: 'useTool' });
    expect(reached(first.events)).toEqual(['firstTill']);
    s = withTile(first.state, 11, 10, { kind: 'grass' });
    expect(reached(applyCommand(s, { type: 'useTool' }).events)).toEqual([]);
    expect(first.state.milestones).toEqual(['firstTill']);
  });

  it('firstHarvest is emitted once across two harvests', () => {
    const s = fresh();
    const ev: GameEvent[] = [{ type: 'cropHarvested', x: 1, y: 1, crop: 'turnip' }];
    const once = checkMilestones(s, s, ev);
    expect(reached(once.events)).toEqual(['firstHarvest']);
    expect(reached(checkMilestones(once.state, once.state, ev).events)).toEqual([]);
  });

  it('firstPlant and firstShipment (only when something sold)', () => {
    const s = fresh();
    expect(
      reached(checkMilestones(s, s, [{ type: 'cropPlanted', x: 0, y: 0, crop: 'turnip' }]).events),
    ).toEqual(['firstPlant']);
    expect(
      reached(checkMilestones(s, s, [{ type: 'shippingReport', items: [], total: 0 }]).events),
    ).toEqual([]);
    expect(
      reached(checkMilestones(s, s, [{ type: 'shippingReport', items: [], total: 35 }]).events),
    ).toEqual(['firstShipment']);
  });

  it('gold 990 → 1010 emits gold1k; 10,000 emits gold10k', () => {
    const prev = { ...fresh(), gold: 990 };
    expect(reached(checkMilestones(prev, { ...prev, gold: 1010 }, []).events)).toEqual(['gold1k']);
    expect(reached(checkMilestones(prev, { ...prev, gold: 10_000 }, []).events)).toEqual([
      'gold1k',
      'gold10k',
    ]);
  });

  it('allCrops and fullYear', () => {
    const s = fresh();
    const harvested = Object.fromEntries(CROP_IDS.map((c) => [c, 1]));
    expect(reached(checkMilestones(s, { ...s, harvested }, []).events)).toEqual(['allCrops']);
    const y2 = { ...s, calendar: { ...s.calendar, year: 2 } };
    expect(reached(checkMilestones(s, y2, []).events)).toEqual(['fullYear']);
  });
});
