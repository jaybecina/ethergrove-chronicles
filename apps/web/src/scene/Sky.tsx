import { Stars } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { BackSide, Color, Fog, ShaderMaterial, type Group } from 'three';
import { gameStore } from '../game/store';
import { nightFactor, sunAt } from '../render/lighting';

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const fragment = /* glsl */ `
  uniform vec3 top;
  uniform vec3 bottom;
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y * 1.6 + 0.15, 0.0, 1.0);
    gl_FragColor = vec4(mix(bottom, top, pow(h, 0.8)), 1.0);
    #include <colorspace_fragment>
  }
`;

/** Gradient sky dome, matching distance fog, and stars that fade in at night. */
export function Sky() {
  const group = useRef<Group>(null);
  const stars = useRef<Group>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { top: { value: new Color() }, bottom: { value: new Color() } },
        vertexShader: vertex,
        fragmentShader: fragment,
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    [],
  );
  const fog = useMemo(() => new Fog('#d6ecfa', 40, 120), []);

  useFrame(({ camera, scene }) => {
    const g = gameStore.getState().game;
    if (!g) return;
    const s = sunAt(g.calendar.minute);
    (material.uniforms.top?.value as Color).set(s.skyTop);
    (material.uniforms.bottom?.value as Color).set(s.skyBottom);
    fog.color.set(s.skyBottom);
    scene.fog = fog;
    group.current?.position.copy(camera.position);
    if (stars.current) {
      const n = nightFactor(g.calendar.minute);
      stars.current.visible = n > 0.05;
      stars.current.scale.setScalar(0.6 + n * 0.4);
    }
  });

  return (
    <group ref={group}>
      <mesh material={material} renderOrder={-1}>
        <sphereGeometry args={[150, 32, 16]} />
      </mesh>
      <group ref={stars}>
        <Stars radius={120} depth={20} count={1500} factor={4} fade speed={0.4} />
      </group>
    </group>
  );
}
