import { createNewGame, type GameState } from '@ethergrove/core';
import { describe, expect, it } from 'vitest';
import { createActionGate } from './actionGate';
import { createGamepadSource } from './gamepad';
import { EMPTY_INTENTS } from './intents';
import { createKeyboardSource } from './keyboard';
import { cameraRelative, createInputMapper } from './mapper';
import { intentsToCommands } from './toCommands';
import { createTouchSource } from './touch';

const key = (type: 'keydown' | 'keyup', code: string) => {
  window.dispatchEvent(new KeyboardEvent(type, { code }));
};

describe('keyboard', () => {
  it('W+D moves up-right, normalized', () => {
    const kb = createKeyboardSource(window);
    key('keydown', 'KeyW');
    key('keydown', 'KeyD');
    const m = kb.read().move;
    expect(m?.x).toBeCloseTo(Math.SQRT1_2);
    expect(m?.z).toBeCloseTo(-Math.SQRT1_2);
    kb.dispose();
  });

  it('a tap shorter than one step still fires primary once', () => {
    const kb = createKeyboardSource(window);
    key('keydown', 'Space');
    key('keyup', 'Space');
    expect(kb.read().primary).toBe(true);
    expect(kb.read().primary).toBe(false);
    kb.dispose();
  });

  it('window blur releases held keys (Review Focus)', () => {
    const kb = createKeyboardSource(window);
    key('keydown', 'KeyW');
    key('keydown', 'Space');
    window.dispatchEvent(new Event('blur'));
    expect(kb.read()).toMatchObject({ move: { x: 0, z: 0 }, primary: false });
    kb.dispose();
  });

  it('edge keys fire once per press, not while held', () => {
    const kb = createKeyboardSource(window);
    key('keydown', 'KeyE');
    expect(kb.read().rotate).toBe(1);
    expect(kb.read().rotate ?? 0).toBe(0);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', repeat: true }));
    expect(kb.read().rotate ?? 0).toBe(0);
    key('keyup', 'KeyE');
    key('keydown', 'Digit3');
    expect(kb.read().hotbar).toBe(2);
    key('keydown', 'Escape');
    key('keydown', 'KeyF');
    key('keydown', 'Minus');
    expect(kb.read()).toMatchObject({ menu: true, secondary: true, zoom: 1 });
    window.dispatchEvent(new WheelEvent('wheel', { deltaY: 100 }));
    expect(kb.read().cycle).toBe(1);
    kb.dispose();
  });
});

describe('gamepad', () => {
  const pad = (axes: number[], pressed: number[] = []) =>
    ({
      mapping: 'standard',
      connected: true,
      axes,
      buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: 0 })),
    }) as unknown as Gamepad;

  it('reads the left stick with a deadzone and A as primary', () => {
    let pads: (Gamepad | null)[] = [pad([0.1, 0.1])];
    const gp = createGamepadSource(() => pads);
    expect(gp.read().move).toEqual({ x: 0, z: 0 });
    pads = [pad([0.8, 0], [0])];
    expect(gp.read()).toMatchObject({ move: { x: 0.8, z: 0 }, primary: true });
  });

  it('bumpers cycle and triggers rotate on press edges only', () => {
    let pads: (Gamepad | null)[] = [pad([0, 0], [5, 6])];
    const gp = createGamepadSource(() => pads);
    expect(gp.read()).toMatchObject({ cycle: 1, rotate: -1 });
    expect(gp.read()).toMatchObject({ cycle: 0, rotate: 0 });
    pads = [pad([0, 0], [9])];
    expect(gp.read().menu).toBe(true);
  });

  it('a disconnected pad resets its intents (Review Focus)', () => {
    let pads: (Gamepad | null)[] = [pad([1, 0], [0])];
    const gp = createGamepadSource(() => pads);
    gp.read();
    pads = [null];
    expect(gp.read()).toMatchObject({ move: { x: 0, z: 0 }, primary: false });
  });
});

