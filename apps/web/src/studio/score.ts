import { NOTE_MAX, NOTE_MIN, noteMidi } from './notes';
import type { InstrumentId, KitId } from './samples';
import type { LofiSpec } from './lofi';
import type { SynthId } from './synths';

/**
 * The score format (spec §4): 4 steps per beat, bars split by `|`, tokens split by whitespace.
 * Notes `C#5:2`, rests `r:8`, ties `~:4`, chords `(C4 E4 G4):8`. Kit parts read one character per step.
 */
export type Dyn = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff';
export const DYN_GAIN: Record<Dyn, number> = {
  pp: 0.25,
  p: 0.4,
  mp: 0.55,
  mf: 0.7,
  f: 0.85,
  ff: 1,
};
const DYNS = Object.keys(DYN_GAIN) as Dyn[];

export type Voice = InstrumentId | SynthId;

export interface PartSpec {
  instrument: Voice | 'kit';
  notes: string;
  /** Default 0.5. */
  gain?: number;
  /** −1..1; default from the orchestra seating. */
  pan?: number;
  /** Reverb send 0..1; default 0.3. */
  reverb?: number;
  /** One per bar: pp p mp mf f ff, or `<` / `>` to ramp to the next bar's value. Default mf throughout. */
  dyn?: string;
  arp?: 'up' | 'down' | 'updown' | 'block';
  arpRate?: number;
  octave?: number;
  /** Kit parts: character → kit sound. */
  kit?: Record<string, KitId>;
}

export interface Piece {
  id: string;
  kind: 'track' | 'jingle' | 'sfx';
  bpm: number;
  meter: 3 | 4;
  swing?: number;
  parts: Record<string, PartSpec>;
  /** Makes this a lo-fi track (audio spec §3.3): the render adds the lo-fi stage and checks its rules. */
  lofi?: LofiSpec;
}

export interface NoteEvent {
  step: number;
  steps: number;
  part: string;
  instrument: Voice;
  midi: number;
  gain: number;
  dyn: Dyn;
  /** Counts the part's notes, for round robins. */
  noteIndex: number;
}
export interface HitEvent {
  step: number;
  part: string;
  kit: KitId;
  gain: number;
  noteIndex: number;
}

export interface CompiledPiece {
  id: string;
  kind: Piece['kind'];
  bpm: number;
  meter: 3 | 4;
  swing: number;
  stepSec: number;
  barSteps: number;
  totalBars: number;
  seconds: number;
  /** Sorted by step. */
  tones: NoteEvent[];
  hits: HitEvent[];
  parts: Record<string, { pan: number; reverb: number }>;
}

/** Orchestral seating (spec §4.3). */
export const DEFAULT_PAN: Partial<Record<Voice | 'kit', number>> = {
  violins: -0.35,
  violinsPizz: -0.35,
  violinsTrem: -0.35,
  violas: -0.1,
  cellos: 0.25,
  cellosPizz: 0.25,
  basses: 0.4,
  harp: -0.5,
  horn: 0.3,
  trumpet: 0.15,
  trombone: 0.35,
  tuba: 0.35,
  flute: -0.2,
  oboe: 0.05,
  clarinet: -0.15,
  clarinetStac: -0.15,
  bassoon: 0.2,
  glock: -0.25,
  marimba: -0.25,
};
const DEFAULT_GAIN = 0.5;
const DEFAULT_REVERB = 0.3;
const BLOCK_GAIN = 0.7;

