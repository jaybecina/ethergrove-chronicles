import { describe, expect, it, vi } from 'vitest';
import { createEventBus } from './eventBus';

describe('event bus', () => {
  it('delivers events by type and supports unsubscribe', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    const off = bus.on('canRefilled', fn);
    bus.emit([{ type: 'canRefilled' }, { type: 'staminaLow' }]);
    expect(fn).toHaveBeenCalledTimes(1);
    off();
    bus.emit([{ type: 'canRefilled' }]);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('onAny receives every event', () => {
    const bus = createEventBus();
    const fn = vi.fn();
    bus.onAny(fn);
    bus.emit([{ type: 'canRefilled' }, { type: 'staminaLow' }]);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
