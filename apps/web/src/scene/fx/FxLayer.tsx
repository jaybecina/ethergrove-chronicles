import { useFrame } from '@react-three/fiber';
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
  const breath = useRef(0);
  useFrame((_, delta) => {
    const g = gameStore.getState().game;
    if (g?.calendar.season !== 'winter' || g.player.location !== 'farm') return;
    breath.current += delta;
    if (breath.current < 1.8) return;
    breath.current = 0;
    const f = { n: [0, -0.3], s: [0, 0.3], e: [0.3, 0], w: [-0.3, 0] }[g.player.facing];
    particles.current?.spawn(
      'breath',
      g.player.x - 0.5 + (f[0] ?? 0),
      g.player.z - 0.5 + (f[1] ?? 0),
      1.05,
    );
  });
  return (
    <>
      <Particles ref={particles} />
      <FloatText ref={floats} />
    </>
  );
}
