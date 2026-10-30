/** MIDI numbers of the lowest (C0) and highest (C8) notes: the range of the sample names. */
export const NOTE_MIN = 12;
export const NOTE_MAX = 108;

const NOTE_RE = /^([A-G])([#b]?)([0-8])$/;
const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** `'A4'` → 69. Accepts one `#` or `b`; octaves 0–8. */
export function noteMidi(name: string): number {
  const m = NOTE_RE.exec(name);
  if (!m) throw new Error(`Bad note "${name}"`);
  const [, letter = 'C', accidental, octave = '4'] = m;
  const shift = accidental === '#' ? 1 : accidental === 'b' ? -1 : 0;
  return 12 * (Number(octave) + 1) + (SEMITONE[letter] ?? 0) + shift;
}

export const midiHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);

export const noteHz = (name: string, transpose = 0): number => midiHz(noteMidi(name) + transpose);