describe('mapper', () => {
  it('rotates movement with the camera yaw', () => {
    const r = cameraRelative({ x: 0, z: -1 }, 1);
    expect(r.x).toBeCloseTo(-1, 9);
    expect(r.z).toBeCloseTo(0, 9);
    expect(cameraRelative({ x: 1, z: 0 }, 0)).toEqual({ x: 1, z: 0 });
    const half = cameraRelative({ x: 0, z: -1 }, 2);
    expect(half.z).toBeCloseTo(1, 9);
  });

  it('merges sources; the most recently active device wins', () => {
    const touch = createTouchSource();
    const kb = createKeyboardSource(window);
    const mapper = createInputMapper([kb, touch]);
    touch.setStick(0.5, 0);
    expect(mapper.read()).toMatchObject({ device: 'touch', move: { x: 0.5, z: 0 } });
    key('keydown', 'KeyS');
    expect(mapper.read().device).toBe('keyboard');
    key('keyup', 'KeyS');
    kb.dispose();
  });
});

describe('touch', () => {
  it('pointercancel-style release stops movement and buttons', () => {
    const t = createTouchSource();
    t.setStick(1, 0);
    t.press('primary');
    expect(t.read()).toMatchObject({ move: { x: 1, z: 0 }, primary: true });
    t.reset();
    expect(t.read()).toMatchObject({ move: { x: 0, z: 0 }, primary: false });
  });

  it('a quick tap on the action button still fires once', () => {
    const t = createTouchSource();
    t.press('primary');
    t.release('primary');
    expect(t.read().primary).toBe(true);
    expect(t.read().primary).toBe(false);
  });

  it('pulses edges once', () => {
    const t = createTouchSource();
    t.press('secondary');
    t.pulse({ rotate: 1, cycle: -1 });
    expect(t.read()).toMatchObject({ secondary: true, rotate: 1, cycle: -1 });
    expect(t.read()).toMatchObject({ secondary: false, rotate: 0, cycle: 0 });
  });
});

describe('action gate', () => {
  it('holding primary for 1 s at 50 ms steps fires at 0, 350, 700 only (Review Focus)', () => {
    const gate = createActionGate(350);
    const fired: number[] = [];
    for (let t = 0; t <= 1000; t += 50) if (gate.allow(true, t)) fired.push(t);
    expect(fired).toEqual([0, 350, 700]);
  });

  it('a new press after release fires immediately', () => {
    const gate = createActionGate(350);
    expect(gate.allow(true, 0)).toBe(true);
    expect(gate.allow(false, 50)).toBe(false);
    expect(gate.allow(true, 100)).toBe(true);
  });
});

describe('intentsToCommands', () => {
  const game = (): GameState => createNewGame({ seed: 1, farmName: 'a', playerName: 'b' });
  const gate = () => createActionGate(350);

  it('always sends one camera-relative move', () => {
    const cmds = intentsToCommands(
      { ...EMPTY_INTENTS, move: { x: 0, z: -1 } },
      game(),
      1,
      gate(),
      0,
    );
    expect(cmds).toHaveLength(1);
    const [move] = cmds;
    expect(move?.type).toBe('move');
    if (move?.type === 'move') expect(move.dx).toBeCloseTo(-1);
  });

  it('primary uses the tool on slots 0-4 and the item on quick slots', () => {
    const tool = intentsToCommands({ ...EMPTY_INTENTS, primary: true }, game(), 0, gate(), 0);
    expect(tool.map((c) => c.type)).toEqual(['move', 'useTool']);
    const item = intentsToCommands(
      { ...EMPTY_INTENTS, primary: true },
      { ...game(), activeSlot: 6 },
      0,
      gate(),
      0,
    );
    expect(item.map((c) => c.type)).toEqual(['move', 'useItem']);
  });

  it('selection comes before the move; secondary resolves via the core', () => {
    const g = game();
    const facingDoor = { ...g, player: { ...g.player, x: 4.5, z: 5.5, facing: 'n' as const } };
    const cmds = intentsToCommands(
      { ...EMPTY_INTENTS, hotbar: 3, cycle: 1, secondary: true },
      facingDoor,
      0,
      gate(),
      0,
    );
    expect(cmds.map((c) => c.type)).toEqual(['selectHotbar', 'cycleHotbar', 'move', 'interact']);
  });

  it('secondary with nothing to do sends no action', () => {
    const cmds = intentsToCommands({ ...EMPTY_INTENTS, secondary: true }, game(), 0, gate(), 0);
    expect(cmds.map((c) => c.type)).toEqual(['move']);
  });
});
