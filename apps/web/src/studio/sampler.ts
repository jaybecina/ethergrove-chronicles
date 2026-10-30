export interface SampleNote {
  start: number;
  /** Seconds the note is held; null plays the sample to its natural end. */
  dur: number | null;
  rate: number;
  /** Sweep the playback rate to this by the end of the note. */
  rateTo?: number;
  gain: number;
  /** Release time constant in seconds. */
  release: number;
  dest: AudioNode;
  lowpass?: number;
  highpass?: number;
}

const ATTACK_SEC = 0.005;

/** One sampled note: pitched by playback rate, with a short attack and a release after the note. */
export function playSample(ctx: BaseAudioContext, buffer: AudioBuffer, o: SampleNote): void {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.playbackRate.setValueAtTime(o.rate, o.start);
  const natural = buffer.duration / o.rate;
  if (o.rateTo !== undefined)
    src.playbackRate.linearRampToValueAtTime(o.rateTo, o.start + (o.dur ?? natural));
  const made: AudioNode[] = [src];
  let head: AudioNode = src;
  const filter = (type: BiquadFilterType, hz: number) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = hz;
    head = head.connect(f);
    made.push(f);
  };
  if (o.lowpass) filter('lowpass', o.lowpass);
  if (o.highpass) filter('highpass', o.highpass);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, o.start);
  env.gain.linearRampToValueAtTime(o.gain, o.start + ATTACK_SEC);
  if (o.dur !== null) env.gain.setTargetAtTime(0, o.start + o.dur, o.release);
  head.connect(env).connect(o.dest);
  made.push(env);
  const length = o.dur === null ? natural : Math.min(natural, o.dur + o.release * 5);
  src.start(o.start);
  src.stop(o.start + length);
  src.onended = () => {
    for (const n of made) n.disconnect();
  };
}
