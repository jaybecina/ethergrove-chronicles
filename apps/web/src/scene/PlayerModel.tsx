import { useAnimations, useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Box3, LoopOnce, LoopRepeat, Vector3, type AnimationAction, type Group, Mesh } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { eventBus } from '../game/eventBus';
import { gameStore } from '../game/store';
import { ASSETS } from './assets';
import { clipForEvent, locomotionClip, type Clip } from './playerClips';

/** The Rogue's weapons don't belong on a farm. */
const HIDDEN = new Set(['Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']);
const HEIGHT = 1.2;
const FADE = 0.15;

/** KayKit farmer with locomotion and action clips driven by game events. */
export function PlayerModel() {
  const group = useRef<Group>(null);
  const { scene, animations } = useGLTF(ASSETS.player.url);
  const model = useMemo(() => {
    const m = clone(scene);
    m.traverse((o) => {
      if (HIDDEN.has(o.name)) o.visible = false;
      if (o instanceof Mesh) o.castShadow = true;
    });
    const size = new Box3().setFromObject(m).getSize(new Vector3());
    m.scale.setScalar(HEIGHT / size.y);
    return m;
  }, [scene]);
  const { actions, mixer } = useAnimations(animations, group);
  const current = useRef<{ clip: Clip; action: AnimationAction | null; oneShot: boolean }>({
    clip: 'Idle',
    action: null,
    oneShot: false,
  });
  const last = useRef(new Vector3());

  const play = (clip: Clip, oneShot: boolean) => {
    const next = actions[clip];
    if (!next) return;
    const prev = current.current.action;
    next.reset();
    next.setLoop(oneShot ? LoopOnce : LoopRepeat, oneShot ? 1 : Infinity);
    next.clampWhenFinished = oneShot;
    next.timeScale = clip === '2H_Melee_Attack_Chop' ? 1.7 : clip.includes('Slice') ? 1.6 : 1;
    if (prev && prev !== next) prev.fadeOut(FADE);
    next.fadeIn(FADE).play();
    current.current = { clip, action: next, oneShot };
  };

  useEffect(() => {
    play('Idle', false);
    const onDone = () => {
      current.current.oneShot = false;
    };
    mixer.addEventListener('finished', onDone);
    const off = eventBus.onAny((e) => {
      const clip = clipForEvent(e);
      if (clip) play(clip, true);
    });
    return () => {
      off();
      mixer.removeEventListener('finished', onDone);
    };
  }, [actions, mixer]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    const p = gameStore.getState().game?.player;
    if (!p || current.current.oneShot) {
      if (p) last.current.set(p.x, 0, p.z);
      return;
    }
    const speed = delta > 0 ? Math.hypot(p.x - last.current.x, p.z - last.current.z) / delta : 0;
    last.current.set(p.x, 0, p.z);
    const want = locomotionClip(speed, p.stamina <= 0);
    if (want !== current.current.clip) play(want, false);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}
