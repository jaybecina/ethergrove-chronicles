/** Small helpers for writing scores as one string per bar. */
export const bars = (...b: (string | string[])[]): string => b.flat().join(' | ');

/** `n` bars of rest. */
export const rests = (n: number, meter: 3 | 4 = 4): string[] =>
  Array.from({ length: n }, () => `r:${meter * 4}`);

/** `n` silent kit bars. */
export const silent = (n: number, meter: 3 | 4 = 4): string[] =>
  Array.from({ length: n }, () => '.'.repeat(meter * 4));

/** The same bar `n` times. */
export const times = (n: number, bar: string): string[] => Array.from({ length: n }, () => bar);

/** One chord or note held for each whole bar. */
export const held = (chords: string[], meter: 3 | 4 = 4): string[] =>
  chords.map((c) => `${c}:${meter * 4}`);

/** The same dynamic for `n` bars, as `dyn` tokens. */
export const dyn = (...runs: [string, number][]): string =>
  runs.flatMap(([d, n]) => Array.from({ length: n }, () => d)).join(' ');
