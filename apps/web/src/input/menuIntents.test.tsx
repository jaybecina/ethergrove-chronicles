import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, gameStore } from '../game/store';
import { Panel } from '../ui/screens/Panel';
import { Settings } from '../ui/screens/Settings';
import { EMPTY_INTENTS } from './intents';
import { applyMenuIntent } from './menuIntents';

beforeEach(() => {
  act(() => {
    gameStore.getState().updateSettings(DEFAULT_SETTINGS);
    gameStore.getState().setScreen('title');
  });
});

const run = (patch: Partial<typeof EMPTY_INTENTS>) => {
  act(() => {
    applyMenuIntent({ ...EMPTY_INTENTS, ...patch }, gameStore);
  });
};

describe('gamepad in menus (review finding 4)', () => {
  it('A toggles a focused checkbox', () => {
    render(<Settings />);
    screen.getByRole('checkbox', { name: /reduce motion/i }).focus();
    run({ confirm: true });
    expect(gameStore.getState().settings.reducedMotion).toBe(true);
  });

  it('A picks a focused radio option', () => {
    render(<Settings />);
    screen.getByRole('radio', { name: 'Medium' }).focus();
    run({ confirm: true });
    expect(gameStore.getState().settings.quality).toBe('medium');
  });

  it('A picks the low graphics tier', () => {
    render(<Settings />);
    screen.getByRole('radio', { name: 'Low (older or built-in graphics)' }).focus();
    run({ confirm: true });
    expect(gameStore.getState().settings.quality).toBe('low');
  });

  it('Graphics lists the four choices in order', () => {
    render(<Settings />);
    expect(
      screen
        .getAllByRole('radio')
        .slice(0, 4)
        .map((r) => r.parentElement?.textContent),
    ).toEqual([
      'Automatic (recommended)',
      'High (stronger GPUs)',
      'Medium',
      'Low (older or built-in graphics)',
    ]);
  });

  it('d-pad left and right move a focused slider', () => {
    render(<Settings />);
    screen.getByRole('slider', { name: 'Music volume' }).focus();
    run({ nav: 'right' });
    expect(gameStore.getState().settings.musicVolume).toBeCloseTo(0.65);
    run({ nav: 'left' });
    run({ nav: 'left' });
    expect(gameStore.getState().settings.musicVolume).toBeCloseTo(0.55);
  });

  it('d-pad up and down still move focus between controls', () => {
    render(
      <Panel title="Settings">
        <Settings />
      </Panel>,
    );
    const radios = screen.getAllByRole('radio');
    radios[0]?.focus();
    const before = document.activeElement;
    run({ nav: 'down' });
    expect(document.activeElement).not.toBe(before);
  });
});
