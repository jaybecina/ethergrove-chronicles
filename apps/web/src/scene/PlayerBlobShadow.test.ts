import { describe, expect, it } from 'vitest';
import { QUALITY } from '../render/quality';
import { showBlobShadow } from './PlayerBlobShadow';

describe('player blob shadow', () => {
  it('only Low, which has no shadow map, draws the blob', () => {
    expect(showBlobShadow(QUALITY.low)).toBe(true);
    expect(showBlobShadow(QUALITY.medium)).toBe(false);
    expect(showBlobShadow(QUALITY.high)).toBe(false);
  });
});