const TOKEN_RE = /\([^)]*\)(?::\d+)?|\S+/g;
const NOTE_TOKEN = /^([A-G][#b]?\d)(?::(\d+))?$/;
const CHORD_TOKEN = /^\(([^)]*)\)(?::(\d+))?$/;
const REST_TOKEN = /^r(?::(\d+))?$/;
const TIE_TOKEN = /^~(?::(\d+))?$/;

interface Item {
  start: number;
  steps: number;
  midis: number[] | null;
}

const len = (s: string | undefined) => (s === undefined ? 4 : Number(s));

function parseMelodic(
  where: (bar: number) => string,
  bars: string[],
  barSteps: number,
  shift: number,
): Item[] {
  const items: Item[] = [];
  bars.forEach((bar, b) => {
    const fail = (problem: string): never => {
      throw new Error(`${where(b + 1)}: ${problem}`);
    };
    const midi = (name: string) => {
      let m = 0;
      try {
        m = noteMidi(name) + shift;
      } catch {
        fail(`bad token "${name}"`);
      }
      if (m < NOTE_MIN || m > NOTE_MAX) fail(`note ${name} out of range`);
      return m;
    };
    const base = b * barSteps;
    let used = 0;
    for (const tok of bar.match(TOKEN_RE) ?? []) {
      let m: RegExpExecArray | null;
      let steps = 0;
      if ((m = TIE_TOKEN.exec(tok))) {
        steps = len(m[1]);
        const prev = items.at(-1);
        if (!prev?.midis) fail('tie with no note');
        else prev.steps += steps;
      } else if ((m = REST_TOKEN.exec(tok))) {
        steps = len(m[1]);
        items.push({ start: base + used, steps, midis: null });
      } else if ((m = NOTE_TOKEN.exec(tok)) && /[0-8]$/.test(m[1] ?? '')) {
        steps = len(m[2]);
        items.push({ start: base + used, steps, midis: [midi(m[1] ?? '')] });
      } else if ((m = CHORD_TOKEN.exec(tok))) {
        steps = len(m[2]);
        const names = (m[1] ?? '').trim().split(/\s+/);
        if (!names.every((n) => /^[A-G][#b]?[0-8]$/.test(n))) fail(`bad token "${tok}"`);
        items.push({ start: base + used, steps, midis: names.map(midi) });
      } else fail(`bad token "${tok}"`);
      if (steps <= 0) fail(`bad token "${tok}"`);
      used += steps;
    }
    if (used !== barSteps) fail(`has ${used} steps, expected ${barSteps}`);
  });
  return items;
}

function parseKit(
  where: (bar: number) => string,
  bars: string[],
  barSteps: number,
  kit: Record<string, KitId>,
): { step: number; kit: KitId }[] {
  const hits: { step: number; kit: KitId }[] = [];
  bars.forEach((bar, b) => {
    const chars = bar.replace(/\s+/g, '');
    for (let i = 0; i < chars.length; i++) {
      const c = chars.charAt(i);
      if (c === '.') continue;
      const id = kit[c];
      if (!id) throw new Error(`${where(b + 1)}: bad token "${c}"`);
      hits.push({ step: b * barSteps + i, kit: id });
    }
    if (chars.length !== barSteps)
      throw new Error(`${where(b + 1)}: has ${chars.length} steps, expected ${barSteps}`);
  });
  return hits;
}

/** Gain level (0..1) at every step, from one dynamic or hairpin per bar. */
function dynamicsCurve(
  id: string,
  part: string,
  dyn: string | undefined,
  bars: number,
  barSteps: number,
): (step: number) => number {
  const tokens = dyn ? dyn.trim().split(/\s+/) : Array.from({ length: bars }, () => 'mf');
  if (tokens.length !== bars)
    throw new Error(`${id} ${part}: dyn has ${tokens.length} bars, expected ${bars}`);
  const level = (t: string | undefined) =>
    (DYNS as string[]).includes(t ?? '') ? DYN_GAIN[t as Dyn] : null;
  const values = tokens.map((t, b) => {
    const named = level(t);
    if (named !== null) return { from: named, to: named };
    if (t !== '<' && t !== '>') throw new Error(`${id} ${part} bar ${b + 1}: bad dynamic "${t}"`);
    const prev = level(tokens[b - 1]);
    const next = level(tokens[b + 1]);
    if (prev === null || next === null)
      throw new Error(`${id} ${part} bar ${b + 1}: hairpin needs a target`);
    return { from: prev, to: next };
  });
  return (step) => {
    const b = Math.min(bars - 1, Math.floor(step / barSteps));
    const v = values[b] ?? { from: DYN_GAIN.mf, to: DYN_GAIN.mf };
    return v.from + (v.to - v.from) * ((step - b * barSteps) / barSteps);
  };
}

const dynAt = (level: number): Dyn =>
  [...DYNS].reverse().find((d) => DYN_GAIN[d] <= level + 1e-9) ?? 'pp';

function arpOrder(n: number, arp: 'up' | 'down' | 'updown'): number[] {
  const up = Array.from({ length: n }, (_, i) => i);
  if (arp === 'up') return up;
  if (arp === 'down') return up.reverse();
  return [...up, ...up.slice(1, -1).reverse()];
}

export function compilePiece(p: Piece): CompiledPiece {
  const barSteps = p.meter * 4;
  const stepSec = 60 / p.bpm / 4;
  const tones: NoteEvent[] = [];
  const hits: HitEvent[] = [];
  const parts: CompiledPiece['parts'] = {};
  const barCounts: number[] = [];
  for (const [name, part] of Object.entries(p.parts)) {
    const where = (bar: number) => `${p.id} ${name} bar ${bar}`;
    const bars = part.notes.split('|');
    barCounts.push(bars.length);
    const curve = dynamicsCurve(p.id, name, part.dyn, bars.length, barSteps);
    const partGain = part.gain ?? DEFAULT_GAIN;
    parts[name] = {
      pan: part.pan ?? DEFAULT_PAN[part.instrument] ?? 0,
      reverb: part.reverb ?? DEFAULT_REVERB,
    };
    let noteIndex = 0;
    if (part.instrument === 'kit') {
      for (const h of parseKit(where, bars, barSteps, part.kit ?? {}))
        hits.push({ ...h, part: name, gain: partGain * curve(h.step), noteIndex: noteIndex++ });
      continue;
    }
    const instrument = part.instrument;
    const tone = (step: number, steps: number, midi: number, mul: number): NoteEvent => {
      const level = curve(step);
      return {
        step,
        steps,
        part: name,
        instrument,
        midi,
        gain: partGain * level * mul,
        dyn: dynAt(level),
        noteIndex: noteIndex++,
      };
    };
    const arp = part.arp ?? 'block';
    const rate = part.arpRate ?? 1;
    for (const it of parseMelodic(where, bars, barSteps, 12 * (part.octave ?? 0))) {
      const midis = it.midis;
      if (!midis) continue;
      if (midis.length === 1) tones.push(tone(it.start, it.steps, midis[0] ?? 0, 1));
      else if (arp === 'block')
        for (const m of midis) tones.push(tone(it.start, it.steps, m, BLOCK_GAIN));
      else {
        const order = arpOrder(midis.length, arp);
        for (let i = 0; i * rate < it.steps; i++)
          tones.push(
            tone(
              it.start + i * rate,
              Math.min(rate, it.steps - i * rate),
              midis[order[i % order.length] ?? 0] ?? 0,
              1,
            ),
          );
      }
    }
  }
  const totalBars = barCounts[0] ?? 0;
  if (totalBars === 0) throw new Error(`${p.id}: has no parts`);
  if (barCounts.some((n) => n !== totalBars))
    throw new Error(`${p.id}: parts have different bar counts`);
  tones.sort((a, b) => a.step - b.step);
  hits.sort((a, b) => a.step - b.step);
  return {
    id: p.id,
    kind: p.kind,
    bpm: p.bpm,
    meter: p.meter,
    swing: p.swing ?? 0,
    stepSec,
    barSteps,
    totalBars,
    seconds: totalBars * barSteps * stepSec,
    tones,
    hits,
    parts,
  };
}

/** Throws an Error naming the piece, part and bar of the first problem. */
export function validatePiece(p: Piece): void {
  compilePiece(p);
}
