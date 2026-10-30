import { describe, expect, it } from 'vitest';
import { noteMidi } from './notes';
import type { Piece } from './score';
import {
  findMotif,
  GLOAM,
  GRANDPA,
  HEARTH,
  ROOTSONG_MAJOR,
  ROOTSONG_MINOR,
  transpose,
  type Motif,
} from './motifs';

const piece = (
  notes: string,
  instrument: Piece['parts'][string]['instrument'] = 'flute',
): Piece => ({
  id: 'test',
  kind: 'jingle',
  bpm: 80,
  meter: 4,
  parts: { lead: { instrument, notes } },
});

/** Steps and rhythm worked out from the written notes, to check the constants against the spec. */
function shape(notes: string): { steps: number[]; rhythm: number[] } {
  const tokens = notes.split(/\s+/).filter((t) => t !== '|');
  const midis = tokens.map((t) => noteMidi(t.split(':')[0] ?? ''));
  return {
    steps: midis.slice(1).map((m, i) => m - (midis[i] ?? m)),
    rhythm: tokens.map((t) => Number(t.split(':')[1])),
  };
}

describe('motifs (audio spec §2.2)', () => {
  it.each([ROOTSONG_MAJOR, ROOTSONG_MINOR, GLOAM, GRANDPA, HEARTH])(
    '$name: steps and rhythm match its notes',
    (m: Motif) => {
      expect(shape(m.notes)).toEqual({ steps: [...m.steps], rhythm: [...m.rhythm] });
    },
  );

  it('pins the spec values', () => {
    expect(ROOTSONG_MAJOR.steps).toEqual([3, 4, -2, -2, 7, -2, -1, -2, 2, -4]);
    expect(ROOTSONG_MINOR.steps).toEqual([3, 4, -2, -2, 5, -1, -2, -2, -1, -2]);
    expect(GLOAM.steps).toEqual([3, 3, -1, -2, 5, -2, -1, -2, -1, -2]);
    expect(GRANDPA.steps).toEqual([2, 2, 3, -3, 1, -1, -2, -2, -3, -2]);
    expect(HEARTH.steps).toEqual([3, 2, -2, -3, -2, -2, 2, 2, 3, -5]);
    expect(ROOTSONG_MAJOR.rhythm).toEqual([2, 2, 4, 2, 2, 4, 2, 2, 2, 2, 8]);
    expect(GRANDPA.rhythm).toEqual([3, 1, 4, 4, 4, 2, 2, 2, 2, 4, 4]);
  });
});

describe('findMotif', () => {
  it('finds the Rootsong in its own key and transposed to C and E flat', () => {
    expect(findMotif(piece(ROOTSONG_MAJOR.notes), ROOTSONG_MAJOR)).toBe(true);
    expect(findMotif(piece(transpose(ROOTSONG_MAJOR, -2)), ROOTSONG_MAJOR)).toBe(true);
    expect(findMotif(piece(transpose(ROOTSONG_MAJOR, 1)), ROOTSONG_MAJOR)).toBe(true);
  });

  it('finds it after other notes and at half speed', () => {
    // Every length doubled, re-barred into whole 16-step bars.
    const half = 'B3:4 D4:4 F#4:8 | E4:4 D4:4 A4:8 | G4:4 F#4:4 E4:4 F#4:4 | D4:16';
    expect(findMotif(piece(`C4:8 E4:8 | ${ROOTSONG_MAJOR.notes}`), ROOTSONG_MAJOR)).toBe(true);
    expect(findMotif(piece(half), ROOTSONG_MAJOR)).toBe(true);
  });

  it('uses the top note of a chord', () => {
    const withChord = ROOTSONG_MAJOR.notes.replace('F#4:4', '(D4 F#4):4');
    expect(findMotif(piece(withChord), ROOTSONG_MAJOR)).toBe(true);
  });

  it('rejects a changed interval, a changed length and a rest inside the motif', () => {
    expect(findMotif(piece(ROOTSONG_MAJOR.notes.replace('A4:4', 'B4:4')), ROOTSONG_MAJOR)).toBe(
      false,
    );
    expect(findMotif(piece(ROOTSONG_MAJOR.notes.replace('A4:4', 'A4:3 r:1')), ROOTSONG_MAJOR)).toBe(
      false,
    );
    expect(
      findMotif(
        piece(ROOTSONG_MAJOR.notes.replace('E4:2 D4:2 A4:4', 'E4:2 r:2 A4:4')),
        ROOTSONG_MAJOR,
      ),
    ).toBe(false);
  });

  it('tells the major Rootsong, the minor Rootsong and the Gloam apart', () => {
    expect(findMotif(piece(ROOTSONG_MINOR.notes), ROOTSONG_MAJOR)).toBe(false);
    expect(findMotif(piece(GLOAM.notes), ROOTSONG_MINOR)).toBe(false);
    expect(findMotif(piece(ROOTSONG_MINOR.notes), ROOTSONG_MINOR)).toBe(true);
  });

  it('finds the retired Hearth motif, so tests can forbid it', () => {
    expect(findMotif(piece('C4:16 | ' + HEARTH.notes), HEARTH)).toBe(true);
  });
});
