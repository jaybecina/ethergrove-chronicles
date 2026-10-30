/**
 * A tiny stand-in for the Web Audio graph (jsdom has none). It records every node, connection and
 * parameter automation so tests can check the graph an audio module builds.
 */
export type ParamCall = [method: string, value: number, time: number, extra?: number];

export class FakeParam {
  calls: ParamCall[] = [];
  constructor(public value = 0) {}
  setValueAtTime(v: number, t: number) {
    this.calls.push(['setValueAtTime', v, t]);
    this.value = v;
    return this;
  }
  linearRampToValueAtTime(v: number, t: number) {
    this.calls.push(['linearRampToValueAtTime', v, t]);
    return this;
  }
  exponentialRampToValueAtTime(v: number, t: number) {
    this.calls.push(['exponentialRampToValueAtTime', v, t]);
    return this;
  }
  setTargetAtTime(v: number, t: number, c: number) {
    this.calls.push(['setTargetAtTime', v, t, c]);
    return this;
  }
  cancelScheduledValues(t: number) {
    this.calls.push(['cancelScheduledValues', 0, t]);
    return this;
  }
  /** The value of every setTargetAtTime call, in order. */
  targets() {
    return this.calls.filter((c) => c[0] === 'setTargetAtTime').map((c) => c[1]);
  }
}

export class FakeNode {
  outputs: unknown[] = [];
  disconnected = false;
  constructor(
    public kind: string,
    public ctx: FakeAudioContext,
  ) {
    ctx.nodes.push(this);
  }
  connect<T>(dest: T): T {
    this.outputs.push(dest);
    return dest;
  }
  disconnect() {
    this.disconnected = true;
  }
}

export class FakeSource extends FakeNode {
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;
  start(t = 0) {
    this.startedAt = t;
  }
  stop(t = 0) {
    this.stoppedAt = t;
  }
  /** Simulates the browser firing `ended`. */
  end() {
    this.onended?.();
  }
}

export class FakeOscillator extends FakeSource {
  type = 'sine';
  frequency = new FakeParam(440);
  detune = new FakeParam(0);
  wave: unknown = null;
  constructor(ctx: FakeAudioContext) {
    super('oscillator', ctx);
  }
  setPeriodicWave(w: unknown) {
    this.wave = w;
    this.type = 'custom';
  }
}

export class FakeBufferSource extends FakeSource {
  buffer: unknown = null;
  loop = false;
  playbackRate = new FakeParam(1);
  constructor(ctx: FakeAudioContext) {
    super('bufferSource', ctx);
  }
}

export class FakeGain extends FakeNode {
  gain = new FakeParam(1);
  constructor(ctx: FakeAudioContext) {
    super('gain', ctx);
  }
}

export class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam(350);
  Q = new FakeParam(1);
  constructor(ctx: FakeAudioContext) {
    super('filter', ctx);
  }
}

export class FakeWaveShaper extends FakeNode {
  curve: Float32Array | null = null;
  oversample = 'none';
  constructor(ctx: FakeAudioContext) {
    super('waveShaper', ctx);
  }
}

export class FakeDelay extends FakeNode {
  delayTime = new FakeParam(0);
  constructor(ctx: FakeAudioContext) {
    super('delay', ctx);
  }
}

export class FakeCompressor extends FakeNode {
  threshold = new FakeParam(-24);
  knee = new FakeParam(30);
  ratio = new FakeParam(12);
  attack = new FakeParam(0.003);
  release = new FakeParam(0.25);
  constructor(ctx: FakeAudioContext) {
    super('compressor', ctx);
  }
}

export class FakeConvolver extends FakeNode {
  buffer: unknown = null;
  normalize = true;
  constructor(ctx: FakeAudioContext) {
    super('convolver', ctx);
  }
}

export class FakePanner extends FakeNode {
  pan = new FakeParam(0);
  constructor(ctx: FakeAudioContext) {
    super('panner', ctx);
  }
}

export class FakeAudioContext {
  currentTime = 0;
  sampleRate = 8000;
  state: AudioContextState = 'running';
  nodes: FakeNode[] = [];
  destination: FakeNode;
  constructor() {
    this.destination = new FakeNode('destination', this);
  }
  createOscillator() {
    return new FakeOscillator(this);
  }
  createBufferSource() {
    return new FakeBufferSource(this);
  }
  createGain() {
    return new FakeGain(this);
  }
  createBiquadFilter() {
    return new FakeFilter(this);
  }
  createDelay() {
    return new FakeDelay(this);
  }
  createWaveShaper() {
    return new FakeWaveShaper(this);
  }
  createDynamicsCompressor() {
    return new FakeCompressor(this);
  }
  createConvolver() {
    return new FakeConvolver(this);
  }
  createStereoPanner() {
    return new FakePanner(this);
  }
  createPeriodicWave(real: Float32Array, imag: Float32Array) {
    return { real, imag };
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      copyToChannel: (src: Float32Array) => {
        data.set(src);
      },
      getChannelData: () => data,
    };
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  suspend() {
    this.state = 'suspended';
    return Promise.resolve();
  }
  /** Nodes of one kind created since `from` (an index into `nodes`). */
  created(kind: string, from = 0) {
    return this.nodes.slice(from).filter((n) => n.kind === kind);
  }
  /** Every automation call on every parameter of every node. */
  allParamCalls(): ParamCall[] {
    const out: ParamCall[] = [];
    for (const n of this.nodes)
      for (const v of Object.values(n)) if (v instanceof FakeParam) out.push(...v.calls);
    return out;
  }
}

/** The fake, typed as the real thing for code under test. */
export const asContext = (f: FakeAudioContext) => f as unknown as BaseAudioContext;
