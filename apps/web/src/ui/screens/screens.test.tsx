import { createNewGame, makeSaveFile, type GameState } from '@hearthvale/core';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { gameStore } from '../../game/store';
import { memoryRepo } from '../../test/memoryRepo';
import { MerchantCart } from './MerchantCart';
import { MorningReport } from './MorningReport';
import { NewGame } from './NewGame';
import { Pause } from './Pause';
import { SaveSlots } from './SaveSlots';
import { ShippingBin } from './ShippingBin';
import { SleepConfirm } from './SleepConfirm';
import { uiStore } from '../uiStore';

const game = (patch: Partial<GameState> = {}): GameState => ({
  ...createNewGame({ seed: 1, farmName: 'Elm', playerName: 'Ari' }),
  ...patch,
});
const start = (g: GameState) => {
  act(() => {
    gameStore.getState().startGame(g, 1);
    gameStore.getState().setScreen('game');
  });
};

beforeEach(() => {
  act(() => {
    gameStore.getState().setOverlay(null);
    gameStore.getState().setScreen('title');
  });
});

describe('NewGame', () => {
  it('needs both names and trims them to 16 characters', async () => {
    const user = userEvent.setup();
    const repo = memoryRepo();
    act(() => {
      uiStore.getState().setPendingSlot(2);
    });
    render(<NewGame repo={repo} />);
    const startBtn = screen.getByRole('button', { name: 'Start farming' });
    expect(startBtn).toBeDisabled();
    await user.type(screen.getByLabelText('Your name'), '  Ari  ');
    expect(startBtn).toBeDisabled();
    const farm = screen.getByLabelText('Farm name');
    await user.type(farm, 'A very long farm name here');
    expect((farm as HTMLInputElement).value).toHaveLength(16);
    await user.click(startBtn);
    const s = gameStore.getState();
    expect(s.game?.playerName).toBe('Ari');
    expect(s.game?.farmName).toBe('A very long farm');
    expect(s.slot).toBe(2);
    expect(s.screen).toBe('intro');
  });
});

describe('SaveSlots', () => {
  it('lists three slots with farm, date, gold and play time', async () => {
    const file = makeSaveFile(game({ gold: 1240 }), 3_720_000, new Date(0));
    render(<SaveSlots repo={memoryRepo({ 1: file })} mode="load" />);
    expect(await screen.findByText('Elm')).toBeInTheDocument();
    expect(screen.getByText(/Year 1, Spring 1/)).toBeInTheDocument();
    expect(screen.getByText(/1,240 gold/)).toBeInTheDocument();
    expect(screen.getByText(/1 h 2 min played/)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getAllByText('Empty slot')).toHaveLength(2);
  });

  it('offers the backup for a damaged save', async () => {
    const repo = memoryRepo({ 3: 'corrupt' });
    (
      repo as unknown as { setBackup: (s: 3, f: ReturnType<typeof makeSaveFile>) => void }
    ).setBackup(3, makeSaveFile(game({ gold: 99 }), 0, new Date(0)));
    render(<SaveSlots repo={repo} mode="load" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Load backup' }));
    await waitFor(() => {
      expect(gameStore.getState().game?.gold).toBe(99);
    });
    expect(screen.getByText(/Damaged save/)).toBeInTheDocument();
  });
});

describe('SaveSlots new game on a damaged slot (review finding 9)', () => {
  it('asks before replacing it, since that would erase the backup', async () => {
    render(<SaveSlots repo={memoryRepo({ 2: 'corrupt' })} mode="new" />);
    await userEvent.click(await screen.findByRole('button', { name: 'Replace' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(/backup/i);
    expect(gameStore.getState().screen).not.toBe('newGame');
  });
});

describe('MerchantCart', () => {
  it('sells only in-season seeds and updates gold', async () => {
    start(game({ calendar: { year: 1, season: 'summer', day: 2, minute: 600 } }));
    render(<MerchantCart />);
    expect(screen.getByText('Tomato Seeds')).toBeInTheDocument();
    expect(screen.queryByText('Turnip Seeds')).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: /^Buy/ })[0] as HTMLElement);
    expect(gameStore.getState().game?.gold).toBe(450);
  });

  it('explains why a purchase is not possible', () => {
    start(game({ gold: 10, calendar: { year: 1, season: 'spring', day: 2, minute: 600 } }));
    render(<MerchantCart />);
    const buy = screen.getAllByRole('button', { name: /^Buy/ })[0] as HTMLElement;
    expect(buy).toBeDisabled();
    expect(screen.getAllByText('Not enough gold').length).toBeGreaterThan(0);
  });
});

describe('ShippingBin', () => {
  it('moves items into the bin and back', async () => {
    start(game({ bag: [{ id: 'turnip', qty: 3 }, ...Array.from({ length: 11 }, () => null)] }));
    render(<ShippingBin />);
    await userEvent.click(screen.getByRole('button', { name: 'Ship all Turnip' }));
    expect(gameStore.getState().game?.bin).toEqual([{ id: 'turnip', qty: 3 }]);
    expect(screen.getByText('Sells tonight for 105 gold')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Take back Turnip' }));
    expect(gameStore.getState().game?.bin).toEqual([]);
  });
});

describe('MorningReport', () => {
  it('lists what sold and the total', () => {
    act(() => {
      uiStore.getState().setReport({
        items: [
          { id: 'turnip', qty: 6 },
          { id: 'wood', qty: 10 },
        ],
        total: 230,
      });
    });
    render(<MorningReport />);
    expect(screen.getByText('Turnip × 6')).toBeInTheDocument();
    expect(screen.getByText('210')).toBeInTheDocument();
    expect(screen.getByText('20')).toBeInTheDocument();
    expect(screen.getByText('230 gold')).toBeInTheDocument();
  });
});

describe('SleepConfirm', () => {
  it('sleeps and saves', async () => {
    const g = game();
    start({ ...g, player: { ...g.player, location: 'house' } });
    const repo = memoryRepo();
    render(<SleepConfirm repo={repo} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sleep and save' }));
    expect(gameStore.getState().game?.calendar.day).toBe(2);
    await waitFor(() => {
      expect(repo.saved).toHaveLength(1);
    });
  });
});

describe('Pause and menu toggling', () => {
  it('toggleMenu closes the top overlay and resumes the clock', () => {
    start(game());
    act(() => {
      gameStore.getState().setOverlay('cart');
    });
    expect(gameStore.getState().isClockRunning()).toBe(false);
    act(() => {
      gameStore.getState().toggleMenu();
    });
    expect(gameStore.getState().overlay).toBeNull();
    expect(gameStore.getState().isClockRunning()).toBe(true);
    act(() => {
      gameStore.getState().toggleMenu();
    });
    expect(gameStore.getState().overlay).toBe('pause');
  });

  it('arrow keys reach every button in the pause menu', () => {
    start(game());
    act(() => {
      gameStore.getState().setOverlay('pause');
    });
    render(<Pause repo={memoryRepo()} />);
    const buttons = screen.getAllByRole('button');
    const reached = new Set<Element>();
    if (document.activeElement) reached.add(document.activeElement);
    // Every focusable item, not just buttons, sits in the arrow-key cycle (bag slots too).
    const stops = screen
      .getByRole('dialog')
      .querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])',
      ).length;
    for (let i = 0; i < stops + 2; i++) {
      fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowDown' });
      if (document.activeElement) reached.add(document.activeElement);
    }
    for (const b of buttons) expect(reached.has(b)).toBe(true);
  });
});
