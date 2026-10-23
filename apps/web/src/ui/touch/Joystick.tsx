import { useRef, useState, type PointerEvent } from 'react';
import type { TouchSource } from '../../input/touch';

export const JOYSTICK_RADIUS = 60;

interface Props {
  source: TouchSource;
}

/** Floating virtual stick: appears where the thumb lands in the left 40% of the screen. */
export function Joystick({ source }: Props) {
  const origin = useRef<{ id: number; x: number; y: number } | null>(null);
  const [knob, setKnob] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const end = () => {
    origin.current = null;
    source.setStick(0, 0);
    setKnob(null);
  };

  return (
    <div
      data-testid="joystick-zone"
      className="joystick-zone"
      style={{
        position: 'fixed',
        left: '0px',
        bottom: '0px',
        width: '40%',
        height: '70%',
        touchAction: 'none',
      }}
      onPointerDown={(e: PointerEvent<HTMLDivElement>) => {
        if (origin.current) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // Pointer already gone (or a synthetic event): tracking still works without capture.
        }
        origin.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        setKnob({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
      }}
      onPointerMove={(e) => {
        const o = origin.current;
        if (o?.id !== e.pointerId) return;
        const dx = e.clientX - o.x;
        const dy = e.clientY - o.y;
        const len = Math.hypot(dx, dy);
        const k = len > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / len : 1;
        source.setStick((dx * k) / JOYSTICK_RADIUS, (dy * k) / JOYSTICK_RADIUS);
        setKnob({ x: o.x, y: o.y, dx: dx * k, dy: dy * k });
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
    >
      {knob && (
        <div
          className="joystick-base"
          aria-hidden="true"
          style={{
            left: knob.x - JOYSTICK_RADIUS,
            top: knob.y - JOYSTICK_RADIUS,
            width: JOYSTICK_RADIUS * 2,
            height: JOYSTICK_RADIUS * 2,
          }}
        >
          <div
            className="joystick-knob"
            style={{ transform: `translate(${knob.dx}px, ${knob.dy}px)` }}
          />
        </div>
      )}
    </div>
  );
}
