import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTouchSource } from '../../input/touch';
import { ActionButtons } from './ActionButtons';
import { JOYSTICK_RADIUS, Joystick } from './Joystick';

describe('Joystick', () => {
  it('occupies the left 40% and drives the stick until pointercancel', () => {
    const source = createTouchSource();
    render(<Joystick source={source} />);
    const zone = screen.getByTestId('joystick-zone');
    expect(zone.style.width).toBe('40%');
    expect(zone.style.left).toBe('0px');
    fireEvent.pointerDown(zone, { pointerId: 1, clientX: 100, clientY: 300 });
    fireEvent.pointerMove(zone, { pointerId: 1, clientX: 100 + JOYSTICK_RADIUS, clientY: 300 });
    expect(source.read().move).toEqual({ x: 1, z: 0 });
    fireEvent.pointerCancel(zone, { pointerId: 1 });
    expect(source.read().move).toEqual({ x: 0, z: 0 });
  });

  it('clamps the stick to length 1', () => {
    const source = createTouchSource();
    render(<Joystick source={source} />);
    const zone = screen.getByTestId('joystick-zone');
    fireEvent.pointerDown(zone, { pointerId: 2, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(zone, { pointerId: 2, clientX: 0, clientY: 3 * JOYSTICK_RADIUS });
    expect(source.read().move).toEqual({ x: 0, z: 1 });
  });
});

describe('opening a menu mid-hold (review finding 2)', () => {
  it('unmounting the stick while dragged stops the farmer', () => {
    const source = createTouchSource();
    const { unmount } = render(<Joystick source={source} />);
    const zone = screen.getByTestId('joystick-zone');
    fireEvent.pointerDown(zone, { pointerId: 9, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(zone, { pointerId: 9, clientX: JOYSTICK_RADIUS, clientY: 0 });
    unmount();
    expect(source.read().move).toEqual({ x: 0, z: 0 });
  });

  it('unmounting the buttons while Use is held releases it', () => {
    const source = createTouchSource();
    const { unmount } = render(<ActionButtons source={source} />);
    fireEvent.pointerDown(screen.getByRole('button', { name: /use tool/i }), { pointerId: 5 });
    unmount();
    source.read(); // the tap itself still counts once
    expect(source.read().primary).toBe(false);
  });
});

describe('ActionButtons', () => {
  it('buttons are at least 56px and drive the touch source', () => {
    const source = createTouchSource();
    render(<ActionButtons source={source} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);
    for (const b of buttons) {
      expect(parseInt(b.style.minWidth, 10)).toBeGreaterThanOrEqual(56);
      expect(parseInt(b.style.minHeight, 10)).toBeGreaterThanOrEqual(56);
    }
    const action = screen.getByRole('button', { name: /use tool/i });
    fireEvent.pointerDown(action, { pointerId: 3 });
    expect(source.read().primary).toBe(true);
    fireEvent.pointerUp(action, { pointerId: 3 });
    expect(source.read().primary).toBe(false);
    fireEvent.pointerDown(screen.getByRole('button', { name: /rotate camera right/i }), {
      pointerId: 4,
    });
    expect(source.read().rotate).toBe(1);
  });
});
