import { midiHz } from './notes';

export type SynthId = 'pad' | 'subBass' | 'arp' | 'choir' | 'ePiano';
export const SYNTH_IDS: readonly SynthId[] = ['pad', 'subBass', 'arp', 'choir', 'ePiano'];

export interface SynthNote {
  start: number;
  dur: number;
  midi: number;
  gain: number;
  dest: AudioNode;
}

/** Attack and release in seconds (spec §3.2). */
const SHAPE: Record<SynthId, { attack: number; release: number }> = {
  pad: { attack: 0.8, release: 1.5 },
  subBass: { attack: 0.01, release: 0.15 },
  arp: { attack: 0.003, release: 0.1 },
  choir: { attack: 0.6, release: 1.2 },
  ePiano: { attack: 0.004, release: 0.35 },
};

/** Electric piano (audio spec §3.2): FM index 2.0 → 0.3 over 0.6 s, tremolo 4.5 Hz at ±1.5 dB. */
const EP_INDEX = [2, 0.3] as const;
const EP_INDEX_SEC = 0.6;
const EP_TREMOLO_HZ = 4.5;
const EP_TREMOLO_DEPTH = 10 ** (1.5 / 20) - 1;

/** The modern layers under the orchestra: a warm pad, a sub bass, a soft arp and a vowel-like choir. */
export function playSynth(ctx: BaseAudioContext, id: SynthId, o: SynthNote): void {
  const { attack, release } = SHAPE[id];
  const hz = midiHz(o.midi);
  const end = o.start + o.dur;
  const stopAt = end + release * 4;
  const made: AudioNode[] = [];
  const sources: OscillatorNode[] = [];
  const osc = (type: OscillatorType, freq: number, detune = 0) => {
    const n = ctx.createOscillator();
    n.type = type;
    n.frequency.value = freq;
    n.detune.value = detune;
    sources.push(n);
    made.push(n);
    return n;
  };
  const gain = (v: number) => {
    const g = ctx.createGain();
    g.gain.value = v;
    made.push(g);
    return g;
  };
  const filter = (type: BiquadFilterType, freq: number, q = 1) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    made.push(f);
    return f;
  };
  const env = gain(0);
  env.gain.setValueAtTime(0, o.start);
  env.gain.linearRampToValueAtTime(o.gain, o.start + attack);
  env.gain.setTargetAtTime(0, Math.max(end, o.start + attack), release / 3);
  env.connect(o.dest);

  if (id === 'pad') {
    const lp = filter('lowpass', 1800, 0.5);
    lp.connect(env);
    for (const cents of [-7, 0, 7])
      osc('sawtooth', hz, cents)
        .connect(gain(1 / 3))
        .connect(lp);
  } else if (id === 'subBass') {
    osc('sine', hz).connect(env);
    osc('sine', hz * 2)
      .connect(gain(0.15))
      .connect(env);
  } else if (id === 'arp') {
    const lp = filter('lowpass', 3000, 1);
    lp.frequency.setValueAtTime(3000, o.start);
    lp.frequency.exponentialRampToValueAtTime(600, o.start + 0.18);
    osc('square', hz).connect(lp).connect(env);
  } else if (id === 'ePiano') {
    const carrier = osc('sine', hz);
    const mod = osc('sine', hz);
    const index = gain(EP_INDEX[0] * hz);
    index.gain.setValueAtTime(EP_INDEX[0] * hz, o.start);
    index.gain.linearRampToValueAtTime(EP_INDEX[1] * hz, o.start + EP_INDEX_SEC);
    mod.connect(index).connect(carrier.frequency);
    const tremolo = gain(1);
    osc('sine', EP_TREMOLO_HZ).connect(gain(EP_TREMOLO_DEPTH)).connect(tremolo.gain);
    carrier.connect(tremolo).connect(env);
  } else {
    const src = osc('sawtooth', hz);
    const lfo = osc('sine', 5);
    lfo.connect(gain(8)).connect(src.detune);
    for (const [freq, level] of [
      [700, 0.6],
      [1200, 0.4],
    ] as const)
      src
        .connect(filter('bandpass', freq, 6))
        .connect(gain(level))
        .connect(env);
  }
  for (const s of sources) {
    s.start(o.start);
    s.stop(stopAt);
  }
  const first = sources[0];
  if (first)
    first.onended = () => {
      for (const n of made) n.disconnect();
    };
}
