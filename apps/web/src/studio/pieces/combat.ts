import { GLOAM } from '../motifs';
import type { PartSpec, Piece } from '../score';
import { bars, dyn, rests, times } from './notation';
import { barsOf, shift } from './folk';

const GLOAM_BARS = barsOf(GLOAM.notes);
const GLOAM_HIGH = barsOf(shift(GLOAM.notes, 12));

interface Fight {
  id: string;
  bpm: number;
  /** The cello's one-bar ostinato. */
  ostinato: string;
  /** Fiddle bars for the second and later sections (8 bars each, or fewer). */
  riff: string[];
  /** Include a timpani downbeat. */
  timp?: boolean;
  /** Section count of 8 bars; the first is ostinato and drums only. */
  sections: number;
  /** The Gloam on the fiddle and then on the psaltery (the boss). */
  gloam?: boolean;
}

const FRAME = 'f..f..f.f..f..f.';
const DARBUKA = 'd.d.d.d.d.d.d.dd';

/** A fight: a driving cello ostinato and hand drums, a fiddle riff from the second section, grit builds. */
function fight(o: Fight): Piece {
  const n = o.sections * 8;
  const section = (i: number): { fiddle: string[]; psaltery: string[]; drums: boolean } => {
    const idle = rests(8);
    if (i === 0) return { fiddle: idle, psaltery: idle, drums: true };
    const riff = o.gloam
      ? [...GLOAM_BARS, ...GLOAM_BARS, ...GLOAM_BARS, ...GLOAM_BARS]
      : times(4, o.riff[0] ?? 'r:16')
          .flatMap((b, j) => [b, o.riff[(j % 2) + 1] ?? b])
          .slice(0, 8);
    const high = [...GLOAM_HIGH, ...GLOAM_HIGH, ...GLOAM_HIGH, ...GLOAM_HIGH];
    return {
      fiddle: riff,
      psaltery: o.gloam && i >= 2 ? high : idle,
      drums: true,
    };
  };
  const secs = Array.from({ length: o.sections }, (_, i) => section(i));
  const part = (
    instrument: PartSpec['instrument'],
    gain: number,
    notes: string[],
    extra: Partial<PartSpec> = {},
  ): PartSpec => ({
    instrument,
    gain,
    dyn: dyn(['mf', n]),
    notes: bars(notes),
    ...extra,
  });
  const parts: Record<string, PartSpec> = {
    cellosOst: part('cellos', 0.42, times(n, o.ostinato)),
    fiddle: part(
      'fiddle',
      0.5,
      secs.flatMap((s) => s.fiddle),
    ),
    frame: part('kit', 0.45, times(n, FRAME), { kit: { f: 'frameDrum' } }),
    darbuka: part('kit', 0.4, times(n, DARBUKA), { kit: { d: 'darbuka' } }),
  };
  if (o.gloam)
    parts.psaltery = part(
      'psaltery',
      0.36,
      secs.flatMap((s) => s.psaltery),
    );
  if (o.timp)
    parts.timp = part('kit', 0.5, times(n, 'T...............'), { kit: { T: 'timpHit' } });
  return { id: o.id, kind: 'track', bpm: o.bpm, meter: 4, parts };
}

/** A fight in Mossdeep: B Phrygian, 120 bpm, 24 bars (48 s). Lower and closer, with a timpani downbeat. */
export const mossdeepFight = fight({
  id: 'mossdeepFight',
  bpm: 120,
  ostinato: 'B2:2 B2:2 F#3:2 B2:2 C3:2 B2:2 F#3:2 A2:2',
  riff: [
    'B4:2 B4:2 C5:2 B4:2 D5:4 C5:2 B4:2',
    'B4:2 B4:2 C5:2 B4:2 D5:4 C5:2 B4:2',
    'F#5:4 E5:2 D5:2 C5:4 B4:4',
  ],
  timp: true,
  sections: 3,
});

/**
 * The Bramble Matron: B Phrygian, 132 bpm, 32 bars (58 s), built on the Gloam: the fiddle plays it low, the bowed
 * psaltery an octave up from the third section, over cello, drums and timpani.
 */
export const matron = fight({
  id: 'matron',
  bpm: 132,
  ostinato: 'B2:2 B2:2 F#3:2 B2:2 C3:2 B2:2 F#3:2 A2:2',
  riff: [],
  timp: true,
  gloam: true,
  sections: 4,
});
