/**
 * Kenney Nature Kit models carry a pastel palette (mint "grass", orange "dirt").
 * Remap those material names to Ethergrove's palette; `overrides` adjust per model family.
 */
const BASE: Record<string, string> = {
  grass: '#5f9a3c',
  dirt: '#5a3d26',
  woodBark: '#7a5434',
  woodInner: '#d8bd8e',
  woodBirch: '#efe3d2',
  leafsFall: '#e8822e',
  leafs: '#4f8a34',
};

export function kenneyTint(
  overrides: Record<string, string> = {},
): (name: string) => string | null {
  const map = { ...BASE, ...overrides };
  return (name) => map[name] ?? null;
}

/** Cool slate grey, so rocks never read as the warm brown of stumps and fences. */
export const ROCK_TINT = kenneyTint({ dirt: '#8f979e', grass: '#6c8a48' });
export const CROP_TINT = kenneyTint();
export const WOOD_TINT = kenneyTint();
