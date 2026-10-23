import { useEffect, useRef } from 'react';
import { eventBus } from '../../game/eventBus';
import { gameStore } from '../../game/store';
import { FloatText, type FloatTextHandle } from './FloatText';
import { fxFromEvents } from './fxQueue';
import { Particles, type ParticlesHandle } from './Particles';
import { addShake } from './shake';

/** Turns core events into particles, floating labels and camera shake. */
export function FxLayer() {
  const particles = useRef<ParticlesHandle>(null);
  const floats = useRef<FloatTextHandle>(null);
  useEffect(
    () =>
      eventBus.onAny((e) => {
        for (const fx of fxFromEvents([e])) {
          if (fx.kind === 'float') floats.current?.show(fx.x, fx.y, fx.text);
          else particles.current?.spawn(fx.kind, fx.x, fx.y);
        }
        if (e.type === 'toolUsed' && e.hit && (e.tool === 'axe' || e.tool === 'hammer')) {
          if (!gameStore.getState().settings.reducedMotion) addShake(0.08);
        }
      }),
    [],
  );
  return (
    <>
      <Particles ref={particles} />
      <FloatText ref={floats} />
    </>
  );
}
