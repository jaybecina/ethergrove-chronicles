import { useFrame } from '@react-three/fiber';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Color, IcosahedronGeometry, MeshBasicMaterial, Object3D, type InstancedMesh } from 'three';
import type { FxKind } from './fxQueue';

const MAX = 256;
const dummy = new Object3D();
const color = new Color();

interface Burst {
  count: number;
  colors: string[];
  speed: number;
  up: number;
  gravity: number;
  life: number;
  size: number;
  hdr?: number;
}

const BURSTS: Record<FxKind, Burst> = {
  dust: {
    count: 10,
    colors: ['#8a6a46', '#a5835b'],
    speed: 1.3,
    up: 1.6,
    gravity: 6,
    life: 0.6,
    size: 0.07,
  },
  splash: {
    count: 12,
    colors: ['#9fd3f5', '#d9f1ff'],
    speed: 1.1,
    up: 2.2,
    gravity: 9,
    life: 0.5,
    size: 0.05,
  },
  chips: {
    count: 9,
    colors: ['#9b9690', '#7a5434'],
    speed: 2.2,
    up: 2.4,
    gravity: 10,
    life: 0.55,
    size: 0.06,
  },
  sparkle: {
    count: 18,
    colors: ['#ffe08a', '#fff6cf'],
    speed: 0.7,
    up: 1.4,
    gravity: -0.4,
    life: 1.1,
    size: 0.05,
    hdr: 4,
  },
  leafPuff: {
    count: 10,
    colors: ['#7fb04a', '#5d8a34'],
    speed: 1.2,
    up: 1.8,
    gravity: 5,
    life: 0.7,
    size: 0.06,
  },
};

export interface ParticlesHandle {
  spawn(kind: FxKind, x: number, y: number): void;
}

/** One pooled instanced mesh for every small burst effect. */
export const Particles = forwardRef<ParticlesHandle>(function Particles(_, ref) {
  const mesh = useRef<InstancedMesh>(null);
  const sim = useMemo(
    () => ({
      pos: new Float32Array(MAX * 3),
      vel: new Float32Array(MAX * 3),
      life: new Float32Array(MAX),
      max: new Float32Array(MAX).fill(1),
      size: new Float32Array(MAX),
      grav: new Float32Array(MAX),
      next: 0,
    }),
    [],
  );
  const geometry = useMemo(() => new IcosahedronGeometry(1, 0), []);
  const material = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);

  useImperativeHandle(ref, () => ({
    spawn(kind, x, y) {
      const b = BURSTS[kind];
      const m = mesh.current;
      if (!m) return;
      for (let n = 0; n < b.count; n++) {
        const i = sim.next;
        sim.next = (sim.next + 1) % MAX;
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * b.speed;
        sim.pos.set([x + 0.5, 0.25, y + 0.5], i * 3);
        sim.vel.set([Math.cos(a) * r, b.up * (0.6 + Math.random() * 0.6), Math.sin(a) * r], i * 3);
        sim.life[i] = b.life * (0.7 + Math.random() * 0.5);
        sim.max[i] = sim.life[i] ?? 1;
        sim.size[i] = b.size * (0.7 + Math.random() * 0.6);
        sim.grav[i] = b.gravity;
        color.set(b.colors[n % b.colors.length] ?? '#ffffff').multiplyScalar(b.hdr ?? 1);
        m.setColorAt(i, color);
      }
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    },
  }));

  useFrame((_, delta) => {
    const m = mesh.current;
    if (!m) return;
    const dt = Math.min(delta, 0.05);
    for (let i = 0; i < MAX; i++) {
      const life = sim.life[i] ?? 0;
      if (life <= 0) {
        dummy.scale.setScalar(0);
      } else {
        const j = i * 3;
        sim.life[i] = life - dt;
        (sim.vel[j + 1] as number) -= (sim.grav[i] ?? 0) * dt;
        for (let k = 0; k < 3; k++) (sim.pos[j + k] as number) += (sim.vel[j + k] ?? 0) * dt;
        if ((sim.pos[j + 1] ?? 0) < 0.03) sim.pos[j + 1] = 0.03;
        dummy.position.set(sim.pos[j] ?? 0, sim.pos[j + 1] ?? 0, sim.pos[j + 2] ?? 0);
        dummy.scale.setScalar((sim.size[i] ?? 0) * Math.min(1, (life / (sim.max[i] ?? 1)) * 2));
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return <instancedMesh ref={mesh} args={[geometry, material, MAX]} frustumCulled={false} />;
});
