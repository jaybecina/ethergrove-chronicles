import { Html } from '@react-three/drei';
import { forwardRef, useImperativeHandle, useState } from 'react';

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
}

export interface FloatTextHandle {
  show(x: number, y: number, text: string): void;
}

let nextId = 1;

/** "+1 Turnip" labels that rise and fade above a tile. */
export const FloatText = forwardRef<FloatTextHandle>(function FloatText(_, ref) {
  const [items, setItems] = useState<Floater[]>([]);
  useImperativeHandle(ref, () => ({
    show(x, y, text) {
      const id = nextId++;
      setItems((list) => [...list.slice(-5), { id, x, y, text }]);
      setTimeout(() => {
        setItems((list) => list.filter((f) => f.id !== id));
      }, 1200);
    },
  }));
  return (
    <>
      {items.map((f) => (
        <Html key={f.id} position={[f.x + 0.5, 1.2, f.y + 0.5]} center zIndexRange={[20, 10]}>
          <span className="float-text">{f.text}</span>
        </Html>
      ))}
    </>
  );
});
