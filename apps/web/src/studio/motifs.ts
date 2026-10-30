import { noteMidi } from './notes';
import { compilePiece, type Piece } from './score';

/** A leitmotif (audio spec §2.2). Steps are semitones between notes; rhythm is in 16th notes. */
export interface Motif {
  name: string;
  notes: string;
  steps: readonly number[];
  rhythm: readonly number[];
}

const ROOT_RHYTHM = [2, 2, 4, 2, 2, 4, 2, 2, 2, 2, 8] as const;

/** The main theme: the player, the valley, home. */
export const ROOTSONG_MAJOR: Motif = {
  name: 'Rootsong major',
  notes: 'B3:2 D4:2 F#4:4 E4:2 D4:2 A4:4 | G4:2 F#4:2 E4:2 F#4:2 D4:8',
  steps: [3, 4, -2, -2, 7, -2, -1, -2, 2, -4],
  rhythm: ROOT_RHYTHM,
};

/** Longing, the missing grandpa. */
export const ROOTSONG_MINOR: Motif = {
  name: 'Rootsong minor',
  notes: 'B3:2 D4:2 F#4:4 E4:2 D4:2 G4:4 | F#4:2 E4:2 D4:2 C#4:2 B3:8',
  steps: [3, 4, -2, -2, 5, -1, -2, -2, -1, -2],
  rhythm: ROOT_RHYTHM,
};

/** Danger, the sour ether (used from Part 5 on). */
export const GLOAM: Motif = {
  name: 'Gloam',
  notes: 'B3:2 D4:2 F4:4 E4:2 D4:2 G4:4 | F4:2 E4:2 D4:2 C#4:2 B3:8',
  steps: [3, 3, -1, -2, 5, -2, -1, -2, -1, -2],
  rhythm: ROOT_RHYTHM,
};

/** Elias and the farmhouse. */
export const GRANDPA: Motif = {
  name: "Grandpa's theme",
  notes: 'G4:3 A4:1 B4:4 D5:4 B4:4 | C5:2 B4:2 A4:2 G4:2 E4:4 D4:4',
  steps: [2, 2, 3, -3, 1, -1, -2, -2, -3, -2],
  rhythm: [3, 1, 4, 4, 4, 2, 2, 2, 2, 4, 4],
};

/** The retired Hearthvale motif. Kept only so tests can check that no piece uses it. */
export const HEARTH: Motif = {
  name: 'Hearth (retired)',
  notes: 'A4:2 C5:2 D5:4 C5:2 A4:2 G4:4 | F4:2 G4:2 A4:2 C5:2 G4:8',
  steps: [3, 2, -2, -3, -2, -2, 2, 2, 3, -5],
  rhythm: [2, 2, 4, 2, 2, 4, 2, 2, 2, 2, 8],
};

const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const midiName = (m: number): string => `${NAMES[m % 12] ?? 'C'}${String(Math.floor(m / 12) - 1)}`;

/** The motif's notes moved by `semitones`, in sharps, for composing. */
export function transpose(m: Motif, semitones: number): string {
  return m.notes.replace(/([A-G][#b]?\d)(?=:)/g, (name) => midiName(noteMidi(name) + semitones));
}

/** One melodic line per part: chords give their top note, and `start` marks where a note begins. */
function lines(piece: Piece): { midi: number; start: number; steps: number }[][] {
  const byPart = new Map<string, Map<number, { midi: number; steps: number }>>();
  for (const t of compilePiece(piece).tones) {
    const part = byPart.get(t.part) ?? new Map<number, { midi: number; steps: number }>();
    const at = part.get(t.step);
    if (!at || t.midi > at.midi) part.set(t.step, { midi: t.midi, steps: t.steps });
    byPart.set(t.part, part);
  }
  return [...byPart.values()].map((part) =>
    [...part.entries()].sort(([a], [b]) => a - b).map(([start, n]) => ({ start, ...n })),
  );
}

/**
 * True when some part plays the motif as consecutive notes (no rests between them), in any key, at its written
 * lengths or exactly doubled (half speed).
 */
export function findMotif(piece: Piece, m: Motif): boolean {
  const n = m.rhythm.length;
  for (const line of lines(piece)) {
    for (let i = 0; i + n <= line.length; i++) {
      for (const scale of [1, 2]) {
        let ok = true;
        for (let k = 0; k < n && ok; k++) {
          const note = line[i + k];
          const prev = line[i + k - 1];
          if (!note) ok = false;
          else if (note.steps !== (m.rhythm[k] ?? 0) * scale) ok = false;
          else if (
            k > 0 &&
            prev &&
            (note.midi - prev.midi !== m.steps[k - 1] || note.start !== prev.start + prev.steps)
          )
            ok = false;
        }
        if (ok) return true;
      }
    }
  }
  return false;
}
