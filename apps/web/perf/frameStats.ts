/**
 * Runs in the page before the game (via `addInitScript`), so it needs no game code: it wraps the WebGL
 * draw calls to count them, and times every frame with requestAnimationFrame. Its rAF loop is
 * registered first, so each tick brackets one whole frame of the game's rendering. GPU time comes from
 * EXT_disjoint_timer_query_webgl2 when the browser exposes it.
 */
export interface FrameSummary {
  frames: number;
  fps: number;
  frameP50: number;
  frameP95: number;
  gpuP50: number | null;
  gpuP95: number | null;
  drawCalls: number;
  triangles: number;
  canvas: string;
  gpu: string;
}

declare global {
  interface Window {
    __frames?: { start(): void; stop(): FrameSummary };
  }
}

export function installFrameStats(): void {
  type Draw = (...args: number[]) => void;
  const contexts: WebGL2RenderingContext[] = [];
  let calls = 0;
  let tris = 0;
  const TRIANGLES = 4;

  const wrap = (gl: WebGL2RenderingContext) => {
    const g = gl as unknown as Record<string, Draw>;
    const count = (mode: number, n: number, instances: number) => {
      calls++;
      if (mode === TRIANGLES) tris += (n / 3) * instances;
    };
    const patch = (name: string, read: (a: number[]) => [number, number, number]) => {
      const original = g[name];
      if (typeof original !== 'function') return;
      g[name] = function (this: unknown, ...a: number[]) {
        const [mode, n, inst] = read(a);
        count(mode, n, inst);
        original.apply(this, a);
      };
    };
    patch('drawArrays', (a) => [a[0] ?? 0, a[2] ?? 0, 1]);
    patch('drawElements', (a) => [a[0] ?? 0, a[1] ?? 0, 1]);
    patch('drawArraysInstanced', (a) => [a[0] ?? 0, a[2] ?? 0, a[3] ?? 1]);
    patch('drawElementsInstanced', (a) => [a[0] ?? 0, a[1] ?? 0, a[4] ?? 1]);
    patch('drawRangeElements', (a) => [a[0] ?? 0, a[3] ?? 0, 1]);
  };

  // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with the canvas as `this`
  const getContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
    attrs?: unknown,
  ) {
    const ctx = (getContext as (t: string, a?: unknown) => RenderingContext | null).call(
      this,
      type,
      attrs,
    );
    if (type === 'webgl2' && ctx && !contexts.includes(ctx as WebGL2RenderingContext)) {
      contexts.push(ctx as WebGL2RenderingContext);
      wrap(ctx as WebGL2RenderingContext);
    }
    return ctx;
  } as typeof HTMLCanvasElement.prototype.getContext;

  /** The game's context: the largest WebGL2 canvas still on the page. */
  const game = (): WebGL2RenderingContext | undefined =>
    contexts
      .filter((c) => c.canvas instanceof HTMLCanvasElement && c.canvas.isConnected)
      .sort(
        (a, b) =>
          b.drawingBufferWidth * b.drawingBufferHeight -
          a.drawingBufferWidth * a.drawingBufferHeight,
      )[0];

  interface Timer {
    TIME_ELAPSED_EXT: number;
    GPU_DISJOINT_EXT: number;
  }
  let recording = false;
  let last = 0;
  const frameMs: number[] = [];
  const gpuMs: number[] = [];
  const callsPerFrame: number[] = [];
  const trisPerFrame: number[] = [];
  let open: WebGLQuery | null = null;
  const pending: WebGLQuery[] = [];

  const tick = (t: number) => {
    const gl = game();
    if (recording && last > 0) {
      frameMs.push(t - last);
      callsPerFrame.push(calls);
      trisPerFrame.push(tris);
    }
    const ext = gl?.getExtension('EXT_disjoint_timer_query_webgl2') as Timer | null | undefined;
    if (gl && ext) {
      if (open) {
        gl.endQuery(ext.TIME_ELAPSED_EXT);
        pending.push(open);
        open = null;
      }
      while (pending.length > 0) {
        const q = pending[0];
        if (!q || !gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
        pending.shift();
        const disjoint = Boolean(gl.getParameter(ext.GPU_DISJOINT_EXT));
        if (recording && !disjoint)
          gpuMs.push(Number(gl.getQueryParameter(q, gl.QUERY_RESULT)) / 1e6);
        gl.deleteQuery(q);
      }
      if (recording) {
        open = gl.createQuery();
        gl.beginQuery(ext.TIME_ELAPSED_EXT, open);
      }
    }
    last = t;
    calls = 0;
    tris = 0;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  const pct = (xs: number[], p: number) => {
    if (xs.length === 0) return null;
    const s = [...xs].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))] ?? null;
  };
  const round = (x: number | null, d = 2) => (x === null ? null : Number(x.toFixed(d)));

  window.__frames = {
    start() {
      frameMs.length = gpuMs.length = callsPerFrame.length = trisPerFrame.length = 0;
      last = 0;
      recording = true;
    },
    stop() {
      recording = false;
      const gl = game();
      const info = gl?.getExtension('WEBGL_debug_renderer_info');
      const total = frameMs.reduce((a, b) => a + b, 0);
      return {
        frames: frameMs.length,
        fps: round(total > 0 ? (frameMs.length * 1000) / total : 0, 1) ?? 0,
        frameP50: round(pct(frameMs, 50)) ?? 0,
        frameP95: round(pct(frameMs, 95)) ?? 0,
        gpuP50: round(pct(gpuMs, 50)),
        gpuP95: round(pct(gpuMs, 95)),
        drawCalls: Math.round(pct(callsPerFrame, 50) ?? 0),
        triangles: Math.round(pct(trisPerFrame, 50) ?? 0),
        canvas: gl ? `${String(gl.drawingBufferWidth)}×${String(gl.drawingBufferHeight)}` : 'none',
        gpu: gl && info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : 'unknown',
      };
    },
  };
}
