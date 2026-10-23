import { describe, expect, it } from 'vitest';
import { clipForEvent, locomotionClip } from './playerClips';

describe('farmer animation choice', () => {
  it('maps actions to one-shot clips', () => {
    expect(clipForEvent({ type: 'toolUsed', tool: 'hoe', x: 0, y: 0, hit: true })).toBe(
      '2H_Melee_Attack_Chop',
    );
    expect(clipForEvent({ type: 'toolUsed', tool: 'axe', x: 0, y: 0, hit: false })).toBe(
      '2H_Melee_Attack_Chop',
    );
    expect(clipForEvent({ type: 'toolUsed', tool: 'sickle', x: 0, y: 0, hit: true })).toBe(
      '1H_Melee_Attack_Slice_Horizontal',
    );
    expect(clipForEvent({ type: 'toolUsed', tool: 'can', x: 0, y: 0, hit: true })).toBe('Use_Item');
    expect(clipForEvent({ type: 'cropHarvested', x: 0, y: 0, crop: 'turnip' })).toBe('PickUp');
    expect(clipForEvent({ type: 'cropPlanted', x: 0, y: 0, crop: 'turnip' })).toBe('Interact');
    expect(clipForEvent({ type: 'itemEaten', item: 'turnip', stamina: 8 })).toBe('Use_Item');
    expect(clipForEvent({ type: 'milestoneReached', id: 'gold1k' })).toBe('Cheer');
    expect(clipForEvent({ type: 'staminaLow' })).toBeNull();
  });

  it('picks idle, walk or run from speed', () => {
    expect(locomotionClip(0, false)).toBe('Idle');
    expect(locomotionClip(4, false)).toBe('Running_A');
    expect(locomotionClip(2.4, true)).toBe('Walking_A');
    expect(locomotionClip(1, false)).toBe('Walking_A');
  });
});
