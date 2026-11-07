import { describe, expect, it } from 'vitest';
import { findMotif, GLOAM, ROOTSONG_MAJOR, ROOTSONG_MINOR } from '../motifs';
import { noteMidi } from '../notes';
import type { InstrumentId } from '../samples';
import { compilePiece, HUMANIZE_JINGLE, HUMANIZE_TRACK, type Piece } from '../score';
import { GODOT_TRACK_PIECES, JINGLE_PIECES, TRACK_PIECES } from './index';
import { W1 } from './woods';

/**
 * The Outward-style folk soundtrack rules (soundtrack spec REQ-01, REQ-02, REQ-06).
 * They cover every track, Godot track and jingle.
 */
const ALL_PIECES: Piece[] = [
  ...Object.values(TRACK_PIECES),
  ...Object.values(GODOT_TRACK_PIECES),
  ...Object.values(JINGLE_PIECES),
];
/** Exploration tracks: the places you walk around in, day and night (REQ-06). */
const EXPLORATION: Piece[] = [
  ...(['spring', 'summer', 'fall', 'winter', 'night'] as const).map((id) => TRACK_PIECES[id]),
  GODOT_TRACK_PIECES.woods,
  GODOT_TRACK_PIECES.woodsNight,
  GODOT_TRACK_PIECES.lowmere,
  GODOT_TRACK_PIECES.lowmereNight,
  GODOT_TRACK_PIECES.mossdeep,
];

const RETIRED_VOICES = ['pad', 'choir', 'ePiano', 'arp', 'glock', 'subBass'];
const RETIRED_KIT = ['glockGliss', 'bellTree'];
/** Parts named "drone…" or "strings…" are beds under the tune; like the kit, they are not voices (REQ-25). */
const isBed = (name: string) => name.startsWith('drone') || name.startsWith('strings');
const isMelodic = (name: string, p: Piece) => p.parts[name]?.instrument !== 'kit' && !isBed(name);

