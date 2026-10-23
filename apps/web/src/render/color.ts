const toLinear = (c: number) => Math.pow(c / 255, 2.2);
const toSrgb = (c: number) => Math.round(Math.pow(Math.min(1, Math.max(0, c)), 1 / 2.2) * 255);

function parse(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mix two #rrggbb colours in linear light. */
export function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parse(a).map(toLinear) as [number, number, number];
  const [br, bg, bb] = parse(b).map(toLinear) as [number, number, number];
  const out = [ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t].map(toSrgb);
  return `#${out.map((c) => c.toString(16).padStart(2, '0')).join('')}`;
}
