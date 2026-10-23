import { createEdges, normalize, type InputSource, type Intents } from './intents';

export type TouchButton = 'primary' | 'secondary';

export interface TouchSource extends InputSource {
  setStick(x: number, z: number): void;
  press(button: TouchButton): void;
  release(button: TouchButton): void;
  pulse(edges: Partial<Pick<Intents, 'cycle' | 'rotate' | 'zoom' | 'menu'>>): void;
}

export function createTouchSource(): TouchSource {
  let stick = { x: 0, z: 0 };
  let primary = false;
  const edges = createEdges();
  const reset = () => {
    stick = { x: 0, z: 0 };
    primary = false;
    edges.clear();
  };
  return {
    device: 'touch',
    setStick(x, z) {
      stick = normalize(x, z);
    },
    press(button) {
      if (button === 'primary') primary = true;
      else edges.add({ secondary: true });
    },
    release(button) {
      if (button === 'primary') primary = false;
    },
    pulse(e) {
      edges.add(e);
    },
    read() {
      return { secondary: false, cycle: 0, rotate: 0, move: stick, primary, ...edges.take() };
    },
    reset,
    dispose: reset,
  };
}