describe('the folk soundtrack (soundtrack spec §A)', () => {
  it.each(ALL_PIECES.map((p) => [p.id, p] as const))('%s uses no retired timbre', (_id, p) => {
    for (const [name, part] of Object.entries(p.parts)) {
      expect(RETIRED_VOICES, `${p.id} ${name}`).not.toContain(part.instrument);
      for (const k of Object.values(part.kit ?? {}))
        expect(RETIRED_KIT, `${p.id} ${name}`).not.toContain(k);
    }
  });

  it.each(ALL_PIECES.map((p) => [p.id, p] as const))(
    '%s never has more than 4 melodic voices sounding',
    (_id, p) => {
      const c = compilePiece(p);
      const total = c.totalBars * c.barSteps;
      let most = 0;
      for (let s = 0; s < total; s++) {
        const sounding = new Set(
          c.tones
            .filter((t) => isMelodic(t.part, p) && t.step <= s && s < t.step + t.steps)
            .map((t) => t.part),
        );
        most = Math.max(most, sounding.size);
      }
      expect(most).toBeLessThanOrEqual(4);
    },
  );

  it.each(EXPLORATION.map((p) => [p.id, p] as const))(
    '%s has a stretch of 4 bars where no melodic voice plays',
    (_id, p) => {
      const c = compilePiece(p);
      const quiet = Array.from({ length: c.totalBars }, (_, b) => {
        const from = b * c.barSteps;
        const to = from + c.barSteps;
        return !c.tones.some((t) => isMelodic(t.part, p) && t.step < to && t.step + t.steps > from);
      });
      let run = 0;
      let longest = 0;
      for (const q of quiet) {
        run = q ? run + 1 : 0;
        longest = Math.max(longest, run);
      }
      expect(longest).toBeGreaterThanOrEqual(4);
    },
  );

  it('keeps the new instruments inside the notes that were recorded', () => {
    // Sounding ranges from the sample files (VCSL names sound an octave up; the fiddle sounds as named).
    const RANGE: Partial<Record<InstrumentId, [string, string]>> = {
      fiddle: ['G3', 'C7'],
      strumstick: ['D3', 'A5'],
      folkHarp: ['B2', 'F#6'],
      psaltery: ['A#4', 'G6'],
      recorder: ['A#4', 'G#6'],
      cellosSpic: ['C2', 'F5'],
      bassesPizz: ['E1', 'G#3'],
      basses: ['E1', 'G#3'],
      fiddleSpic: ['G3', 'C7'],
    };
    for (const p of ALL_PIECES) {
      const c = compilePiece(p);
      for (const t of c.tones) {
        const r = RANGE[t.instrument as InstrumentId];
        if (!r) continue;
        expect(t.midi, `${p.id} ${t.part} step ${String(t.step)}`).toBeGreaterThanOrEqual(
          noteMidi(r[0]),
        );
        expect(t.midi, `${p.id} ${t.part} step ${String(t.step)}`).toBeLessThanOrEqual(
          noteMidi(r[1]),
        );
      }
    }
  });

  it('plays the Rootsong, major and minor, in the title (REQ-03)', () => {
    expect(findMotif(TRACK_PIECES.title, ROOTSONG_MAJOR)).toBe(true);
    expect(findMotif(TRACK_PIECES.title, ROOTSONG_MINOR)).toBe(true);
  });

  it('keeps the title a folk fantasy in 66-76 bpm, 60-120 s (REQ-05)', () => {
    const c = compilePiece(TRACK_PIECES.title);
    expect(c.bpm).toBeGreaterThanOrEqual(66);
    expect(c.bpm).toBeLessThanOrEqual(76);
    expect(c.seconds).toBeGreaterThanOrEqual(60);
    expect(c.seconds).toBeLessThanOrEqual(120);
  });

  it('writes the Woods day track in 72-84 bpm over 96-150 s (REQ-05)', () => {
    const c = compilePiece(GODOT_TRACK_PIECES.woods);
    expect(c.bpm).toBeGreaterThanOrEqual(72);
    expect(c.bpm).toBeLessThanOrEqual(84);
    expect(c.seconds).toBeGreaterThanOrEqual(96);
    expect(c.seconds).toBeLessThanOrEqual(150);
  });

  it.each([
    ['lowmere', 'lowmereNight'],
    ['woods', 'woodsNight'],
  ] as const)('%s has a night variant, slower and with at most 3 voices (REQ-04)', (day, night) => {
    const d = compilePiece(GODOT_TRACK_PIECES[day]);
    const n = compilePiece(GODOT_TRACK_PIECES[night]);
    expect(n.bpm / d.bpm).toBeGreaterThanOrEqual(0.65);
    expect(n.bpm / d.bpm).toBeLessThanOrEqual(0.8);
    let most = 0;
    for (let s = 0; s < n.totalBars * n.barSteps; s++)
      most = Math.max(
        most,
        new Set(
          n.tones
            .filter(
              (t) =>
                isMelodic(t.part, GODOT_TRACK_PIECES[night]) && t.step <= s && s < t.step + t.steps,
            )
            .map((t) => t.part),
        ).size,
      );
    expect(most).toBeLessThanOrEqual(3);
  });

  it("shares each day track's lead tune with its night variant (REQ-04)", () => {
    expect(findMotif(GODOT_TRACK_PIECES.lowmere, ROOTSONG_MAJOR)).toBe(true);
    expect(findMotif(GODOT_TRACK_PIECES.lowmereNight, ROOTSONG_MAJOR)).toBe(true);
    const lead = (p: Piece) => Object.values(p.parts).some((x) => x.notes.includes(W1));
    expect(lead(GODOT_TRACK_PIECES.woods)).toBe(true);
    expect(lead(GODOT_TRACK_PIECES.woodsNight)).toBe(true);
  });

  it('builds Mossdeep and the Bramble Matron on the Gloam, and uses subBass nowhere (REQ-03)', () => {
    for (const id of ['mossdeep', 'matron'] as const)
      expect(findMotif(GODOT_TRACK_PIECES[id], GLOAM), id).toBe(true);
    for (const p of Object.values(GODOT_TRACK_PIECES))
      for (const part of Object.values(p.parts)) expect(part.instrument).not.toBe('subBass');
  });

  it('keeps fights and the boss between 40 and 75 s (REQ-05)', () => {
    for (const id of ['woodsFight', 'mossdeepFight', 'matron'] as const) {
      const c = compilePiece(GODOT_TRACK_PIECES[id]);
      expect(c.seconds, id).toBeGreaterThanOrEqual(40);
      expect(c.seconds, id).toBeLessThanOrEqual(75);
    }
  });
});

/**
 * The cinematic folk revision (cinematic folk spec REQ-24 to REQ-29), from the measured gaps to the reference:
 * low end, beds that swell, little jingle, gypsy colour, fights as a wall, human timing. They cover the pilot pieces
 * until the rollout makes this list every piece (AC-24).
 */
const REVISED: Piece[] = [
  TRACK_PIECES.title,
  GODOT_TRACK_PIECES.woods,
  GODOT_TRACK_PIECES.woodsFight,
  GODOT_TRACK_PIECES.lowmere,
];
const NIGHT = new Set(['night', 'woodsNight', 'lowmereNight']);
const FIGHTS = new Set(['woodsFight', 'mossdeepFight', 'matron']);
const GYPSY = new Set(['woodsFight', 'mossdeepFight', 'matron', 'lowmere']);
const LOW = 48;
/** A low note this loud or louder is heard as weight, not a whisper (the old pp drones were about 0.09). */
const LOW_GAIN = 0.15;

/** For each bar, whether `has` holds for some tone sounding in it. */
function barsWith(p: Piece, has: (t: ReturnType<typeof compilePiece>['tones'][number]) => boolean) {
  const c = compilePiece(p);
  return Array.from({ length: c.totalBars }, (_, b) => {
    const from = b * c.barSteps;
    const to = from + c.barSteps;
    return c.tones.some((t) => has(t) && t.step < to && t.step + t.steps > from);
  });
}

