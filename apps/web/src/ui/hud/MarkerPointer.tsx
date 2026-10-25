import { useEffect, useRef } from 'react';
import { edgePoint, markerScreen } from '../../scene/markerScreen';

const EDGE_INSET = 24;
const SIZE = 40;

/** Gold arrow on the screen edge pointing at an off-screen lesson marker (spec §4.6). */
export function MarkerPointer() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let raf = 0;
    let shown = false;
    let last = '';
    // Touch the DOM only when something changed: this runs every frame.
    const tick = () => {
      const node = el.current;
      if (node) {
        const show = markerScreen.visible && !markerScreen.onScreen;
        if (show !== shown) {
          shown = show;
          node.style.display = show ? 'grid' : 'none';
        }
        if (show) {
          const p = edgePoint(
            markerScreen,
            { w: window.innerWidth, h: window.innerHeight },
            EDGE_INSET,
            markerScreen.behind,
          );
          const t = `translate(${Math.round(p.x - SIZE / 2)}px, ${Math.round(p.y - SIZE / 2)}px) rotate(${p.angle.toFixed(2)}rad)`;
          if (t !== last) {
            last = t;
            node.style.transform = t;
          }
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
