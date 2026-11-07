// Detection matrix for the phone and tablet message (M1 spec §9.2, ARPG spec §13.4).
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { detectUnsupported } from './detect.mjs';

/**
 * Builds the environment detectUnsupported reads.
 * @param {{ coarse?: boolean, fine?: boolean, hoverNone?: boolean, hover?: boolean, w: number, h: number,
 *   platform?: string, touch?: number }} o
 */
function env(o) {
  const queries = {
    '(pointer: coarse)': o.coarse ?? false,
    '(pointer: fine)': o.fine ?? false,
    '(hover: none)': o.hoverNone ?? false,
    '(hover: hover)': o.hover ?? false,
  };
  return {
    matchMedia: (q) => ({ matches: queries[q] ?? false }),
    screen: { width: o.w, height: o.h },
    navigator: { platform: o.platform ?? 'Linux armv8l', maxTouchPoints: o.touch ?? 0 },
  };
}

test('a phone (coarse pointer, no hover, 390 x 844) is unsupported', () => {
  assert.equal(detectUnsupported(env({ coarse: true, hoverNone: true, w: 390, h: 844 })), true);
});

test('a phone turned sideways is still unsupported (shorter side under 900)', () => {
  assert.equal(detectUnsupported(env({ coarse: true, hoverNone: true, w: 844, h: 390 })), true);
});

test('a tablet (coarse, no hover, 820 x 1180) is unsupported', () => {
  assert.equal(detectUnsupported(env({ coarse: true, hoverNone: true, w: 820, h: 1180 })), true);
});

test('an iPad reporting itself as a Mac (touch points, no fine pointer) is unsupported', () => {
  const e = env({
    platform: 'MacIntel',
    touch: 5,
    coarse: true,
    hoverNone: false,
    w: 1180,
    h: 820,
  });
  assert.equal(detectUnsupported(e), true);
});

test('a real Mac with a fine pointer is supported', () => {
  assert.equal(
    detectUnsupported(env({ platform: 'MacIntel', fine: true, hover: true, w: 1440, h: 900 })),
    false,
  );
});

test('a touch laptop (fine pointer and hover beside touch) is supported', () => {
  assert.equal(
    detectUnsupported(
      env({ coarse: true, fine: true, hover: true, hoverNone: false, w: 1366, h: 768 }),
    ),
    false,
  );
});

test('a Chromebook with a trackpad is supported', () => {
  assert.equal(
    detectUnsupported(env({ coarse: true, fine: true, hover: true, w: 1366, h: 768, touch: 10 })),
    false,
  );
});

test('a Steam Deck (1280 x 800, trackpads give a fine pointer) is supported although 800 is under 900', () => {
  assert.equal(
    detectUnsupported(env({ coarse: true, fine: true, hover: true, w: 1280, h: 800 })),
    false,
  );
});

test('a desktop (fine pointer, hover, 1920 x 1080) is supported', () => {
  assert.equal(detectUnsupported(env({ fine: true, hover: true, w: 1920, h: 1080 })), false);
});

test('a large coarse-only screen (1200 x 1600, no hover) is not blocked: only small screens count', () => {
  assert.equal(detectUnsupported(env({ coarse: true, hoverNone: true, w: 1200, h: 1600 })), false);
});
