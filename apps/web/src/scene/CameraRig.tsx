import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { MathUtils, Vector3 } from 'three';
import { gameStore } from '../game/store';
import { ZOOM_DISTANCES, offsetAt } from './cameraMath';
import { takeShake } from './fx/shake';

const target = new Vector3();

/** Angled follow camera: damped follow, 90° turns eased over ~300 ms, three zoom steps. */
export function CameraRig() {
  const { camera } = useThree();
  const yaw = useRef(0);
  const yawTarget = useRef(0);
  const lastSteps = useRef(0);
  const dist = useRef<number>(ZOOM_DISTANCES[1]);
  const focus = useRef<Vector3 | null>(null);

  useFrame((_, delta) => {
    const s = gameStore.getState();
    const p = s.game?.player;
    if (!p) return;
    // Unwrap 3 → 0 into +90°, never a 270° spin.
    const step = ((s.cameraYaw - lastSteps.current + 6) % 4) - 2;
    if (step !== 0) {
      yawTarget.current += (step * Math.PI) / 2;
      lastSteps.current = s.cameraYaw;
    }
    // Title screen: a slow drift around the farm.
    if (s.screen === 'title' && !s.settings.reducedMotion) yawTarget.current += delta * 0.06;
    else {
      // Leaving the title: settle on the nearest angle that matches the movement yaw.
      const quarter = Math.PI / 2;
      const k = Math.round((yawTarget.current - s.cameraYaw * quarter) / (2 * Math.PI));
      const settled = s.cameraYaw * quarter + k * 2 * Math.PI;
      if (Math.abs(settled - yawTarget.current) > 1e-6 && step === 0) yawTarget.current = settled;
    }
    const instant = s.settings.reducedMotion;
    yaw.current = instant
      ? yawTarget.current
      : MathUtils.damp(yaw.current, yawTarget.current, 12, delta);
    const want = s.screen === 'title' ? ZOOM_DISTANCES[2] + 6 : ZOOM_DISTANCES[s.zoomStep];
    dist.current = MathUtils.damp(dist.current, want, 6, delta);
    target.set(p.x, 0.6, p.z);
    focus.current ??= target.clone();
    const far = focus.current.distanceTo(target) > 4;
    focus.current.set(
      far ? target.x : MathUtils.damp(focus.current.x, target.x, 6, delta),
      target.y,
      far ? target.z : MathUtils.damp(focus.current.z, target.z, 6, delta),
    );
    const [ox, oy, oz] = offsetAt(yaw.current, dist.current);
    const shake = takeShake(delta);
    const jx = shake ? (Math.random() - 0.5) * shake : 0;
    const jy = shake ? (Math.random() - 0.5) * shake : 0;
    camera.position.set(focus.current.x + ox + jx, focus.current.y + oy + jy, focus.current.z + oz);
    camera.lookAt(focus.current);
  });
  return null;
}
