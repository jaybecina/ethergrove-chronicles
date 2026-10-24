import { useEffect, useRef } from 'react';
import { edgePoint, markerScreen } from '../../scene/markerScreen';

const EDGE_INSET = 24;
const SIZE = 40;

/** Gold arrow on the screen edge pointing at an off-screen lesson marker (spec §4.6). */
export function MarkerPointer() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const node = el.current;
      if (node) {
        const show = markerScreen.visible && !markerScreen.onScreen;
        node.style.display = show ? 'grid' : 'none';
        if (show) {
          const p = edgePoint(
            markerScreen,
            { w: window.innerWidth, h: window.innerHeight },
            EDGE_INSET,
            markerScreen.behind,
          );
          node.style.transform = `translate(${p.x - SIZE / 2}px, ${p.y - SIZE / 2}px) rotate(${p.angle}rad)`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, []);
  return (
    <div ref={el} className="marker-pointer" aria-hidden="true" style={{ display: 'none' }}>
      ➤
    </div>
  );
}
