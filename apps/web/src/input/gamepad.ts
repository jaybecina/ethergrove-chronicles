import { RUN_TILT, normalize, type InputSource, type Intents } from './intents';

const DEADZONE = 0.2;
const B = {
  a: 0,
  b: 1,
  x: 2,
  lb: 4,
  rb: 5,
  lt: 6,
  rt: 7,
  start: 9,
  up: 12,
  down: 13,
  left: 14,
  right: 15,
} as const;

const defaultPads = (): (Gamepad | null)[] =>
  typeof navigator !== 'undefined' && 'getGamepads' in navigator
    ? [...navigator.getGamepads()]
    : [];

export function createGamepadSource(getPads: () => (Gamepad | null)[] = defaultPads): InputSource {
  let prev: boolean[] = [];
  const reset = () => {
    prev = [];
  };
  return {
    device: 'gamepad',
    read(): Partial<Intents> {
      const pad = getPads().find((p): p is Gamepad => p?.connected === true);
      if (!pad) {
        reset();
        return { move: { x: 0, z: 0 }, primary: false, run: false };
      }
      const down = pad.buttons.map((b) => b.pressed);
      const was = prev;
      prev = down;
      const edge = (i: number) => down[i] === true && was[i] !== true;
      const ax = pad.axes[0] ?? 0;
      const az = pad.axes[1] ?? 0;
      const move = Math.hypot(ax, az) < DEADZONE ? { x: 0, z: 0 } : normalize(ax, az);
      return {
        move,
        primary: down[B.a] === true,
        run: Math.hypot(ax, az) >= RUN_TILT || down[B.b] === true,
        secondary: edge(B.x),
        cycle: edge(B.rb) ? 1 : edge(B.lb) ? -1 : 0,
        rotate: edge(B.rt) ? 1 : edge(B.lt) ? -1 : 0,
        menu: edge(B.start),
        back: edge(B.b),
        confirm: edge(B.a),
        nav: edge(B.up)
          ? 'up'
          : edge(B.down)
            ? 'down'
            : edge(B.left)
              ? 'left'
              : edge(B.right)
                ? 'right'
                : null,
      };
    },
    reset,
    dispose: reset,
  };
}