/**
 * An augmented second as a scale step: pitch classes a and a + 3 with nothing between them and a semitone on each
 * side (the core of Phrygian dominant, harmonic and Hungarian minor). Diatonic and pentatonic sets never have it.
 */
export function hasAugmentedSecond(pcs: ReadonlySet<number>): boolean {
  const has = (n: number) => pcs.has(((n % 12) + 12) % 12);
  return [...pcs].some((a) => has(a + 3) && !has(a + 1) && !has(a + 2) && has(a - 1) && has(a + 4));
}

describe('the cinematic folk revision (cinematic folk spec)', () => {
  it('knows an augmented second when it sees one', () => {
    const set = (...names: string[]) => new Set(names.map((n) => noteMidi(`${n}4`) % 12));
    expect(hasAugmentedSecond(set('D', 'D#', 'F#', 'G', 'A', 'A#', 'C'))).toBe(true); // D Phrygian dominant
    expect(hasAugmentedSecond(set('A', 'B', 'C', 'D', 'E', 'F', 'G#'))).toBe(true); // A harmonic minor
    expect(hasAugmentedSecond(set('D', 'E', 'F', 'G', 'A', 'B', 'C'))).toBe(false); // D Dorian
    expect(hasAugmentedSecond(set('C', 'D', 'E', 'G', 'A'))).toBe(false); // pentatonic
  });

  it.each(REVISED.filter((p) => !NIGHT.has(p.id)).map((p) => [p.id, p] as const))(
    '%s has weight in the low register (REQ-24)',
    (id, p) => {
      const low = barsWith(p, (t) => t.midi <= LOW && t.gain >= LOW_GAIN);
      const share = low.filter(Boolean).length / low.length;
      expect(share, id).toBeGreaterThanOrEqual(FIGHTS.has(id) ? 1 : 0.6);
    },
  );

  it.each(REVISED.map((p) => [p.id, p] as const))(
    '%s lets its string beds swell in and out, never a held pad (REQ-25)',
    (id, p) => {
      for (const [name, part] of Object.entries(p.parts)) {
        if (!name.startsWith('strings')) continue;
        expect(part.attack ?? 0, `${id} ${name}`).toBeGreaterThanOrEqual(0.4);
        const sounding = barsWith(p, (t) => t.part === name);
        const resting = sounding.filter((x) => !x).length / sounding.length;
        expect(resting, `${id} ${name}`).toBeGreaterThanOrEqual(0.25);
      }
    },
  );

  it.each(REVISED.map((p) => [p.id, p] as const))(
    '%s plays at most 4 tambourine or shaker hits a bar (REQ-26)',
    (id, p) => {
      const c = compilePiece(p);
      const perBar = new Map<number, number>();
      for (const h of c.hits)
        if (h.kit === 'tamb' || h.kit === 'shaker') {
          const bar = Math.floor(h.step / c.barSteps);
          perBar.set(bar, (perBar.get(bar) ?? 0) + 1);
        }
      expect(Math.max(0, ...perBar.values()), id).toBeLessThanOrEqual(4);
    },
  );

  it.each(REVISED.filter((p) => GYPSY.has(p.id)).map((p) => [p.id, p] as const))(
    '%s has the gypsy colour of an augmented second in a melodic part (REQ-27)',
    (id, p) => {
      // The scale is local: look at every 4-bar window of every melodic part.
      const c = compilePiece(p);
      const parts = Object.keys(p.parts).filter((n) => isMelodic(n, p));
      const window = 4 * c.barSteps;
      const found = parts.some((n) => {
        const tones = c.tones.filter((t) => t.part === n);
        for (let from = 0; from < c.totalBars * c.barSteps; from += c.barSteps) {
          const pcs = tones.filter((t) => t.step >= from && t.step < from + window);
          if (hasAugmentedSecond(new Set(pcs.map((t) => t.midi % 12)))) return true;
        }
        return false;
      });
      expect(found, id).toBe(true);
    },
  );

  it.each(REVISED.filter((p) => FIGHTS.has(p.id)).map((p) => [p.id, p] as const))(
    '%s is a wall: a pitched layer sounds in every 8th (REQ-28)',
    (id, p) => {
      const c = compilePiece(p);
      for (let s = 0; s < c.totalBars * c.barSteps; s += 2)
        expect(
          c.tones.some((t) => t.step <= s && s < t.step + t.steps),
          `${id} step ${String(s)}`,
        ).toBe(true);
    },
  );

  it.each(REVISED.map((p) => [p.id, p] as const))(
    '%s is played by human hands (REQ-29)',
    (id, p) => {
      const least = p.kind === 'jingle' ? HUMANIZE_JINGLE : HUMANIZE_TRACK;
      expect(p.humanize?.ms ?? 0, id).toBeGreaterThanOrEqual(least.ms);
      expect(p.humanize?.gain ?? 0, id).toBeGreaterThanOrEqual(least.gain);
    },
  );
});
