import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { Color, ShaderMaterial, Vector3 } from 'three';
import { gameStore } from '../game/store';
import { sunAt, sunDirection } from '../render/lighting';
import { weatherNow } from '../render/weatherState';

const vertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSky;
  uniform vec3 uDeep;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uRipple;
  varying vec3 vWorld;
  void main() {
    vec2 p = vWorld.xz;
    // Sum of moving sine waves → analytic normal ripples (no textures needed).
    float t = uTime;
    vec2 g = vec2(0.0);
    g += vec2(0.9, 0.4) * cos(dot(p, vec2(0.9, 0.4)) * 3.1 + t * 1.6);
    g += vec2(-0.5, 0.8) * cos(dot(p, vec2(-0.5, 0.8)) * 4.3 + t * 2.1);
    g += vec2(0.2, -1.0) * cos(dot(p, vec2(0.2, -1.0)) * 6.7 + t * 2.9) * 0.6;
    vec3 n = normalize(vec3(-g.x * 0.06 * uRipple, 1.0, -g.y * 0.06 * uRipple));
    vec3 v = normalize(cameraPosition - vWorld);
    float fresnel = pow(1.0 - max(dot(n, v), 0.0), 3.0);
    vec3 col = mix(uDeep, uSky, 0.12 + 0.7 * fresnel);
    vec3 h = normalize(uSunDir + v);
    col += uSunColor * pow(max(dot(n, h), 0.0), 120.0) * 1.4;
    gl_FragColor = vec4(col, 0.92);
    #include <colorspace_fragment>
  }
`;

export function Water({ x, z, w, d }: { x: number; z: number; w: number; d: number }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uSky: { value: new Color() },
          uDeep: { value: new Color('#164660') },
          uSunDir: { value: new Vector3() },
          uSunColor: { value: new Color() },
          uRipple: { value: 1 },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
        transparent: true,
      }),
    [],
  );
  useFrame(({ clock }) => {
    const g = gameStore.getState().game;
    if (!g) return;
    const s = sunAt(g.calendar.minute);
    const u = material.uniforms;
    if (u.uTime) u.uTime.value = clock.elapsedTime;
    (u.uSky?.value as Color | undefined)?.set(s.skyBottom).lerp(new Color(s.skyTop), 0.4);
    (u.uSunDir?.value as Vector3 | undefined)?.set(...sunDirection(s));
    (u.uSunColor?.value as Color | undefined)
      ?.set(s.color)
      .multiplyScalar(Math.min(1, s.intensity / 2));
    if (u.uRipple) u.uRipple.value = 1 + weatherNow.visuals.wetness * 1.5;
  });
  return (
    <mesh position={[x, -0.08, z]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[w + 0.2, d + 0.2, 1, 1]} />
    </mesh>
  );
}
