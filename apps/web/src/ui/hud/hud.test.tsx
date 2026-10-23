import { createNewGame, type GameState } from '@hearthvale/core';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gameStore } from '../../game/store';
import { promptFor } from '../labels';
import { Clock } from './Clock';
import { Gold } from './Gold';
import { Hotbar } from './Hotbar';
import { Stamina } from './Stamina';

const base = (): GameState => createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari' });
const load = (patch: Partial<GameState> = {}) => {
  act(() => {
    gameStore.getState().startGame({ ...base(), ...patch }, 1);
  });
};

beforeEach(() => {
  load();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Clock', () => {
  it('shows time, day and weather with accessible labels', () => {
    load({ weather: { today: 'sunny', tomorrow: 'rain' } });
    render(<Clock />);
    expect(screen.getByText('6:00 AM')).toBeInTheDocument();
    expect(screen.getByText('Mon, Spring 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Today: Sunny')).toBeInTheDocument();
    expect(screen.getByLabelText('Tomorrow: Rain')).toBeInTheDocument();
  });
});

describe('Gold', () => {
  it('counts up to the new total and announces it politely', () => {
    vi.useFakeTimers();
    render(<Gold />);
    const live = screen.getByRole('status');
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveTextContent('500');
    load({ gold: 1240 });
    act(() => {
      vi.advanceTimersByTime(100);
    });
    const mid = Number(live.textContent.replace(/\D/g, ''));
    expect(mid).toBeGreaterThan(500);
    expect(mid).toBeLessThan(1240);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(live).toHaveTextContent('1,240');
  });
});

describe('Stamina', () => {
  it('is a progress bar that flags low stamina at 20', () => {
    const p = base().player;
    load({ player: { ...p, stamina: 21 } });
    render(<Stamina />);
    const bar = screen.getByRole('progressbar', { name: 'Stamina' });
    expect(bar).toHaveAttribute('aria-valuenow', '21');
    expect(bar).not.toHaveClass('is-low');
    load({ player: { ...p, stamina: 20 } });
    expect(bar).toHaveClass('is-low');
    load({ player: { ...p, stamina: 0 } });
    expect(bar).toHaveClass('is-empty');
  });
});

describe('Hotbar', () => {
  it('shows 8 slots with the active one selected and the can charge', () => {
    load({ activeSlot: 1, canCharges: 7 });
    render(<Hotbar />);
    const slots = screen.getAllByRole('tab');
    expect(slots).toHaveLength(8);
    expect(slots[1]).toHaveAttribute('aria-selected', 'true');
    expect(slots[0]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByLabelText('Water: 7 of 20')).toBeInTheDocument();
    expect(slots[5]).toHaveAccessibleName('Turnip Seeds, 6');
  });

  it('shows an emptied quick slot as empty (Review Focus)', () => {
    const b = base();
    load({ bag: b.bag.map(() => null) });
    render(<Hotbar />);
    expect(screen.getAllByRole('tab')[5]).toHaveAccessibleName('Empty slot');
  });
});

describe('promptFor', () => {
  it('says Ship facing the bin and Water with the can facing tilled soil', () => {
    const s = base();
    expect(promptFor({ ...s, player: { ...s.player, x: 7.5, z: 5.5, facing: 'n' } })).toBe('Ship');
    const tilled = s.maps.farm.tiles.slice();
    tilled[10 * 32 + 11] = { kind: 'tilled', watered: false };
    const facing = {
      ...s,
      activeSlot: 1 as const,
      maps: { ...s.maps, farm: { ...s.maps.farm, tiles: tilled } },
      player: { ...s.player, x: 10.5, z: 10.5, facing: 'e' as const },
    };
    expect(promptFor(facing)).toBe('Water');
  });

  it('covers doors, bed and tools', () => {
    const s = base();
    expect(promptFor({ ...s, player: { ...s.player, x: 4.5, z: 5.5, facing: 'n' } })).toBe('Enter');
    const house = {
      ...s,
      player: { ...s.player, location: 'house' as const, x: 6.5, z: 2.5, facing: 'n' as const },
    };
    expect(promptFor(house)).toBe('Sleep');
    const grass = s.maps.farm.tiles.slice();
    grass[10 * 32 + 11] = { kind: 'grass' };
    const g = {
      ...s,
      maps: { ...s.maps, farm: { ...s.maps.farm, tiles: grass } },
      player: { ...s.player, x: 10.5, z: 10.5, facing: 'e' as const },
    };
    expect(promptFor(g)).toBe('Till');
    expect(promptFor({ ...g, activeSlot: 2 })).toBeNull();
  });
});
