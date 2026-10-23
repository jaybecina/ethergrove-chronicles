import { mixHex } from './color';

export interface SunState {
  elevationDeg: number;
  azimuthDeg: number;
  color: string;
  intensity: number;
  skyTop: string;
  skyBottom: string;
  ambient: number;
}

type Key = [minute: number, state: SunState];

const NIGHT: SunState = {
  elevationDeg: 38,
  azimuthDeg: 200,
  color: '#8fa6dd',
  intensity: 0.28,
  skyTop: '#0b1530',
  skyBottom: '#1f2f5c',
  ambient: 0.2,
};

/** Day keyframes (spec §4.3): dawn pink → noon white → sunset gold → night blue moonlight. */
const KEYS: Key[] = [
  [0, NIGHT],
  [300, { ...NIGHT, intensity: 0.22, skyBottom: '#2b3560' }],
  [
    360,
    {
      elevationDeg: 8,
      azimuthDeg: 100,
      color: '#ffb7a3',
      intensity: 1,
      skyTop: '#6f8fc8',
      skyBottom: '#ffc8b4',
      ambient: 0.34,
    },
  ],
  [
    480,
    {
      elevationDeg: 30,
      azimuthDeg: 125,
      color: '#fff0d8',
      intensity: 2,
      skyTop: '#5ea2e0',
      skyBottom: '#cfe6f5',
      ambient: 0.44,
    },
  ],
  [
    720,
    {
      elevationDeg: 55,
      azimuthDeg: 205,
      color: '#fffaf0',
      intensity: 2.7,
      skyTop: '#4a96e6',
      skyBottom: '#d6ecfa',
      ambient: 0.5,
    },
  ],
  [
    960,
    {
      elevationDeg: 40,
      azimuthDeg: 230,
      color: '#fff1d6',
      intensity: 2.2,
      skyTop: '#5197dc',
      skyBottom: '#e3eef2',
      ambient: 0.46,
    },
  ],
  [
    1080,
    {
      elevationDeg: 10,
      azimuthDeg: 262,
      color: '#ffa552',
      intensity: 1.4,
      skyTop: '#5a6fb0',
      skyBottom: '#ffb070',
      ambient: 0.38,
    },
  ],
  [
    1170,
    {
      elevationDeg: 3,
      azimuthDeg: 278,
      color: '#e0786a',
      intensity: 0.6,
      skyTop: '#2c3a74',
      skyBottom: '#c76f6a',
      ambient: 0.28,
    },
  ],
  [1260, { ...NIGHT, azimuthDeg: 160, intensity: 0.3 }],
  [1560, NIGHT],
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (t: number) => t * t * (3 - 2 * t);

export function sunAt(minute: number): SunState {
  const m = Math.min(Math.max(minute, 0), 1560);
  const i = KEYS.findIndex(([k]) => k > m);
  const key = (j: number): Key => KEYS[Math.min(Math.max(j, 0), KEYS.length - 1)] ?? [0, NIGHT];
  const [m0, a] = key(i - 1);
  const [m1, b] = key(i < 0 ? KEYS.length - 1 : i);
  const t = m1 === m0 ? 0 : smooth((m - m0) / (m1 - m0));
  return {
    elevationDeg: lerp(a.elevationDeg, b.elevationDeg, t),
    azimuthDeg: lerp(a.azimuthDeg, b.azimuthDeg, t),
    color: mixHex(a.color, b.color, t),
    intensity: lerp(a.intensity, b.intensity, t),
    skyTop: mixHex(a.skyTop, b.skyTop, t),
    skyBottom: mixHex(a.skyBottom, b.skyBottom, t),
    ambient: lerp(a.ambient, b.ambient, t),
  };
}

/** 0 in daylight, 1 at night; drives stars, window glow and fireflies. */
export function nightFactor(minute: number): number {
  if (minute >= 420 && minute <= 1080) return 0;
  if (minute > 1080 && minute < 1260) return (minute - 1080) / 180;
  if (minute > 300 && minute < 420) return (420 - minute) / 120;
  return 1;
}

/** Unit vector toward the light. Azimuth is clockwise from north (−z). */
export function sunDirection(s: SunState): [number, number, number] {
  const el = (s.elevationDeg * Math.PI) / 180;
  const az = (s.azimuthDeg * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
}
