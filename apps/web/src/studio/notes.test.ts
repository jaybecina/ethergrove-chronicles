import { describe, expect, it } from 'vitest';
import { NOTE_MAX, NOTE_MIN, noteHz, noteMidi } from './notes';

describe('notes', () => {
  it('turns note names into frequencies', () => {
    expect(noteHz('A4')).toBe(440);
    expect(noteHz('C4')).toBeCloseTo(261.63, 2);
    expect(noteHz('A4', 12)).toBe(880);
  });

  it('treats sharps and flats as the same pitch', () => {
    expect(noteMidi('Bb3')).toBe(noteMidi('A#3'));
  });

  it('spans C0 to C8, like the sample names', () => {
    expect(noteMidi('C0')).toBe(NOTE_MIN);
    expect(noteMidi('A#0')).toBe(22);
    expect(noteMidi('C8')).toBe(NOTE_MAX);
  });

  it('rejects bad names', () => {
    for (const bad of ['H4', 'C', 'C9', 'c4', 'C#'])
      expect(() => noteMidi(bad)).toThrow(`Bad note "${bad}"`);
  });
});
