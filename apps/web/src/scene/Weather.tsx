import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  NormalBlending,
  Points,
  ShaderMaterial,
} from 'three';
import { gameStore } from '../game/store';
import { emitThunder, visualsFor, weatherNow } from '../render/weatherState';
import { flashSchedule } from '../render/weatherVisuals';

const MAX = 9000;
const SIZE = 36;
const HEIGHT = 16;

const vertex = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCenter;
  uniform float uSpeed;
  uniform float uSway;
  uniform float uSize;
  attribute float aSeed;
  varying float vSeed;
  void main() {
    vec3 p = position;
    p.y = mod(p.y - uTime * uSpeed * (0.8 + aSeed * 0.4), ${HEIGHT.toFixed(1)});
    p.x += sin(uTime * 0.9 + aSeed * 40.0) * uSway;
    // Wrap the particle box around the camera target so weather never runs out.
    p.xz = uCenter.xz + mod(p.xz - uCenter.xz + ${(SIZE / 2).toFixed(1)}, ${SIZE.toFixed(1)}) - ${(SIZE / 2).toFixed(1)};
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * (60.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vSeed = aSeed;
  }
`;
const rainFrag = /* glsl */ `
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float streak = smoothstep(0.06, 0.0, abs(c.x)) * smoothstep(0.5, 0.1, abs(c.y));
    gl_FragColor = vec4(0.75, 0.85, 1.0, streak * 0.55);
  }
`;
const snowFrag = /* glsl */ `
  void main() {
    float d = length(gl_PointCoord - 0.5);
    gl_FragColor = vec4(1.0, 1.0, 1.0, smoothstep(0.5, 0.15, d) * 0.9);
  }
`;

function makeGeometry(): BufferGeometry {
  const pos = new Float32Array(MAX * 3);
  const seed = new Float32Array(MAX);
  for (let i = 0; i < MAX; i++) {
    pos[i * 3] = Math.random() * SIZE;
    pos[i * 3 + 1] = Math.random() * HEIGHT;
    pos[i * 3 + 2] = Math.random() * SIZE;
    seed[i] = Math.random();
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new BufferAttribute(seed, 1));
  return g;
}

function makeMaterial(
  fragment: string,
  speed: number,
  sway: number,
  size: number,
  additive: boolean,
) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uCenter: { value: { x: 0, y: 0, z: 0 } },
      uSpeed: { value: speed },
      uSway: { value: sway },
      uSize: { value: size },
    },
    vertexShader: vertex,
    fragmentShader: fragment,
    transparent: true,
    depthWrite: false,
    blending: additive ? AdditiveBlending : NormalBlending,
  });
}

/** GPU rain and snow (positions animated in the vertex shader), plus storm lightning. */
export function Weather() {
  const rain = useRef<Points>(null);
  const snow = useRef<Points>(null);
  const rainGeo = useMemo(() => makeGeometry(), []);
  const snowGeo = useMemo(() => makeGeometry(), []);
  const rainMat = useMemo(() => makeMaterial(rainFrag, 14, 0, 9, true), []);
  const snowMat = useMemo(() => makeMaterial(snowFrag, 1.2, 0.6, 6.5, false), []);
  const storm = useRef({ day: -1, start: 0, flashes: [] as number[], next: 0 });

  useFrame(({ clock }, delta) => {
    const s = gameStore.getState();
    const g = s.game;
    if (!g) return;
    const v = visualsFor(g, s.tier());
    weatherNow.visuals = v;
    const t = clock.elapsedTime;
    for (const [pts, mat, count] of [
      [rain.current, rainMat, v.rain],
      [snow.current, snowMat, v.snow],
    ] as const) {
      if (!pts) continue;
      pts.visible = count > 0;
      pts.geometry.setDrawRange(0, count);
      const u = mat.uniforms;
      if (u.uTime) u.uTime.value = t;
      if (u.uCenter) u.uCenter.value = { x: g.player.x, y: 0, z: g.player.z };
    }

    // Lightning: seeded schedule per day; the flash decays quickly, thunder follows.
    const day = g.calendar.year * 1000 + g.calendar.day * 10 + g.calendar.season.length;
    const st = storm.current;
    if (v.lightning) {
      if (st.day !== day)
        Object.assign(st, { day, start: t, flashes: flashSchedule(day, 3600), next: 0 });
      const due = st.flashes[st.next];
      if (due !== undefined && t - st.start >= due) {
        st.next++;
        weatherNow.flash = 1;
        setTimeout(emitThunder, 800);
      }
    }
    weatherNow.flash = Math.max(0, weatherNow.flash - delta * 5);
  });

  return (
    <>
      <points
        ref={rain}
        geometry={rainGeo}
        material={rainMat}
        frustumCulled={false}
        visible={false}
      />
      <points
        ref={snow}
        geometry={snowGeo}
        material={snowMat}
        frustumCulled={false}
        visible={false}
      />
    </>
  );
}
