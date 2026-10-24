import { createNewGame } from '@hearthvale/core';
import { describe, expect, it } from 'vitest';
import { createActionGate } from './actionGate';
import { createGamepadSource } from './gamepad';
import { EMPTY_INTENTS, RUN_TILT } from './intents';
import { createKeyboardSource } from './keyboard';
import { createInputMapper } from './mapper';
import { intentsToCommands } from './toCommands';
import { createTouchSource } from './touch';

const key = (type: 'keydown' | 'keyup', code: string) => {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
};
const pad = (axes: number[], pressed: number[] = []) =>
  ({
    mapping: 'standard',
    connected: true,
    axes,
    buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: 0 })),
  }) as unknown as Gamepad;

describe('running', () => {
  it('run tilt threshold is 85%', () => {
    expect(RUN_TILT).toBe(0.85);
  });

  it('keyboard: hold Shift to run, release to walk', () => {
    const kb = createKeyboardSource(window);
    key('keydown', 'KeyD');
    expect(kb.read().run).toBe(false);
    key('keydown', 'ShiftLeft');
    expect(kb.read().run).toBe(true);
    key('keyup', 'ShiftLeft');
    expect(kb.read().run).toBe(false);
    key('keydown', 'ShiftRight');
    expect(kb.read().run).toBe(true);
    key('keyup', 'ShiftRight');
    key('keyup', 'KeyD');
    kb.dispose();
  });

  it('keyboard: window blur stops running', () => {
    const kb = createKeyboardSource(window);
    key('keydown', 'ShiftLeft');
    window.dispatchEvent(new Event('blur'));
    expect(kb.read().run).toBe(false);
    kb.dispose();
  });

  it('gamepad: full tilt or holding B runs', () => {
    let pads: (Gamepad | null)[] = [pad([0.9, 0])];
    const gp = createGamepadSource(() => pads);
    expect(gp.read().run).toBe(true);
    pads = [pad([0.6, 0])];
    expect(gp.read().run).toBe(false);
    pads = [pad([0.5, 0], [1])];
    expect(gp.read().run).toBe(true);
  });

  it('touch: dragging to the edge of the ring runs', () => {
    const t = createTouchSource();
    t.setStick(0.9, 0);
    expect(t.read().run).toBe(true);
    t.setStick(0.5, 0);
    expect(t.read().run).toBe(false);
    t.reset();
    expect(t.read().run).toBe(false);
  });

  it('mapper passes run through', () => {
    const t = createTouchSource();
    const mapper = createInputMapper([t]);
    t.setStick(0, -1);
    expect(mapper.read().run).toBe(true);
    expect(EMPTY_INTENTS.run).toBe(false);
  });

  it('the move command carries run', () => {
    const game = createNewGame({ seed: 1, farmName: 'a', playerName: 'b' });
    const [walk] = intentsToCommands(
      { ...EMPTY_INTENTS, move: { x: 1, z: 0 } },
      game,
      0,
      createActionGate(),
      0,
    );
    const [run] = intentsToCommands(
      { ...EMPTY_INTENTS, move: { x: 1, z: 0 }, run: true },
      game,
      0,
      createActionGate(),
      0,
    );
    expect(walk).toMatchObject({ type: 'move', run: false });
    expect(run).toMatchObject({ type: 'move', run: true });
  });
});
